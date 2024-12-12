const { ethers } = require('hardhat')
const { providers, Wallet } = require('ethers')
const { expect } = require('chai')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()
requireEnvVariables(['PRIVATE_KEY', 'CHAIN_RPC'])

/**
 * Set up: instantiate wallets connected to providers
 */
const walletPrivateKey = process.env.PRIVATE_KEY
const chainProvider = new providers.JsonRpcProvider(process.env.CHAIN_RPC)
const chainWallet = new Wallet(walletPrivateKey, chainProvider)

const main = async () => {
  await arbLog('Simple Pet Shop DApp')

  /**
   * Deploying the Adoption contract
   */
  const Adoption = (await ethers.getContractFactory('Adoption')).connect(
    chainWallet
  )
  console.log('Deploying Adoption contract')
  const adoption = await Adoption.deploy()
  await adoption.deployed()
  console.log(`Adoption contract is deployed to ${adoption.address}`)

  /**
   * The id of the pet that will be used for testing
   */
  const expectedPetId = 8

  /**
   * The expected owner of adopted pet is your wallet
   */
  const expectedAdopter = chainWallet.address

  /**
   * Testing the adopt() function
   */
  console.log('Adopting pet:')
  const adoptionEventData = await adoption.adopt(expectedPetId)
  expect(adoptionEventData).to.exist

  /**
   * Testing retrieval of a single pet's owner
   */
  const adopter = await adoption.adopters(expectedPetId)
  expect(expectedAdopter).to.equal(adopter) // The owner of the expected pet should be your wallet
  console.log(`Pet adopted; owner: ${adopter}`)

  /**
   * Testing retrieval of all pet owners
   */
  let adopters = [16]
  adopters = await adoption.getAdopters()
  expect(adopters[expectedPetId]).to.equal(expectedAdopter) // The owner of the expected pet should be your wallet
  console.log('All pet owners:', adopters)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
