const { utils, providers, Wallet } = require('ethers')
const { EthBridger, getL2Network, L2ToL1Message }  = require ('arb-ts')
const { parseEther } = utils
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */
const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

/**
 * Set the amount to be withdrawn from L2 (in wei)
 */
const ethFromL2WithdrawAmount = parseEther('0.000001')

const main = async () => {
  await arbLog('Withdraw Eth via arb-ts')

  /**
   * Use l2Network to create an arb-ts EthBridger instance
   * We'll use EthBridger for its convenience methods around transferring ETH from L2 to L1
   */

   const l2Network = await getL2Network(l2Provider)
   const ethBridger = new EthBridger(l2Network)

  /**
   * First, let's check our L2 wallet's initial ETH balance and ensure there's some ETH to withdraw
   */
  const l2WalletInitialEthBalance = await l2Wallet.getBalance()

  if (l2WalletInitialEthBalance.lt(ethFromL2WithdrawAmount)) {
    console.log(
      `Oops - not enough ether; fund your account L2 wallet currently ${l2Wallet.address} with at least 0.000001 ether`
    )
    process.exit(1)
  }
  console.log('Wallet properly funded: initiating withdrawal now')

  /**
   * We're ready to withdraw ETH using the ethBridger instance from arb-ts
   * It will use our current wallet's address as the default destination
   */

  const withdrawTx = await ethBridger.withdraw({
    amount: ethFromL2WithdrawAmount,
    l2Signer: l2Wallet
  })
  const withdrawRec = await withdrawTx.wait()

  /**
   * And with that, our withdrawal is initiated! No additional time-sensitive actions are required.
   * Any time after the transaction's assertion is confirmed, funds can be transferred out of the bridge via the outbox contract
   * We'll display the withdrawals event data here:
   */
  console.log(`Ether withdrawal initiated! 🥳 ${withdrawRec.transactionHash}`)

  const myAddress = await l1Wallet.getAddress()
  
  const withdrawEventsData = await L2ToL1Message.getL2ToL1MessageLogs(
    l2Provider,
    { fromBlock: withdrawRec.blockNumber, toBlock: 'latest' },
    undefined,
    myAddress
  )

  console.log('Withdrawal data:', withdrawEventsData)
  console.log(
    `To to claim funds (after dispute period), see outbox-execute repo ✌️`
  ) 
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
