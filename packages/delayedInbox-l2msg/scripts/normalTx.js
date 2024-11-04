const { ethers } = require('hardhat')
const { providers, Wallet } = require('ethers')
const {
  arbLog,
  requireEnvVariables,
  addCustomNetworkFromFile,
} = require('arb-shared-dependencies')
const { getArbitrumNetwork, InboxTools } = require('@arbitrum/sdk')
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
  await arbLog('DelayedInbox normal contract call (L2MSG_signedTx)')

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
   * We deploy greeter to the child chain, to interact with it from the parent chain
   */
  console.log('Deploying Greeter to the child chain 👋👋')

  const Greeter = (await ethers.getContractFactory('Greeter')).connect(
    childChainWallet
  )
  const greeter = await Greeter.deploy('Hello world')
  await greeter.deployed()
  console.log(`Greeter deployed to ${greeter.address}`)

  /**
   * Let's log the starting greeting string
   */
  const currentGreeting = await greeter.greet()
  console.log(`Current greeting: "${currentGreeting}"`)

  /**
   * Here we have a new greeting message that we want to set in the contract;
   * we'll be setting it by sending it as a message from the parent chain through the delayed inbox!!!
   */
  console.log(
    `Now we send a message to be executed on the child chain, through the delayed inbox of the parent chain (make sure you don't send any transaction directly on the child chain using ${childChainWallet.address} during this time):`
  )
  const newGreetingToSet = 'Greeting from delayedInbox'
  const GreeterIface = greeter.interface
  const calldata = GreeterIface.encodeFunctionData('setGreeting', [
    newGreetingToSet,
  ])
  const transactionRequest = {
    data: calldata,
    to: greeter.address,
    value: 0,
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
    `Greeting transaction confirmed on the parent chain! 🙌 ${sendMessageParentChainTransactionReceipt.transactionHash}`
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
    console.log(`Transaction executed on the child chain!!! 🥳`)
  } else {
    console.log(
      `The transaction failed to execute on the child chain. Please verify if the gas provided was enough`
    )
    return
  }

  /**
   * Now when we call greet again, we should see our new string!
   */
  const newGreeting = await greeter.greet()
  console.log(`Updated greeting: "${newGreeting}"`)
  console.log('✌️')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
