# Страница сайта

Модуль не регистрирует публичный маршрут записей. Хост заводит одну catch-all страницу и на ней вызывает `getCollection()`. Образец — `playground-nuxt/pages/[...slug].vue`. Файл `playground-nuxt/pages/index.vue` закрывает корень `/`, потому что опциональный catch-all Nuxt на `/` не всегда срабатывает так, как ждёт CMS: для главной либо отдайте запись отдельным вызовом с `path: '/'`, либо заведите `pages/index.vue`.

Минимальный каркас:

```vue
<script setup>
const data = await getCollection()
const ready = Boolean(data) && !Array.isArray(data)

const entry = computed(() => ready ? data.entry.value : null)
const entries = computed(() => ready ? data.entries.value : [])
const isArchive = computed(() => ready ? data.isArchive.value : false)
const isTerm = computed(() => ready ? data.isTerm.value : false)
const term = computed(() => ready ? data.term.value : null)
const link = computed(() => ready ? data.link.value : null)
const permalink = ready ? data.permalink : () => null
</script>
```

Три ветки шаблона:

1. `isTerm` — заголовок `term.title`, список `entries`, у элемента уже есть `path`.
2. `isArchive` — заголовок `collection.labels.name`, ссылки через `permalink(item)`.
3. Иначе запись — `entry.title`, тело из `entry.fields`, ссылка `link`.

`entry.fields` хранит значения в том виде, в каком их сохранил виджет (`returnFormat`). HTML wysiwyg хост выводит сам. Текст с `newLines: 'autop'` или `'br'` на сайте пропускают через `autop` / `nl2br` из `@miraicms/core` (браузерная сборка их содержит): функции экранируют HTML и расставляют переносы.

Превью черновика: открыть публичный URL с `?preview=1` под пользователем, у которого есть `collections: read` на этот тип. Флаг `data.preview` говорит, что сервер это разрешил. В playground над страницей в этом случае пишется Preview.

Пагинация архива: `data.page`, `data.perPage`, `data.total` и query `?page=`. Размер страницы коллекции задаётся `perPage` в конфиге.

Списки «последние записи», «похожие», меню из нескольких типов собираются `getQueryCollection`, а не разбором текущего пути. Меню категорий — `getTerms`. Телефон и заголовок сайта из синглтона — `getOptions`.

Конфликт URL: более длинный `rewrite` побеждает. Архив (`has_archive`) совпадает только с точным путём и только если запись с тем же URL не заняла rewrite. Коллекция `public: false` из этого матчинга исключена.

Админка живёт на `/${adminPath}` и в catch-all сайта не входит: у неё свой родительский маршрут с `layout: false`. Глобальный middleware `miraicms-auth-guard` трогает только пути админки, логина и регистрации. Остальные страницы приложения он пропускает.
