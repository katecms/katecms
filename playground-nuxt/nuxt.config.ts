export default defineNuxtConfig({
  modules: ['miraicms-nuxt'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  miraicms: {
    media: {
      maxFileSize: 10,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'application/pdf',
        'video/mp4',
      ],
      // avif: true, // или { quality: 100 } // default 80
      webp: { quality: 90 }, // или true // default 80
      imageSizes: [
        {
          name: 'medium',
          width: 480,
          height: 480,
          crop: true,
        },
        {
          name: 'medium_large',
          width: 768,
          height: 0,
        },
        {
          name: 'large',
          width: 1200,
        },
      ],
    },
    roles: {
      // Новая роль: задаём label и права на ресурсы.
      seo: {
        label: 'SEO User',
        rights: {
          collections: {
            pages: ['read', 'create', 'update', 'delete'],
            posts: ['read', 'create'],
          },
          media: ['read', 'create'],
          options: false, // или true / список действий; false — нет доступа
        },
      },
      // Скрыть встроенную роль.
      author: false,
      // Можно переопределить права встроенной роли, объявив её слаг заново
      // (роль 'owner' и 'admin' зарезервированы и не изменяются).
      // subscriber: { label: 'Subscriber', rights: { collections: ['read'] } },
    },
    dictionaries: {
      services: {
        labels: {
          name: 'Services', // required
          singularName: 'Service', // default: labels.singularName = labels.name
        },
        fields: {
          description: {
            label: 'Description',
            type: 'textarea',
            placeholder: 'Description Text',
          },
        },
        collections: ['pages'],
      },
      categories: {
        labels: {
          name: 'Categories', // required
          singularName: 'Category', // default: labels.singularName = labels.name
        },
        collections: ['pages'],
      },
    },
  },
})
