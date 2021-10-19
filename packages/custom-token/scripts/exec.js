const { BigNumber, providers, Wallet } = require('ethers')
const { ethers } = require('hardhat')
const { Bridge } = require('arb-ts')
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
  //await arbLog('Deposit token using arb-ts')

  const L1CustomToken = await (
    await ethers.getContractFactory('TestCustomTokenL1')
  ).connect(l1Wallet)
  console.log('Deploying TestCustomTokenL1 to L1')
  const l1CustomToken = await L1CustomToken.deploy(process.env.BRIDGE_ADDR, process.env.ROUTER_ADDR)
  await l1CustomToken.deployed()
  console.log(`TestCustomTokenL1 is deployed to L1 at ${l1CustomToken.address}`)
 



}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
