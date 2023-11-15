import { providers, Contract } from "ethers"
import { getL2Network, addDefaultLocalNetwork } from '@arbitrum/sdk'
import { RollupCore__factory } from "@arbitrum/sdk/dist/lib/abi/factories/RollupCore__factory"
import { arbLog, requireEnvVariables } from 'arb-shared-dependencies'

// Importing configuration //
require('dotenv').config()
requireEnvVariables(['L2RPC'])

// Initial setup //
const l1Provider = new providers.StaticJsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.StaticJsonRpcProvider(process.env.L2RPC)

// Configuration //
const useCreatedNodeInsteadOfConfirmed = false;

const main = async (l2BlockNumberToVerify: number) => {
  await arbLog('Find whether an L2 block has been processed as part of an RBlock')

  /**
   * Add the default local network configuration to the SDK
   * to allow this script to run on a local node
   */
  addDefaultLocalNetwork()

  /**
   * Use l2Network to find the Rollup contract's address and instantiate a contract handler
   */
  const l2Network = await getL2Network(l2Provider)
  const rollupAddress = l2Network.ethBridge.rollup
  const rollup = new Contract(rollupAddress, RollupCore__factory.abi, l1Provider)
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
    console.log(`INTERNAL ERROR: NodeCreated events not found for Rblock/node: ${nodeId}`)
    return
  }
  const nodeCreatedEvent = nodeCreatedEvents[0]
  console.log(`NodeCreated event found in transaction ${nodeCreatedEvent.transactionHash}`)

  /**
   * Finding the assertion within the NodeCreated event, and getting the afterState
   */
  if (!nodeCreatedEvent.args) {
    console.log(`INTERNAL ERROR: NodeCreated event does not have an assertion for Rblock/node: ${nodeId}`)
    return
  }
  const assertion = nodeCreatedEvent.args.assertion
  const afterState = assertion.afterState

  /**
   * Latest L2 block hash processed is in the first element of the bytes32Vals property in the globalState
   */
  const lastL2BlockHash = afterState.globalState.bytes32Vals[0]
  console.log(`Last L2 block hash processed in this Rblock/node: ${lastL2BlockHash}`)

  /**
   * Getting the block number from that block hash
   */
  const lastL2Block = await l2Provider.getBlock(lastL2BlockHash)
  const lastL2BlockNumber = lastL2Block.number
  console.log(`Last L2 block number processed in this Rblock/node: ${lastL2BlockNumber}`)

  /**
   * Final verification
   */
  console.log(`************`)
  if (lastL2BlockNumber > l2BlockNumberToVerify) {
    console.log(`${l2BlockNumberToVerify} has been processed as part of the latest ${useCreatedNodeInsteadOfConfirmed ? 'created' : 'confirmed'} RBlock/node`)
  } else {
    console.log(`${l2BlockNumberToVerify} has NOT been processed as part of the latest ${useCreatedNodeInsteadOfConfirmed ? 'created' : 'confirmed'} RBlock/node`)
  }
  console.log(`************`)
};

// Getting the transaction hash from the command arguments
if (process.argv.length < 3) {
  console.log(`Missing L2 block number to verify whether it has been processed in the latest ${useCreatedNodeInsteadOfConfirmed ? 'created' : 'confirmed'} RBlock/node`)
  console.log(`Usage: yarn run exec <L2 block number>`)
  process.exit()
}

const l2BlockNumber = Number(process.argv[2]);

// Calling main
main(l2BlockNumber)
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    });