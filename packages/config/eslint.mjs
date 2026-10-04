import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/**
 * Shared ESLint flat config for all Soliton workspaces.
 *
 * Uses the non-type-checked recommended rules so linting stays fast and does not
 * require a TypeScript project per package. Type-aware and framework-specific rule
 * sets (React, React Native, etc.) can be layered on in a later phase.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/build/**',
      '**/.next/**',
      '**/.expo/**',
      '**/android/**',
      '**/ios/**',
      '**/expo-env.d.ts',
      '**/next-env.d.ts',
      '**/metro.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Config and script files run in Node (CommonJS or ESM).
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // App/library source runs on React Native, the browser, or Node depending on the
    // workspace; expose the union of those globals to the non-type-checked rules.
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // Allow intentionally-unused args/vars when prefixed with an underscore
      // (interface-mandated parameters, discarded destructures, etc.).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
