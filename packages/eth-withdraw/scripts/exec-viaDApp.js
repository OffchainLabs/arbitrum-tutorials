const { utils, providers, Wallet } = require('ethers')
const { ethers } = require('hardhat')
const { BridgeHelper } = require('arb-ts')
const { parseEther } = utils
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()

requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC'])

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
  await arbLog('Withdraw Eth through DApp')
  /**
   * Use wallets to create an arb-ts bridge instance
   * We'll use bridge for convenience methods
   */

  /**
   * First, let's check our L2 wallet's initial ETH balance and ensure there's some ETH to withdraw
   */
  const l2WalletInitialEthBalance = await l2Provider.getBalance(
    l2Wallet.address
  )

  if (l2WalletInitialEthBalance.lt(ethFromL2WithdrawAmount)) {
    console.log(
      `Oops - not enough ether; fund your account L2 wallet currently ${l2Wallet.address} with at least 0.000001 ether`
    )
    process.exit(1)
  }
  console.log('Wallet properly funded: initiating withdrawal now')

  /**
   * We'll deploy a contract which we'll use to trigger an Ether withdrawal
   */

  const L2Withdraw = await (
    await ethers.getContractFactory('Withdraw')
  ).connect(l2Wallet)
  const l2Withdraw = await L2Withdraw.deploy()
  console.log('Deploying Withdraw contract to L2')
  await l2Withdraw.deployed()
  console.log(`Withdraw contract deployed to: ${l2Withdraw.address}`)

  /**
   * Now we can call our contracts withdrawEth method, which in turn will initiate a withdrawal:
   */
  const withdrawTx = await l2Withdraw.withdrawEth(l1Wallet.address, {
    value: ethFromL2WithdrawAmount,
  })
  const withdrawRec = await withdrawTx.wait()

  /**
   * And with that, our withdrawal is initiated! No additional time-sensitive actions are required.
   * Any time after the transaction's assertion is confirmed, funds can be transferred out of the bridge via the outbox contract
   * We'll display the withdrawals event data here:
   */

  const withdrawEventData = (
    await BridgeHelper.getWithdrawalsInL2Transaction(withdrawRec, l2Provider)
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
