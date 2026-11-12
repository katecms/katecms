# Словари

Ключ `katecms.dictionaries` — карта `DictionaryDefinition`. Ключ объекта (`categories`) хранится в `dictionaries.type`. Строка таблицы — один термин.

Тип: `packages/core/src/config/types/dictionary.ts`.

| Поле | Тип | Дефолт | Смысл |
| --- | --- | --- | --- |
| `labels.name` | `string` | — | Подпись, обязательно |
| `labels.singularName` | `string` | `labels.name` | Один термин |
| `icon` | `string` | дефолтная иконка | Inline SVG меню |
| `fields` | `Fields` | `{}` | Поля термина, JSON `dictionaries.fields` |
| `hierarchical` | `boolean` | `false` | Дерево терминов через `parent_id` |
| `public` | `boolean` | `true` | `false`: словарь остаётся в админке, публичный URL термина не резолвится, View скрыт |
| `rewrite` | `string` | — | ЧПУ термина. `%name%` — slug или `parent/child` для иерархии. Пример: `/categories/%name%` |
| `collections` | `string[]` | — | Обязательно. Slug коллекций, к которым словарь привязан |
| `multiple` | `boolean` | `false` | Несколько терминов этого словаря на одну запись. В join-таблице несколько строк и так возможны; флаг применяет адаптер |

Связь запись ↔ термин лежит в `collection_dictionaries`. Её редактирует сайдбар записи. Поле `type: 'dictionary'` внутри `fields` — отдельное значение в JSON записи, не эта связь.

## Два способа привязать термин

1. Сайдбар коллекции. Словарь перечислен в `collections` определения. Редактор показывает пикер. На публичной записи термины приходят в `entry.dictionaries[slug]`.
2. Поле `dictionary` в схеме `fields`. Значение хранится в JSON поля. Параметр `dictionary` — slug словаря. Формат возврата `object` или `id`.

Фильтры `getQueryCollection({ dictionaryQuery })` смотрят на join сайдбара, не на JSON поля `dictionary`.

## Публичная страница термина

Если у словаря задан `rewrite` и `public` не выключен, `getCollection()` на этом пути возвращает `isTerm: true`:

- `term` — термин (`id`, `type`, `slug`, `slugPath`, `title`, `fields`, `parentId`);
- `entries` — связанные опубликованные записи публичных коллекций (`id`, `title`, `path`);
- `link` и `termPath` — публичный путь термина;
- `entry` и `collection` в этом режиме пустые.

`getTerms()` читает строки словаря отдельно от текущего URL: фильтры, дерево, `count` опубликованных записей. Подробности — в [чтении данных](09-chtenie-s-sajta.md).

## Пример

```ts
dictionaries: {
  categories: {
    labels: { name: 'Categories', singularName: 'Category' },
    hierarchical: true,
    public: true,
    rewrite: '/categories/%name%',
    multiple: true,
    collections: ['pages'],
    fields: {
      color: { type: 'color_picker', label: 'Color' },
    },
  },
}
```

Админка: `/${adminPath}/dictionaries/:dictionary` и `/${adminPath}/dictionaries/:dictionary/:id`.
