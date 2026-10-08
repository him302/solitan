import config from '@soliton/config/eslint';

/**
 * Root ESLint flat config for the Soliton monorepo.
 * The shared rule set lives in @soliton/config so every workspace uses the same
 * configuration. ESLint 9 discovers this file from each package directory upward.
 */
export default [
  ...config,
  {
    // scripts/ are plain Node.js CJS files — allow require() here.
    files: ['scripts/**'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
