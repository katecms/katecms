# Жизненный цикл модуля

Файл `packages/katecms/src/module.ts`. `defineNuxtModule<KateCmsConfig>` с именем `katecms` и `configKey: 'katecms'`.

`setup` идёт в одном порядке.

## 1. Склейка конфига

Берётся объект из `nuxt.config` и уже лежащий `runtimeConfig.katecms.database` (его мог задать слой Nuxt раньше). `mergeKateCmsConfig` накладывает дефолты, `resolveKateCmsConfig` нормализует роли, медиа и базу. Каждый `warnings` печатается в консоль.

В серверный `runtimeConfig.katecms` кладётся resolved-объект. `sqliteFilename` становится абсолютным от `rootDir`, кроме `:memory:`, абсолютного пути и `file:`. `media.dir` принудительно `<rootDir>/public/uploads`.

В `runtimeConfig.public.katecms` кладётся урезанная копия: пути, флаг регистрации, подписи и иконки коллекций/словарей/опций, флаги `public` и `has_archive`, брейкпоинты форм. Схемы полей, роли и URL базы на клиент не копируются. Функции `toPublicCollections`, `toPublicDictionaries`, `toPublicOptions` в том же файле задают эту форму.

Типы `NuxtConfig.katecms`, `RuntimeConfig.katecms` и `PublicRuntimeConfig.katecms` объявлены внизу `module.ts` дважды: для `@nuxt/schema` и для `nuxt/schema`.

## 2. Плагин миграции и заголовок админки

`addServerPlugin` → `runtime/server/plugins/auto-migrate.ts`. На старте Nitro: `resolveDatabaseTarget`, `migratePostgres` или `migrateSqlite`. Для Postgres следом отдельным клиентом вызывается `syncCollectionFieldIndexes`, предупреждения индекса печатаются, клиент уничтожается. Рабочий пул запросов этот плагин не держит — его создаёт `getDb()` лениво.

Middleware `admin-headers` на все запросы: если путь под админкой, ставит `X-Content-Type-Options: nosniff` и `Content-Security-Policy: frame-ancestors 'none'`.

## 3. Загрузки

Хук `nitro:config` добавляет в `ignore` путь `../public/uploads/**`, чтобы байты медиа не уезжали в серверный бандл.

Хук `vite:serverCreated` ставит middleware в начало стека Vite: запрос `/uploads/…` читается с диска потоком, если путь остаётся внутри каталога. `..` и пустые сегменты отвечают 404. Заголовки ответа собирает `uploadResponseHeaders`.

Прод-отдача того же URL — Nitro handler `runtime/server/api/uploads/[...key].get.ts` на маршруте `/uploads/**`.

## 4. Обработчики

Все маршруты перечислены вызовами `addServerHandler` в `module.ts`. Префикс `/api/_katecms`. Список и роли — в [сервере](03-server.md). Файлы лежат в `runtime/server/api/_katecms` и **не** подхватываются файловым роутером Nitro сами по себе: без строки в `module.ts` обработчик не существует.

## 5. Middleware входа и автоимпорты

Глобальный route middleware `katecms-auth-guard` (`runtime/middleware/auth-guard.ts`).

`addImports` регистрирует:

- `useAuth`, `useCmsPaths` — оболочка админки;
- `getCollection`, `getQueryCollection`, `getTerms`, `getOptions` — страницы сайта;
- `useKateCmsEntrySidebar`, `registerKateCmsEntrySidebarTab`, `useKateCmsTermPanels`, `useKateCmsMenuItems` — дополнения. Тот же модуль экспортирует файл как `katecms/extensions`, чтобы плагин дополнения мог импортировать его по имени пакета, не полагаясь на автоимпорт.

## 6. Компоненты админки

`addAdminComponents` из `src/admin-components.ts`. Каталог `runtime/internal` обходится рекурсивно. Имя файла `Foo.vue` становится тегом `KateCmsFoo`. Дубликат имени бросает ошибку на старте.

Плагин Vite `katecms:admin-components` (`enforce: 'post'`) смотрит исходник `.vue`. Если путь лежит в `src/runtime` или `dist/runtime` пакетов `katecms`, `katecms-form-builder`, `katecms-seo` и в коде есть вызов `resolveComponent` / `h()` с именем `KateCms*`, плагин дописывает прямой import и подменяет имя на локальный идентификатор. Хостовая страница в этот список не входит, поэтому тег `KateCmsTextField` у сайта не резолвится.

Каталог `internal` в `components` Nuxt не добавляется. Иначе префикс протекал бы на сайт.

## 7. Страницы

`extendPages` пушит родителя:

```
name: admin
path: /${adminPath}
file: runtime/pages/index.vue
meta.layout: false
```

Дети: index, login, register, media, users, users/create, users/:id, collections, collections/create, collections/:id, dictionaries, dictionaries/:id, options/:page, demo-fields.

Дополнения позже ищут эту страницу по `name === 'admin'` или по path и пушат своих детей. Поэтому основной модуль в массиве `modules` стоит раньше.

`demo-fields` — внутренняя страница просмотра виджетов, не часть публичного контракта хоста.

## Дополнения в том же проходе

`katecms-form-builder` и `katecms-seo` — отдельные `defineNuxtModule`. Они читают уже записанный `adminPath`. Если основного модуля в конфиге не было, оба подставляют сегмент `admin`.

Порядок внутри формы: клиентский плагин, серверные плагины миграции и санитайзера HTML, `addComponentsDir` на `runtime/components` (это единственные теги для хоста), обработчики `/api/_katecms/forms/*`, дети админки.

Порядок внутри SEO: клиентский плагин, миграция, автоимпорт `useMiraiSeoHead`, middleware редиректа, обработчики `/api/_katecms/seo/*`, маршруты `/sitemap.xml` и `/robots.txt`, страница `seo`.
