const { BigNumber, providers, Wallet } = require('ethers')
const { expect } = require('chai')
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
 * Set the amount of token to be transferred to L2 and then withdrawn
 */
const tokenDepositAmount = BigNumber.from(50)
const tokenWithdrawAmount = BigNumber.from(20)

const main = async () => {
  await arbLog('Withdraw token using arb-ts')

  /**
   * Use l2Network to create an arb-ts TokenBridger instance
   * We'll use TokenBridger for its convenience methods around transferring token to L2 and back to L1
   */
   const l2Network = await getL2Network(l2Provider)
   const tokenBridge = new TokenBridger(l2Network)

  /**
   * Setup: we'll deploy a token contract, then approve and transfer onto L2 so we have some tokens to withdraw to L1
   * (For play-by-play details on the deposit flow, see token_deposit repo)
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
   * (2) erc20L1Address: L1 address of the ERC20 token to be deposited to L2
   */

   const approveTx = await tokenBridge.approveToken({
    l1Signer: l1Wallet,
    erc20L1Address: erc20Address
  })  

  const approveRec = await approveTx.wait()
  console.log(
    `You successfully allowed the Arbitrum Bridge to spend DappToken ${approveRec.transactionHash}`
  )
  console.log('Transferring DappToken to L2:')

  /**
   * Deposit DappToken to L2 using TokenBridge. This will escrow funds in the Gateway contract on L1, and send a message to mint tokens on L2.
   * The tokenBridge.deposit method handles computing the necessary fees for automatic-execution of retryable tickets — maxSubmission cost & l2 gas price * gas — and will automatically forward the fees to L2 as callvalue
   * Also note that since this is the first DappToken deposit onto L2, a standard Arb ERC20 contract will automatically be deployed.
   * Arguments required are: 
   * (1) amount: The amount of tokens to be transferred to L2
   * (2) erc20L1Address: L1 address of the ERC20 token to be deposited to L2
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

    console.log(`Setup complete`)
  }  
  else { 
    console.log(`L2 transaction failed`)
  }
  console.log('Withdrawing:')

  /**
   * ... Okay, Now we begin withdrawing DappToken from L2. To withdraw, we'll use TokenBridge helper method withdraw
   * withdraw will call our L2 Gateway Router to initiate a withdrawal via the Standard ERC20 gateway
   * This transaction is constructed and paid for like any other L2 transaction (it just happens to (ultimately) make a call to ArbSys.sendTxToL1)
   * Arguments required are: 
   * (1) amount: The amount of tokens to be transferred to L1
   * (2) erc20L1Address: L1 address of the ERC20 token 
   * (3) l2Signer: The L2 address transferring token to L1
   */

  const withdrawTx = await tokenBridge.withdraw({
    amount:tokenWithdrawAmount,
    erc20l1Address: erc20Address,
    l2Signer: l2Wallet
  })
  
  const withdrawRec = await withdrawTx.wait()
  console.log(`Token withdrawal initiated! 🥳 ${withdrawRec.transactionHash}`)
  /**
   * And with that, our withdrawal is initiated! No additional time-sensitive actions are required.
   * Any time after the transaction's assertion is confirmed, funds can be transferred out of the bridge via the outbox contract
   * We'll check our l2Wallet DappToken balance here:
   */

  const l2Token = tokenBridge.getL2TokenContract(
    l2Provider,
    await tokenBridge.getL2ERC20Address(erc20Address, l1Provider)
  )

  const l2WalletBalance = (
    await l2Token.functions.balanceOf(await l2Wallet.getAddress())
  )[0]
    
  expect(
    l2WalletBalance.add(tokenWithdrawAmount).eq(tokenDepositAmount),
    'token withdraw balance not deducted'
  ).to.be.true


  console.log(
     `To to claim funds (after dispute period), see outbox-execute repo ✌️`
  )

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
