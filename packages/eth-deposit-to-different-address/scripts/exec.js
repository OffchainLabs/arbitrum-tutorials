const { utils, providers, Wallet } = require('ethers')
const { EthBridger, getL2Network, EthDepositStatus } = require('@arbitrum/sdk')
const { parseEther } = utils
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
require('dotenv').config()
requireEnvVariables(['DEVNET_PRIVKEY', 'L1RPC', 'L2RPC'])

/**
 * Set up: Connect to L1/L2 providers and instantiate an L1 wallet
 */
const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const l1Wallet = new Wallet(walletPrivateKey, l1Provider)

/**
 * Set the destination address and amount to be deposited in L2 (in wei)
 */
const destAddress = '0x2D98cBc6f944c4bD36EdfE9f98cd7CB57faEC8d6'
const ethToL2DepositAmount = parseEther('0.0001')

const main = async () => {
  await arbLog('Deposit Eth via Arbitrum SDK on a different address')

  /**
   * Use l2Network to create an Arbitrum SDK EthBridger instance
   * We'll use EthBridger for its convenience methods around transferring ETH to L2
   */
  const l2Network = await getL2Network(l2Provider)
  const ethBridger = new EthBridger(l2Network)

  /**
   * First, let's check the ETH balance of the destination address
   */
  const destinationAddressInitialEthBalance = await l2Provider.getBalance(
    destAddress
  )

  /**
   * Transfer ether from L1 to L2
   * This convenience method automatically queries for the retryable's max submission cost and forwards the appropriate amount to the specified address on L2
   * Arguments required are:
   * (1) amount: The amount of ETH to be transferred to L2
   * (2) l1Signer: The L1 address transferring ETH to L2
   * (3) l2Provider: An l2 provider
   * (4) destinationAddress: The address where the ETH will be sent to
   */
  const depositTx = await ethBridger.depositTo({
    amount: ethToL2DepositAmount,
    l1Signer: l1Wallet,
    l2Provider: l2Provider,
    destinationAddress: destAddress,
  })
  const depositRec = await depositTx.wait()
  console.warn('Deposit L1 receipt is:', depositRec.transactionHash)

  /**
   * With the transaction confirmed on L1, we now wait for the L2 side (i.e., balance credited to L2) to be confirmed as well.
   * Here we're waiting for the Sequencer to include the L2 message in its off-chain queue. The Sequencer should include it in under 15 minutes.
   */
  console.warn('Now we wait for L2 side of the transaction to be executed ⏳')
  const l2Result = await depositRec.waitForL2(l2Provider)

  /**
   * The `complete` boolean tells us if the l1 to l2 message was successful
   */
  l2Result.complete
    ? console.log(
        `L2 message successful: status: ${
          EthDepositStatus[await l2Result.message.status()]
        }`
      )
    : console.log(
        `L2 message failed: status ${
          EthDepositStatus[await l2Result.message.status()]
        }`
      )

  /**
   * Our destination address ETH balance should be updated now
   */
  const destinationAddressUpdatedEthBalance = await l2Provider.getBalance(
    destAddress
  )
  console.log(
    `L2 ETH balance of the destination address has been updated from ${destinationAddressInitialEthBalance.toString()} to ${destinationAddressUpdatedEthBalance.toString()}`
  )
}
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
