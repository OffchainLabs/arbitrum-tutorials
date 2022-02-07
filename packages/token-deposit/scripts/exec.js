const { BigNumber, providers, Wallet } = require('ethers')
const { TokenBridger, getL2Network, L1ToL2MessageStatus} = require("arb-ts")
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()
requireEnvVariables(['DEVNET_PRIVKEY', 'L1RPC', 'L2RPC'])

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */

 const walletPrivateKey = process.env.DEVNET_PRIVKEY

 const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
 const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
 
 const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
 const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

/**
 * Set the amount of token to be transferred to L2
 */
const tokenDepositAmount = BigNumber.from(50)

const main = async () => {
  await arbLog('Deposit token using arb-ts')

  /**
   * Use l2Network to create an arb-ts TokenBridger instance
   * We'll use TokenBridger for its convenience methods around transferring token to L2
   */
  const l2Network = await getL2Network(l2Provider)
  const tokenBridge = new TokenBridger(l2Network)

  /**
   * For the purpose of our tests, here we deploy an standard ERC20 token (DappToken) to L1
   * It sends its deployer (us) the initial supply of 1000000000000000
   */

  console.log('Deploying the test DappToken to L1:')
  const L1DappToken = await (
    await ethers.getContractFactory('DappToken')
  ).connect(l1Wallet)
  const l1DappToken = await L1DappToken.deploy(1000000000000000)
  await l1DappToken.deployed()
  console.log(`DappToken is deployed to L1 at ${l1DappToken.address}`)
  console.log('Approving:')
  const erc20Address = l1DappToken.address
  

  /**
   * The Standard Gateway contract will ultimately be making the token transfer call; thus, that's the contract we need to approve.
   * tokenBridge.approveToken handles this approval
   * Arguments required are: 
   * (1) l1Signer: The L1 address transferring token to L2
   * (2) erc20L1Address: L1 address of the ERC20 token to be depositted to L2
   */
  const approveTx = await tokenBridge.approveToken({
    l1Signer: l1Wallet,
    erc20L1Address: erc20Address
  })
  
  const approveRec = await approveTx.wait()
  console.log(
    `You successfully allowed the Arbitrum Bridge to spend DappToken ${approveRec.transactionHash}`
  )

  /**
   * Deposit DappToken to L2 using TokenBridge. This will escrow funds in the Gateway contract on L1, and send a message to mint tokens on L2.
   * The tokenBridge.deposit method handles computing the necessary fees for automatic-execution of retryable tickets — maxSubmission cost & l2 gas price * gas — and will automatically forward the fees to L2 as callvalue
   * Also note that since this is the first DappToken deposit onto L2, a standard Arb ERC20 contract will automatically be deployed.
   * Arguments required are: 
   * (1) amount: The amount of tokens to be transferred to L2
   * (2) erc20L1Address: L1 address of the ERC20 token to be depositted to L2
   * (2) l1Signer: The L1 address transferring token to L2
   * (3) l2Provider: An l2 provider
   */

  const depositTx = await tokenBridge.deposit({
    amount: tokenDepositAmount,
    erc20L1Address: erc20Address,
    l1Signer: l1Wallet,
    l2Provider: l2Provider
  })
  
  const depositRec = await depositTx.wait()
  console.log(
    `Deposit initiated: waiting for L2 retryable (takes < 10 minutes; current time: ${new Date().toTimeString()}) `
  )
  console.warn('deposit L1 receipt is:', depositRec.transactionHash)

  const l1ToL2Msg = await depositRec.getL1ToL2Message(l2Wallet)

  /**
   * ... and now we wait. Here we're waiting for the Sequencer to include the L2 message in its off-chain queue. The Sequencer should include it in under 10 minutes.
   */
  
  console.warn('Now we wait for L2 side of the transaction to be executed ⏳')

  const l1ToL2MsgState = await l1ToL2Msg.wait()

  /**
   * Here we get the status of our L2 transaction.
   * If it is REDEEMED (i.e., succesfully executed), our L2 token balance should be updated
   */
  
  if (l1ToL2MsgState.status == L1ToL2MessageStatus.REDEEMED) {

    console.log(`L2 transaction is now executed 🥳 and here is its hash: ${l1ToL2Msg.l2TxHash}`)
  }  
  else { 
    console.log(`L2 transaction failed!`)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
