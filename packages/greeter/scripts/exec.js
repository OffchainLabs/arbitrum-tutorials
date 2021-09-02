const hre = require('hardhat')
const ethers = require('ethers')
const { Bridge } = require('arb-ts')
const { hexDataLength } = require('@ethersproject/bytes')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC', "INBOX_ADDR"])

/**
 * Instantiate wallets and providers for bridge
 */

const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new ethers.providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new ethers.providers.JsonRpcProvider(process.env.L2RPC)
const signer = new ethers.Wallet(walletPrivateKey)

const l1Signer = signer.connect(l1Provider)
const l2Signer = signer.connect(l2Provider)

const main = async () => {
  await arbLog('Cross-chain Greeter')
  /**
   * Use wallets to create an arb-ts bridge instance to use its convenience methods
   */
  const bridge = await Bridge.init(l1Signer, l2Signer)

  /**
   * We deploy L1 Greeter to L1, L2 greeter to L2, each with a different "greeting" message.
   * After deploying, save set each contract's counterparty's address to its state so that they can later talk to each other.
   */

  const L1Greeter = await (
    await hre.ethers.getContractFactory('GreeterL1')
  ).connect(l1Signer) //
  console.log('Deploying L1 Greeter 👋')
  const l1Greeter = await L1Greeter.deploy(
    'Hello world in L1',
    ethers.constants.AddressZero, // temp l2 addr
    process.env.INBOX_ADDR
  )
  await l1Greeter.deployed()
  console.log(`deployed to ${l1Greeter.address}`)
  const L2Greeter = await (
    await hre.ethers.getContractFactory('GreeterL2')
  ).connect(l2Signer)

  console.log('Deploying L2 Greeter 👋👋')

  const l2Greeter = await L2Greeter.deploy(
    'Hello world in L2',
    ethers.constants.AddressZero // temp l1 addr
  )
  await l2Greeter.deployed()
  console.log(`deployed to ${l2Greeter.address}`)

  const updateL1Tx = await l1Greeter.updateL2Target(l2Greeter.address)
  await updateL1Tx.wait()

  const updateL2Tx = await l2Greeter.updateL1Target(l1Greeter.address)
  await updateL2Tx.wait()
  console.log('Counterpart contract addresses set in both greeters 👍')

  /**
   * Let's log the L2 greeting string
   */
  const currentL2Greeting = await l2Greeter.greet()
  console.log(`Current L2 greeting: "${currentL2Greeting}"`)

  console.log('Updating greeting from L1 to L2:')

  /**
   * Here we have a new greeting message that we want to set as the L2 greeting; we'll be setting it by sending it as a message from layer 1!!!1
   */
  const newGreeting = 'Greeting from far, far away'

  /**
   * To send an L1-to-L2 message (aka a "retryable ticket"), we need to send ether from L1 to pay for the txn costs on L2.
   * There are two costs we need to account for: base submission cost and cost of L2 execution. We'll start with base submission cost.
   */

  /**
   * Base submission cost is a special cost for creating a retryable ticket; querying the cost requires us to know how many bytes of calldata out retryable ticket will require, so let's figure that out.
   * We'll get the bytes for our greeting data, then add 4 for the 4-byte function signature.
   */

  const newGreetingBytes = ethers.utils.defaultAbiCoder.encode(
    ['string'],
    [newGreeting]
  )
  const newGreetingBytesLength = hexDataLength(newGreetingBytes) + 4 // 4 bytes func identifier

  /**
   * Now we can query the submission price using a helper method; the first value returned tells us the best cost of our transaction; that's what we'll be using.
   * The second value (nextUpdateTimestamp) tells us when the base cost will next update (base cost changes over time with chain congestion; the value updates every 24 hours). We won't actually use it here, but generally it's useful info to have.
   */
  const [_submissionPriceWei, nextUpdateTimestamp] =
    await bridge.l2Bridge.getTxnSubmissionPrice(newGreetingBytesLength)
  console.log(
    `Current retryable base submission price: ${_submissionPriceWei.toString()}`
  )

  const timeNow = Math.floor(new Date().getTime() / 1000)
  console.log(
    `time in seconds till price update: ${
      nextUpdateTimestamp.toNumber() - timeNow
    }`
  )

  /**
   * ...Okay, but on the off chance we end up underpaying, our retryable ticket simply fails.
   * This is highly unlikely, but just to be safe, let's increase the amount we'll be paying (the difference between the actual cost and the amount we pay gets refunded to our address on L2 anyway)
   * (Note that in future releases, the a max cost increase per 24 hour window of 150% will be enforced, so this will be less of a concern.)
   */
  const submissionPriceWei = _submissionPriceWei.mul(5)
  /**
   * Now we'll figure out the gas we need to send for L2 execution; this requires the L2 gas price and gas limit for our L2 transaction
   */

  /**
   * For the L2 gas price, we simply query it from the L2 provider, as we would when using L1
   */

  const gasPriceBid = await bridge.l2Provider.getGasPrice()
  console.log(`L2 gas price: ${gasPriceBid.toString()}`)

  /**
   * For the gas limit, we'll simply use a hard-coded value (for more precise / dynamic estimates, see the estimateRetryableTicket method in the NodeInterface L2 "precompile")
   */
  const maxGas = 100000

  /**
   * With these three values, we can calculate the total callvalue we'll need our L1 transaction to send to L2
   */
  const callValue = submissionPriceWei.add(gasPriceBid.mul(maxGas))

  console.log(
    `Sending greeting to L2 with ${callValue.toString()} callValue for L2 fees:`
  )

  const setGreetingTx = await l1Greeter.setGreetingInL2(
    newGreeting, // string memory _greeting,
    submissionPriceWei,
    maxGas,
    gasPriceBid,
    {
      value: callValue,
    }
  )
  const setGreetingRec = await setGreetingTx.wait()

  console.log(
    `Greeting txn confirmed on L1! 🙌 ${setGreetingRec.transactionHash}`
  )

  /**
   * The L1 side is confirmed; now we listen and wait for the for the Sequencer to include the L2 side; we can do this by computing the expected txn hash of the L2 transaction.
   * To compute this txn hash, we need our message's "sequence number", a unique identifier. We'll fetch from the event logs with a helper method
   */
  const inboxSeqNums = await bridge.getInboxSeqNumFromContractTransaction(
    setGreetingRec
  )
  /**
   * In principle, a single txn can trigger many messages (each with its own sequencer number); in this case, we know our txn triggered only one. Let's get it, and use it to calculate our expected transaction hash.
   */
  const ourMessagesSequenceNum = inboxSeqNums[0]

  const retryableTxnHash = await bridge.calculateL2RetryableTransactionHash(
    ourMessagesSequenceNum
  )

  /**
   * Now we wait for the Sequencer to include it in its off chain inbox.
   */
  console.log(
    `waiting for L2 tx 🕐... (should take < 10 minutes, current time: ${new Date().toTimeString()}`
  )




  const retryRec = await l2Provider.waitForTransaction(retryableTxnHash)

  console.log(`L2 retryable txn executed 🥳 ${retryRec.transactionHash}`)

  /**
   * Note that during L2 execution, a retryable's sender address is transformed to its L2 alias.
   * Thus, when GreeterL2 checks that the message came from the L1, we check that the sender is this L2 Alias.
   * See setGreeting in GreeterL2.sol for this check.
   */

  /**
   * Now when we call greet again, we should see our new string on L2!
   */
  const newGreetingL2 = await l2Greeter.greet()
  console.log(`Updated L2 greeting: "${newGreetingL2}"`)
  console.log('✌️')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
