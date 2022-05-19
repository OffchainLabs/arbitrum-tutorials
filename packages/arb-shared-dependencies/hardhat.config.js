require('dotenv').config()
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.2',
        settings: {},
      },

      {
        version: '0.7.2',
        settings: {},
      },
      {
        version: '0.6.12',
        settings: {},
      },
      {
        version: '0.6.11',
        settings: {},
      },
    ],
  },
  networks: {
    l1: {
      gas: 2100000,
      gasLimit: 0,
      url: process.env['L1RPC'] || '',
      accounts: process.env['DEVNET_PRIVKEY']
        ? [process.env['DEVNET_PRIVKEY']]
        : [],
    },
    l2: {
      url: process.env['L2RPC'] || '',
      accounts: process.env['DEVNET_PRIVKEY']
        ? [process.env['DEVNET_PRIVKEY']]
        : [],
    },
  },
}
