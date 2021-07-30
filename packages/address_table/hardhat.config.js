require('@nomiclabs/hardhat-waffle')

const {
  hardhatConfig,
  requireEnvVariables,
} = require('arb-shared-dependencies')
require('dotenv').config()

requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC'])

module.exports = hardhatConfig
