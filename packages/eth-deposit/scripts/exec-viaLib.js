const { utils, providers, Wallet } = require('ethers')
const { EthBridger, getL2Network, L1ToL2MessageStatus} = require("arb-ts")
const { parseEther } = utils
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()
requireEnvVariables(['DEVNET_PRIVKEY', 'L1RPC', 'L2RPC'])


/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */

const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
 
const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

/**
 * Set the amount to be deposited in L2 (in wei)
 */
const ethToL2DepositAmount = parseEther('0.0001')

const main = async () => {

  /**
   * Use l2Network to create an arb-ts EthBridger instance
   * We'll use EthBridger for its convenience methods around depositing ETH to L2
   */

  const l2Network = await getL2Network(l2Provider)
  const ethBridge = new EthBridger(l2Network)

  /**
   * First, let's check the l2Wallet initial ETH balance
   */
  const l2WalletInitialEthBalance = await l2Wallet.getBalance()

  /**
   * transfer ether from L1 to L2
   * This convenience method automatically queries for the retryable's max submission cost and forwards the appropriate amount to L2
   * Arguments required are: 
   * (1) amount: The amount of ETH to be deposited
   * (2) l1Sifner: The L1 address transferiinf ETH to L2
   * (3) l2Provider: An l2 provider
   */

  const depositTx = await ethBridge.deposit({
    amount: ethToL2DepositAmount,
    l1Signer: l1Wallet,
    l2Provider: l2Provider
  })

  const depositRec = await depositTx.wait()
  console.warn('deposit L1 receipt is:', depositRec.transactionHash)
  
  /**
   * With the transaction confirmed on L1, we now wait and check for the L2 side (i.e., balance credited to L2) to be confirmed as well.
   * First, we get our our L1-to-L2 message
   */

  const l1ToL2Msg = await depositRec.getL1ToL2Message(l2Wallet)

  /**
   * ... and now we wait. Here we're waiting for the Sequencer to include the L2 message in its off-chain queue. The Sequencer should include it in under 10 minutes.
   */
  
  console.warn('Now we wait for L2 side of the transaction to be executed ⏳')

  const l1ToL2MsgState = await l1ToL2Msg.wait()
  /**
   * Here we get the status of our L2 transaction.
   * If it is REDEEMED (i.e., succesfully executed), our L2 balance should be updated
   */

  console.log(l1ToL2MsgState.status.toString())
  // if (l1ToL2MsgState.status == L1ToL2MessageStatus.REDEEMED) {

  //   console.log(`L2 transaction is now executed! ${l1ToL2MsgState.l2TxReceipt}`)
  //   const l2WalletUpdatedEthBalance = await l2Wallet.getBalance()

  //   console.log(
  //     `your L2 balance is updated from ${l2WalletInitialEthBalance.toString()} to ${l2WalletUpdatedEthBalance.toString()}`
  //   )
  // } 
  
  // else { 
  //   console.log(`L2 transaction failed!`)
  // }

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
})