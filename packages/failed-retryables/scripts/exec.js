const { providers, Wallet } = require('ethers')
const { Bridge, BridgeHelper } = require('arb-ts')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')

require('dotenv').config()
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])

const wait = (ms = 0) => {
  return new Promise(res => setTimeout(res, ms || 10000))
}

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */

const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

module.exports = async txnHash => {
  await arbLog('Redeem Failed Retryable Ticket')

  const bridge = await Bridge.init(l1Wallet, l2Wallet)
  console.log(`Ensuring txn hasn't been redeemed:`)
  
  const inboxSeqNums = await bridge.getInboxSeqNumFromContractTransaction(receipt)
  const redemptionTxHash = await BridgeHelper.calculateL2RetryableTransactionHash( inboxSeqNums[0])

  const redemptionRec = await bridge.l2Provider.getTransactionReceipt(
    redemptionTxHash
  )
  if (redemptionRec && redemptionRec.status === 1) {
    throw new Error(
      `retryable has already been redeemed: ${redemptionTxHash}`
    )
  }





  

  
  
  
  
  
  
  
  
  

}
