# Ядро без Nuxt

`@miraicms/core` можно вызывать из своего адаптера, скрипта или серверного кода, который не хочет зависеть от страниц админки. Пакет не знает про Nuxt, Nitro, Vue и env. HTTP, cookie и чтение `DATABASE_URL` остаются на вызывающей стороне. Nuxt-модуль как раз такой адаптер: порядок у него `resolveMiraiCmsConfig` → цель базы → миграция → `getDb()` → запросы.

Установка: `pnpm add @miraicms/core`. Зависимости пакета: `kysely`, `pg`, `better-sqlite3`, `sharp`. В Cloudflare Worker нативные драйверы и sharp недоступны: туда передают биндинг `{ d1 }` и не генерируют варианты картинок на сервере.

Два входа сборки:

| Условие | Файл | Что внутри |
| --- | --- | --- |
| Сервер, тесты, скрипты | `src/index.ts` | Конфиг, права, пароли, поля, ЧПУ, блоки, текст, медиа, индексы, oEmbed, база |
| Браузер (`exports.browser`) | `src/browser.ts` | Конфиг, права, проверка email/пароля без хеширования, поля, ЧПУ, блоки, текст, oEmbed, типы медиа. Без `pg`, `better-sqlite3`, `sharp`, без SQL |

Импорт всегда из имени пакета:

```ts
import {
  defineMiraiCmsConfig,
  resolveMiraiCmsConfig,
  resolveDatabaseTarget,
  migrateSqlite,
  createSqliteDb,
  createUser,
  hashPassword,
  can,
} from '@miraicms/core'
```

## Конфиг

`defineMiraiCmsConfig` не меняет объект. `resolveMiraiCmsConfig` заполняет дефолты и кладёт предупреждения в `warnings`. Разбор базы из уже резолвнутого конфига — `resolveDatabaseTarget`. Неизвестный `driver` на этом шаге бросает ошибку.

Дальше вызывающий сам открывает клиент. Фабрики возвращают `Kysely<Database>`.

```ts
await migrateSqlite('./data/miraicms.db')
const db = createSqliteDb('./data/miraicms.db')
```

Postgres: `migratePostgres(url)` и `createPostgresDb(url | { connectionString } | { host, port, database, user, password } | { pool })`. Пул, который создала фабрика, закрывает `db.destroy()`. Чужой `pool` фабрика не закрывает и парсер `bigint` на нём не включает.

D1: `migrateSqlite({ d1 })` и `createSqliteDb({ d1 })`. `db.transaction()` на D1 не работает: нет сессии между запросами. `PRAGMA foreign_keys` между запросами Worker тоже не держит, хотя каскады в DDL описаны.

Схема CMS применяется один раз (id в `_miraicms_migrations`). Дополнение передаёт свой `schemaId` и `schemaSql` в тот же раннер. Версионированных миграций ядра нет: изменение DDL после первого прогона требует нового id или ручного SQL.

Канонический DDL — `packages/core/src/database/migrations/postgres/schema.ts` и `.../sqlite/schema.ts`. Файлы `.sql` рядом — копия для чтения, раннер их не выполняет.

## Запросы

Один `db` передаётся в функции. JSON пишется через stringify/parse, даты в JS — `Date`. Списки принимают необязательный `{ limit, offset }`.

| Область | Функции |
| --- | --- |
| Пользователи | `createUser`, `findUserById`, `findUserByEmail`, `updateUser`, `deleteUser`, `listUsers`, `hasAnyUser`, `toSafeUser`. Email trim и lower-case. Последнего owner снять нельзя. `deleteUser` обнуляет `author_id` и `uploaded_by` |
| Записи | `createCollection`, `updateCollection`, `deleteCollection`, `findCollectionById`, `findCollectionBySlugPath`, `loadCollectionSlugPath`, `listCollections`, `listCollectionParentOptions`, `queryCollections`, `countCollections`, `countQueryCollections`, `countCollectionStatuses`, `validateCollectionParent`. Корзина — `status: 'trash'`. `deleteCollection` удаляет строку |
| Meta | `setCollectionMeta`, `findCollectionMeta`, `listCollectionMeta`, `deleteCollectionMeta` |
| Ревизии | `createCollectionRevision`, `listCollectionRevisions`, `findCollectionRevisionById`. Строки не обновляются |
| Медиа-строки | `createMedia`, `updateMedia`, `deleteMedia`, `findMediaById`, `findMediaByFilename`, `listMedia`. Файл на диск эти функции не пишут |
| Словари | `createDictionary`, `updateDictionary`, `deleteDictionary`, `findDictionaryById`, `findDictionaryByTypeAndSlug`, `listDictionaries`, `queryTerms` |
| Связи | `linkCollectionDictionary`, `unlinkCollectionDictionary`, `setCollectionDictionaries`, `listDictionariesByCollection`, `listCollectionsByDictionary` |
| Опции | `setOption`, `findOption`, `listOptions`, `deleteOption` |

`toSafeUser` снимает `password_hash`. Строки `findUser*` хеш содержат: логин адаптера сравнивает его сам.

Пароли: `hashPassword`, `verifyPassword`. Формат `scrypt$N$r$p$<salt>$<hash>` (`N=16384`, `r=8`, `p=1`). Старый формат без параметров `verifyPassword` ещё принимает. Сломанный хеш даёт `false`.

Права: `can`, `canOnEntry`, `getRole`, `isOwner`, `isValidRole`. Константы ролей: `OWNER_ROLE`, `ADMIN_ROLE`, `SUBSCRIBER_ROLE`, `BUILT_IN_ROLES`, `RESOURCES`.

## Медиа, ЧПУ, текст, индексы, oEmbed

Эти функции тоже часть публичного серверного входа. Nuxt вызывает их из своих обработчиков; другой адаптер вызывает те же имена.

Медиа: `createLocalMediaStorage({ dir, publicPrefix })`, `prepareUploadKey`, `sanitizeFilename`, `generateVariants`, `regenerateVariants`, `readImageSize`, `toMediaItem`, `isMimeAllowed`, `hasImageWork`. Ключ файла не выходит из `dir`.

ЧПУ: `matchCollectionPath`, `matchPublicCollectionRoute`, `buildPublicPath`, `normalizePublicPath`, `resolveArchivePath`, `buildSlugPathMap`. Сначала более длинный rewrite. Без `%name%` паттерн не матчится.

Текст: `transliterate` (кириллица → латиница), `nl2br`, `autop`. Ими же пользуется `sanitizeFilename`.

Индексы полей: `syncCollectionFieldIndexes` и шаги `collectDesiredFieldIndexes`, `loadActualFieldIndexes`, `computeIndexDiff`, `applyFieldIndexDiff`. Только Postgres, advisory lock, чужие индексы не трогает. Имена вида `collections_fld__{collection}__{path}__idx`, не длиннее 63 байт.

oEmbed: `fetchOembed({ url, maxwidth, maxheight, fetch })`. Отказ на не-http(s), частные IPv4, слишком большое тело, больше 3 редиректов. Таймаут 10 с. Результат `{ ok: true, data }` или `{ ok: false, error, status }`.

Полный перечень имён экспорта собран в `.ai/domain.json` → `public.core` и `public["core/browser"]`. Поведение запросов по таблицам расписано в `packages/core/README.md`.
