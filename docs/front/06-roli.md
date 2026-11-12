# Роли

Карта `katecms.roles` добавляет роль, целиком заменяет встроенную или прячет её значением `false`. Разрешение ролей — `resolveRoles` в `@katecms/core`.

## Встроенные

| Slug | Подпись | Права после resolve |
| --- | --- | --- |
| `owner` | Owner | Всё. `superuser: true`, проверки пропускаются. Запись в конфиге игнорируется, в `warnings` попадает сообщение |
| `admin` | Administrator | Все ресурсы, включая `forms`. `admin: false` игнорируется. Объект `Role` заменяет права |
| `editor` | Editor | `collections`, `dictionaries`, `media`, `forms` = все действия. `users` и `options` нет |
| `author` | Author | Коллекции: `read`, `create`, `update`. Медиа: `read`, `create`. Чужие записи: `update` / `delete` только свои, потому что на ресурс выдан список действий, а не `true` |
| `subscriber` | Subscriber | Пустая карта прав. Админские списки, черновики и `public: false` закрыты. Опубликованные публичные записи фронт отдаёт без входа |

`author: false` убирает роль из списка. Скрыть можно `editor`, `author`, `subscriber` и свою роль. `owner` и `admin` из списка не выкидываются.

Новый пользователь саморегистрации после первого получает `subscriber`.

## Ресурсы и действия

Ресурсы: `collections`, `dictionaries`, `media`, `users`, `options`, `forms`.

Действия: `read`, `create`, `update`, `delete`.

Пропущенный ресурс = нет доступа.

| Запись в `rights` | Смысл |
| --- | --- |
| `true` | Все четыре действия |
| `false` или отсутствие ключа | Нет доступа |
| `['read', 'create']` | Только перечисленные действия |
| Карта по slug | Для `collections`, `dictionaries`, `options`. Slug, которого нет в карте, закрыт |

`forms` не скоупится: одно право на все формы и SMTP.

`true` на коллекцию или на конкретный slug даёт правку чужих записей. Список действий на `update` / `delete` ограничивается автором записи (`canOnEntry`). `read` и `create` совпадают с обычным `can`.

Свой пароль меняется вместе с текущим. Чужой пароль задаёт роль с `users: update`, кроме аккаунта `owner`. Последнего `owner` нельзя снять с роли и нельзя удалить. Забытый пароль при доступе к серверу:

```bash
node scripts/reset-password.mjs --db playground/data/katecms.db --email owner@example.com --password "New-password-123"
```

Для Postgres вместо `--db` — `--url`. Письма для сброса нет. Скрипт лежит в корне репозитория и вызывает собранный `@katecms/core`.

## Пример

```ts
roles: {
  seo: {
    label: 'SEO User',
    rights: {
      collections: {
        pages: ['read', 'create', 'update', 'delete'],
        posts: ['read', 'create'],
      },
      media: ['read', 'create'],
      options: false,
    },
  },
  author: false,
}
```

Подпись `label` видна в админке. Slug роли — ключ объекта.
