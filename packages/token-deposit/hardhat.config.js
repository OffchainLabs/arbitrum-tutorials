require('@nomiclabs/hardhat-ethers')
require("@nomicfoundation/hardhat-verify");
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
hardhatConfig.etherscan = {apiKey: 'ZWX4D9JI7AXVNWP2Y9A7J1GZI7TX684W8Q'}

module.exports = hardhatConfig
