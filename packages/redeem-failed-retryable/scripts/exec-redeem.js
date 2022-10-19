const { providers, Wallet } = require('ethers')
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])

/**
 * Set up: instantiate the L2 wallet connected to provider
 */
const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

module.exports = async txnHash => {
  await arbLog('Redeem A Failed Retryable Ticket')

  /**
   * We start with an L1 txn hash; this is transaction that triggers craeting a retryable ticket
   */
  if (!txnHash)
    throw new Error('Provide a transaction hash of an L1 transaction')
  if (!txnHash.startsWith('0x') || txnHash.trim().length != 66)
    throw new Error(`Hmm, ${txnHash} doesn't look like a txn hash...`)

  /**
   * First, we check if our L1 to L2 message is redeemed on L2
   */
  const receipt = await l1Provider.getTransactionReceipt(txnHash)
  const l1Receipt = new L1TransactionReceipt(receipt)

  const messages = await l1Receipt.getL1ToL2Messages(l2Wallet)
  const message = await messages[0]
  const messageRec = await message.waitForStatus()
  const status = await messageRec.status
  if (status === L1ToL2MessageStatus.REDEEMED) {
    console.log(
      `L2 retryable txn is already executed 🥳 ${await messageRec.l2TxReceipt
        .transactionHash}`
    )
    return
  } else {
    console.log(
      `L2 retryable txn failed with status ${L1ToL2MessageStatus[status]}`
    )
  }

  console.log(`Redeeming the ticket now 🥳`)
  /**
   * We use the redeem() method from Arbitrum SDK to manually redeem our ticket
   */
  const l2Tx = await message.redeem()
  const rec = await l2Tx.waitForRedeem()
  console.log(
    'The L2 side of your transaction is now execeuted 🥳 :',
    await rec.transactionHash
  )
}
