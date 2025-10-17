import { defineConfig } from 'eslint/config';
import defaultConfig from '@hughescr/eslint-config-default';

import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';

export default defineConfig(
    {
        name:    'ignores',
        ignores: ['coverage', 'node_modules', '.sst', '.astro/**', 'astro-src/.astro/**', 'sst-env.d.ts', '*.md'],
    },

    defaultConfig,

    ...eslintPluginAstro.configs.recommended,
    // ...eslintPluginAstro.configs['jsx-a11y-recommended'],

    { // Disable @stylistic/indent for astro files as it conflicts with jsx rules and crashes
        files: ['astro-src/**', '**/*.astro'],

        rules: {
            // Disable @stylistic/indent for astro files as it conflicts with jsx rules and crashes
            '@stylistic/indent':                                 'off',
            '@stylistic/jsx-one-expression-per-line':            ['error', { allow: 'non-jsx' }],
            // Astro has a lot of "any" types so these will be common but kinda unavoidable
            '@typescript-eslint/no-unsafe-assignment':           'off',
            '@typescript-eslint/no-unsafe-argument':             'off',
            '@typescript-eslint/no-unsafe-return':               'off',
            '@typescript-eslint/no-unsafe-call':                 'off',
            '@typescript-eslint/no-unsafe-member-access':        'off',
            '@typescript-eslint/no-redundant-type-constituents': 'off',
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
            // Disable n/no-missing-import as it doesn't support TypeScript's bundler moduleResolution
            'n/no-missing-import': 'off',
        },
    },

    {
        files: ['tests/**', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
        rules: {
            // bun:test imports aren't recognized
            'n/no-missing-import':               'off',
            // bun:test types don't come through so this blows up
            '@typescript-eslint/no-unsafe-call': 'off',

            // Disable lodash rules for test files (Playwright methods like .fill() are not lodash)
            'lodash/prefer-lodash-method':    'off',
            'lodash/prefer-lodash-typecheck': 'off',
        },
    }
);
