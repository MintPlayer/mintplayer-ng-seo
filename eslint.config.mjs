import nx from '@nx/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  ...nx.configs['flat/typescript'],
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/no-extra-semi': 'error',
      'no-extra-semi': 'off',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
    },
  },
  ...nx.configs['flat/javascript'],
  {
    files: ['**/*.js', '**/*.jsx'],
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/no-extra-semi': 'error',
      'no-extra-semi': 'off',
    },
  },
];
