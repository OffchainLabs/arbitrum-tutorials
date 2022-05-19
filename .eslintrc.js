module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  plugins: ['prettier'],
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parserOptions: {
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': 'off',
    'prefer-const': [2, { destructuring: 'all' }],
    'object-curly-spacing': ['error', 'always'],
  },
}
