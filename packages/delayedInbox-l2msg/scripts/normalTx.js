const { providers, Wallet, ethers } = require('ethers')
const hre = require('hardhat')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const {
  getL2Network,
} = require('@arbitrum/sdk-nitro/dist/lib/dataEntities/networks')
const {
  NodeInterface__factory,
} = require('@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory')
const {
  IInbox__factory,
} = require('@arbitrum/sdk/dist/lib/abi/factories/IInbox__factory')

const {
  NODE_INTERFACE_ADDRESS,
} = require('@arbitrum/sdk/dist/lib/dataEntities/constants')
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */
const walletPrivateKey = process.env.DEVNET_PRIVKEY

const L2MSG_signedTx = 4

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

/**
 * We should use nodeInterface to get the gas estimate is because we
 * are making a delayed inbox message which doesn't need l1 calldata
 * gas fee part.
 */
const estimateGasWithoutL1Part = async transactionl2Request => {
  const nodeInterface = NodeInterface__factory.connect(
    NODE_INTERFACE_ADDRESS,
    l2Provider
  )
  const gasComponents = await nodeInterface.callStatic.gasEstimateComponents(
    transactionl2Request.to,
    false,
    transactionl2Request.data,
    {
      from: transactionl2Request.from,
    }
  )
  return gasComponents.gasEstimate.sub(gasComponents.gasEstimateForL1)
}

const main = async () => {
  await arbLog('DelayedInbox normal contract call (L2MSG_signedTx)')

  const l2Network = await getL2Network(await l2Wallet.getChainId())

  /**
   * We deploy greeter to L2, to see if delayed inbox tx can be executed as we thought
   */
  const L2Greeter = await (
    await hre.ethers.getContractFactory('Greeter')
  ).connect(l2Wallet)

  console.log('Deploying Greeter on L2 👋👋')

  const l2Greeter = await L2Greeter.deploy('Hello world')
  await l2Greeter.deployed()
  console.log(`deployed to ${l2Greeter.address}`)

  /**
   * Let's log the L2 greeting string
   */
  const currentL2Greeting = await l2Greeter.greet()
  console.log(`Current L2 greeting: "${currentL2Greeting}"`)

  console.log(
    `Now we send a l2 tx through l1 delayed inbox (Please don't send any tx on l2 using ${l2Wallet.address} during this time):`
  )

  /**
   * Here we have a new greeting message that we want to set as the L2 greeting; we'll be setting it by sending it as a message from delayed inbox!!!
   */
  const newGreeting = 'Greeting from delayedInbox'

  const GreeterIface = l2Greeter.interface

  const calldatal2 = GreeterIface.encodeFunctionData('setGreeting', [
    newGreeting,
  ])

  /**
   * Encode the l2's signed tx so this tx can be executed on l2
   */
  const l2GasPrice = await l2Provider.getGasPrice()

  const transactionl2Request = {
    data: calldatal2,
    to: l2Greeter.address,
    nonce: await l2Wallet.getTransactionCount(),
    value: 0,
    gasPrice: l2GasPrice,
    chainId: l2Wallet.chainId,
    from: l2Wallet.address,
  }
  let l2GasLimit
  try {
    l2GasLimit = await estimateGasWithoutL1Part(transactionl2Request)
  } catch (error) {
    console.error(
      "execution failed (estimate gas failed), try check your account's balance?"
    )
    throw error
  }

  transactionl2Request.gasLimit = l2GasLimit

  const l2Balance = await l2Provider.getBalance(l2Wallet.address)

  /**
   * We need to check if the sender has enough funds on l2 to pay the gas fee
   */
  if (l2Balance.lt(l2GasPrice.mul(l2GasLimit))) {
    console.log(
      'You l2 balance is not enough to pay the gas fee, please bridge some ethers to l2.'
    )
    return
  }

  /**
   * We need extract l2's tx hash first so we can check if this tx executed on l2 later.
   */
  const l2SignedTx = await l2Wallet.signTransaction(transactionl2Request)

  const l2Txhash = ethers.utils.parseTransaction(l2SignedTx).hash

  /**
   * Pack the message data to parse to delayed inbox
   */
  const sendData = ethers.utils.solidityPack(
    ['uint8', 'bytes'],
    [ethers.utils.hexlify(L2MSG_signedTx), l2SignedTx]
  )
  console.log('Now we get the send data: ' + sendData)

  /**
   * Process the l1 delayed inbox tx, to process it, we need to have delayed inbox's abi and use it to encode the
   * function call data. After that, we send this tx directly to delayed inbox.
   */
  const inbox = new ethers.Contract(
    l2Network.ethBridge.inbox,
    IInbox__factory.abi
  )
  const inboxInstance = inbox.connect(l1Wallet)
  const resultsL1 = await inboxInstance.sendL2Message(sendData)

  const inboxRec = await resultsL1.wait()

  console.log(`Greeting txn confirmed on L1! 🙌 ${inboxRec.transactionHash}`)

  /**
   * Now we successfully send the tx to l1 delayed inbox, then we need to wait the tx executed on l2
   */
  console.log(
    `Now we need to wait tx: ${l2Txhash} to be included on l2 (may take 5 minutes) ....... `
  )

  const l2TxReceipt = await l2Provider.waitForTransaction(l2Txhash)

  const status = l2TxReceipt.status
  if (status == true) {
    console.log(`L2 txn executed!!! 🥳 `)
  } else {
    console.log(`L2 txn failed, see if your gas is enough?`)
    return
  }

  /**
   * Now when we call greet again, we should see our new string on L2!
   */
  const newGreetingL2 = await l2Greeter.greet()
  console.log(`Updated L2 greeting: "${newGreetingL2}"`)
  console.log('✌️')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
