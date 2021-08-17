require('@nomiclabs/hardhat-ethers')
const main = require('./scripts/exec.js')
const { hardhatConfig } = require('arb-shared-dependencies')

const { task } = require('hardhat/config')

const accounts = {
  mnemonic:
    'rule nation tired logic palace city picnic bubble ridge grain problem pilot',
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 10,
}

task('outbox-exec', "Prints an account's balance")
  .addParam('txhash', 'Hash of txn that triggered and L2 to L1 message')

  .setAction(async args => {
    await main(args.txhash)
  })

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = hardhatConfig
