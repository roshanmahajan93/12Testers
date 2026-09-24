// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'appwrite/functions/dist/*', 'coverage/*', 'android/*', 'ios/*'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['scripts/**', 'appwrite/**', '*.config.js', '*.config.ts', 'jest.setup.ts'],
    rules: { 'no-console': 'off' },
  },
]);
