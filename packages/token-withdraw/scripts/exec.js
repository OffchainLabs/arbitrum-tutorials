const { ethers } = require('hardhat')
const { BigNumber, providers, Wallet } = require('ethers')
const {
  getArbitrumNetwork,
  ParentToChildMessageStatus,
  Erc20Bridger,
} = require('@arbitrum/sdk')
const {
  arbLog,
  requireEnvVariables,
  addCustomNetworkFromFile,
} = require('arb-shared-dependencies')
const { expect } = require('chai')
require('dotenv').config()
requireEnvVariables(['PRIVATE_KEY', 'CHAIN_RPC', 'PARENT_CHAIN_RPC'])

/**
 * Set up: instantiate wallets connected to providers
 */
const walletPrivateKey = process.env.PRIVATE_KEY

const parentChainProvider = new providers.JsonRpcProvider(
  process.env.PARENT_CHAIN_RPC
)
const childChainProvider = new providers.JsonRpcProvider(process.env.CHAIN_RPC)

const parentChainWallet = new Wallet(walletPrivateKey, parentChainProvider)
const childChainWallet = new Wallet(walletPrivateKey, childChainProvider)

/**
 * Set the amount of token to be transferred to the child chain and then withdrawn
 */
const tokenAmount = BigNumber.from(50)
const tokenAmountToWithdraw = BigNumber.from(20)

const main = async () => {
  await arbLog('Withdraw tokens using Arbitrum SDK')

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile()

  /**
   * For the purpose of our tests, here we deploy an standard ERC-20 token (DappToken) to the parent chain
   * It sends its deployer (us) the initial supply of 1000
   */
  console.log('Deploying the test DappToken to the parent chain:')
  const DappToken = (await ethers.getContractFactory('DappToken')).connect(
    parentChainWallet
  )
  const dappToken = await DappToken.deploy(1000)
  await dappToken.deployed()
  console.log(
    `DappToken is deployed to the parent chain at ${dappToken.address}`
  )
  const tokenAddress = dappToken.address

  /**
   * Use childChainNetwork to create an Arbitrum SDK Erc20Bridger instance
   * We'll use Erc20Bridger for its convenience methods around transferring token to the child chain
   */
  const childChainNetwork = await getArbitrumNetwork(childChainProvider)
  const erc20Bridger = new Erc20Bridger(childChainNetwork)

  /**
   * Because the token might have decimals, we update the amounts to deposit and withdraw taking into account those decimals
   */
  const tokenDecimals = await dappToken.decimals()
  const tokenDepositAmount = tokenAmount.mul(
    BigNumber.from(10).pow(tokenDecimals)
  )
  const tokenWithdrawAmount = tokenAmountToWithdraw.mul(
    BigNumber.from(10).pow(tokenDecimals)
  )

  /**
   * The StandardGateway contract will ultimately be making the token transfer call; thus, that's the contract we need to approve.
   * erc20Bridger.approveToken handles this approval
   * Arguments required are:
   * (1) parentSigner: address of the account on the parent chain transferring tokens to the child chain
   * (2) erc20ParentAddress: address on the parent chain of the ERC-20 token to be depositted to the child chain
   */
  console.log('Approving:')
  const approveTransaction = await erc20Bridger.approveToken({
    parentSigner: parentChainWallet,
    erc20ParentAddress: tokenAddress,
  })

  const approveTransactionReceipt = await approveTransaction.wait()
  console.log(
    `You successfully allowed the Arbitrum Bridge to spend DappToken ${approveTransactionReceipt.transactionHash}`
  )

  /**
   * The next function initiates the deposit of DappToken to the child chain using erc20Bridger.
   * This will escrow funds in the gateway contract on the parent chain, and send a message to mint tokens on the child chain.
   *
   * The erc20Bridge.deposit method handles computing the necessary fees for automatic-execution of retryable tickets — maxSubmission cost and (gas price * gas)
   * and will automatically forward the fees to the child chain as callvalue.
   *
   * Also note that since this is the first DappToken deposit onto the child chain, a standard Arb ERC-20 contract will automatically be deployed.
   * Arguments required are:
   * (1) amount: The amount of tokens to be transferred to the child chain
   * (2) erc20ParentAddress: address on the parent chain of the ERC-20 token to be depositted to the child chain
   * (3) parentSigner: address of the account on the parent chain transferring tokens to the child chain
   * (4) childProvider: A provider for the child chain
   */
  console.log('Transferring DappToken to the child chain:')
  const depositTransaction = await erc20Bridger.deposit({
    amount: tokenDepositAmount,
    erc20ParentAddress: tokenAddress,
    parentSigner: parentChainWallet,
    childProvider: childChainProvider,
  })

  /**
   * Now we wait for both the parent-chain and child-chain sides of transactions to be confirmed
   */
  console.log(
    `Deposit initiated: waiting for execution of the retryable ticket on the child chain (takes 10-15 minutes; current time: ${new Date().toTimeString()}) `
  )
  const depositTransactionReceipt = await depositTransaction.wait()
  const childTransactionReceipt =
    await depositTransactionReceipt.waitForChildTransactionReceipt(
      childChainProvider
    )

  /**
   * The `complete` boolean tells us if the parent-to-child message was successful
   */
  if (childTransactionReceipt.complete) {
    console.log(
      `Message was successfully executed on the child chain: status: ${
        ParentToChildMessageStatus[childTransactionReceipt.status]
      }`
    )
  } else {
    throw new Error(
      `Message failed to be executed on the child chain: status ${
        ParentToChildMessageStatus[childTransactionReceipt.status]
      }`
    )
  }
  console.log(`Setup complete`)

  /**
   * Now we begin withdrawing DappToken from the child chain.
   * To withdraw, we'll use Erc20Bridger helper method withdraw which will call the GatewayRouter of the child chain
   * to initiate a withdrawal via the Standard ERC-20 gateway.
   * This transaction is constructed and paid for like any other transaction (it just happens to (ultimately) make a call to ArbSys.sendTxToL1)
   *
   * Arguments required are:
   * (1) amount: The amount of tokens to be transferred to the parent chain
   * (2) erc20ParentAddress: address on the parent chain of the ERC-20 token to be depositted to the parent chain
   * (3) childSigner: address of the account on the child chain transferring tokens to the parent chain
   */
  console.log('Withdrawing...')
  const withdrawTransaction = await erc20Bridger.withdraw({
    amount: tokenWithdrawAmount,
    destinationAddress: childChainWallet.address,
    erc20ParentAddress: tokenAddress,
    childSigner: childChainWallet,
  })
  const withdrawTransactionReceipt = await withdrawTransaction.wait()
  console.log(
    `Token withdrawal initiated! 🥳 ${withdrawTransactionReceipt.transactionHash}`
  )

  /**
   * And with that, our withdrawal is initiated! No additional time-sensitive actions are required.
   * Any time after the transaction's assertion is confirmed (around 7 days by default),
   * funds can be transferred out of the bridge via the outbox contract
   * We'll check our wallet's DappToken balance here:
   */
  const childChainTokenAddress = await erc20Bridger.getChildErc20Address(
    tokenAddress,
    parentChainProvider
  )
  const childChainToken = erc20Bridger.getChildTokenContract(
    childChainProvider,
    childChainTokenAddress
  )

  const testWalletBalanceOnChildChain = (
    await childChainToken.functions.balanceOf(childChainWallet.address)
  )[0]

  expect(
    testWalletBalanceOnChildChain
      .add(tokenWithdrawAmount)
      .eq(tokenDepositAmount),
    'token withdraw balance not deducted'
  ).to.be.true

  console.log(
    `To to claim funds (after dispute period), see outbox-execute repo and use this transaction hash: ${withdrawTransactionReceipt.transactionHash}`
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
