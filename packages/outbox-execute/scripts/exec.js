const { expect } = require('chai')
const { BigNumber, utils, providers, Wallet } = require('ethers')
const { ethers } = require('hardhat')
const { Bridge } = require('arb-ts')

require('dotenv').config()
const wait = (ms = 0) => {
  return new Promise(res => setTimeout(res, ms || 10000))
}

const main = async () => {
  /**
   * Set up wallets to instantiate bridge class
   * We'll use bridge for its convenience methods around outbox-execution
   */
  const infuraKey = process.env.INFURA_KEY
  if (!infuraKey) throw new Error('No INFURA_KEY set.')

  const walletPrivateKey = process.env.DEVNET_PRIVKEY
  if (!walletPrivateKey) throw new Error('No DEVNET_PRIVKEY set.')

  const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
  const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

  const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
  const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

  const bridge = await Bridge.init(l1Wallet, l2Wallet)
}
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
