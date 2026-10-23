# Схема базы

Канонический DDL ядра:

- `packages/core/src/database/migrations/postgres/schema.ts` — константа `SCHEMA_SQL`, её исполняет `migratePostgres`;
- `packages/core/src/database/migrations/sqlite/schema.ts` — то же для SQLite и D1;
- рядом `postgres.sql` и `sqlite.sql` — копии для чтения, раннер их не открывает;
- типы строк — `packages/core/src/database/client/schema.ts`.

Журнал `_miraicms_migrations` хранит id применённой схемы. Id ядра фиксированный. Повторный старт его пропускает. Изменение колонки в живой базе само не произойдёт: нужен новый SQL у дополнения со своим `schemaId` или ручной скрипт. Версий «001, 002» у ядра нет.

Postgres дополнительно создаёт функции `cms_set_updated_at` и `cms_prevent_hierarchy_cycle` и триггеры на `collections` и `dictionaries`.

## Таблицы ядра

### `users`

| Колонка | Смысл |
| --- | --- |
| `id` | Ключ |
| `email` | Уникальный, в запросах lower-case |
| `password_hash` | scrypt-строка |
| `name` | Имя или NULL |
| `avatar` | JSON медиа или NULL |
| `role` | Slug роли, дефолт на стороне приложения |
| `status` | `active` или `banned` |
| `session_version` | Растёт при смене пароля |
| `created_at`, `updated_at` | Метки. `updated_at` на Postgres двигает триггер |

### `collections`

| Колонка | Смысл |
| --- | --- |
| `id` | Ключ |
| `type` | Slug коллекции из конфига |
| `status` | `published`, `draft`, `trash` |
| `slug`, `title` | На записи trim |
| `fields` | JSON значений полей |
| `blocks` | JSON массива экземпляров. Дефолт `[]`. Редактор Nuxt колонку не заполняет |
| `author_id` | Пользователь или NULL после удаления автора |
| `parent_id` | Родитель того же `type` |
| `menu_order` | Порядок |
| `password_hash` | Колонка есть. Обработчики модуля пароль записи не ставят |
| `created_at`, `updated_at`, `published_at` | `published_at` заполняется при первой публикации, если даты ещё не было |

Уникальность соседей: `(type, parent_id, slug)`.

### `collection_meta`

PK `(collection_id, key)`, `value` JSON. Произвольные пары. SEO дополнения пишет в свои таблицы, не сюда. `fieldsQuery` эту таблицу не видит.

### `collection_revisions`

`id`, `collection_id`, `author_id`, `data` JSON, `created_at`. Строки не обновляются. Удаление записи снимает ревизии каскадом.

### `media`

`filename` уникален. `mime_type`, `filesize`, `width`, `height`, `alt`, `caption`, `uploaded_by`, `variants` JSON, `variants_status` (`none`, `pending`, `ready`, `failed`), метки времени. Байты лежат в `public/uploads`, не в базе.

### `dictionaries`

`slug`, `title`, `type` (slug словаря из конфига), `fields` JSON, `parent_id`, метки. Уникальность соседей как у коллекций. Удаление обнуляет `parent_id` детей и снимает связи.

### `collection_dictionaries`

PK `(collection_id, dictionary_id)`. Отдельной уникальности «один термин типа на запись» нет: её включает флаг `multiple` в адаптере. `setCollectionDictionaries` заменяет весь набор.

### `options`

PK `key`. `value` — любой JSON, в том числе не объект. Схема полей в строке не хранится.

## Таблицы форм

Их создаёт `ensureFormTables` в `packages/miraicms-nuxt-form/src/runtime/server/utils/schema.ts` при старте серверного плагина, отдельным SQL для Postgres и SQLite. В журнал ядра эти `CREATE TABLE IF NOT EXISTS` не завязаны на версию колонок: повтор безопасен, смена колонки — нет.

| Таблица | Колонки |
| --- | --- |
| `miraicms_forms` | `id`, `name`, `content` (JSON текстом), `created_at`, `updated_at` |
| `miraicms_form_submissions` | `id`, `form_id`, `ip`, `created_at` |
| `miraicms_form_submission_values` | `id`, `submission_id`, `field_key`, `value` |
| `miraicms_form_mail` | Одна строка `id = 1`: `host`, `port`, `encryption` (`none`, `starttls`, `ssl`), `username`, `password`, `from_email`, `from_name` |

Файлы заявок лежат в каталоге `miraicms.form.uploadDir`, не в таблице. В значении хранится ссылка, скачивание идёт отдельной ручкой с проверкой права.

## Таблицы SEO

Их создаёт пакет SEO в `runtime/server/utils/documents.ts` и `redirects.ts`.

| Таблица | Назначение |
| --- | --- |
| `seo_documents` | Документ `kind` + `entry_id`: title, description, canonical, noindex, nofollow, для сайта ещё site name, separator, template, image |
| `seo_redirects` | `from_path`, `to_path`, `status_code` |

`kind` принимает `site`, `entry`, `term`. Уникальность — пара `(kind, entry_id)`. Строка сайта пишется с `kind = 'site'` и `entry_id = 0`. Запись и термин используют свой id. От `kind` зависят голова страницы и sitemap.
