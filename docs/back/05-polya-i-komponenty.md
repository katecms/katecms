# Виджеты полей и компоненты

Конфиг описывает поле снаружи. Рисует его файл в `runtime/internal/fields`. Связка — `resolveField` в `runtime/utils/helpers.ts`.

```ts
const fieldModules = import.meta.glob('../internal/fields/*.vue', { eager: true })
```

Имя файла без `Field.vue` приводится к PascalCase от `type`: `image_select` → `ImageSelectField.vue`. Дополнение может положить виджет в `Map` через `registerKateCmsField(type, component)`. Сначала ищется файл глоба, потом карта. Сейчас так подключён `type: 'form'` из пакета форм (`FormField.vue` в `katecms-form-builder`, не в глобе основного модуля).

`message` в объединении типов ядра есть, файла `MessageField.vue` нет. Виджет для него не резолвится.

Тег в шаблоне админки — `KateCms` + имя файла (`KateCmsTextField`). Его подставляет Vite-плагин из [жизненного цикла](02-zhiznennyj-cikl-modulya.md), не автоимпорт Nuxt.

## Каталоги `internal`

| Каталог | Содержимое |
| --- | --- |
| `fields/` | Один SFC на `type`. Общие куски не копируют: их берут из `parts` |
| `parts/` | `FieldWrapper`, `FieldLabel`, `FieldInstructions`, `FieldAddon`, `InputControl`, `DateTimeControl`, `ImageCropper` |
| `ui/` | `UiButton`, `UiSelect`, `UiNotice` |
| `admin/` | Оболочка, формы сущностей, медиамодалка |

`FieldWrapper` собирает подпись, инструкции, ширину колонки и состояние ошибки. Ошибки формы записи прокидывает `provideKateCmsFieldErrors` (`runtime/utils/field-errors.ts`), чтобы вложенный repeater видел ошибки своего ключа.

Условная видимость на клиенте считает `isVisible` / `evaluateCondition` из браузерного ядра. Сервер при сохранении ещё раз отбрасывает скрытые ключи и проверяет `required` только у видимых полей опубликованной записи (`validateRequiredFields`).

## Как устроены группы виджетов

Скаляры (`TextField`, `NumberField`, `EmailField`, …) — обёртка над `InputControl` с `prepend` / `append`.

Выбор (`SelectField`, `CheckboxField`, `RadioField`, `ButtonGroupField`, `ImageSelectField`) хранит значение в формате `returnFormat`. Свои варианты (`allowCustomChoices`) дописываются в список на клиенте.

Медиа (`ImageField`, `FileField`, `GalleryField`) открывают `MediaLibraryModal`. Кроп — `ImageCropper` и `cropType`. Превью галереи может просить именованный вариант `previewSize`.

Связи (`PostObjectField`, `PageLinkField`, `RelationshipField`, `DictionaryField`, `UserField`) ходят в `/api/_katecms/relation/entries` и `relation/terms` или в список пользователей. Объект, который кладётся в JSON, совпадает с типами `RelationEntryValue`, `RelationTermValue`, `UserFieldValue` в ядре.

`WysiwygField` поднимает TipTap (`@tiptap/vue-3`, starter-kit, таблицы, выравнивание, text-style, sub/sup). В базу уходит HTML. Флаг `mediaUpload` тип принимает, компонент не читает.

`OpenStreetMapField` грузит Leaflet, `leaflet-control-geocoder`, `leaflet.locatecontrol`. Значение — `OsmMarker`. Геокодер ходит в Nominatim с клиента.

`OembedField` показывает превью через `GET /api/_katecms/oembed`. В JSON записи остаётся строка URL.

`FlexibleContentField` хранит массив объектов с ключом `fc_layout`. `RepeaterField` — массив одинаковых строк и ключ `__katecmsCollapsed` для свёртки. `GroupField` — вложенный объект. `TabField` и `AccordionField` в значение свой ключ не пишут: `subFields` панелей оказываются рядом с полями родителя. Это же делает ядро в `collectVisibleValueKeys` / `buildFormValues`.

`DatePickerField`, `DateTimePickerField`, `TimePickerField` делят `DateTimeControl`. Формат показа и формат хранения задаются отдельно, разбор — `parseDate` / `formatDate` ядра.

## Стили виджета

Поля миксином `katecms-wrapper` не оборачивают. Корневой класс свой, токены — из `assets/styles`. Дополнение, которое рисует админский виджет, импортирует `@use "katecms/styles"`.

Новый тип поля добавляют в два места: интерфейс в `packages/core/src/config/types/fields.ts` (и при необходимости ветка в `fields/values.ts`, `fields/defaults.ts`, `indexes`, если тип индексируемый) и `*Field.vue` в `internal/fields`. Глоб подхватит файл без правки `module.ts`. Если виджет живёт в другом пакете, его регистрируют `registerKateCmsField` из плагина, как форму.

Клиентский файл виджета импортирует из `@katecms/core` только то, что есть в `browser.ts`. Вызов `getDb` или `hashPassword` из `.vue` соберёт в бандл Node-зависимости.
