const accounts = {
  mnemonic:
    'rule nation tired logic palace city picnic bubble ridge grain problem pilot',
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 10,
}
require('dotenv').config()
module.exports = {
  solidity: '0.7.0',
  networks: {
    rinkeby: {
      url: process.env['L1RPC'] || '',
      accounts: accounts,
    },
    rinkArby: {
      gasPrice: 0,
      url: process.env['L2RPC'] || '',
      accounts: accounts,
    },
  },
}
