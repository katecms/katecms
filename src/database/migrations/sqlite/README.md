# SQLite-миграции

Применяет схему CMS (`sqlite.sql`) один раз, затем при необходимости SQL дополнений. Без привязки к Nuxt/Next: подключение передаёте сами.

Работает с **файлом SQLite** (Node) и **Cloudflare D1**. Применённые схемы пишутся в `_miraicms_migrations`. Повторный запуск пропускает уже записанные id. Результат: `{ applied, alreadyApplied }`.

Если правите `sqlite.sql`, синхронизируйте `schema.ts`.

```ts
import { migrateSqlite } from './database/migrations'
```

На каждом соединении раннер включает `PRAGMA foreign_keys = ON`.

## SQLite (файл)

Путь к файлу, `:memory:`, или уже открытое соединение (`better-sqlite3` / `node:sqlite`). Для `{ filename }` раннер открывает файл через `better-sqlite3`, а если пакета нет — через `node:sqlite` (Node.js 22+).

```ts
await migrateSqlite('./data/miraicms.db')
await migrateSqlite({ filename: './data/miraicms.db' })
await migrateSqlite({ filename: ':memory:' })

await migrateSqlite({ database }) // существующее соединение; `migrateSqlite()` его не закрывает
```

## Cloudflare D1

Тот же SQL. Передавайте биндинг D1, не путь к файлу. Не используйте `better-sqlite3` внутри Worker.

```ts
await migrateSqlite({ d1: env.DB })
```

Запускайте в Worker / Node-совместимом runtime Cloudflare, не как локальный файл на диске VPS.

## Таблицы дополнения

Дополнение передаёт то же подключение, что и модуль. `schemaId` должен быть стабильным и не равен `miraicms`.

```ts
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
