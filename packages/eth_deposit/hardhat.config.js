require('@nomiclabs/hardhat-ethers')

const accounts = {
  mnemonic:
    'rule nation tired logic palace city picnic bubble ridge grain problem pilot',
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 10,
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: '0.7.0',
    networks: {
        rinkeby: {
            url: 'https://rinkeby.infura.io/v3/' + process.env['INFURA_KEY'],
            accounts: accounts,
        },
        rinkArby: {
            gasPrice: 0,
            url: 'https://rinkeby.arbitrum.io/rpc',
            accounts: accounts,
        },
    },
}
