# `@miraicms/core`

Ядро MiraiCMS без Nuxt, Next, Vue и Nitro. Конфиг, роли, поля, ЧПУ, медиа, oEmbed, Kysely-клиент и запросы. HTTP, сессии и чтение env — в адаптере (`miraicms-nuxt` и т.д.).

Импорт всегда из пакета:

```ts
import {
  resolveMiraiCmsConfig,
  createSqliteDb,
  migrateSqlite,
  hashPassword,
  can,
} from '@miraicms/core'
```

## Содержание

- [Обзор](#overview)
- [Установка](#install)
- [Конфиг](#config)
  - [Коллекции](#collections-config)
  - [Словари](#dictionaries-config)
  - [Опции](#options-config)
  - [Блоки в конфиге](#blocks-config)
  - [База в конфиге](#database-config)
  - [Медиа в конфиге](#media-config)
  - [Роли в конфиге](#roles-config)
- [Права](#permissions)
- [Пароли и email](#auth)
- [Поля](#fields)
- [ЧПУ](#rewrite)
- [Экземпляры блоков](#block-instances)
- [Текст](#text)
- [Медиа-слой](#media)
- [Индексы полей](#indexes)
- [oEmbed](#oembed)
- [База данных](#database)
  - [Быстрый старт](#db-quickstart)
  - [Клиент](#db-client)
  - [Миграции](#db-migrations)
  - [Запросы: users](#queries-users)
  - [Запросы: collections](#queries-collections)
  - [Запросы: collection_meta](#queries-collection-meta)
  - [Запросы: collection_revisions](#queries-collection-revisions)
  - [Запросы: media](#queries-media)
  - [Запросы: dictionaries](#queries-dictionaries)
  - [Запросы: collection_dictionaries](#queries-collection-dictionaries)
  - [Запросы: options](#queries-options)
- [Зависимости](#dependencies)

<a id="overview"></a>
## Обзор

Ядро не знает о фреймворке. Адаптер передаёт конфиг, URL базы, каталог загрузок и вызывает функции. Env (`DATABASE_URL`, `NUXT_…`) ядро не читает.

Типичный порядок в адаптере: `resolveMiraiCmsConfig` → `resolveDatabaseTarget` → миграция → клиент → запросы / медиа / права.

Исходники: `src/config`, `src/permissions`, `src/auth`, `src/fields`, `src/rewrite`, `src/blocks`, `src/text`, `src/media`, `src/indexes`, `src/oembed`, `src/database`. Сборка — `unbuild` в `dist/`. Публичный вход — `src/index.ts`.

<a id="install"></a>
## Установка

```bash
pnpm add @miraicms/core
```

Пакет тянет `kysely`, `pg`, `better-sqlite3`, `sharp`. В Cloudflare Worker нативные драйверы и sharp недоступны: там только `{ d1 }` для SQLite-слоя, без обработки картинок на сервере.

<a id="config"></a>
## Конфиг

Пользовательский объект — `MiraiCmsConfig`. После нормализации — `ResolvedMiraiCmsConfig` (все ключи заполнены, плюс `warnings`).

```ts
import { defineMiraiCmsConfig, resolveMiraiCmsConfig } from '@miraicms/core'

const config = defineMiraiCmsConfig({
  adminPath: 'admin',
  collections: {
    pages: {
      labels: { name: 'Pages', singularName: 'Page' },
      hierarchical: true,
      rewrite: '/page/%name%',
      fields: {
        intro: { type: 'textarea', label: 'Intro' },
      },
    },
  },
  dictionaries: {
    category: {
      labels: { name: 'Categories', singularName: 'Category' },
      collections: ['pages'],
      multiple: true,
    },
  },
  options: {
    site: {
      label: 'Site',
      fields: {
        title: { type: 'text', label: 'Title' },
      },
    },
  },
  database: {
    driver: 'postgres',
    url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms',
  },
})

const resolved = resolveMiraiCmsConfig(config)
```

`defineMiraiCmsConfig` — только типизация, значение не меняет. `resolveMiraiCmsConfig` подставляет дефолты, мержит роли, нормализует media/database. Предупреждения (зарезервированное имя размера, дубликаты, неизвестный драйвер, попытка переопределить `owner`) попадают в `resolved.warnings`.

Пути админки по умолчанию: `adminPath: 'admin'`, вход `/${adminPath}/${loginPath}` (`/admin/login`), регистрация `/${adminPath}/${registerPath}` (`/admin/register`).

<a id="collections-config"></a>
### Коллекции

Ключ карты — slug типа (`pages`), он же колонка `type` в таблице `collections`. Это не путать со строкой БД `Collection`.

| Поле | Смысл |
|---|---|
| `labels.name` / `singularName` | Подписи в админке |
| `hierarchical` | Дерево через `parent_id`. По умолчанию `false` |
| `autosave` | Черновик при уходе с **новой** несохранённой записи. Уже сохранённые — подтверждение. По умолчанию `false` |
| `public` | Публичный тип. `false` — пункт в админке остаётся, публичные URL записей и архива не резолвятся, View скрыт. По умолчанию `true` |
| `has_archive` | Архив. `true` — префикс rewrite (`/type/%name%` → `/type`), строка — свой слаг (`'typepage'` → `/typepage`). По умолчанию `false` |
| `perPage` | Записей на страницу архива и списка в админке. По умолчанию `10`. `-1` — без лимита |
| `rewrite` | Публичный URL, плейсхолдер `%name%`. Нет паттерна → `/{slug}/%name%` |
| `fields` | Карта полей записи |
| `blocks` | `string[]` разрешённых блоков, `true` — все, иначе выкл |

Для плоской коллекции `%name%` — один сегмент (`about`). Для `hierarchical: true` — путь предков (`parent/child`).

<a id="dictionaries-config"></a>
### Словари

Ключ карты — slug типа (`category`), он же `dictionaries.type`. Конфиг-тип — `DictionaryDefinition`, строка БД — `Dictionary`.

`collections` — к каким типам записей привязан словарь. `multiple: true` — у записи может быть несколько терминов этого типа (иначе не больше одного). Термины живут в `dictionaries`, связи — в `collection_dictionaries` (PK `(collection_id, dictionary_id)`: несколько терминов на запись в БД уже разрешены; `multiple: false` режет адаптер).

<a id="options-config"></a>
### Опции

Ключ карты — slug страницы (`site`), он же `options.key`. Это синглтон: схема полей в конфиге, значения — JSON в `options.value`.

| Поле | Смысл |
|---|---|
| `label` | Подпись в админке |
| `icon` | SVG в меню. Пустое / не SVG — дефолтная иконка |
| `fields` | Карта полей страницы |

Страницы не имеют status/slug/parent и не используют `position` у полей (нет колонки sidebar). Права `options` скоупятся по slug страницы, как коллекции.

<a id="blocks-config"></a>
### Блоки в конфиге

Карта `blocks`: slug → `{ label, icon?, fields? }`. Коллекция ссылается на эти slug в `blocks`. Экземпляр на записи — другое: см. [Экземпляры блоков](#block-instances).

<a id="database-config"></a>
### База в конфиге

`resolveDatabaseConfig` только чистит строки и ставит дефолтный файл SQLite. Драйвер для миграции выбирает `resolveDatabaseTarget` (уже из значений адаптера, без env).

```ts
interface DatabaseConfig {
  driver?: 'postgres' | 'sqlite'
  url?: string
  sqliteFilename?: string // default: data/miraicms.db
}
```

Правила выбора:

1. Явный `driver` побеждает.
2. Иначе непустой `url` → Postgres.
3. Иначе SQLite.

Postgres без URL и SQLite без имени файла — ошибка. Неизвестный `driver` в `resolveDatabaseConfig` даёт warning и пустую строку драйвера; `resolveDatabaseTarget` на неизвестном драйвере бросает.

Нужен PostgreSQL **15+** (`NULLS NOT DISTINCT` в уникальных индексах).

<a id="media-config"></a>
### Медиа в конфиге

| Поле | Дефолт | Смысл |
|---|---|---|
| `maxFileSize` | `10` | Лимит загрузки в мегабайтах. `≤ 0` отбрасывается с warning |
| `allowedMimeTypes` | jpeg/png/webp/gif/svg/pdf/mp4 | Пустой массив запрещает всё |
| `maxInputPixels` | `50_000_000` | Потолок `width × height` для sharp (`limitInputPixels`), ~7071×7071. Не размер превью и не вес файла |
| `avif` / `webp` | `false` | `true` или `{ quality }` (1–100, иначе 80). Копии оригинала и каждого `imageSizes` |
| `imageSizes` | `[]` | Именованные пресеты. Имя `full` зарезервировано и игнорируется |

Пресет: `width` / `height` `0` или нет — пропорционально второй стороне. `crop: true` — `fit: cover`, иначе `inside`. Увеличение сверх исходника нет (`withoutEnlargement`). Каталог и публичный префикс адаптер задаёт сам (`dir` в resolved config опционален).

Проверка MIME: `isMimeAllowed(mime, allowed)`.

<a id="roles-config"></a>
### Роли в конфиге

Встроенные: `owner`, `admin`, `editor`, `author`, `subscriber`. Карта `roles` добавляет роль, полностью заменяет встроенную или прячет её (`author: false`). Slug `owner` зарезервирован: запись в конфиге игнорируется (warning).

Права на ресурс: `true` (все CRUD), `false` / нет ключа (ничего), список `['read', 'create']`, либо для коллекций, словарей и опций карта по slug. `update` / `delete` чужой записи — только при blanket `true` на ресурс/scope.

<a id="permissions"></a>
## Права

Ресурсы: `collections` | `dictionaries` | `media` | `users` | `options`. Действия: `read` | `create` | `update` | `delete`.

Для `collections`, `dictionaries` и `options` в `can` передавайте `scope` (slug типа / страницы).

```ts
can({ role: 'editor' }, 'collections', 'update', { roles, scope: 'pages' })

canOnEntry(
  { role: 'author' },
  'collections',
  'update',
  { authorId: entry.author_id },
  { roles, scope: 'pages', userId: currentUser.id },
)
```

`owner` (`superuser`) проходит всё. `canOnEntry` для `update` / `delete` дополнительно требует автора записи, если права не blanket `true` на ресурс/scope. `read` / `create` совпадают с `can`.

Ещё: `getRole`, `isValidRole`, `isOwner`.

Встроенные права (после resolve):

| Роль | Коллекции / словари | Медиа | Users / options |
|---|---|---|---|
| owner | всё | всё | всё |
| admin | всё | всё | всё |
| editor | всё | всё | нет |
| author | read, create, update коллекций | read, create | нет |
| subscriber | read коллекций | нет | нет |

<a id="auth"></a>
## Пароли и email

Ядро не логинит пользователя. Хеш кладёте в `users.password_hash` сами.

```ts
const hash = await hashPassword(plain)
const ok = await verifyPassword(plain, user.password_hash)
```

Формат: `scrypt$N$r$p$<saltHex>$<hashHex>` (`N=16384`, `r=8`, `p=1`). Старый `scrypt$<saltHex>$<hashHex>` (дефолты Node) `verifyPassword` ещё принимает. Сломанный хеш → `false`, не throw. Длина пароля больше `MAX_PASSWORD_LENGTH` (1024): `hashPassword` бросает, `verifyPassword` возвращает `false`.

```ts
validateEmail(email)    // { ok: true } | { ok: false, error }
validatePassword(plain) // минимум MIN_PASSWORD_LENGTH (8)
```

Сообщения ошибок — английские, для UI адаптера.

<a id="fields"></a>
## Поля

Карта `Fields`: ключ → `Field`. У большинства типов обязателен `label`. Общие опции: `instructions`, `required`, `conditionalLogic`, `position` (`main` | `sidebar`), `columnWidth`.

Типы значений: `text`, `textarea`, `number`, `range`, `email`, `url`, `password`, `wysiwyg`, `oembed`, `image`, `file`, `gallery`, `select`, `checkbox`, `radio`, `image_select`, `button_group`, `true_false`, `link`, `post_object`, `page_link`, `relationship`, `dictionary`, `user`, `open_street_map`, `date_picker`, `date_time_picker`, `time_picker`, `color_picker`, `group`, `repeater`, `flexible_content`.

Только вёрстка (ключа значения нет): `tab`, `accordion`, `separator`, `message`. У `tab` / `accordion` `subFields` панелей пишутся **плоско** в родителя, не под ключом контейнера.

Условная видимость: `conditionalLogic` — массив групп (OR), внутри группы AND. Операторы: `empty`, `notEmpty`, `equal`, `notEqual`, `contains`, `notContains`, `matches`, `gt`, `lt`. Набор по типу поля — `FIELD_OPERATORS` / `isOperatorAllowed`. Паттерн `matches` длиннее `MAX_MATCHES_PATTERN_LENGTH` (200) не матчится. HTML в `nl2br`/`autop` экранируется; здесь значения сырые.

Дефолты формы: `buildFormValues`, `createFieldDefault`, `ensureGroupDefaults`, `collectVisibleValueKeys`. Layout-типы в стор не кладутся.

Индексируемые скаляры (Postgres JSONB): `text`, `textarea`, `number`, `range`, `email`, `url`, `select`, `radio`, `button_group`, `true_false`, даты/время, `color_picker`. Пометить поле: `indexed: true` (где тип это допускает).

Поле `dictionary` ссылается на slug словаря. У `relationship` / `post_object` / `page_link` фильтр терминов — `dictionary?: string[]`.

<a id="rewrite"></a>
## ЧПУ

```ts
matchCollectionPath(collections, '/page/about/team')
// { collectionSlug: 'pages', segments: ['about', 'team'], slugPath: 'about/team' }

buildPublicPath('/page/%name%', 'pages', 'about/team') // '/page/about/team'
normalizePublicPath('page/about/?x=1')                 // '/page/about'
resolveArchivePath({ rewrite: '/page/%name%', has_archive: true }, 'pages') // '/page'
resolveArchivePath({ has_archive: 'typepage' }, 'type')                    // '/typepage'
```

Сначала более длинный `rewrite`. При равной длине — порядок ключей в объекте конфига (не полагайтесь на это между движками). Без `%name%` паттерн не матчится. `public: false` исключает коллекцию из `matchPublicCollectionRoute`. Архив (`has_archive`) матчится только как точный путь, и только если запись с тем же URL не перехватила rewrite.

`buildSlugPathMap(entries)` — `id → parent/child`. Цикл в `parent_id` сжимается до собственного slug.

Поиск строки по сегментам: `findCollectionBySlugPath`. Сборка пути записи: `loadCollectionSlugPath`.

<a id="block-instances"></a>
## Экземпляры блоков

В `collections.blocks` лежит JSON-массив `{ id, name, data }`. `name` — slug из конфига.

```ts
createBlockInstance('hero', { title: 'Hi' })
ensureBlockIds(raw)   // битый/пустой id заменяется
newBlockId()          // 10 символов, буква + [a-z0-9], не секрет
isValidBlockId(id)
```

Id годится как HTML id / якорь, длина до 64, вручную — с буквы.

<a id="text"></a>
## Текст

```ts
transliterate('О нас') // 'O nas'
nl2br(text)            // escape HTML, затем \n → <br>
autop(text)            // абзацы <p>, одиночный \n внутри → <br>
```

`transliterate` — русская и частая украинская кириллица → латиница, остальное как есть. Её же вызывает `sanitizeFilename`. Для slug страниц используйте ту же функцию, не копируйте карту.

<a id="media"></a>
## Медиа-слой

Таблица `media` — метаданные. Байты — `MediaStorage`:

```ts
const storage = createLocalMediaStorage({
  dir: '/var/www/uploads',
  publicPrefix: '/uploads',
})
```

Ключи не выходят из `dir` (`..`, абсолютные пути, `\0` — ошибка). `buildPublicUrl(key, prefix)` кодирует сегменты.

Имена:

```ts
sanitizeFilename('C:\\tmp\\фото.jpg') // 'foto.jpg'
await prepareUploadKey(originalName, mimeType, key => storage.exists(key))
await uniqueFilename('photo.jpg', exists) // photo-1.jpg, photo-2.jpg, …
incrementFilename('photo-1.jpg')          // photo-2.jpg
```

Варианты (jpeg/png/webp; SVG, PDF, GIF как есть):

```ts
if (hasImageWork(config.media)) {
  const variants = await generateVariants({ storage, key, mimeType, data, config: config.media })
}
```

Матрица: включённые avif/webp полного размера + каждый `imageSizes` в оригинале и доп. форматах. Полный доп. формат: `photo.webp`. Размер: `photo-480x480.webp`. Имя `full` в метаданных — `FULL_SIZE`. Сбой генерации откатывает файлы этой попытки. Потолок декодирования — `maxInputPixels` (бомба из крошечного файла с гигантским холстом).

`readImageSize(buffer)` — PNG/GIF/JPEG/WebP из заголовка. `toMediaItem` собирает DTO для админки/фронта.

Строка в БД и файл — разные шаги. `createMedia` пишет только строку; уникальный `filename` при гонке дополняется суффиксом.

<a id="indexes"></a>
## Индексы полей

Только PostgreSQL (нужен `pg_indexes`). SQLite адаптер пропускает sync. Nuxt вызывает это после миграции при старте сервера.

Имена вида `collections_fld__{collection}__{path}__idx`, не длиннее 63 байт. Вложенное поле после slug коллекции помечается `n`, чтобы путь не сливался с корневым именем. Выражение: `(fields->>'title')` или `(fields->'seo'->>'title')`, плюс cast (`numeric`, `boolean`, `date`, …).

```ts
const result = await syncCollectionFieldIndexes(db, resolved.collections)
```

Эквивалент: `collectDesiredFieldIndexes` → `loadActualFieldIndexes` → `computeIndexDiff` → `applyFieldIndexDiff`. `applyFieldIndexDiff` исполняет только SQL, который сама собрала, и берёт advisory lock `FIELD_INDEX_LOCK_KEY`. Чужие индексы не трогает.

<a id="oembed"></a>
## oEmbed

```ts
const result = await fetchOembed({ url, maxwidth, maxheight, fetch })
```

Сначала известные хосты (YouTube, Vimeo, Twitter/X, SoundCloud, Flickr), иначе `<link rel="alternate">` со страницы. Не прокси с открытым доступом: авторизацию оставляет адаптер.

Отказ: не-http(s), private IPv4, слишком большое тело, больше 3 редиректов. Таймаут 10 с, User-Agent `miraicms-oembed`. Результат: `{ ok: true, data }` или `{ ok: false, error, status: 422 | 404 | 502 }`.

<a id="database"></a>
## База данных

Kysely, миграции, запросы. Подключение передаёте вы — URL, пул, файл или биндинг D1.

Порядок: миграция → клиент → запросы. Один `db` отдаёте в функции из своих роутов.

Папки: `database/client` — Kysely и типы таблиц, `database/queries` — запросы, `database/migrations` — SQL и раннеры.

Таблицы: `users`, `collections`, `collection_meta`, `collection_revisions`, `media`, `dictionaries`, `collection_dictionaries`, `options`, журнал `_miraicms_migrations`.

Уникальность среди соседей: коллекции и словари — `(type, parent_id, slug)` (Postgres `NULLS NOT DISTINCT`, SQLite `COALESCE(parent_id, 0)`). Email пользователя и `media.filename` уникальны. Циклы `parent_id` на коллекциях и словарях режет триггер в БД (на D1 FK/триггеры между запросами не держатся).

Типы таблиц — `database/client/schema.ts`. Канонический DDL — `migrations/*/schema.ts`. Файлы `.sql` рядом — копия для чтения; раннер их не выполняет. Меняя схему, правьте `schema.ts`, копию `.sql` и типы Kysely вместе.

JSON-колонки всегда через `JSON.stringify` / `JSON.parse`, поэтому `false`, числа и строки одинаковы на SQLite и Postgres. Даты в JS — `Date`. Не оборачивайте `Json<T>` в `Generated<>`: `Selectable` снимает только один `ColumnType`.

Списки `listUsers`, `listCollections`, `listMedia` принимают необязательный `{ limit, offset }`.

<a id="db-quickstart"></a>
### Быстрый старт

#### PostgreSQL

```ts
const url = 'postgres://postgres:admin@127.0.0.1:5432/miraicms'

await migratePostgres(url)

const db = createPostgresDb(url)

const user = await createUser(db, {
  email: 'ada@example.com',
  password_hash: hash, // считаете hashPassword снаружи
  name: 'Ada',
  role: 'admin',
})

await db.destroy() // закрывает пул, который создал createPostgresDb
```

#### SQLite (файл)

```ts
const file = './data/miraicms.db'

await migrateSqlite(file)

const db = createSqliteDb(file)

const found = await findUserByEmail(db, 'ada@example.com')

await db.destroy()
```

Файл открывается через `better-sqlite3`. Родительская папка создаётся сама.

#### Cloudflare D1

```ts
await migrateSqlite({ d1: env.DB })

const db = createSqliteDb({ d1: env.DB })

const users = await listUsers(db)

await db.destroy() // биндинг D1 не закрывается
```

В Worker не используйте `better-sqlite3`. `db.transaction()` на D1 не работает: нет сессии между запросами. Нужен один statement или `env.DB.batch()`.

D1 **не держит** `PRAGMA foreign_keys = ON` между запросами. Каскады в схеме описаны, но Worker их не исполняет.

Выбор цели из уже резолвнутого конфига:

```ts
const target = resolveDatabaseTarget(resolved.database)
if (target.driver === 'postgres') {
  await migratePostgres(target.url)
}
else {
  await migrateSqlite(target.filename)
}
```

<a id="db-client"></a>
### Клиент

Фабрики возвращают `Kysely<Database>`.

SQLite и D1 хранят даты как ISO-текст, JSON как текст. Клиент приводит к `Date`, объекту, `boolean`. Postgres отдаёт `timestamptz` / `jsonb` / `boolean`.

Парсер `bigint` → `number` ставится **только** на пул, который создал `createPostgresDb()`. Чужой `pool` не трогаем.

#### PostgreSQL

```ts
const db = createPostgresDb('postgres://postgres:admin@127.0.0.1:5432/miraicms')
const db = createPostgresDb({ connectionString: process.env.DATABASE_URL })
const db = createPostgresDb({
  host: '127.0.0.1',
  port: 5432,
  database: 'miraicms',
  user: 'postgres',
  password: 'admin',
})
const db = createPostgresDb({ pool })
// destroy() этот пул не закрывает
```

Для Vercel Postgres / Neon в клиенте можно взять pooled URL (`POSTGRES_URL`). Миграции — только non-pooling, см. ниже.

#### SQLite (файл)

```ts
const db = createSqliteDb('./data/miraicms.db')
const db = createSqliteDb({ filename: './data/miraicms.db' })
const db = createSqliteDb({ filename: ':memory:' })
const db = createSqliteDb({ database })
// database — соединение better-sqlite3; destroy() его не закрывает
```

Нужно ровно одно из: путь / `{ filename }` / `{ database }` / `{ d1 }`.

Для файла: `PRAGMA busy_timeout = 5000` и `journal_mode = WAL` (рядом появятся `-wal`/`-shm`). `:memory:` и `file:…?mode=memory` — каталоги не создаются. Остальные `file:` URI — путь на диске, родительская папка создаётся.

#### D1

```ts
const db = createSqliteDb({ d1: env.DB })
```

<a id="db-migrations"></a>
### Миграции

Схема CMS применяется **один раз** (bootstrap), затем SQL дополнений. Журнал — `_miraicms_migrations`. Повторный запуск пропускает уже записанные id. Результат: `{ applied, alreadyApplied }`. Правка DDL после первого применения **не попадёт** в живую базу: нужен новый `schemaId` или ручной SQL. Версионированных миграций ядра нет.

#### PostgreSQL

```ts
await migratePostgres('postgres://postgres:admin@127.0.0.1:5432/miraicms')
await migratePostgres({ connectionString: process.env.DATABASE_URL })
await migratePostgres({
  host: '127.0.0.1',
  port: 5432,
  database: 'miraicms',
  user: 'postgres',
  password: 'admin',
})
await migratePostgres({ pool })
// этот пул не закрывается
```

Схема: `migrations/postgres/schema.ts`. Параллельные прогоны сериализует `pg_advisory_xact_lock`.

#### Vercel Postgres

Это PostgreSQL на Neon. Для **миграции** — прямая (non-pooling) строка и runtime **Node**. Не используйте pooled URL, Edge и пул `@vercel/postgres`: раннер идёт через `pg` (TCP), транзакцию и advisory lock.

```ts
await migratePostgres({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
})
```

Если в URL нет `sslmode=require`, передайте `ssl: true`. `POSTGRES_URL` (pooled) — для запросов приложения. Миграцию гоняйте при деплое / в Node-хуке, не на каждый Edge-запрос.

#### SQLite (файл)

```ts
await migrateSqlite('./data/miraicms.db')
await migrateSqlite({ filename: './data/miraicms.db' })
await migrateSqlite({ filename: ':memory:' })
await migrateSqlite({ database })
```

На соединении `PRAGMA foreign_keys = ON`. Для `{ filename }` нужен `better-sqlite3`.

#### Cloudflare D1

Тот же SQL. Передавайте биндинг, не путь к файлу. Запускайте в Worker / Node-совместимом runtime Cloudflare.

```ts
await migrateSqlite({ d1: env.DB })
```

#### Таблицы дополнения

`schemaId` стабильный и не равен `miraicms`.

```ts
await migratePostgres({
  connectionString: process.env.DATABASE_URL,
  schemaId: 'shop',
  schemaSql: 'CREATE TABLE IF NOT EXISTS products (id bigint PRIMARY KEY);',
})

await migrateSqlite({
  filename: './data/miraicms.db',
  schemaId: 'shop',
  schemaSql: 'CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT);',
})
```

<a id="queries-users"></a>
### Запросы: users

Строки приходят целиком, включая `password_hash`. Email на create/update — `trim` + нижний регистр. Поиск — `lower(email)`.

Нельзя снять роль / удалить **последнего** `owner`: `Cannot remove the last owner.`

```ts
const created = await createUser(db, {
  email: 'Ada@example.com',
  password_hash: hash,
  name: 'Ada',
  role: 'editor',
  status: 'active',
  avatar: null,
})

const byId = await findUserById(db, created.id)
const byEmail = await findUserByEmail(db, 'ada@example.com')

const patched = await updateUser(db, created.id, {
  name: 'Ada Lovelace',
  status: 'banned',
})
// нет строки → undefined
// пустой patch → текущая строка

const removedUser = await deleteUser(db, created.id)
// FK: author_id / uploaded_by → NULL

const all = await listUsers(db) // created_at, затем id
```

Пул на процесс: создайте `db` один раз, не вызывайте `destroy()` на каждый запрос.

<a id="queries-collections"></a>
### Запросы: collections

Тип записи — `type`. Корзина (`trash`) в `listCollections` не входит. Хеш пароля записи, если нужен, считаете снаружи.

Если `status` — `published`, а `published_at` пуст, подставляется сейчас **только когда даты ещё не было**. Повторный publish дату не затирает.

`createCollection` / смена `parent_id` зовут `validateCollectionParent` (тот же тип, не trash, не self, не потомок). Ошибки: `An entry cannot be its own parent.`, `Parent entry not found.`, `Cannot set a descendant as parent.`

`deleteCollection` — жёсткое удаление (meta, ревизии, связи со словарями каскадом; у детей `parent_id` → `NULL`). В корзину: `updateCollection(..., { status: 'trash' })`.

Slug и title на записи trim-ятся.

```ts
const page = await createCollection(db, {
  type: 'page',
  slug: 'about',
  title: 'About',
  status: 'published',
  author_id: user.id,
  parent_id: null,
  fields: {},
  blocks: [],
})

const byId = await findCollectionById(db, page.id)
const pages = await listCollections(db, 'page') // menu_order, затем created_at desc

await findCollectionBySlugPath(db, 'page', ['about', 'team'])
await findCollectionBySlugPath(db, 'page', ['about'], ['published']) // только публичные
await loadCollectionSlugPath(db, 'page', page.id) // 'about' или 'parent/child'

await listCollectionParentOptions(db, 'page', page.id) // без себя и потомков

await updateCollection(db, page.id, { status: 'trash' })
await deleteCollection(db, page.id)
```

<a id="queries-collection-meta"></a>
### Запросы: collection_meta

Ключ-значение на запись. PK — `(collection_id, key)`. `setCollectionMeta` — upsert.

```ts
await setCollectionMeta(db, page.id, 'seo.title', 'About')
const row = await findCollectionMeta(db, page.id, 'seo.title')
const all = await listCollectionMeta(db, page.id)
await deleteCollectionMeta(db, page.id, 'seo.title') // true, если строка была
```

<a id="queries-collection-revisions"></a>
### Запросы: collection_revisions

Снимок `data` (json). Строки не обновляются. Удаление коллекции снимает ревизии каскадом.

```ts
const revision = await createCollectionRevision(db, {
  collection_id: page.id,
  author_id: user.id,
  data: { title: page.title, fields: page.fields, blocks: page.blocks },
})

const latest = await listCollectionRevisions(db, page.id) // created_at desc
const one = await findCollectionRevisionById(db, revision.id)
```

<a id="queries-media"></a>
### Запросы: media

Только строка. Файл, URL и sharp — снаружи. `filename` уникален; при конфликте `createMedia` пробует суффикс.

```ts
const item = await createMedia(db, {
  filename: 'photo.webp',
  mime_type: 'image/webp',
  filesize: 12_345,
  width: 1200,
  height: 800,
  alt: 'Lake',
  uploaded_by: user.id,
})

const byId = await findMediaById(db, item.id)
const byName = await findMediaByFilename(db, 'photo.webp')
const library = await listMedia(db) // created_at desc

await updateMedia(db, item.id, {
  alt: 'Lake at dusk',
  variants_status: 'ready',
  variants: [{ filename: 'photo-480x480.webp', width: 480, height: 480 }],
})

await deleteMedia(db, item.id)
```

`variants_status`: `none` | `pending` | `ready` | `failed`.

<a id="queries-dictionaries"></a>
### Запросы: dictionaries

Справочник (категории, теги). Различаются `type`. Циклы `parent_id` режет триггер.

`deleteDictionary` снимает связи в `collection_dictionaries`; у детей `parent_id` → `NULL`.

```ts
const category = await createDictionary(db, {
  type: 'category',
  slug: 'news',
  title: 'News',
  parent_id: null,
  fields: {},
})

const byId = await findDictionaryById(db, category.id)
const bySlug = await findDictionaryByTypeAndSlug(db, 'category', 'news')
const categories = await listDictionaries(db, 'category') // title, затем id

await updateDictionary(db, category.id, { title: 'Newsroom' })
await deleteDictionary(db, category.id)
```

<a id="queries-collection-dictionaries"></a>
### Запросы: collection_dictionaries

Many-to-many запись ↔ термин. Повторный `link` не дублирует строку. Несколько терминов на одну запись — норма: PK `(collection_id, dictionary_id)`, без уникальности по `type`. `setCollectionDictionaries` полностью заменяет набор связей. `listCollectionsByDictionary` скрывает `trash`, как `listCollections`; `{ includeTrash: true }` — и корзину.

```ts
await linkCollectionDictionary(db, page.id, category.id)
const terms = await listDictionariesByCollection(db, page.id)
const posts = await listCollectionsByDictionary(db, category.id)
const withTrash = await listCollectionsByDictionary(db, category.id, { includeTrash: true })
await unlinkCollectionDictionary(db, page.id, category.id) // true, если связь была

await setCollectionDictionaries(db, page.id, [news.id, sport.id])
await setCollectionDictionaries(db, page.id, []) // снять все
```

<a id="queries-options"></a>
### Запросы: options

Ключ-значение сайта. `value` — любой JSON, включая примитивы. Схема полей админки в БД не хранится: ключ страницы — slug из конфига.

`setOption` — upsert.

```ts
await setOption(db, 'site', { title: 'Mirai', description: 'CMS' })
await setOption(db, 'maintenance', false)

const site = await findOption(db, 'site')
const all = await listOptions(db)
await deleteOption(db, 'maintenance')
```

<a id="dependencies"></a>
## Зависимости

| Когда | Пакет | Зачем |
|---|---|---|
| Всегда | `kysely` | Типы, клиент, запросы |
| PostgreSQL | `pg` | `migratePostgres()`, `createPostgresDb()`, индексы полей |
| SQLite-файл | `better-sqlite3` | `createSqliteDb(path)`, `migrateSqlite(path)` |
| D1 | — | Биндинг `env.DB` |
| Варианты картинок | `sharp` | `generateVariants`, `readImageSize` |

`pg`, `better-sqlite3` и `sharp` в Cloudflare Worker не используйте: там только `{ d1 }` и без серверного ресайза.
