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
 * Set the amount of token to be deposited in L2
 */
const tokenDepositAmount = BigNumber.from(50)

const main = async () => {
  await arbLog('Deposit token using arb-ts')

  const l2Network = await getL2Network(l2Provider)
  const tokenBridge = new TokenBridger(l2Network)


  const L1DappToken = await (
    await ethers.getContractFactory('DappToken')
  ).connect(l1Wallet)
  console.log('Deploying the test DappToken to L1')
  const l1DappToken = await L1DappToken.deploy(1000000000000000)
  await l1DappToken.deployed()
  console.log(`DappToken is deployed to L1 at ${l1DappToken.address}`)
  const erc20Address = l1DappToken.address
  console.log(erc20Address)

  
  const approveTx = await tokenBridge.approveToken({
    l1Signer: l1Wallet,
    erc20L1Address: erc20Address

  })
  
  const approveRec = await approveTx.wait()
  console.log(
    `You successfully allowed the Arbitrum Bridge to spend DappToken ${approveRec.transactionHash}`
  )

  const depositTx = await tokenBridge.deposit({
    amount: tokenDepositAmount,
    erc20L1Address: erc20Address,
    l1Signer: l1Wallet,
    l2Provider: l2Provider
  })
  
  const depositRec = await depositTx.wait()
  console.warn('deposit L1 receipt is:', depositRec.transactionHash)

  const l1ToL2Msg = await depositRec.getL1ToL2Message(l2Wallet)
  
  console.warn('Now we wait for L2 side of the transaction to be executed ⏳')

  const l1ToL2MsgState = await l1ToL2Msg.wait()
  console.log(l1ToL2MsgState.status.toString())
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
