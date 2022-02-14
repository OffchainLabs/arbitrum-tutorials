const { providers, Wallet } = require('ethers')
const { getL2Network } = require("arb-ts")
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const { AdminTokenBridger } = require('arb-ts/dist/lib/assetBridger/tokenBridger')
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
const premine = ethers.utils.parseEther("3")


const main = async () => {

  await arbLog('Setting Up Your Token With The Generic Custom Gateway')

  /**
   * Use l2Network to create an arb-ts TokenBridger instance
   * We'll use TokenBridger for its convenience methods around registering tokens to the custom gateway
   */
  const l2Network = await getL2Network(l2Provider)
   
  const adminTokenBridger = new AdminTokenBridger(l2Network)

  const l1Gateway = l2Network.tokenBridge.l1CustomGateway
  const l1Router = l2Network.tokenBridge.l1GatewayRouter
  const l2Gateway= l2Network.tokenBridge.l2CustomGateway

  /**
  * Deploy our custom token smart contract to L1
  * We give the custom token contract the address of l1CustomGateway and l1GatewayRouter as well as the initial supply (premine) 
  */
  const L1CustomToken = await ( await ethers.getContractFactory('L1Token') ).connect(l1Wallet)
  console.log('Deploying cutsom token to L1')
  const l1CustomToken = await L1CustomToken.deploy(l1Gateway, l1Router, premine)
  await l1CustomToken.deployed()
  console.log(`custom token is deployed to L1 at ${l1CustomToken.address}`)

  /**
  * Deploy our custom token smart contract to L2
  * We give the custom token contract the address of l2CustomGateway and our l1CustomToken 
  */
  const L2CustomToken = await ( await ethers.getContractFactory('L2Token') ).connect(l2Wallet)
  console.log('Deploying cutsom token to L2')
  const l2CustomToken = await L2CustomToken.deploy(l2Gateway,l1CustomToken.address)
  await l2CustomToken.deployed()
  console.log(`custom token is deployed to L2 at ${l2CustomToken.address}`)

  
  console.log("Registering custom token on L2:")
  
  
  const registerTokenTx = await adminTokenBridger.registerCustomToken(
    l1CustomToken.address,
    l2CustomToken.address,
    l1Wallet,
    l2Provider
  )
  
  

  const registerTokenRec = await registerTokenTx.wait()
  console.log(
    `Registering token txn confirmed on L1! 🙌 ${registerTokenRec.transactionHash}`
  )

  
 }

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
