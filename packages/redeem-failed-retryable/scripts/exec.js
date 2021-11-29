const { providers, Wallet } = require('ethers')
const { Bridge } = require('arb-ts')
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

  await arbLog('Redeem A Failed Retryable Ticket')

  /**
   / * We start with an L1 txn hash; this is transaction that triggered craeting a retryable ticket
   */

  if (!txnHash)
    throw new Error(
     'Provide a transaction hash of an L1 transaction'
    )
  if (!txnHash.startsWith('0x') || txnHash.trim().length != 66)
   throw new Error(`Hmm, ${txnHash} doesn't look like a txn hash...`)

  
  /**
  * Use wallets to create an arb-ts bridge instance
  * We'll use bridge for its convenience methods around redeeimg a retryable ticket
  */

  const bridge = await Bridge.init(l1Wallet, l2Wallet)
  
  /**
  * First, let's check if our tx has not been already executed on L2
  */

   console.log(`Ensuring retryable ticket hasn't been redeemed:`)

  /**
  * We get the L1 transaction from the tx hash provided 
  * Using the L1 transaction, we then get our txn's sequence number from the event logs (using a handy utility method)
  * This sequence number uniquely identifies our L1-to-L2 message
  */

  const l1Tx = await bridge.getL1Transaction(txnHash)
  const inboxSeqNum = await bridge.getInboxSeqNumFromContractTransaction(l1Tx)
  if (!inboxSeqNum) throw new Error('Inbox not triggered')

  /**
  * Using our txn's sequence number, we now get the hash of L2 side of retryable txn
  */

  const redemptionTxHash = await bridge.calculateL2RetryableTransactionHash( inboxSeqNum[0], l2Provider )
  
  /**
  * Now we'll see if the ticket has been redeemed or not  
  */
  const redemptionRec = await bridge.l2Provider.getTransactionReceipt(redemptionTxHash)

  if (redemptionRec && redemptionRec.status === 1) {
    throw new Error(
    `ticket has been already redeemed: ${redemptionTxHash}`
    )
  }

  console.log(`Retryable ticket hasn't been redeemed yet, redeeming now 🥳 `)

  /**
  * Finally, we use bridge for redeeimg a retryable ticket
  * our L1 transaction is passed as an argument
  */
  const res = await bridge.redeemRetryableTicket(l1Tx)
  const rec = await res.wait()
  console.log('The L2 side of your transaction is now execeuted 🥳 :', rec)
  

}