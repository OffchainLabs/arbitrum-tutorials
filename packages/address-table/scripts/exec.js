const { providers, Wallet } = require('ethers')
const hre = require('hardhat')
const {
  ArbAddressTable__factory,
} = require('@arbitrum/sdk/dist/lib/abi/factories/ArbAddressTable__factory')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const {
  ARB_ADDRESS_TABLE_ADDRESS,
} = require('@arbitrum/sdk/dist/lib/dataEntities/constants')
requireEnvVariables(['PRIVATE_KEY', 'CHAIN_RPC'])
require('dotenv').config()

/**
 * Set up: instantiate wallets connected to providers
 */
const walletPrivateKey = process.env.PRIVATE_KEY
const provider = new providers.JsonRpcProvider(process.env.CHAIN_RPC)
const wallet = new Wallet(walletPrivateKey, provider)

async function main() {
  await arbLog('Using the Address Table')

  /**
   * Deploy ArbitrumVIP contract
   */
  const ArbitrumVIPContract = await (
    await hre.ethers.getContractFactory('ArbitrumVIP')
  ).connect(wallet)
  console.log('Deploying ArbitrumVIP contract...')
  const arbitrumVIP = await ArbitrumVIPContract.deploy()
  await arbitrumVIP.deployed()
  console.log('ArbitrumVIP deployed to:', arbitrumVIP.address)

  const myAddress = wallet.address

  /**
   * Connect to the Arbitrum Address table pre-compile contract
   */
  const arbAddressTable = ArbAddressTable__factory.connect(
    ARB_ADDRESS_TABLE_ADDRESS,
    wallet
  )

  //**
  /* Let's find out if our address is registered in the table:
   */
  const addressIsRegistered = await arbAddressTable.addressExists(myAddress)

  if (!addressIsRegistered) {
    //**
    /* If it isn't registered yet, let's register it!
     */

    const txnRes = await arbAddressTable.register(myAddress)
    const txnRec = await txnRes.wait()
    console.log(`Successfully registered address ${myAddress} to address table`)
  } else {
    console.log(`Address ${myAddress} already (previously) registered to table`)
  }
  /**
   * Now that we know it's registered, let's go ahead and retrieve its index
   */
  const addressIndex = await arbAddressTable.lookup(myAddress)

  /**
   * From here on out we can use this index instead of our address as a parameter into any contract with affordances to look up out address in the address data.
   */

  const txnRes = await arbitrumVIP.addVIPPoints(addressIndex)
  await txnRes.wait()
  /**
   * We got VIP points, and we minimized the calldata required, saving us precious gas. Yay rollups!
   */
  console.log(
    `Successfully added VIP points using address w/ index ${addressIndex.toNumber()}`
  )
}
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
