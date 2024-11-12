import unicorn from 'eslint-plugin-unicorn';
import n from 'eslint-plugin-n';
import globals from 'globals';
import mocha from 'eslint-plugin-mocha';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [{
  ignores: ['**/node_modules/', '**/coverage/', '**/dist/'],
}, ...compat.extends(
  'airbnb-base',
  'plugin:unicorn/recommended',
  'plugin:n/recommended',
  'plugin:@eslint-community/eslint-comments/recommended',
), {
  plugins: {
    unicorn,
    n,
  },

  languageOptions: {
    globals: {
      ...globals.node,
    },

    ecmaVersion: 'latest',
    sourceType: 'module',
  },

  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },

    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.json', './test/fixtures/*/tsconfig.json'],
      },
    },
  },

  rules: {
    'unicorn/prevent-abbreviations': 0,
    'unicorn/no-array-for-each': 0,
    'unicorn/no-array-reduce': 0,
    'unicorn/no-null': 0,
    'unicorn/import-style': 0,
    'unicorn/no-anonymous-default-export': 0,

    'unicorn/filename-case': ['error', {
      case: 'camelCase',
    }],

    '@eslint-community/eslint-comments/no-unused-disable': 'error',
    'import/extensions': 0,

    'n/no-missing-import': ['error', {
      ignoreTypeImport: true,
    }],
  },
}, ...compat.extends('plugin:mocha/recommended').map((config) => ({
  ...config,
  files: ['test/**/*.+(t|j)s'],
})), {
  files: ['test/**/*.+(t|j)s'],

  plugins: {
    mocha,
  },

  languageOptions: {
    globals: {
      ...globals.mocha,
    },
  },

  rules: {
    'mocha/no-mocha-arrows': 0,
  },
}, {
  files: ['**/*.ts'],

  plugins: {
    '@typescript-eslint': typescriptEslint,
  },

  languageOptions: {
    parser: tsParser,
  },
},
{
  files: ['eslint.config.mjs'],
  rules: {
    'import/no-extraneous-dependencies': 0,
    'no-underscore-dangle': 0,
  },
},
];
