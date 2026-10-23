# Монорепозиторий

Корень — приватный пакет `miraicms-monorepo`. Публикуемые библиотеки: `@miraicms/core` и `miraicms-nuxt`. Дополнения `miraicms-nuxt-form` и `miraicms-nuxt-seo` пока экспортируют `src/module.ts` напрямую и в `files` отдают исходники. Playground `playground-nuxt` — приложение-хост для разработки, в npm не уходит.

```
miraicms
├── packages/core                 @miraicms/core
├── packages/miraicms-nuxt        модуль админки и публичного API
├── packages/miraicms-nuxt-form   конструктор форм
├── packages/miraicms-nuxt-seo    title, sitemap, robots, редиректы
├── playground-nuxt               пример сайта
├── scripts/ai-index.mjs          индекс .ai/
├── scripts/reset-password.mjs    операционный скрипт поверх dist ядра
└── docs                          эта документация
```

## Кто кого импортирует

| Пакет | Тянет |
| --- | --- |
| `@miraicms/core` | `kysely`, `pg`, `better-sqlite3`, `sharp`. Vue и Nuxt отсутствуют |
| `miraicms-nuxt` | ядро, `@nuxt/kit`, TipTap, Leaflet, `c12`, `magic-string` |
| `miraicms-nuxt-form` | ядро, модуль, `kysely`, `nodemailer`, `sanitize-html`, `dompurify` |
| `miraicms-nuxt-seo` | ядро, модуль, `kysely` |
| playground | три Nuxt-пакета и `nuxt` |

Ядро делится на два публичных входа, потому что админские SFC попадают в клиентский бандл:

- `src/index.ts` — Node. Реэкспорт database, config, permissions, auth, fields, rewrite, blocks, text, media, indexes, oembed.
- `src/browser.ts` — то же без драйверов, sharp, применения индексов и `hashPassword`. Тип `SafeUser` и проверка длины пароля здесь есть.

`package.json` ядра ставит `"browser": "./dist/browser.mjs"`. Vite на клиенте берёт его сам. Серверный код пишет обычный импорт `@miraicms/core` и получает `index`.

Тип импортируют из файла, который его объявляет (`media/types`, `config/types/*`, `database/client/schema`). Баррели `media/index.ts`, `config/index.ts`, `database/index.ts` подтягивают sharp, все резолверы или `pg`. Клиентский файл, которому нужен только тип, через эти баррели не ходит.

## Что считается внутренним

Внутри `miraicms-nuxt` три зоны:

| Зона | Путь | Виден хосту |
| --- | --- | --- |
| Модуль | `src/module.ts`, `src/admin-components.ts` | Только как Nuxt-модуль |
| Публичный runtime | composable чтения, `extensions`, `server/kit.ts`, стили | Да, перечисленными экспортами |
| Админка | `runtime/pages`, `runtime/internal`, почти все `runtime/server/api` | Нет. Страницы регистрирует модуль, компоненты резолвит свой Vite-плагин |

`runtime/server/api/_miraicms/*` вызывает админский интерфейс и composable хоста. Это протокол модуля, не документированный внешний REST для чужих клиентов. Хостовая страница ходит в четыре composable, а те уже знают нужные URL (`/api/_miraicms/resolve`, `query`, `terms`, options).

## Playground

`playground-nuxt/nuxt.config.ts` — полный пример ключа `miraicms`: роли, медиа, коллекции, словари. `pages/[...slug].vue` — единственный правильный образец публичной страницы. `pages/forms/[id].vue` показывает `MiraiCmsForm`. Сид: `pnpm --filter miraicms-playground-nuxt seed`.

Фикстура модуля `packages/miraicms-nuxt/test/fixtures/basic` — минимальное Nuxt-приложение для `test:basic`.
