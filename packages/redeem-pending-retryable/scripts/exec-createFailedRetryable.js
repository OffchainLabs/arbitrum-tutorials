const hre = require('hardhat');
const ethers = require('ethers');
const { providers, Wallet } = require('ethers');
const { BigNumber } = require('@ethersproject/bignumber');
const {
  arbLog,
  requireEnvVariables,
  addCustomNetworkFromFile,
} = require('arb-shared-dependencies');
const {
  ParentToChildMessageGasEstimator,
  ParentTransactionReceipt,
  ParentToChildMessageStatus,
  EthBridger,
  getArbitrumNetwork,
} = require('@arbitrum/sdk');
const { getBaseFee } = require('@arbitrum/sdk/dist/lib/utils/lib');
require('dotenv').config();
requireEnvVariables(['PRIVATE_KEY', 'CHAIN_RPC', 'PARENT_CHAIN_RPC']);

/**
 * Set up: instantiate wallets connected to providers
 */
const walletPrivateKey = process.env.PRIVATE_KEY;

const parentChainProvider = new providers.JsonRpcProvider(process.env.PARENT_CHAIN_RPC);
const childChainProvider = new providers.JsonRpcProvider(process.env.CHAIN_RPC);

const parentChainWallet = new Wallet(walletPrivateKey, parentChainProvider);
const childChainWallet = new Wallet(walletPrivateKey, childChainProvider);

const main = async () => {
  await arbLog('Creating Failed Retryables for Cross-chain Greeter');

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile();

  /**
   * Use childChainNetwork to create an Arbitrum SDK EthBridger instance
   * We'll use EthBridger to retrieve the Inbox address
   */
  const childChainNetwork = await getArbitrumNetwork(childChainProvider);
  const ethBridger = new EthBridger(childChainNetwork);
  const inboxAddress = ethBridger.childNetwork.ethBridge.inbox;

  /**
   * We deploy GreeterParent to the parent chain, GreeterChild to the child chain, each with a different "greeting" message.
   * After deploying, save each contract's counterparty's address to its state so that they can later talk to each other.
   */
  const GreeterParent = (await hre.ethers.getContractFactory('GreeterParent')).connect(
    parentChainWallet,
  );
  console.log('Deploying GreeterParent to the parent chain 👋');
  const greeterParent = await GreeterParent.deploy(
    'Hello world in the parent chain',
    ethers.constants.AddressZero, // temp child addr
    inboxAddress,
  );
  await greeterParent.deployed();
  console.log(`deployed to ${greeterParent.address}`);

  const GreeterChild = (await hre.ethers.getContractFactory('GreeterChild')).connect(
    childChainWallet,
  );
  console.log('Deploying GreeterChild to the child chain 👋👋');
  const greeterChild = await GreeterChild.deploy(
    'Hello world in the child chain',
    ethers.constants.AddressZero, // temp parent addr
  );
  await greeterChild.deployed();
  console.log(`deployed to ${greeterChild.address}`);

  const updateParentTransaction = await greeterParent.updateChildTarget(greeterChild.address);
  await updateParentTransaction.wait();

  const updateChildTransaction = await greeterChild.updateParentTarget(greeterParent.address);
  await updateChildTransaction.wait();
  console.log('Counterpart contract addresses set in both greeters 👍');

  /**
   * Let's log the child chain's greeting string
   */
  const currentChildGreeting = await greeterChild.greet();
  console.log(`Current child chain's greeting: "${currentChildGreeting}"`);

  /**
   * Here we have a new greeting message that we want to set as the greeting in the child chain; we'll be setting it by sending it as a message from the parent chain!!!
   */
  console.log('Updating greeting from Parent to Child:');
  const newGreeting = 'Greeting from far, far away';

  /**
   * Now we can query the required gas params using the estimateAll method in Arbitrum SDK
   */
  const parentToChildMessageGasEstimator = new ParentToChildMessageGasEstimator(childChainProvider);

  /**
   * To be able to estimate the gas related params to our Parent-to-Child message, we need to know how many bytes of calldata out retryable ticket will require
   * i.e., we need to calculate the calldata for the function being called (setGreeting())
   */
  const ABI = ['function setGreeting(string _greeting)'];
  const iface = new ethers.utils.Interface(ABI);
  const calldata = iface.encodeFunctionData('setGreeting', [newGreeting]);

  /**
   * Users can override the estimated gas params when sending an Parent-to-Child message
   * Note that this is totally optional
   * Here we include and example for how to provide these overriding values
   */
  const retryablesGasOverrides = {
    gasLimit: {
      base: undefined, // when undefined, the value will be estimated from rpc
      min: BigNumber.from(10000), // set a minimum gas limit, using 10000 as an example
      percentIncrease: BigNumber.from(30), // how much to increase the base for buffer
    },
    maxSubmissionFee: {
      base: undefined,
      percentIncrease: BigNumber.from(30),
    },
    maxFeePerGas: {
      base: undefined,
      percentIncrease: BigNumber.from(30),
    },
  };

  /**
   * The estimateAll method gives us the following values for sending a Parent-to-Child message
   * (1) maxSubmissionCost: The maximum cost to be paid for submitting the transaction
   * (2) gasLimit: The child chain's gas limit
   * (3) deposit: The total amount to deposit on the parent chain to cover the gas and call value for the child chain's message
   */
  const parentToChildMessageGasParams = await parentToChildMessageGasEstimator.estimateAll(
    {
      from: greeterParent.address,
      to: greeterChild.address,
      l2CallValue: 0,
      excessFeeRefundAddress: childChainWallet.address,
      callValueRefundAddress: childChainWallet.address,
      data: calldata,
    },
    await getBaseFee(parentChainProvider),
    parentChainProvider,
    // if provided, it will override the estimated values. Note that providing "RetryablesGasOverrides" is totally optional.
    retryablesGasOverrides,
  );
  console.log(
    `Current retryable base submission price is: ${parentToChildMessageGasParams.maxSubmissionCost.toString()}`,
  );

  /**
   * For the gas price of the child chain, we simply query it from the child chain's provider
   */
  const gasPriceBid = await childChainProvider.getGasPrice();
  console.log(`Child chain's gas price: ${gasPriceBid.toString()}`);

  /**
   * We are now ready to send the retryable ticket.
   * To create a failed retryable ticket, we hardcode a very low number for gas limit (e.g., 10) which leads to a failed auto redeem on the child chain
   */

  console.log(
    `Sending greeting to the child chain with ${parentToChildMessageGasParams.deposit.toString()} callValue for child chain's fees:`,
  );
  const maxGasLimit = 10;
  const setGreetingTransaction = await greeterParent.setGreetingInChild(
    newGreeting, // string memory _greeting,
    parentToChildMessageGasParams.maxSubmissionCost,
    maxGasLimit,
    gasPriceBid,
    {
      value: parentToChildMessageGasParams.deposit,
    },
  );
  const setGreetingTransactionReceipt = await setGreetingTransaction.wait();

  console.log(
    `Greeting txn confirmed on the parent chain: ${setGreetingTransactionReceipt.transactionHash}`,
  );

  const parentChainTransactionReceipt = new ParentTransactionReceipt(setGreetingTransactionReceipt);

  /**
   * In principle, a single transaction can trigger any number of Parent-to-Child messages (each with its own sequencer number).
   * In this case, we know our transaction triggered only one
   * Here, We check if our Parent-to-Child message is redeemed on the child chain
   */
  const messages = await parentChainTransactionReceipt.getParentToChildMessages(childChainWallet);
  const message = messages[0];
  console.log(
    'Waiting for the execution attempt of the transaction on the child chain. This may take up to 10-15 minutes ⏰',
  );
  const messageResult = await message.waitForStatus();
  const status = messageResult.status;
  if (status === ParentToChildMessageStatus.REDEEMED) {
    console.log(
      `Retryable ticket was successfully executed on the child chain (did you change any of the parameters?): ${messageResult.childTxReceipt.transactionHash}`,
    );
  } else {
    console.log(
      `As expected, the retryable ticket failed to execute on the child chain. Status: ${ParentToChildMessageStatus[status]}`,
    );
    console.log(
      `This retryable ticket is now pending execution. Run "yarn run redeemPendingRetryable ${setGreetingTransactionReceipt.transactionHash}" to execute it.`,
    );
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
