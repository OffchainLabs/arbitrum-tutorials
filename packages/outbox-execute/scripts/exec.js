const { providers, Wallet } = require('ethers')
const {
  ChildTransactionReceipt,
  ChildToParentMessageStatus,
} = require('@arbitrum/sdk')
const {
  arbLog,
  requireEnvVariables,
  addCustomNetworkFromFile,
} = require('arb-shared-dependencies')
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

const parentChainWallet = new Wallet(walletPrivateKey, parentChainProvider)

const main = async transactionHash => {
  await arbLog('Outbox execution of child-to-parent message')

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile()

  /**
   * We start with a transaction hash;
   * we assume this is a transaction that triggered a child-to-parent message on the child chain (i.e., ArbSys.sendTxToL1)
   */
  if (!transactionHash) {
    throw new Error(
      'Provide a transaction hash of a transaction that sent a child-to-parent message'
    )
  }
  if (
    !transactionHash.startsWith('0x') ||
    transactionHash.trim().length != 66
  ) {
    throw new Error(`Hmm, ${transactionHash} doesn't look like a txn hash...`)
  }

  /**
   * First, let's find the transaction from the transaction hash provided
   */
  const receipt = await childChainProvider.getTransactionReceipt(
    transactionHash
  )
  const transactionReceipt = new ChildTransactionReceipt(receipt)

  /**
   * Note that in principle, a single transaction could trigger any number of outgoing messages; the common case will be there's only one.
   * For the sake of this script, we assume there's only one, so we just grab the first one.
   */
  const messages = await transactionReceipt.getChildToParentMessages(
    parentChainWallet
  )
  const childToParentMessage = messages[0]

  /**
   * Check if already executed
   */
  if (
    (await childToParentMessage.status(childChainProvider)) ==
    ChildToParentMessageStatus.EXECUTED
  ) {
    throw new Error(`Message already executed! Nothing else to do here`)
  }

  /**
   * Before we try to execute our message, we need to make sure the child chain's block is included and confirmed!
   * (it can only be confirmed after the dispute period)
   * Method `waitUntilReadyToExecute()` waits until the item outbox entry exists
   */
  const timeToWaitMs = 1000 * 60
  console.log(
    "Waiting for the outbox entry to be created. This only happens when the child chain's block is confirmed on the parent chain, around ~1 week after it's creation (by default)."
  )
  await childToParentMessage.waitUntilReadyToExecute(
    childChainProvider,
    timeToWaitMs
  )
  console.log('Outbox entry exists! Trying to execute now')

  /**
   * Now that its confirmed and not executed, we can execute our message in its outbox entry.
   */
  const executeTransaction = await childToParentMessage.execute(
    childChainProvider
  )
  const executeTransactionReceipt = await executeTransaction.wait()
  console.log('Done! Your transaction is executed', executeTransactionReceipt)
}

// Getting the transaction hash from the command arguments
if (process.argv.length < 3) {
  console.log(
    `Missing transaction hash of the child chain that sent a child-to-parent message`
  )
  console.log(`Usage: yarn run outbox-exec <transaction hash>`)
  process.exit(1)
}

const transactionHash = process.argv[2]

// Calling main
main(transactionHash)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
