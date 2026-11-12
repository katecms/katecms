# Страницы опций и блоки

## Опции

`katecms.options` — синглтоны. Ключ (`site`) равен `options.key` в таблице. Схема полей живёт в конфиге. Значение — один JSON в `options.value`.

Тип страницы: `OptionPageDefinition`.

| Поле | Смысл |
| --- | --- |
| `label` | Подпись в меню |
| `icon` | Inline SVG. Пустое значение заменяется дефолтной иконкой |
| `fields` | Карта полей. Тип `OptionField` — то же поле, что у коллекции, без `position` |

У страницы опций нет status, slug записи, родителя и колонки sidebar. Права `options` скоупятся по slug страницы так же, как коллекции.

Чтение на сайте:

```vue
<script setup lang="ts">
const { values, slug } = await getOptions({ option: 'site' })
</script>
```

`values` — объект полей. Пустая страница даёт `{}`.

Админка: `/${adminPath}/options/:page`.

```ts
options: {
  site: {
    label: 'Site',
    fields: {
      title: { type: 'text', label: 'Title' },
      phone: { type: 'text', label: 'Phone' },
    },
  },
}
```

## Блоки в конфиге

`katecms.blocks` — реестр определений. Ключ — slug блока.

```ts
interface Block {
  label: string
  icon?: string
  fields?: Fields
}
```

Коллекция ссылается на эти slug полем `blocks`: массив разрешённых, `true` (все) или `false` / пропуск (выключено).

Экземпляр на записи — другой тип, `BlockInstance`: `{ id, name, data }`. Он рассчитан на колонку `collections.blocks`. `id` — 10 символов, с буквы, `[a-z0-9]`, годится как HTML id. Это не секрет. Хелперы ядра: `createBlockInstance`, `ensureBlockIds`, `newBlockId`, `isValidBlockId`.

Колонка в схеме есть и по умолчанию `[]`. Редактор записей Nuxt-модуля этот реестр на экран не выводит и в обработчиках коллекций поле `blocks` не читает. Повторяющиеся куски контента на записи сейчас задаются полем `flexible_content`: массив раскладок, имя раскладки пишется в строку как `fc_layout`. Реестр `katecms.blocks` остаётся контрактом ядра для адаптера, который хранит экземпляры сам.
