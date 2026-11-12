# Поля

Карта `fields` пишется в конфиге коллекции, словаря, страницы опций или блока. Ключ объекта — имя поля в сохранённом JSON. `type` — snake_case (`image_select`). Компонент админки называется PascalCase + `Field` (`ImageSelectField`), тег внутри модуля — `KateCmsImageSelectField`. Хост этот тег в своих страницах не использует: он описывает поле объектом конфига.

Источник типов: `packages/core/src/config/types/fields.ts`.

На странице опций то же объединение `Field`, но без ключа `position`.

## Общие ключи

`BaseField`:

| Ключ | Тип | Дефолт | Смысл |
| --- | --- | --- | --- |
| `label` | `string` | — | Подпись |
| `instructions` | `string` | — | Подсказка под полем |
| `required` | `boolean` | `false` | У записи коллекции сервер проверяет только при `status: 'published'` |
| `conditionalLogic` | `Condition[][]` | нет | Внешний массив — OR, внутренний — AND |
| `position` | `'main' \| 'sidebar'` | `'main'` | Колонка формы записи. У опций ключа нет |
| `columnWidth` | `number` | — | Ширина в процентах |

Нет ключа или `[]` в `conditionalLogic` — поле всегда видно. Скрытое поле не проверяется как `required` и не пишется в сохранённые значения.

`field` в условии — ключ соседнего поля, не `label`.

| Оператор | `value` | Когда истинно |
| --- | --- | --- |
| `empty` | не нужен | `null` / `undefined`, `''`, `false`, `[]` |
| `notEmpty` | не нужен | Обратное |
| `equal` | да | Скаляр: строки совпадают с учётом регистра. Массив выбора содержит `value` |
| `notEqual` | да | Обратное `equal` |
| `contains` | да | Подстрока или элемент массива |
| `notContains` | да | Обратное |
| `matches` | да | `RegExp` по строке. Невалидный паттерн или длиннее 200 символов — ложь |
| `gt` / `lt` | да | Число, либо длина массива |

Набор операторов по типу поля ограничивает `FIELD_OPERATORS` / `isOperatorAllowed`.

Layout-only типы `tab`, `accordion`, `separator`, `message` не хранят значение под своим ключом. У `tab` и `accordion` поля панелей пишутся плоско в родителя. Ключи `subFields` уникальны в пределах формы.

`indexed: true` там, где ключ есть в типе, просит скалярный индекс Postgres по JSONB. Nuxt создаёт и снимает такие индексы при старте после миграции. SQLite индексы пропускает. Внутри `repeater` и `flexible_content` индекс не строится.

Зарезервированные ключи в строках: `fc_layout` (имя раскладки flexible content), `__katecmsCollapsed` (свёртка ряда).

Типы, у которых есть `indexed`: `text`, `textarea`, `number`, `range`, `email`, `url`, `select`, `radio`, `button_group`, `true_false`, `date_picker`, `date_time_picker`, `time_picker`, `color_picker`.

## Скаляры

### `text`

`defaultValue`, `maxLength`, `placeholder`, `prepend`, `append`, `indexed`.

### `textarea`

`defaultValue`, `maxLength`, `rows`, `placeholder`, `newLines` (`'autop' | 'br' | ''`, дефолт пустая строка), `indexed`. `newLines` влияет на вывод через `autop` / `nl2br`, в форме хранится сырой текст.

### `number`

`defaultValue`, `min`, `max`, `step`, `placeholder`, `prepend`, `append`, `indexed` (cast `numeric`).

### `range`

`defaultValue`, `min`, `max`, `step`, `prepend`, `append`, `indexed`.

### `email`

`defaultValue`, `placeholder`, `prepend`, `append`, `indexed`.

### `url`

Строка URL. `defaultValue`, `placeholder`, `indexed`. Подпись и `target` — у `link`.

### `password`

Поле записи, не пароль пользователя CMS. `placeholder`, `prepend`, `append`. `indexed` и `defaultValue` в типе нет.

### `true_false`

`defaultValue?: boolean`, `message`, `ui` (switch), `uiOnText`, `uiOffText` (в UI без текста — `Yes` / `No`), `indexed` (`boolean`).

## Выбор

`returnFormat` у choice-полей: `'value'` (ключ), `'label'`, `'array'` (`{ value, label }`).

### `button_group`

Один выбор кнопками. `choices: Record<string, string>` обязательно. `defaultValue`, `allowNull`, `returnFormat`, `layout: 'horizontal' | 'vertical'`, `indexed`.

### `checkbox`

Несколько. `choices` обязательно. `defaultValue` строка или массив, `layout: 'vertical' | 'horizontal'`, `toggle` («выбрать все»; без `allowCustomChoices` подпись кнопки — `customChoiceButtonText` или `Select all`), `returnFormat`, `allowCustomChoices`, `customChoiceButtonText`.

### `radio`

Один вариант. `choices` обязательно. `defaultValue`, `layout`, `allowNull` (повторный клик снимает), `returnFormat`, `indexed`, `allowCustomChoices`, `customChoiceButtonText`.

### `image_select`

`choices: Record<string, { label, image }>`, `image` — URL. `defaultValue`, `layout`, `multiple`, `allowNull`, `returnFormat`, `width`, `height` (превью, px).

### `select`

`choices` — массив, не карта. Элемент `{ val?, lbl, img?, disabled?, check? }`. Группа `{ type: 'group', title, disabled?, childs }`.

`defaultValue`, `allowNull`, `multiple`, `placeholder`, `returnFormat`, `allowCustomChoices`, `customChoiceButtonText` (дефолт текста кнопки `Add`), `min`, `max` при `multiple`, `search`, `searchPlaceholder`, `clearable`, `indexed` для скаляра.

## Контент и медиа

Общие ограничения файла: `minSize`, `maxSize`, `mimeTypes` (MIME или расширения через запятую или пробел). У картинок ещё `minWidth`, `minHeight`, `maxWidth`, `maxHeight`. Глобальные `media.maxFileSize` и `media.allowedMimeTypes` остаются в силе.

`returnFormat` медиа: `'array'` — объект медиа (`MediaItem`), `'url'`, `'id'`. В UI без значения виджет берёт объект.

`library`: `'all'` или `'uploadedTo'` (выбор из библиотеки скрыт).

### `wysiwyg`

Хранится HTML. TipTap. `defaultValue`, `tabs: 'all' | 'visual' | 'text'` (без значения — `all`), `toolbar: 'full' | 'basic'` (без `basic` — полный набор), `mediaUpload` (есть в типе; виджет его не читает), `fontSize` (иначе 8px…96px), `colorPalette`.

### `oembed`

Хранится строка URL. `defaultValue`, `width`, `height` уходят в запрос oEmbed как maxwidth/maxheight. Провайдеры: известные хосты (YouTube, Vimeo, Twitter/X, SoundCloud, Flickr), иначе `<link rel="alternate">` со страницы.

### `image`

`returnFormat`, `library`, `cropType` (`true` или пара `[16, 9]`), ограничения файла и пикселей, `iconMode` (кнопка без подписи Add Image). Пустой `mimeTypes` в виджете сужается к `image/*`.

### `file`

Один файл. `returnFormat`, `library`, ограничения размера и MIME.

### `gallery`

Массив. `returnFormat`, `previewSize` (имя варианта), `insert: 'append' | 'prepend'` (без значения — append), `library`, `min`, `max`, ограничения файла и пикселей. Пустой дефолт формы — `[]`.

### `link`

Произвольный URL, не пикер записей. `returnFormat: 'array' | 'url'`. Без `'url'` хранится `{ url, title, target }`.

### `color_picker`

`defaultValue`, `enableOpacity`, `returnFormat: 'string' | 'array'` (без значения — строка). Объект: `{ hex, rgba, r, g, b, a }`. `paletteColors`, `showColorWheel`, `rgba`, `hsla`, `indexed`.

### `open_street_map`

Leaflet и Nominatim. Значение: `OsmMarker`, массив или `null`. Маркер: `label`, `default_label`, `lat`, `lng`, `zoom`, `address`, `place_id`. Адрес — набор ключей Nominatim (`house_number`, `road`, `city`, `postcode`, `country`, …). Параметры поля: `height` (px), `centerLat`, `centerLng` (строки), `zoom`, `multiple` (дефолт формы тогда `[]`).

## Даты

Токены формата: `YYYY` `YY` `MM` `M` `DD` `D` `HH` `H` `mm` `m` `ss` `s`.

| Тип | Дефолт показа | Дефолт хранения | Ещё |
| --- | --- | --- | --- |
| `date_picker` | `DD.MM.YYYY` | `YYYY-MM-DD` | `firstDay` (1 = понедельник), `defaultToCurrentDate`, индекс `date` |
| `date_time_picker` | `DD.MM.YYYY HH:mm` | `YYYY-MM-DD HH:mm` | те же, индекс `timestamptz` |
| `time_picker` | `HH:mm` | `HH:mm` | без `firstDay` и `defaultToCurrentDate`, индекс `time` |

## Связи

### `post_object`

Select записей. `postType?: string[]` (нет — все), `dictionary?: string[]` (только записи с термином этих словарей), `allowNull`, `multiple`, `returnFormat: 'object' | 'id'`. Объект — `RelationEntryValue`: id, type, status, title, slug, slugPath, url, fields, parent, даты. Пароля записи в объекте нет.

### `page_link`

Публичный URL строкой, не объект записи. Те же фильтры `postType` и `dictionary`, плюс `allowArchives` (пункты архива, если у типа задан `has_archive`), `allowNull`, `multiple`.

### `relationship`

Пикер с поиском и порядком. `postType`, `dictionary`, `min`, `max`, `filters` из `'search' | 'post_type' | 'dictionary'` (в UI без значения — поиск), `elements` — ключи полей `image` / `gallery` для превью, `returnFormat: 'object' | 'id'`.

### `dictionary`

Термины одного словаря в JSON поля. `dictionary` (slug, обязательно), `fieldType: 'checkbox' | 'multi_select' | 'radio' | 'select'` (в UI без значения — checkbox), `multiple` для select (`checkbox` и `multi_select` всегда несколько, `radio` всегда один), `allowNull`, `returnFormat: 'object' | 'id'`, `addTerm` (создать термин при праве `create`). Объект термина — `RelationTermValue`.

### `user`

Пикер аккаунтов. `role: 'all' | string | string[]` (пусто или `all` — все), `multiple`, `allowNull`, `returnFormat: 'array' | 'id'`. Объект: id, email, name, avatar, role, status, created_at. Хеша пароля нет.

### `form`

Выбор формы из дополнения `katecms-form`. Виджет регистрирует это дополнение. Без него `resolveField('form')` компонент не найдёт. `multiple` хранит массив id, одиночное пустое значение при `allowNull` — `null`. На сайте саму форму рисует `KateCmsForm`, см. [дополнения](11-dopolneniya.md).

## Структура

### `group`

`subFields`. Вложенный объект. Скаляры внутри можно помечать `indexed`.

### `repeater`

Массив одинаковых строк. `min`, `max`, `buttonLabel`, `collapsed` (ключ subField для заголовка свёрнутой строки), `subFields`. Вложенный repeater допустим. Индексы Postgres внутри не строятся. Пустой дефолт — `[]`.

### `flexible_content`

Массив разных раскладок. Имя раскладки пишется в элемент как `fc_layout`. `layouts` обязательно: ключ → `{ label, preview?, min?, max?, subFields }`. `preview` — файл в `previewPath` (каталог относительно `public`) или URL. `min` — мягкий лимит под будущую проверку, UI сам строки не добавляет. `max` ограничивает добавление в UI. У поля те же `min`, `max`, `buttonLabel`, `previewPath`.

### `accordion`

Только UI. Из базы на контейнер действуют `position`, `columnWidth`, `conditionalLogic`. `open` — индекс панели с 0 (в UI без числа открыта первая), `multiExpand`, `panels: { label, subFields }[]`. Поля панелей плоско в родителе.

### `tab`

Как аккордеон. `placement: 'top' | 'left'` (без `left` — сверху), `panels`.

### `separator`

Черта. `label` необязателен и рисуется на линии.

### `message`

Подсказка без значения. `message`, `escHtml`, `newLines: 'autop' | 'br' | ''`. Файла `MessageField.vue` в модуле нет: `resolveField('message')` ничего не возвращает, пока виджет не добавят.

## Условный пример

```ts
fields: {
  title: { type: 'text', label: 'Title', required: true, indexed: true },
  tagline: {
    type: 'text',
    label: 'Tagline',
    conditionalLogic: [
      [{ field: 'title', operator: 'equal', value: 'show' }],
    ],
  },
  price: { type: 'number', label: 'Price', min: 0, indexed: true },
  seo: {
    type: 'group',
    label: 'SEO',
    subFields: {
      title: { type: 'text', label: 'Title' },
      description: { type: 'textarea', label: 'Description' },
    },
  },
}
```

`fieldsQuery` на сайте фильтрует этот JSON. Точечный путь `seo.title` работает для сравнений `=` и `IN`. Обход ключей через `LIKE` / `REGEXP` смотрит только корень объекта. Подробности операторов — в [чтении данных](09-chtenie-s-sajta.md).
