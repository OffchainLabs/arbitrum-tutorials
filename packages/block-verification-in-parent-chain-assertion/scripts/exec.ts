import { providers, Contract } from "ethers"
import { getArbitrumNetwork } from '@arbitrum/sdk'
import { RollupCore__factory } from "@arbitrum/sdk/dist/lib/abi/factories/RollupCore__factory"
import { arbLog, requireEnvVariables, addCustomNetworkFromFile } from 'arb-shared-dependencies'
require('dotenv').config()
requireEnvVariables(['CHAIN_RPC', 'PARENT_CHAIN_RPC'])

/**
 * Set up: instantiate wallets connected to providers
 */
const parentChainProvider = new providers.JsonRpcProvider(
  process.env.PARENT_CHAIN_RPC
)
const childChainProvider = new providers.JsonRpcProvider(process.env.CHAIN_RPC)

/**
 * Use the latest node created instead of the last confirmed one
 */
const useCreatedNodeInsteadOfConfirmed = false;

const main = async (childChainBlockNumberToVerify: number) => {
  await arbLog('Find whether a block of the child chain has been processed as part of an RBlock on the parent chain')

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile()

  /**
   * Use childChainNetwork to find the Rollup contract's address and instantiate a contract handler
   */
  const childChainNetwork = await getArbitrumNetwork(childChainProvider)
  const rollupAddress = childChainNetwork.ethBridge.rollup
  const rollup = new Contract(rollupAddress, RollupCore__factory.abi, parentChainProvider)
  console.log(`Rollup contract found at address ${rollup.address}`)
  
  /**
   * Get the latest node created or confirmed
   */
  const nodeId = useCreatedNodeInsteadOfConfirmed ? await rollup.latestNodeCreated() : await rollup.latestConfirmed()
  console.log(`Latest ${useCreatedNodeInsteadOfConfirmed ? 'created' : 'confirmed'} Rblock/node: ${nodeId}`)

  /**
   * Find the NodeCreated event
   */
  const nodeCreatedEventFilter = rollup.filters.NodeCreated(nodeId)
  const nodeCreatedEvents = await rollup.queryFilter(nodeCreatedEventFilter)
  if (!nodeCreatedEvents) {
    throw new Error(`INTERNAL ERROR: NodeCreated events not found for Rblock/node: ${nodeId}`)
  }
  const nodeCreatedEvent = nodeCreatedEvents[0]
  console.log(`NodeCreated event found in transaction ${nodeCreatedEvent.transactionHash}`)

  /**
   * Finding the assertion within the NodeCreated event, and getting the afterState
   */
  if (!nodeCreatedEvent.args) {
    throw new Error(`INTERNAL ERROR: NodeCreated event does not have an assertion for Rblock/node: ${nodeId}`)
  }
  const assertion = nodeCreatedEvent.args.assertion
  const afterState = assertion.afterState

  /**
   * Latest child chain's block hash processed is in the first element of the bytes32Vals property in the globalState
   */
  const lastChildChainBlockHash = afterState.globalState.bytes32Vals[0]
  console.log(`Last block hash of the child chain processed in this Rblock/node: ${lastChildChainBlockHash}`)

  /**
   * Getting the block number from that block hash
   */
  const lastChildChainBlock = await childChainProvider.getBlock(lastChildChainBlockHash)
  const lastChildChainBlockNumber = lastChildChainBlock.number
  console.log(`Last block number of the child chain processed in this Rblock/node: ${lastChildChainBlockNumber}`)

  /**
   * Final verification
   */
  console.log(`************`)
  if (lastChildChainBlockNumber > childChainBlockNumberToVerify) {
    console.log(`${childChainBlockNumberToVerify} has been processed as part of the latest ${useCreatedNodeInsteadOfConfirmed ? 'created' : 'confirmed'} RBlock/node`)
  } else {
    console.log(`${childChainBlockNumberToVerify} has NOT been processed as part of the latest ${useCreatedNodeInsteadOfConfirmed ? 'created' : 'confirmed'} RBlock/node`)
  }
  console.log(`************`)
};

// Getting the transaction hash from the command arguments
if (process.argv.length < 3) {
  console.log(`Missing block number of the child chain to verify whether it has been processed in the latest ${useCreatedNodeInsteadOfConfirmed ? 'created' : 'confirmed'} RBlock/node`)
  console.log(`Usage: yarn run exec <block number>`)
  process.exit(1)
}

const childChainBlockNumber = Number(process.argv[2]);

// Calling main
main(childChainBlockNumber)
  .then(() => process.exit(0))
  .catch(error => {
      console.error(error)
      process.exit(1)
  });