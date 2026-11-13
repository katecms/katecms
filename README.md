# KateCMS

`katecms` is the KateCMS Nuxt module. It adds an admin for entries (collections, dictionaries, blocks), media, and roles, and composables that read that content on the site.

Module config: the `katecms` key in `nuxt.config.ts`, field options, and addon sidebar tabs.

## Installation

From the Nuxt app directory:

```sh
pnpm add katecms
```

```sh
npm install katecms
```

```sh
yarn add katecms
```

In `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['katecms'],
})
```

The `katecms` keys are described in [setup](#config-setup).

<a id="app-shell"></a>
### App shell

`app/app.vue` has to render the current route:

```vue
<template>
  <NuxtPage />
</template>
```

KateCMS registers `/admin` and the screens under it (login, media, entries) with `extendPages`. That turns on Nuxt’s page router. `<NuxtPage />` is the outlet that mounts the matched route. The admin shell is the parent page for `/admin`; each child screen is rendered through the `<NuxtPage />` inside that shell.

A new Nuxt app ships `app/app.vue` with `<NuxtWelcome />` only. After the module is installed, `/` has no page file, so the router answers 404. `/admin` still shows the welcome screen, because that component stays in `app.vue` and the matched admin page is never mounted.

Put the site homepage in `app/pages/index.vue`. `<NuxtWelcome />` can live there if you still want the starter screen at `/`.

## Contents

- [Installation](#installation)
  - [App shell](#app-shell)
- [Module config](#config)
  - [Setup](#config-setup)
  - [`katecms` keys](#config-keys)
  - [Paths](#config-paths)
  - [Database](#config-database)
  - [Media](#config-media)
  - [Roles](#config-roles)
  - [Collections](#config-collections)
  - [Dictionaries](#config-dictionaries)
  - [Public composables](#frontend-composables)
    - [getCollection](#getCollection)
    - [getOptions](#getOptions)
    - [getQueryCollection](#getQueryCollection)
      - [dictionaryQuery](#getQueryCollection-dictionaryQuery)
      - [fieldsQuery](#getQueryCollection-fieldsQuery)
    - [getTerms](#getTerms)
  - [Example](#config-example)
- [Extension points](#extensions)
  - [Entry sidebar tabs](#extensions-entry-sidebar)
- [Shared field options](#fields-base)
- [Fields](#fields)
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
## Module config

Type: `KateCmsConfig`. Key in `nuxt.config.ts`: `katecms`. Module meta: `configKey: 'katecms'`.

<a id="config-setup"></a>
### Setup

```ts
export default defineNuxtConfig({
  modules: ['katecms'],
  katecms: {
    // ...
  },
})
```

<a id="config-keys"></a>
### `katecms` keys

| Key | Type | Default | Meaning |
|---|---|---|---|
| `adminPath` | `string` | `'admin'` | Admin URL segment |
| `loginPath` | `string` | `'login'` | Login segment, URL `/${adminPath}/login` |
| `registerPath` | `string` | `'register'` | Registration segment, URL `/${adminPath}/register` |
| `registration` | `boolean` | `false` | Self-registration. `true` opens it after the first user. `false` keeps it closed; the first account is still created as `owner`. Creating users in the admin does not depend on this flag |
| `collections` | `Collections` | `{}` | Entry types. Object key = slug |
| `dictionaries` | `Dictionaries` | `{}` | Dictionaries. Object key = slug |
| `blocks` | `Blocks` | `{}` | Block registry. Object key = slug |
| `database` | `DatabaseConfig` | SQLite `data/katecms.db` | Database |
| `media` | `MediaConfig` | see below | Uploads |
| `roles` | `Roles` | `{}` on top of the built-ins | Roles |

Paths are segments without a leading `/`. The admin is at `/${adminPath}`, login at `/${adminPath}/${loginPath}`, registration at `/${adminPath}/${registerPath}`.

Uploads always go to `<rootDir>/public/uploads` (the module sets `media.dir` itself).

<a id="config-paths"></a>
### Paths

```ts
katecms: {
  adminPath: 'admin',
  loginPath: 'login',
  registerPath: 'register',
}
```

<a id="config-database"></a>
### Database

```ts
interface DatabaseConfig {
  driver?: 'postgres' | 'sqlite'
  url?: string
  sqliteFilename?: string
}
```

| Field | Meaning |
|---|---|
| `driver` | Explicit engine. With no driver, a non-empty `url` selects Postgres, otherwise SQLite |
| `url` | Postgres connection string, for example `postgres://postgres:admin@127.0.0.1:5432/katecms` |
| `sqliteFilename` | SQLite file, `:memory:`, or a `file:` URI. A relative path is resolved from `rootDir`. Default `data/katecms.db` |

PostgreSQL **15+** is required. If `driver: 'postgres'` and `url` is empty, the adapter reads `DATABASE_URL`.

```ts
database: {
  driver: 'postgres',
  url: 'postgres://postgres:admin@127.0.0.1:5432/katecms',
}
```

<a id="config-media"></a>
### Media

| Field | Default | Meaning |
|---|---|---|
| `maxFileSize` | `10` | Limit in MB |
| `allowedMimeTypes` | jpeg, png, webp, gif, pdf, mp4 | An empty array rejects every file. Omit keeps the default list. `svg+xml` is not in the default; if you add it, the file is downloaded instead of opened as a page |
| `maxInputPixels` | `50_000_000` | Pixel budget for variants. A larger source is scaled down |
| `avif` | `false` | `true` or `{ quality: 1..100 }` (otherwise 80) |
| `webp` | `false` | Same |
| `imageSizes` | `[]` | Presets. The name `full` is reserved and ignored |

A preset has `name`, `width?`, `height?` (`0` means proportional to the other side), and `crop?` (`true` is cover, otherwise inside). Images are not enlarged past the source.

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
### Roles

Built-in roles: `owner`, `admin`, `editor`, `author`, `subscriber`. The `roles` map adds a role, fully replaces a built-in, or hides one (`author: false`). `subscriber` has no resource rights by default: the admin list, drafts, and collections with `public: false` are closed to that role. The front still serves published public entries without a login.

A user changes their own password only together with the current one. A role with `users: update` can set someone else's password, except an `owner` account. If the password is forgotten and nobody can sign in, on a server that can reach the database:

```bash
node scripts/reset-password.mjs --db data/katecms.db --email owner@example.com --password "New-password-123"
```

For Postgres, pass `--url` instead of `--db`. The script can change the owner password. There is no reset email.

- `owner` is reserved. A config entry is ignored.
- `admin` cannot be hidden (`admin: false` is ignored). A `Role` definition replaces its rights.

Rights: `true` / `false` / `['read', 'create', 'update', 'delete']`. `collections` and `dictionaries` also accept a map by slug. A missing resource means no access. `true` on a collection or scope means editing other people's entries; a list of actions means only one's own.

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
### Collections

The object key is the type slug (the `type` column).

| Field | Type | Default | Meaning |
|---|---|---|---|
| `labels.name` | `string` | — | Label, required |
| `labels.singularName` | `string` | `labels.name` | One entry |
| `icon` | `string` | default icon | Inline SVG in the menu |
| `hierarchical` | `boolean` | `false` | Tree via `parent_id` |
| `autosave` | `boolean` | `false` | Leaving a new unsaved entry stores it as `draft` |
| `public` | `boolean` | `true` | `false` disables the entry and archive pages, and hides View in the admin |
| `has_archive` | `boolean \| string` | `false` | Archive: `true` uses the rewrite prefix, a string is a custom slug |
| `perPage` | `number` | `10` | Entries per archive page, admin list, and `getQueryCollection` (one type). `-1` means all entries |
| `rewrite` | `string` | `/{slug}/%name%` | Public URL. The `%name%` placeholder is required |
| `fields` | `Fields` | `{}` | Entry fields. Key = field name |
| `blocks` | `string[] \| boolean` | `false` | `true` enables every block, an array is an allow-list, otherwise off |

A flat collection: `%name%` is one segment. `hierarchical: true` uses `parent/child`.

<a id="config-dictionaries"></a>
### Dictionaries

The object key is the dictionary slug.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `labels.name` | `string` | — | Required |
| `labels.singularName` | `string` | `labels.name` | One term |
| `icon` | `string` | default icon | Inline SVG |
| `fields` | `Fields` | `{}` | Term fields |
| `collections` | `string[]` | — | Required. Collection slugs this dictionary is attached to |
| `multiple` | `boolean` | `false` | Several terms on one entry |

The entry sidebar uses a join table. A `type: 'dictionary'` field stores its value in `fields` separately.

<a id="frontend-composables"></a>
### Public composables

Auto-imported by the module. Drafts are available only with `preview: true` (and the `collections:read` right). Collections with `public: false` are not served from the front.

<a id="getCollection"></a>
### getCollection()

The entry or archive for the current path (`rewrite` / `has_archive`).

| Option | Type | Default | Meaning |
|---|---|---|---|
| `path` | `string` | current URL | Public path |
| `preview` | `boolean` | `false` | Drafts when the caller has `collections:read`. Also `?preview=1` |
| `status` | `'published' \| 'draft' \| array` | `'published'` | Also `?status=`. `draft` without preview is ignored |
| `page` | `number` | `1` | Archive page. Also `?page=` |
| `perPage` | `number` | collection `perPage` | Archive page size. `-1` means all. Also `?perPage=` |

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

Values of an options page by the slug from config (`katecms.options`).

| Option | Type | Default | Meaning |
|---|---|---|---|
| `option` | `string` | — | Options page slug, required |

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

A filtered entry query. Defaults to `published`, sorted by date.

| Option | Type | Default | Meaning |
|---|---|---|---|
| `collection` | `'any' \| string \| string[]` | — | Type slug(s). `'any'` is every public collection |
| `preview` | `boolean` | `false` | Drafts when the caller has `collections:read` on every type. Also `?preview=1` |
| `status` | `'published' \| 'draft' \| array` | `'published'` | Also `?status=`. `draft` without preview is ignored |
| `page` | `number` | `1` | Page number. Also `?page=` |
| `perPage` | `number` | the type's `perPage`, or `10` | Page size. `-1` means all. Also `?perPage=` |
| `search` | `string` | — | Search in title and slug |
| `title` | `string \| string[]` | — | Exact title match |
| `slug` | `string \| string[]` | — | Entry slug |
| `slugs` | `string \| string[]` | — | Slug list |
| `includeIds` | `number \| number[]` | — | Only these ids |
| `excludeIds` | `number \| number[]` | — | Except these ids |
| `parentId` | `number \| null` | — | Parent. `null` / `0` is the root |
| `parentIds` | `number \| number[]` | — | Parent is in this list. `0` is the root |
| `excludeParentIds` | `number \| number[]` | — | Except these parents. `0` is the root |
| `authorIn` | `number[]` | — | Only entries by these authors |
| `authorNotIn` | `number[]` | — | Exclude entries by these authors |
| `dictionaryQuery` | `object` | — | Dictionary filter. [values](#getQueryCollection-dictionaryQuery) |
| `fieldsQuery` | `object` | — | Filter on the `fields` JSON. [values](#getQueryCollection-fieldsQuery) |
| `orderBy` | `string` | `'date'` | `date`, `modified`, `name`, `title`, `slug`, `id`, `menu_order`, `published_at`, `created_at`, `updated_at`, `includeIds` |
| `order` | `'asc' \| 'desc'` | depends on the field | Sort direction. For `includeIds`, the array order (`desc` reverses it) |

<a id="getQueryCollection-dictionaryQuery"></a>
#### dictionaryQuery

Links between an entry and a dictionary (`collection_dictionaries`). An empty or invalid `queries` list applies no filter.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `relation` | `'AND' \| 'OR'` | `'AND'` | How to combine `queries` items |
| `queries` | `object[]` | — | Conditions. With no valid items the filter is removed |

Each `queries[]` item:

| Field | Type | Default | Meaning |
|---|---|---|---|
| `dictionary` | `string` | — | Dictionary slug (`type`), required |
| `field` | `'id' \| 'name' \| 'slug'` | `'id'` | What `terms` matches. `name` is the dictionary row title |
| `terms` | `number \| string \| array` | — | id, title, or slug. Not used for `EXISTS` / `NOT EXISTS` |
| `operator` | see below | `'IN'` | How to match the found rows |
| `includeChildren` | `boolean` | `true` | Also include tree descendants. Not for `EXISTS` / `NOT EXISTS` |

`operator`:

| Value | Meaning |
|---|---|
| `IN` | The entry is linked to at least one of `terms` |
| `NOT IN` | The entry is linked to none of `terms` |
| `AND` | The entry is linked to **every** term in `terms` |
| `EXISTS` | Any link to this dictionary exists (`terms` is ignored) |
| `NOT EXISTS` | No links to this dictionary |

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

Reads the entry `fields` JSON, not `collection_meta`. An empty or invalid `queries` list applies no filter.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `relation` | `'AND' \| 'OR'` | `'AND'` | How to combine `queries` items |
| `queries` | `object[]` | — | Conditions. With no valid items the filter is removed |

Each `queries[]` item:

| Field | Type | Default | Meaning |
|---|---|---|---|
| `key` | `string \| string[]` | — | Key in `fields`. Required. A dotted path (`seo.title`) works only for `=` / `IN` |
| `compareKey` | see below | `=` or `IN` | How to match the key **name**. `IN` when `key` is an array |
| `value` | `string \| number \| boolean \| array` | — | Not used for `EXISTS` / `NOT EXISTS` |
| `compare` | see below | `=` or `IN` | Comparison operator. `IN` when `value` is an array |
| `type` | see below | `'TEXT'` | How the value is cast for comparison |

`compareKey` (key name):

| Value | Meaning |
|---|---|
| `=` | Exact name. One key |
| `IN` | Name is in the list |
| `!=` | Name is not equal. Root object keys only |
| `NOT IN` | Name is not in the list. Root keys only |
| `LIKE` / `NOT LIKE` | Substring of the name. Root keys only |
| `REGEXP` / `NOT REGEXP` | Regular expression on the name. Root keys only |

`compare`:

| Value | Meaning |
|---|---|
| `=` / `!=` | Equal / not equal |
| `>` / `>=` / `<` / `<=` | Numeric or text comparison |
| `LIKE` / `NOT LIKE` | Substring. `%` is not required |
| `ILIKE` / `NOT ILIKE` | Same, case-insensitive. PostgreSQL uses `ILIKE`, SQLite uses `LOWER()` |
| `IN` / `NOT IN` | Value is in the list. An empty `IN` matches nothing, an empty `NOT IN` matches every row |
| `BETWEEN` / `NOT BETWEEN` | Range: `value: [min, max]` |
| `EXISTS` / `NOT EXISTS` | The key is present or absent in `fields` (`value` is ignored) |
| `REGEXP` / `NOT REGEXP` | Regular expression on the value, without `/.../` |

`type`:

| Value | Meaning |
|---|---|
| `TEXT` | As a string |
| `INTEGER` | Integer |
| `NUMERIC` | Decimal number |
| `DATETIME` / `DATE` / `TIME` | As text (ISO strings compare lexicographically) |

`LIKE` / `REGEXP` / `!=` / `NOT IN` on the **key** walk only root keys (`json_each` / `jsonb_each_text`). Nested paths such as `seo.title` do not work there. `REGEXP` is POSIX `~` on PostgreSQL and JS `RegExp` on SQLite. D1 has no custom `REGEXP`. A JSON array in a field is compared as one text value, not element by element.

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

`orderBy: 'includeIds'` keeps the `includeIds` order:

```ts
const { entries } = await getQueryCollection({
  collection: 'page',
  includeIds: [5, 12, 2, 14, 7],
  orderBy: 'includeIds',
})
```

<a id="getTerms"></a>
### getTerms()

Dictionary rows. `count` is the number of published entries in public collections linked to the term. An empty term stays hidden until a descendant has entries.

| Option | Type | Default | Meaning |
|---|---|---|---|
| `dictionary` | `string \| string[]` | — | Dictionary slug, required |
| `perPage` | `number` | all | Page size. `-1` means all |
| `offset` | `number` | `0` | How many matches to skip |
| `includeIds` | `number \| number[]` | — | Only these ids. An empty list matches nothing |
| `excludeIds` | `number \| number[]` | — | Except these ids |
| `excludeTreeIds` | `number \| number[]` | — | Except these terms and all descendants |
| `parentId` | `number \| null` | — | Direct parent. `null` / `0` is the root |
| `childOf` | `number` | — | Every descendant of this id, not the id itself |
| `childless` | `boolean` | `false` | Skip terms that have children |
| `slug` | `string \| string[]` | — | Exact slug |
| `title` | `string \| string[]` | — | Exact title |
| `search` | `string` | — | Case-insensitive substring of title or slug |
| `hideEmpty` | `boolean` | `true` | Hide terms with `count = 0` |
| `hierarchical` | `boolean` | `true` | Keep an empty term when a descendant has entries |
| `padCounts` | `boolean` | `false` | Add descendant entries to `count` |
| `fieldsQuery` | `object` | — | Filter the `fields` JSON. [values](#getQueryCollection-fieldsQuery) |
| `orderBy` | `string` | `'title'` | `id`, `title`, `slug`, `count`, `parent`, `includeIds`, `slugs`, `field`, `none` |
| `orderByField` | `{ key, type? }` | — | Key for `orderBy: 'field'`. `type` is the same as in `fieldsQuery` |
| `order` | `'asc' \| 'desc'` | `'asc'` | Sort direction |
| `return` | `string` | `'all'` | `all` returns objects, or `ids`, `titles`, `count`, `idParent`, `idSlug`, `idTitle` |

`return: 'count'` is `total` before `perPage` and `offset`. The other modes page the rows, and `total` stays the full count. The `idParent` / `idSlug` / `idTitle` maps are in `map`, keyed by id as a string.

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
### Example

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
          body: { type: 'wysiwyg', label: 'Body', toolbar: 'full' },
          thumbnail: { type: 'image', label: 'Cover', position: 'sidebar' },
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

<a id="extensions"></a>
## Extension points

An addon is its own Nuxt module, registered next to `katecms`. Admin extension points are imported from `katecms/extensions`.

<a id="extensions-entry-sidebar"></a>
### Entry sidebar tabs

The entry form sidebar (`.katecms-collection-form__sidebar`) shows tabs once an addon has registered at least one. The first tab is **Page**: publishing, dictionaries, and fields with `position: 'sidebar'`. Addon tabs follow in registration order. The `page` key is taken by that tab.

Register a tab from a plugin. The component must already be on the Vue app. Calling again with the same `key` replaces the tab.

| Field | Type | Meaning |
|---|---|---|
| `key` | `string` | Stable id. Not `page` |
| `label` | `string` | Tab label |
| `component` | `string` | Component name on the app |

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

The tab panel mounts on first open and stays mounted when switching tabs. The Page tab also stays in the tree.

Add a menu item with `useKateCmsMenuItems()`. The panel under a dictionary term form is the component-name list in `useKateCmsTermPanels()`.

<a id="fields-base"></a>
## Shared field options

The `fields` map: **key = field name**, `type` is snake_case (`post_object`). PascalCase below is the component name (`KateCmsPostObjectField`).

| Field | Type | Default | Meaning |
|---|---|---|---|
| `label` | `string` | — | Label |
| `instructions` | `string` | — | Help text |
| `required` | `boolean` | `false` | On a collection entry the server checks this only when `status: 'published'` |
| `conditionalLogic` | `Condition[][]` | none | OR groups, AND inside a group |
| `position` | `'main' \| 'sidebar'` | `'main'` | Form column |
| `columnWidth` | `number` | — | Width in % |

No key, or `[]`, means the field is always visible. A hidden field is not checked as `required` and is not written into the saved values.

`Condition[][]`: the outer array is **OR** (one group is enough), the inner array is **AND** (every condition in the group). `field` is the key in `fields`, not the `label`.

```ts
tagline: {
  type: 'text',
  label: 'Tagline',
  // show when title === 'show'
  conditionalLogic: [
    [{ field: 'title', operator: 'equal', value: 'show' }],
  ],
},
seo_note: {
  type: 'message',
  label: 'SEO',
  // (status === 'draft' AND title is not empty) OR flag === true
  conditionalLogic: [
    [
      { field: 'status', operator: 'equal', value: 'draft' },
      { field: 'title', operator: 'notEmpty' },
    ],
    [{ field: 'flag', operator: 'equal', value: true }],
  ],
},
```

| Operator | `value` | True when |
|---|---|---|
| `empty` | not used | No value: `null` / `undefined`, `''`, `false`, `[]` |
| `notEmpty` | not used | The opposite of `empty` |
| `equal` | yes | Scalar: `String(field value) === String(value)` (case-sensitive). A selection array (multi-select and similar): contains `value` |
| `notEqual` | yes | The opposite of `equal` |
| `contains` | yes | A string contains the `value` substring. An array: the item is among the selected values |
| `notContains` | yes | The opposite of `contains` |
| `matches` | yes | `RegExp(value)` against the string value. An invalid pattern, or one longer than 200 characters, is false |
| `gt` | yes | Number: `Number(field value) > Number(value)`. Array: `length > Number(value)` |
| `lt` | yes | Same as `gt`, but less than |

`value` is cast to a string for `equal` / `contains` / `matches` (`true` → `'true'`). For `gt` / `lt` it is cast to a number.

Layout-only types (`tab`, `accordion`, `separator`, `message`) do not store a value under their own key. For `tab` / `accordion`, panel `subFields` are written flat onto the parent.

`indexed: true` (where the type allows it) is a scalar Postgres JSONB index. Nuxt creates and drops them at startup after migration. SQLite skips them. This does not work inside `repeater` / `flexible_content`.

Reserved keys inside rows: `fc_layout` (flexible content), `__katecmsCollapsed` (row collapse).

The field sections below do not repeat the shared options.

<a id="fields"></a>
## Fields

<a id="PostObjectField"></a>
### PostObjectField — `type: 'post_object'`

Select of collection entries.

| Option | Type | Meaning |
|---|---|---|
| `postType` | `string[]` | Collection slugs. Omit for every collection |
| `dictionary` | `string[]` | Only entries that have a term from these dictionaries |
| `allowNull` | `boolean` | Empty value |
| `multiple` | `boolean` | Several entries |
| `returnFormat` | `'object' \| 'id'` | Entry object or id. In the UI, no value means an object |

```ts
related: {
  type: 'post_object',
  label: 'Related',
  postType: ['pages', 'products'],
  multiple: true,
  allowNull: true,
  returnFormat: 'object',
}
```

<a id="PageLinkField"></a>
### PageLinkField — `type: 'page_link'`

Public URL of an entry (a string), not an object.

| Option | Type | Meaning |
|---|---|---|
| `postType` | `string[]` | Types in the picker |
| `dictionary` | `string[]` | Filter by dictionaries |
| `allowNull` | `boolean` | Empty |
| `multiple` | `boolean` | Several URLs |
| `allowArchives` | `boolean` | Collection archive items (only when the type has `has_archive`) |

```ts
cta: {
  type: 'page_link',
  label: 'Link',
  postType: ['pages'],
  multiple: true,
  allowArchives: true,
  allowNull: true,
}
```

<a id="RelationshipField"></a>
### RelationshipField — `type: 'relationship'`

Entry picker: search, filters, drag-and-drop order.

| Option | Type | Meaning |
|---|---|---|
| `postType` | `string[]` | Entry types |
| `dictionary` | `string[]` | Filter dictionaries. Omit for every dictionary in the public navigation |
| `min` / `max` | `number` | Limit on selected items |
| `filters` | `Array<'search' \| 'post_type' \| 'dictionary'>` | In the UI, no value means `['search']` |
| `elements` | `string[]` | Image or gallery field keys used as a preview, for example `['thumbnail']` |
| `returnFormat` | `'object' \| 'id'` | Same as `post_object` |

```ts
related: {
  type: 'relationship',
  label: 'Similar',
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

Terms of one dictionary. The value is stored in `fields`, not in the sidebar join.

| Option | Type | Meaning |
|---|---|---|
| `dictionary` | `string` | Dictionary slug, required |
| `fieldType` | `'checkbox' \| 'multi_select' \| 'radio' \| 'select'` | Control. The UI default is `'checkbox'` |
| `multiple` | `boolean` | For `select`. `checkbox` / `multi_select` are always multiple, `radio` is always one |
| `allowNull` | `boolean` | Empty |
| `returnFormat` | `'object' \| 'id'` | Term or id. In the UI, no value means an object |
| `addTerm` | `boolean` | Create a term when the user has the `create` right |

```ts
category: {
  type: 'dictionary',
  label: 'Category',
  dictionary: 'categories',
  fieldType: 'select',
  allowNull: true,
  addTerm: true,
  returnFormat: 'object',
}
```

<a id="MessageField"></a>
### MessageField — `type: 'message'`

Help text with no stored value (layout-only).

| Option | Type | Meaning |
|---|---|---|
| `message` | `string` | Text |
| `escHtml` | `boolean` | Escape HTML |
| `newLines` | `'autop' \| 'br' \| ''` | Line breaks |

The module has no `MessageField.vue`, so the field is not rendered in the admin until that component exists.

```ts
hint: {
  type: 'message',
  label: 'Hint',
  message: 'Fill in the block below.',
  escHtml: true,
  newLines: 'br',
}
```

<a id="AccordionField"></a>
### AccordionField — `type: 'accordion'`

UI only. From the database: `position`, `columnWidth`, `conditionalLogic`. Panel fields are written flat onto the parent. `subFields` keys must be unique in the form.

| Option | Type | Meaning |
|---|---|---|
| `open` | `number` | Index of the open panel, from `0`. In the UI, no number means `0` |
| `multiExpand` | `boolean` | Several panels open at once |
| `panels` | `{ label: string, subFields: Fields }[]` | Panels |

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

One choice, as buttons. `choices`: `{ value: label }`.

| Option | Type | Meaning |
|---|---|---|
| `choices` | `Record<string, string>` | Required |
| `defaultValue` | `string` | Initial choice |
| `allowNull` | `boolean` | Clear the choice |
| `returnFormat` | `'value' \| 'label' \| 'array'` | Key / label / `{ value, label }` |
| `layout` | `'horizontal' \| 'vertical'` | Layout |
| `indexed` | `boolean` | Postgres index |

```ts
tone: {
  type: 'button_group',
  label: 'Tone',
  layout: 'horizontal',
  choices: { light: 'Light', dark: 'Dark' },
  defaultValue: 'light',
  returnFormat: 'value',
}
```

<a id="CheckboxField"></a>
### CheckboxField — `type: 'checkbox'`

Several choices. `choices`: `{ value: label }`.

| Option | Type | Meaning |
|---|---|---|
| `choices` | `Record<string, string>` | Required |
| `defaultValue` | `string \| string[]` | Initial choice |
| `layout` | `'vertical' \| 'horizontal'` | Layout |
| `toggle` | `boolean` | “Select all”. Without `allowCustomChoices` the text is `customChoiceButtonText` or `'Select all'` |
| `returnFormat` | `'value' \| 'label' \| 'array'` | Format |
| `allowCustomChoices` | `boolean` | An “Other” field plus a button. The custom choice is added to the list and selected immediately |
| `customChoiceButtonText` | `string` | Add button (`'Add'`). Without `allowCustomChoices` this is the toggle label |

```ts
flags: {
  type: 'checkbox',
  label: 'Options',
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

| Option | Type | Meaning |
|---|---|---|
| `defaultValue` | `string` | Initial color |
| `enableOpacity` | `boolean` | Alpha |
| `returnFormat` | `'string' \| 'array'` | A string, or `{ hex, rgba, r, g, b, a }`. In the UI, no value means `'string'` |
| `paletteColors` | `string[]` | Palette |
| `showColorWheel` | `boolean` | Color wheel |
| `rgba` / `hsla` | `boolean` | RGBA / HSLA fields |
| `indexed` | `boolean` | Postgres index |

```ts
accent: {
  type: 'color_picker',
  label: 'Color',
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

Format tokens: `YYYY` `YY` `MM` `M` `DD` `D` `HH` `H` `mm` `m` `ss` `s`.

| Option | Type | Default | Meaning |
|---|---|---|---|
| `displayFormat` | `string` | `DD.MM.YYYY` | How to display |
| `returnFormat` | `string` | `YYYY-MM-DD` | How to store |
| `firstDay` | `number` | — | First day of the week (`1` = Monday) |
| `defaultToCurrentDate` | `boolean` | — | Fill in today |
| `indexed` | `boolean` | — | Postgres index (`date`) |

```ts
event_date: {
  type: 'date_picker',
  label: 'Date',
  displayFormat: 'DD.MM.YYYY',
  returnFormat: 'YYYY-MM-DD',
  firstDay: 1,
  defaultToCurrentDate: true,
}
```

<a id="DateTimePickerField"></a>
### DateTimePickerField — `type: 'date_time_picker'`

Same options as the date field. Defaults: display `DD.MM.YYYY HH:mm`, return `YYYY-MM-DD HH:mm`. Index: `timestamptz`.

```ts
starts_at: {
  type: 'date_time_picker',
  label: 'Start',
  displayFormat: 'DD.MM.YYYY HH:mm',
  returnFormat: 'YYYY-MM-DD HH:mm',
  firstDay: 1,
  defaultToCurrentDate: true,
}
```

<a id="EmailField"></a>
### EmailField — `type: 'email'`

| Option | Type | Meaning |
|---|---|---|
| `defaultValue` | `string` | Initial value |
| `placeholder` | `string` | Placeholder |
| `prepend` / `append` | `string` | Text on the left / right |
| `indexed` | `boolean` | Postgres index |

```ts
contact: {
  type: 'email',
  label: 'Email',
  placeholder: 'name@example.com',
  prepend: '@',
}
```

<a id="FileField"></a>
### FileField — `type: 'file'`

One file from the media library.

| Option | Type | Meaning |
|---|---|---|
| `returnFormat` | `'array' \| 'url' \| 'id'` | `MediaItem` / URL / id. In the UI, no value means `'array'` |
| `library` | `'all' \| 'uploadedTo'` | `'uploadedTo'` hides picking from the library |
| `minSize` / `maxSize` | `number` | File size |
| `mimeTypes` | `string` | MIME types or extensions, separated by comma or space |

The global limit is still `media.maxFileSize` and `media.allowedMimeTypes`.

```ts
attachment: {
  type: 'file',
  label: 'File',
  returnFormat: 'array',
  library: 'all',
  maxSize: 10,
  mimeTypes: 'application/pdf',
}
```

<a id="FlexibleContentField"></a>
### FlexibleContentField — `type: 'flexible_content'`

An array of blocks with different layouts. The layout name is stored on the row as `fc_layout`.

| Option | Type | Meaning |
|---|---|---|
| `min` | `number` | Soft limit (in the type: future validation; the UI does not add rows by itself) |
| `max` | `number` | Maximum blocks in the UI |
| `buttonLabel` | `string` | Button text |
| `previewPath` | `string` | Preview directory, relative to `public` |
| `layouts` | `Record<string, FlexibleLayout>` | Required |

`FlexibleLayout`: `label`, `preview?` (a file in `previewPath`, or a URL), `min?` (soft), `max?` (limit of this layout in the UI), `subFields`.

```ts
content: {
  type: 'flexible_content',
  label: 'Content',
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

Several images, with drag-and-drop.

| Option | Type | Meaning |
|---|---|---|
| `returnFormat` | `'array' \| 'url' \| 'id'` | Array of `MediaItem` / URL / id. In the UI, no value means `'array'` |
| `previewSize` | `string` | Variant name used for the preview |
| `insert` | `'append' \| 'prepend'` | In the UI, no value means `'append'` |
| `library` | `'all' \| 'uploadedTo'` | Same as `image` |
| `min` / `max` | `number` | Number of files |
| `minSize` / `maxSize` / `mimeTypes` | | Same as `file` |
| `minWidth` / `minHeight` / `maxWidth` / `maxHeight` | `number` | Image dimensions |

An empty form default is `[]`.

```ts
photos: {
  type: 'gallery',
  label: 'Gallery',
  returnFormat: 'array',
  insert: 'append',
  min: 1,
  max: 8,
}
```

<a id="GroupField"></a>
### GroupField — `type: 'group'`

A nested object. Scalars inside it can be indexed.

| Option | Type | Meaning |
|---|---|---|
| `subFields` | `Fields` | Nested fields |

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

One image, with an optional crop.

| Option | Type | Meaning |
|---|---|---|
| `returnFormat` | `'array' \| 'url' \| 'id'` | `MediaItem` / URL / id. In the UI, no value means `'array'` |
| `library` | `'all' \| 'uploadedTo'` | Same as `file` |
| `cropType` | `[number, number] \| boolean` | `true` enables crop; `[16, 9]` is the aspect ratio |
| `minSize` / `maxSize` / `mimeTypes` | | File limits. An empty `mimeTypes` means `image/*` |
| `minWidth` / `minHeight` / `maxWidth` / `maxHeight` | `number` | Dimensions |

```ts
thumbnail: {
  type: 'image',
  label: 'Cover',
  position: 'sidebar',
  returnFormat: 'array',
  cropType: [16, 9],
}
```

<a id="ImageSelectField"></a>
### ImageSelectField — `type: 'image_select'`

Choices with a preview: `{ key: { label, image } }`.

| Option | Type | Meaning |
|---|---|---|
| `choices` | `Record<string, { label: string, image: string }>` | Required. `image` is a URL |
| `defaultValue` | `string \| string[]` | Initial choice |
| `layout` | `'vertical' \| 'horizontal'` | Layout |
| `multiple` | `boolean` | Several |
| `allowNull` | `boolean` | Clear in single mode |
| `returnFormat` | `'value' \| 'label' \| 'array'` | Format |
| `width` / `height` | `number` | Preview size, px |

```ts
hero: {
  type: 'image_select',
  label: 'Layout',
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

Any URL (not the CMS picker).

| Option | Type | Meaning |
|---|---|---|
| `returnFormat` | `'array' \| 'url'` | `{ url, title, target }` or a string. Without `'url'` the value is an object |

```ts
btn: { type: 'link', label: 'Button', returnFormat: 'array' }
```

<a id="NumberField"></a>
### NumberField — `type: 'number'`

| Option | Type | Meaning |
|---|---|---|
| `defaultValue` | `number` | Initial value |
| `min` / `max` / `step` | `number` | Bounds and step |
| `placeholder` | `string` | Placeholder |
| `prepend` / `append` | `string` | Left / right |
| `indexed` | `boolean` | Postgres index (`numeric`) |

```ts
price: {
  type: 'number',
  label: 'Price',
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

Embed URL (YouTube and similar). Stored as a URL string.

| Option | Type | Meaning |
|---|---|---|
| `defaultValue` | `string` | URL |
| `width` / `height` | `number` | `maxwidth` / `maxheight` of the request |

```ts
video: {
  type: 'oembed',
  label: 'Video',
  width: 560,
  height: 315,
}
```

<a id="OpenStreetMapField"></a>
### OpenStreetMapField — `type: 'open_street_map'`

Leaflet + Nominatim. The value is an `OsmMarker`, an array, or `null`.

| Option | Type | Meaning |
|---|---|---|
| `height` | `number` | Map height, px |
| `centerLat` / `centerLng` | `string` | Center (strings) |
| `zoom` | `number` | Zoom |
| `multiple` | `boolean` | Several markers. The form default is then `[]` |

```ts
place: {
  type: 'open_street_map',
  label: 'Point',
  height: 360,
  centerLat: '55.751244',
  centerLng: '37.618423',
  zoom: 10,
  multiple: false,
}
```

<a id="PasswordField"></a>
### PasswordField — `type: 'password'`

An entry field, not the CMS user password. The type has no `indexed` or `defaultValue`.

| Option | Type | Meaning |
|---|---|---|
| `placeholder` | `string` | Placeholder |
| `prepend` / `append` | `string` | Left / right |

```ts
secret: { type: 'password', label: 'Secret', placeholder: 'Password' }
```

<a id="RadioField"></a>
### RadioField — `type: 'radio'`

One choice. `choices`: `{ value: label }`.

| Option | Type | Meaning |
|---|---|---|
| `choices` | `Record<string, string>` | Required |
| `defaultValue` | `string` | Initial choice |
| `layout` | `'vertical' \| 'horizontal'` | Layout |
| `allowNull` | `boolean` | Clear with a second click |
| `returnFormat` | `'value' \| 'label' \| 'array'` | Format |
| `indexed` | `boolean` | Postgres index |
| `allowCustomChoices` | `boolean` | An “Other” field plus a button. The custom choice is added to the list and selected |
| `customChoiceButtonText` | `string` | Add button (`'Add'`) |

```ts
align: {
  type: 'radio',
  label: 'Alignment',
  layout: 'vertical',
  allowNull: true,
  allowCustomChoices: true,
  choices: { left: 'Left', center: 'Center' },
  defaultValue: 'left',
}
```

<a id="RangeField"></a>
### RangeField — `type: 'range'`

| Option | Type | Meaning |
|---|---|---|
| `defaultValue` | `number` | Initial value |
| `min` / `max` / `step` | `number` | Bounds and step |
| `prepend` / `append` | `string` | Labels |
| `indexed` | `boolean` | Postgres index (`numeric`) |

```ts
volume: {
  type: 'range',
  label: 'Volume',
  defaultValue: 25,
  min: 0,
  max: 200,
  step: 5,
}
```

<a id="RepeaterField"></a>
### RepeaterField — `type: 'repeater'`

An array of identical rows. Repeaters can be nested. Postgres indexes are not built inside. An empty default is `[]`.

| Option | Type | Meaning |
|---|---|---|
| `min` / `max` | `number` | Number of rows |
| `buttonLabel` | `string` | Button text |
| `collapsed` | `string` | `subField` key used as the title of a collapsed row |
| `subFields` | `Fields` | Row fields |

```ts
items: {
  type: 'repeater',
  label: 'Items',
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

`choices` is an array, not a map. A group is `{ type: 'group', title, childs }`.

| Option | Type | Meaning |
|---|---|---|
| `choices` | `SelectChoice[]` | Required. An item is `{ val?, lbl, img?, disabled?, check? }` |
| `defaultValue` | `string \| number \| Array<string \| number>` | Initial choice |
| `allowNull` | `boolean` | Clear |
| `multiple` | `boolean` | Several |
| `placeholder` | `string` | Placeholder |
| `returnFormat` | `'value' \| 'label' \| 'array'` | Format |
| `allowCustomChoices` | `boolean` | Custom choices |
| `customChoiceButtonText` | `string` | Button text (default `'Add'`) |
| `min` / `max` | `number` | Number selected when `multiple` |
| `search` | `boolean` | Filter the list |
| `searchPlaceholder` | `string` | Search placeholder |
| `clearable` | `boolean` | Clear button |
| `indexed` | `boolean` | Postgres index (scalar) |

```ts
color: {
  type: 'select',
  label: 'Color',
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

A rule. Layout-only. `label` is optional (text on the line).

```ts
break: { type: 'separator', label: 'More', columnWidth: 100 }
```

<a id="TabField"></a>
### TabField — `type: 'tab'`

Like an accordion: layout-only, hoisted onto the parent. From the database: `position`, `columnWidth`, `conditionalLogic`.

| Option | Type | Meaning |
|---|---|---|
| `placement` | `'top' \| 'left'` | In the UI, anything other than `'left'` means `'top'` |
| `panels` | `{ label: string, subFields: Fields }[]` | Tabs |

```ts
meta: {
  type: 'tab',
  placement: 'top',
  panels: [
    {
      label: 'General',
      subFields: {
        tab_title: { type: 'text', label: 'Title' },
      },
    },
    {
      label: 'More',
      subFields: {
        tab_note: { type: 'textarea', label: 'Note' },
      },
    },
  ],
}
```

<a id="TextField"></a>
### TextField — `type: 'text'`

| Option | Type | Meaning |
|---|---|---|
| `defaultValue` | `string` | Initial value |
| `maxLength` | `number` | Maximum characters |
| `placeholder` | `string` | Placeholder |
| `prepend` / `append` | `string` | Left / right |
| `indexed` | `boolean` | Postgres index |

```ts
headline: {
  type: 'text',
  label: 'Headline',
  required: true,
  maxLength: 120,
  placeholder: 'Title',
  indexed: true,
}
```

<a id="TextareaField"></a>
### TextareaField — `type: 'textarea'`

| Option | Type | Meaning |
|---|---|---|
| `defaultValue` | `string` | Initial value |
| `maxLength` | `number` | Maximum characters |
| `rows` | `number` | Height |
| `placeholder` | `string` | Placeholder |
| `newLines` | `'autop' \| 'br' \| ''` | Line breaks on output. Default `''`. The form stores raw text |
| `indexed` | `boolean` | Postgres index |

```ts
excerpt: {
  type: 'textarea',
  label: 'Excerpt',
  rows: 6,
  maxLength: 500,
  newLines: 'autop',
}
```

<a id="TimePickerField"></a>
### TimePickerField — `type: 'time_picker'`

There is no `firstDay` or `defaultToCurrentDate`.

| Option | Type | Default | Meaning |
|---|---|---|---|
| `displayFormat` | `string` | `HH:mm` | How to display |
| `returnFormat` | `string` | `HH:mm` | How to store |
| `indexed` | `boolean` | — | Postgres index (`time`) |

```ts
opens: { type: 'time_picker', label: 'Opens', displayFormat: 'HH:mm', returnFormat: 'HH:mm' }
```

<a id="TrueFalseField"></a>
### TrueFalseField — `type: 'true_false'`

| Option | Type | Meaning |
|---|---|---|
| `defaultValue` | `boolean` | Initial value |
| `message` | `string` | Label beside the control |
| `ui` | `boolean` | Switch instead of a checkbox |
| `uiOnText` / `uiOffText` | `string` | In the UI, no value means `'Yes'` / `'No'` |
| `indexed` | `boolean` | Postgres index (`boolean`) |

```ts
enabled: {
  type: 'true_false',
  label: 'Enabled',
  message: 'Enable option',
  ui: true,
  uiOnText: 'On',
  uiOffText: 'Off',
  defaultValue: true,
}
```

<a id="UrlField"></a>
### UrlField — `type: 'url'`

A URL string. For title and target, see [LinkField](#LinkField).

| Option | Type | Meaning |
|---|---|---|
| `defaultValue` | `string` | Initial value |
| `placeholder` | `string` | Placeholder |
| `indexed` | `boolean` | Postgres index |

```ts
homepage: { type: 'url', label: 'Website', placeholder: 'https://example.com' }
```

<a id="UserField"></a>
### UserField — `type: 'user'`

Account picker. The object does not include the password. An empty `role`, or `'all'`, means every user.

| Option | Type | Meaning |
|---|---|---|
| `role` | `'all' \| string \| string[]` | Role filter |
| `multiple` | `boolean` | Several |
| `allowNull` | `boolean` | Empty |
| `returnFormat` | `'array' \| 'id'` | Object or id. In the UI, no value means an object |

```ts
editors: {
  type: 'user',
  label: 'Editors',
  role: 'all',
  multiple: true,
  allowNull: true,
  returnFormat: 'array',
}
```

<a id="WysiwygField"></a>
### WysiwygField — `type: 'wysiwyg'`

TipTap. Stored as HTML.

| Option | Type | Meaning |
|---|---|---|
| `defaultValue` | `string` | HTML |
| `tabs` | `'all' \| 'visual' \| 'text'` | In the UI, no value means `'all'` |
| `toolbar` | `'full' \| 'basic'` | In the UI, anything other than `'basic'` means the full set |
| `mediaUpload` | `boolean` | Present on the type. The component does not read it |
| `fontSize` | `string[]` | Otherwise 8px…96px |
| `colorPalette` | `string[]` | Text hex palette |

```ts
body: {
  type: 'wysiwyg',
  label: 'Body',
  required: true,
  tabs: 'all',
  toolbar: 'full',
  columnWidth: 100,
}
```
