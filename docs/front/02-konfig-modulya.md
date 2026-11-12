# Ключ `katecms`

Тип пользовательского объекта — `KateCmsConfig` (`packages/core/src/config/types/cms.ts`). Мета модуля: `configKey: 'katecms'`. Хелпер `defineKateCmsConfig` только сужает тип и значение не меняет. Нормализация — `resolveKateCmsConfig`: дефолты, роли, медиа, база, массив `warnings`. Предупреждения модуль печатает как `[KateCMS] …` при старте Nuxt.

Пути — сегменты без ведущего `/`.

| Ключ | Тип | Дефолт | Смысл |
| --- | --- | --- | --- |
| `adminPath` | `string` | `admin` | Сегмент админки. URL `/${adminPath}` |
| `loginPath` | `string` | `login` | Вход: `/${adminPath}/${loginPath}` |
| `registerPath` | `string` | `register` | Регистрация: `/${adminPath}/${registerPath}` |
| `registration` | `boolean` | `false` | Саморегистрация после первого пользователя. Первый аккаунт всё равно `owner` |
| `collections` | `Collections` | `{}` | Типы записей. Ключ объекта = slug = колонка `type` |
| `dictionaries` | `Dictionaries` | `{}` | Словари. Ключ = slug = колонка `dictionaries.type` |
| `options` | `OptionPages` | `{}` | Страницы-синглтоны. Ключ = `options.key` |
| `blocks` | `Blocks` | `{}` | Реестр определений блоков |
| `database` | `DatabaseConfig` | SQLite `data/katecms.db` | Подключение |
| `media` | `MediaConfig` | см. [базу и медиа](07-baza-i-media.md) | Лимиты и пресеты картинок |
| `roles` | `Roles` | поверх встроенных | Новые роли, замена прав, скрытие |
| `form` | `FormConfig` | см. ниже | Каталог вложений форм, лимит байт, брейкпоинты конструктора |

Каталог загрузок модуль задаёт сам: `<rootDir>/public/uploads`. Поле `media.dir` в пользовательском конфиге не используется как путь сайта.

Относительный `database.sqliteFilename` модуль резолвит от `rootDir`. Значения `:memory:`, абсолютный путь и URI `file:` остаются как есть.

## `form`

Читается, когда установлен `katecms-form`. Отдельного ключа у модуля форм нет.

| Поле | Дефолт | Смысл |
| --- | --- | --- |
| `uploadDir` | пустая строка → каталог `data/katecms-form` | Абсолютный каталог файлов, пришедших через формы |
| `maxFileBytes` | `10 * 1024 * 1024` | Потолок одного вложения, в байтах |
| `breakpoints` | phone 390, tablet 768, desktop без потолка | Имена попадают в data-атрибуты `KateCmsForm` и в холст конструктора |

```ts
form: {
  uploadDir: '',
  maxFileBytes: 10 * 1024 * 1024,
  breakpoints: [
    { name: 'phone', label: 'Phone', maxWidth: 390 },
    { name: 'tablet', label: 'Tablet', maxWidth: 768 },
    { name: 'desktop', label: 'Desktop', maxWidth: null },
  ],
}
```

`name` брейкпоинта хранится в JSON формы. Базовый брейкпоинт для вёрстки — последний в списке с `maxWidth: null`, в дефолте это `desktop`.

## Что остаётся на сервере

`ResolvedKateCmsConfig` лежит в `runtimeConfig.katecms` и содержит уже склеенные роли, `warnings`, абсолютный SQLite-путь и `media.dir`. Этот объект доступен серверному коду Nuxt. На клиент уходит урезанная копия из [подключения](01-granica-i-podklyuchenie.md).

Дополнение SEO объявляет `configKey: 'katecmsSeo'`, но `setup` опции модуля не читает. Заголовок сайта, шаблон title и редиректы задаются в админке SEO и лежат в своих таблицах, не в `nuxt.config`.
