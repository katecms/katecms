/**
 * Fills the playground SQLite database with users, media, dictionary terms,
 * options, and 45 entries in each collection.
 *
 * Login for every seeded account: Seed-pass-123
 * Re-running replaces pages, products, posts, categories, and services.
 */
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createLocalMediaStorage,
  createMedia,
  createSqliteDb,
  createUser,
  deleteMedia,
  emptyOsmAddress,
  findUserByEmail,
  generateVariants,
  hashPassword,
  resolveMediaConfig,
  setCollectionDictionaries,
  setOption,
  toMediaItem,
  toRelationEntryValue,
  toRelationTermValue,
  toUserFieldValue,
  updateCollection,
  updateUser,
  createCollection,
  createDictionary,
} from '../../packages/core/dist/index.mjs'

const require = createRequire(new URL('../../packages/core/package.json', import.meta.url))
const sharp = require('sharp')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dbPath = join(root, 'data', 'miraicms.db')
const uploadsDir = join(root, 'public', 'uploads')
const seedDir = join(root, 'public', 'seed')
const PER_COLLECTION = 45
const PASSWORD = 'Seed-pass-123'

const ROLE_COUNTS = [
  ['admin', 3],
  ['editor', 4],
  ['subscriber', 4],
  ['seo', 4],
  ['translator', 3],
  ['moderator', 3],
  ['catalog', 3],
  ['support', 2],
]

const { media: mediaConfig } = resolveMediaConfig({
  maxFileSize: 10,
  webp: { quality: 90 },
  imageSizes: [
    { name: 'min', width: 150, height: 150, crop: true },
    { name: 'medium', width: 480, height: 480, crop: true },
    { name: 'medium_large', width: 768, height: 0 },
    { name: 'large', width: 1200 },
  ],
})

const storage = createLocalMediaStorage({
  dir: uploadsDir,
  publicPrefix: '/uploads',
})

function pad(n) {
  return String(n).padStart(2, '0')
}

function pick(list, index) {
  return list[index % list.length]
}

function statusFor(index) {
  if (index % 10 === 0) {
    return 'trash'
  }
  if (index % 5 === 0) {
    return 'draft'
  }
  return 'published'
}

function publishedAt(index) {
  const date = new Date('2024-01-15T10:00:00.000Z')
  date.setUTCDate(date.getUTCDate() + index * 3)
  date.setUTCHours(8 + (index % 10))
  return date
}

async function raster(width, height, rgb, label) {
  const [r, g, b] = rgb
  const overlay = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="12" y="${Math.max(24, Math.round(height * 0.55))}" fill="white" font-size="${Math.max(14, Math.round(Math.min(width, height) / 8))}" font-family="sans-serif">${label}</text>
    </svg>`,
  )
  return sharp({
    create: { width, height, channels: 3, background: { r, g, b } },
  })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toBuffer()
}

async function writeChoiceImages() {
  await mkdir(seedDir, { recursive: true })
  const choices = [
    ['grid', [30, 90, 160]],
    ['list', [160, 70, 40]],
    ['card', [40, 130, 90]],
  ]
  for (const [name, rgb] of choices) {
    const data = await raster(96, 64, rgb, name)
    await sharp(data).toFile(join(seedDir, `${name}.png`))
  }
}

async function resetContent(db) {
  await db.deleteFrom('collections').where('type', 'in', ['pages', 'products', 'posts']).execute()
  await db.deleteFrom('dictionaries').where('type', 'in', ['categories', 'services']).execute()

  const stale = await db.selectFrom('media').selectAll().where('filename', 'like', 'seed-%').execute()
  for (const row of stale) {
    const variants = Array.isArray(row.variants) ? row.variants : []
    await storage.delete(row.filename).catch(() => {})
    for (const variant of variants) {
      if (variant && typeof variant.filename === 'string') {
        await storage.delete(variant.filename).catch(() => {})
      }
    }
    await deleteMedia(db, row.id)
  }
}

async function seedUsers(db, passwordHash) {
  const users = []
  let n = 1
  for (const [role, count] of ROLE_COUNTS) {
    for (let i = 1; i <= count; i++) {
      const email = `seed-${role}-${i}@example.com`
      const name = n % 7 === 0 ? `Тестер ${role} ${i}` : `Seed ${role} ${i}`
      const existing = await findUserByEmail(db, email)
      const row = existing
        ? await updateUser(db, existing.id, {
            password_hash: passwordHash,
            name,
            role,
            status: 'active',
          })
        : await createUser(db, {
            email,
            password_hash: passwordHash,
            name,
            role,
            status: 'active',
          })
      users.push(row)
      n++
    }
  }

  const bannedEmail = 'seed-banned@example.com'
  const bannedExisting = await findUserByEmail(db, bannedEmail)
  const banned = bannedExisting
    ? await updateUser(db, bannedExisting.id, {
        password_hash: passwordHash,
        name: 'Banned Seed',
        role: 'subscriber',
        status: 'banned',
      })
    : await createUser(db, {
        email: bannedEmail,
        password_hash: passwordHash,
        name: 'Banned Seed',
        role: 'subscriber',
        status: 'banned',
      })
  users.push(banned)
  return users.filter(Boolean)
}

async function seedMedia(db, uploaderId) {
  await mkdir(uploadsDir, { recursive: true })
  const specs = [
    [64, 64, [20, 20, 20], 'png'],
    [150, 150, [180, 40, 40], 'png'],
    [320, 180, [40, 80, 180], 'png'],
    [480, 480, [40, 140, 80], 'png'],
    [640, 360, [180, 120, 30], 'png'],
    [768, 432, [90, 40, 140], 'png'],
    [800, 600, [30, 110, 130], 'jpeg'],
    [1024, 576, [70, 70, 70], 'png'],
    [1200, 800, [20, 60, 120], 'png'],
    [1400, 500, [120, 50, 50], 'jpeg'],
    [400, 1200, [50, 90, 50], 'png'],
    [1920, 1080, [15, 40, 80], 'jpeg'],
    [2400, 1350, [80, 30, 30], 'png'],
    [96, 96, [200, 160, 40], 'webp'],
    [256, 256, [40, 40, 40], 'png'],
    [512, 512, [10, 90, 140], 'png'],
    [300, 300, [140, 90, 20], 'png'],
    [100, 100, [160, 20, 80], 'png'],
  ]

  const items = []
  for (let i = 0; i < specs.length; i++) {
    const [width, height, rgb, format] = specs[i]
    const filename = `seed-${pad(i + 1)}.${format === 'jpeg' ? 'jpg' : format}`
    let data = await raster(width, height, rgb, `seed ${i + 1}`)
    let mime = 'image/png'
    if (format === 'jpeg') {
      data = await sharp(data).jpeg({ quality: 82 }).toBuffer()
      mime = 'image/jpeg'
    }
    else if (format === 'webp') {
      data = await sharp(data).webp({ quality: 80 }).toBuffer()
      mime = 'image/webp'
    }
    await storage.put(filename, data)
    const variants = await generateVariants({
      storage,
      key: filename,
      mimeType: mime,
      data,
      config: mediaConfig,
    })
    const row = await createMedia(db, {
      filename,
      mime_type: mime,
      filesize: data.length,
      width,
      height,
      alt: i === 0 ? '' : i === 3 ? 'Обложка с кириллицей и "кавычками"' : `Seed image ${i + 1}`,
      caption: i % 4 === 0 ? null : `Caption ${i + 1}`,
      uploaded_by: uploaderId,
      variants,
      variants_status: variants.length ? 'ready' : 'none',
    })
    items.push(toMediaItem(row, { publicUrl: key => storage.publicUrl(key) }))
  }
  return items
}

async function seedTerms(db) {
  const categories = []
  for (let i = 1; i <= 4; i++) {
    categories.push(await createDictionary(db, {
      type: 'categories',
      title: i === 2 ? 'Категория «Новости»' : `Category ${i}`,
      slug: `category-${i}`,
      fields: {},
      parent_id: null,
    }))
  }
  for (let i = 5; i <= 14; i++) {
    categories.push(await createDictionary(db, {
      type: 'categories',
      title: `Category ${i}`,
      slug: `category-${i}`,
      fields: {},
      parent_id: categories[(i - 5) % 4].id,
    }))
  }

  const services = []
  for (let i = 1; i <= 10; i++) {
    services.push(await createDictionary(db, {
      type: 'services',
      title: i === 1 ? 'Доставка' : `Service ${i}`,
      slug: `service-${i}`,
      fields: { description: i % 2 === 0 ? '' : `Service description ${i}\nwith a second line` },
      parent_id: null,
    }))
  }
  return { categories, services }
}

function termValue(row, depth) {
  return toRelationTermValue({
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    slugPath: row.slug,
    parentId: row.parent_id,
    fields: row.fields ?? {},
    depth,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

function entryValue(row, slugPath, url) {
  return toRelationEntryValue({
    id: row.id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    slugPath,
    url,
    status: row.status,
    fields: {},
    parentId: row.parent_id,
    menuOrder: row.menu_order,
    authorId: row.author_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  })
}

function pageTitle(index) {
  if (index === 1) {
    return `${'Очень длинный заголовок страницы '.repeat(8).trim()} ${index}`
  }
  if (index === 2) {
    return `Quotes " ' <>& and emoji ${index}`
  }
  if (index === 3) {
    return `Страница номер ${index}`
  }
  return `Page ${pad(index + 1)}`
}

function pageFields(index, images) {
  const image = pick(images, index)
  const gallery = [0, 1, 2].map(offset => pick(images, index + offset))
  const huge = index === 1
  const wysiwyg = huge
    ? `<p>${'Stress paragraph with <strong>markup</strong> and a long sentence. '.repeat(400)}</p>`
    : `<p>Body for page ${index + 1}.</p>`
  const highlightCount = huge ? 8 : index % 4
  return {
    wysiwyg_test: wysiwyg,
    color: index % 2 === 0 ? '#3366cc' : '#cc5533',
    thumbnail: image,
    text_label: huge ? 'X'.repeat(80) : `Label ${index + 1}`,
    text_test: `Text ${index + 1}`,
    textarea_test: index % 6 === 0 ? '' : `Line one ${index}\n\nLine two`,
    email_test: `page-${pad(index + 1)}@example.com`,
    url_test: `https://example.com/pages/${pad(index + 1)}`,
    number_test: index === 7 ? 0 : (index * 17) % 10000,
    range_test: (index * 5) % 101,
    password_test: index % 8 === 0 ? '' : `secret-${index}`,
    oembed_test: index % 3 === 0 ? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' : 'https://vimeo.com/76979871',
    file_test: image,
    gallery_test: index % 9 === 0 ? [] : gallery,
    select_test: pick(['draft', 'review', 'live'], index),
    checkbox_test: index % 4 === 0 ? [] : ['featured', index % 2 === 0 ? 'pinned' : 'noindex'],
    radio_test: pick(['left', 'center', 'right'], index),
    image_select_test: pick(['grid', 'list', 'card'], index),
    button_group_test: pick(['sm', 'md', 'lg'], index),
    true_false_test: index % 2 === 0,
    link_test: {
      url: `https://example.com/go/${index + 1}`,
      title: `Link ${index + 1}`,
      target: index % 2 === 0 ? '_blank' : '',
    },
    date_test: `2024-${pad((index % 12) + 1)}-${pad((index % 27) + 1)}`,
    datetime_test: `2024-${pad((index % 12) + 1)}-${pad((index % 27) + 1)} ${pad(index % 24)}:${pad((index * 3) % 60)}`,
    time_test: `${pad(index % 24)}:${pad((index * 7) % 60)}`,
    group_test: {
      meta_title: `Meta ${index + 1}`,
      meta_description: huge ? 'M'.repeat(160) : `Description ${index + 1}`,
    },
    repeater_test: Array.from({ length: highlightCount }, (_, row) => ({
      label: `Highlight ${row + 1}`,
      value: row * 10,
    })),
    tab_note: `Tab note ${index + 1}`,
    accordion_note: index % 5 === 0 ? '' : `Accordion note ${index + 1}`,
    flexible_content_test: [
      {
        fc_layout: 'hero',
        title: `Hero ${index + 1}`,
        description: `Hero copy ${index + 1}`,
      },
      ...(index % 2 === 0
        ? [{ fc_layout: 'faq', heading: `FAQ ${index + 1}` }]
        : [{ fc_layout: 'card', heading: `Card ${index + 1}` }]),
    ],
  }
}

function marker(index) {
  const address = emptyOsmAddress()
  address.city = index % 2 === 0 ? 'Moscow' : 'Kazan'
  address.country = 'Russia'
  address.country_code = 'ru'
  return {
    label: `Point ${index + 1}`,
    default_label: `Point ${index + 1}`,
    lat: 55.75 + (index % 10) * 0.01,
    lng: 37.61 + (index % 8) * 0.01,
    zoom: 12,
    address,
    place_id: `seed-${index + 1}`,
  }
}

async function main() {
  const db = createSqliteDb({ filename: dbPath })
  try {
    console.log('reset content')
    await resetContent(db)
    await writeChoiceImages()

    console.log('users')
    const passwordHash = await hashPassword(PASSWORD)
    const users = await seedUsers(db, passwordHash)
    const activeUsers = users.filter(user => user.status !== 'banned')

    console.log('media')
    const images = await seedMedia(db, activeUsers[0].id)
    for (let i = 0; i < Math.min(8, activeUsers.length); i++) {
      await updateUser(db, activeUsers[i].id, { avatar: images[i] })
    }

    console.log('dictionaries')
    const { categories, services } = await seedTerms(db)

    console.log('collections')
    const pages = []
    for (let i = 0; i < PER_COLLECTION; i++) {
      const parentPool = pages.filter(row => row.status !== 'trash')
      const parentId = i < 8 || parentPool.length === 0
        ? null
        : parentPool[i % parentPool.length].id
      const row = await createCollection(db, {
        type: 'pages',
        title: pageTitle(i),
        slug: `page-${pad(i + 1)}`,
        status: statusFor(i),
        fields: {
          ...pageFields(i, images),
          map_test: marker(i),
          user_test: toUserFieldValue(pick(activeUsers, i)),
        },
        parent_id: parentId,
        menu_order: i === 4 ? -1 : i === 6 ? 100000 : i,
        author_id: pick(activeUsers, i).id,
        published_at: publishedAt(i),
      })
      pages.push(row)
    }

    const products = []
    for (let i = 0; i < PER_COLLECTION; i++) {
      const row = await createCollection(db, {
        type: 'products',
        title: i === 2 ? `Товар №${i + 1}` : `Product ${pad(i + 1)}`,
        slug: `product-${pad(i + 1)}`,
        status: statusFor(i),
        fields: {
          description: `<p>Product description ${i + 1}.</p>`,
          price: i === 0 ? 0 : Math.round((9 + i * 3.5) * 100) / 100,
          sku: i === 11 ? `SKU-ЮНИКОД-${i}` : `SKU-${pad(i + 1)}`,
          in_stock: i % 6 !== 0,
          photos: i % 7 === 0 ? [] : [pick(images, i), pick(images, i + 1)],
        },
        menu_order: i,
        author_id: pick(activeUsers, i + 2).id,
        published_at: publishedAt(i),
      })
      products.push(row)
    }

    const posts = []
    for (let i = 0; i < PER_COLLECTION; i++) {
      const author = pick(activeUsers.filter(user => ['editor', 'seo', 'translator'].includes(user.role)), i)
      const row = await createCollection(db, {
        type: 'posts',
        title: i === 4 ? `Пост ${i + 1}: длинный заголовок для списка` : `Post ${pad(i + 1)}`,
        slug: `post-${pad(i + 1)}`,
        status: statusFor(i),
        fields: {
          excerpt: i === 1
            ? 'E'.repeat(300)
            : `Excerpt for post ${i + 1}.`,
          body: `<p>Post body ${i + 1}.</p>`,
          cover: pick(images, i + 3),
          author: toUserFieldValue(author),
          published_on: `2025-${pad((i % 12) + 1)}-${pad((i % 27) + 1)}`,
        },
        menu_order: i,
        author_id: author.id,
        published_at: publishedAt(i + 10),
      })
      posts.push(row)
    }

    const pageById = new Map(pages.map(row => [row.id, row]))
    function pagePath(row) {
      const parts = []
      let current = row
      const seen = new Set()
      while (current && !seen.has(current.id)) {
        seen.add(current.id)
        parts.unshift(current.slug)
        current = current.parent_id ? pageById.get(current.parent_id) : null
      }
      return parts.join('/')
    }

    console.log('relations')
    for (let i = 0; i < pages.length; i++) {
      const row = pages[i]
      const path = pagePath(row)
      const relatedPages = [1, 2, 3, 4].map(offset => pages[(i + offset) % pages.length])
      const relatedProducts = [0, 1].map(offset => products[(i + offset) % products.length])
      const categoryRows = [0, 1].map(offset => categories[(i + offset) % categories.length])
      const service = services[i % services.length]
      await updateCollection(db, row.id, {
        fields: {
          ...pageFields(i, images),
          map_test: marker(i),
          user_test: toUserFieldValue(pick(activeUsers, i)),
          post_object_test: [...relatedPages, ...relatedProducts].slice(0, 4).map(entry => entryValue(
            entry,
            entry.type === 'pages' ? pagePath(entry) : entry.slug,
            entry.type === 'pages' ? `/inf/${pagePath(entry)}` : `/products/${entry.slug}`,
          )),
          post_object_id_test: relatedPages[0].id,
          page_link_test: [
            `/inf/${pagePath(relatedPages[0])}`,
            `/products/${relatedProducts[0].slug}`,
            i % 2 === 0 ? '/catalog' : '/blog',
          ],
          relationship_test: relatedPages.slice(0, 4).map(entry => entryValue(
            entry,
            pagePath(entry),
            `/inf/${pagePath(entry)}`,
          )),
          dictionary_test: categoryRows.map(term => termValue(term, term.parent_id ? 1 : 0)),
          dictionary_select_test: termValue(service, 0),
        },
      })
      await setCollectionDictionaries(db, row.id, [
        ...categoryRows.map(term => term.id),
        service.id,
      ])
    }

    for (let i = 0; i < products.length; i++) {
      const category = categories[i % categories.length]
      await setCollectionDictionaries(db, products[i].id, [category.id])
    }
    for (let i = 0; i < posts.length; i++) {
      const category = categories[(i + 3) % categories.length]
      await setCollectionDictionaries(db, posts[i].id, [category.id])
    }

    console.log('options')
    await setOption(db, 'site', {
      title: 'MiraiCMS playground',
      tagline: '',
      description: 'Seeded site options.\nUsed by the public header and the admin options page.',
      logo: images[0],
      contact_email: 'hello@example.com',
      maintenance: false,
      social: {
        x: 'https://x.com/miraicms',
        github: 'https://github.com/ldu1991/miraicms',
      },
    })

    const counts = {
      users: users.length,
      media: images.length,
      categories: categories.length,
      services: services.length,
      pages: pages.length,
      products: products.length,
      posts: posts.length,
    }
    console.log(JSON.stringify(counts))
    console.log(`password for seed-* accounts: ${PASSWORD}`)
  }
  finally {
    await db.destroy()
  }
}

await main()
