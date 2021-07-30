const { utils, providers, Wallet } = require('ethers')
const { Bridge } = require('arb-ts')
const { parseEther } = utils

const { arbLog } = require('arb-shared-dependencies')

require('dotenv').config()
const wait = (ms = 0) => {
  return new Promise(res => setTimeout(res, ms || 1000))
}

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */
const infuraKey = process.env.INFURA_KEY
if (!infuraKey) throw new Error('No INFURA_KEY set.')

const walletPrivateKey = process.env.DEVNET_PRIVKEY
if (!walletPrivateKey) throw new Error('No DEVNET_PRIVKEY set.')

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
   * Use wallets to create an arb-ts bridge instance
   * We'll use bridge for convenience methods
   */
  const bridge = await Bridge.init(l1Wallet, l2Wallet)

  /**
   * First, let's check our L2 wallet's initial ETH balance and ensure there's some ETH to withdraw
   */
  const l2WalletInitialEthBalance = await bridge.getL2EthBalance()

  if (l2WalletInitialEthBalance.lt(ethFromL2WithdrawAmount)) {
    console.log(
      `Oops - not enough ether; fund your account L2 wallet currently ${l2Wallet.address} with at least 0.000001 ether`
    )
    process.exit(1)
  }
  console.log('Wallet properly funded: initiating withdrawal now')

  /**
   * We're ready to withdraw ETH using the bridge instance from arb-ts
   * It will use our current wallet's address as the default destination
   */

  const withdrawTx = await bridge.withdrawETH(ethFromL2WithdrawAmount)
  const withdrawRec = await withdrawTx.wait()

  /**
   * And with that, our withdrawal is initiated! No additional time-sensitive actions are required.
   * Any time after the transaction's assertion is confirmed, funds can be transferred out of the bridge via the outbox contract
   * We'll display the withdrawals event data here:
   */

  const withdrawEventData = (
    await bridge.getWithdrawalsInL2Transaction(withdrawRec)
  )[0]

  console.log(`Ether withdrawal initiated! 🥳 ${withdrawRec.transactionHash}`)
  console.log('Withdrawal data:', withdrawEventData)

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
