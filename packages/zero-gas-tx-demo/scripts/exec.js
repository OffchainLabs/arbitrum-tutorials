const { providers, Wallet, BigNumber } = require('ethers') 
const hre = require('hardhat')
const ethers = require('ethers')
const { requireEnvVariables } = require('arb-shared-dependencies')
const { FlashbotsBundleProvider, FlashbotsBundleResolution } = require('@flashbots/ethers-provider-bundle')

requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])

const wait = (ms = 0) => {
  return new Promise(res => setTimeout(res, ms || 10000))
}
/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */
const walletPrivateKey = process.env.DEVNET_PRIVKEY
const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l1Wallet = new Wallet(walletPrivateKey, l1Provider)

const authSigner = Wallet.createRandom();

const main = async () => {
  /**
   * Set up: instantiate L1 / L2 wallets connected to providers
   */
  
  const walletPrivateKey = process.env.DEVNET_PRIVKEY
  
  const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
  const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
  
  const l1Wallet = new Wallet(walletPrivateKey, l1Provider)

   // Flashbots provider requires passing in a standard provider
  const flashbotsProvider = await FlashbotsBundleProvider.create(
    l1Provider, // a normal ethers.js provider, to perform gas estimiations and nonce lookups
    authSigner // ethers.js signer wallet, only for signing request payloads, not transactions
  )
  
  module.exports = async txnHash => {
    //await arbLog('Zero Gas Withdrawals')
    /**
     / * We start with a txn hash; we assume this is transaction that triggered an L2 to L1 Message on L2 (i.e., ArbSys.sendTxToL1)
    */
    if (!txnHash)
      throw new Error(
        'Provide a transaction hash of an L2 transaction that sends an L2 to L1 message'
      )
    if (!txnHash.startsWith('0x') || txnHash.trim().length != 66)
      throw new Error(`Hmm, ${txnHash} doesn't look like a txn hash...`)
    
    /**
     * First, let's find the Arbitrum txn from the txn hash provided
     */
    const receipt = await l2Provider.getTransactionReceipt(txnHash)
    const l2Receipt = new L2TransactionReceipt(receipt)
  
    /**
     * Note that in principle, a single transaction could trigger any number of outgoing messages; the common case will be there's only one.
     * For the sake of this script, we assume there's only one / just grad the first one.
     */
    const l2Network = await getL2Network(l2Provider)
    const messages = await l2Receipt.getL2ToL1Messages(l1Wallet, l2Network)
    const l2ToL1Msg = messages[0]
  
    /**
     * before we try to execute out message, we need to make sure the l2 block it's included in is confirmed! (It can only be confirmed after the dispute period; Arbitrum is an optimistic rollup after-all)
     * waitUntilOutboxEntryCreated() waits until the item outbox entry exists
     */
    const timeToWaitMs = 1000 * 60
    console.log("Waiting for the outbox entry to be created. This only happens when the L2 block is confirmed on L1, ~1 week after it's creation.")
    await l2ToL1Msg.waitUntilOutboxEntryCreated(timeToWaitMs)
    console.log('Confirmed! Outbox entry exists!')
  
    /**
     * Now fetch the proof info we'll need in order check execution
     */
    const proofInfo = await l2ToL1Msg.tryGetProof(l2Provider)
  
    /**
     * Execute if not alredy executed
     */
    if(await l2ToL1Msg.hasExecuted(proofInfo)) {
      console.log(`Message already executed! Nothing else to do here`)
      process.exit(1)
    }

    const outbox = IOutbox__factory.connect(l2ToL1Msg.outboxAddress, l2ToL1Msg.l1Provider)
    console.log(outbox)
    //return await outbox.outboxEntryExists(l2ToL1Msg.batchNumber)
  
  // // first tx in the bundle: executing updateVar() from Test contract
  // const tx1 = await .populateTransaction.updateVar(3, {
  //   gasPrice: BigNumber.from(0),
  //   gasLimit: BigNumber.from(1000000),
  // });

  // // second tx in the bundle: pay the tip to the miner
  // const tx2 = await bribe.populateTransaction.bribe({
  //   value: bribeValue
  // });


  // const bundledTransactions = [
  //   {
  //     signer:   l1Wallet, //This tx should be executed by the miner
  //     transaction: tx1
  //   },
  //   {
  //     signer: l1Wallet, //This tx will be executed by the user
  //     transaction: tx2
  //   },

  // ];
  //console.log(bundledTransactions)


  // //const signedBundle = await flashbotsProvider.signBundle(bundledTransactions)
  // //const simulation = await flashbotsProvider.simulate(signedBundle, targetBlockNumber)
  // const BLOCKS_IN_FUTURE = 2;
  // // for each block we need to continously re-submit the flashbots bundle transaction until it is selected by a miner
  
  // l1Provider.on("block", async (blockNumber) => 
  // {
  //   try {
  //     console.log(`[${blockNumber}] New block seen`)
  //     const targetBlockNumber = blockNumber + BLOCKS_IN_FUTURE;
  //     // send the bundle to the flashbots relayer for the closest next future block (ie: t + 1)
  //     const bundleResponse = await flashbotsProvider.sendBundle(bundledTransactions, targetBlockNumber);
  //     // wait until we receive a response and exit only once the transaction has been mined in the blockchain
  //     const bundleResolution = await bundleResponse.wait()
  //     if (bundleResolution === FlashbotsBundleResolution.BundleIncluded)
  //     {
  //       console.log(`[${blockNumber}] Included in ${targetBlockNumber}!`)
  //       process.exit(0)
  //     } else if (bundleResolution === FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
  //       console.log(`[${blockNumber}] Not included in ${targetBlockNumber}`)
  //     } else if (bundleResolution === FlashbotsBundleResolution.AccountNonceTooHigh) {
  //       console.log(`[${blockNumber}] Nonce too high for ${targetBlockNumber}`)
  //     }
  //   } catch (err) {
  //     console.log(`[${blockNumber}] Error processing`, err);
  //   }
  // });
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
})