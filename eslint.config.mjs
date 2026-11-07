import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'server/dist/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      'src/movies.csv',
      'public/**',
      '.claude/**',
      // Gitignored throwaway scripts/specs/configs (ESLint doesn't read .gitignore).
      '**/*.tmp.*',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: [
      'server/**/*.ts',
      'vite.config.ts',
      'playwright.config.ts',
      'tests/**/*.ts',
      'scripts/**/*.mjs',
    ],
    languageOptions: {
      globals: globals.node,
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // e2e safety rules (CLAUDE.md): specs must get test/expect from tests/helpers.ts, whose page
    // fixture blocks writes to the real src/movies.csv; types from @playwright/test are fine.
    files: ['tests/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [{
          name: '@playwright/test',
          allowTypeImports: true,
          message: "Import test/expect from './helpers' — its fixture blocks writes to the real CSV.",
        }],
      }],
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-restricted-properties': ['error', {
        property: 'waitForTimeout',
        message: 'No fixed sleeps: use web-first assertions (expect(...).toHaveCount, expect.poll, ...).',
      }],
    },
  },
);
