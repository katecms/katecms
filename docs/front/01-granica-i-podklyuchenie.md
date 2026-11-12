# Граница и подключение

## Что хост пишет сам

- Список модулей и объект `katecms` в `nuxt.config.ts`.
- Страницы сайта. Модуль не создаёт публичный catch-all: маршрут `/:slug(.*)*` принадлежит приложению. Образец — `playground/pages/[...slug].vue`.
- Вёрстку вокруг данных CMS: заголовок, списки, ссылки через `permalink`.
- Стили публичной формы. Компонент `KateCmsForm` приходит без визуальной темы и отдаёт раскладку через data-атрибуты.
- Плагин своего дополнения: регистрация вкладки сайдбара, пункта меню, панели термина.
- Переменные окружения деплоя: `MIRAICMS_SESSION_PASSWORD`, за обратным прокси — `MIRAICMS_TRUST_PROXY`, при Postgres без `url` в конфиге — `DATABASE_URL`.

## Что хост получает готовым

После `modules: ['katecms']` приложение получает:

- админку на `/${adminPath}` (по умолчанию `/admin`);
- автоимпорт `getCollection`, `getQueryCollection`, `getTerms`, `getOptions`;
- публичный runtime config `useRuntimeConfig().public.katecms` — урезанный снимок навигации, без схем полей, ролей и строки базы;
- серверный runtime config `useRuntimeConfig().katecms` — полный `ResolvedKateCmsConfig` (только сервер);
- загрузки в `<rootDir>/public/uploads`.

Пакетные экспорты, которые можно импортировать снаружи `katecms`:

| Импорт | Назначение |
| --- | --- |
| `katecms` | Сам Nuxt-модуль. В `modules` достаточно строки имени |
| `katecms/extensions` | Регистрация вкладок, меню, панелей термина, своего поля |
| `katecms/server` | `getDb`, `requireUser`, `requirePermission`, `requireEntryPermission`. Адрес клиента для своего лимита: `eventClientAddress`, `clientAddress`, `trustedProxyHops` |
| `katecms/styles` | SCSS-токены админки для пакета-дополнения |
| `@katecms/core` | Ядро. В браузере резолвится в `browser`-сборку, на сервере — в полный вход |

Компоненты из `runtime/internal` в хост не попадают. Vite-плагин модуля подставляет их только в `.vue` внутри `katecms`, `katecms-form` и `katecms-seo`. Единственный каталог компонентов, который Nuxt регистрирует для страниц сайта, — `katecms-form/src/runtime/components` с префиксом `KateCms`. Сейчас там `Form.vue`, то есть тег `KateCmsForm`.

## Подключение

`katecms` стоит в `modules` раньше дополнений. SEO и формы читают `runtimeConfig.katecms.adminPath`, который выставляет основной модуль в своём `setup`.

```ts
export default defineNuxtConfig({
  modules: [
    'katecms',
    'katecms-seo',
    'katecms-form',
  ],
  katecms: {
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

Скрипт поднимает сборку ядра, stub модуля и `playground`.

## Публичный runtime config

На клиент уходит только то, что собирает `toPublicCollections` / `toPublicDictionaries` / `toPublicOptions` в `packages/katecms/src/module.ts`.

```ts
interface PublicKateCms {
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
