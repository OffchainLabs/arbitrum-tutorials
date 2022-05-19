const { ethers } = require('hardhat')
const { providers, Wallet } = require('ethers')
const { getL2Network, L1ToL2MessageStatus } = require('@arbitrum/sdk')
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
const premine = ethers.utils.parseEther('3')

const main = async () => {
  await arbLog(
    'Setting Up Your Token With The Generic Custom Gateway Using Arbitrum SDK Library'
  )

  /**
   * Use l2Network to create an Arbitrum SDK AdminErc20Bridger instance
   * We'll use AdminErc20Bridger for its convenience methods around registering tokens to the custom gateway
   */
  const l2Network = await getL2Network(l2Provider)
  const adminTokenBridger = new AdminErc20Bridger(l2Network)

  const l1Gateway = l2Network.tokenBridge.l1CustomGateway
  const l1Router = l2Network.tokenBridge.l1GatewayRouter
  const l2Gateway = l2Network.tokenBridge.l2CustomGateway

  /**
   * Deploy our custom token smart contract to L1
   * We give the custom token contract the address of l1CustomGateway and l1GatewayRouter as well as the initial supply (premine)
   */
  const L1CustomToken = await (
    await ethers.getContractFactory('L1Token')
  ).connect(l1Wallet)
  console.log('Deploying custom token to L1')
  const l1CustomToken = await L1CustomToken.deploy(l1Gateway, l1Router, premine)
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
    l2Gateway,
    l1CustomToken.address
  )
  await l2CustomToken.deployed()
  console.log(`custom token is deployed to L2 at ${l2CustomToken.address}`)

  console.log('Registering custom token on L2:')

  /**
   * ٍRegister custom token on our custom gateway
   */
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
   * The L1 side is confirmed; now we listen and wait for the for the Sequencer to include the L2 side; we can do this by computing the expected txn hash of the L2 transaction.
   * To compute this txn hash, we need our message's "sequence numbers", unique identifiers of each L1 to L2 message. We'll fetch them from the event logs with a helper method
   */
  const l1ToL2Msgs = await registerTokenRec.getL1ToL2Messages(l2Provider)

  /**
   * In principle, a single L1 txn can trigger any number of L1-to-L2 messages (each with its own sequencer number).
   * In this case, the registerTokenOnL2 method created 2 L1-to-L2 messages; (1) one to set the L1 token to the Custom Gateway via the Router, and (2) another to set the L1 token to its L2 token address via the Generic-Custom Gateway
   * Here, We check if both messages are redeemed on L2
   */
  expect(l1ToL2Msgs.length, 'Should be 2 messages.').to.eq(2)

  const setTokenTx = await l1ToL2Msgs[0].waitForStatus()
  expect(setTokenTx.status, 'Set token not redeemed.').to.eq(
    L1ToL2MessageStatus.REDEEMED
  )
  const setGateways = await l1ToL2Msgs[1].waitForStatus()
  expect(setGateways.status, 'Set gateways not redeemed.').to.eq(
    L1ToL2MessageStatus.REDEEMED
  )

  console.log(
    'Your custom token is now registered on our custom gateway 🥳  Go ahead and make the deposit!'
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
