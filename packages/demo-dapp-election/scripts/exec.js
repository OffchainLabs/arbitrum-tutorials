const hre = require('hardhat')
const { ethers } = require('hardhat')
const { expect } = require('chai')

const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()

requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC'])

const main = async () => {
  await arbLog('Simple Election DApp')

  const l2Wallet = (await hre.ethers.getSigners())[0]
  console.log('Your wallet address:', l2Wallet.address)

  const L2Election = await (
    await ethers.getContractFactory('Election')
  ).connect(l2Wallet)
  console.log('Deploying Election contract to L2')
  const l2election = await L2Election.deploy()
  await l2election.deployed()
  console.log(
    `Election contract is initialized with 2 candidates and deployed to ${l2election.address}`
  )

  //Fetch the candidate count
  const count = await l2election.candidatesCount()
  expect(count.toNumber()).to.equal(2)
  console.log('The election is indeed initialized with two candidates!')

  //Fetch the candidates values (id, name, voteCount) and make sure they are set correctly
  var candidate1 = await l2election.candidates(1)
  expect(candidate1[0].toNumber()).to.equal(1)
  expect(candidate1[1]).to.equal('Candidate 1')
  expect(candidate1[2].toNumber()).to.equal(0)

  var candidate2 = await l2election.candidates(2)
  expect(candidate2[0].toNumber()).to.equal(2)
  expect(candidate2[1]).to.equal('Candidate 2')
  expect(candidate2[2].toNumber()).to.equal(0)
  console.log('candidates are initialized with the correct values!')

  //Cast a vote for candidate1
  var candidateId
  var candidate
  var voteCount
  candidateId = 1

  const voteTx1 = await l2election.vote(candidateId)
  const vote1Rec = await voteTx1.wait()
  expect(vote1Rec.status).to.equal(1)
  console.log('Vote tx is executed!')

  const voted = await l2election.voters(l2Wallet.address)
  expect(voted).to.be.true
  console.log('You have voted for candidate1!')

  //Fetch the candidate1 voteCount and make sure it's equal to 1
  candidate = await l2election.candidates(candidateId)
  voteCount = candidate[2]
  expect(voteCount.toNumber()).to.equal(1)
  console.log('Candidate1 has one vote!')

  //Fetch Candidate2 and make sure it did not receive any votes yet
  candidate = await l2election.candidates(2)
  voteCount = candidate[2]
  expect(voteCount.toNumber()).to.equal(0)
  console.log('Candidate2 has zero vote!')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
