const { BigNumber, providers, Wallet } = require('ethers')
const { ethers } = require('hardhat')
const { Bridge } = require('arb-ts')

require('dotenv').config()

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */
const infuraKey = process.env.INFURA_KEY
if (!infuraKey) throw new Error('No INFURA_KEY set.')

const walletPrivateKey = process.env.DEVNET_PRIVKEY
if (!walletPrivateKey) throw new Error('No DEVNET_PRIVKEY set.')

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

/**
 * Set the amount of token to be deposited in L2
 */
const tokenDepositAmount = BigNumber.from(50)

const main = async () => {
  /**
   * Use wallets to create an arb-ts bridge instance
   * We'll use bridge for its convenience methods around depositing tokens to L2
   */
  const bridge = await Bridge.init(l1Wallet, l2Wallet)

  /**
   * For the purpose of our tests, here we deploy an standard ERC20 token (DappToken) to L1
   * It sends it's deployer (us) the initial supply of 1000000000000000
   */

  const L1DappToken = await (
    await ethers.getContractFactory('DappToken')
  ).connect(l1Wallet)
  console.log('Deploying the test DappToken to L1')
  const l1DappToken = await L1DappToken.deploy(1000000000000000)
  await l1DappToken.deployed()
  console.log(`DappToken is deployed to L1 at ${l1DappToken.address}`)
  const erc20Address = l1DappToken.address

  /**
   * The Standard Gateway contract will ultimately be making the token transfer call; thus, that's the contract we need to approve.
   * bridge.approveToken handles this approval
   */
  const approveTx = await bridge.approveToken(erc20Address)
  const approveRec = await approveTx.wait()
  console.log(
    `You successfully allowed the Arbitrum Bridge to spend DappToken ${approveRec.transactionHash}`
  )

  /**
   * Deposit DappToken to L2 using Bridge. This will escrows funds in the Gateway contract on L1, and send a message to mint tokens on L2.
   * The bridge.deposit method handles computing the necessary fees for automatic-execution of retryable tickets — maxSubmission cost & l2 gas price * gas — and will automatically forward the fees to L2 as callvalue
   * Also note that since this is the first DappToken deposit onto L2, a standard Arb ERC20 contract will automatically be deployed.
   */
  const depositTx = await bridge.deposit(erc20Address, tokenDepositAmount)
  const depositRec = await depositTx.wait()

  /**
   * Now we track the status of our retryable ticket
   */

  //  First, we get our txn's sequence number from the event logs (using a handy utility method). This number uniquely identifies our L1 to L2 message (i.e., our token deposit)
  const seqNumArr = await bridge.getInboxSeqNumFromContractTransaction(
    depositRec
  )

  /**
   * Note that a single txn could (in theory) trigger many l1-to-l2 messages; we know ours only triggered 1 tho.
   */
  const seqNum = seqNumArr[0]
  console.log(
    `Sequence number for your transaction found: ${seqNum.toNumber()}`
  )

  /**
   *  Now we can get compute the txn hashes of the transactions associated with our retryable ticket:
   * (Note that we don't necessarily need all of these (and will only use one of them ), but we include them all for completeness)
   */
  // retryableTicket: quasi-transaction that can be redeemed, triggering some L2 message
  const retryableTicket = await bridge.calculateL2TransactionHash(seqNum)
  //  autoRedeem: record that "automatic" redemption successfully occurred
  const autoRedeem = await bridge.calculateRetryableAutoRedeemTxnHash(seqNum)
  // L2 message (in our case, mint new token)
  const redeemTransaction = await bridge.calculateL2RetryableTransactionHash(
    seqNum
  )

  /** Now, we have to wait for the L2 tx to go through; i.e., for the Sequencer to include it in its off-chain queue. This should take ~10 minutes at most
   * If the redeem succeeds, that implies that the retryableTicket has been included, and autoRedeem succeeded as well
   */
  console.log('waiting for L2 transaction:')
  const l2TxnRec = await l2Provider.waitForTransaction(
    redeemTransaction,
    undefined,
    1000 * 60 * 12
  )

  console.log(
    `L2 transaction found! Your DappToken balance is updated! ${l2TxnRec.transactionHash}`
  )

  /**
   * Not that our txn has succeeded, we know that a token contract has been deployed on L2, and our tokens have been deposited onto it.
   * Let's confirm our new token balance on L2!
   */

  const l2Data = await bridge.getAndUpdateL2TokenData(erc20Address)
  const l2WalletTokenBalance = l2Data && l2Data.ERC20 && l2Data.ERC20.balance
  console.log(
    `your l2Wallet has ${l2WalletTokenBalance.toString()} DappToken now!`
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
