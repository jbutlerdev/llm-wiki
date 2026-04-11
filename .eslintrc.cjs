module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'warn',
  },
  overrides: [
    {
      files: ['*.test.ts'],
      env: { vitest: true },
    },
  ],
};
