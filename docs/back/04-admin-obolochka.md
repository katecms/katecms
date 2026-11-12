# Админская оболочка

Оболочка — родитель `runtime/pages/index.vue` и дети в `runtime/pages/admin`. У родителя `layout: false`: лейаут хоста на админку не надевается.

`index.vue` вешает на `body` id `katecms-body`. Миксин `katecms-wrapper` в SCSS оборачивает правила оболочки в `body#katecms-body`, чтобы селекторы сайта не перекрашивали шапку и меню. Тема — класс `katecms-theme-light` или `katecms-theme-dark`; режим `system` класс не ставит. Заголовок вкладки: `… - KateCMS`.

Внутри родителя: шапка (`AdminHeader`), меню (`AppMenu`), меню пользователя (`AppUser`), слот страницы.

## Страницы

| Файл | Маршрут | Экран |
| --- | --- | --- |
| `admin/index.vue` | `/${adminPath}` | Стартовая |
| `admin/login.vue` | логин | Форма входа |
| `admin/register.vue` | регистрация | Первый аккаунт или саморегистрация |
| `admin/media.vue` | `media` | Библиотека |
| `admin/users/index.vue` | `users` | Список |
| `admin/users/create.vue` | `users/create` | Создание |
| `admin/users/[id].vue` | `users/:id` | Карточка, смена роли и пароля |
| `admin/collections/index.vue` | `collections/:collection` | Список записей, фильтр статуса, поиск, месяцы |
| `admin/collections/create.vue` | `.../create` | Новая запись |
| `admin/collections/[id].vue` | `.../:id` | Редактор |
| `admin/dictionaries/index.vue` | `dictionaries/:dictionary` | Термины |
| `admin/dictionaries/[id].vue` | `.../:id` | Термин |
| `admin/options/[page].vue` | `options/:page` | Синглтон |
| `admin/demo-fields.vue` | `demo-fields` | Стенд виджетов |

Пути собирает `useCmsPaths()` из публичного runtime config. Дополнения добавляют `forms`, `forms/:id`, `entries`, `mail`, `seo` уже после этого списка.

## Крупные блоки `internal/admin`

| Компонент | Роль |
| --- | --- |
| `AppMenu` | Пункты из публичного конфига плюс `useKateCmsMenuItems`. Видимость сверяется с `GET /menu` и с правами на slug |
| `AppUser` | Имя, выход через `useAuth().logout` |
| `AdminHeader` | Верхняя полоса, переключатель темы |
| `CollectionEntryForm` | Поля записи, сайдбар с вкладкой Page и вкладками дополнений |
| `EntryRevisions` | Список снимков и откат |
| `DictionaryTermForm` | Поля термина и слот панелей `useKateCmsTermPanels` |
| `OptionPageForm` | Поля синглтона одной колонкой |
| `MediaLibraryModal` | Выбор файла из виджетов image/file/gallery |
| `MediaLibraryFilters` | Фильтры библиотеки |
| `UserAvatarField` | Аватар пользователя, не поле коллекции |
| `ConfirmDialog` | Подтверждение ухода и удаления |

Сайдбар записи (`.katecms-collection-form__sidebar`) показывает вкладки, когда зарегистрирована хотя бы одна сверх Page. Page остаётся в дереве при переключении. Панель дополнения монтируется при первом открытии и не уничтожается.

`autosave: true` на коллекции: уход с несохранённого create пишет draft. Уже сохранённая запись показывает подтверждение.

## Разметка

В шаблонах трёх пакетов (`katecms`, form, seo) каркас — `div` и `span`. Селекторы сайта (`p`, `h1`, `ul`, `section`, …) не должны попадать в оболочку. Настоящими элементами остаются ссылки, контролы формы, `img` / `picture` / `svg`, `template` / `component` / `Teleport`. HTML из wysiwyg и DOM Leaflet не переписывают.

Один корневой класс на компонент, строка хранится в `rootClass`. Элемент — `` `${rootClass}__name` ``, продолжение через дефис (`__settings-nav` принадлежит `__settings`), модификатор — `--`. На элементе один `:class`. Второе `:class` или повтор атрибута — ошибка сборки.

SCSS вложен под `#{$root}`: `&-` для хвоста, `&--` для модификатора, `&.` и `&:` для состояний. Оболочка (страницы, меню, шапка, формы записей, нотисы) внутри `@include katecms-wrapper`. Поля, части и контролы (`UiButton`, `UiSelect`) миксином не оборачивают.

Токены: `packages/katecms/src/runtime/assets/styles/` — `_variables.scss`, `_functions.scss` (`math-rem`), `_mixins.scss`, вход `_index.scss`. Дополнения подключают опубликованный вход `@use "katecms/styles"`.

## Данные экрана

Страницы не ходят в таблицы напрямую. Они вызывают `$fetch` на `/api/_katecms/...`. Типы ответов для коллекций собраны в `runtime/utils/collections.ts` (`AdminEntry`, `CollectionListResponse`, `ResolveResponse`). Словари и опции — соседние файлы `runtime/utils`. Общие функции списков и форм, которые нужны и клиенту, и серверу, лежат в `runtime/utils` без драйвера базы. Серверные куски — в `runtime/server/utils`.

`useAuth` делит один `useFetch` с ключом `katecms-auth-state` между шапкой и страницами. `logout` бьёт в `POST /auth/logout` и уводит на логин.

Меню доступа на клиенте дополняет `useMenuAccess` (`runtime/composables/useMenuAccess.ts`): оно читает ручку menu и решает, рисовать ли пункт.
