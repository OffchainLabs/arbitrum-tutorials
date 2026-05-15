const { utils, providers, Wallet, constants } = require('ethers');
const { getArbitrumNetwork, EthBridger, EthDepositMessageStatus } = require('@arbitrum/sdk');
const {
  arbLog,
  requireEnvVariables,
  addCustomNetworkFromFile,
} = require('arb-shared-dependencies');
require('dotenv').config();
requireEnvVariables(['PRIVATE_KEY', 'CHAIN_RPC', 'PARENT_CHAIN_RPC']);

/**
 * Set up: instantiate wallets connected to providers
 */
const walletPrivateKey = process.env.PRIVATE_KEY;

const parentChainProvider = new providers.JsonRpcProvider(process.env.PARENT_CHAIN_RPC);
const childChainProvider = new providers.JsonRpcProvider(process.env.CHAIN_RPC);

const parentChainWallet = new Wallet(walletPrivateKey, parentChainProvider);

/**
 * Get destination address from command line arguments
 * Usage: node exec.js <destination_address> [amount_in_eth]
 */
const destAddress = process.argv[2];
if (!destAddress) {
  console.error('Error: Please provide a destination address as the first argument');
  console.error('Usage: node exec.js <destination_address> [amount_in_eth]');
  process.exit(1);
}

// Validate the address format
if (!utils.isAddress(destAddress)) {
  console.error('Error: Invalid destination address format');
  process.exit(1);
}

/**
 * Set the amount to be deposited in the child chain (in wei)
 * Default to 0.0001 ETH if not specified
 */
const depositAmount = process.argv[3] 
  ? utils.parseEther(process.argv[3])
  : utils.parseEther('0.0001');

const main = async () => {
  await arbLog('Deposit native token (e.g. Ether) via Arbitrum SDK to a different address');

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile();

  /**
   * Use childChainNetwork to create an Arbitrum SDK EthBridger instance
   * We'll use EthBridger for its convenience methods around transferring the native asset to the child chain
   */
  const childChainNetwork = await getArbitrumNetwork(childChainProvider);
  const ethBridger = new EthBridger(childChainNetwork);
  const isCustomGasTokenChain =
    ethBridger.nativeToken && ethBridger.nativeToken !== constants.AddressZero;

  /**
   * First, let's check the balance of the destination address
   */
  const destinationAddressInitialEthBalance = await childChainProvider.getBalance(destAddress);

  /**
   * For chains that use a custom gas token, we'll have to approve the transfer of native tokens
   * to pay for the execution of the retryable tickets on the child chain
   */
  if (isCustomGasTokenChain) {
    console.log('Giving allowance to the deployed token to transfer the chain native token');
    const approvalTransaction = await ethBridger.approveGasToken({
      erc20ParentAddress: ethBridger.nativeToken,
      parentSigner: parentChainWallet,
    });

    const approvalTransactionReceipt = await approvalTransaction.wait();
    console.log(
      `Native token approval transaction receipt is: ${approvalTransactionReceipt.transactionHash}`,
    );
  }

  /**
   * Transfer ether (or native token) from parent chain to a different address on child chain
   * This convenience method automatically queries for the retryable's max submission cost and forwards the appropriate amount to the specified address on the child chain
   * by using a retryable ticket instead of a regular deposit.
   * Arguments required are:
   * (1) amount: The amount of ETH (or native token) to be transferred
   * (2) parentSigner: The address on the parent chain of the account transferring ETH (or native token) to the child chain
   * (3) childProvider: A provider of the child chain
   * (4) destinationAddress: The address where the ETH will be sent to
   */
  const depositTransaction = await ethBridger.depositTo({
    amount: depositAmount,
    parentSigner: parentChainWallet,
    childProvider: childChainProvider,
    destinationAddress: destAddress,
  });
  const depositTransactionReceipt = await depositTransaction.wait();
  console.log('Deposit receipt on the parent chain is:', depositTransactionReceipt.transactionHash);

  /**
   * With the transaction confirmed on the parent chain, we now wait for the child chain's side (i.e., balance credited to the child chain) to be confirmed as well.
   * Here we're waiting for the sequencer to include the message in its off-chain queue. The sequencer should include it in around 15 minutes.
   */
  console.log(`Now we wait for child chain's side of the transaction to be executed ⏳`);
  const transactionResult = await depositTransactionReceipt.waitForChildTransactionReceipt(
    childChainProvider,
  );

  /**
   * The `complete` boolean tells us if the cross-chain message was successful
   */
  if (transactionResult.complete) {
    console.log(
      `Message successfully executed on the child chain. Status: ${
        EthDepositMessageStatus[await transactionResult.message.status()]
      }`,
    );
  } else {
    throw new Error(
      `Message failed execution on the child chain . Status ${
        EthDepositMessageStatus[await transactionResult.message.status()]
      }`,
    );
  }

  /**
   * Our destination address balance should be updated now
   */
  const destinationAddressUpdatedEthBalance = await childChainProvider.getBalance(destAddress);
  console.log(
    `Balance of the destination address has been updated from ${destinationAddressInitialEthBalance.toString()} to ${destinationAddressUpdatedEthBalance.toString()}`,
  );
};
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
