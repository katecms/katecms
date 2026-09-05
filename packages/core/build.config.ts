import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index', 'src/browser'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
  },
  externals: [
    'kysely',
    'pg',
    'better-sqlite3',
    'sharp',
    /^node:/,
  ],
})
