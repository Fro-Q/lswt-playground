const config = {
  name: 'lswt-playground',

  // title: `v${version}`,

  types: [
    { type: 'feat', section: '✨ Features' },
    { type: 'fix', section: '🐛 Bug Fixes' },
    { type: 'perf', section: '⚡ Performance' },
    { type: 'refactor', section: '🧹 Refactors' },
    { type: 'docs', section: '📚 Documentation' },
    { type: 'build', section: '📦 Build' },
    { type: 'chore', section: '🧺 Chores' },
  ],

  excludeTypes: ['ci', 'test'],

}

export default config
