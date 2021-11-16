const { providers, Wallet } = require('ethers')
const { ethers } = require('hardhat')
const { Bridge, networks } = require('arb-ts')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])

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
const premine = ethers.utils.parseEther("3")


const main = async () => {

  await arbLog('Setting Up Your Token With The Generic Custom Gateway')
  /**
  * Use wallets to create an arb-ts bridge instance
  * We'll use bridge for its convenience methods around registering tokens to the custom gateway
  */

  const bridge = await Bridge.init(l1Wallet, l2Wallet)

  /**
  * Use arb-ts networks file to get the addresses that we need
  */
  
  const l1ChainId = await l1Wallet.getChainId()
  const l1Network = networks[l1ChainId]
  const l1Gateway = l1Network.tokenBridge.l1CustomGateway
  const l1Router = l1Network.tokenBridge.l1GatewayRouter
  
  const l2ChainId = await l2Wallet.getChainId()
  const l2Network = networks[l2ChainId]
  const l2Gateway = l2Network.tokenBridge.l2CustomGateway


  /**
  * Deploy our custom token smart contract to L1
  * We give the custom token contract the address of l1CustomGateway and l1GatewayRouter as well as the initial supply (premine) 
  */
  const L1CustomToken = await ( await ethers.getContractFactory('L1Token') ).connect(l1Wallet)
  console.log('Deploying the cutsom token to L1')
  const l1CustomToken = await L1CustomToken.deploy(l1Gateway, l1Router, premine)
  await l1CustomToken.deployed()
  console.log(`custom token is deployed to L1 at ${l1CustomToken.address}`)

  /**
  * Deploy our custom token smart contract to L2
  * We give the custom token contract the address of l2CustomGateway and our l1CustomToken 
  */
  const L2CustomToken = await ( await ethers.getContractFactory('L2Token') ).connect(l2Wallet)
  console.log('Deploying the cutsom token to L2')
  const l2CustomToken = await L2CustomToken.deploy(l2Gateway,l1CustomToken.address)
  await l2CustomToken.deployed()
  console.log(`custom token is deployed to L2 at ${l2CustomToken.address}`)

  /**
  * We set how many bytes of calldata is needed to create the retryable tickets on L2
  */
  const customBridgeCalldataSize = 1000
  const routerCalldataSize = 1000
  
  /**
  * Base submission cost is a special cost for creating a retryable ticket.
  * We query the submission price using a helper method; the first value returned tells us the best cost of our transaction; that's what we'll be using.
  */
  
  const [ _submissionPriceWeiForCustomBridge, ] = await bridge.l2Bridge.getTxnSubmissionPrice(customBridgeCalldataSize)
  const [ _submissionPriceWeiForRouter, ] = await bridge.l2Bridge.getTxnSubmissionPrice(routerCalldataSize)
  console.log(
    `Current retryable base submission prices for custom bridge and raouter are: ${_submissionPriceWeiForCustomBridge.toString(), _submissionPriceWeiForRouter.toString()}`
  )
  /**
  * For the L2 gas price, we simply query it from the L2 provider, as we would when using L1
  */
  const gasPriceBid = await bridge.l2Provider.getGasPrice()
  console.log(`L2 gas price: ${gasPriceBid.toString()}`)

  /**
  * For the gas limit, we'll simply use a hard-coded value (for more precise / dynamic estimates, see the estimateRetryableTicket method in the NodeInterface L2 "precompile")
  */
  const maxGasCustomBridge = 10000000
  const maxGasRouter = 10000000


  /**
  * With these three values (base submission price, gas price, gas kinit), we can calculate the total callvalue we'll need our L1 transaction to send to L2
  */
  const valueForGateway = _submissionPriceWeiForCustomBridge.add(gasPriceBid.mul(maxGasCustomBridge))
  const valueForRouter = _submissionPriceWeiForRouter.add(gasPriceBid.mul(maxGasRouter))
  const callValue = valueForGateway.add(valueForRouter)

  console.log(
    `Registering the custom token on L2 with ${callValue.toString()} callValue for L2 fees:`
  )
  /** 
    * Execute regsiterToken)nL2 function from our l1CustomToken
    * Arguments include:
    * l2CustomToken.address: The L2 address of your custom token
    * _submissionPriceWeiForCustomBridge: Base submission price (in wei) that is needed to cover the cost for creating the retryable tickets for registering the token on custom gateway
    * _submissionPriceWeiForRouter: Base submission price (in wei) that is needed to cover the cost for creating the retryable tickets for registering the token on gateway router
    * maxGasCustomBridge: Gas limit for immediate L2 execution of registering the token on custom gateway
    * maxGasRouter: Gas limit for immediate L2 execution of registering the token on router 
    * gasPriceBid: The L2 gas price
    * valueForGateway: the callvalue we need for our custom gateway
    * valueForRouter: the callvalue we need for the router
    */ 
  const registerTokenTx = await l1CustomToken.registerTokenOnL2(
    l2CustomToken.address,
    _submissionPriceWeiForCustomBridge,
    _submissionPriceWeiForRouter,
    maxGasCustomBridge,
    maxGasRouter,
    gasPriceBid,
    valueForGateway,
    valueForRouter,
    l2Wallet.address,
    {
      value: callValue
    }
  )

  const registerTokenRec = await registerTokenTx.wait()
  console.log(
    `Registering token txn confirmed on L1! 🙌 ${registerTokenRec.transactionHash}`
  )

  /**
   * The L1 side is confirmed; now we listen and wait for the for the Sequencer to include the L2 side; we can do this by computing the expected txn hash of the L2 transaction.
   * To compute this txn hash, we need our message's "sequence numbers", unique identifiers of each L1 to L2 message. We'll fetch them from the event logs with a helper method
   */
  const inboxSeqNums = await bridge.getInboxSeqNumFromContractTransaction(
    registerTokenRec
  )

  /**
   * In principle, a single L1 txn can trigger any number of L1-to-L2 messages (each with its own sequencer number). 
   * In this case, the registerTokenOnL2 method created 2 L1-to-L2 messages; (1) one to set the L1 token to the Custom Gateway via the Router, and (2) another to set the L1 token to its L2 token address via the Generic-Custom Gateway
  */

  if(inboxSeqNums.length !== 2) {
    throw new Error("Inbox triggered incorrectly")
  }

  const [ customBridgeSeqNum, routerSeqNum ] = inboxSeqNums

  const customBridgeL2Tx = await bridge.calculateL2RetryableTransactionHash(customBridgeSeqNum)
  const routerL2Tx = await bridge.calculateL2RetryableTransactionHash(routerSeqNum)

  /**
   * Now we wait for the Sequencer to include both messages in its off chain inbox.
   */
   console.log(
    `waiting for L2 tx 🕐... (should take < 10 minutes, current time: ${new Date().toTimeString()}`
  )

  const customBridgeL2Rec = await l2Provider.waitForTransaction(customBridgeL2Tx)
  const routerL2Rec = await l2Provider.waitForTransaction(routerL2Tx)

  console.log(`L2 retryable txn executed 🥳 ${customBridgeL2Rec.transactionHash}, ${routerL2Rec.transactionHash}`)
 }

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
