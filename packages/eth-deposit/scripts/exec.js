const { utils, providers, Wallet } = require('ethers')
const {
  getArbitrumNetwork,
  EthBridger,
  EthDepositMessageStatus,
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
const childChainWallet = new Wallet(walletPrivateKey, childChainProvider)

/**
 * Set the amount to be deposited in the child chain (in wei)
 */
const depositAmount = utils.parseEther('0.0001')

const main = async () => {
  await arbLog('Deposit native token (e.g. Ether) via Arbitrum SDK')

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile()

  /**
   * Use childChainNetwork to create an Arbitrum SDK EthBridger instance
   * We'll use EthBridger for its convenience methods around transferring the native asset to the child chain
   */
  const childChainNetwork = await getArbitrumNetwork(childChainProvider)
  const ethBridger = new EthBridger(childChainNetwork)

  /**
   * First, let's check the wallet's initial balance in the child chain
   */
  const initialEthBalance = await childChainWallet.getBalance()

  /**
   * Transfer ether (or native token) from parent to child chain
   * This convenience method automatically queries for the retryable's max submission cost and forwards the appropriate amount to the child chain
   * Arguments required are:
   * (1) amount: The amount of ETH (or native token) to be transferred
   * (2) parentSigner: The address on the parent chain of the account transferring ETH (or native token) to the child chain
   * (3) childProvider: A provider of the child chain
   */
  const depositTransaction = await ethBridger.deposit({
    amount: depositAmount,
    parentSigner: parentChainWallet,
    childProvider: childChainProvider,
  })

  const depositTransactionReceipt = await depositTransaction.wait()
  console.log(
    'Deposit receipt on the parent chain is:',
    depositTransactionReceipt.transactionHash
  )

  /**
   * With the transaction confirmed on the parent chain, we now wait for the child chain's side (i.e., balance credited to the child chain) to be confirmed as well.
   * Here we're waiting for the sequencer to include the message in its off-chain queue. The sequencer should include it in around 15 minutes.
   */
  console.log(
    `Now we wait for child chain's side of the transaction to be executed ⏳`
  )
  const transactionResult =
    await depositTransactionReceipt.waitForChildTransactionReceipt(
      childChainProvider
    )

  /**
   * The `complete` boolean tells us if the cross-chain message was successful
   */
  if (transactionResult.complete) {
    console.log(
      `Message successfully executed on the child chain. Status: ${
        EthDepositMessageStatus[await transactionResult.message.status()]
      }`
    )
  } else {
    throw new Error(
      `Message failed execution on the child chain . Status ${
        EthDepositMessageStatus[await transactionResult.message.status()]
      }`
    )
  }

  /**
   * Our wallet's balance on the child chain should be updated now
   */
  const updatedEthBalance = await childChainWallet.getBalance()
  console.log(
    `Your balance in the child chain is updated from ${initialEthBalance.toString()} to ${updatedEthBalance.toString()}`
  )
}
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
