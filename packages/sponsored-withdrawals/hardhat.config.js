require('@nomiclabs/hardhat-ethers')
const main1 = require('./scripts/exec-gasEstimator.js')
const main2 = require('./scripts/exec-flashbots.js')
const { hardhatConfig } = require('arb-shared-dependencies')

const { task } = require('hardhat/config.js')

const accounts = {
  mnemonic:
    'rule nation tired logic palace city picnic bubble ridge grain problem pilot',
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 10,
}

task('estimate-gas', "Prints an account's balance")
  .addParam('txhash', 'Hash of txn that triggered and L2 to L1 message')

  .setAction(async args => {
    await main1(args.txhash)
  })

task('flashbots', "creates and sends flashbot bundle")
  .addParam('txhash', 'Users tx hash')
  .addParam('signedtx', 'User signed tx')

  .setAction(async args => {
    await main2(args.txhash, args.signedtx)
  })
/**
 * @type import('hardhat/config.js').HardhatUserConfig
 */
module.exports = hardhatConfig
