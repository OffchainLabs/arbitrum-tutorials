const { providers, Wallet, ethers } = require('ethers')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const { getL2Network } = require('@arbitrum/sdk/dist/lib/dataEntities/networks')
const { InboxTools } = require('@arbitrum/sdk')
const {
  ArbSys__factory,
} = require('@arbitrum/sdk/dist/lib/abi/factories/ArbSys__factory')

const {
  ARB_SYS_ADDRESS,
} = require('@arbitrum/sdk/dist/lib/dataEntities/constants')
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */
const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

const main = async () => {
  await arbLog('DelayedInbox withdraw funds from l2 (L2MSG_signedTx)')

  const l2Network = await getL2Network(await l2Wallet.getChainId())

  const inboxSdk = new InboxTools(l1Wallet, l2Network)

  /**
   * Here we have a arbsys abi to withdraw our funds; we'll be setting it by sending it as a message from delayed inbox!!!
   */

  const arbSys = ArbSys__factory.connect(ARB_SYS_ADDRESS, l2Provider)

  const arbsysIface = arbSys.interface
  const calldatal2 = arbsysIface.encodeFunctionData('withdrawEth', [
    l1Wallet.address,
  ])

  const transactionl2Request = {
    data: calldatal2,
    to: ARB_SYS_ADDRESS,
    value: 1, // Only set 1 wei since it just a test tutorial, you can set whatever you want in real runtime.
  }

  /**
   * We need extract l2's tx hash first so we can check if this tx executed on l2 later.
   */
  const l2SignedTx = await inboxSdk.signL2Tx(transactionl2Request, l2Wallet)

  const l2Txhash = ethers.utils.parseTransaction(l2SignedTx).hash

  const resultsL1 = await inboxSdk.sendL2SignedTx(l2SignedTx)

  const inboxRec = await resultsL1.wait()

  console.log(`Withdraw txn initiated on L1! 🙌 ${inboxRec.transactionHash}`)

  /**
   * Now we successfully send the tx to l1 delayed inbox, then we need to wait the tx executed on l2
   */
  console.log(
    `Now we need to wait tx: ${l2Txhash} to be included on l2 (may take 15 minutes, if longer than 1 day, you can use sdk to force include) ....... `
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