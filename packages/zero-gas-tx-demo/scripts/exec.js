const { providers, Wallet, BigNumber } = require('ethers') 
const hre = require('hardhat')
const ethers = require('ethers')
const { requireEnvVariables } = require('arb-shared-dependencies')
const { FlashbotsBundleProvider, FlashbotsBundleResolution } = require('@flashbots/ethers-provider-bundle')

requireEnvVariables(['DEVNET_PRIVKEY', 'L1RPC'])

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */
const walletPrivateKey = process.env.DEVNET_PRIVKEY
const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l1Wallet = new Wallet(walletPrivateKey, l1Provider)

const authSigner = Wallet.createRandom();

const main = async () => {
   
  // Flashbots provider requires passing in a standard provider
  const flashbotsProvider = await FlashbotsBundleProvider.create(
    l1Provider, // a normal ethers.js provider, to perform gas estimiations and nonce lookups
    authSigner // ethers.js signer wallet, only for signing request payloads, not transactions
  )

  // Deploying Test contract to which we'll send tx in a bundle
  const Test = await (
    await hre.ethers.getContractFactory('Test')
  ).connect(l1Wallet) 
  console.log('Deploying Test')
  const test = await Test.deploy()

  await test.deployed()
  console.log(`deployed to ${test.address}`)

  // Deploying Bribe contract topay the tip to the miner
  const Bribe = await (
    await hre.ethers.getContractFactory('Bribe')
  ).connect(l1Wallet) 
  console.log('Deploying Bribe')
  const bribe = await Bribe.deploy()

  await bribe.deployed()
  console.log(`deployed to ${bribe.address}`)
  
  const bribeValue = ethers.utils.parseEther('0.0001')

  // first tx in the bundle: executing updateVar() from Test contract
  const tx1 = await test.populateTransaction.updateVar(3, {
    gasPrice: BigNumber.from(0),
    gasLimit: BigNumber.from(1000000),
  });

  // second tx in the bundle: pay the tip to the miner
  const tx2 = await bribe.populateTransaction.bribe({
    value: bribeValue
  });


  const bundledTransactions = [
    {
      signer:   l1Wallet, //This tx should be executed by the miner
      transaction: tx1
    },
    {
      signer: l1Wallet, //This tx will be executed by the user
      transaction: tx2
    },

  ];
  //console.log(bundledTransactions)


  //const signedBundle = await flashbotsProvider.signBundle(bundledTransactions)
  //const simulation = await flashbotsProvider.simulate(signedBundle, targetBlockNumber)
  const BLOCKS_IN_FUTURE = 2;
  // for each block we need to continously re-submit the flashbots bundle transaction until it is selected by a miner
  
  l1Provider.on("block", async (blockNumber) => 
  {
    try {
      console.log(`[${blockNumber}] New block seen`)
      const targetBlockNumber = blockNumber + BLOCKS_IN_FUTURE;
      // send the bundle to the flashbots relayer for the closest next future block (ie: t + 1)
      const bundleResponse = await flashbotsProvider.sendBundle(bundledTransactions, targetBlockNumber);
      // wait until we receive a response and exit only once the transaction has been mined in the blockchain
      const bundleResolution = await bundleResponse.wait()
      if (bundleResolution === FlashbotsBundleResolution.BundleIncluded)
      {
        console.log(`[${blockNumber}] Included in ${targetBlockNumber}!`)
        process.exit(0)
      } else if (bundleResolution === FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
        console.log(`[${blockNumber}] Not included in ${targetBlockNumber}`)
      } else if (bundleResolution === FlashbotsBundleResolution.AccountNonceTooHigh) {
        console.log(`[${blockNumber}] Nonce too high for ${targetBlockNumber}`)
      }
    } catch (err) {
      console.log(`[${blockNumber}] Error processing`, err);
    }
  });
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
})