const hre = require('hardhat')
const { ethers } = require('hardhat')
const { expect } = require('chai')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()

requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC'])

const main = async () => {
  await arbLog('Simple Pet Shop DApp')

  const l2Wallet = (await hre.ethers.getSigners())[0]
  console.log('Your wallet address:', l2Wallet.address)

  const L2Adoption = await (
    await ethers.getContractFactory('Adoption')
  ).connect(l2Wallet)
  console.log('Deploying Adoption contract to L2')
  const l2adoption = await L2Adoption.deploy()
  await l2adoption.deployed()
  console.log(`Adoption contract is deployed to ${l2adoption.address}`)

  // The id of the pet that will be used for testing
  const expectedPetId = 8

  // The expected owner of adopted pet is your l2wallet
  const expectedAdopter = l2Wallet.address

  // Testing the adopt() function
  console.log('Adopting pet:')

  const adoptionEventData = await l2adoption.adopt(expectedPetId)
  expect(adoptionEventData).to.exist

  // Testing retrieval of a single pet's owner
  const adopter = await l2adoption.adopters(expectedPetId)
  expect(expectedAdopter).to.equal(adopter) // The owner of the expected pet should be your l2wallet
  console.log(`Pet adopted; owner: ${adopter}`)

  // Testing retrieval of all pet owners
  let adopters = [16]
  adopters = await l2adoption.getAdopters()
  expect(adopters[expectedPetId]).to.equal(expectedAdopter) // The owner of the expected pet should be your l2wallet
  console.log('All pet owners:', adopters)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
