const { providers, Wallet } = require('ethers')
const {
  L2TransactionReceipt,
  getL2Network,
  L2ToL1MessageStatus,
} = require('@arbitrum/sdk')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])

/**
 * Set up: instantiate L1 wallet connected to provider
 */

const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
const l1Wallet = new Wallet(walletPrivateKey, l1Provider)

module.exports = async txnHash => {
  await arbLog('Outbox Execution')
  /**
   / * We start with a txn hash; we assume this is transaction that triggered an L2 to L1 Message on L2 (i.e., ArbSys.sendTxToL1)
  */

  if (!txnHash)
    throw new Error(
      'Provide a transaction hash of an L2 transaction that sends an L2 to L1 message'
    )
  if (!txnHash.startsWith('0x') || txnHash.trim().length != 66)
    throw new Error(`Hmm, ${txnHash} doesn't look like a txn hash...`)

  /**
   * First, let's find the Arbitrum txn from the txn hash provided
   */
  const receipt = await l2Provider.getTransactionReceipt(txnHash)
  const l2Receipt = new L2TransactionReceipt(receipt)

  /**
   * Note that in principle, a single transaction could trigger any number of outgoing messages; the common case will be there's only one.
   * For the sake of this script, we assume there's only one / just grad the first one.
   */
  const messages = await l2Receipt.getL2ToL1Messages(l1Wallet, l2Provider)
  const l2ToL1Msg = messages[0]

  /**
   * Check if already executed
   */
  if ((await l2ToL1Msg.status(l2Provider)) == L2ToL1MessageStatus.EXECUTED) {
    console.log(`Message already executed! Nothing else to do here`)
    process.exit(1)
  }

  /**
   * before we try to execute out message, we need to make sure the l2 block it's included in is confirmed! (It can only be confirmed after the dispute period; Arbitrum is an optimistic rollup after-all)
   * waitUntilReadyToExecute() waits until the item outbox entry exists
   */
  const timeToWaitMs = 1000 * 60
  console.log(
    "Waiting for the outbox entry to be created. This only happens when the L2 block is confirmed on L1, ~1 week after it's creation."
  )
  await l2ToL1Msg.waitUntilReadyToExecute(l2Provider, timeToWaitMs)
  console.log('Outbox entry exists! Trying to execute now')

  /**
   * Now fetch the proof info we'll need in order to execute, or check execution
   */
  const proofInfo = await l2ToL1Msg.getOutboxProof(l2Provider)

  /**
   * Now that its confirmed and not executed, we can use the Merkle proof data to execute our message in its outbox entry.
   */
  const res = await l2ToL1Msg.execute(proofInfo)
  const rec = await res.wait()
  console.log('Done! Your transaction is executed', rec)
}
