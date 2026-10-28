module.exports = {
  root: true,
  env: { es2020: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  ignorePatterns: ['node_modules', '.eslintrc.cjs'],
  rules: {
    // The domain runs in the browser and on the API server: no web app, React, icons or i18n.
    // src/boundary.test.ts checks the same boundary (and that imports stay inside src/).
    'no-restricted-imports': ['error', {
      paths: ['react', 'react-dom', 'lucide-react', 'i18next', 'react-i18next'].map((name) => ({ name, message: 'Not allowed in @zamani/domain.' })),
      patterns: [
        { group: ['@zamani/web', '@zamani/web/*', '**/apps/web/**'], message: 'The domain must not import from the web app.' },
        { group: ['react/*', 'react-dom/*', 'lucide-react/*', 'i18next/*', '**/i18n', '**/i18n/*'], message: 'Not allowed in @zamani/domain.' }
      ]
    }]
  }
};
