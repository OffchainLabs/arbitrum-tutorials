module.exports = {
  ...require('@offchainlabs/prettier-config'),
  overrides: [
    {
      files: '*.sol',
      options: {
        tabWidth: 4,
        singleQuote: false,
      },
    },
  ],
};
