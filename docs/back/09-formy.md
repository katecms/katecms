# Дополнение форм изнутри

Пакет `packages/miraicms-nuxt-form`. Это два разных «поля формы»:

1. Виджет коллекции `type: 'form'` — выбор id формы в записи CMS. Файл `runtime/internal/fields/FormField.vue`, регистрация `registerMiraiCmsField('form', FormField)` в `runtime/plugin.ts`.
2. Конструктор и публичный рендер самой формы. Модель — `runtime/form/model.ts`. Рендер для сайта — `runtime/components/Form.vue` (`MiraiCmsForm`).

Конструктор в админке хост не стилизует и не импортирует. Публичный компонент описан в [дополнениях снаружи](../front/11-dopolneniya.md).

## Старт модуля

`src/module.ts` не имеет своего `configKey`. Каталог вложений, лимит байт и брейкпоинты читаются из `runtimeConfig.miraicms.form`, который заполнило ядро.

Плагины:

| Файл | Когда |
| --- | --- |
| `runtime/plugin.ts` | Клиент. Виджет `form`, брейкпоинты в рантайме модели, пункт меню Forms с `access: 'forms'` |
| `server/plugins/migrate.ts` | `ensureFormTables()` |
| `server/plugins/html-sanitize.ts` | Ставит серверный санитайзер HTML до сохранения и отдачи |

`addComponentsDir` на `runtime/components` с префиксом `MiraiCms` и `pathPrefix: false`. В каталоге один `Form.vue`. Админские SFC конструктора в этот каталог не кладут: они в `runtime/builder` и `runtime/pages` и резолвятся как внутренние теги.

Страницы вешаются на родителя `admin`:

| Имя | Путь |
| --- | --- |
| `admin-forms` | `forms` |
| `admin-forms-id` | `forms/:id(\d+)` |
| `admin-forms-entries` | `forms/:id(\d+)/entries` |
| `admin-forms-entry` | `forms/:id(\d+)/entries/:submissionId(\d+)` |
| `admin-forms-mail` | `forms/mail` |

Числовой шаблон у `:id` отделяет список и почту от карточки.

## Модель

`runtime/form/model.ts` — чистые функции, их гоняет `test/model.test.ts` без Nuxt.

Константы сетки: 60 колонок (`GRID_COLUMNS`), высота ряда 72 (`ROW_HEIGHT`), не больше 200 полей и 20 шагов, текст поля до 20 000 символов.

`FormContent`: шаги, поля, раскладки по имени брейкпоинта, подтверждение, уведомление. Публичный ответ (`PublicForm`) уведомление наружу не отдаёт: там адреса почты.

Типы полей конструктора — массив `FIELD_TYPES` в том же файле. Подписи для палитры — `FIELD_LABELS`.

Раскладка: `LayoutItem` с `x`, `y`, `w`, `h`. `placeField` ищет свободный прямоугольник, `overlaps` запрещает пересечение, `resolveLayout` чинит битый JSON. Базовый брейкпоинт — `baseBreakpoint()` (desktop в дефолтном конфиге). Копирование сетки на другой брейкпоинт — `copyDesktopLayout`.

Условия показа — свои, не `conditionalLogic` полей коллекции: `FORM_CONDITION_LOGICS` и `FORM_CONDITION_ACTIONS`. `fieldConditionStates` помечает поле скрытым. Скрытое не уходит в отправку.

`normalizeFormContent` / `parseContent` принимают неизвестный JSON из базы и возвращают канонический `FormContent`. Сохранение в админке проходит через них, а не пишет тело запроса как есть.

Ошибки отправки: `fieldSubmissionError`, `submissionErrors`, `emptySubmissionError` (пустая форма — `Empty form cannot be submitted.`).

## HTML

Поля `html` и текст подтверждения санитизируются. Политика — `runtime/form/html-policy.ts`. На сервере её ставит `html-sanitize.ts` (`sanitize-html`). В браузере публичная форма использует `runtime/form/html.browser.ts` и DOMPurify. Общий вход `html.ts` выбирает реализацию. Реестр `html-registry.ts` нужен, чтобы серверный плагин подменил функцию до первого рендера.

## HTTP

База форм — тот же `getDb` модуля через `runtime/server/utils/db.ts` (`getFormDb`). Драйвер postgres определяется отдельно (`isPostgresDriver`), потому что DDL в `schema.ts` написан двумя ветками.

Доступ к админским ручкам — `runtime/server/utils/access.ts`: пользователь и ресурс `forms`.

| Метод | Путь | Назначение |
| --- | --- | --- |
| GET, POST | `/api/_miraicms/forms` | Список и создание |
| GET, PUT, DELETE | `/api/_miraicms/forms/item/:id` | Карточка. PUT нормализует content |
| GET | `.../submissions` | Заявки |
| GET, DELETE | `.../submissions/:submissionId` | Одна заявка |
| GET | `.../files/:index` | Файл заявки, с правом |
| GET | `/api/_miraicms/forms/view/:id` | Публичное определение без почтовых адресов |
| POST | `/api/_miraicms/forms/submit/:id` | Приём. Пишет submission, values, файлы, письмо |
| GET, PUT | `/api/_miraicms/forms/mail` | SMTP, одна строка id = 1 |
| POST | `/api/_miraicms/forms/mail/test` | Проверочное письмо через nodemailer |

Публичные `view` и `submit` без сессии админки. `submit` проверяет типы, обязательность, условия и потолок `maxFileBytes`. После этой проверки `takeFormSubmission` пропускает 10 отправок с одного адреса за 10 минут, дальше 429 и `Retry-After`. Адрес заявки и корзина лимита — `eventClientAddress`: сокет, а `X-Forwarded-For` только при `MIRAICMS_TRUST_PROXY`, как у лимитера входа.

Письмо собирает `runtime/server/utils/mail.ts` из `FormNotification` внутри content и строки `miraicms_form_mail`. Пароль ящика лежит в колонке `password` как есть: это секрет SMTP, не хеш пользователя CMS. `readMailSettings()` в браузер его не кладёт и отдаёт флаг `passwordSet`. Пустая строка в PUT пароль не затирает: остаётся прежнее значение. В nodemailer пароль уходит только в момент отправки.

## Конструктор

`runtime/builder/FormBuilder.vue` — холст. Вокруг него `FieldItemMenu`, `FieldSettings`, `StepSettings`, `IconPicker`, набор `builder/settings/*` (текст, выборы, рейтинг, условия, аккордеон опций). Лица полей на холсте — `FieldFace.vue`.

Иконки шагов — `runtime/form/icons.ts`. Маски и раскладка инпутов публичной формы — `runtime/form/text-options.ts`. Имена брейкпоинтов на клиенте дублирует `runtime/form/runtime-config.ts`: он читает `public.miraicms.form.breakpoints`, который модуль положил туда при старте.

Права `forms` в ядре — отдельный ресурс `RoleRights.forms`, не скоуп по id. Встроенные owner, admin и editor получают его целиком. Author и subscriber — нет, пока роль не переопределена.
