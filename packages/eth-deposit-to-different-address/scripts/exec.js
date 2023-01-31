const { utils, providers, Wallet } = require('ethers')
const { L1ToL2MessageStatus } = require('@arbitrum/sdk')
const {
  L1ToL2MessageCreator,
} = require('@arbitrum/sdk/dist/lib/message/L1ToL2MessageCreator')
const { ArbSdkError } = require('@arbitrum/sdk/dist/lib/dataEntities/errors')
const { parseEther } = utils
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

/**
 * Set the destination address and amount to be deposited in L2 (in wei)
 */
const destinationAddress = '0x2D98cBc6f944c4bD36EdfE9f98cd7CB57faEC8d6'
const ethToL2DepositAmount = parseEther('0.0001')

const main = async () => {
  await arbLog('Deposit Eth via Arbitrum SDK on a different address')

  /**
   * Use l1Wallet to create an Arbitrum SDK L1ToL2MessageCreator instance
   * We'll use L1ToL2MessageCreator to easily create a custom Retryable Ticket
   * to send ETH
   */
  const l1ToL2MessageCreator = new L1ToL2MessageCreator(l1Wallet)

  /**
   * First, let's check the ETH balance of the destination address
   */
  const destinationAddressInitialEthBalance = await l2Provider.getBalance(
    destinationAddress
  )

  /**
   * Create Retryable Ticket
   * This method will call Inbox's createRetryableTicket function which, as the name suggests, will create
   * a Retryable Ticket with the information we send here. The method will also take care of all gas related
   * parameters by calling the estimate functions.
   * The parameters that we'll send to the method to create the transaction are:
   * - from: L1 address transferring ETH
   * - to: L2 address receiving ETH
   * - l2CallValue: The amount of ETH being sent
   * - callValueRefundAddress: L2 address receiving ETH (same as "to")
   * - data: Any data we want to send over (we can set it as "0x")
   */
  const retryableTicketParams = {
    from: l1Wallet.address,
    to: destinationAddress,
    l2CallValue: ethToL2DepositAmount,
    callValueRefundAddress: destinationAddress,
    data: '0x',
  }
  const l1SubmissionTx = await l1ToL2MessageCreator.createRetryableTicket(
    retryableTicketParams,
    l2Provider
  )
  const l1SubmissionTxReceipt = await l1SubmissionTx.wait()
  console.log(
    'L1 submission transaction receipt is:',
    l1SubmissionTxReceipt.transactionHash
  )

  /**
   * With the transaction confirmed on L1, we now wait for the L2 side (i.e., balance credited to L2) to be confirmed as well.
   * Here we're waiting for the Sequencer to include the L2 message in its off-chain queue. The Sequencer should include it in under 10 minutes.
   * Technically, we create an L1ToL2Message SDK object which has the function waitForStatus that will help us find out when the retryable ticket has been created and redeemed.
   */
  console.log('Now we wait for L2 side of the transaction to be executed ⏳')
  const l1ToL2message = (
    await l1SubmissionTxReceipt.getL1ToL2Messages(l2Provider)
  )[0]
  if (!l1ToL2message) {
    throw new ArbSdkError('Unexpected missing L1ToL2 message.')
  }
  const retryableTicketResult = await l1ToL2message.waitForStatus()

  /**
   * The `status` property tells us if the l1 to l2 message was successful
   */
  retryableTicketResult.status === L1ToL2MessageStatus.REDEEMED
    ? console.log(
        `L2 message successful: status: ${
          L1ToL2MessageStatus[retryableTicketResult.status]
        }`
      )
    : console.log(
        `L2 message failed: status ${
          L1ToL2MessageStatus[retryableTicketResult.status]
        }`
      )

  /**
   * Our destination address ETH balance should be updated now
   */
  const destinationAddressUpdatedEthBalance = await l2Provider.getBalance(
    destinationAddress
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
