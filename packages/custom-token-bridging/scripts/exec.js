const { ethers } = require('hardhat')
const { providers, Wallet, Contract, constants } = require('ethers')
const {
  getL2Network,
  addDefaultLocalNetwork,
  addCustomNetwork,
  L1ToL2MessageStatus,
} = require('@arbitrum/sdk')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const {
  AdminErc20Bridger,
} = require('@arbitrum/sdk/dist/lib/assetBridger/erc20Bridger')
const {
  ERC20__factory,
} = require('@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory')
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

/**
 * If the L2 chain you're using is a custom gas token chain, you'll need to define the networks here
 */
const customL1Network = {
  blockTime: 0.25,
  chainID: 421614,
  explorerUrl: 'https://sepolia.arbiscan.io',
  isCustom: true,
  name: 'Arbitrum Sepolia Testnet',
  partnerChainID: 37714555429,
  partnerChainIDs: [37714555429],
  rpcURL: 'https://sepolia-rollup.arbitrum.io/rpc',
}

const customL2Network = {
  chainID: 37714555429,
  confirmPeriodBlocks: 150,
  ethBridge: {
    bridge: '0x6c7FAC4edC72E86B3388B48979eF37Ecca5027e6',
    inbox: '0x6396825803B720bc6A43c63caa1DcD7B31EB4dd0',
    outbox: '0xc7491a559b416540427f9f112C5c98b1412c5d51',
    rollup: '0xeedE9367Df91913ab149e828BDd6bE336df2c892',
    sequencerInbox: '0x529a2061A1973be80D315770bA9469F3Da40D938',
  },
  explorerUrl: 'https://testnet-explorer-v2.xai-chain.net/',
  rpcURL: 'https://testnet-v2.xai-chain.net/rpc',
  isArbitrum: true,
  isCustom: true,
  name: 'Xai Testnet v2',
  nativeToken: '0x4e6f41acbfa8eb4a3b25e151834d9a14b49b69d2',
  partnerChainID: 421614,
  partnerChainIDs: [421614],
  retryableLifetimeSeconds: 604800,
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 900000,
  tokenBridge: {
    l1CustomGateway: '0x04e14E04949D49ae9c551ca8Cc3192310Ce65D88',
    l1ERC20Gateway: '0xCcB451C4Df22addCFe1447c58bC6b2f264Bb1256',
    l1GatewayRouter: '0x185b868DBBF41554465fcb99C6FAb9383E15f47A',
    l1MultiCall: '0xce1CAd780c529e66e3aa6D952a1ED9A6447791c1',
    l1ProxyAdmin: '0x022c515aEAb29aaFf82e86A10950cE14eA89C9c5',
    l1Weth: '0x0000000000000000000000000000000000000000',
    l1WethGateway: '0x0000000000000000000000000000000000000000',
    l2CustomGateway: '0xea1ce1CC75C948488515A3058E10aa82da40cE8F',
    l2ERC20Gateway: '0xD840761a09609394FaFA3404bEEAb312059AC558',
    l2GatewayRouter: '0x3B8ba769a43f34cdD67a20aF60d08D54C9C8f1AD',
    l2Multicall: '0x5CBd60Ae5Af80A42FA8b0F20ADF95A8879844984',
    l2ProxyAdmin: '0x7C1BA251d812fb34aF5C2566040C3C30585aFed9',
    l2Weth: '0x0000000000000000000000000000000000000000',
    l2WethGateway: '0x0000000000000000000000000000000000000000',
  },
  blockTime: 0.25,
}

const main = async () => {
  await arbLog(
    'Setting Up Your Token With The Generic Custom Gateway Using Arbitrum SDK Library'
  )

  /**
   * Add the default local network configuration to the SDK
   * to allow this script to run on a local node
   */
  addDefaultLocalNetwork()

  /**
   * If the L2 chain you're using is a custom gas token chain, you'll need to define the networks above the `main()` function
   */
  addCustomNetwork({ customL1Network, customL2Network })

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
   * We first find out whether the L2 chain we are using is a custom gas token chain
   * We'll use a different L1 token contract in that case (the register method has a slightly different behavior) and
   * we'll perform an additional approve call to transfer the native tokens to pay for the gas of the retryable tickets
   */
  const isCustomGasTokenChain =
    adminTokenBridger.nativeToken &&
    adminTokenBridger.nativeToken !== constants.AddressZero

  /**
   * Deploy our custom token smart contract to L1
   * We give the custom token contract the address of l1CustomGateway and l1GatewayRouter as well as the initial supply (premine)
   * If the L2 chain we are using is a custom gas token chain, we will deploy a different L1Token contract, since the register method
   * has a slightly different behavior
   */
  const l1TokenContractName = isCustomGasTokenChain
    ? 'contracts/L1TokenCustomGas.sol:L1Token'
    : 'contracts/L1Token.sol:L1Token'
  const L1CustomToken = await (
    await ethers.getContractFactory(l1TokenContractName)
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

  /**
   * For L2 chains that have a custom gas token, we'll have to approve the transfer of native tokens to pay for the execution of the retryable tickets on L2
   */
  if (isCustomGasTokenChain) {
    console.log(
      'Giving allowance to the deployed token to transfer the chain native token'
    )
    const nativeToken = new Contract(
      l2Network.nativeToken,
      ERC20__factory.abi,
      l1Wallet
    )
    const approvalTx = await nativeToken.approve(
      l1CustomToken.address,
      ethers.utils.parseEther('1')
    )
    const approvalReceipt = await approvalTx.wait()
    console.log(`L1 approval receipt is: ${approvalReceipt.transactionHash}`)
  }

  /**
   * Register custom token on our custom gateway
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
   * In principle, a single L1 txn can trigger any number of L1-to-L2 messages (each with its own sequencer number).
   * In this case, the registerTokenOnL2 method created 2 L1-to-L2 messages;
   * - (1) one to set the L1 token to the Custom Gateway via the Router, and
   * - (2) another to set the L1 token to its L2 token address via the Generic-Custom Gateway
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
