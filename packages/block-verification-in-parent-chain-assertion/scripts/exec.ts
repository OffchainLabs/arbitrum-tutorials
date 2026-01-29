import { providers, Contract } from 'ethers';
import { getArbitrumNetwork } from '@arbitrum/sdk';
import { BoldRollupUserLogic__factory } from '@arbitrum/sdk/dist/lib/abi-bold/factories/BoldRollupUserLogic__factory';
import { arbLog, requireEnvVariables, addCustomNetworkFromFile } from 'arb-shared-dependencies';
require('dotenv').config();
requireEnvVariables(['CHAIN_RPC', 'PARENT_CHAIN_RPC']);

/**
 * Set up: instantiate wallets connected to providers
 */
const parentChainProvider = new providers.JsonRpcProvider(process.env.PARENT_CHAIN_RPC);
const childChainProvider = new providers.JsonRpcProvider(process.env.CHAIN_RPC);

const main = async (childChainBlockNumberToVerify: number) => {
  await arbLog(
    'Find whether a block of the child chain has been processed as part of an RBlock on the parent chain',
  );

  addCustomNetworkFromFile();

  const childChainNetwork = await getArbitrumNetwork(childChainProvider);
  const rollupAddress = childChainNetwork.ethBridge.rollup;
  const rollup = new Contract(rollupAddress, BoldRollupUserLogic__factory.abi, parentChainProvider);
  console.log(`Rollup contract found at address ${rollup.address}`);

  const assertionHash: string = await rollup.latestConfirmed();
  console.log(`Latest confirmed assertion hash: ${assertionHash}`);

  const assertionCreatedEventFilter = (rollup as any).filters.AssertionCreated(assertionHash);
  const assertionCreatedEvents = await rollup.queryFilter(assertionCreatedEventFilter);
  if (!assertionCreatedEvents || assertionCreatedEvents.length === 0) {
    throw new Error(
      `INTERNAL ERROR: AssertionCreated events not found for assertion: ${assertionHash}`,
    );
  }
  const assertionCreatedEvent = assertionCreatedEvents[0];
  console.log(
    `AssertionCreated event found in transaction ${assertionCreatedEvent.transactionHash}`,
  );

  if (!assertionCreatedEvent.args) {
    throw new Error(
      `INTERNAL ERROR: AssertionCreated event does not have an assertion for hash: ${assertionHash}`,
    );
  }
  const assertion = (assertionCreatedEvent as any).args.assertion;
  const afterState = assertion.afterState;

  // Latest child chain's block hash processed is in the first element of the bytes32Vals property in the globalState
  const lastChildChainBlockHash = afterState.globalState.bytes32Vals[0];
  console.log(
    `Last block hash of the child chain processed in this Rblock/node: ${lastChildChainBlockHash}`,
  );

  // Getting the block number from that block hash

  const lastChildChainBlock = await childChainProvider.getBlock(lastChildChainBlockHash);
  const lastChildChainBlockNumber = lastChildChainBlock.number;
  console.log(
    `Last block number of the child chain processed in this Rblock/node: ${lastChildChainBlockNumber}`,
  );

  // Final verification
  console.log(`************`);
  if (lastChildChainBlockNumber > childChainBlockNumberToVerify) {
    console.log(
      `${childChainBlockNumberToVerify} has been processed as part of the latest confirmed assertion`,
    );
  } else {
    console.log(
      `${childChainBlockNumberToVerify} has NOT been processed as part of the latest confirmed assertion`,
    );
  }
  console.log(`************`);
};

// Getting the transaction hash from the command arguments
if (process.argv.length < 3) {
  console.log(
    'Missing block number of the child chain to verify whether it has been processed in the latest confirmed assertion',
  );
  console.log(`Usage: yarn run exec <block number>`);
  process.exit(1);
}

const childChainBlockNumber = Number(process.argv[2]);

// Calling main
main(childChainBlockNumber)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
