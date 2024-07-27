const { ethers } = require('hardhat')
const { BigNumber, providers, Wallet } = require('ethers')
const { expect } = require('chai')
const {
  addDefaultLocalNetwork,
  getL2Network,
  Erc20Bridger,
  L1ToL2MessageStatus,
} = require('@arbitrum/sdk')
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
 * Set the amount of token to be transferred to L2 and then withdrawn
 */
const tokenAmount = BigNumber.from(50)
const tokenAmountToWithdraw = BigNumber.from(20)

const main = async () => {
  await arbLog('Withdraw token using Arbitrum SDK')

  /**
   * Add the default local network configuration to the SDK
   * to allow this script to run on a local node
   */
  addDefaultLocalNetwork()

  /**
   * For the purpose of our tests, here we deploy an standard ERC20 token (DappToken) to L1
   * It sends its deployer (us) the initial supply of 1000
   */
  console.log('Deploying the test DappToken to L1:')
  const L1DappToken = await (
    await ethers.getContractFactory('DappToken')
  ).connect(l1Wallet)
  const l1DappToken = await L1DappToken.deploy(1000000000000000)
  await l1DappToken.deployed()
  console.log(`DappToken is deployed to L1 at ${l1DappToken.address}`)
  const l1Erc20Address = l1DappToken.address

  /**
   * Use l2Network to create an Arbitrum SDK Erc20Bridger instance
   * We'll use Erc20Bridger for its convenience methods around transferring token to L2 and back to L1
   */
  const l2Network = await getL2Network(l2Provider)
  const erc20Bridger = new Erc20Bridger(l2Network)

  /**
   * Because the token might have decimals, we update the amounts to deposit and withdraw taking into account those decimals
   */
  const tokenDecimals = await l1DappToken.decimals()
  const tokenDepositAmount = tokenAmount.mul(
    BigNumber.from(10).pow(tokenDecimals)
  )
  const tokenWithdrawAmount = tokenAmountToWithdraw.mul(
    BigNumber.from(10).pow(tokenDecimals)
  )

  /**
   * The Standard Gateway contract will ultimately be making the token transfer call; thus, that's the contract we need to approve.
   * erc20Bridger.approveToken handles this approval
   * Arguments required are:
   * (1) l1Signer: The L1 address transferring token to L2
   * (2) erc20L1Address: L1 address of the ERC20 token to be deposited to L2
   */
  console.log('Approving:')
  const approveTx = await erc20Bridger.approveToken({
    l1Signer: l1Wallet,
    erc20L1Address: l1Erc20Address,
  })

  const approveRec = await approveTx.wait()
  console.log(
    `You successfully allowed the Arbitrum Bridge to spend DappToken ${approveRec.transactionHash}`
  )

  /**
   * Deposit DappToken to L2 using Erc20Bridger. This will escrow funds in the Gateway contract on L1, and send a message to mint tokens on L2.
   * The erc20Bridger.deposit method handles computing the necessary fees for automatic-execution of retryable tickets — maxSubmission cost & l2 gas price * gas — and will automatically forward the fees to L2 as callvalue
   * Also note that since this is the first DappToken deposit onto L2, a standard Arb ERC20 contract will automatically be deployed.
   * Arguments required are:
   * (1) amount: The amount of tokens to be transferred to L2
   * (2) erc20L1Address: L1 address of the ERC20 token to be deposited to L2
   * (2) l1Signer: The L1 address transferring token to L2
   * (3) l2Provider: An l2 provider
   */
  console.log('Transferring DappToken to L2:')
  const depositTx = await erc20Bridger.deposit({
    amount: tokenDepositAmount,
    erc20L1Address: l1Erc20Address,
    l1Signer: l1Wallet,
    l2Provider: l2Provider,
  })

  /**
   * Now we wait for L1 and L2 side of transactions to be confirmed
   */
  console.log(
    `Deposit initiated: waiting for L2 retryable (takes 10-15 minutes; current time: ${new Date().toTimeString()}) `
  )
  const depositRec = await depositTx.wait()
  const l2Result = await depositRec.waitForL2(l2Provider)
  console.log(`Setup complete`)
  /**
   * The `complete` boolean tells us if the l1 to l2 message was successful
   */
  l2Result.complete
    ? console.log(
        `L2 message successful: status: ${L1ToL2MessageStatus[l2Result.status]}`
      )
    : console.log(
        `L2 message failed: status ${L1ToL2MessageStatus[l2Result.status]}`
      )

  /**
   * ... Okay, Now we begin withdrawing DappToken from L2. To withdraw, we'll use Erc20Bridger helper method withdraw
   * withdraw will call our L2 Gateway Router to initiate a withdrawal via the Standard ERC20 gateway
   * This transaction is constructed and paid for like any other L2 transaction (it just happens to (ultimately) make a call to ArbSys.sendTxToL1)
   * Arguments required are:
   * (1) amount: The amount of tokens to be transferred to L1
   * (2) erc20L1Address: L1 address of the ERC20 token
   * (3) l2Signer: The L2 address transferring token to L1
   */
  console.log('Withdrawing:')
  const withdrawTx = await erc20Bridger.withdraw({
    amount: tokenWithdrawAmount,
    destinationAddress: l2Wallet.address,
    erc20l1Address: l1Erc20Address,
    l2Signer: l2Wallet,
  })
  const withdrawRec = await withdrawTx.wait()
  console.log(`Token withdrawal initiated! 🥳 ${withdrawRec.transactionHash}`)

  /**
   * And with that, our withdrawal is initiated! No additional time-sensitive actions are required.
   * Any time after the transaction's assertion is confirmed (around 7 days), funds can be transferred out of the bridge via the outbox contract
   * We'll check our l2Wallet DappToken balance here:
   */
  const l2Token = erc20Bridger.getL2TokenContract(
    l2Provider,
    await erc20Bridger.getL2ERC20Address(l1Erc20Address, l1Provider)
  )

  const l2WalletBalance = (
    await l2Token.functions.balanceOf(await l2Wallet.getAddress())
  )[0]

  expect(
    l2WalletBalance.add(tokenWithdrawAmount).eq(tokenDepositAmount),
    'token withdraw balance not deducted'
  ).to.be.true

  console.log(
    `To to claim funds (after dispute period), see outbox-execute repo 🤞🏻`
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
