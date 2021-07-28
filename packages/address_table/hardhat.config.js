require('@nomiclabs/hardhat-waffle')

require('dotenv').config()

const privKey = process.env.DEVNET_PRIVKEY

if (!privKey) throw new Error('Set DEVNET_PRIVKEY env variable ')

module.exports = {
  solidity: '0.7.0',
  networks: {
    rinkArby: {
      url: 'https://rinkeby.arbitrum.io/rpc',
      accounts: [privKey],
    },
  },
}
