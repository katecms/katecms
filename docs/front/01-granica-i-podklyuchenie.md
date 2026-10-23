# Граница и подключение

## Что хост пишет сам

- Список модулей и объект `miraicms` в `nuxt.config.ts`.
- Страницы сайта. Модуль не создаёт публичный catch-all: маршрут `/:slug(.*)*` принадлежит приложению. Образец — `playground-nuxt/pages/[...slug].vue`.
- Вёрстку вокруг данных CMS: заголовок, списки, ссылки через `permalink`.
- Стили публичной формы. Компонент `MiraiCmsForm` приходит без визуальной темы и отдаёт раскладку через data-атрибуты.
- Плагин своего дополнения: регистрация вкладки сайдбара, пункта меню, панели термина.
- Переменные окружения деплоя: `MIRAICMS_SESSION_PASSWORD`, при Postgres без `url` в конфиге — `DATABASE_URL`.

## Что хост получает готовым

После `modules: ['miraicms-nuxt']` приложение получает:

- админку на `/${adminPath}` (по умолчанию `/admin`);
- автоимпорт `getCollection`, `getQueryCollection`, `getTerms`, `getOptions`;
- публичный runtime config `useRuntimeConfig().public.miraicms` — урезанный снимок навигации, без схем полей, ролей и строки базы;
- серверный runtime config `useRuntimeConfig().miraicms` — полный `ResolvedMiraiCmsConfig` (только сервер);
- загрузки в `<rootDir>/public/uploads`.

Пакетные экспорты, которые можно импортировать снаружи `miraicms-nuxt`:

| Импорт | Назначение |
| --- | --- |
| `miraicms-nuxt` | Сам Nuxt-модуль. В `modules` достаточно строки имени |
| `miraicms-nuxt/extensions` | Регистрация вкладок, меню, панелей термина, своего поля |
| `miraicms-nuxt/server` | `getDb`, `requireUser`, `requirePermission`, `requireEntryPermission` для серверного кода дополнения |
| `miraicms-nuxt/styles` | SCSS-токены админки для пакета-дополнения |
| `@miraicms/core` | Ядро. В браузере резолвится в `browser`-сборку, на сервере — в полный вход |

Компоненты из `runtime/internal` в хост не попадают. Vite-плагин модуля подставляет их только в `.vue` внутри `miraicms-nuxt`, `miraicms-nuxt-form` и `miraicms-nuxt-seo`. Единственный каталог компонентов, который Nuxt регистрирует для страниц сайта, — `miraicms-nuxt-form/src/runtime/components` с префиксом `MiraiCms`. Сейчас там `Form.vue`, то есть тег `MiraiCmsForm`.

## Подключение

`miraicms-nuxt` стоит в `modules` раньше дополнений. SEO и формы читают `runtimeConfig.miraicms.adminPath`, который выставляет основной модуль в своём `setup`.

```ts
export default defineNuxtConfig({
  modules: [
    'miraicms-nuxt',
    'miraicms-nuxt-seo',
    'miraicms-nuxt-form',
  ],
  miraicms: {
    collections: {
      pages: {
        labels: { name: 'Pages', singularName: 'Page' },
        rewrite: '/%name%',
      },
    },
  },
})
```

Локальная разработка этого репозитория:

```bash
pnpm dev
```

Скрипт поднимает сборку ядра, stub модуля и `playground-nuxt`.

## Публичный runtime config

На клиент уходит только то, что собирает `toPublicCollections` / `toPublicDictionaries` / `toPublicOptions` в `packages/miraicms-nuxt/src/module.ts`.

```ts
interface PublicMiraiCms {
  adminPath: string
  loginPath: string
  registerPath: string
  registration: boolean
  collections: Record<string, {
    labels: { name: string, singularName: string }
    icon: string
    public: boolean
    has_archive: boolean | string
  }>
  dictionaries: Record<string, {
    labels: { name: string, singularName: string }
    icon: string
  }>
  options: Record<string, { label: string, icon: string }>
  form: {
    breakpoints: Array<{ name: string, label: string, maxWidth: number | null }>
  }
}
```

Поля, rewrite коллекций, роли, URL базы и каталог медиа в `public` не кладутся. Схему полей страница сайта не читает из конфига: значения приходят внутри записи из composable.

## Первый вход

Пока таблица `users` пуста, глобальный middleware отправляет гостя с `/admin` на регистрацию. Первый аккаунт создаётся как `owner`. Флаг `registration: false` (дефолт) закрывает саморегистрацию для всех следующих. Создание пользователей из админки от этого флага не зависит.

В production задайте `MIRAICMS_SESSION_PASSWORD` — случайная строка от 32 символов. Без неё сервер сессий отвечает 500. В development модуль подставляет запасной секрет и пишет предупреждение в консоль.
