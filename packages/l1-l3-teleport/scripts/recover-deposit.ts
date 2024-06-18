import { providers, Wallet } from "ethers"
import { arbLog, requireEnvVariables } from 'arb-shared-dependencies'
import { Erc20L1L3Bridger, L1ToL2MessageReader, L1ToL2MessageStatus, L1ToL2MessageWriter, getL2Network } from "@arbitrum/sdk"

// Importing configuration //
require('dotenv').config()
requireEnvVariables(['L1RPC', 'L2RPC', 'L3RPC', 'DEVNET_PRIVKEY'])

// Initial setup //
const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
const l3Provider = new providers.JsonRpcProvider(process.env.L3RPC)

const l2Signer = new Wallet(process.env.DEVNET_PRIVKEY!, l2Provider)
const l3Signer = new Wallet(process.env.DEVNET_PRIVKEY!, l3Provider)

const main = async (txHash: string) => {
  await arbLog(`Recovering a failed deposit`)

  /**
   * Use L3 Network to initialize a bridger
   */
  const l3Network = await getL2Network(l3Provider)
  const bridger = new Erc20L1L3Bridger(l3Network)

  const status = await bridger.getDepositStatus({ txHash, l1Provider, l2Provider, l3Provider })

  if (status.completed) {
    console.log('Teleportation already completed')
    return
  }

  if (status.l2ForwarderFactoryRetryableFrontRan) {
    console.log('L2 Forwarder Factory Call was frontran, funds were picked up by another teleportation that may or may not have completed.')
    console.log('Please check the status of all teleportations that share the same L2Forwarder and token')
    console.log('If all those teleportations have (status.completed || status.l2ForwarderFactoryRetryableFrontRan), then all deposits have safely arrived on L2')
    return
  }

  const getWriter = (signer: Wallet, msg: L1ToL2MessageReader) => {
    return new L1ToL2MessageWriter(signer, msg.chainId, msg.sender, msg.messageNumber, msg.l1BaseFee, msg.messageData)
  }

  // the order of check / redeem is important

  if (await status.l1l2FeeTokenBridgeRetryable?.status() === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2) {
    console.log('Redeeming l1l2FeeTokenBridgeRetryable...')
    await getWriter(l2Signer, status.l1l2FeeTokenBridgeRetryable!).redeem()
    console.log('Redeemed l1l2FeeTokenBridgeRetryable')
  }

  if (await status.l1l2TokenBridgeRetryable.status() === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2) {
    console.log('Redeeming l1l2TokenBridgeRetryable...')
    await getWriter(l2Signer, status.l1l2TokenBridgeRetryable).redeem()
    console.log('Redeemed l1l2TokenBridgeRetryable')
  }

  if (await status.l2ForwarderFactoryRetryable.status() === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2) {
    console.log('Redeeming l2ForwarderFactoryRetryable...')
    
    try {
      await getWriter(l2Signer, status.l2ForwarderFactoryRetryable).redeem()
    } catch (e) {
      console.error(e)
      console.log('Failed to redeem l2ForwarderFactoryRetryable')
      console.log('If the l2ForwarderFactoryRetryable cannot be redeemed, the teleportation is stuck')
      console.log('The sender of the teleport must call L2Forwarder::rescue to recover the funds')
      console.log('If the sender of the teleport is a contract on L1, this needs to be done via a L1->L2 retryable')
      console.log('If the sender of the teleport is an EOA, this can be done via a L2 transaction')
      return
    }
    console.log('Redeemed l2ForwarderFactoryRetryable')

    console.log('l2l3TokenBridgeRetryable should be created after redeeming l2ForwarderFactoryRetryable')
    console.log('Please run this script again to redeem l2l3TokenBridgeRetryable if it fails to redeem automatically')
  }

  if (await status.l2l3TokenBridgeRetryable?.status() === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2) {
    console.log('Redeeming l2l3TokenBridgeRetryable...')
    // note that the l3 signer is used here, l2 signer used elsewhere
    await getWriter(l3Signer, status.l2l3TokenBridgeRetryable!).redeem()
    console.log('Redeemed l2l3TokenBridgeRetryable')

    console.log('All retryables redeemed, teleportation completed!')
  }
}

if (!process.argv[2]) {
  console.error('Please provide a transaction hash')
  process.exit(1)
}

main(process.argv[2])