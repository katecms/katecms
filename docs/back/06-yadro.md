# Устройство ядра

`packages/core` — библиотека, которую Nuxt-модуль вызывает, а не набор экранов. Обзор вызова снаружи — [ядро без Nuxt](../front/12-yadro-snaruzhi.md). Здесь карта каталогов и то, что должен помнить разработчик модуля.

## Каталоги `src`

| Путь | Ответственность |
| --- | --- |
| `config/` | `MiraiCmsConfig`, `defineMiraiCmsConfig`, `merge`, `resolve*` для ролей, медиа, базы, формы. Типы полей, коллекций, словарей, опций, блоков |
| `config/defaults.ts` | Единственные дефолты: пути, SQLite, MIME, роли пустые (встроенные роли добавляет `resolve-roles`), брейкпоинты форм |
| `permissions/can.ts` | `can`, `canOnEntry`, список `RESOURCES` |
| `auth/password.ts` | scrypt |
| `auth/account.ts` | `validateEmail`, `validatePassword`, длины |
| `auth/rate-limit.ts` | Память неудачных попыток. Адаптер создаёт один лимитер |
| `auth/types.ts` | `SafeUser`, `AuthState` |
| `fields/` | Дефолты формы, видимость, required, choice encode/decode, даты, OSM, связи, user |
| `rewrite.ts` | Матчинг публичного пути и сборка URL |
| `blocks.ts` | Id экземпляра блока |
| `text.ts` | `transliterate`, `nl2br`, `autop` |
| `media/` | Имена файлов, локальное хранилище, sharp-варианты, DTO `MediaItem` |
| `indexes/` | Желаемые индексы, diff, SQL, advisory lock |
| `oembed.ts` | Разрешение URL, SSRF-ограничения, провайдеры |
| `database/client/` | Kysely, диалекты SQLite/Postgres/D1, типы таблиц, разбор JSON и дат |
| `database/queries/` | Функции по таблицам, `fields-query`, `dictionary-query`, `terms-query` |
| `database/migrations/` | DDL Postgres и SQLite, раннеры |

`src/index.ts` реэкспортирует всё это. `src/browser.ts` останавливается до client/migrations/password hash/sharp.

## Конфиг

`resolveMiraiCmsConfig` не открывает базу и не читает процесс. Он возвращает заполненный объект и `warnings`. Модуль печатает warnings и кладёт объект в `runtimeConfig`.

`resolveRoles` копирует `BUILT_IN_ROLES`, накладывает карту пользователя, выкидывает `owner` из конфига, игнорирует `admin: false`, затем добавляет owner с `superuser: true` и полными правами. Скрытая роль (`false`) в итоговую карту не попадает.

`resolveDatabaseConfig` только чистит строки. Драйвер для коннекта выбирает `resolveDatabaseTarget` уже из значений, которые адаптер достал из env.

`resolveMediaConfig` выбрасывает пресет с именем `full`, чинит quality, предупреждает про `maxFileSize <= 0`.

`resolveFormConfig` заполняет брейкпоинты и `maxFileBytes`. Пустой `uploadDir` дополнение форм само заменяет на каталог данных.

## Запросы и JSON

Колонки JSON в типах Kysely — `ColumnType`, без обёртки `Generated`: `Selectable` снимает один слой, и `Generated<Json<T>>` оставил бы на select сырой `Json`. SQLite хранит JSON текстом, клиент парсит его в объект. Postgres отдаёт jsonb. Даты SQLite — ISO-текст, на select становятся `Date`. Булевы на SQLite приводятся к `boolean`.

`createPostgresDb()` вешает парсер `bigint` → `number` только на свой пул.

Уникальность slug коллекции и словаря — среди соседей `(type, parent_id, slug)`. Postgres использует `NULLS NOT DISTINCT`. SQLite — выражение с `COALESCE(parent_id, 0)`. Цикл `parent_id` режет триггер в DDL. На D1 триггер между запросами не гарантирован, поэтому `validateCollectionParent` в запросах всё равно обходит предков в JS.

`createCollection` / смена родителя вызывают эту проверку: тот же тип, не trash, не self, не потомок. Сообщения: `An entry cannot be its own parent.`, `Parent entry not found.`, `Cannot set a descendant as parent.`

Последний owner: `updateUser` и `deleteUser` бросают `Cannot remove the last owner.`

Гонка уникального `media.filename` в `createMedia` ловится и повтор идёт с суффиксом `-1`, `-2`.

## Индексы

`syncCollectionFieldIndexes` вызывается из `auto-migrate` только для Postgres, после миграции, отдельным соединением. Имена управляемые, с префиксом, который парсит `parseManagedFieldIndexName`. Чужой индекс функция не снимает. Вложенный путь после slug коллекции помечается сегментом `n`, чтобы `seo.title` не слиплось с корневым ключом. Cast берётся из `getPostgresCast` (`numeric`, `boolean`, `date`, `timestamptz`, `time`, текст).

SQLite-ветка плагина миграции индексы не синхронизирует.

## Медиа

`generateVariants` пишет файлы через `MediaStorage` и при ошибке удаляет файлы этой попытки. Статус строки (`none`, `pending`, `ready`, `failed`) выставляет адаптер через `updateMedia`. Ядро само статус в таблице не двигает, кроме случаев, когда адаптер передал уже посчитанный объект.

`readImageSize` читает заголовок PNG/GIF/JPEG/WebP без полного декода там, где это возможно. Потолок sharp 16383 по стороне проверяется до декода.

## oEmbed

`fetchOembed` отказывается от не-http(s), частных IPv4, тела сверх лимита и цепочки длиннее 3 редиректов. User-Agent `miraicms-oembed`, таймаут 10 с. Ручка модуля добавляет сессию админки; ядро авторизацию не знает.

## Тесты

Поведение ядра покрывается `packages/core/test` (vitest). Схему меняют одновременно в `schema.ts` обоих движков, в `.sql`-копии и в `database/client/schema.ts`, затем гоняют `pnpm --filter @miraicms/core test`.
