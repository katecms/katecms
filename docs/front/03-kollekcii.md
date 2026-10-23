# Коллекции

Ключ `miraicms.collections` — карта `CollectionDefinition`. Ключ объекта (`pages`) хранится в колонке `collections.type`. Это тип записей. Строка таблицы `collections` — одна запись этого типа.

Тип: `packages/core/src/config/types/collection.ts`.

| Поле | Тип | Дефолт | Смысл |
| --- | --- | --- | --- |
| `labels.name` | `string` | — | Подпись в меню, обязательно |
| `labels.singularName` | `string` | `labels.name` | Одна запись |
| `icon` | `string` | иконка модуля | Inline SVG в меню. Пустая или не-SVG строка заменяется дефолтом на стороне меню |
| `hierarchical` | `boolean` | `false` | Дерево через `parent_id`. В URL `%name%` может быть `parent/child` |
| `autosave` | `boolean` | `false` | Уход с **новой** несохранённой записи пишет `draft`. Уже сохранённые записи спрашивают подтверждение |
| `revisions` | `boolean` | включено, пока не задано `false` | Снимок при создании и изменении и вкладка Revisions в редакторе |
| `public` | `boolean` | `true` | `false`: пункт в админке остаётся, публичные URL записи и архива не резолвятся, ссылка View скрыта. `getCollection` / `getQueryCollection` такую коллекцию не отдают |
| `has_archive` | `boolean \| string` | `false` | `true` — архив по префиксу rewrite (`/inf/%name%` → `/inf`). Строка — свой путь (`'typepage'` → `/typepage`) |
| `perPage` | `number` | `10` | Страница архива, список в админке и `getQueryCollection` по одному типу. `-1` — все записи. Неположительное целое, кроме `-1`, откатывается к 10 |
| `rewrite` | `string` | `/{slug}/%name%` | Публичный URL. Обязателен плейсхолдер `%name%` |
| `fields` | `Fields` | `{}` | Поля записи. Ключ карты = имя поля в JSON `fields` |
| `blocks` | `string[] \| boolean` | `false` | Allow-list slug из `miraicms.blocks`, `true` — все зарегистрированные, иначе блоки выключены |

Плоская коллекция: `%name%` — один сегмент (`about`). Иерархическая: путь предков (`parent/child`).

Статусы записи: `published`, `draft`, `trash`. Корзина в публичных выборках не участвует. При первом переходе в `published`, если `published_at` ещё пуст, ядро подставляет текущее время. Повторная публикация дату не затирает.

Уникальность slug — среди соседей с тем же `type` и `parent_id`.

## Пример

```ts
collections: {
  pages: {
    labels: { name: 'Pages', singularName: 'Page' },
    hierarchical: true,
    autosave: true,
    revisions: true,
    public: true,
    rewrite: '/inf/%name%',
    has_archive: true,
    perPage: 30,
    fields: {
      body: { type: 'wysiwyg', label: 'Text', toolbar: 'full' },
      thumbnail: { type: 'image', label: 'Cover', position: 'sidebar' },
    },
  },
}
```

Запись с slug `about` и родителем со slug `parent` получит путь `/inf/parent/about`. Архив при `has_archive: true` — `/inf`.

## Что видит страница сайта

Composable возвращает запись как `AdminEntry`:

| Поле | Смысл |
| --- | --- |
| `id`, `type`, `status` | Идентификатор, slug коллекции, статус |
| `slug`, `slugPath` | Сегмент и полный путь предков |
| `title` | Заголовок |
| `fields` | JSON по схеме `fields` |
| `parentId`, `menuOrder`, `authorId` | Дерево, порядок, автор |
| `authorName` | Имя или email, если известно |
| `createdAt`, `updatedAt`, `publishedAt` | ISO-строки |
| `dictionaries` | На публичном resolve: термины по slug словаря |
| `dictionaryIds` | В админке: id терминов по slug словаря |
| `canUpdate`, `canDelete` | Флаги для текущего пользователя админки |

Публичный URL собирается `permalink(entry)` из `rewrite` коллекции и `slugPath`.

## Ревизии

При `revisions`, отличном от `false`, сохранение кладёт снимок в `collection_revisions`. Список и откат — вкладка редактора. Строка ревизии не редактируется: откат пишет новые значения в запись и создаёт следующий снимок.

## Админские URL

Их регистрирует модуль, хост их не описывает в `pages/`:

- `/${adminPath}/collections/:collection` — список
- `/${adminPath}/collections/:collection/create` — создание
- `/${adminPath}/collections/:collection/:id` — редактор

Поля с `position: 'sidebar'` и словари, привязанные к коллекции, сидят на вкладке Page сайдбара.
