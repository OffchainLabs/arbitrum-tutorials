const { ethers } = require('hardhat')
const { providers, Wallet } = require('ethers')
const {
  getL2Network,
  addDefaultLocalNetwork,
  L1ToL2MessageStatus,
} = require('@arbitrum/sdk')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const {
  AdminErc20Bridger,
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
 * Note that you can change the value
 */
const premint = ethers.utils.parseEther('1000')

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
  const adminTokenBridger = new AdminErc20Bridger(l2Network)
  const l1Router = l2Network.tokenBridge.l1GatewayRouter
  const l2Router = l2Network.tokenBridge.l2GatewayRouter
  const inbox = l2Network.ethBridge.inbox

  /**
   * Deploy our custom gateway to L1
   */
  const L1CustomGateway = await (
    await ethers.getContractFactory('L1CustomGateway')
  ).connect(l1Wallet)
  console.log('Deploying custom gateway to L1')
  const l1CustomGateway = await L1CustomGateway.deploy(l1Router, inbox)
  await l1CustomGateway.deployed()
  console.log(`Custom gateway is deployed to L1 at ${l1CustomGateway.address}`)
  const l1CustomGatewayAddress = l1CustomGateway.address

  /**
   * Deploy our custom gateway to L2
   */
  const L2CustomGateway = await (
    await ethers.getContractFactory('L2CustomGateway')
  ).connect(l2Wallet)
  console.log('Deploying custom gateway to L2')
  const l2CustomGateway = await L2CustomGateway.deploy(l2Router)
  await l2CustomGateway.deployed()
  console.log(`Custom gateway is deployed to L2 at ${l2CustomGateway.address}`)
  const l2CustomGatewayAddress = l2CustomGateway.address

  /**
   * Deploy our custom token smart contract to L1
   * We give the custom token contract the address of l1CustomGateway and l1GatewayRouter as well as the initial supply (premint)
   */
  const L1CustomToken = await (
    await ethers.getContractFactory('L1Token')
  ).connect(l1Wallet)
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
  const L2CustomToken = await (
    await ethers.getContractFactory('L2Token')
  ).connect(l2Wallet)
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
    `Registering token txn confirmed on L1! 🙌 L1 receipt is: ${registerTokenRec.transactionHash}`
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
    'Your custom token is now registered on our custom gateway 🥳 Go ahead and make the deposit!'
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
