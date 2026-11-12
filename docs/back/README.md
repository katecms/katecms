# Внутри модуля

Сюда попадает код, который хост не импортирует и не описывает в `nuxt.config`: регистрация маршрутов, Nitro-обработчики, админские Vue-файлы, схема таблиц, виджеты полей, плагины дополнений внутри репозитория.

Контракт, который хост всё-таки вызывает (`getCollection`, ключ `katecms`, `KateCmsForm`), описан в [front](../front/README.md). Здесь — как этот контракт собран.

## Классификация

| Слой | Где лежит | Документ |
| --- | --- | --- |
| Пакеты и границы импорта | корень репозитория, `packages/*` | [01](01-monorepo.md) |
| Старт Nuxt-модуля | `packages/katecms/src/module.ts` | [02](02-zhiznennyj-cikl-modulya.md) |
| HTTP, сессия, права, миграция | `runtime/server` | [03](03-server.md) |
| Экраны админки и оболочка | `runtime/pages`, `runtime/internal/admin` | [04](04-admin-obolochka.md) |
| Виджеты и UI-кит | `runtime/internal/fields`, `parts`, `ui` | [05](05-polya-i-komponenty.md) |
| Ядро как библиотека модуля | `packages/core/src` | [06](06-yadro.md) |
| Таблицы | миграции ядра и дополнений | [07](07-shema.md) |
| SEO-пакет изнутри | `packages/katecms-seo` | [08](08-seo.md) |
| Пакет форм изнутри | `packages/katecms-form-builder` | [09](09-formy.md) |
| Сборка и индекс | скрипты корня | [10](10-sborka.md) |

Правила, которые уже зафиксированы для правок кода:

- Менять `packages/*/src` и `playground`. Каталоги `dist`, `.nuxt`, `.output`, `public/uploads` не редактировать.
- Клиент админки импортирует `@katecms/core` только так, чтобы резолвился `browser.ts`. В клиентский файл не тянуть базу, sharp, kysely и хеширование паролей.
- `nuxtcms-module` в соседнем дереве — старая линия. Из неё не копируют и её не правят, пока работа идёт в KateCMS.
- Текст админки — английский.
- Страницы админки не файловые маршруты Nuxt. Их добавляет `extendPages`. Обработчики — `addServerHandler` под `/api/_katecms/*`. Файловые `pages/` есть у playground и у сайта-хоста.
- Мутирующий обработчик вызывает `requireUser`, затем `requirePermission` или `requireEntryPermission`. Наружу уходит `SafeUser`, без `password_hash`.
- Смена схемы идёт через ядро и сразу в SQLite и Postgres.
