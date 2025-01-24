import { providers, Wallet, BigNumber } from 'ethers';
import { arbLog, requireEnvVariables, addCustomNetworkFromFile } from 'arb-shared-dependencies';
import { Erc20L1L3Bridger, getArbitrumNetwork } from '@arbitrum/sdk';
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory';
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

const main = async (params: {
  l1Token: string;
  amount: BigNumber;
  l3Recipient?: string;
  skipGasToken?: boolean;
}) => {
  await arbLog(`Bridging tokens from L1 to L3`);

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile();

  /**
   * Use L3 Network to initialize a bridger
   */
  const l3Network = await getArbitrumNetwork(l3Provider);
  const bridger = new Erc20L1L3Bridger(l3Network);

  /**
   * Information about the configuration of the bridger
   *
   * Note that if the L3's gas token is not ETH you must pay for the L2->L3 fee in the L3's gas token.
   * In this case you may either:
   * A) Pay the fee in the L3's gas token when initiating the deposit on L1.
   *    This can only be done if the gas token is available and held on L1.
   *    This is the default behavior, and no additional steps are required besides approving the gas token.
   * B) Manually redeem the retryable on L3 to pay the fee (this can be done by anyone, not just the sender of the deposit).
   *    If the gas token is unavailable on L1 or skipGasToken is set to true, manual redemption is required.
   *
   * If the L3 uses ETH for fees, all retryables are paid for when initiating the deposit by default and no additional steps are required.
   */
  const l1ChainId = (await l1Provider.getNetwork()).chainId;
  const l2ChainId = (await l2Provider.getNetwork()).chainId;
  const l3ChainId = (await l3Provider.getNetwork()).chainId;
  const signerAddress = await l1Signer.getAddress();
  const l3GasTokenAddressOnL1 = await bridger.getGasTokenOnL1(l1Provider, l2Provider);
  const gasTokenSymbol = bridger.l2GasTokenAddress
    ? await ERC20__factory.connect(bridger.l2GasTokenAddress, l2Provider).symbol()
    : 'ETH';
  console.log('L1 chain id:', l1ChainId);
  console.log('L2 chain id:', l2ChainId);
  console.log('L3 chain id:', l3ChainId);
  console.log('L1 token:', params.l1Token);
  console.log('L3 gas token:', gasTokenSymbol || 'ETH');
  console.log('L3 gas token address on L2:', bridger.l2GasTokenAddress || 'ETH');
  console.log('L3 gas token address on L1:', l3GasTokenAddressOnL1);
  console.log('Recipient:', params.l3Recipient || signerAddress);
  console.log('Amount:', params.amount.toString());

  /**
   * Get a deposit request
   */
  console.log('Getting deposit request...');
  const depositRequest = await bridger.getDepositRequest({
    l1Signer,
    erc20L1Address: params.l1Token,
    amount: params.amount,
    l2Provider,
    l3Provider,
    destinationAddress: params.l3Recipient, // optional, defaults to signer's address
    /**
     * Optional, defaults to false.
     * Skips paying the L2->L3 fee if the L3 doesn't use ETH for fees
     * This has no effect if the L3 uses ETH for fees.
     */
    skipGasToken: params.skipGasToken,
  });
  console.log('Done');

  /**
   * If the deposit request has non-zero gasTokenAmount, we are paying for the L2->L3 retryable when initiating the deposit.
   * We must approve the gas token on L1.
   */
  if (depositRequest.gasTokenAmount.gt(0)) {
    console.log('Approving gas token on L1...');
    await (
      await bridger.approveGasToken({
        l1Signer,
        l2Provider,
        amount: depositRequest.gasTokenAmount,
      })
    ).wait();
    console.log('Done');
  }

  /**
   * Approve the token on L1
   */
  console.log('Approving token on L1...');
  await (
    await bridger.approveToken({
      erc20L1Address: params.l1Token,
      l1Signer,
      amount: params.amount, // optional, defaults to max
    })
  ).wait();
  console.log('Done');

  /**
   * Deposit the token
   */
  console.log('Depositing token...');
  const depositTx = await bridger.deposit({
    txRequest: depositRequest.txRequest,
    l1Signer,
  });
  await depositTx.wait();
  console.log('Done');
  console.log(
    'Initiated deposit! L1-to-L2 retryables will be created, which will create an L2-to-L3 retryable to deposit the tokens.',
  );
  console.log('Transaction hash:', depositTx.hash);
  console.log(`To monitor your deposit, use:\nyarn monitor-deposit-status ${depositTx.hash}`);
};

const args = yargs(hideBin(process.argv))
  .options({
    l1Token: {
      type: 'string',
      description: 'L1 token address',
      demandOption: true,
    },
    amount: {
      type: 'number',
      description: 'Amount of tokens to bridge',
      demandOption: true,
    },
    l3Recipient: {
      type: 'string',
      description: 'L3 recipient address',
    },
    skipGasToken: {
      type: 'boolean',
      description:
        "Skip paying the L2-to-L3 fee if the L3 doesn't use ETH for fees.\nThis has no effect if the L3 uses ETH for fees.",
      default: false,
    },
  })
  .usage('Initiate a deposit of ERC-20 tokens from L1 to L3')
  .parseSync();

main({
  l1Token: args.l1Token,
  amount: BigNumber.from(args.amount),
  l3Recipient: args.l3Recipient,
  skipGasToken: args.skipGasToken,
})
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
