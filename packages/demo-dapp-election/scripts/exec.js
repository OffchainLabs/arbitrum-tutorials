const { ethers } = require('hardhat');
const { providers, Wallet } = require('ethers');
const { expect } = require('chai');
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies');
require('dotenv').config();
requireEnvVariables(['PRIVATE_KEY', 'CHAIN_RPC']);

/**
 * Set up: instantiate wallets connected to providers
 */
const walletPrivateKey = process.env.PRIVATE_KEY;
const chainProvider = new providers.JsonRpcProvider(process.env.CHAIN_RPC);
const chainWallet = new Wallet(walletPrivateKey, chainProvider);

const main = async () => {
  await arbLog('Simple Election DApp');

  /**
   * Deploying the Election contract
   */
  const Election = (await ethers.getContractFactory('Election')).connect(chainWallet);
  console.log('Deploying Election contract');
  const election = await Election.deploy();
  await election.deployed();
  console.log(
    `Election contract is initialized with 2 candidates and deployed to ${election.address}`,
  );

  /**
   * Fetch the candidate count
   */
  const count = await election.candidatesCount();
  expect(count.toNumber()).to.equal(2);
  console.log('The election is indeed initialized with two candidates!');

  /**
   * Fetch the candidates values (id, name, voteCount) and make sure they are set correctly
   */
  var candidate1 = await election.candidates(1);
  expect(candidate1[0].toNumber()).to.equal(1);
  expect(candidate1[1]).to.equal('Candidate 1');
  expect(candidate1[2].toNumber()).to.equal(0);

  var candidate2 = await election.candidates(2);
  expect(candidate2[0].toNumber()).to.equal(2);
  expect(candidate2[1]).to.equal('Candidate 2');
  expect(candidate2[2].toNumber()).to.equal(0);
  console.log('candidates are initialized with the correct values!');

  /**
   * Cast a vote for candidate1
   */
  var candidateId;
  var candidate;
  var voteCount;
  candidateId = 1;

  const voteTx1 = await election.vote(candidateId);
  const vote1Rec = await voteTx1.wait();
  expect(vote1Rec.status).to.equal(1);
  console.log('Vote transaction is executed!');

  const voted = await election.voters(chainWallet.address);
  expect(voted).to.be.true;
  console.log('You have voted for candidate1!');

  /**
   * Fetch the candidate1 voteCount and make sure it's equal to 1
   */
  candidate = await election.candidates(candidateId);
  voteCount = candidate[2];
  expect(voteCount.toNumber()).to.equal(1);
  console.log('Candidate1 has one vote!');

  /**
   * Fetch Candidate2 and make sure it did not receive any votes yet
   */
  candidate = await election.candidates(2);
  voteCount = candidate[2];
  expect(voteCount.toNumber()).to.equal(0);
  console.log('Candidate2 has zero vote!');
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
