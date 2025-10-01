import { defineConfig } from 'eslint/config';
import defaultConfig from '@hughescr/eslint-config-default';

import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';

export default defineConfig(
    {
        name:    'ignores',
        ignores: ['coverage', 'node_modules', '.sst', '.astro', 'sst-env.d.ts', '*.md'],
    },

    defaultConfig,

    ...eslintPluginAstro.configs.recommended,
    // ...eslintPluginAstro.configs['jsx-a11y-recommended'],

    { // Disable @stylistic/indent for astro files as it conflicts with jsx rules and crashes
        files: ['**/*.astro'],

        rules: {
            '@stylistic/indent':                      'off',
            '@stylistic/jsx-one-expression-per-line': ['error', { allow: 'non-jsx' }],
        },
    },

    { // Configure browser environment for JavaScript in Astro script tags
        files:           ['**/*.astro/*.js'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                sourceType:  'module',
                ecmaVersion: 2020,
            },
        },
        rules: {
            'n/no-unsupported-features/node-builtins': 'off',
            'n/no-unsupported-features/es-builtins':   'off',
            'n/no-unsupported-features/es-syntax':     'off',
            'lodash/prefer-lodash-method':             'off',
            'lodash/prefer-lodash-typecheck':          'off',
        },
    },

    { // Configure browser environment for TypeScript in Astro script tags
        files:           ['**/*.astro/*.ts', 'astro-src/**/*.ts'],
        languageOptions: {
            parser:  tseslint.parser,
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                sourceType:  'module',
                ecmaVersion: 2020,
            },
        },
        rules: {
            'n/no-unsupported-features/node-builtins': 'off',
            'n/no-unsupported-features/es-builtins':   'off',
            'n/no-unsupported-features/es-syntax':     'off',
            'lodash/prefer-lodash-method':             'off',
            'lodash/prefer-lodash-typecheck':          'off',
        },
    },

    {
        rules: {
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/triple-slash-reference': 'off',
    //         '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    },

    { // Disable lodash rules for test files (Playwright methods like .fill() are not lodash); also 'bun:test' imports
        files: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
        rules: {
            'n/no-missing-import': 'off',
            'lodash/prefer-lodash-method':    'off',
            'lodash/prefer-lodash-typecheck': 'off',
        },
    }
);
