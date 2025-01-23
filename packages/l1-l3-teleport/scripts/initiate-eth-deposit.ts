import { providers, Wallet, BigNumber } from 'ethers';
import { arbLog, requireEnvVariables, addCustomNetworkFromFile } from 'arb-shared-dependencies';
import { EthL1L3Bridger, getArbitrumNetwork } from '@arbitrum/sdk';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
require('dotenv').config();
requireEnvVariables(['PRIVATE_KEY', 'CHAIN_RPC', 'PARENT_CHAIN_RPC', 'L1_RPC']);

/**
 * Set up: instantiate wallets connected to providers
 */
const walletPrivateKey = process.env.PRIVATE_KEY!;

const l1Provider = new providers.JsonRpcProvider(process.env.L1_RPC);
const l2Provider = new providers.JsonRpcProvider(process.env.PARENT_CHAIN_RPC);
const l3Provider = new providers.JsonRpcProvider(process.env.CHAIN_RPC);

const l1Signer = new Wallet(walletPrivateKey, l1Provider);

const main = async (params: { amount: BigNumber; l3Recipient?: string }) => {
  await arbLog(`Bridging ETH from L1 to L3`);

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile();

  /**
   * Use L3 Network to initialize a bridger
   */
  const l3Network = await getArbitrumNetwork(l3Provider);
  const bridger = new EthL1L3Bridger(l3Network);

  /**
   * Information about the configuration of the bridger
   */
  const l1ChainId = (await l1Provider.getNetwork()).chainId;
  const l2ChainId = (await l2Provider.getNetwork()).chainId;
  const l3ChainId = (await l3Provider.getNetwork()).chainId;
  const signerAddress = await l1Signer.getAddress();
  console.log('L1 chain id:', l1ChainId);
  console.log('L2 chain id:', l2ChainId);
  console.log('L3 chain id:', l3ChainId);
  console.log('Recipient:', params.l3Recipient || signerAddress);
  console.log('Amount:', params.amount.toString());

  /**
   * Get a deposit request
   */
  console.log('Getting deposit request...');
  const depositRequest = await bridger.getDepositRequest({
    l1Signer,
    amount: params.amount,
    l2Provider,
    l3Provider,
    destinationAddress: params.l3Recipient, // optional, defaults to signer's address
  });
  console.log('Done');

  /**
   * Deposit ETH
   */
  console.log('Depositing ETH...');
  const depositTx = await bridger.deposit({
    ...depositRequest,
    l1Signer,
  });
  await depositTx.wait();
  console.log('Done');

  console.log(
    'Initiated deposit! An L1-to-L2 retryable will be created, which will create an L2-to-L3 retryable to deposit ETH.',
  );
  console.log('Transaction hash:', depositTx.hash);
  console.log(`To monitor your deposit, use:\nyarn monitor-eth-deposit-status ${depositTx.hash}`);
};

const args = yargs(hideBin(process.argv))
  .options({
    amount: {
      type: 'number',
      description: 'Amount of ETH to bridge',
      demandOption: true,
    },
    l3Recipient: {
      type: 'string',
      description: 'L3 recipient address',
    },
  })
  .usage('Initiate a deposit of ETH from L1 to L3')
  .parseSync();

main({
  amount: BigNumber.from(args.amount),
  l3Recipient: args.l3Recipient,
})
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
