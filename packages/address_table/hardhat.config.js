require('@nomiclabs/hardhat-waffle')

module.exports = {
  solidity: '0.7.0',
  networks: {
    rinkArby: {
      url: 'https://rinkeby.arbitrum.io/rpc',
      accounts: [process.env.DEVNET_PRIVKEY],
    },
  },
}
