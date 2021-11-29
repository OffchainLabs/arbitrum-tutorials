const { providers, Wallet } = require('ethers')
const { Bridge, networks } = require('arb-ts')
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
  
  
  const l2ChainId = await l2Wallet.getChainId()
  const l2Network = networks[l2ChainId]

  console.log(`Ensuring txn hasn't been redeemed:`)


  const l1Tx = await bridge.getL1Transaction(txnHash)
  
  const inboxSeqNum = await bridge.getInboxSeqNumFromContractTransaction(l1Tx)
  if (!inboxSeqNum) throw new Error('Inbox not triggered')

  const l2TxnHash = await bridge.calculateL2TransactionHash(inboxSeqNum[0])
    console.log('waiting for retryable ticket...', l2TxnHash)

    const l2Txn = await l2Provider.waitForTransaction(l2TxnHash)
    if (!l2Txn) throw new Error('retryable ticket not found')
    console.log('retryable ticket found!')

    const redemptionTxHash =
    await bridge.calculateL2RetryableTransactionHash(
      inboxSeqNum[0],
      l2Provider
    )

    console.log(`Ensuring txn hasn't been redeemed:`)

    const redemptionRec = await bridge.l2Provider.getTransactionReceipt(
      redemptionTxHash
    )

    if (redemptionRec && redemptionRec.status === 1) {
      throw new Error(
        `ticket already been redeemed: ${redemptionTxHash}`
      )
    }

    console.log(`Hasn't been redeemed yet, redeeiing ticket`)


    const res = await bridge.redeemRetryableTicket(l1Tx)
    const rec = await res.wait()
    console.log('done:', rec)
  //const redemptionTxHash = await bridge.calculateL2RetryableTransactionHash( inboxSeqNums[0],l2ChainId)

  // const redemptionRec = await bridge.l2Provider.getTransactionReceipt(
  //   redemptionTxHash
  // )
  // if (redemptionRec && redemptionRec.status === 1) {
  //   throw new Error(
  //     `retryable has already been redeemed: ${redemptionTxHash}`
  //   )
  // }





  

  
  
  
  
  
  
  
  
  

}
