const { providers, Wallet } = require('ethers')
const { L2TransactionReceipt, getL2Network, L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])

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

  
  const receipt = await l1Provider.getTransactionReceipt(txnHash)
  const l1Receipt = new L1TransactionReceipt(receipt)
  
  const message = await l1Receipt.getL1ToL2Message(l2Wallet)
  const status = await message.waitForStatus()
  if(status === L1ToL2MessageStatus.REDEEMED) {
    console.log(`L2 retryable txn is already executed 🥳 ${message.l2TxHash}`)
    } else {
  console.log(`L2 retryable txn failed with status ${L1ToL2MessageStatus[status]}`)
  }  
  
  console.log(`Redeeming now 🥳 `)


  const res = await message.redeem()
  const rec = await res.wait()

  console.log('The L2 side of your transaction is now execeuted 🥳 :', message.l2TxHash)
  

}