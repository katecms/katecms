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
    collections: {
      pages: {
        labels: {
          name: 'Pages', // основное название для типа записи // required
          singularName: 'Page', // название для одной записи этого типа, default: labels.singularName = labels.name
        },
        icon: '<svg width="433" height="340" viewBox="0 0 433 340" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M72.4294 339.995L258.446 340C312.173 340 349.689 324.538 383.014 293.613C416.338 262.349 433 221.229 433 170.255C433 119.28 416.168 78.1609 382.504 46.8965C349.179 15.6322 311.833 0 258.446 0L144 0.000978818V171.999L216 258V63.7181H258.446C292.111 63.7181 318.294 73.7431 336.996 93.7931C355.699 113.503 365.05 138.991 365.05 170.255C365.05 200.16 355.359 225.307 335.976 245.697C316.934 266.087 291.09 276.282 258.446 276.282H72V85.9973L0 0V340L72.4294 339.995Z" fill="#05083E"/></svg>',
        hierarchical: false, // default: false
        autosave: true, // уход со страницы без «Сохранить» → черновик
        rewrite: '/inf/%name%', // нужно добавить чтобы можно было определить ЧПУ
        fields: {
          wysiwyg_test: {
            type: 'wysiwyg',
            label: 'Wysiwyg',
            instructions: 'Wysiwyg instructions',
            required: true,
            tabs: 'all',
            toolbar: 'full',
            columnWidth: 100,
          },
          color: {
            label: 'Color',
            type: 'color_picker',
            indexed: true, // ← флаг для генерации индекса
          },
          thumbnail: {
            label: 'Thumbnail',
            type: 'image',
            cropType: [16, 9],
            position: 'sidebar',
            required: true,
          },
          text_label: {
            label: 'Text Label',
            type: 'text',
            position: 'sidebar',
            required: true,
            defaultValue: 'SEO Description',
          },
        },
      },
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
