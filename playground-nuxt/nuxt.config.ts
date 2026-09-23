export default defineNuxtConfig({
  modules: ['miraicms-nuxt'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  miraicms: {
    // database: {
    //   driver: 'postgres',
    // },
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
          name: 'min',
          width: 150,
          height: 150,
          crop: true,
        },
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
          options: false, // или true / ['read', 'update'] / { site: ['read', 'update'] }
        },
      },
      translator: {
        label: 'Translator',
        rights: {
          collections: {
            pages: ['read', 'update'],
            posts: ['read', 'update'],
          },
          dictionaries: ['read'],
        },
      },
      moderator: {
        label: 'Moderator',
        rights: {
          collections: ['read', 'update', 'delete'],
          dictionaries: ['read', 'update', 'delete'],
          media: ['read'],
          users: ['read'],
        },
      },
      catalog: {
        label: 'Catalog',
        rights: {
          collections: {
            products: ['read', 'create', 'update', 'delete'],
          },
          media: ['read', 'create', 'update'],
          dictionaries: {
            categories: ['read', 'create', 'update'],
          },
        },
      },
      support: {
        label: 'Support',
        rights: {
          collections: ['read'],
          users: ['read'],
          options: {
            site: ['read'],
          },
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
        hierarchical: true, // default: false
        autosave: true, // новая запись: уход → черновик; сохранённая: подтверждение
        public: false, // default: true; false — страница записи/архива не работает, View в админке скрыт
        rewrite: '/inf/%name%', // нужно добавить чтобы можно было определить ЧПУ
        has_archive: true, // default: false; true — архив /inf; строка 'typepage' → /typepage
        perPage: 30, // default: 10; -1 — все записи
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
            cropType: true,
            position: 'sidebar',
            // required: true,
          },
          text_label: {
            label: 'Text Label',
            type: 'text',
            position: 'sidebar',
            required: true,
            defaultValue: 'SEO Description',
            indexed: true,
          },
          text_test: {
            type: 'text',
            label: 'Text',
            instructions: 'Text instructions',
            position: 'main',
            placeholder: 'Text Placeholder',
            defaultValue: 'Text Test Default',
            maxLength: 120,
            prepend: 'Prepend',
            append: 'Append',
          },
          textarea_test: {
            type: 'textarea',
            label: 'Textarea',
            instructions: 'Textarea instructions',
            position: 'main',
            placeholder: 'Textarea',
            defaultValue: 'Textarea Test Default\n\nTextarea Test Default\nTextarea Test Default\n\nTextarea Test Default',
            maxLength: 500,
            rows: 6,
            newLines: 'autop',
          },
          email_test: {
            type: 'email',
            label: 'Email',
            instructions: 'Email instructions',
            position: 'main',
            placeholder: 'name@example.com',
            defaultValue: 'test@example.com',
            prepend: '@',
            append: '.com',
          },
          url_test: {
            type: 'url',
            label: 'Url',
            instructions: 'Url instructions',
            position: 'main',
            placeholder: 'https://example.com',
            defaultValue: 'https://example.com',
          },
          separator_test_2: {
            type: 'separator',
            label: 'Test Fields',
            position: 'main',
          },
          post_object_test: {
            type: 'post_object',
            label: 'Post Object',
            instructions: 'Pages and products, stored as objects.',
            position: 'main',
            postType: ['pages', 'products'],
            multiple: true,
            allowNull: true,
            returnFormat: 'object',
          },
          post_object_id_test: {
            type: 'post_object',
            label: 'Post Object (id)',
            instructions: 'Single page, stored as a numeric id.',
            position: 'main',
            postType: ['pages'],
            allowNull: true,
            returnFormat: 'id',
          },
          page_link_test: {
            type: 'page_link',
            label: 'Page Link',
            instructions: 'Public URLs, including collection archives.',
            position: 'main',
            postType: ['pages', 'products'],
            multiple: true,
            allowArchives: true,
            allowNull: true,
          },
          relationship_test: {
            type: 'relationship',
            label: 'Relationship',
            instructions: 'Pick and reorder entries. Thumbnails come from the page `thumbnail` field.',
            position: 'main',
            postType: ['pages', 'products'],
            dictionary: ['categories', 'services'],
            filters: ['search', 'post_type', 'dictionary'],
            elements: ['thumbnail'],
            // max: 4,
            returnFormat: 'object',
          },
          dictionary_test: {
            type: 'dictionary',
            label: 'Dictionary',
            instructions: 'Categories as checkboxes, stored as term objects.',
            position: 'main',
            dictionary: 'categories',
            fieldType: 'checkbox',
            returnFormat: 'object',
          },
          dictionary_select_test: {
            type: 'dictionary',
            label: 'Dictionary (select)',
            instructions: 'Services as a select. New terms can be added when you have create access.',
            position: 'main',
            dictionary: 'services',
            fieldType: 'select',
            allowNull: true,
            addTerm: true,
            returnFormat: 'object',
          },
          flexible_content_test: {
            type: 'flexible_content',
            label: 'Flexible Content',
            instructions: 'Flexible Content instructions',
            position: 'main',
            max: 5,
            buttonLabel: 'Add layout',
            layouts: {
              hero: {
                label: 'Hero',
                max: 2,
                preview: 'https://picsum.photos/800/600',
                subFields: {
                  title: {
                    type: 'text',
                    label: 'Title',
                    required: true,
                    placeholder: 'Welcome',
                    defaultValue: 'Welcome',
                    columnWidth: 50,
                  },
                  description: {
                    type: 'textarea',
                    label: 'Description',
                    placeholder: 'Lorem ipsumтАж',
                    defaultValue: 'Lorem ipsumтАж',
                    columnWidth: 50,
                  },
                },
              },
              faq: {
                label: 'FAQ',
                subFields: {
                  heading: {
                    type: 'text',
                    label: 'Heading',
                    required: true,
                    placeholder: 'About us',
                    defaultValue: 'About us',
                    columnWidth: 100,
                  },
                },
              },
              card: {
                label: 'Card',
                subFields: {
                  heading: {
                    type: 'text',
                    label: 'Heading',
                    required: true,
                    placeholder: 'About us',
                    defaultValue: 'About us',
                    columnWidth: 100,
                  },
                },
              },
            },
          },
          number_test: {
            type: 'number',
            label: 'Number',
            min: 0,
            max: 10000,
            step: 1,
            defaultValue: 1,
            prepend: '#',
          },
          range_test: {
            type: 'range',
            label: 'Range',
            min: 0,
            max: 100,
            step: 5,
            defaultValue: 40,
          },
          password_test: {
            type: 'password',
            label: 'Secret',
            placeholder: 'Content password',
          },
          oembed_test: {
            type: 'oembed',
            label: 'oEmbed',
            instructions: 'YouTube, Vimeo, or another supported URL.',
          },
          file_test: {
            type: 'file',
            label: 'File',
            position: 'sidebar',
          },
          gallery_test: {
            type: 'gallery',
            label: 'Gallery',
            min: 0,
            max: 8,
          },
          select_test: {
            type: 'select',
            label: 'Select',
            choices: [
              { val: 'draft', lbl: 'Draft tone' },
              { val: 'review', lbl: 'In review' },
              { val: 'live', lbl: 'Live' },
            ],
            defaultValue: 'review',
            allowNull: true,
          },
          checkbox_test: {
            type: 'checkbox',
            label: 'Checkbox',
            choices: {
              featured: 'Featured',
              pinned: 'Pinned',
              noindex: 'No index',
            },
            layout: 'vertical',
          },
          radio_test: {
            type: 'radio',
            label: 'Radio',
            choices: {
              left: 'Left',
              center: 'Center',
              right: 'Right',
            },
            defaultValue: 'left',
            layout: 'horizontal',
          },
          image_select_test: {
            type: 'image_select',
            label: 'Image select',
            choices: {
              grid: { label: 'Grid', image: '/seed/grid.png' },
              list: { label: 'List', image: '/seed/list.png' },
              card: { label: 'Card', image: '/seed/card.png' },
            },
            defaultValue: 'grid',
            width: 96,
            height: 64,
          },
          button_group_test: {
            type: 'button_group',
            label: 'Button group',
            choices: {
              sm: 'S',
              md: 'M',
              lg: 'L',
            },
            defaultValue: 'md',
          },
          true_false_test: {
            type: 'true_false',
            label: 'Published flag',
            ui: true,
            uiOnText: 'Yes',
            uiOffText: 'No',
            defaultValue: true,
          },
          link_test: {
            type: 'link',
            label: 'Link',
          },
          user_test: {
            type: 'user',
            label: 'Assignee',
            role: 'all',
            allowNull: true,
            returnFormat: 'array',
          },
          map_test: {
            type: 'open_street_map',
            label: 'Map',
            height: 280,
            centerLat: '55.751244',
            centerLng: '37.618423',
            zoom: 11,
          },
          date_test: {
            type: 'date_picker',
            label: 'Date',
            displayFormat: 'YYYY-MM-DD',
            returnFormat: 'YYYY-MM-DD',
          },
          datetime_test: {
            type: 'date_time_picker',
            label: 'Date time',
            displayFormat: 'YYYY-MM-DD HH:mm',
            returnFormat: 'YYYY-MM-DD HH:mm',
          },
          time_test: {
            type: 'time_picker',
            label: 'Time',
            displayFormat: 'HH:mm',
            returnFormat: 'HH:mm',
          },
          group_test: {
            type: 'group',
            label: 'SEO group',
            subFields: {
              meta_title: {
                type: 'text',
                label: 'Meta title',
                maxLength: 70,
              },
              meta_description: {
                type: 'textarea',
                label: 'Meta description',
                rows: 3,
                maxLength: 160,
              },
            },
          },
          repeater_test: {
            type: 'repeater',
            label: 'Highlights',
            buttonLabel: 'Add highlight',
            min: 0,
            max: 6,
            collapsed: 'label',
            subFields: {
              label: {
                type: 'text',
                label: 'Label',
                required: true,
              },
              value: {
                type: 'number',
                label: 'Value',
                min: 0,
              },
              textarea_test: {
                type: 'textarea',
                label: 'Textarea',
                instructions: 'Textarea instructions',
                position: 'main',
                placeholder: 'Textarea',
                defaultValue: 'Textarea Test Default\n\nTextarea Test Default\nTextarea Test Default\n\nTextarea Test Default',
                maxLength: 500,
                rows: 6,
                newLines: 'autop',
              },
            },
          },
          message_test: {
            type: 'message',
            label: 'Note',
            message: 'Seeded fixture. Required fields are wysiwyg and the sidebar text label.',
          },
          tabs_test: {
            type: 'tab',
            placement: 'top',
            panels: [
              {
                label: 'Extra',
                subFields: {
                  tab_note: {
                    type: 'text',
                    label: 'Tab note',
                    placeholder: 'Shown inside the tab',
                  },
                },
              },
            ],
          },
          accordion_test: {
            type: 'accordion',
            open: 0,
            panels: [
              {
                label: 'More',
                subFields: {
                  accordion_note: {
                    type: 'textarea',
                    label: 'Accordion note',
                    rows: 3,
                  },
                },
              },
            ],
          },
        },
      },
      products: {
        labels: {
          name: 'Products',
          singularName: 'Product',
        },
        has_archive: 'catalog', // ЧПУ архива: /catalog (записи остаются /products/%name%)
        fields: {
          description: {
            type: 'wysiwyg',
            label: 'Description',
            required: true,
            tabs: 'all',
            toolbar: 'full',
            columnWidth: 100,
          },
          price: {
            type: 'number',
            label: 'Price',
            min: 0,
            step: 0.01,
            prepend: '$',
            indexed: true,
          },
          sku: {
            type: 'text',
            label: 'SKU',
            required: true,
            indexed: true,
          },
          in_stock: {
            type: 'true_false',
            label: 'In stock',
            ui: true,
            defaultValue: true,
          },
          photos: {
            type: 'gallery',
            label: 'Photos',
            max: 6,
          },
        },
      },
      posts: {
        labels: {
          name: 'Posts',
          singularName: 'Post',
        },
        public: true,
        rewrite: '/blog/%name%',
        has_archive: true,
        perPage: 12,
        fields: {
          excerpt: {
            type: 'textarea',
            label: 'Excerpt',
            required: true,
            rows: 4,
            maxLength: 300,
          },
          body: {
            type: 'wysiwyg',
            label: 'Body',
            toolbar: 'basic',
          },
          cover: {
            type: 'image',
            label: 'Cover',
            position: 'sidebar',
          },
          author: {
            type: 'user',
            label: 'Author',
            role: ['editor', 'seo', 'translator'],
            allowNull: true,
            returnFormat: 'array',
          },
          published_on: {
            type: 'date_picker',
            label: 'Published on',
            displayFormat: 'YYYY-MM-DD',
            returnFormat: 'YYYY-MM-DD',
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
            cropType: true,
            position: 'sidebar',
            // required: true,
          },
        },
        collections: ['pages'],
      },
      categories: {
        labels: {
          name: 'Categories', // required
          singularName: 'Category', // default: labels.singularName = labels.name
        },
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M4 7h7l2 2h7v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" stroke="currentColor" stroke-width="1.6"/><path d="M4 7V6a1 1 0 0 1 1-1h5l2 2" stroke="currentColor" stroke-width="1.6"/></svg>',
        multiple: true, // несколько терминов на запись; default: false
        fields: {
          description: {
            label: 'Description',
            type: 'textarea',
            placeholder: 'Description Text',
          },
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
            cropType: true,
            position: 'sidebar',
            // required: true,
          },
        },
        collections: ['pages', 'products', 'posts'],
      },
    },
    options: {
      site: {
        label: 'Site', // название страницы в меню
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M576 112C576 103.7 571.7 96 564.7 91.6C557.7 87.2 548.8 86.8 541.4 90.5L416.5 152.1L244 93.4C230.3 88.7 215.3 89.6 202.1 95.7L77.8 154.3C69.4 158.2 64 166.7 64 176L64 528C64 536.2 68.2 543.9 75.1 548.3C82 552.7 90.7 553.2 98.2 549.7L225.5 489.8L396.2 546.7C409.9 551.3 424.7 550.4 437.8 544.2L562.2 485.7C570.6 481.7 576 473.3 576 464L576 112zM208 146.1L208 445.1L112 490.3L112 191.3L208 146.1zM256 449.4L256 148.3L384 191.8L384 492.1L256 449.4zM432 198L528 150.6L528 448.8L432 494L432 198z"/></svg>',
        fields: {
          title: {
            type: 'text',
            label: 'Site title',
            required: true,
          },
          tagline: {
            type: 'text',
            label: 'Tagline',
            conditionalLogic: [
              [
                {
                  field: 'title',
                  operator: 'empty',
                },
              ],
            ],
          },
          description: {
            type: 'textarea',
            label: 'Description',
            rows: 10,
          },
          logo: {
            type: 'image',
            label: 'Logo',
          },
          contact_email: {
            type: 'email',
            label: 'Contact email',
          },
          maintenance: {
            type: 'true_false',
            label: 'Maintenance mode',
            ui: true,
            uiOnText: 'On',
            uiOffText: 'Off',
          },
          social: {
            type: 'group',
            label: 'Social',
            subFields: {
              x: { type: 'url', label: 'X' },
              github: { type: 'url', label: 'GitHub' },
            },
          },
        },
      },
    },
  },
})
