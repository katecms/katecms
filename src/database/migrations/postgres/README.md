# PostgreSQL-миграции

Применяет схему CMS (`postgres.sql`) один раз, затем при необходимости SQL дополнений. Без привязки к Nuxt/Next: подключение передаёте сами. Нужен **PostgreSQL 15+**.

```ts
import { migratePostgres } from './database/migrations'
```

Применённые схемы пишутся в `_miraicms_migrations`. Повторный запуск пропускает уже записанные id. Результат: `{ applied, alreadyApplied }`.

Если правите `postgres.sql`, синхронизируйте `schema.ts` (раннер берёт встроенную копию, чтобы бандлеру не нужен был `.sql`).

## Подключение

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
```

## Таблицы дополнения

Дополнение передаёт то же подключение, что и модуль. `schemaId` должен быть стабильным и не равен `miraicms`.

```ts
await migratePostgres({
  connectionString: process.env.DATABASE_URL,
  schemaId: 'shop',
  schemaSql: 'CREATE TABLE IF NOT EXISTS products (id bigint PRIMARY KEY);',
})
```

## Vercel Postgres

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
