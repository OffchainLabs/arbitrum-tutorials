const { providers, Wallet } = require('ethers')
const { L2TransactionReceipt, getL2Network, L2ToL1MessageStatus } = require('@arbitrum/sdk')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const { OldOutbox__factory } = require ('@arbitrum/sdk/dist/lib/abi/factories/OldOutbox__factory') 
const { FlashbotsBundleProvider, FlashbotsBundleResolution } = require("@flashbots/ethers-provider-bundle")

require('dotenv').config()


requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])

/**
 * Set up: instantiate L1 wallet connected to provider
 */

const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
const l1Wallet = new Wallet(walletPrivateKey, l1Provider)

// `authSigner` is an Ethereum private key that does NOT store funds and is NOT your bot's primary key.
// This is an identifying key for signing payloads to establish reputation and whitelisting
// In production, this should be used across multiple bundles to build relationship. In this example, we generate a new wallet each time
const authSigner = Wallet.createRandom();






module.exports = async txnHash => {

  await arbLog('Gasless-withdrawals')
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
  const messages = await l2Receipt.getL2ToL1Messages(l1Wallet, l2Provider)
  const l2ToL1Msg = messages[0]
  
  /**
   * Check if already executed
   */
  if ((await l2ToL1Msg.status(l2Provider)) == L2ToL1MessageStatus.EXECUTED) {
    console.log(`Message already executed! Nothing else to do here`)
    process.exit(1)
  }

  /**
   * before we try to execute out message, we need to make sure the l2 block it's included in is confirmed! (It can only be confirmed after the dispute period; Arbitrum is an optimistic rollup after-all)
   * waitUntilReadyToExecute() waits until the item outbox entry exists
   */
  const timeToWaitMs = 1000 * 60
  console.log(
    "Waiting for the outbox entry to be created. This only happens when the L2 block is confirmed on L1, ~1 week after it's creation."
  )
  await l2ToL1Msg.waitUntilReadyToExecute(l2Provider, timeToWaitMs)
  console.log('Outbox entry exists! Trying to execute now')

  /**
   * Now fetch the proof info we'll need in order to execute, or check execution
   */
  const proofInfo = await l2ToL1Msg.getOutboxProof(l2Provider)
  const l2Network = await getL2Network(l2Provider)
  const OutboxAddress = l2Network.ethBridge.outbox
  const outbox = OldOutbox__factory.connect(OutboxAddress, l1Wallet)
  
  //Flashbots provider requires passing in a standard provider
  const flashbotsProvider = await FlashbotsBundleProvider.create(
    l1Provider, // a normal ethers.js provider, to perform gas estimiations and nonce lookups
    authSigner // ethers.js signer wallet, only for signing request payloads, not transactions
  )
  console.log(l2ToL1Msg.classicWriter.batchNumber)
  //console.log(OutboxAddress)
  // first tx in the bundle: Calling Outbox.executeTransaction(), signer: Sponsor.address
  const tx1 = await outbox.populateTransaction.executeTransaction
  (
    l2ToL1Msg.classicWriter.batchNumber,
    proofInfo.proof,
    proofInfo.path,
    proofInfo.l2Sender,
    proofInfo.l1Dest,
    proofInfo.l2Block,
    proofInfo.l1Block,
    proofInfo.timestamp,
    proofInfo.amount,
    proofInfo.calldataForL1
  )

  //console.log(tx1.data)

    const estGas = await l1Provider.estimateGas({
    to: OutboxAddress,
    data: tx1.data
  }) 
  console.log(estGas.toNumber())

  const bundledTransactions = [
    {
      signer:   l1Wallet, //This tx should be executed by the Sponsor
      transaction: tx1
    },
    // {
    //   signedTransaction: SIGNED_TX_FROM_USER // serialized signed transaction hex
    // },

  ];
  //console.log(bundledTransactions)


  //const signedBundle = await flashbotsProvider.signBundle(bundledTransactions)
  //const simulation = await flashbotsProvider.simulate(signedBundle, targetBlockNumber)
  //const BLOCKS_IN_FUTURE = 2;
  // for each block we need to continously re-submit the flashbots bundle transaction until it is selected by a miner
  
  /* l1Provider.on("block", async (blockNumber) => 
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

  while (true) {
    await new Promise(r => setTimeout(r, 100))
  }

 */
}

