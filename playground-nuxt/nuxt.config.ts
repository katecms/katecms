export default defineNuxtConfig({
  modules: ['miraicms-nuxt'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  miraicms: {
    // database: {
    //   driver: 'postgres',
    //   url: 'postgres://postgres:admin@127.0.0.1:5432/miraicms',
    // },
  },
})
