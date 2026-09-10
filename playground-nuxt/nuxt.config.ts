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
      products: {
        labels: {
          name: 'Product',
        },
        fields: {
          description: {
            type: 'wysiwyg',
            label: 'Description',
            required: true,
            tabs: 'all',
            toolbar: 'full',
            columnWidth: 100,
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
