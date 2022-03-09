const { utils, providers, Wallet, BigNumber } = require('ethers')
const { ethers } = require('hardhat')
const { EthBridger, getL2Network, L1ToL2MessageStatus }  = require ('arb-ts')
const { parseEther } = utils
const { expect } = require('chai')
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
  const wait = (ms = 0) => {
    return new Promise(res => setTimeout(res, ms))}



  //await arbLog('Deposit Eth via arb-ts')

  /**
   * Use l2Network to create an arb-ts EthBridger instance
   * We'll use EthBridger for its convenience methods around transferring ETH to L2
   */
  const l2Network = await getL2Network(l2Provider)
  const ethBridger = new EthBridger(l2Network)
  const inboxAddress = ethBridger.l2Network.ethBridge.inbox

  /**
   * First, let's check the l2Wallet's initial ETH balance (before deposit txn)
   */
  const l2WalletInitialEthBalance = await l2Wallet.getBalance()

  /**
   * Deploy the Deposit smart contract on L1
   * We give the Deposit contract the inbox address so that the contract can call the Inbox directly and create retryable tickets
   */
  const L1Deposit = await (
    await ethers.getContractFactory('Deposit')
  ).connect(l1Wallet)
  const l1Deposit = await L1Deposit.deploy(inboxAddress)

  console.log('Deploying Deposit contract to L1')
  await l1Deposit.deployed()
  console.log(`Deposit contract is deployed to ${l1Deposit.address} on L1`)

  /**
   * We call the depositEther function from the Deposit contract, which in turn will create a retryable ticket.
   * MaxSubmissionCost is passed as an argument: this is amount of ETH allocated to pay for the base submission fee (we just hard-code a large value). This is required for any retryable ticket.
   * The value gets forwarded as the amount of Ether to deposit onto L2.
   */
  const depositTx = await l1Deposit.depositEther(
    BigNumber.from(10000000000000),
    { value: ethToL2DepositAmount }
  )

  const depositRec = await depositTx.wait()
  console.warn('deposit L1 receipt is:', depositRec.transactionHash)
  
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
      console.log(`balance updated!  ${l2WalletUpdatedEthBalance.toString()}`)
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
