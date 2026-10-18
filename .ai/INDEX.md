# MiraiCMS index

Read this file first. Grep `.ai/` instead of scanning `packages/` for imports, symbols, routes, or schema.

Refresh after code changes: `pnpm ai:index`

Counts: 362 files, 929 symbols, 57 handlers, 23 pages, 15 tables, 37 field types.

## Files

| File | Use |
| --- | --- |
| `files.jsonl` | One source file per line |
| `symbols.jsonl` | Exported name to the file that defines it |
| `routes.json` | Admin pages, HTTP handlers, plugins, middleware, Nuxt auto-imports |
| `domain.json` | Packages, dependency lists, public API, DB tables, field types |

`dist/`, `node_modules/`, `.nuxt/`, `pnpm-lock.yaml`, and `public/uploads` are omitted.

## files.jsonl

`p` path from repo root. `pkg` package name. `k` kind. `ln` lines. `sum` one-line purpose. `ex` names declared here. `star` files pulled in with `export *`. `im` internal dependencies (repo paths). `ext` external packages.

Empty keys are omitted. To see who imports a file, grep its `p` value: hits in other lines' `im` are the importers.

## symbols.jsonl

`n` name. `k` is `fn`, `const`, `type`, `iface`, `class`, `enum`, `cmp`, or `ns`. `p` defining file. `cmp` is a Nuxt component registered with the module prefix (`MiraiCms*`, `Mirai*`).

Public entry surfaces are name lists in `domain.json` under `public` (`core`, `core/browser`, `nuxt`, `nuxt/server`, `nuxt/extensions`, `seo`).

## Resolve rules

- Client files under `runtime/` (not `runtime/server/`) import `@miraicms/core` from `packages/core/src/browser.ts`.
- Server, tests, and `module.ts` import `@miraicms/core` from `packages/core/src/index.ts`.
- Admin pages and `/api/_miraicms/*` handlers are registered in each package `module.ts`, not by Nuxt file-system routing. Paths are in `routes.json`. `{adminPath}` defaults to `admin`.
- App `pages/*.vue` outside `runtime/pages` (the playground) use Nuxt file routes, also listed in `routes.json`.
- Field config `type` maps to a widget: snake_case to PascalCase plus `Field.vue` (`image_select` to `ImageSelectField.vue`). `resolveField()` globs `internal/fields/*.vue`.
- Template tags `MiraiCms*` / `Mirai*` are edges in `im` even without a script import. `addAdminComponents()` dirs are internal: the tags resolve in admin and addon templates, and they are not host components.
- A named call that matches a unique composable or util export is also an `im` edge.

## Tables

Column codec in `domain.json`: `name:type`. `?` nullable. `*` generated or DB default. `ts` timestamp. `json` JSON column.

## Packages

- `@miraicms/core` `packages/core` — Framework-agnostic MiraiCMS core: config, database, auth, fields, media.
- `basic` `packages/miraicms-nuxt/test/fixtures/basic` — package
- `miraicms-monorepo` `.` — MiraiCMS monorepo: framework-agnostic core and Nuxt adapter.
- `miraicms-nuxt` `packages/miraicms-nuxt` — Nuxt module that adds MiraiCMS to your application.
- `miraicms-nuxt-form` `packages/miraicms-nuxt-form` — Form builder addon for the MiraiCMS Nuxt module.
- `miraicms-nuxt-seo` `packages/miraicms-nuxt-seo` — SEO addon for the MiraiCMS Nuxt module: titles, sitemap, and robots.txt.
- `miraicms-playground-nuxt` `playground-nuxt` — package

