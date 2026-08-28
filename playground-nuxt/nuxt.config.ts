export default defineNuxtConfig({
  modules: ['miraicms-nuxt'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  miraicms: {
    // database: {
    //   driver: 'postgres',
    //   url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms',
    // },
    collections: {
      df: {
        labels: { name: 'DF' },
        hierarchical: true,
        rewrite: '/df/%name%',
        fields: {
          about: {
            label: 'About',
            type: 'text',
          },
        },
      },
    },
  },
})
