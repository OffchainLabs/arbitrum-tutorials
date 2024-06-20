require('dotenv').config()
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.16',
        settings: {},
      },
      {
        version: '0.8.9',
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
    // When running the tutorials, we generally don't specify a network to use, but we configure the desired network
    // in the .env file. Thus, we generally end up using the default network config within hardhat, the "hardhat" network.
    // However, hardhat network config has some defaults that we want to override because they don't make sense
    // in other networks.
    hardhat: {
      gas: 'auto', // Default is 30000000
    },
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
