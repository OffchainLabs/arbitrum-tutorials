const hre = require('hardhat')
const {
  ArbAddressTable__factory,
} = require('@arbitrum/sdk/dist/lib/abi/factories/ArbAddressTable__factory')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC'])
require('dotenv').config()

async function main() {
  await arbLog('Using the Address Table')
  /**
   * Deploy ArbitrumVIP contract to L2
   */
  const ArbitrumVIP = await hre.ethers.getContractFactory('ArbitrumVIP')
  const arbitrumVIP = await ArbitrumVIP.deploy()

  await arbitrumVIP.deployed()

  console.log('ArbitrumVIP deployed to:', arbitrumVIP.address)

  const signers = await hre.ethers.getSigners()
  const myAddress = signers[0].address

  /**
   * Connect to the Arbitrum Address table pre-compile contract
   */
  const arbAddressTable = ArbAddressTable__factory.connect(
    '0x0000000000000000000000000000000000000066',
    signers[0]
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
   * From here on out we can use this index instead of our address as a paramter into any contract with affordances to look up out address in the address data.
   */

  const txnRes = await arbitrumVIP.addVIPPoints(addressIndex)
  const txnRec = await txnRes.wait()
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
