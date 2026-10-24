# Сервер

Каталог `packages/miraicms-nuxt/src/runtime/server`. Точка для дополнений — `kit.ts`: наружу торчат `getDb`, `requireUser`, `requirePermission`, `requireEntryPermission`, `clientAddress`, `trustedProxyHops`, `eventClientAddress`. Остальные утилиты — внутренние импорты обработчиков.

## Клиент базы

`utils/db.ts`. `getDb()` создаёт один `Kysely` на процесс: Postgres, если цель `postgres`, иначе SQLite-файл из resolved config. Повторные вызовы возвращают тот же объект. `destroy()` на запрос не вызывается.

Выбор цели повторяет плагин миграции: `driver` из конфига, `url`, а для postgres при пустом `url` — `process.env.DATABASE_URL`. Ядро по-прежнему env не читает; это делает адаптер в двух местах (`auto-migrate.ts` и `db.ts`).

## Сессия

`utils/session.ts`.

| Параметр | Значение |
| --- | --- |
| Cookie | `miraicms_session` |
| Срок | 7 суток |
| Флаги | httpOnly, SameSite=Lax, Secure на https, path `/` |
| Полезная нагрузка | `userId`, `sessionVersion` |
| Секрет | `MIRAICMS_SESSION_PASSWORD`, минимум 32 символа. В production короткая строка — 500. В development — запасная константа и один warning |

`getCurrentUser` возвращает `null`, если cookie нет, пользователь удалён, статус `banned` или `users.session_version` не совпал с cookie. Смена пароля в `users/[id].patch.ts` поднимает версию, старые сессии отваливаются.

`requireUser` — тот же поиск и 401 с текстом `Authentication required.`

Наружу логин, регистрация и патч пользователя отдают `toSafeUser`. Хеш в JSON ответа не кладётся.

## Лимит попыток

`utils/auth-attempts.ts` держит один `createAuthRateLimiter()` из ядра на процесс. Дефолт ядра: 3 неудачи, затем задержка 5 с с удвоением до 30 с, окно 15 минут. На попытку три ключа: действие + адрес + email, только адрес, только email. Успех снимает пару и email. Ключ адреса остаётся, чтобы один удачный вход не открывал перебор с того же адреса. Память лимитера не общая между воркерами.

Адрес читает `eventClientAddress` (`request-address.ts`, разбор в `client-address.ts`). Это сокет. `X-Forwarded-For` учитывается только при `MIRAICMS_TRUST_PROXY`: `1` / `true` / `on` — один прокси, целое `N` — столько прокси с конца списка. Пустое значение, `0`, `false`, `off` и нечисло заголовок не включают. Тот же разбор у лимита отправки форм.

Логин (`auth/login.post.ts`) на пустое тело отвечает 422. Неизвестный email, banned и неверный пароль дают один и тот же 401 `Invalid email or password.`, чтобы ручка не подтверждала существование адреса. Пароль длиннее `MAX_PASSWORD_LENGTH` отклоняется до scrypt. Успех пишет сессию и сбрасывает счётчик. 429 ставит `Retry-After`.

Регистрация использует тот же лимитер с действием `register`. Первый пользователь становится `owner`. Следующие — `subscriber`, и только если `registration: true`.

## Права

`utils/permissions.ts` оборачивает `can` / `canOnEntry`. Нет права — 403 `Insufficient permissions.` Для коллекций, словарей и опций в `requirePermission` передают slug. `requireEntryPermission` дополнительно проверяет автора при `update` / `delete`, если право на ресурс не blanket `true`.

`GET /api/_miraicms/menu` без пользователя возвращает `{ visible: [] }`. С пользователем — список ресурсов из `RESOURCES`, на которые есть `read` без scope. Оболочка прячет пункты дополнений, чей `access` в этот список не входит. Скоуп «только коллекция pages» на этом списке не виден: `can` без scope для карты по slug не даёт blanket read. Пункт коллекции в меню строится отдельно, по конфигу и правам на конкретный slug.

## Публичные ручки, которые дергают composable

Их вызывает страница сайта, но реализует модуль. Тела лежат рядом с админскими.

| Метод | Путь | Кто вызывает |
| --- | --- | --- |
| GET | `/api/_miraicms/resolve` | `getCollection` |
| GET | `/api/_miraicms/query` | `getQueryCollection` |
| GET | `/api/_miraicms/terms` | `getTerms` |
| GET | `/api/_miraicms/options/:page` | `getOptions` и редактор опций |

`resolve` матчит путь через ядро (`matchPublicCollectionRoute` и словарь с `rewrite`). Ответ — дискриминант `kind`: `entry`, `archive`, `term`. Preview и `status=draft` проходят, только если у сессии есть `collections: read` на этот тип. Иначе остаётся `published`.

## Админский протокол

Мутации требуют пользователя и право. Чтение списков тоже, кроме публичных ручек выше и auth state.

| Метод | Путь | Назначение |
| --- | --- | --- |
| GET | `/api/_miraicms/auth/state` | `{ user, hasUsers }` для middleware и шапки |
| POST | `/api/_miraicms/auth/login` | Вход |
| POST | `/api/_miraicms/auth/logout` | Сброс cookie |
| POST | `/api/_miraicms/auth/register` | Саморегистрация или первый owner |
| GET | `/api/_miraicms/menu` | Ресурсы с правом read |
| GET, POST | `/api/_miraicms/users` | Список и создание |
| PATCH, DELETE | `/api/_miraicms/users/:id` | Правка и удаление. Owner защищён правилами ядра |
| GET, POST | `/api/_miraicms/collections/:collection` | Список и создание |
| GET, PATCH, DELETE | `/api/_miraicms/collections/:collection/:id` | Запись |
| GET | `.../:id/revisions` | Список снимков |
| POST | `.../revisions/:revisionId` | Откат |
| GET, POST | `/api/_miraicms/dictionaries/:dictionary` | Термины |
| GET, PATCH, DELETE | `.../:id` | Один термин |
| PATCH | `/api/_miraicms/options/:page` | Запись синглтона |
| GET, POST | `/api/_miraicms/media` | Библиотека и загрузка |
| GET, PATCH, DELETE | `/api/_miraicms/media/:id` | Карточка |
| POST | `/api/_miraicms/media/:id/regenerate` | Варианты одного файла |
| POST | `/api/_miraicms/media/regenerate` | Варианты пакетом |
| GET | `/api/_miraicms/relation/entries` | Пикер записей |
| GET | `/api/_miraicms/relation/terms` | Пикер терминов |
| GET | `/api/_miraicms/oembed` | Прокси oEmbed для виджета. Разрешение URL и отказы — в ядре, ручка добавляет авторизацию админки |
| GET | `/uploads/**` | Файл с диска |

Сохранение записи проходит `runtime/server/utils/collections.ts`: обязательные поля при `published` (`validateRequiredFields`), видимость по `conditionalLogic`, родитель (`validateCollectionParent`), словари сайдбара с учётом `multiple`. Ревизия пишется, если у коллекции не стоит `revisions: false`. Корзина — смена `status`, не `DELETE`. `DELETE` снимает строку.

Загрузка медиа проверяет размер и MIME из resolved `media`, кладёт файл через `createLocalMediaStorage`, строку — через `createMedia`, варианты — через `generateVariants`, если `hasImageWork`. Имя уникализируется при гонке.

## Глобальный middleware страниц

`runtime/middleware/auth-guard.ts` выполняется на каждом переходе, но сразу выходит, если путь не админка, не логин и не регистрация.

1. Пустая база (`hasUsers === false`) с админки и с логина ведёт на регистрацию.
2. Гость на закрытой админке идёт на логин.
3. Регистрация при уже существующих пользователях и `registration !== true` ведёт на логин.
4. Уже вошедшего с логина и регистрации возвращает на `/${adminPath}`.

Состояние берётся `GET /api/_miraicms/auth/state`. Сбой запроса считается отсутствием пользователя и `hasUsers: false` только в `.catch` — на первой установке это как раз путь к регистрации, если ручка недоступна по другой причине, гость тоже окажется на регистрации.

Тема админки к сессии не привязана: cookie `miraicms-theme` (`system` | `light` | `dark`) пишет `runtime/pages/index.vue`.
