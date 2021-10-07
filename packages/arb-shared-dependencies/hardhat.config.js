require('dotenv').config()
module.exports = {
  solidity: '0.7.0',
  networks: {
    l1: {
      url: process.env['L1RPC'] || '',
      accounts: [process.env['DEVNET_PRIVKEY']],
    },
    l2: {
      url: process.env['L2RPC'] || '',
      accounts: [process.env['DEVNET_PRIVKEY']],
    },
  },
}
