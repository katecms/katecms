import { describe, expect, it } from 'vitest'
import {
  OWNER_ROLE,
  can,
  canOnEntry,
  defineMiraiCmsConfig,
  defaults,
  isOwner,
  isValidRole,
  mergeMiraiCmsConfig,
  resolveMiraiCmsConfig,
  resolveMediaConfig,
  resolveRoles,
  isMimeAllowed,
  collectionPerPage,
  collectionListPaging,
  DEFAULT_COLLECTION_PER_PAGE,
  UNLIMITED_COLLECTION_PER_PAGE,
} from '../src'

describe('defineMiraiCmsConfig', () => {
  it('returns the given config', () => {
    const config = defineMiraiCmsConfig({ adminPath: 'studio' })
    expect(config.adminPath).toBe('studio')
  })
})

describe('resolveRoles', () => {
  it('injects owner and built-in roles', () => {
    const { roles, warnings } = resolveRoles()
    expect(warnings).toEqual([])
    expect(roles[OWNER_ROLE]?.superuser).toBe(true)
    expect(roles.admin?.rights.users).toBe(true)
    expect(roles.editor?.rights.dictionaries).toBe(true)
    expect(roles.editor?.rights.users).toBe(false)
    expect(roles.editor?.rights.forms).toBe(true)
    expect(roles.author?.rights.forms).toBe(false)
    expect(roles.author?.rights.collections).toEqual(['read', 'create', 'update'])
    expect(roles.subscriber?.rights.collections).toEqual(['read'])
    expect(roles.subscriber?.rights.forms).toBe(false)
  })

  it('ignores owner overrides and records a warning', () => {
    const { roles, warnings } = resolveRoles({
      owner: { label: 'Hacker', rights: { users: false } },
    })
    expect(roles.owner?.superuser).toBe(true)
    expect(roles.owner?.rights.users).toBe(true)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('owner')
  })

  it('hides a built-in role with false', () => {
    const { roles } = resolveRoles({ editor: false })
    expect(roles.editor).toBeUndefined()
    expect(roles.admin).toBeDefined()
  })

  it('ignores admin: false and records a warning', () => {
    const { roles, warnings } = resolveRoles({ admin: false })
    expect(roles.admin).toBeDefined()
    expect(roles.admin?.rights.users).toBe(true)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('admin')
  })

  it('adds a custom role and replaces a built-in one', () => {
    const { roles } = resolveRoles({
      admin: { label: 'Ops', rights: { media: ['read'] } },
      reviewer: { label: 'Reviewer', rights: { collections: ['read', 'update'] } },
    })
    expect(roles.admin?.label).toBe('Ops')
    expect(roles.admin?.rights.media).toEqual(['read'])
    expect(roles.admin?.rights.users).toBe(false)
    expect(roles.reviewer?.label).toBe('Reviewer')
    expect(roles.reviewer?.superuser).toBe(false)
  })
})

describe('resolveMediaConfig', () => {
  it('applies defaults', () => {
    const { media, warnings } = resolveMediaConfig()
    expect(warnings).toEqual([])
    expect(media.maxFileSize).toBe(defaults.media?.maxFileSize)
    expect(media.avif).toBe(false)
    expect(media.imageSizes).toEqual([])
    expect(media.dir).toBeUndefined()
    expect(media.maxInputPixels).toBe(50_000_000)
  })

  it('resolves format quality and drops reserved size name', () => {
    const { media, warnings } = resolveMediaConfig({
      avif: true,
      webp: { quality: 60 },
      imageSizes: [
        { name: 'full', width: 100 },
        { name: 'thumb', width: 150, crop: true },
      ],
    })
    expect(media.avif).toEqual({ quality: 80 })
    expect(media.webp).toEqual({ quality: 60 })
    expect(media.imageSizes).toEqual([{ name: 'thumb', width: 150, height: 0, crop: true }])
    expect(warnings.some(w => w.includes('full'))).toBe(true)
  })

  it('skips duplicate size names and rejects a non-positive maxFileSize', () => {
    const { media, warnings } = resolveMediaConfig({
      maxFileSize: 0,
      imageSizes: [
        { name: 'thumb', width: 10 },
        { name: 'thumb', width: 20 },
      ],
    })
    expect(media.imageSizes).toEqual([{ name: 'thumb', width: 10, height: 0, crop: false }])
    expect(media.maxFileSize).toBe(defaults.media?.maxFileSize)
    expect(warnings.some(w => w.includes('duplicated'))).toBe(true)
    expect(warnings.some(w => w.includes('maxFileSize'))).toBe(true)
  })

  it('treats an empty MIME allow-list as deny-all', () => {
    expect(isMimeAllowed('image/png', [])).toBe(false)
    expect(isMimeAllowed('image/png', ['image/png'])).toBe(true)
  })
})

describe('mergeMiraiCmsConfig', () => {
  it('fills defaults and lets user values win', () => {
    const config = mergeMiraiCmsConfig({
      adminPath: 'studio',
      database: { url: 'postgres://localhost/miraicms' },
      media: { maxFileSize: 20 },
    })
    expect(config.adminPath).toBe('studio')
    expect(config.loginPath).toBe('login')
    expect(config.database.sqliteFilename).toBe(defaults.database.sqliteFilename)
    expect(config.database.url).toBe('postgres://localhost/miraicms')
    expect(config.media.maxFileSize).toBe(20)
    expect(config.media.allowedMimeTypes).toEqual(defaults.media.allowedMimeTypes)
  })

  it('skips undefined overlay keys so they do not wipe defaults', () => {
    const config = mergeMiraiCmsConfig({
      adminPath: undefined,
      database: { sqliteFilename: undefined, url: 'postgres://localhost/miraicms' },
    })
    expect(config.adminPath).toBe('admin')
    expect(config.database.sqliteFilename).toBe(defaults.database.sqliteFilename)
    expect(config.database.url).toBe('postgres://localhost/miraicms')
  })
})

describe('resolveMiraiCmsConfig', () => {
  it('fills paths and merges warnings', () => {
    const resolved = resolveMiraiCmsConfig({
      adminPath: 'backoffice',
      roles: { owner: { label: 'Nope' } },
      media: { imageSizes: [{ name: 'full' }] },
    })
    expect(resolved.adminPath).toBe('backoffice')
    expect(resolved.loginPath).toBe('login')
    expect(resolved.registration).toBe(true)
    expect(resolved.dictionaries).toEqual({})
    expect(resolved.options).toEqual({})
    expect(resolved.roles.owner?.superuser).toBe(true)
    expect(resolved.warnings.length).toBeGreaterThanOrEqual(2)
  })

  it('lets registration be turned off without affecting the default', () => {
    expect(resolveMiraiCmsConfig().registration).toBe(true)
    expect(resolveMiraiCmsConfig({ registration: false }).registration).toBe(false)
  })

  it('resolves form defaults and custom breakpoints', () => {
    const resolved = resolveMiraiCmsConfig()
    expect(resolved.form.uploadDir).toBe('')
    expect(resolved.form.maxFileBytes).toBe(10 * 1024 * 1024)
    expect(resolved.form.breakpoints.map(item => item.name)).toEqual(['phone', 'tablet', 'desktop'])
    expect(resolved.form.breakpoints[0]?.maxWidth).toBe(390)
    expect(resolved.form.breakpoints[2]?.maxWidth).toBeNull()

    const custom = resolveMiraiCmsConfig({
      form: {
        maxFileBytes: 1024,
        uploadDir: ' /var/forms ',
        breakpoints: [
          { name: 'Desktop' },
          { name: 'mobile', label: 'Mobile', maxWidth: 480 },
        ],
      },
    })
    expect(custom.form.maxFileBytes).toBe(1024)
    expect(custom.form.uploadDir).toBe('/var/forms')
    expect(custom.form.breakpoints).toEqual([
      { name: 'desktop', label: 'Desktop', maxWidth: null },
      { name: 'mobile', label: 'Mobile', maxWidth: 480 },
    ])
    expect(custom.warnings).toEqual([])
  })

  it('keeps option pages from config', () => {
    const resolved = resolveMiraiCmsConfig({
      options: {
        site: {
          label: 'Site',
          fields: { title: { type: 'text', label: 'Title' } },
        },
      },
    })
    expect(resolved.options.site?.label).toBe('Site')
    expect(resolved.options.site?.fields?.title).toMatchObject({ type: 'text' })
  })

  it('fills database defaults and accepts Postgres', () => {
    expect(resolveMiraiCmsConfig().database).toEqual({
      driver: '',
      url: '',
      sqliteFilename: defaults.database?.sqliteFilename,
    })
    expect(resolveMiraiCmsConfig({
      database: {
        driver: 'postgres',
        url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms',
      },
    }).database).toEqual({
      driver: 'postgres',
      url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms',
      sqliteFilename: defaults.database?.sqliteFilename,
    })
  })
})

describe('can', () => {
  const { roles } = resolveRoles({
    intern: {
      label: 'Intern',
      rights: {
        collections: { pages: ['read', 'update'] },
        media: ['read'],
        options: { site: ['read', 'update'] },
      },
    },
  })

  it('lets owner do anything', () => {
    expect(can({ role: 'owner' }, 'users', 'delete', { roles })).toBe(true)
    expect(can({ role: 'owner' }, 'collections', 'delete', { roles, scope: 'secret' })).toBe(true)
  })

  it('denies unknown roles', () => {
    expect(can({ role: 'ghost' }, 'media', 'read', { roles })).toBe(false)
    expect(isValidRole(roles, 'ghost')).toBe(false)
  })

  it('respects boolean and action-list rights', () => {
    expect(can({ role: 'admin' }, 'media', 'delete', { roles })).toBe(true)
    expect(can({ role: 'author' }, 'media', 'create', { roles })).toBe(true)
    expect(can({ role: 'author' }, 'media', 'delete', { roles })).toBe(false)
    expect(can({ role: 'subscriber' }, 'collections', 'read', { roles, scope: 'pages' })).toBe(true)
    expect(can({ role: 'subscriber' }, 'collections', 'update', { roles, scope: 'pages' })).toBe(false)
    expect(can({ role: 'editor' }, 'forms', 'update', { roles })).toBe(true)
    expect(can({ role: 'subscriber' }, 'forms', 'read', { roles })).toBe(false)
    expect(can({ role: 'author' }, 'forms', 'create', { roles })).toBe(false)
    expect(can({ role: 'intern' }, 'forms', 'read', { roles })).toBe(false)
  })

  it('scopes collection rights by slug', () => {
    expect(can({ role: 'intern' }, 'collections', 'read', { roles, scope: 'pages' })).toBe(true)
    expect(can({ role: 'intern' }, 'collections', 'read', { roles, scope: 'posts' })).toBe(false)
    expect(can({ role: 'intern' }, 'collections', 'read', { roles })).toBe(false)
  })

  it('scopes option page rights by slug', () => {
    expect(can({ role: 'intern' }, 'options', 'update', { roles, scope: 'site' })).toBe(true)
    expect(can({ role: 'intern' }, 'options', 'read', { roles, scope: 'seo' })).toBe(false)
    expect(can({ role: 'intern' }, 'options', 'read', { roles })).toBe(false)
    expect(can({ role: 'admin' }, 'options', 'update', { roles, scope: 'site' })).toBe(true)
    expect(can({ role: 'editor' }, 'options', 'read', { roles, scope: 'site' })).toBe(false)
  })

  it('detects owner', () => {
    expect(isOwner({ role: 'owner' }, roles)).toBe(true)
    expect(isOwner({ role: 'admin' }, roles)).toBe(false)
  })

  it('limits update/delete on an entry to the author unless rights are blanket', () => {
    expect(canOnEntry({ role: 'intern' }, 'collections', 'update', { authorId: 1 }, {
      roles,
      scope: 'pages',
      userId: 1,
    })).toBe(true)
    expect(canOnEntry({ role: 'intern' }, 'collections', 'update', { authorId: 2 }, {
      roles,
      scope: 'pages',
      userId: 1,
    })).toBe(false)
    expect(canOnEntry({ role: 'admin' }, 'collections', 'update', { authorId: 2 }, {
      roles,
      scope: 'pages',
      userId: 1,
    })).toBe(true)
    expect(canOnEntry({ role: 'editor' }, 'collections', 'update', { authorId: 2 }, {
      roles,
      scope: 'pages',
      userId: 1,
    })).toBe(true)
  })
})

describe('collectionPerPage', () => {
  it('defaults to 10, allows any positive size, and treats -1 as unlimited', () => {
    expect(collectionPerPage()).toBe(DEFAULT_COLLECTION_PER_PAGE)
    expect(collectionPerPage({})).toBe(10)
    expect(collectionPerPage({ perPage: 24 })).toBe(24)
    expect(collectionPerPage({ perPage: 250 })).toBe(250)
    expect(collectionPerPage({ perPage: 0 })).toBe(10)
    expect(collectionPerPage({ perPage: UNLIMITED_COLLECTION_PER_PAGE })).toBe(-1)
  })
})

describe('collectionListPaging', () => {
  it('omits limit when unlimited', () => {
    expect(collectionListPaging(1, 10)).toEqual({ limit: 10, offset: 0 })
    expect(collectionListPaging(3, 10)).toEqual({ limit: 10, offset: 20 })
    expect(collectionListPaging(2, UNLIMITED_COLLECTION_PER_PAGE)).toEqual({})
  })
})
