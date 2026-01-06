import type { ChangelogConfig } from 'changelogen'

const config: ChangelogConfig = {
  name: 'nuxt-template',
  repo: 'Fro-Q/nuxt-template',

  output: 'CHANGELOG.md',

  tag: 'v',

  types: {
    feat: { title: '✨ Features' },
    fix: { title: '🐛 Bug Fixes' },
    perf: { title: '⚡ Performance' },
    refactor: { title: '🧹 Refactors' },
    docs: { title: '📚 Documentation' },
    build: { title: '📦 Build' },
    chore: { title: '🧺 Chores' },
    test: { title: '✅ Tests' },
  },

  filters: {
    excludeScopes: ['wip'],
  },
}

export default config
