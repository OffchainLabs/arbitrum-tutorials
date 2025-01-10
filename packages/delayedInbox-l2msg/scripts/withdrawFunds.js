const { ethers } = require('hardhat')
const { providers, Wallet } = require('ethers')
const {
  arbLog,
  requireEnvVariables,
  addCustomNetworkFromFile,
} = require('arb-shared-dependencies')
const { getArbitrumNetwork, InboxTools } = require('@arbitrum/sdk')
const {
  ARB_SYS_ADDRESS,
} = require('@arbitrum/sdk/dist/lib/dataEntities/constants')
const {
  ArbSys__factory,
} = require('@arbitrum/sdk/dist/lib/abi/factories/ArbSys__factory')
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

const main = async () => {
  await arbLog(
    'DelayedInbox withdraw funds from the parent chain (L2MSG_signedTx)'
  )

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile()

  /**
   * Use childChainNetwork to create an Arbitrum SDK InboxTools instance
   */
  const childChainNetwork = await getArbitrumNetwork(childChainProvider)
  const inboxTools = new InboxTools(parentChainWallet, childChainNetwork)

  /**
   * Here we use the ArbSys precompile to withdraw our funds;
   * we'll be setting it by sending it as a message from delayed inbox on the parent chain!!!
   */
  const arbSys = ArbSys__factory.connect(ARB_SYS_ADDRESS, childChainProvider)
  const arbsysIface = arbSys.interface
  const calldata = arbsysIface.encodeFunctionData('withdrawEth', [
    parentChainWallet.address,
  ])
  const transactionRequest = {
    data: calldata,
    to: ARB_SYS_ADDRESS,
    value: 1, // Only set 1 wei since it just a test tutorial, but you can set any amount
  }

  /**
   * We need to extract the transaction hash in the child chain first so we can check later if it was executed
   */
  const signedTransaction = await inboxTools.signChildTx(
    transactionRequest,
    childChainWallet
  )
  const transactionHash = ethers.utils.parseTransaction(signedTransaction).hash

  /**
   * We now send the transaction through the Delayed Inbox on the parent chain
   */
  const sendMessageParentChainTransactionRequest =
    await inboxTools.sendChildSignedTx(signedTransaction)
  const sendMessageParentChainTransactionReceipt =
    await sendMessageParentChainTransactionRequest.wait()
  console.log(
    `Withdraw txn initiated on the parent chain! 🙌 ${sendMessageParentChainTransactionReceipt.transactionHash}`
  )

  /**
   * Now we successfully send the transaction to the delayed inbox on the parent chain
   * We wait for the transaction to be executed on the child chain
   */
  console.log(
    `Now we need to wait tx: ${transactionHash} to be executed on the child chain (may take ~15 minutes) ... `
  )
  const transactionReceipt = await childChainProvider.waitForTransaction(
    transactionHash
  )
  const status = transactionReceipt.status
  if (status == true) {
    console.log(
      `Transaction executed on the child chain!!! 🥳 After a challenge period has passed, you can go to https://bridge.arbitrum.io/ to execute your withdrawal and receive your funds!`
    )
  } else {
    throw new Error(
      `The transaction failed to execute on the child chain. Please verify if the gas provided was enough`
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
