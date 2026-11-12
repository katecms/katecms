# Документация KateCMS

KateCMS — монорепозиторий: ядро `@katecms/core` без фреймворка и Nuxt-модуль `katecms` с дополнениями SEO и форм. Хост-приложение (сайт) подключает модуль и пишет контент снаружи. Админка, HTTP-обработчики и виджеты полей живут внутри пакетов.

Две папки ниже разделены по этому правилу.

| Папка | Для кого | Что внутри |
| --- | --- | --- |
| [front](front/README.md) | Автор сайта и автор дополнения, который пишет код **вне** `katecms` | Конфиг `katecms`, схема полей, роли, публичные composable, компонент формы, SEO на страницах сайта, вызов `@katecms/core` из своего адаптера или скрипта |
| [back](back/README.md) | Разработчик самого модуля | `module.ts`, Nitro-обработчики, сессия, админские страницы, внутренние Vue-компоненты, схема БД, сборка, дополнения как код внутри репозитория |

Код хоста — это `nuxt.config`, страницы приложения (`pages/*.vue` у сайта и `playground`) и плагины, которые импортируют `katecms/extensions` или `katecms/server`. Код модуля — `packages/*/src`. Клиентские файлы админки берут `@katecms/core` из `packages/core/src/browser.ts`. Сервер, тесты и `module.ts` берут `packages/core/src/index.ts`.

Краткий указатель уже описанного контракта конфига и полей есть в корневом [README.md](../README.md). Файлы в `docs/` раскладывают тот же проект по границе «снаружи / внутри» и добавляют то, чего в README нет: публичный runtime config, поведение composable при промахе, SEO и формы, жизненный цикл модуля, схему таблиц.

## Снаружи (`docs/front`)

1. [Граница и подключение](front/01-granica-i-podklyuchenie.md)
2. [Ключ `katecms`](front/02-konfig-modulya.md)
3. [Коллекции](front/03-kollekcii.md)
4. [Словари](front/04-slovari.md)
5. [Страницы опций и блоки](front/05-opcii-i-bloki.md)
6. [Роли](front/06-roli.md)
7. [База, медиа, секрет сессии](front/07-baza-i-media.md)
8. [Поля](front/08-polya.md)
9. [Чтение данных на сайте](front/09-chtenie-s-sajta.md)
10. [Страница сайта](front/10-stranica-sajta.md)
11. [Дополнения снаружи модуля](front/11-dopolneniya.md)
12. [Ядро без Nuxt](front/12-yadro-snaruzhi.md)

## Внутри (`docs/back`)

1. [Монорепозиторий](back/01-monorepo.md)
2. [Жизненный цикл модуля](back/02-zhiznennyj-cikl-modulya.md)
3. [Сервер](back/03-server.md)
4. [Админская оболочка](back/04-admin-obolochka.md)
5. [Виджеты полей и компоненты](back/05-polya-i-komponenty.md)
6. [Устройство ядра](back/06-yadro.md)
7. [Схема базы](back/07-shema.md)
8. [Дополнение SEO](back/08-seo.md)
9. [Дополнение форм](back/09-formy.md)
10. [Сборка, тесты, индекс](back/10-sborka.md)
