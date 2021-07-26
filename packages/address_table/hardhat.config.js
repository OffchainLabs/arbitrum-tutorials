require('@nomiclabs/hardhat-waffle')

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: '0.7.0',
  networks: {
    rinkArby: {
      url: 'https://rinkeby.arbitrum.io/rpc',
      accounts: [process.env.DEVNET_PRIVKEY],
    },
  },
}
