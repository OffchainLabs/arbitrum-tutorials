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

const partition1_short =
  "6973737565640000000000000000000000000000000000000000000000000000"; // issued in hex
const partition1 = "0x".concat(partition1_short);

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */
const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

/**
 * Set the amount of token to be transferred to L2
 */
const tokenAmount = BigNumber.from(50)

const main = async () => {
  await arbLog('Deposit token using Arbitrum SDK')

  /**
   * Add the default local network configuration to the SDK
   * to allow this script to run on a local node
   */
  addDefaultLocalNetwork()

  if (await l1Wallet.provider.getCode('0x1820a4b7618bde71dce8cdc73aab6c95905fad24') === '0x') {
    throw new Error("ERC1820REGISTRY not deployed")
  }

  /**
   * For the purpose of our tests, here we deploy an standard ERC20 token (ERC1400Token) to L1
   * It sends its deployer (us) the initial supply of 1000
   */
  console.log('Deploying the test ERC1400Token to L1:')
  const L1ERC1400Token = await (
    await ethers.getContractFactory('ERC1400Token')
  ).connect(l1Wallet)
  const l1ERC1400Token = await L1ERC1400Token.deploy(1000, [l1Wallet.address], [partition1])
  await l1ERC1400Token.deployed()
  console.log(`ERC1400Token is deployed to L1 at ${l1ERC1400Token.address}`)

  /**
   * Use l2Network to create an Arbitrum SDK Erc20Bridger instance
   * We'll use Erc20Bridger for its convenience methods around transferring token to L2
   */
  const l2Network = await getL2Network(l2Provider)
  const erc20Bridger = new Erc20Bridger(l2Network)

  /**
   * We get the address of L1 Gateway for our ERC1400Token, which later helps us to get the initial token balance of Bridge (before deposit)
   */
  const l1Erc20Address = l1ERC1400Token.address
  const expectedL1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
    l1Erc20Address,
    l1Provider
  )
  const initialBridgeTokenBalance = await l1ERC1400Token.balanceOf(
    expectedL1GatewayAddress
  )

  /**
   * Because the token might have decimals, we update the amount to deposit taking into account those decimals
   */
  const tokenDecimals = await l1ERC1400Token.decimals()
  const tokenDepositAmount = tokenAmount.mul(
    BigNumber.from(10).pow(tokenDecimals)
  )

  /**
   * The Standard Gateway contract will ultimately be making the token transfer call; thus, that's the contract we need to approve.
   * erc20Bridger.approveToken handles this approval
   * Arguments required are:
   * (1) l1Signer: The L1 address transferring token to L2
   * (2) erc20L1Address: L1 address of the ERC20 token to be depositted to L2
   */
  console.log('Approving:')
  const approveTx = await erc20Bridger.approveToken({
    l1Signer: l1Wallet,
    erc20L1Address: l1Erc20Address,
  })

  const approveRec = await approveTx.wait()
  console.log(
    `You successfully allowed the Arbitrum Bridge to spend ERC1400Token ${approveRec.transactionHash}`
  )

  /**
   * Deposit ERC1400Token to L2 using erc20Bridger. This will escrow funds in the Gateway contract on L1, and send a message to mint tokens on L2.
   * The erc20Bridge.deposit method handles computing the necessary fees for automatic-execution of retryable tickets — maxSubmission cost & l2 gas price * gas — and will automatically forward the fees to L2 as callvalue
   * Also note that since this is the first ERC1400Token deposit onto L2, a standard Arb ERC20 contract will automatically be deployed.
   * Arguments required are:
   * (1) amount: The amount of tokens to be transferred to L2
   * (2) erc20L1Address: L1 address of the ERC20 token to be depositted to L2
   * (2) l1Signer: The L1 address transferring token to L2
   * (3) l2Provider: An l2 provider
   */
  console.log('Transferring ERC1400Token to L2:')
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
   * Get the Bridge token balance
   */
  const finalBridgeTokenBalance = await l1ERC1400Token.balanceOf(
    expectedL1GatewayAddress
  )

  /**
   * Check if Bridge balance has been updated correctly
   */
  expect(
    initialBridgeTokenBalance
      .add(tokenDepositAmount)
      .eq(finalBridgeTokenBalance),
    'bridge balance not updated after L1 token deposit txn'
  ).to.be.true

  /**
   * Check if our l2Wallet ERC1400Token balance has been updated correctly
   * To do so, we use erc20Bridge to get the l2Token address and contract
   */
  const l2TokenAddress = await erc20Bridger.getL2ERC20Address(
    l1Erc20Address,
    l1Provider
  )
  const l2Token = erc20Bridger.getL2TokenContract(l2Provider, l2TokenAddress)

  const testWalletL2Balance = (
    await l2Token.functions.balanceOf(l2Wallet.address)
  )[0]
  expect(
    testWalletL2Balance.eq(tokenDepositAmount),
    'l2 wallet not updated after deposit'
  ).to.be.true
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
