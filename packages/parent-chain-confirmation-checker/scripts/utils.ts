import { providers, BigNumber } from 'ethers';
const { addCustomNetworkFromFile } = require('arb-shared-dependencies');
import { NodeInterface__factory } from '@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory';
import { SequencerInbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/SequencerInbox__factory';
import { NODE_INTERFACE_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { getArbitrumNetwork } from '@arbitrum/sdk';

/**
 * This function will output the number of block confirmations on the parent chain, of the batch-posting transaction
 * that includes the given child chain's transaction
 */
export const checkConfirmation = async (
  txHash: string,
  childChainProvider: providers.JsonRpcProvider,
): Promise<BigNumber> => {
  // Add the custom network configuration to the SDK if present
  addCustomNetworkFromFile();

  // Call the related block hash
  let blockHash;
  try {
    blockHash = (await childChainProvider.getTransactionReceipt(txHash)).blockHash;
  } catch (e) {
    throw new Error('Check blockNumber failed, reason: ' + e);
  }

  const nodeInterface = NodeInterface__factory.connect(NODE_INTERFACE_ADDRESS, childChainProvider);

  let result;
  // Call nodeInterface precompile to get the number of confirmations the batch-posting transaction has on the parent chain.
  try {
    result = await nodeInterface.functions.getL1Confirmations(blockHash);
  } catch (e) {
    throw new Error('Check failed, reason: ' + e);
  }

  return result.confirmations;
};

// This function will output the batch-posting transaction hash on the parent chain,
// that contains the specified child chain's transaction
export const findSubmissionTx = async (
  txHash: string,
  parentChainProvider: providers.JsonRpcProvider,
  childChainProvider: providers.JsonRpcProvider,
): Promise<string> => {
  // Add the custom network configuration to the SDK if present
  addCustomNetworkFromFile();

  // Get the related block number
  let blockNumber;
  try {
    blockNumber = (await childChainProvider.getTransactionReceipt(txHash)).blockNumber;
  } catch (e) {
    throw new Error('Check blockNumber failed, reason: ' + e);
  }

  const childChainNetwork = await getArbitrumNetwork(childChainProvider);
  const nodeInterface = NodeInterface__factory.connect(NODE_INTERFACE_ADDRESS, childChainProvider);
  const sequencer = SequencerInbox__factory.connect(
    childChainNetwork.ethBridge.sequencerInbox,
    parentChainProvider,
  );

  // Call the nodeInterface precompile to get the batch number first
  let result: BigNumber;
  try {
    result = (await nodeInterface.functions.findBatchContainingBlock(blockNumber)).batch;
  } catch (e) {
    throw new Error('Check block on child chain failed, reason: ' + e);
  }

  /**
   * We use the batch number to query the sequencerInbox's SequencerBatchDelivered event on the parent chain
   * When, we get its emitted transaction hash
   */
  const queryBatch = sequencer.filters.SequencerBatchDelivered(result);
  const emittedEvent = await sequencer.queryFilter(queryBatch);

  // If no event has been emitted, we just return an empty string
  if (emittedEvent.length === 0) {
    return '';
  } else {
    return emittedEvent[0].transactionHash;
  }
};
