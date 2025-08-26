import defaultConfig from '@hughescr/eslint-config-default';
import packageJson from 'eslint-plugin-package-json';

import tseslint from 'typescript-eslint';

import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';

export default
[
    {
        name: 'ignores',
        ignores: ['coverage', 'node_modules', '.sst', '.astro', 'sst-env.d.ts', '*.md'],
    },

    defaultConfig.configs.recommended,

    ...tseslint.configs.recommended,
    ...tseslint.configs.stylistic,

    ...eslintPluginAstro.configs.recommended,
    // ...eslintPluginAstro.configs['jsx-a11y-recommended'],

    { // Disable @stylistic/indent for astro files as it conflicts with jsx rules and crashes
        files: ['**/*.astro'],

        rules: {
            '@stylistic/indent': 'off',
            '@stylistic/jsx-one-expression-per-line': ['error', { allow: 'non-jsx' }],
        },
    },

    { // Configure browser environment for JavaScript in Astro script tags
        files: ['**/*.astro/*.js'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                sourceType: 'module',
                ecmaVersion: 2020,
            },
        },
        rules: {
            'n/no-unsupported-features/node-builtins': 'off',
            'n/no-unsupported-features/es-builtins': 'off',
            'n/no-unsupported-features/es-syntax': 'off',
            'lodash/prefer-lodash-method': 'off',
            'lodash/prefer-lodash-typecheck': 'off',
        },
    },

    { // Configure browser environment for TypeScript in Astro script tags
        files: ['**/*.astro/*.ts', 'astro-src/**/*.ts'],
        languageOptions: {
            parser: tseslint.parser,
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                sourceType: 'module',
                ecmaVersion: 2020,
            },
        },
        rules: {
            'n/no-unsupported-features/node-builtins': 'off',
            'n/no-unsupported-features/es-builtins': 'off',
            'n/no-unsupported-features/es-syntax': 'off',
            'lodash/prefer-lodash-method': 'off',
            'lodash/prefer-lodash-typecheck': 'off',
        },
    },

    {
        rules: {
            '@typescript-eslint/triple-slash-reference': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@stylistic/operator-linebreak': 'off',
            'n/no-missing-import': 'off',
        },
    },

    {
        ...packageJson.configs.recommended,
        rules: {
            ...packageJson.configs.recommended.rules,
            strict: 'off',
        }
    },

    {
        files: ['**/*.js', '**/*.mjs'],
        ...tseslint.configs.disableTypeChecked,
    },
];
