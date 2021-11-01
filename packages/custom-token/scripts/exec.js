const { BigNumber, providers, Wallet } = require('ethers')
const { ethers } = require('hardhat')
const { Bridge, networks } = require('arb-ts')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC', 'BRIDGE_ADDR'])

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */

 const walletPrivateKey = process.env.DEVNET_PRIVKEY

 const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
 const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
 
 const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
 const l2Wallet = new Wallet(walletPrivateKey, l2Provider)



const main = async () => {
  const bridge = await Bridge.init(l1Wallet, l2Wallet)

  const l1ChainId = await l1Wallet.getChainId()
  const l1Network = networks[l1ChainId]

  const l2ChainId = await l2Wallet.getChainId()
  const l2Network = networks[l2ChainId]

  const L1CustomToken = await ( await ethers.getContractFactory('L1Token') ).connect(l1Wallet)
  const L2CustomToken = await ( await ethers.getContractFactory('L2Token') ).connect(l2Wallet)

  const customGateway = l1Network.tokenBridge.l1CustomGateway
  const router = l1Network.tokenBridge.l1GatewayRouter
  const premine = ethers.utils.parseEther("10")

  const l1CustomToken = await L1CustomToken.deploy(customGateway, router, premine)
  await l1CustomToken.deployed()
  console.log(`TestCustomTokenL1 is deployed to L1 at ${l1CustomToken.address}`)



  const l2Gateway = l2Network.tokenBridge.l2CustomGateway
  const l2CustomToken = await L2CustomToken.deploy(l2Gateway,l1CustomToken.address)
  await l2CustomToken.deployed()

  // TODO: calculate the correct calldata size instead of this hardcoded estimate
  const customBridgeCalldataSize = 1000
  const routerCalldataSize = 1000
  
  const [ _submissionPriceWeiForCustomBridge, ] = await bridge.l2Bridge.getTxnSubmissionPrice(customBridgeCalldataSize)
  const [ _submissionPriceWeiForRouter, ] = await bridge.l2Bridge.getTxnSubmissionPrice(routerCalldataSize)
  const gasPriceBid = await bridge.l2Provider.getGasPrice()

  // TODO: calculate max gas querying NodeInterface instead of hardcoding
  const maxGasCustomBridge = 10000000
  const maxGasRouter = 10000000

  const valueForGateway = _submissionPriceWeiForCustomBridge.add(gasPriceBid.mul(maxGasCustomBridge))
  const valueForRouter = _submissionPriceWeiForRouter.add(gasPriceBid.mul(maxGasRouter))
  const callValue = valueForGateway.add(valueForRouter)

  // register with the gateways
  const tx = await l1CustomToken.registerTokenOnL2(
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
  const receipt = await tx.wait()
 
  const inboxSeqNums = await bridge.getInboxSeqNumFromContractTransaction(
    receipt
  )

  if(inboxSeqNums.length !== 2) {
    throw new Error("Inbox triggered incorrectly")
  }

  const [
    customBridgeSeqNum,
    routerSeqNum
  ] = inboxSeqNums

  const customBridgeL2Tx = await bridge.calculateL2RetryableTransactionHash(customBridgeSeqNum)
  const routerL2Tx = await bridge.calculateL2RetryableTransactionHash(routerSeqNum)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
