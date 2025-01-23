module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: ['@offchainlabs/eslint-config-typescript/base'],
  parserOptions: {
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  overrides: [
    {
      files: ['*.js', '*.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
