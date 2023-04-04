const { providers, Wallet, ethers } = require('ethers')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const { getL2Network } = require('@arbitrum/sdk/dist/lib/dataEntities/networks')
const {
  NodeInterface__factory,
} = require('@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory')
const {
  ArbSys__factory,
} = require('@arbitrum/sdk/dist/lib/abi/factories/ArbSys__factory')
const {
  IInbox__factory,
} = require('@arbitrum/sdk/dist/lib/abi/factories/IInbox__factory')

const {
  NODE_INTERFACE_ADDRESS,
  ARB_SYS_ADDRESS,
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
      value: transactionl2Request.value,
    }
  )
  return gasComponents.gasEstimate.sub(gasComponents.gasEstimateForL1)
}

const main = async () => {
  await arbLog('DelayedInbox withdraw funds from l2 (L2MSG_signedTx)')

  const l2Network = await getL2Network(await l2Wallet.getChainId())

  /**
   * Here we have a arbsys abi to withdraw our funds; we'll be setting it by sending it as a message from delayed inbox!!!
   */

  const arbSys = ArbSys__factory.connect(ARB_SYS_ADDRESS, l2Provider)

  const arbsysIface = arbSys.interface
  const calldatal2 = arbsysIface.encodeFunctionData('withdrawEth', [
    l1Wallet.address,
  ])

  /**
   * Encode the l2's signed tx so this tx can be executed on l2
   */
  const l2GasPrice = (await l2Provider.getGasPrice()).mul(11).div(10)

  const transactionl2Request = {
    data: calldatal2,
    to: ARB_SYS_ADDRESS,
    nonce: await l2Wallet.getTransactionCount(),
    value: 1, // 1 is needed because if we set 0 will affect the gas estimate
    gasPrice: l2GasPrice,
    chainId: l2Wallet.chainId,
    from: l2Wallet.address,
  }
  let l2GasLimit

  try {
    l2GasLimit = (await estimateGasWithoutL1Part(transactionl2Request)).mul(2)
  } catch (error) {
    console.error(
      "execution failed (estimate gas failed), try check your account's balance?"
    )
  }

  transactionl2Request.gasLimit = l2GasLimit

  const l2Balance = await l2Provider.getBalance(l2Wallet.address)

  /**
   * We need to check if the sender has enough funds on l2 to pay the gas fee, if have enough funds, the get the other part funds to withdraw.
   */
  if (l2Balance.lt(l2GasPrice.mul(l2GasLimit))) {
    console.log(
      'You l2 balance is not enough to pay the gas fee, please bridge some ethers to l2.'
    )
    return
  } else {
    transactionl2Request.value = l2Balance.sub(l2GasPrice.mul(l2GasLimit))
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

  console.log(`Withdraw txn initiated on L1! 🙌 ${inboxRec.transactionHash}`)

  /**
   * Now we successfully send the tx to l1 delayed inbox, then we need to wait the tx executed on l2
   */
  console.log(
    `Now we need to wait tx: ${l2Txhash} to be included on l2 (may take 15 minutes, if longer than 30 minutes, you can use sdk to force include) ....... `
  )

  const l2TxReceipt = await l2Provider.waitForTransaction(l2Txhash)

  const status = l2TxReceipt.status
  if (status == true) {
    console.log(
      `L2 txn executed!!! 🥳 , you can go to https://bridge.arbitrum.io/ to withdraw your funds after challenge period!`
    )
  } else {
    console.log(`L2 txn failed, see if your gas is enough?`)
    return
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
