require('@nomiclabs/hardhat-ethers')
const { hardhatConfig } = require('arb-shared-dependencies')

hardhatConfig.solidity.compilers[0] = {
    version: '0.8.9',
    settings: {
        optimizer: {
            enabled: true,
            runs: 200,
        },
    },
}

module.exports = hardhatConfig
