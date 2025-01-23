const { utils, providers, Wallet } = require('ethers');
const { getArbitrumNetwork, EthBridger } = require('@arbitrum/sdk');
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
const childChainProvider = new providers.JsonRpcProvider(process.env.CHAIN_RPC);
const childChainWallet = new Wallet(walletPrivateKey, childChainProvider);

/**
 * Set the amount to be withdrawn from the child chain (in wei)
 */
const withdrawAmount = utils.parseEther('0.000001');

const main = async () => {
  await arbLog('Withdraw Eth via Arbitrum SDK');

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile();

  /**
   * Use childChainNetwork to create an Arbitrum SDK EthBridger instance
   * We'll use EthBridger for its convenience methods around transferring the native asset to the parent chain
   */
  const childChainNetwork = await getArbitrumNetwork(childChainProvider);
  const ethBridger = new EthBridger(childChainNetwork);

  /**
   * First, let's check our wallet's initial balance in the child chain and ensure there's some native asset to withdraw
   */
  const initialEthBalance = await childChainWallet.getBalance();

  if (initialEthBalance.lt(withdrawAmount)) {
    throw new Error(
      `Oops - not enough balance; fund your wallet on the child chain ${childChainWallet.address} with at least 0.000001 ether (or your chain's gas token)`,
    );
  }
  console.log('Wallet properly funded: initiating withdrawal now');

  /**
   * We're ready to withdraw the native asset using the ethBridger instance from Arbitrum SDK
   * It will use our current wallet's address as the default destination
   */
  const withdrawTransaction = await ethBridger.withdraw({
    amount: withdrawAmount,
    childSigner: childChainWallet,
    destinationAddress: childChainWallet.address,
  });
  const withdrawTransactionReceipt = await withdrawTransaction.wait();

  /**
   * And with that, our withdrawal is initiated! No additional time-sensitive actions are required.
   * Any time after the transaction's assertion is confirmed, funds can be transferred out of the bridge via the outbox contract
   * We'll display the withdrawals event data here:
   */
  console.log(`Ether withdrawal initiated! 🥳 ${withdrawTransactionReceipt.transactionHash}`);

  const withdrawEventsData = withdrawTransactionReceipt.getChildToParentEvents();
  console.log('Withdrawal data:', withdrawEventsData);
  console.log(
    `To claim funds (after dispute period), run the outbox-execute tutorial using the transaction hash ${withdrawTransactionReceipt.transactionHash} 🫡`,
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
