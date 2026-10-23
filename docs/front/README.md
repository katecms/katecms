# Снаружи модуля

Сюда попадает всё, чем пользуется код **вне** пакетов MiraiCMS: `nuxt.config.ts` сайта, страницы `pages/`, плагин дополнения, скрипт сброса пароля, другой адаптер поверх `@miraicms/core`.

Хост задаёт схему. Модуль хранит значения и отдаёт их composable. Админские экраны, `/api/_miraicms/*` и файлы `runtime/internal` хост не импортирует — они описаны в [back](../back/README.md).

## Классификация

| Класс | Где пишется | Документ |
| --- | --- | --- |
| Подключение модулей | `modules` в `nuxt.config` | [01](01-granica-i-podklyuchenie.md) |
| Конфиг CMS | ключ `miraicms` | [02](02-konfig-modulya.md) |
| Типы записей | `miraicms.collections` | [03](03-kollekcii.md) |
| Таксономии | `miraicms.dictionaries` | [04](04-slovari.md) |
| Синглтоны и реестр блоков | `options`, `blocks` | [05](05-opcii-i-bloki.md) |
| Права | `miraicms.roles` | [06](06-roli.md) |
| Подключение БД, лимиты файлов, cookie-секрет | `database`, `media`, env | [07](07-baza-i-media.md) |
| Схема значений записи | `fields` у коллекции, словаря, опций, блока | [08](08-polya.md) |
| Данные на публичной странице | `getCollection`, `getQueryCollection`, `getTerms`, `getOptions` | [09](09-chtenie-s-sajta.md) |
| Маршрут сайта | catch-all страница хоста | [10](10-stranica-sajta.md) |
| SEO, форма на сайте, точки расширения | модули-дополнения и импорты `miraicms-nuxt/extensions`, `miraicms-nuxt/server` | [11](11-dopolneniya.md) |
| CMS без Nuxt | `import … from '@miraicms/core'` | [12](12-yadro-snaruzhi.md) |

Живой пример хоста в этом репозитории — `playground-nuxt`: конфиг, `pages/[...slug].vue`, страница формы.

Автоимпорты `useAuth` и `useCmsPaths` попадают в приложение вместе с модулем. Их вызывает админская оболочка. Странице сайта они не нужны: контент читают четыре composable из пункта «Данные».
