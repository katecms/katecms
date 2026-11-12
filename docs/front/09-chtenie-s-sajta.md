# Чтение данных на сайте

Четыре функции модуль добавляет в автоимпорт. Они ходят на сервер через `useRequestFetch` и `useAsyncData`, поэтому их вызывают наверху `<script setup>` со `await`. Черновики попадают в ответ только вместе с `preview` и правом `collections: read` на затронутые типы. Коллекции с `public: false` с фронта не отдаются.

Query-параметры страницы, которые composable подхватывают сами, если опция их не задала: `?preview=1`, `?status=`, `?page=`, `?perPage=`.

## `getCollection(options?)`

Запись, архив или термин по публичному пути (`rewrite` / `has_archive` / rewrite словаря).

| Опция | Тип | Дефолт | Смысл |
| --- | --- | --- | --- |
| `path` | `string` | текущий маршрут | Публичный путь. Из `route.params.slug`, если это catch-all, иначе `route.path` без хвостового `/` |
| `preview` | `boolean` | `false` | Черновики при праве чтения. Также `?preview=1` |
| `status` | `'published' \| 'draft' \| array` | `published` | `draft` без preview отбрасывается |
| `page` | `number` | `1` | Страница архива |
| `perPage` | `number` | `perPage` коллекции | `-1` — все записи архива |

Если путь не совпал ни с записью, ни с архивом, ни с термином, функция возвращает **пустой массив**, не объект и не ошибку Nuxt. Страница хоста проверяет это так же, как `playground/pages/[...slug].vue`: `Array.isArray(data)` значит «страницы CMS нет».

Успешный результат — объект computed-полей:

| Поле | Смысл |
| --- | --- |
| `kind` | `'entry'`, `'archive'` или `'term'` |
| `isArchive`, `isTerm` | Режим страницы |
| `entry` | Запись или `null` |
| `term` | Термин или `null` |
| `termPath` | Путь термина |
| `entries` | Список архива или записей термина |
| `collection` | Мета коллекции (`slug`, подписи, `rewrite`, `public`, `perPage`, …) или `null` у термина |
| `link` | Канонический путь текущей страницы |
| `permalink(item)` | Путь записи архива. `null`, если коллекция не публичная |
| `preview` | Сервер реально разрешил непубличные статусы |
| `page`, `perPage`, `total` | Пагинация архива. У записи `page` = 1, `total` = 0 |
| `pending`, `error`, `refresh`, `path` | Состояние `useAsyncData` и разрешённый путь |

Вызов для **текущего** маршрута (свой `path` не передан или совпадает с адресом страницы) один раз на экземпляр компонента шлёт хук `katecms:collection`. Дополнение SEO вешает на него `useMiraiSeoHead`. Свой плагин может сделать то же:

```ts
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('katecms:collection', (page) => {
    // page.entry, page.term, page.isArchive, page.link — computed
  })
})
```

В хук уходят `isArchive`, `isTerm`, `entry`, `term`, `collection`, `link`.

## `getQueryCollection(options)`

Выборка записей. `collection` обязателен: slug, массив slug или `'any'` (все публичные).

По умолчанию статус `published`, сортировка по дате.

| Опция | Смысл |
| --- | --- |
| `collection` | Тип или типы. `'any'` — все публичные |
| `preview`, `status` | Как у `getCollection`. Preview требует `collections: read` на каждый запрошенный тип |
| `page`, `perPage` | Страница. Для одного типа дефолт размера — `perPage` коллекции, иначе 10. `-1` — все |
| `search` | Подстрока title/slug |
| `title` | Точное совпадение заголовка |
| `slug`, `slugs` | Слаги записи, склеиваются |
| `includeIds`, `excludeIds` | Белый и чёрный список id |
| `parentId` | Родитель. `null` / `0` — корень |
| `parentIds` | Родитель из списка. `0` — корень. Склеивается с `parentId` |
| `excludeParentIds` | Кроме этих родителей |
| `authorIn`, `authorNotIn` | Авторы |
| `dictionaryQuery` | Фильтр join `collection_dictionaries` |
| `fieldsQuery` | Фильтр JSON `fields` |
| `orderBy` | `date`, `modified`, `name`, `title`, `slug`, `id`, `menu_order`, `published_at`, `created_at`, `updated_at`, `includeIds` |
| `order` | `asc` или `desc`. Для `includeIds` порядок массива, `desc` его разворачивает |

`date` сортирует по `published_at`, `modified` — по `updated_at`, `name` — по `slug`.

Ответ: `entries`, `collections` (мета затронутых типов), `permalink(item)`, `preview`, `page`, `perPage`, `total`, `pending`, `error`, `refresh`.

Пустой массив в фильтре, который передан как опция (`includeIds: []`, `title: []`), уходит на сервер как пустая строка и означает «ничего не выбрано», а не «фильтр снят». Чтобы снять фильтр, опцию не передают.

### `dictionaryQuery`

```ts
dictionaryQuery: {
  relation: 'AND', // или 'OR'
  queries: [
    {
      dictionary: 'categories',
      field: 'slug', // 'id' | 'name' | 'slug', дефолт id. name — заголовок термина
      terms: 'news',
      operator: 'IN', // IN | NOT IN | AND | EXISTS | NOT EXISTS
      includeChildren: true,
    },
  ],
}
```

Пустой или невалидный `queries` фильтр не включает. `IN` — хотя бы один термин, `AND` — все перечисленные, `EXISTS` / `NOT EXISTS` не смотрят на `terms`. `includeChildren` добавляет потомков дерева и для `EXISTS` не используется.

### `fieldsQuery`

Смотрит JSON `fields` записи или термина, не `collection_meta`.

```ts
fieldsQuery: {
  relation: 'AND',
  queries: [
    { key: 'color', value: 'red' },
    { key: 'price', compare: '>=', value: 10, type: 'NUMERIC' },
    { key: ['seo.title'], compareKey: '=', value: 'Hi' },
  ],
}
```

| Поле элемента | Смысл |
| --- | --- |
| `key` | Ключ или список ключей. Точечный путь только для `=` / `IN` |
| `compareKey` | Как сопоставлять **имя** ключа: `=`, `IN`, `!=`, `NOT IN`, `LIKE`, `NOT LIKE`, `REGEXP`, `NOT REGEXP`. Дефолт `=` или `IN`, если `key` — массив. Операторы кроме `=` / `IN` обходят только корневые ключи |
| `value` | Не нужен для `EXISTS` / `NOT EXISTS` |
| `compare` | `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`, `NOT LIKE`, `ILIKE`, `NOT ILIKE`, `IN`, `NOT IN`, `BETWEEN`, `NOT BETWEEN`, `EXISTS`, `NOT EXISTS`, `REGEXP`, `NOT REGEXP`. Дефолт `=` или `IN`, если `value` — массив |
| `type` | `TEXT`, `INTEGER`, `NUMERIC`, `DATETIME`, `DATE`, `TIME`. Даты сравниваются как текст |

`LIKE` не требует `%`. `ILIKE` на Postgres — `ILIKE`, на SQLite — `LOWER()`. Пустой `IN` не совпадает ни с чем, пустой `NOT IN` пропускает все строки. `BETWEEN` ждёт `value: [min, max]`. `REGEXP` без слэшей: Postgres — POSIX `~`, SQLite — JS `RegExp`. JSON-массив в ячейке сравнивается целиком как текст.

## `getTerms(options)`

`dictionary` обязателен: slug или массив.

`count` термина — число опубликованных записей публичных коллекций, связанных с ним. `hideEmpty` по умолчанию `true`. `hierarchical` по умолчанию `true` и оставляет пустой термин, если у потомка есть записи. `padCounts` прибавляет к `count` записи потомков.

| Опция | Дефолт | Смысл |
| --- | --- | --- |
| `perPage` | все | `-1` тоже все |
| `offset` | `0` | Сколько совпадений пропустить |
| `includeIds`, `excludeIds` | — | Id. Пустой `includeIds` — пустой результат |
| `excludeTreeIds` | — | Термин и все потомки |
| `parentId` | — | Прямой родитель. `null` / `0` — корень |
| `childOf` | — | Все потомки id, без него самого |
| `childless` | `false` | Убрать термины, у которых есть дети |
| `slug`, `title` | — | Точное совпадение |
| `search` | — | Подстрока title или slug, без регистра |
| `fieldsQuery` | — | Тот же формат, что у записей |
| `orderBy` | `title` | `id`, `title`, `slug`, `count`, `parent`, `includeIds`, `slugs`, `field`, `none` |
| `orderByField` | — | `{ key, type? }` при `orderBy: 'field'` |
| `order` | `asc` | Направление |
| `return` | `all` | `all`, `ids`, `titles`, `count`, `idParent`, `idSlug`, `idTitle` |

`return: 'count'` кладёт число в `total` до нарезки `perPage` / `offset`. Остальные режимы режут страницу, `total` остаётся полным. Карты `idParent` / `idSlug` / `idTitle` лежат в `map`, ключ — id строкой. Ответ: `terms`, `ids`, `titles`, `map`, `total`, `pending`, `error`, `refresh`.

## `getOptions({ option })`

`option` — slug страницы из `katecms.options`. Ответ: `slug`, `values` (объект полей или `{}`), `pending`, `error`, `refresh`, `option`.

Права на чтение опций для этой функции не требуются: страница сайта получает сохранённый JSON. Запись по-прежнему закрыта правом `options` в админке.
