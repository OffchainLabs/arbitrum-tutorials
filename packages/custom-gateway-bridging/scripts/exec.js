const { ethers } = require('hardhat')
const { providers, Wallet, BigNumber } = require('ethers')
const {
  getL2Network,
  addDefaultLocalNetwork,
  L1ToL2MessageStatus,
} = require('@arbitrum/sdk')
const {
  arbLog,
  arbLogTitle,
  requireEnvVariables,
} = require('arb-shared-dependencies')
const {
  AdminErc20Bridger,
  Erc20Bridger,
} = require('@arbitrum/sdk/dist/lib/assetBridger/erc20Bridger')
const { expect } = require('chai')
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
 * Set the initial supply of L1 token that we want to bridge
 * Note that you can change the value.
 * We also set the amount we want to send in the test deposit
 */
const premint = ethers.utils.parseEther('1000')
const tokenAmountToDeposit = BigNumber.from(50)

const main = async () => {
  await arbLog(
    'Setting up your token with a custom gateway using Arbitrum SDK library'
  )

  /**
   * Add the default local network configuration to the SDK
   * to allow this script to run on a local node
   */
  addDefaultLocalNetwork()

  /**
   * Use l2Network to create an Arbitrum SDK AdminErc20Bridger instance
   * We'll use AdminErc20Bridger for its convenience methods around registering tokens to a custom gateway
   */
  const l2Network = await getL2Network(l2Provider)
  const erc20Bridger = new Erc20Bridger(l2Network)
  const adminTokenBridger = new AdminErc20Bridger(l2Network)
  const l1Router = l2Network.tokenBridge.l1GatewayRouter
  const l2Router = l2Network.tokenBridge.l2GatewayRouter
  const inbox = l2Network.ethBridge.inbox

  arbLogTitle('Deployment of custom gateways and tokens')

  /**
   * Deploy our custom gateway to L1
   */
  const L1CustomGateway = await await ethers.getContractFactory(
    'L1CustomGateway',
    l1Wallet
  )
  console.log('Deploying custom gateway to L1')
  const l1CustomGateway = await L1CustomGateway.deploy(l1Router, inbox)
  await l1CustomGateway.deployed()
  console.log(`Custom gateway is deployed to L1 at ${l1CustomGateway.address}`)
  const l1CustomGatewayAddress = l1CustomGateway.address

  /**
   * Deploy our custom gateway to L2
   */
  const L2CustomGateway = await await ethers.getContractFactory(
    'L2CustomGateway',
    l2Wallet
  )
  console.log('Deploying custom gateway to L2')
  const l2CustomGateway = await L2CustomGateway.deploy(l2Router)
  await l2CustomGateway.deployed()
  console.log(`Custom gateway is deployed to L2 at ${l2CustomGateway.address}`)
  const l2CustomGatewayAddress = l2CustomGateway.address

  /**
   * Deploy our custom token smart contract to L1
   * We give the custom token contract the address of l1CustomGateway and l1GatewayRouter as well as the initial supply (premint)
   */
  const L1CustomToken = await await ethers.getContractFactory(
    'L1Token',
    l1Wallet
  )
  console.log('Deploying custom token to L1')
  const l1CustomToken = await L1CustomToken.deploy(
    l1CustomGatewayAddress,
    l1Router,
    premint
  )
  await l1CustomToken.deployed()
  console.log(`custom token is deployed to L1 at ${l1CustomToken.address}`)

  /**
   * Deploy our custom token smart contract to L2
   * We give the custom token contract the address of l2CustomGateway and our l1CustomToken
   */
  const L2CustomToken = await await ethers.getContractFactory(
    'L2Token',
    l2Wallet
  )
  console.log('Deploying custom token to L2')
  const l2CustomToken = await L2CustomToken.deploy(
    l2CustomGatewayAddress,
    l1CustomToken.address
  )
  await l2CustomToken.deployed()
  console.log(`custom token is deployed to L2 at ${l2CustomToken.address}`)

  /**
   * Set the token bridge information on the custom gateways
   * (This is an optional step that depends on your configuration. In this example, we've added one-shot
   * functions on the custom gateways to set the token bridge addresses in a second step. This could be
   * avoided if you are using proxies or the opcode CREATE2 for example)
   */
  console.log('Setting token bridge information on L1CustomGateway:')
  const setTokenBridgeInfoOnL1 =
    await l1CustomGateway.setTokenBridgeInformation(
      l1CustomToken.address,
      l2CustomToken.address,
      l2CustomGatewayAddress
    )

  const setTokenBridgeInfoOnL1Rec = await setTokenBridgeInfoOnL1.wait()
  console.log(
    `Token bridge information set on L1CustomGateway! L1 receipt is: ${setTokenBridgeInfoOnL1Rec.transactionHash}`
  )

  console.log('Setting token bridge information on L2CustomGateway:')
  const setTokenBridgeInfoOnL2 =
    await l2CustomGateway.setTokenBridgeInformation(
      l1CustomToken.address,
      l2CustomToken.address,
      l1CustomGatewayAddress
    )

  const setTokenBridgeInfoOnL2Rec = await setTokenBridgeInfoOnL2.wait()
  console.log(
    `Token bridge information set on L2CustomGateway! L2 receipt is: ${setTokenBridgeInfoOnL2Rec.transactionHash}`
  )

  /**
   * Register the custom gateway as the gateway of our custom token
   */
  console.log('Registering custom token on L2:')
  const registerTokenTx = await adminTokenBridger.registerCustomToken(
    l1CustomToken.address,
    l2CustomToken.address,
    l1Wallet,
    l2Provider
  )

  const registerTokenRec = await registerTokenTx.wait()
  console.log(
    `Registering token txn confirmed on L1! 🙌 L1 receipt is: ${registerTokenRec.transactionHash}.`
  )
  console.log(
    `Waiting for L2 retryable (takes 10-15 minutes); current time: ${new Date().toTimeString()})`
  )

  /**
   * The L1 side is confirmed; now we listen and wait for the L2 side to be executed; we can do this by computing the expected txn hash of the L2 transaction.
   * To compute this txn hash, we need our message's "sequence numbers", unique identifiers of each L1 to L2 message.
   * We'll fetch them from the event logs with a helper method.
   */
  const l1ToL2Msgs = await registerTokenRec.getL1ToL2Messages(l2Provider)

  /**
   * In this case, the registerTokenOnL2 method creates 1 L1-to-L2 messages to set the L1 token to the Custom Gateway via the Router
   * Here, We check if that message is redeemed on L2
   */
  expect(l1ToL2Msgs.length, 'Should be 1 message.').to.eq(1)

  const setGateways = await l1ToL2Msgs[0].waitForStatus()
  expect(setGateways.status, 'Set gateways not redeemed.').to.eq(
    L1ToL2MessageStatus.REDEEMED
  )

  console.log(
    'Your custom token and gateways are now registered on the token bridge 🥳!'
  )

  /**
   * We now test a deposit to verify the gateway is working as intended
   */
  arbLogTitle('Test deposit')

  const expectedL1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
    l1CustomToken.address,
    l1Provider
  )
  expect(
    expectedL1GatewayAddress,
    `Expected L1 gateway address is not right: ${expectedL1GatewayAddress} but expected ${l1CustomGatewayAddress}`
  ).to.eq(l1CustomGatewayAddress)

  const initialBridgeTokenBalance = await l1CustomToken.balanceOf(
    expectedL1GatewayAddress
  )

  /**
   * Because the token might have decimals, we update the amount to deposit taking into account those decimals
   */
  const tokenDecimals = await l1CustomToken.decimals()
  const tokenDepositAmount = tokenAmountToDeposit.mul(
    BigNumber.from(10).pow(tokenDecimals)
  )

  /**
   * Approving the l1CustomGateway to transfer the tokens being deposited
   */
  console.log('Approving L1CustomGateway:')
  const approveTx = await erc20Bridger.approveToken({
    l1Signer: l1Wallet,
    erc20L1Address: l1CustomToken.address,
  })

  const approveRec = await approveTx.wait()
  console.log(
    `You successfully allowed the Arbitrum Bridge to spend L1Token. Tx hash: ${approveRec.transactionHash}`
  )

  /**
   * Deposit L1Token to L2 using erc20Bridger. This will escrow funds in the custom gateway contract on L1, and send a message to mint tokens on L2
   */
  console.log('Transferring L1Token to L2:')
  const depositTx = await erc20Bridger.deposit({
    amount: tokenDepositAmount,
    erc20L1Address: l1CustomToken.address,
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
  const finalBridgeTokenBalance = await l1CustomToken.balanceOf(
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
   * Check if our l2Wallet DappToken balance has been updated correctly
   * To do so, we use erc20Bridger to get the l2Token address and contract
   */
  const l2TokenAddress = await erc20Bridger.getL2ERC20Address(
    l1CustomToken.address,
    l1Provider
  )
  expect(
    l2TokenAddress,
    `Expected L2 token address is not right: ${l2TokenAddress} but expected ${l2CustomToken.address}`
  ).to.eq(l2CustomToken.address)

  const testWalletL2Balance = await l2CustomToken.balanceOf(l2Wallet.address)
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
