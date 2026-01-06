import type { ChangelogConfig } from 'changelogen'

const config: Partial<ChangelogConfig> = {
  repo: 'Fro-Q/lswt-playground',

  output: 'CHANGELOG.md',

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
}

export default config
