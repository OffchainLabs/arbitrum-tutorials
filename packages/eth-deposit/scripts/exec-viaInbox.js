const { utils, providers, Wallet } = require('ethers')
const { EthBridger, getL2Network } = require ('arb-ts')
const { parseEther } = utils
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const { IInbox__factory } = require('arb-ts/dist/lib/abi')
const {expect} = require ('chai')
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
 * Set the amount to be depositted in L2 (in wei)
 */
const ethToL2DepositAmount = parseEther('0.0001')

const main = async () => {
  await arbLog('Deposit Eth via the Inbox')

  const wait = (ms = 0) => {
    return new Promise(res => setTimeout(res, ms))}

  /**
   * Use l2Network to create an arb-ts EthBridger instance
   * We'll use EthBridger for its convenience methods around transferring ETH to L2
   */
   const l2Network = await getL2Network(l2Provider)
   const ethBridger = new EthBridger(l2Network)
   const inboxAddress = ethBridger.l2Network.ethBridge.inbox
   

  /**
   * First, let's check the l2Wallet initial ETH balance (before our deposit)
   */
  const l2WalletInitialEthBalance = await l2Wallet.getBalance()

  /**
   * To transfer ETH to L2 directly through the Inbox, we first create an instance of this contract
   */
  const inbox = IInbox__factory.connect(inboxAddress, l1Wallet)
  const initialInboxBalance = await l1Provider.getBalance(inboxAddress)
  /**
   * Call the depositEth() function from the Inbox contract
   * Pass the MaxSubmissionCost as argument: amount of ETH allocated to pay for the base submission fee (we hard code a large value). The value is the amount to forwarded as an L2 deposit
   * Note that depositEth creates a retryable with l2 gas price and l2 gas limit set to zero; we're only using the retryable mechanism to forward the callvalue to our destination
   */
  const depositTx = await inbox.depositEth(10000000000000, {
    value: ethToL2DepositAmount,
  })
  const depositRec = await depositTx.wait()
  console.warn('deposit L1 receipt is:', depositRec.transactionHash)
  
  /**
   * We check if inbox ETH balance is properly updated
   */
  const finalInboxBalance = await l1Provider.getBalance(inboxAddress)
  expect(
    initialInboxBalance.add(ethToL2DepositAmount).eq(finalInboxBalance),
    'balance failed to update after eth deposit'
  )

  /**
   * Now we wait for L1 and L2 side of transactions to be confirmed
   */
   console.log(
    `Deposit initiated: waiting for L2 retryable (takes < 10 minutes; current time: ${new Date().toTimeString()}) `
  )

  /**
   * We check if l2Wallet ETH balance is properly updated after the deposit
   */
  for (let i = 0; i < 60; i++) {
    console.log('balance check attempt ' + (i + 1))
    await wait(50000)
    const l2WalletUpdatedEthBalance = await l2Wallet.getBalance()
    if (l2WalletUpdatedEthBalance.gt(l2WalletInitialEthBalance)) {
      console.log(`balance updated! ${l2WalletUpdatedEthBalance.toString()}`)
      expect(true).to.be.true
      return
      break
    }
  }
 
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
