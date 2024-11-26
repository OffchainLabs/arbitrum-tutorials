import { providers } from "ethers"
import { arbLog, requireEnvVariables, addCustomNetworkFromFile } from 'arb-shared-dependencies'
import { EthL1L3Bridger, ParentToChildMessageStatus, getArbitrumNetwork } from "@arbitrum/sdk"
require('dotenv').config()
requireEnvVariables(['CHAIN_RPC', 'PARENT_CHAIN_RPC', 'L1_RPC'])

/**
 * Set up: instantiate wallets connected to providers
 */
const l1Provider = new providers.JsonRpcProvider(process.env.L1_RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.PARENT_CHAIN_RPC)
const l3Provider = new providers.JsonRpcProvider(process.env.CHAIN_RPC)

const statusToText = {
  'NA': 'N/A',
  [ParentToChildMessageStatus.REDEEMED]: 'REDEEMED',
  [ParentToChildMessageStatus.CREATION_FAILED]: 'CREATION_FAILED',
  [ParentToChildMessageStatus.EXPIRED]: 'EXPIRED',
  [ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD]: 'FUNDS_DEPOSITED_ON_L2',
  [ParentToChildMessageStatus.NOT_YET_CREATED]: 'NOT_YET_CREATED',
}

const main = async (txHash: string) => {
  await arbLog(`Monitoring deposit status`)

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile()

  /**
   * Use L3 Network to initialize a bridger
   */
  const l3Network = await getArbitrumNetwork(l3Provider)
  const bridger = new EthL1L3Bridger(l3Network)

  /**
   * Get deposit status
   */
  console.log('Getting deposit status...')
  const depositStatus = await bridger.getDepositStatus({ txHash, l1Provider, l2Provider, l3Provider })
  
  /**
   * If any of these retryables fail (i.e. FUNDS_DEPOSITED_ON_CHILD), manually redeem them in the order displayed below
   * Note that anyone can manually redeem these retryables, not just the sender of the deposit
   */
  console.log(`L1-to-L2 retryable: ${statusToText[await depositStatus.l2Retryable.status()]}`)
  console.log(`L2-to-L3 retryable: ${statusToText[await depositStatus.l3Retryable?.status() || ParentToChildMessageStatus.NOT_YET_CREATED]}`)
  console.log(`Completed: ${depositStatus.completed}`)
}

if (!process.argv[2]) {
  console.error('Please provide a transaction hash')
  process.exit(1)
}

main(process.argv[2])