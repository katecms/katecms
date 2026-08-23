# База данных

Без привязки к Nuxt/Next: подключение передаёте сами.

```ts
import {
  createPostgresDb,
  createSqliteDb,
  createUser,
  findUserByEmail,
  migratePostgres,
  migrateSqlite,
} from './database'
```

## Клиент

Типы таблиц — `schema.ts` (Kysely). Фабрики не читают env: URL, пул или файл передаёте аргументом.

```ts
const pg = createPostgresDb('postgres://postgres:admin@127.0.0.1:5432/miraicms')
const pgFromPool = createPostgresDb({ pool }) // `destroy()` этот пул не закрывает

const sqlite = createSqliteDb('./data/miraicms.db')
const sqliteFromDb = createSqliteDb({ database }) // `destroy()` это соединение не закрывает
const d1 = createSqliteDb({ d1: env.DB })

await pg.destroy()
await sqlite.destroy()
await d1.destroy()
```

SQLite/D1: даты → `Date`, JSON-текст → объект, `autoload` 0/1 → `boolean`. Kysely-транзакции на D1 не поддерживаются (нет сессии между запросами).

## Запросы

Функции принимают `Kysely<Database>`, без env и без HTTP.

```ts
import {
  createUser,
  findUserByEmail,
  findUserById,
  listUsers,
  updateUser,
} from './database'

const user = await findUserByEmail(db, 'a@b.c')
const created = await createUser(db, {
  email: 'a@b.c',
  password_hash: hash,
})
await updateUser(db, created.id, { name: 'Ada' })
const users = await listUsers(db)
```

## Миграции

Применяет схему CMS один раз, затем при необходимости SQL дополнений.

```ts
import { migratePostgres, migrateSqlite } from './database'
```

Применённые схемы пишутся в `_miraicms_migrations`. Повторный запуск пропускает уже записанные id. Результат: `{ applied, alreadyApplied }`.

Дополнение передаёт то же подключение, что и модуль. `schemaId` должен быть стабильным и не равен `miraicms`.

Если правите `postgres.sql` или `sqlite.sql`, синхронизируйте `migrations/*/schema.ts` (раннер берёт встроенную копию, чтобы бандлеру не нужен был `.sql`) и типы в корневом `schema.ts`.

## PostgreSQL

Нужен **PostgreSQL 15+**. Схема — `migrations/postgres/postgres.sql`.

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

await migratePostgres({ pool }) // существующий `pg.Pool`; `migratePostgres()` его не закрывает

await migratePostgres({
  connectionString: process.env.DATABASE_URL,
  schemaId: 'shop',
  schemaSql: 'CREATE TABLE IF NOT EXISTS products (id bigint PRIMARY KEY);',
})
```

### Vercel Postgres

Vercel Postgres — это PostgreSQL на Neon. SQL тот же; нужна **прямая** (non-pooling) строка и runtime **Node**. Не используйте pooled URL, Edge и пул `@vercel/postgres`: `migratePostgres()` работает через `pg` (TCP), транзакцию и `pg_advisory_xact_lock`.

```ts
await migratePostgres({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
})
```

`POSTGRES_URL` (pooled) — для запросов приложения, не для этого раннера.

Если в URL нет `sslmode=require`:

```ts
await migratePostgres({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: true,
})
```

Запускайте миграцию при деплое / в Node-хуке, не на каждый Edge-запрос.

## SQLite

Работает с **файлом SQLite** (Node) и **Cloudflare D1**. Схема — `migrations/sqlite/sqlite.sql`. На каждом соединении раннер включает `PRAGMA foreign_keys = ON`.

### Файл

Путь к файлу, `:memory:`, или уже открытое соединение (`better-sqlite3` / `node:sqlite`). Для `{ filename }` раннер открывает файл через `better-sqlite3`, а если пакета нет — через `node:sqlite` (Node.js 22+).

```ts
await migrateSqlite('./data/miraicms.db')
await migrateSqlite({ filename: './data/miraicms.db' })
await migrateSqlite({ filename: ':memory:' })

await migrateSqlite({ database }) // существующее соединение; `migrateSqlite()` его не закрывает

await migrateSqlite({
  filename: './data/miraicms.db',
  schemaId: 'shop',
  schemaSql: 'CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT);',
})
```

### Cloudflare D1

Тот же SQL. Передавайте биндинг D1, не путь к файлу. Не используйте `better-sqlite3` внутри Worker.

```ts
await migrateSqlite({ d1: env.DB })

await migrateSqlite({
  d1: env.DB,
  schemaId: 'shop',
  schemaSql: 'CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT);',
})
```

Запускайте в Worker / Node-совместимом runtime Cloudflare, не как локальный файл на диске VPS.
