import neostandard from 'neostandard'

export default [
  {
    files: ['**/*.ts', '**/*.js'],
  },
  {
    ignores: ['dist/*'],
  },
  ...neostandard({ ts: true }),
]
