# KateCMS

`katecms` — Nuxt-модуль KateCMS. Подключает к приложению админку для записей (коллекции, словари, блоки), медиа и ролей, а на сайте — композаблы, которыми этот контент читается.

Конфиг модуля: ключ `katecms` в `nuxt.config.ts`, параметры полей и вкладки сайдбара дополнений.

## Навигация

- [Конфиг модуля](#config)
  - [Подключение](#config-setup)
  - [Ключи `katecms`](#config-keys)
  - [Пути](#config-paths)
  - [База](#config-database)
  - [Медиа](#config-media)
  - [Роли](#config-roles)
  - [Коллекции](#config-collections)
  - [Словари](#config-dictionaries)
  - [Публичные композаблы](#frontend-composables)
    - [getCollection](#getCollection)
    - [getOptions](#getOptions)
    - [getQueryCollection](#getQueryCollection)
      - [dictionaryQuery](#getQueryCollection-dictionaryQuery)
      - [fieldsQuery](#getQueryCollection-fieldsQuery)
    - [getTerms](#getTerms)
  - [Пример](#config-example)
- [Дополнения](#addons)
  - [Вкладки сайдбара записи](#addons-entry-sidebar)
- [Общие параметры полей](#fields-base)
- [Поля](#fields)
  - [PostObjectField](#PostObjectField)
  - [PageLinkField](#PageLinkField)
  - [RelationshipField](#RelationshipField)
  - [DictionaryField](#DictionaryField)
  - [MessageField](#MessageField)
  - [AccordionField](#AccordionField)
  - [ButtonGroupField](#ButtonGroupField)
  - [CheckboxField](#CheckboxField)
  - [ColorPickerField](#ColorPickerField)
  - [DatePickerField](#DatePickerField)
  - [DateTimePickerField](#DateTimePickerField)
  - [EmailField](#EmailField)
  - [FileField](#FileField)
  - [FlexibleContentField](#FlexibleContentField)
  - [GalleryField](#GalleryField)
  - [GroupField](#GroupField)
  - [ImageField](#ImageField)
  - [ImageSelectField](#ImageSelectField)
  - [LinkField](#LinkField)
  - [NumberField](#NumberField)
  - [OembedField](#OembedField)
  - [OpenStreetMapField](#OpenStreetMapField)
  - [PasswordField](#PasswordField)
  - [RadioField](#RadioField)
  - [RangeField](#RangeField)
  - [RepeaterField](#RepeaterField)
  - [SelectField](#SelectField)
  - [SeparatorField](#SeparatorField)
  - [TabField](#TabField)
  - [TextField](#TextField)
  - [TextareaField](#TextareaField)
  - [TimePickerField](#TimePickerField)
  - [TrueFalseField](#TrueFalseField)
  - [UrlField](#UrlField)
  - [UserField](#UserField)
  - [WysiwygField](#WysiwygField)

<a id="config"></a>
## Конфиг модуля

Тип: `KateCmsConfig`. Ключ в `nuxt.config.ts`: `katecms`. Мета модуля: `configKey: 'katecms'`.

<a id="config-setup"></a>
### Подключение

```ts
export default defineNuxtConfig({
  modules: ['katecms'],
  katecms: {
    // ...
  },
})
```

<a id="config-keys"></a>
### Ключи `katecms`

| Ключ | Тип | Дефолт | Смысл |
|---|---|---|---|
| `adminPath` | `string` | `'admin'` | Сегмент URL админки |
| `loginPath` | `string` | `'login'` | Сегмент входа, URL `/${adminPath}/login` |
| `registerPath` | `string` | `'register'` | Сегмент регистрации, URL `/${adminPath}/register` |
| `registration` | `boolean` | `false` | Саморегистрация. `true` — открыта после первого пользователя. `false` — закрыта; первый аккаунт всё равно создаётся как `owner`. Создание пользователей в админке не зависит от этого флага |
| `collections` | `Collections` | `{}` | Типы записей. Ключ объекта = slug |
| `dictionaries` | `Dictionaries` | `{}` | Словари. Ключ объекта = slug |
| `blocks` | `Blocks` | `{}` | Реестр блоков. Ключ объекта = slug |
| `database` | `DatabaseConfig` | SQLite `data/katecms.db` | База |
| `media` | `MediaConfig` | см. ниже | Загрузки |
| `roles` | `Roles` | `{}` поверх встроенных | Роли |

Пути — сегменты без ведущего `/`. Админка на `/${adminPath}`, вход на `/${adminPath}/${loginPath}`, регистрация на `/${adminPath}/${registerPath}`.

Загрузки всегда в `<rootDir>/public/uploads` (модуль сам ставит `media.dir`).

<a id="config-paths"></a>
### Пути

```ts
katecms: {
  adminPath: 'admin',
  loginPath: 'login',
  registerPath: 'register',
}
```

<a id="config-database"></a>
### База

```ts
interface DatabaseConfig {
  driver?: 'postgres' | 'sqlite'
  url?: string
  sqliteFilename?: string
}
```

| Поле | Смысл |
|---|---|
| `driver` | Явный движок. Без него непустой `url` → Postgres, иначе SQLite |
| `url` | Строка Postgres, например `postgres://postgres:admin@127.0.0.1:5432/katecms` |
| `sqliteFilename` | Файл SQLite, `:memory:` или `file:` URI. Относительный путь — от `rootDir`. Дефолт `data/katecms.db` |

Нужен PostgreSQL **15+**. Если `driver: 'postgres'` и `url` пустой, адаптер читает `DATABASE_URL`.

```ts
database: {
  driver: 'postgres',
  url: 'postgres://postgres:admin@127.0.0.1:5432/katecms',
}
```

<a id="config-media"></a>
### Медиа

| Поле | Дефолт | Смысл |
|---|---|---|
| `maxFileSize` | `10` | Лимит в МБ |
| `allowedMimeTypes` | jpeg, png, webp, gif, pdf, mp4 | Пустой массив запрещает всё. Omit — дефолтный список. `svg+xml` в дефолт не входит; если его добавить, файл скачивается, а не открывается как страница |
| `maxInputPixels` | `50_000_000` | Бюджет пикселей для вариантов. Более крупный исходник уменьшается |
| `avif` | `false` | `true` или `{ quality: 1..100 }` (иначе 80) |
| `webp` | `false` | То же |
| `imageSizes` | `[]` | Пресеты. Имя `full` зарезервировано и игнорируется |

Пресет: `name`, `width?`, `height?` (`0` = пропорционально другой стороне), `crop?` (`true` = cover, иначе inside). Увеличения сверх исходника нет.

```ts
media: {
  maxFileSize: 10,
  webp: { quality: 90 },
  imageSizes: [
    { name: 'medium', width: 480, height: 480, crop: true },
    { name: 'large', width: 1200 },
  ],
}
```

<a id="config-roles"></a>
### Роли

Встроенные: `owner`, `admin`, `editor`, `author`, `subscriber`. Карта `roles` добавляет роль, полностью заменяет встроенную или прячет (`author: false`). У `subscriber` по умолчанию нет прав на ресурсы: админский список, черновики и коллекции с `public: false` ему закрыты. Опубликованные публичные записи по-прежнему отдаёт фронт без входа.

Свой пароль меняется только вместе с текущим. Чужой пароль может задать роль с правом `users: update`, кроме аккаунта `owner`. Если пароль забыт и войти некому, на сервере с доступом к базе:

```bash
node scripts/reset-password.mjs --db data/katecms.db --email owner@example.com --password "New-password-123"
```

Для Postgres вместо `--db` укажите `--url`. Скрипт может сменить пароль owner. Письма для сброса нет.

- `owner` зарезервирован, запись в конфиге игнорируется.
- `admin` нельзя скрыть (`admin: false` игнорируется), определение `Role` заменяет права.

Права: `true` / `false` / `['read', 'create', 'update', 'delete']`. Для `collections` и `dictionaries` ещё карта по slug. Пропущенный ресурс = нет доступа. `true` на коллекцию/scope — править чужие записи; список действий — только свои.

```ts
roles: {
  seo: {
    label: 'SEO User',
    rights: {
      collections: {
        pages: ['read', 'create', 'update', 'delete'],
      },
      media: ['read', 'create'],
      options: false,
    },
  },
  author: false,
}
```

<a id="config-collections"></a>
### Коллекции

Ключ объекта = slug типа (колонка `type`).

| Поле | Тип | Дефолт | Смысл |
|---|---|---|---|
| `labels.name` | `string` | — | Подпись, обязательно |
| `labels.singularName` | `string` | `labels.name` | Одна запись |
| `icon` | `string` | дефолтная иконка | Inline SVG в меню |
| `hierarchical` | `boolean` | `false` | Дерево через `parent_id` |
| `autosave` | `boolean` | `false` | Уход с новой несохранённой записи → `draft` |
| `public` | `boolean` | `true` | `false` — страница записи/архива не работает, View в админке скрыт |
| `has_archive` | `boolean \| string` | `false` | Архив: `true` → префикс rewrite, строка → свой слаг ЧПУ |
| `perPage` | `number` | `10` | Записей на страницу архива, списка в админке и `getQueryCollection` (один тип). `-1` — все записи |
| `rewrite` | `string` | `/{slug}/%name%` | Публичный URL. Нужен плейсхолдер `%name%` |
| `fields` | `Fields` | `{}` | Поля записи. Ключ = имя поля |
| `blocks` | `string[] \| boolean` | `false` | `true` — все блоки, массив — allow-list, иначе выкл |

Плоская коллекция: `%name%` — один сегмент. `hierarchical: true` — `parent/child`.

<a id="config-dictionaries"></a>
### Словари

Ключ объекта = slug словаря.

| Поле | Тип | Дефолт | Смысл |
|---|---|---|---|
| `labels.name` | `string` | — | Обязательно |
| `labels.singularName` | `string` | `labels.name` | Один термин |
| `icon` | `string` | дефолтная иконка | Inline SVG |
| `fields` | `Fields` | `{}` | Поля термина |
| `collections` | `string[]` | — | Обязательно. Slug коллекций, к которым привязан словарь |
| `multiple` | `boolean` | `false` | Несколько терминов на запись |

Сайдбар записи использует join-таблицу. Поле `type: 'dictionary'` хранит значение в `fields` отдельно.

<a id="frontend-composables"></a>
### Публичные композаблы

Автоимпорт модуля. Черновики — только с `preview: true` (и правом `collections:read`). Коллекции с `public: false` с фронта не отдаются.

<a id="getCollection"></a>
### getCollection()

Запись или архив по текущему пути (`rewrite` / `has_archive`).

| Опция | Тип | Дефолт | Смысл |
|---|---|---|---|
| `path` | `string` | текущий URL | Публичный путь |
| `preview` | `boolean` | `false` | Черновики при праве `collections:read`. Также `?preview=1` |
| `status` | `'published' \| 'draft' \| array` | `'published'` | Также `?status=`. `draft` без preview игнорируется |
| `page` | `number` | `1` | Страница архива. Также `?page=` |
| `perPage` | `number` | `perPage` коллекции | Размер страницы архива. `-1` — все. Также `?perPage=` |

```vue
<script setup lang="ts">
const { entry, entries, isArchive, collection, link, permalink } = await getCollection()
</script>

<template>
  <ul v-if="isArchive">
    <li v-for="item in entries" :key="item.id">
      <NuxtLink :to="permalink(item) || '/'">{{ item.title }}</NuxtLink>
    </li>
  </ul>
  <article v-else>
    <h1>{{ entry?.title }}</h1>
    <NuxtLink :to="link || '/'">{{ link }}</NuxtLink>
  </article>
</template>
```

<a id="getOptions"></a>
### getOptions()

Значения options-страницы по slug из конфига (`katecms.options`).

| Опция | Тип | Дефолт | Смысл |
|---|---|---|---|
| `option` | `string` | — | Slug страницы опций, обязательно |

```vue
<script setup lang="ts">
const { values } = await getOptions({ option: 'site' })
</script>

<template>
  <p>{{ values.title }}</p>
</template>
```

<a id="getQueryCollection"></a>
### getQueryCollection()

Выборка записей по фильтрам. По умолчанию `published`, сортировка по дате.

| Опция | Тип | Дефолт | Смысл |
|---|---|---|---|
| `collection` | `'any' \| string \| string[]` | — | Slug типа(ов). `'any'` — все публичные коллекции |
| `preview` | `boolean` | `false` | Черновики, если есть `collections:read` на все типы. Также `?preview=1` |
| `status` | `'published' \| 'draft' \| array` | `'published'` | Также `?status=`. `draft` без preview игнорируется |
| `page` | `number` | `1` | Номер страницы. Также `?page=` |
| `perPage` | `number` | `perPage` типа или `10` | Размер страницы. `-1` — все. Также `?perPage=` |
| `search` | `string` | — | Поиск по title/slug |
| `title` | `string \| string[]` | — | Точное совпадение заголовка |
| `slug` | `string \| string[]` | — | Слаг записи |
| `slugs` | `string \| string[]` | — | Список слагов |
| `includeIds` | `number \| number[]` | — | Только эти id |
| `excludeIds` | `number \| number[]` | — | Кроме этих id |
| `parentId` | `number \| null` | — | Родитель. `null` / `0` — корень |
| `parentIds` | `number \| number[]` | — | Родитель из списка. `0` — корень |
| `excludeParentIds` | `number \| number[]` | — | Кроме этих родителей. `0` — корень |
| `authorIn` | `number[]` | — | Только записи этих авторов |
| `authorNotIn` | `number[]` | — | Исключить записи этих авторов |
| `dictionaryQuery` | `object` | — | Фильтр по словарям. [значения](#getQueryCollection-dictionaryQuery) |
| `fieldsQuery` | `object` | — | Фильтр по JSON `fields`. [значения](#getQueryCollection-fieldsQuery) |
| `orderBy` | `string` | `'date'` | `date`, `modified`, `name`, `title`, `slug`, `id`, `menu_order`, `published_at`, `created_at`, `updated_at`, `includeIds` |
| `order` | `'asc' \| 'desc'` | по полю | Направление сортировки. Для `includeIds` — порядок массива (`desc` разворачивает) |

<a id="getQueryCollection-dictionaryQuery"></a>
#### dictionaryQuery

Связи записи со словарём (`collection_dictionaries`). Пустой или невалидный `queries` — фильтр не применяется.

| Поле | Тип | Дефолт | Смысл |
|---|---|---|---|
| `relation` | `'AND' \| 'OR'` | `'AND'` | Как сочетать элементы `queries` |
| `queries` | `object[]` | — | Условия. Без валидных элементов фильтр снимается |

Каждый элемент `queries[]`:

| Поле | Тип | Дефолт | Смысл |
|---|---|---|---|
| `dictionary` | `string` | — | Slug словаря (`type`), обязательно |
| `field` | `'id' \| 'name' \| 'slug'` | `'id'` | По чему искать `terms`. `name` — заголовок строки словаря |
| `terms` | `number \| string \| array` | — | id, заголовок или слаг. Не нужен для `EXISTS` / `NOT EXISTS` |
| `operator` | см. ниже | `'IN'` | Как сопоставлять найденные строки |
| `includeChildren` | `boolean` | `true` | Добавить потомков в дереве. Не для `EXISTS` / `NOT EXISTS` |

`operator`:

| Значение | Смысл |
|---|---|
| `IN` | Запись связана хотя бы с одним из `terms` |
| `NOT IN` | Запись не связана ни с одним из `terms` |
| `AND` | Запись связана со **всеми** `terms` |
| `EXISTS` | Есть любая связь с этим словарём (`terms` игнорируются) |
| `NOT EXISTS` | Нет связей с этим словарём |

```vue
<script setup lang="ts">
const { entries, permalink, page, total } = await getQueryCollection({
  collection: 'post',
  perPage: 10,
  orderBy: 'date',
  dictionaryQuery: {
    relation: 'AND',
    queries: [
      {
        dictionary: 'services',
        field: 'slug',
        terms: 'theme-1',
      },
      {
        dictionary: 'categories',
        field: 'slug',
        terms: 'category-1',
        operator: 'NOT IN',
        includeChildren: false,
      },
    ],
  },
})
</script>
```

<a id="getQueryCollection-fieldsQuery"></a>
#### fieldsQuery

Смотрит в JSON `fields` записи, не в `collection_meta`. Пустой или невалидный `queries` — фильтр не применяется.

| Поле | Тип | Дефолт | Смысл |
|---|---|---|---|
| `relation` | `'AND' \| 'OR'` | `'AND'` | Как сочетать элементы `queries` |
| `queries` | `object[]` | — | Условия. Без валидных элементов фильтр снимается |

Каждый элемент `queries[]`:

| Поле | Тип | Дефолт | Смысл |
|---|---|---|---|
| `key` | `string \| string[]` | — | Ключ в `fields`. Обязательно. Точечный путь (`seo.title`) только для `=` / `IN` |
| `compareKey` | см. ниже | `=` или `IN` | Как сопоставлять **имя** ключа. `IN`, если `key` — массив |
| `value` | `string \| number \| boolean \| array` | — | Не нужен для `EXISTS` / `NOT EXISTS` |
| `compare` | см. ниже | `=` или `IN` | Оператор сравнения. `IN`, если `value` — массив |
| `type` | см. ниже | `'TEXT'` | Приведение значения при сравнении |

`compareKey` (имя ключа):

| Значение | Смысл |
|---|---|
| `=` | Точное имя. Один ключ |
| `IN` | Имя из списка |
| `!=` | Имя не равно. Только корневые ключи объекта |
| `NOT IN` | Имя не из списка. Только корневые ключи |
| `LIKE` / `NOT LIKE` | Подстрока в имени. Только корневые ключи |
| `REGEXP` / `NOT REGEXP` | Регулярка по имени. Только корневые ключи |

`compare`:

| Значение | Смысл |
|---|---|
| `=` / `!=` | Равно / не равно |
| `>` / `>=` / `<` / `<=` | Числовое или текстовое сравнение |
| `LIKE` / `NOT LIKE` | Подстрока, `%` не нужны |
| `ILIKE` / `NOT ILIKE` | То же без регистра. PostgreSQL — `ILIKE`, SQLite — `LOWER()` |
| `IN` / `NOT IN` | Значение из списка. Пустой `IN` — нет совпадений, пустой `NOT IN` — все строки |
| `BETWEEN` / `NOT BETWEEN` | Интервал: `value: [min, max]` |
| `EXISTS` / `NOT EXISTS` | Ключ есть / нет в `fields` (`value` игнорируется) |
| `REGEXP` / `NOT REGEXP` | Регулярка по значению, без `/.../` |

`type`:

| Значение | Смысл |
|---|---|
| `TEXT` | Как строка |
| `INTEGER` | Целое |
| `NUMERIC` | Число с дробью |
| `DATETIME` / `DATE` / `TIME` | Как текст (ISO-строки сравниваются лексикографически) |

`LIKE` / `REGEXP` / `!=` / `NOT IN` по **ключу** обходят только корневые ключи (`json_each` / `jsonb_each_text`), вложенные пути вроде `seo.title` там не работают. `REGEXP` в PostgreSQL — POSIX `~`, в SQLite — JS `RegExp`; на D1 кастомного `REGEXP` нет. JSON-массив в поле сравнивается целиком как текст, не поэлементно.

```ts
const { entries } = await getQueryCollection({
  collection: 'post',
  fieldsQuery: {
    relation: 'AND',
    queries: [
      { key: 'color', value: 'red' },
      { key: 'price', compare: '>=', value: 10, type: 'NUMERIC' },
    ],
  },
})
```

`orderBy: 'includeIds'` сохраняет порядок `includeIds`:

```ts
const { entries } = await getQueryCollection({
  collection: 'page',
  includeIds: [5, 12, 2, 14, 7],
  orderBy: 'includeIds',
})
```

<a id="getTerms"></a>
### getTerms()

Строки словаря. `count` — число опубликованных записей публичных коллекций, связанных с термином. Пустой термин скрыт, пока у потомка нет записей.

| Опция | Тип | Дефолт | Смысл |
|---|---|---|---|
| `dictionary` | `string \| string[]` | — | Slug словаря, обязательно |
| `perPage` | `number` | все | Размер страницы. `-1` — все |
| `offset` | `number` | `0` | Сколько совпадений пропустить |
| `includeIds` | `number \| number[]` | — | Только эти id. Пустой список — ничего |
| `excludeIds` | `number \| number[]` | — | Кроме этих id |
| `excludeTreeIds` | `number \| number[]` | — | Кроме этих терминов и всех потомков |
| `parentId` | `number \| null` | — | Прямой родитель. `null` / `0` — корень |
| `childOf` | `number` | — | Все потомки этого id, без него самого |
| `childless` | `boolean` | `false` | Пропустить термины, у которых есть дети |
| `slug` | `string \| string[]` | — | Точный слаг |
| `title` | `string \| string[]` | — | Точный заголовок |
| `search` | `string` | — | Подстрока в title или slug, без регистра |
| `hideEmpty` | `boolean` | `true` | Скрыть термины с `count = 0` |
| `hierarchical` | `boolean` | `true` | Оставить пустой термин, если у потомка есть записи |
| `padCounts` | `boolean` | `false` | Прибавить к `count` записи потомков |
| `fieldsQuery` | `object` | — | Фильтр JSON `fields`. [значения](#getQueryCollection-fieldsQuery) |
| `orderBy` | `string` | `'title'` | `id`, `title`, `slug`, `count`, `parent`, `includeIds`, `slugs`, `field`, `none` |
| `orderByField` | `{ key, type? }` | — | Ключ для `orderBy: 'field'`. `type` как в `fieldsQuery` |
| `order` | `'asc' \| 'desc'` | `'asc'` | Направление сортировки |
| `return` | `string` | `'all'` | `all` — объекты, `ids`, `titles`, `count`, `idParent`, `idSlug`, `idTitle` |

`return: 'count'` — это `total` до `perPage` и `offset`. Остальные режимы режут страницу, `total` остаётся полным. Карты `idParent` / `idSlug` / `idTitle` лежат в `map`, ключ — id строкой.

```ts
const { terms, total } = await getTerms({
  dictionary: 'services',
  parentId: 0,
  padCounts: true,
  fieldsQuery: {
    queries: [{ key: 'color', value: 'red' }],
  },
})
```

<a id="config-example"></a>
### Пример

```ts
export default defineNuxtConfig({
  modules: ['katecms'],
  katecms: {
    collections: {
      pages: {
        labels: { name: 'Pages', singularName: 'Page' },
        hierarchical: true,
        autosave: true,
        rewrite: '/inf/%name%',
        has_archive: true,
        fields: {
          body: { type: 'wysiwyg', label: 'Текст', toolbar: 'full' },
          thumbnail: { type: 'image', label: 'Обложка', position: 'sidebar' },
        },
      },
    },
    dictionaries: {
      categories: {
        labels: { name: 'Categories', singularName: 'Category' },
        multiple: true,
        collections: ['pages'],
      },
    },
  },
})
```

<a id="addons"></a>
## Дополнения

Модули `katecms-seo` и `katecms-form-builder` подключаются рядом с `katecms`. Точки расширения админки импортируются из `katecms/extensions`.

```ts
export default defineNuxtConfig({
  modules: [
    'katecms',
    'katecms-seo',
  ],
})
```

<a id="addons-entry-sidebar"></a>
### Вкладки сайдбара записи

Сайдбар формы записи (`.katecms-collection-form__sidebar`) показывает вкладки, когда дополнение зарегистрировало хотя бы одну. Первая вкладка — **Page**: публикация, словари и поля с `position: 'sidebar'`. Дальше идут вкладки дополнений в порядке регистрации. Ключ `page` занят этой вкладкой.

`katecms-seo` регистрирует вкладку **SEO**. Панель — `SeoEntryPanel` в пакете `katecms-seo`. У новой записи на вкладке написано сохранить запись перед редактированием SEO. Сохранение SEO отдельное от кнопки Publish.

Своя вкладка регистрируется из плагина. Компонент к этому моменту уже стоит на Vue-приложении. Повторный вызов с тем же `key` заменяет вкладку.

| Поле | Тип | Смысл |
|---|---|---|
| `key` | `string` | Стабильный id. Не `page` |
| `label` | `string` | Подпись вкладки |
| `component` | `string` | Имя компонента на приложении |

```ts
import { registerKateCmsEntrySidebarTab } from 'katecms/extensions'
import MyPanel from './MyPanel.vue'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('KateCmsMyPanel', MyPanel)
  registerKateCmsEntrySidebarTab({
    key: 'my-addon',
    label: 'Notes',
    component: 'KateCmsMyPanel',
  })
})
```

Панель вкладки монтируется при первом открытии и остаётся смонтированной при переключении. Вкладка Page тоже остаётся в дереве.

Пункт меню добавляется через `useKateCmsMenuItems()`. Панель под формой термина словаря — список имён компонентов в `useKateCmsTermPanels()`.

<a id="fields-base"></a>
## Общие параметры полей

Карта `fields`: **ключ = имя поля**, `type` — snake_case (`post_object`). PascalCase ниже — имя компонента (`KateCmsPostObjectField`).

| Поле | Тип | Дефолт | Смысл |
|---|---|---|---|
| `label` | `string` | — | Подпись |
| `instructions` | `string` | — | Подсказка |
| `required` | `boolean` | `false` | У записи коллекции на сервере проверяется только при `status: 'published'` |
| `conditionalLogic` | `Condition[][]` | нет | Группы OR, внутри группы AND |
| `position` | `'main' \| 'sidebar'` | `'main'` | Колонка формы |
| `columnWidth` | `number` | — | Ширина в % |

Нет ключа или `[]` — поле всегда видно. Скрытое поле не проверяется как `required` и не пишется в сохранённые значения.

`Condition[][]`: внешний массив — **OR** (достаточно одной группы), внутренний — **AND** (все условия группы). `field` — ключ поля в `fields`, не `label`.

```ts
tagline: {
  type: 'text',
  label: 'Tagline',
  // показать, если title === 'show'
  conditionalLogic: [
    [{ field: 'title', operator: 'equal', value: 'show' }],
  ],
},
seo_note: {
  type: 'message',
  label: 'SEO',
  // (status === 'draft' И title не пустой) ИЛИ flag === true
  conditionalLogic: [
    [
      { field: 'status', operator: 'equal', value: 'draft' },
      { field: 'title', operator: 'notEmpty' },
    ],
    [{ field: 'flag', operator: 'equal', value: true }],
  ],
},
```

| Оператор | `value` | Когда истинно |
|---|---|---|
| `empty` | не нужен | Нет значения: `null` / `undefined`, `''`, `false`, `[]` |
| `notEmpty` | не нужен | Обратное `empty` |
| `equal` | да | Скаляр: `String(значение) === String(value)` (регистр важен). Массив выбранных (multi-select и т.п.): содержит `value` |
| `notEqual` | да | Обратное `equal` |
| `contains` | да | Строка содержит подстроку `value`. Массив: элемент входит в выбранные |
| `notContains` | да | Обратное `contains` |
| `matches` | да | `RegExp(value)` по строке значения. Невалидный паттерн или длиннее 200 символов → ложь |
| `gt` | да | Число: `Number(значение) > Number(value)`. Массив: `length > Number(value)` |
| `lt` | да | Аналогично `gt`, но «меньше» |

`value` приводится к строке для `equal` / `contains` / `matches` (`true` → `'true'`). Для `gt` / `lt` — к числу.

Layout-only (`tab`, `accordion`, `separator`, `message`) не хранят значение под своим ключом. У `tab` / `accordion` `subFields` панелей пишутся плоско в родителя.

`indexed: true` (где тип это допускает) — скалярный индекс Postgres JSONB. Nuxt создаёт/снимает их при старте после миграции. SQLite пропускает. Не работает внутри `repeater` / `flexible_content`.

Зарезервированные ключи в строках: `fc_layout` (flexible content), `__katecmsCollapsed` (свёртка ряда).

В карточках ниже общие свойства не повторяются.

<a id="fields"></a>
## Поля

<a id="PostObjectField"></a>
### PostObjectField — `type: 'post_object'`

Select записей коллекций.

| Параметр | Тип | Смысл |
|---|---|---|
| `postType` | `string[]` | Slug коллекций. Нет — все |
| `dictionary` | `string[]` | Только записи с термином этих словарей |
| `allowNull` | `boolean` | Пустое значение |
| `multiple` | `boolean` | Несколько записей |
| `returnFormat` | `'object' \| 'id'` | Объект записи или id. В UI без значения → объект |

```ts
related: {
  type: 'post_object',
  label: 'Связанные',
  postType: ['pages', 'products'],
  multiple: true,
  allowNull: true,
  returnFormat: 'object',
}
```

<a id="PageLinkField"></a>
### PageLinkField — `type: 'page_link'`

Публичный URL записи (строка), не объект.

| Параметр | Тип | Смысл |
|---|---|---|
| `postType` | `string[]` | Типы в пикере |
| `dictionary` | `string[]` | Фильтр по словарям |
| `allowNull` | `boolean` | Пусто |
| `multiple` | `boolean` | Несколько URL |
| `allowArchives` | `boolean` | Пункты архивов коллекции (только если у типа `has_archive`) |

```ts
cta: {
  type: 'page_link',
  label: 'Ссылка',
  postType: ['pages'],
  multiple: true,
  allowArchives: true,
  allowNull: true,
}
```

<a id="RelationshipField"></a>
### RelationshipField — `type: 'relationship'`

Пикер записей: поиск, фильтры, порядок drag-and-drop.

| Параметр | Тип | Смысл |
|---|---|---|
| `postType` | `string[]` | Типы записей |
| `dictionary` | `string[]` | Словари фильтра. Нет — все из public-навигации |
| `min` / `max` | `number` | Лимит выбранных |
| `filters` | `Array<'search' \| 'post_type' \| 'dictionary'>` | В UI без значения → `['search']` |
| `elements` | `string[]` | Ключи image/gallery-полей для превью, например `['thumbnail']` |
| `returnFormat` | `'object' \| 'id'` | Как у `post_object` |

```ts
related: {
  type: 'relationship',
  label: 'Похожие',
  postType: ['pages', 'products'],
  dictionary: ['categories'],
  filters: ['search', 'post_type', 'dictionary'],
  elements: ['thumbnail'],
  max: 4,
  returnFormat: 'object',
}
```

<a id="DictionaryField"></a>
### DictionaryField — `type: 'dictionary'`

Термины одного словаря. Значение в `fields`, не в сайдбар-join.

| Параметр | Тип | Смысл |
|---|---|---|
| `dictionary` | `string` | Slug словаря, обязательно |
| `fieldType` | `'checkbox' \| 'multi_select' \| 'radio' \| 'select'` | Вид. Дефолт в UI `'checkbox'` |
| `multiple` | `boolean` | Для `select`. `checkbox` / `multi_select` всегда несколько, `radio` всегда один |
| `allowNull` | `boolean` | Пусто |
| `returnFormat` | `'object' \| 'id'` | Термин или id. В UI без значения → объект |
| `addTerm` | `boolean` | Создать термин при праве `create` |

```ts
category: {
  type: 'dictionary',
  label: 'Категория',
  dictionary: 'categories',
  fieldType: 'select',
  allowNull: true,
  addTerm: true,
  returnFormat: 'object',
}
```

<a id="MessageField"></a>
### MessageField — `type: 'message'`

Подсказка без значения (layout-only).

| Параметр | Тип | Смысл |
|---|---|---|
| `message` | `string` | Текст |
| `escHtml` | `boolean` | Экранировать HTML |
| `newLines` | `'autop' \| 'br' \| ''` | Переносы |

В модуле нет `MessageField.vue` — поле в админке не отрисуется, пока не появится компонент.

```ts
hint: {
  type: 'message',
  label: 'Подсказка',
  message: 'Заполните блок ниже.',
  escHtml: true,
  newLines: 'br',
}
```

<a id="AccordionField"></a>
### AccordionField — `type: 'accordion'`

Только UI. Из базы: `position`, `columnWidth`, `conditionalLogic`. Поля панелей — плоско в родителя. Ключи `subFields` должны быть уникальны в форме.

| Параметр | Тип | Смысл |
|---|---|---|
| `open` | `number` | Индекс открытой панели с `0`. В UI без числа → `0` |
| `multiExpand` | `boolean` | Несколько панелей сразу |
| `panels` | `{ label: string, subFields: Fields }[]` | Панели |

```ts
block: {
  type: 'accordion',
  open: 0,
  multiExpand: false,
  panels: [
    {
      label: 'SEO',
      subFields: {
        seo_title: { type: 'text', label: 'Title' },
        seo_description: { type: 'textarea', label: 'Description' },
      },
    },
  ],
}
```

<a id="ButtonGroupField"></a>
### ButtonGroupField — `type: 'button_group'`

Один выбор кнопками. `choices`: `{ value: label }`.

| Параметр | Тип | Смысл |
|---|---|---|
| `choices` | `Record<string, string>` | Обязательно |
| `defaultValue` | `string` | Начальный выбор |
| `allowNull` | `boolean` | Снять выбор |
| `returnFormat` | `'value' \| 'label' \| 'array'` | Ключ / подпись / `{ value, label }` |
| `layout` | `'horizontal' \| 'vertical'` | Раскладка |
| `indexed` | `boolean` | Индекс Postgres |

```ts
tone: {
  type: 'button_group',
  label: 'Тон',
  layout: 'horizontal',
  choices: { light: 'Светлый', dark: 'Тёмный' },
  defaultValue: 'light',
  returnFormat: 'value',
}
```

<a id="CheckboxField"></a>
### CheckboxField — `type: 'checkbox'`

Несколько вариантов. `choices`: `{ value: label }`.

| Параметр | Тип | Смысл |
|---|---|---|
| `choices` | `Record<string, string>` | Обязательно |
| `defaultValue` | `string \| string[]` | Начальный выбор |
| `layout` | `'vertical' \| 'horizontal'` | Раскладка |
| `toggle` | `boolean` | «Выбрать все». Без `allowCustomChoices` текст — `customChoiceButtonText` или `'Select all'` |
| `returnFormat` | `'value' \| 'label' \| 'array'` | Формат |
| `allowCustomChoices` | `boolean` | Поле «Other» + кнопка, свой вариант добавляется в список и сразу отмечается |
| `customChoiceButtonText` | `string` | Кнопка добавления (`'Add'`). Без `allowCustomChoices` — подпись toggle |

```ts
flags: {
  type: 'checkbox',
  label: 'Опции',
  layout: 'vertical',
  toggle: true,
  allowCustomChoices: true,
  customChoiceButtonText: 'Add',
  choices: { a: 'A', b: 'B' },
  defaultValue: ['a'],
  returnFormat: 'array',
}
```

<a id="ColorPickerField"></a>
### ColorPickerField — `type: 'color_picker'`

| Параметр | Тип | Смысл |
|---|---|---|
| `defaultValue` | `string` | Начальный цвет |
| `enableOpacity` | `boolean` | Альфа |
| `returnFormat` | `'string' \| 'array'` | Строка или `{ hex, rgba, r, g, b, a }`. В UI без значения → `'string'` |
| `paletteColors` | `string[]` | Палитра |
| `showColorWheel` | `boolean` | Колесо |
| `rgba` / `hsla` | `boolean` | Поля RGBA / HSLA |
| `indexed` | `boolean` | Индекс Postgres |

```ts
accent: {
  type: 'color_picker',
  label: 'Цвет',
  defaultValue: '#2F6FED',
  enableOpacity: true,
  returnFormat: 'array',
  showColorWheel: true,
  rgba: true,
  hsla: true,
  indexed: true,
}
```

<a id="DatePickerField"></a>
### DatePickerField — `type: 'date_picker'`

Токены формата: `YYYY` `YY` `MM` `M` `DD` `D` `HH` `H` `mm` `m` `ss` `s`.

| Параметр | Тип | Дефолт | Смысл |
|---|---|---|---|
| `displayFormat` | `string` | `DD.MM.YYYY` | Как показать |
| `returnFormat` | `string` | `YYYY-MM-DD` | Как сохранить |
| `firstDay` | `number` | — | Первый день недели (`1` = понедельник) |
| `defaultToCurrentDate` | `boolean` | — | Подставить сегодня |
| `indexed` | `boolean` | — | Индекс Postgres (`date`) |

```ts
event_date: {
  type: 'date_picker',
  label: 'Дата',
  displayFormat: 'DD.MM.YYYY',
  returnFormat: 'YYYY-MM-DD',
  firstDay: 1,
  defaultToCurrentDate: true,
}
```

<a id="DateTimePickerField"></a>
### DateTimePickerField — `type: 'date_time_picker'`

Те же параметры, что у даты. Дефолты: display `DD.MM.YYYY HH:mm`, return `YYYY-MM-DD HH:mm`. Индекс: `timestamptz`.

```ts
starts_at: {
  type: 'date_time_picker',
  label: 'Начало',
  displayFormat: 'DD.MM.YYYY HH:mm',
  returnFormat: 'YYYY-MM-DD HH:mm',
  firstDay: 1,
  defaultToCurrentDate: true,
}
```

<a id="EmailField"></a>
### EmailField — `type: 'email'`

| Параметр | Тип | Смысл |
|---|---|---|
| `defaultValue` | `string` | Начальное |
| `placeholder` | `string` | Плейсхолдер |
| `prepend` / `append` | `string` | Текст слева / справа |
| `indexed` | `boolean` | Индекс Postgres |

```ts
contact: {
  type: 'email',
  label: 'Почта',
  placeholder: 'name@example.com',
  prepend: '@',
}
```

<a id="FileField"></a>
### FileField — `type: 'file'`

Один файл из медиатеки.

| Параметр | Тип | Смысл |
|---|---|---|
| `returnFormat` | `'array' \| 'url' \| 'id'` | `MediaItem` / URL / id. В UI без значения → `'array'` |
| `library` | `'all' \| 'uploadedTo'` | `'uploadedTo'` скрывает выбор из библиотеки |
| `minSize` / `maxSize` | `number` | Размер файла |
| `mimeTypes` | `string` | MIME/расширения через запятую или пробел |

Глобальный лимит всё равно `media.maxFileSize` и `media.allowedMimeTypes`.

```ts
attachment: {
  type: 'file',
  label: 'Файл',
  returnFormat: 'array',
  library: 'all',
  maxSize: 10,
  mimeTypes: 'application/pdf',
}
```

<a id="FlexibleContentField"></a>
### FlexibleContentField — `type: 'flexible_content'`

Массив блоков разных layout. Имя layout пишется в строку как `fc_layout`.

| Параметр | Тип | Смысл |
|---|---|---|
| `min` | `number` | Мягкий лимит (в типе: будущая валидация, UI строки сам не добавляет) |
| `max` | `number` | Максимум блоков в UI |
| `buttonLabel` | `string` | Текст кнопки |
| `previewPath` | `string` | Каталог превью относительно `public` |
| `layouts` | `Record<string, FlexibleLayout>` | Обязательно |

`FlexibleLayout`: `label`, `preview?` (файл в `previewPath` или URL), `min?` (мягкий), `max?` (лимит этого layout в UI), `subFields`.

```ts
content: {
  type: 'flexible_content',
  label: 'Контент',
  max: 5,
  buttonLabel: 'Add layout',
  layouts: {
    hero: {
      label: 'Hero',
      max: 2,
      preview: 'hero.png',
      subFields: {
        title: { type: 'text', label: 'Title', required: true },
        text: { type: 'textarea', label: 'Text' },
      },
    },
  },
}
```

<a id="GalleryField"></a>
### GalleryField — `type: 'gallery'`

Несколько изображений, drag-and-drop.

| Параметр | Тип | Смысл |
|---|---|---|
| `returnFormat` | `'array' \| 'url' \| 'id'` | Массив `MediaItem` / URL / id. В UI без значения → `'array'` |
| `previewSize` | `string` | Имя варианта для превью |
| `insert` | `'append' \| 'prepend'` | В UI без значения → `'append'` |
| `library` | `'all' \| 'uploadedTo'` | Как у `image` |
| `min` / `max` | `number` | Число файлов |
| `minSize` / `maxSize` / `mimeTypes` | | Как у `file` |
| `minWidth` / `minHeight` / `maxWidth` / `maxHeight` | `number` | Размеры картинки |

Пустой дефолт формы — `[]`.

```ts
photos: {
  type: 'gallery',
  label: 'Галерея',
  returnFormat: 'array',
  insert: 'append',
  min: 1,
  max: 8,
}
```

<a id="GroupField"></a>
### GroupField — `type: 'group'`

Вложенный объект. Скаляры внутри можно индексировать.

| Параметр | Тип | Смысл |
|---|---|---|
| `subFields` | `Fields` | Вложенные поля |

```ts
seo: {
  type: 'group',
  label: 'SEO',
  subFields: {
    title: { type: 'text', label: 'Title' },
    description: { type: 'textarea', label: 'Description' },
  },
}
```

<a id="ImageField"></a>
### ImageField — `type: 'image'`

Одна картинка, опционально кроп.

| Параметр | Тип | Смысл |
|---|---|---|
| `returnFormat` | `'array' \| 'url' \| 'id'` | `MediaItem` / URL / id. В UI без значения → `'array'` |
| `library` | `'all' \| 'uploadedTo'` | Как у `file` |
| `cropType` | `[number, number] \| boolean` | `true` — кроп; `[16, 9]` — соотношение |
| `minSize` / `maxSize` / `mimeTypes` | | Ограничения файла. Пустой `mimeTypes` → `image/*` |
| `minWidth` / `minHeight` / `maxWidth` / `maxHeight` | `number` | Размеры |

```ts
thumbnail: {
  type: 'image',
  label: 'Обложка',
  position: 'sidebar',
  returnFormat: 'array',
  cropType: [16, 9],
}
```

<a id="ImageSelectField"></a>
### ImageSelectField — `type: 'image_select'`

Варианты с превью: `{ key: { label, image } }`.

| Параметр | Тип | Смысл |
|---|---|---|
| `choices` | `Record<string, { label: string, image: string }>` | Обязательно. `image` — URL |
| `defaultValue` | `string \| string[]` | Начальный выбор |
| `layout` | `'vertical' \| 'horizontal'` | Раскладка |
| `multiple` | `boolean` | Несколько |
| `allowNull` | `boolean` | Сброс в одиночном режиме |
| `returnFormat` | `'value' \| 'label' \| 'array'` | Формат |
| `width` / `height` | `number` | Размер превью, px |

```ts
hero: {
  type: 'image_select',
  label: 'Макет',
  layout: 'horizontal',
  multiple: true,
  choices: {
    left: { label: 'Left', image: '/preview-a.png' },
    right: { label: 'Right', image: '/preview-b.png' },
  },
  defaultValue: ['left'],
  width: 140,
  height: 110,
}
```

<a id="LinkField"></a>
### LinkField — `type: 'link'`

Произвольный URL (не пикер CMS).

| Параметр | Тип | Смысл |
|---|---|---|
| `returnFormat` | `'array' \| 'url'` | `{ url, title, target }` или строка. Без `'url'` → объект |

```ts
btn: { type: 'link', label: 'Кнопка', returnFormat: 'array' }
```

<a id="NumberField"></a>
### NumberField — `type: 'number'`

| Параметр | Тип | Смысл |
|---|---|---|
| `defaultValue` | `number` | Начальное |
| `min` / `max` / `step` | `number` | Границы и шаг |
| `placeholder` | `string` | Плейсхолдер |
| `prepend` / `append` | `string` | Слева / справа |
| `indexed` | `boolean` | Индекс Postgres (`numeric`) |

```ts
price: {
  type: 'number',
  label: 'Цена',
  defaultValue: 10,
  min: 0,
  max: 100,
  step: 5,
  prepend: '$',
  append: 'USD',
  indexed: true,
}
```

<a id="OembedField"></a>
### OembedField — `type: 'oembed'`

URL эмбеда (YouTube и т.д.). Хранится строка URL.

| Параметр | Тип | Смысл |
|---|---|---|
| `defaultValue` | `string` | URL |
| `width` / `height` | `number` | `maxwidth` / `maxheight` запроса |

```ts
video: {
  type: 'oembed',
  label: 'Видео',
  width: 560,
  height: 315,
}
```

<a id="OpenStreetMapField"></a>
### OpenStreetMapField — `type: 'open_street_map'`

Leaflet + Nominatim. Значение: `OsmMarker` или массив, или `null`.

| Параметр | Тип | Смысл |
|---|---|---|
| `height` | `number` | Высота карты, px |
| `centerLat` / `centerLng` | `string` | Центр (строки) |
| `zoom` | `number` | Масштаб |
| `multiple` | `boolean` | Несколько маркеров. Дефолт формы тогда `[]` |

```ts
place: {
  type: 'open_street_map',
  label: 'Точка',
  height: 360,
  centerLat: '55.751244',
  centerLng: '37.618423',
  zoom: 10,
  multiple: false,
}
```

<a id="PasswordField"></a>
### PasswordField — `type: 'password'`

Поле записи, не пароль пользователя CMS. `indexed` и `defaultValue` в типе нет.

| Параметр | Тип | Смысл |
|---|---|---|
| `placeholder` | `string` | Плейсхолдер |
| `prepend` / `append` | `string` | Слева / справа |

```ts
secret: { type: 'password', label: 'Секрет', placeholder: 'Password' }
```

<a id="RadioField"></a>
### RadioField — `type: 'radio'`

Один вариант. `choices`: `{ value: label }`.

| Параметр | Тип | Смысл |
|---|---|---|
| `choices` | `Record<string, string>` | Обязательно |
| `defaultValue` | `string` | Начальный выбор |
| `layout` | `'vertical' \| 'horizontal'` | Раскладка |
| `allowNull` | `boolean` | Снять повторным кликом |
| `returnFormat` | `'value' \| 'label' \| 'array'` | Формат |
| `indexed` | `boolean` | Индекс Postgres |
| `allowCustomChoices` | `boolean` | Поле «Other» + кнопка, свой вариант добавляется в список и выбирается |
| `customChoiceButtonText` | `string` | Кнопка добавления (`'Add'`) |

```ts
align: {
  type: 'radio',
  label: 'Выравнивание',
  layout: 'vertical',
  allowNull: true,
  allowCustomChoices: true,
  choices: { left: 'Слева', center: 'Центр' },
  defaultValue: 'left',
}
```

<a id="RangeField"></a>
### RangeField — `type: 'range'`

| Параметр | Тип | Смысл |
|---|---|---|
| `defaultValue` | `number` | Начальное |
| `min` / `max` / `step` | `number` | Границы и шаг |
| `prepend` / `append` | `string` | Подписи |
| `indexed` | `boolean` | Индекс Postgres (`numeric`) |

```ts
volume: {
  type: 'range',
  label: 'Громкость',
  defaultValue: 25,
  min: 0,
  max: 200,
  step: 5,
}
```

<a id="RepeaterField"></a>
### RepeaterField — `type: 'repeater'`

Массив одинаковых строк. Можно вкладывать repeater. Индексы Postgres внутри не строятся. Пустой дефолт — `[]`.

| Параметр | Тип | Смысл |
|---|---|---|
| `min` / `max` | `number` | Число строк |
| `buttonLabel` | `string` | Текст кнопки |
| `collapsed` | `string` | Ключ subField для заголовка свёрнутой строки |
| `subFields` | `Fields` | Поля строки |

```ts
items: {
  type: 'repeater',
  label: 'Пункты',
  collapsed: 'title',
  min: 1,
  max: 5,
  buttonLabel: 'Add item',
  subFields: {
    title: { type: 'text', label: 'Title', required: true },
    text: { type: 'textarea', label: 'Text' },
  },
}
```

<a id="SelectField"></a>
### SelectField — `type: 'select'`

`choices` — массив, не карта. Группа: `{ type: 'group', title, childs }`.

| Параметр | Тип | Смысл |
|---|---|---|
| `choices` | `SelectChoice[]` | Обязательно. Элемент `{ val?, lbl, img?, disabled?, check? }` |
| `defaultValue` | `string \| number \| Array<string \| number>` | Начальный выбор |
| `allowNull` | `boolean` | Сброс |
| `multiple` | `boolean` | Несколько |
| `placeholder` | `string` | Плейсхолдер |
| `returnFormat` | `'value' \| 'label' \| 'array'` | Формат |
| `allowCustomChoices` | `boolean` | Свои варианты |
| `customChoiceButtonText` | `string` | Текст кнопки (дефолт `'Add'`) |
| `min` / `max` | `number` | Число выбранных при `multiple` |
| `search` | `boolean` | Фильтр списка |
| `searchPlaceholder` | `string` | Плейсхолдер поиска |
| `clearable` | `boolean` | Крестик очистки |
| `indexed` | `boolean` | Индекс Postgres (скаляр) |

```ts
color: {
  type: 'select',
  label: 'Цвет',
  allowNull: true,
  clearable: true,
  search: true,
  choices: [
    { val: 'red', lbl: 'Red' },
    { val: 'green', lbl: 'Green' },
    { type: 'group', title: 'Other', childs: [{ val: 'gray', lbl: 'Gray' }] },
  ],
  defaultValue: 'green',
}
```

<a id="SeparatorField"></a>
### SeparatorField — `type: 'separator'`

Черта. Layout-only. `label` опционален (текст на линии).

```ts
break: { type: 'separator', label: 'Дополнительно', columnWidth: 100 }
```

<a id="TabField"></a>
### TabField — `type: 'tab'`

Как аккордеон: layout-only, hoisting в родителя. Из базы: `position`, `columnWidth`, `conditionalLogic`.

| Параметр | Тип | Смысл |
|---|---|---|
| `placement` | `'top' \| 'left'` | В UI без `'left'` → `'top'` |
| `panels` | `{ label: string, subFields: Fields }[]` | Вкладки |

```ts
meta: {
  type: 'tab',
  placement: 'top',
  panels: [
    {
      label: 'Основное',
      subFields: {
        tab_title: { type: 'text', label: 'Title' },
      },
    },
    {
      label: 'Дополнительно',
      subFields: {
        tab_note: { type: 'textarea', label: 'Note' },
      },
    },
  ],
}
```

<a id="TextField"></a>
### TextField — `type: 'text'`

| Параметр | Тип | Смысл |
|---|---|---|
| `defaultValue` | `string` | Начальное |
| `maxLength` | `number` | Максимум символов |
| `placeholder` | `string` | Плейсхолдер |
| `prepend` / `append` | `string` | Слева / справа |
| `indexed` | `boolean` | Индекс Postgres |

```ts
headline: {
  type: 'text',
  label: 'Заголовок',
  required: true,
  maxLength: 120,
  placeholder: 'Title',
  indexed: true,
}
```

<a id="TextareaField"></a>
### TextareaField — `type: 'textarea'`

| Параметр | Тип | Смысл |
|---|---|---|
| `defaultValue` | `string` | Начальное |
| `maxLength` | `number` | Максимум символов |
| `rows` | `number` | Высота |
| `placeholder` | `string` | Плейсхолдер |
| `newLines` | `'autop' \| 'br' \| ''` | Переносы при выводе. Дефолт `''`. В форме сырой текст |
| `indexed` | `boolean` | Индекс Postgres |

```ts
excerpt: {
  type: 'textarea',
  label: 'Анонс',
  rows: 6,
  maxLength: 500,
  newLines: 'autop',
}
```

<a id="TimePickerField"></a>
### TimePickerField — `type: 'time_picker'`

Нет `firstDay` и `defaultToCurrentDate`.

| Параметр | Тип | Дефолт | Смысл |
|---|---|---|---|
| `displayFormat` | `string` | `HH:mm` | Как показать |
| `returnFormat` | `string` | `HH:mm` | Как сохранить |
| `indexed` | `boolean` | — | Индекс Postgres (`time`) |

```ts
opens: { type: 'time_picker', label: 'Открытие', displayFormat: 'HH:mm', returnFormat: 'HH:mm' }
```

<a id="TrueFalseField"></a>
### TrueFalseField — `type: 'true_false'`

| Параметр | Тип | Смысл |
|---|---|---|
| `defaultValue` | `boolean` | Начальное |
| `message` | `string` | Подпись рядом |
| `ui` | `boolean` | Switch вместо чекбокса |
| `uiOnText` / `uiOffText` | `string` | В UI без значения → `'Yes'` / `'No'` |
| `indexed` | `boolean` | Индекс Postgres (`boolean`) |

```ts
enabled: {
  type: 'true_false',
  label: 'Включено',
  message: 'Enable option',
  ui: true,
  uiOnText: 'On',
  uiOffText: 'Off',
  defaultValue: true,
}
```

<a id="UrlField"></a>
### UrlField — `type: 'url'`

Строка URL. Для title/target см. [LinkField](#LinkField).

| Параметр | Тип | Смысл |
|---|---|---|
| `defaultValue` | `string` | Начальное |
| `placeholder` | `string` | Плейсхолдер |
| `indexed` | `boolean` | Индекс Postgres |

```ts
homepage: { type: 'url', label: 'Сайт', placeholder: 'https://example.com' }
```

<a id="UserField"></a>
### UserField — `type: 'user'`

Пикер аккаунтов. В объект пароль не входит. `role` пустой или `'all'` — все пользователи.

| Параметр | Тип | Смысл |
|---|---|---|
| `role` | `'all' \| string \| string[]` | Фильтр ролей |
| `multiple` | `boolean` | Несколько |
| `allowNull` | `boolean` | Пусто |
| `returnFormat` | `'array' \| 'id'` | Объект или id. В UI без значения → объект |

```ts
editors: {
  type: 'user',
  label: 'Редакторы',
  role: 'all',
  multiple: true,
  allowNull: true,
  returnFormat: 'array',
}
```

<a id="WysiwygField"></a>
### WysiwygField — `type: 'wysiwyg'`

TipTap. Хранится HTML.

| Параметр | Тип | Смысл |
|---|---|---|
| `defaultValue` | `string` | HTML |
| `tabs` | `'all' \| 'visual' \| 'text'` | В UI без значения → `'all'` |
| `toolbar` | `'full' \| 'basic'` | В UI без `'basic'` → полный набор |
| `mediaUpload` | `boolean` | Есть в типе. Компонент не читает |
| `fontSize` | `string[]` | Иначе 8px…96px |
| `colorPalette` | `string[]` | Hex-палитра текста |

```ts
body: {
  type: 'wysiwyg',
  label: 'Текст',
  required: true,
  tabs: 'all',
  toolbar: 'full',
  columnWidth: 100,
}
```
