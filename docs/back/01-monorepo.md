# Монорепозиторий

Корень — приватный пакет `katecms-monorepo`. Публикуемые пакеты выпускаются по отдельности: `@katecms/core`, `katecms`, `katecms-form-builder`, `katecms-seo`. Дополнения экспортируют `src/module.ts` и в `files` отдают исходники. Playground `playground` — приложение-хост для разработки, в npm не уходит.

```
katecms
├── packages/core                 @katecms/core
├── packages/katecms        модуль админки и публичного API
├── packages/katecms-form-builder   конструктор форм
├── packages/katecms-seo    title, sitemap, robots, редиректы
├── playground               пример сайта
├── scripts/ai-index.mjs          индекс .ai/
├── scripts/reset-password.mjs    операционный скрипт поверх dist ядра
└── docs                          эта документация
```

## Кто кого импортирует

| Пакет | Тянет |
| --- | --- |
| `@katecms/core` | `kysely`, `pg`, `better-sqlite3`, `sharp`. Vue и Nuxt отсутствуют |
| `katecms` | ядро, `@nuxt/kit`, TipTap, Leaflet, `c12`, `magic-string` |
| `katecms-form-builder` | ядро, модуль, `kysely`, `nodemailer`, `sanitize-html`, `dompurify` |
| `katecms-seo` | ядро, модуль, `kysely` |
| playground | три Nuxt-пакета и `nuxt` |

Ядро делится на два публичных входа, потому что админские SFC попадают в клиентский бандл:

- `src/index.ts` — Node. Реэкспорт database, config, permissions, auth, fields, rewrite, blocks, text, media, indexes, oembed.
- `src/browser.ts` — то же без драйверов, sharp, применения индексов и `hashPassword`. Тип `SafeUser` и проверка длины пароля здесь есть.

`package.json` ядра ставит `"browser": "./dist/browser.mjs"`. Vite на клиенте берёт его сам. Серверный код пишет обычный импорт `@katecms/core` и получает `index`.

Тип импортируют из файла, который его объявляет (`media/types`, `config/types/*`, `database/client/schema`). Баррели `media/index.ts`, `config/index.ts`, `database/index.ts` подтягивают sharp, все резолверы или `pg`. Клиентский файл, которому нужен только тип, через эти баррели не ходит.

## Что считается внутренним

Внутри `katecms` три зоны:

| Зона | Путь | Виден хосту |
| --- | --- | --- |
| Модуль | `src/module.ts`, `src/admin-components.ts` | Только как Nuxt-модуль |
| Публичный runtime | composable чтения, `extensions`, `server/kit.ts`, стили | Да, перечисленными экспортами |
| Админка | `runtime/pages`, `runtime/internal`, почти все `runtime/server/api` | Нет. Страницы регистрирует модуль, компоненты резолвит свой Vite-плагин |

`runtime/server/api/_katecms/*` вызывает админский интерфейс и composable хоста. Это протокол модуля, не документированный внешний REST для чужих клиентов. Хостовая страница ходит в четыре composable, а те уже знают нужные URL (`/api/_katecms/resolve`, `query`, `terms`, options).

## Playground

`playground/nuxt.config.ts` — полный пример ключа `katecms`: роли, медиа, коллекции, словари. `pages/[...slug].vue` — единственный правильный образец публичной страницы. `pages/forms/[id].vue` показывает `KateCmsForm`. Сид: `pnpm --filter katecms-playground seed`.

Фикстура модуля `packages/katecms/test/fixtures/basic` — минимальное Nuxt-приложение для `test:basic`.
