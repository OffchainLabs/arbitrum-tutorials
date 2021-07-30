const { BigNumber, providers, Wallet } = require('ethers')
const { ethers } = require('hardhat')
const { Bridge } = require('arb-ts')
const { arbLog } = require('arb-shared-dependencies')
require('dotenv').config()

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
 * Set the amount of token to be deposited and then withdrawn
 */
const tokenDepositAmount = BigNumber.from(50)
const tokenWithdrawAmount = BigNumber.from(20)

const main = async () => {
  await arbLog('Withdraw token')
  /**
   * Use wallets to create an arb-ts bridge instance
   */
  const bridge = await Bridge.init(l1Wallet, l2Wallet)

  /**
   * Setup: we'll deploy a token contract, then approve and deposit onto L2 so we have some coin to withdraw
   * (For play-by-play details on the deposit flow, see token_deposit repo)
   */

  console.log('Deploying token:')
  const L1DappToken = await (
    await ethers.getContractFactory('DappToken')
  ).connect(l1Wallet)
  const l1DappToken = await L1DappToken.deploy(1000000000000000)
  await l1DappToken.deployed()
  console.log('Deployed! Approving:')

  const erc20Address = l1DappToken.address
  const approveTx = await bridge.approveToken(erc20Address)
  await approveTx.wait()
  console.log('Approved! Depositing:')

  const depositTx = await bridge.deposit(erc20Address, tokenDepositAmount)
  const depositRec = await depositTx.wait()
  console.log(
    `Deposit initiated: waiting for L2 retryable (takes < 10 minutes; current time: ${new Date().toTimeString()}) `
  )

  const seqNumArr = await bridge.getInboxSeqNumFromContractTransaction(
    depositRec
  )
  const seqNum = seqNumArr[0]
  const l2TxHash = await bridge.calculateL2RetryableTransactionHash(seqNum)

  //Now, we have to wait for the L2 tx to go through
  await l2Provider.waitForTransaction(l2TxHash, undefined, 1000 * 60 * 12)
  const l2Data = await bridge.getAndUpdateL2TokenData(erc20Address)
  const l2WalletTokenBalance = l2Data && l2Data.ERC20 && l2Data.ERC20.balance

  console.log(
    `Setup complete: your l2Wallet has ${l2WalletTokenBalance.toString()} DappToken now!`
  )
  console.log('Withdrawing:')

  /**
   * ... Okay, Now we begin withdrawing DappToken from L2. To withdraw, we'll use the arb-ts helper method withdrawERC20
   * withdrawERC20 will call our L2 Gateway Router to initiate a withdrawal via the Standard ERC20 gateway
   * This transaction is constructed and paid for like any other L2 transaction (it just happens to (ultimately) make a call to ArbSys.sendTxToL1)
   */

  const withdrawTx = await bridge.withdrawERC20(
    erc20Address,
    tokenWithdrawAmount
  )
  const withdrawRec = await withdrawTx.wait()

  /**
   * And with that, our withdrawal is initiated! No additional time-sensitive actions are required.
   * Any time after the transaction's assertion is confirmed, funds can be transferred out of the bridge via the outbox contract
   * We'll display the withdrawals event data here:
   */

  const withdrawEventData = (
    await bridge.getWithdrawalsInL2Transaction(withdrawRec)
  )[0]

  console.log(`Token withdrawal initiated! 🥳 ${withdrawRec.transactionHash}`)
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
