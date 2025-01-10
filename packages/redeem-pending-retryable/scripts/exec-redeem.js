const { providers, Wallet } = require('ethers')
const {
  arbLog,
  requireEnvVariables,
  addCustomNetworkFromFile,
} = require('arb-shared-dependencies')
const {
  ParentTransactionReceipt,
  ParentToChildMessageStatus,
} = require('@arbitrum/sdk')
require('dotenv').config()
requireEnvVariables(['PRIVATE_KEY', 'CHAIN_RPC', 'PARENT_CHAIN_RPC'])

/**
 * Set up: instantiate wallets connected to providers
 */
const walletPrivateKey = process.env.PRIVATE_KEY

const parentChainProvider = new providers.JsonRpcProvider(
  process.env.PARENT_CHAIN_RPC
)
const childChainProvider = new providers.JsonRpcProvider(process.env.CHAIN_RPC)
const childChainWallet = new Wallet(walletPrivateKey, childChainProvider)

const main = async parentChainTransactionHash => {
  await arbLog('Redeem a pending retryable ticket')

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile()

  /**
   * We start with a transaction hash from the parent chain.
   * This is a transaction that triggered the creation of a retryable ticket
   */
  if (
    !parentChainTransactionHash.startsWith('0x') ||
    parentChainTransactionHash.trim().length != 66
  ) {
    throw new Error(
      `Hmm, ${parentChainTransactionHash} doesn't look like a txn hash...`
    )
  }

  /**
   * First, we check if our parent-to-chain message is already redeemed on the child chain
   */
  const parentChainTransactionReceipt = new ParentTransactionReceipt(
    await parentChainProvider.getTransactionReceipt(parentChainTransactionHash)
  )

  const messages = await parentChainTransactionReceipt.getParentToChildMessages(
    childChainWallet
  )
  const message = messages[0]
  const messageResult = await message.waitForStatus()
  const status = messageResult.status
  if (status === ParentToChildMessageStatus.REDEEMED) {
    console.log(
      `Retryable ticket is executed on the child chain 🥳 ${messageResult.childTxReceipt.transactionHash}`
    )
  } else {
    console.log(
      `Retryable ticket failed to execute on the child chain. Status: ${ParentToChildMessageStatus[status]}`
    )
  }

  /**
   * We use the redeem() method from Arbitrum SDK to manually redeem our ticket
   */
  console.log(`Redeeming the ticket now...`)
  const childChainTransaction = await message.redeem()
  const childChainTransactionReceipt =
    await childChainTransaction.waitForRedeem()
  console.log(
    'The retryable ticket was successfully redeemed 🥳 :',
    childChainTransactionReceipt.transactionHash
  )
}

// Getting the transaction hash from the command arguments
if (process.argv.length < 3) {
  console.log(
    `Missing the transaction hash on the parent chain that created the pending retryable ticket`
  )
  console.log(`Usage: yarn run redeemPendingRetryable 0x<transaction-hash>`)
  process.exit(1)
}

const transactionHash = process.argv[2]

main(transactionHash)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
