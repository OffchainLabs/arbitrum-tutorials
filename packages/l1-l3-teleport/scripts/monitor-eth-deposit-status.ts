import { providers } from "ethers"
import { arbLog, requireEnvVariables } from 'arb-shared-dependencies'
import { EthL1L3Bridger, L1ToL2MessageStatus, getL2Network } from "@arbitrum/sdk"

// Importing configuration //
require('dotenv').config()
requireEnvVariables(['L1RPC', 'L2RPC', 'L3RPC'])

// Initial setup //
const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
const l3Provider = new providers.JsonRpcProvider(process.env.L3RPC)

const statusToText = {
  'NA': 'N/A',
  [L1ToL2MessageStatus.REDEEMED]: 'REDEEMED',
  [L1ToL2MessageStatus.CREATION_FAILED]: 'CREATION_FAILED',
  [L1ToL2MessageStatus.EXPIRED]: 'EXPIRED',
  [L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2]: 'FUNDS_DEPOSITED_ON_L2',
  [L1ToL2MessageStatus.NOT_YET_CREATED]: 'NOT_YET_CREATED',
}

const main = async (txHash: string) => {
  await arbLog(`Monitoring deposit status`)

  /**
   * Use L3 Network to initialize a bridger
   */
  const l3Network = await getL2Network(l3Provider)
  const bridger = new EthL1L3Bridger(l3Network)

  /**
   * Get deposit status
   */
  console.log('Getting deposit status...')
  const depositStatus = await bridger.getDepositStatus({ txHash, l1Provider, l2Provider, l3Provider })
  
  /**
   * If any of these retryables fail (i.e. FUNDS_DEPOSITED_ON_L2), manually redeem them in the order displayed below
   * Note that anyone can manually redeem these retryables, not just the sender of the deposit
   */
  console.log(`L1 to L2 Retryable: ${statusToText[await depositStatus.l2Retryable.status()]}`)
  console.log(`L2 to L3 Retryable: ${statusToText[await depositStatus.l3Retryable?.status() || L1ToL2MessageStatus.NOT_YET_CREATED]}`)
  console.log(`Completed: ${depositStatus.completed}`)
}

if (!process.argv[2]) {
  console.error('Please provide a transaction hash')
  process.exit(1)
}

main(process.argv[2])