# Дополнения снаружи модуля

Дополнения — отдельные Nuxt-модули. Их ставят в `modules` после `miraicms-nuxt`. Контракт, который они и любой свой пакет вызывают **снаружи** ядра модуля, собран в трёх импортах и одном компоненте.

## `miraicms-nuxt/extensions`

Файл `packages/miraicms-nuxt/src/runtime/composables/useMiraiCmsExtensions.ts`.

| Имя | Зачем вызывать снаружи |
| --- | --- |
| `registerMiraiCmsEntrySidebarTab` | Вкладка сайдбара записи |
| `useMiraiCmsEntrySidebar` | Прочитать уже зарегистрированные вкладки |
| `useMiraiCmsMenuItems` | Добавить пункт меню админки |
| `useMiraiCmsTermPanels` | Имена компонентов под формой термина |
| `registerMiraiCmsField` | Свой виджет поля по `type` |
| `provideMiraiCmsFieldErrors` | Проброс ошибок полей в форму |
| `MIRAICMS_COLLECTION_HOOK` | Строка `'miraicms:collection'` |
| тип `MiraiCmsPublicPage` | Аргумент хука |
| тип `MiraiCmsMenuExtra` | Пункт меню |
| тип `MiraiCmsEntrySidebarTab` | Описание вкладки |

Вкладка:

```ts
import { registerMiraiCmsEntrySidebarTab } from 'miraicms-nuxt/extensions'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('MiraiCmsMyPanel', MyPanel)
  registerMiraiCmsEntrySidebarTab({
    key: 'my-addon',
    label: 'Notes',
    component: 'MiraiCmsMyPanel',
  })
})
```

Ключ `page` занят вкладкой публикации. Повтор с тем же `key` заменяет вкладку. Панель монтируется при первом открытии и остаётся смонтированной. Компонент к моменту регистрации уже должен быть на Vue-приложении: внутренние теги `MiraiCms*` хостовая страница не резолвит, поэтому панель регистрируют через `vueApp.component` или кладут её в пакет, где админский трансформ её видит (`miraicms-nuxt`, `miraicms-nuxt-form`, `miraicms-nuxt-seo`).

Пункт меню — push в `useMiraiCmsMenuItems()`:

```ts
{
  key: 'forms',
  label: 'Forms',
  to: '/admin/forms',
  icon: '<svg ...></svg>',
  access: 'forms', // ресурс, который меню сверяет с правом read; без access пункт виден всем, кто открыл админку
}
```

`icon` — inline SVG, как у встроенных пунктов.

Панели термина — массив имён компонентов в `useMiraiCmsTermPanels()`.

Своё поле: `registerMiraiCmsField('form', FormField)` сопоставляет `type` из конфига с компонентом. Встроенные типы ищутся раньше, по файлу `*Field.vue`.

## `miraicms-nuxt/server`

Для серверных обработчиков дополнения, не для страниц Vue:

```ts
import { getDb, requireUser, requirePermission, requireEntryPermission } from 'miraicms-nuxt/server'
```

`getDb()` — один Kysely-клиент на процесс Nitro. `requireUser` бросает 401. `requirePermission(user, resource, action, roles, scope?)` и `requireEntryPermission(...)` бросают 403. Роли берут из `useRuntimeConfig().miraicms.roles`.

## `miraicms-nuxt/styles`

SCSS-вход для пакетов дополнений:

```scss
@use "miraicms-nuxt/styles" as *;
```

Оттуда берутся `$color-*`, `$shadow-*`, `math-rem()` и миксин обёртки админки. Странице сайта эти токены не нужны: они красят оболочку CMS.

## Форма на сайте

Модуль `miraicms-nuxt-form` регистрирует `MiraiCmsForm`.

```vue
<MiraiCmsForm :form="12" />
```

`form` — id опубликованной формы. Компонент сам грузит `GET /api/_miraicms/forms/view/:id` и шлёт `POST /api/_miraicms/forms/submit/:id`.

Корень — класс `mirai-form` и атрибуты `data-form`, `data-state`. Состояния: `loading`, `missing`, `idle`, `submitting`, `success`, `invalid`, `error`.

Сетка конструктора — 60 колонок. У ячейки:

| Атрибут | Смысл |
| --- | --- |
| `data-field` | Ключ поля |
| `data-type` | Тип поля конструктора |
| `data-step` | Номер шага |
| `data-required`, `data-invalid`, `data-hidden` | Флаги |
| `data-x`, `data-y`, `data-w`, `data-h` | Базовый брейкпоинт (в дефолте desktop), координаты с нуля |
| `data-x-phone`, `data-y-tablet`, … | Остальные брейкпоинты из `miraicms.form.breakpoints` |

Вложенные классы: `mirai-form__alert` (`data-alert="error|success"`), `__step`, `__step-header`, `__grid`, `__cell`, `__label`. Стили пишет хост. Подключение брейкпоинтов и лимит вложений — ключ `miraicms.form` в [конфиге](02-konfig-modulya.md).

Типы полей конструктора (это не типы полей коллекции): `text`, `textarea`, `email`, `phone`, `number`, `password`, `range`, `url`, `color`, `rating`, `select`, `image_select`, `radio`, `checkbox`, `decision_box`, `title`, `image`, `divider`, `spacer`, `date`, `time`, `datetime`, `week`, `month`, `file`, `hidden`, `html`, `button`, `repeater`, `section`.

В записи коллекции форму выбирают полем `type: 'form'`. На странице сайта по сохранённому id ставят `MiraiCmsForm`.

Админка форм (список, конструктор, заявки, SMTP) появляется сама: `/${adminPath}/forms`. Право — ресурс `forms`.

## SEO на сайте

Модуль `miraicms-nuxt-seo` сам вешает `useMiraiSeoHead` на хук `miraicms:collection`. Обычной странице с одним `getCollection()` ничего импортировать не нужно: в документ попадут `title`, description, canonical, robots, Open Graph и JSON-LD.

Ручной вызов, если голова нужна без этого хука:

```ts
useMiraiSeoHead({
  title: 'Catalog',
  entryId: null,
  termId: null,
  path: '/catalog',
  isArchive: true,
})
```

Аргумент можно передать как ref. Composable автоимпортируется модулем SEO.

Публичные файлы, которые дополнение отдаёт само:

| URL | Содержание |
| --- | --- |
| `/sitemap.xml` | URL публичных записей и архивов |
| `/robots.txt` | `User-agent: *`, `Allow: /` или `Disallow: /` если у сайта включён noindex, строка `Sitemap` |

Редирект со старого пути выполняет серверный middleware дополнения. Правила задаются в админке `/${adminPath}/seo`, не в `nuxt.config`. Туда же входят имя сайта, разделитель и шаблон title (`%title% %sep% %sitename%` по умолчанию). Вкладка SEO в редакторе записи и панель на термине регистрируются плагином дополнения. У новой записи на вкладке нужно сначала сохранить запись. Сохранение SEO отдельно от Publish.
