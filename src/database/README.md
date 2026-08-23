# База данных

Слой без Nuxt и Next: миграции, клиент Kysely и запросы к таблицам. Подключение передаёте сами — URL, пул, файл или биндинг D1. Env внутри не читается.

```ts
import {
  createCollection,
  createCollectionRevision,
  createDictionary,
  createMedia,
  createPostgresDb,
  createSqliteDb,
  createUser,
  deleteCollection,
  deleteCollectionMeta,
  deleteDictionary,
  deleteMedia,
  deleteOption,
  findCollectionById,
  findCollectionMeta,
  findCollectionRevisionById,
  findDictionaryById,
  findDictionaryByTypeAndSlug,
  findMediaByFilename,
  findMediaById,
  findOption,
  findUserByEmail,
  findUserById,
  linkCollectionDictionary,
  listAutoloadOptions,
  listCollectionMeta,
  listCollectionRevisions,
  listCollections,
  listCollectionsByDictionary,
  listDictionaries,
  listDictionariesByCollection,
  listMedia,
  listOptions,
  listUsers,
  migratePostgres,
  migrateSqlite,
  setCollectionMeta,
  setOption,
  unlinkCollectionDictionary,
  updateCollection,
  updateDictionary,
  updateMedia,
  updateUser,
} from './database'
```

Типичный порядок: миграция → клиент → запросы. Один и тот же `db` отдаёте в функции запросов из своих роутов.

Папки: `client/` — Kysely и типы таблиц, `queries/` — запросы, `migrations/` — SQL и раннеры. Снаружи по-прежнему `from './database'`.

## Быстрый старт

### PostgreSQL

```ts
const url = 'postgres://postgres:admin@127.0.0.1:5432/miraicms'

await migratePostgres(url)

const db = createPostgresDb(url)

const user = await createUser(db, {
  email: 'ada@example.com',
  password_hash: hash, // хеш считаете снаружи
  name: 'Ada',
  role: 'admin',
})

await db.destroy() // закрывает пул, который создал createPostgresDb
```

Нужен PostgreSQL **15+**.

### SQLite (файл)

```ts
const file = './data/miraicms.db'

await migrateSqlite(file)

const db = createSqliteDb(file)

const found = await findUserByEmail(db, 'ada@example.com')

await db.destroy() // закрывает файл, который открыл createSqliteDb
```

Файл открывается через `better-sqlite3`. Родительская папка создаётся сама.

### Cloudflare D1

```ts
await migrateSqlite({ d1: env.DB })

const db = createSqliteDb({ d1: env.DB })

const users = await listUsers(db)

await db.destroy() // биндинг D1 не закрывается
```

В Worker не используйте `better-sqlite3`. Kysely-транзакции (`db.transaction()`) на D1 не работают: нет сессии между запросами. Нужен один statement или `env.DB.batch()`.

## Клиент

Фабрики возвращают `Kysely<Database>`. Типы таблиц — `client/schema.ts`.

SQLite и D1 в БД хранят даты как ISO-текст, JSON как текст, `autoload` как `0`/`1`. Клиент приводит это к общему виду: `Date`, объект, `boolean`. Postgres так и отдаёт `timestamptz` / `jsonb` / `boolean`.

### PostgreSQL

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

Для Vercel Postgres / Neon в клиенте можно взять pooled URL (`POSTGRES_URL`) — это обычные запросы приложения. Миграции — только non-pooling, см. ниже.

### SQLite (файл)

```ts
const db = createSqliteDb('./data/miraicms.db')
const db = createSqliteDb({ filename: './data/miraicms.db' })
const db = createSqliteDb({ filename: ':memory:' })

const db = createSqliteDb({ database })
// database — соединение better-sqlite3; destroy() его не закрывает
```

Нужно ровно одно из: путь / `{ filename }` / `{ database }` / `{ d1 }`.

### D1

```ts
const db = createSqliteDb({ d1: env.DB })
```

## Запросы: users

Все функции принимают `db`. Нет HTTP, сессии и хеша пароля — это в роуте.

Строки приходят целиком, включая `password_hash`. Email ищется без учёта регистра (`lower(email)`).

```ts
const created = await createUser(db, {
  email: 'Ada@example.com', // сохранится с trim; поиск идёт в нижнем регистре
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
// нет такой строки → undefined
// пустой patch → текущая строка, как findUserById

const all = await listUsers(db) // created_at, затем id
```

В роуте (Nuxt `defineEventHandler` или Next `GET`/`POST` — без разницы):

```ts
const db = createPostgresDb(process.env.DATABASE_URL!)
try {
  const user = await findUserByEmail(db, email)
  if (!user) {
    return null
  }
  return { id: user.id, email: user.email, name: user.name }
}
finally {
  await db.destroy()
}
```

Если пул живёт всё время процесса, создайте `db` один раз и не вызывайте `destroy()` на каждый запрос.

## Запросы: collections

Запись в таблице `collections` (страница, пост и т.д. — различаются полем `type`). Корзина (`trash`) в список не входит. Хеш пароля записи, если нужен, считаете снаружи.

Если `status` — `published`, а `published_at` нет, подставляется текущее время (так требует CHECK в схеме). Циклы `parent_id` отсекает триггер в БД.

`deleteCollection` — жёсткое удаление. Meta, ревизии и связи с dictionaries снимаются каскадом; у дочерних записей `parent_id` становится `NULL`. В корзину без удаления из таблицы: `updateCollection(..., { status: 'trash' })`.

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
const pages = await listCollections(db, 'page') // без trash; menu_order, затем created_at desc

const drafted = await updateCollection(db, page.id, {
  status: 'draft',
  title: 'About us',
})
// нет такой строки → undefined

await updateCollection(db, page.id, { status: 'trash' })
const removed = await deleteCollection(db, page.id)
// нет такой строки → undefined
```

## Запросы: collection_meta

Ключ-значение на запись коллекции. Первичный ключ — `(collection_id, key)`. `setCollectionMeta` вставляет или обновляет.

```ts
await setCollectionMeta(db, page.id, 'seo.title', 'About')
await setCollectionMeta(db, page.id, 'seo.title', 'About us') // upsert

const row = await findCollectionMeta(db, page.id, 'seo.title')
const all = await listCollectionMeta(db, page.id)
await deleteCollectionMeta(db, page.id, 'seo.title') // true, если строка была
```

## Запросы: collection_revisions

Снимок `data` (json). Строки не обновляются — только создание и чтение. При удалении коллекции ревизии снимаются каскадом.

```ts
const revision = await createCollectionRevision(db, {
  collection_id: page.id,
  author_id: user.id,
  data: { title: page.title, fields: page.fields, blocks: page.blocks },
})

const latest = await listCollectionRevisions(db, page.id) // created_at desc, затем id
const one = await findCollectionRevisionById(db, revision.id)
```

## Запросы: media

Только строка в таблице. Файл на диск, URL и sharp — снаружи. `filename` уникален.

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

const removed = await deleteMedia(db, item.id)
// нет такой строки → undefined
```

## Запросы: dictionaries

Справочник (категории, теги и т.д.) — различаются полем `type`. Пара `type` + `slug` уникальна. Циклы `parent_id` отсекает триггер в БД.

`deleteDictionary` снимает связи в `collection_dictionaries` каскадом; у дочерних терминов `parent_id` становится `NULL`.

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
const removedTerm = await deleteDictionary(db, category.id)
```

## Запросы: collection_dictionaries

Связь many-to-many между записью коллекции и термином. Повторный `link` не дублирует строку.

```ts
await linkCollectionDictionary(db, page.id, category.id)
const terms = await listDictionariesByCollection(db, page.id)
const posts = await listCollectionsByDictionary(db, category.id)
await unlinkCollectionDictionary(db, page.id, category.id) // true, если связь была
```

## Запросы: options

Ключ-значение сайта. `value` — любой JSON (в том числе объект как у `collections.fields`). Схема полей админки в БД не хранится.

`setOption` вставляет или обновляет. `autoload` по умолчанию `true`; при обновлении без третьего аргумента флаг не меняется.

```ts
await setOption(db, 'site', { title: 'Mirai', description: 'CMS' })
await setOption(db, 'maintenance', false, false)

const site = await findOption(db, 'site')
const boot = await listAutoloadOptions(db)
const all = await listOptions(db)
await deleteOption(db, 'maintenance') // true, если строка была
```

## Миграции

Применяет схему CMS один раз, затем SQL дополнений. Журнал — `_miraicms_migrations`. Повторный запуск пропускает уже записанные id. Результат: `{ applied, alreadyApplied }`.

Если правите `postgres.sql` или `sqlite.sql`, обновите `migrations/*/schema.ts` (раннер берёт встроенную копию) и типы в `client/schema.ts`.

### PostgreSQL

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
// migratePostgres() этот пул не закрывает
```

Схема: `migrations/postgres/postgres.sql`.

### Vercel Postgres

Это PostgreSQL на Neon. Для **миграции** нужна прямая (non-pooling) строка и runtime **Node**. Не используйте pooled URL, Edge и пул `@vercel/postgres`: раннер работает через `pg` (TCP), транзакцию и `pg_advisory_xact_lock`.

```ts
await migratePostgres({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
})
```

Если в URL нет `sslmode=require`:

```ts
await migratePostgres({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: true,
})
```

`POSTGRES_URL` (pooled) — для запросов приложения, не для `migratePostgres()`. Миграцию запускайте при деплое / в Node-хуке, не на каждый Edge-запрос.

### SQLite (файл)

```ts
await migrateSqlite('./data/miraicms.db')
await migrateSqlite({ filename: './data/miraicms.db' })
await migrateSqlite({ filename: ':memory:' })

await migrateSqlite({ database })
// migrateSqlite() это соединение не закрывает
```

Схема: `migrations/sqlite/sqlite.sql`. На соединении включается `PRAGMA foreign_keys = ON`. Для `{ filename }` используется `better-sqlite3`, иначе `node:sqlite` (Node.js 22+).

### Cloudflare D1

Тот же SQL. Передавайте биндинг, не путь к файлу.

```ts
await migrateSqlite({ d1: env.DB })
```

Запускайте в Worker / Node-совместимом runtime Cloudflare.

### Таблицы дополнения

Дополнение передаёт то же подключение. `schemaId` стабильный и не равен `miraicms`.

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

await migrateSqlite({
  d1: env.DB,
  schemaId: 'shop',
  schemaSql: 'CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT);',
})
```

<!-- Этот раздел всегда держите последним в файле. -->

## Зависимости

npm-пакеты этого слоя. Ставьте только то, чем пользуетесь.

| Когда | Пакет | Зачем |
|---|---|---|
| Всегда | `kysely` | Типы, клиент, запросы |
| PostgreSQL | `pg` | `migratePostgres()`, `createPostgresDb()` |
| SQLite-файл | `better-sqlite3` | `createSqliteDb(path)`, `migrateSqlite(path)` |
| D1 | — | Биндинг `env.DB`, отдельный пакет не нужен |

Для файла SQLite миграция без `better-sqlite3` может взять встроенный `node:sqlite` (Node.js **22+**). Клиент `createSqliteDb({ filename })` открывает файл через `better-sqlite3`.

`pg` и `better-sqlite3` — нативные/сетевые драйверы. В Cloudflare Worker их нет: там только `{ d1 }`.
