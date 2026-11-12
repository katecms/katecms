# Дополнение SEO изнутри

Пакет `packages/katecms-seo`. Модуль `src/module.ts`, `configKey: 'katecmsSeo'`. Опции ключа `setup` не читает: настройки живут в таблице `seo_documents`.

Снаружи хост видит автоимпорт `useMiraiSeoHead`, `/sitemap.xml`, `/robots.txt` и вкладку в админке. Здесь — как это сшито.

## Старт

Серверный плагин `runtime/server/plugins/migrate.ts` создаёт таблицы документов и редиректов (`documents.ts`, `redirects.ts`). Повторный `CREATE TABLE IF NOT EXISTS` безопасен. Смена CHECK у `kind` на Postgres делается отдельным `ALTER`.

Клиентский `runtime/plugin.ts`:

1. Вешает хук `katecms:collection`.
2. Из страницы собирает вход головы: для термина — title термина и `termId`, для архива — имя коллекции и флаг archive, для записи — title и `entryId`, путь из `page.link`.
3. Вызывает `useMiraiSeoHead`.
4. Регистрирует на Vue-приложении `KateCmsSeoEntryPanel` и вкладку сайдбара `key: 'seo'`.
5. Кладёт `KateCmsSeoTermPanel` в `useKateCmsTermPanels`.
6. Пушит пункт меню SEO на `/${adminPath}/seo` без `access`. Пункт виден всем, кто открыл админку; сами ручки записи всё равно проверяют права.

Панели лежат в `runtime/internal` и резолвятся админским Vite-плагином основного модуля, потому что путь пакета входит в `ADMIN_COMPONENT_PACKAGES`.

## Голова

`useMiraiSeoHead` (`runtime/composables/useMiraiSeoHead.ts`) делает `useAsyncData` на `GET /api/_katecms/seo/head` и `useHead`: title, description, robots, `og:title`, `og:description`, `og:image`, `og:url`, canonical, JSON-LD. В JSON-LD символ `<` экранируется как `\u003c`.

Сборка строки title — `runtime/utils/title.ts`, шаблон по умолчанию `%title% %sep% %sitename%`. Данные сайта читает `readSite()` с `kind = 'site'` и `entry_id = 0`. Документ записи — `kind = 'entry'` и id записи. Документ термина — `kind = 'term'` и id термина.

Ручки:

| Метод | Путь | Кто |
| --- | --- | --- |
| GET, PUT | `/api/_katecms/seo/site` | Страница настроек |
| GET, PUT | `/api/_katecms/seo/entries/:id` | Вкладка записи |
| GET, PUT | `/api/_katecms/seo/terms/:id` | Панель термина |
| GET | `/api/_katecms/seo/head` | Публичная голова |
| GET | `/api/_katecms/seo/redirect` | Разрешение одного пути |
| GET, POST, PATCH, DELETE | `/api/_katecms/seo/redirects` | Список правил в админке |

Мутации идут через `requireUser` и права. Публичные GET головы и редирект сессию не требуют.

## Редиректы

Middleware `runtime/server/middleware/redirect.ts` на каждый GET и HEAD. Пропускает `/`, админку, `/api/`, `/_nuxt`, `/__nuxt`, favicon, `robots.txt`, `sitemap.xml`. Находит правило `resolveRedirect`. Коды, которые `isTerminalStatus` считает конечными (410 и 451), отвечают ошибкой без `Location`. Остальные — `sendRedirect` на `to` с кодом правила. Сбой чтения базы middleware глотает, чтобы сайт открывался без SEO-таблиц.

## Sitemap и robots

`runtime/server/routes/sitemap.get.ts` обходит публичные коллекции из `runtimeConfig.katecms.collections` и собирает URL через `sitemapUrls` в `documents.ts`: архив, если он есть, и опубликованные записи с `buildPublicPath`. `lastmod` берётся из дат записи.

`robots.get.ts` читает флаг noindex сайта. Включён — `Disallow: /`, иначе `Allow: /`, плюс абсолютный `Sitemap`.

## Экраны

`runtime/pages/admin/seo.vue` — настройки сайта и таблица редиректов. Редактор полей документа — `internal/SeoEditor.vue`, превью сниппета — `SeoSnippet.vue`. Стили через `katecms/styles`. Разметка оболочки — `div` / `span`, как в основном модуле.

У несохранённой записи вкладка SEO не пишет документ: панели нужен id. Кнопка Publish записи документ SEO не сохраняет: у вкладки свой PUT.
