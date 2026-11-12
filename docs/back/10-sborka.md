# Сборка, тесты и индекс

## Команды корня

`package.json` репозитория:

| Скрипт | Действие |
| --- | --- |
| `pnpm dev` | `dev:prepare`, затем dev playground |
| `pnpm dev:prepare` | Сборка ядра, stub модуля (`nuxt-module-build build --stub`), `nuxt prepare` playground |
| `pnpm dev:build` | Production-сборка playground |
| `pnpm test` | Тесты ядра, сборка ядра, тесты модуля |
| `pnpm test:types` | `tsc` ядра и `vue-tsc` модуля |
| `pnpm test:basic` | Фикстура `packages/katecms/test/fixtures/basic` |
| `pnpm lint` | ESLint |
| `pnpm prepack` | Сборка ядра и `nuxt-module-build` модуля |
| `pnpm ai:index` | Пересчёт `.ai/` |
| `pnpm publish:core` | npm: `@katecms/core`. Сначала поднять `version` в `packages/core` |
| `pnpm publish:module` | npm: `katecms`. Зависимость `@katecms/core` уже должна быть в реестре |
| `pnpm publish:form` | npm: `katecms-form`. Ядро и модуль этой версии уже должны быть в реестре |
| `pnpm publish:seo` | npm: `katecms-seo`. Ядро и модуль этой версии уже должны быть в реестре |

Ядро собирает unbuild в `packages/core/dist`: `index.mjs` и `browser.mjs` плюс типы. Модуль собирает `@nuxt/module-builder` в `packages/katecms/dist`. В npm-архив модуля входят `dist` и `src`: `katecms/extensions` и `katecms/server` указывают на исходники. Перед публикацией пакета поднимают только его `version`. `workspace:^` при publish записывается как совместимый диапазон (`^1.0.0`), поэтому выпуск ядра не заставляет заново публиковать модуль и дополнения.

Дополнения form и seo в `prepack` корня не входят. Playground в разработке резолвит их из исходников workspace.

`scripts/reset-password.mjs` импортирует `packages/core/dist/index.mjs`. Перед запуском ядро должно быть собрано.

## Тесты

| Место | Чем |
| --- | --- |
| `packages/core/test` | vitest. Конфиг, права, запросы, медиа, индексы, ЧПУ |
| `packages/katecms` | vitest, в том числе `test/basic.test.ts` на фикстуре |
| `packages/katecms-form/test/model.test.ts` | `node --test` чистой модели, без подъёма Nuxt |

Правка поведения ядра сопровождается тестом в `packages/core/test`. Правка виджета, у которого нет браузерного прогона в репозитории, проверяется вручную в playground: админка и публичная страница, которая это поле читает.

## Индекс `.ai`

`scripts/ai-index.mjs` пишет:

| Файл | Содержание |
| --- | --- |
| `.ai/INDEX.md` | Как читать индекс |
| `.ai/files.jsonl` | Файл, пакет, исходящие импорты `im` |
| `.ai/symbols.jsonl` | Экспорт → файл |
| `.ai/routes.json` | Страницы, обработчики, плагины, middleware, автоимпорты |
| `.ai/domain.json` | Пакеты, публичные имена, таблицы, типы полей |

После переноса файла, экспорта или маршрута индекс обновляют командой `pnpm ai:index`. Поиск по репозиторию для «кто импортирует» начинают с `.ai/`, не с обхода `packages/`.

`dist`, `node_modules`, `.nuxt`, lockfile и `public/uploads` в индекс не входят.

## Что не коммитить как исходник

Сгенерированные `dist`, `.nuxt`, `.output` и загруженные файлы `public/uploads` к исходникам не относятся. Схему меняют в `schema.ts`, типы Kysely правят руками рядом, `.sql` рядом с миграцией держат копией для чтения.

Секреты в репозиторий не кладут: `MIRAICMS_SESSION_PASSWORD`, строка Postgres, пароль SMTP из таблицы `katecms_form_mail`. В development сессия поднимается без переменной, с предупреждением в логе.
