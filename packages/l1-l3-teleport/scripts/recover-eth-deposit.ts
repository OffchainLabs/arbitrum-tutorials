import { providers, Wallet } from "ethers"
import { arbLog, requireEnvVariables } from 'arb-shared-dependencies'
import { Erc20L1L3Bridger, EthL1L3Bridger, L1ToL2MessageReader, L1ToL2MessageStatus, L1ToL2MessageWriter, getL2Network } from "@arbitrum/sdk"

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
  await arbLog(`Recovering a failed ETH deposit`)

  /**
   * Use L3 Network to initialize a bridger
   */
  const l3Network = await getL2Network(l3Provider)
  const bridger = new EthL1L3Bridger(l3Network)

  const status = await bridger.getDepositStatus({ txHash, l1Provider, l2Provider, l3Provider })

  if (status.completed) {
    console.log('Teleportation already completed')
    return
  }

  const getWriter = (signer: Wallet, msg: L1ToL2MessageReader) => {
    return new L1ToL2MessageWriter(signer, msg.chainId, msg.sender, msg.messageNumber, msg.l1BaseFee, msg.messageData)
  }

  // the order of check / redeem is important

  if (await status.l2Retryable.status() === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2) {
    console.log('Redeeming l2Retryable...')
    await getWriter(l2Signer, status.l2Retryable).redeem()
    console.log('Redeemed l2Retryable')

    console.log('l3Retryable should be created after redeeming l2Retryable')
    console.log('Please run this script again to redeem l3Retryable if it fails to redeem automatically')
  }

  if (await status.l3Retryable?.status() === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2) {
    console.log('Redeeming l3Retryable...')
    await getWriter(l3Signer, status.l3Retryable!).redeem()
    console.log('Redeemed l3Retryable')
    console.log('All retryables redeemed, teleportation completed!')
  }
}

if (!process.argv[2]) {
  console.error('Please provide a transaction hash')
  process.exit(1)
}

main(process.argv[2])