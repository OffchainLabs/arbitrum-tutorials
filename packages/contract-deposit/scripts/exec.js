const { providers, Wallet } = require('ethers');
const { BigNumber } = require('@ethersproject/bignumber');
const hre = require('hardhat');
const ethers = require('ethers');
const {
  arbLog,
  requireEnvVariables,
  addCustomNetworkFromFile,
} = require('arb-shared-dependencies');
const {
  EthBridger,
  Address,
  EthDepositStatus,
  ParentToChildMessageGasEstimator,
  ParentTransactionReceipt,
  ParentToChildMessageStatus,
  getArbitrumNetwork,
  ParentEthDepositTransactionReceipt,
} = require('@arbitrum/sdk');
const { getBaseFee } = require('@arbitrum/sdk/dist/lib/utils/lib');
const { ERC20__factory } = require('@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory');
require('dotenv').config();
requireEnvVariables(['PRIVATE_KEY', 'CHAIN_RPC', 'PARENT_CHAIN_RPC', 'TransferTo']);

/**
 * Set up: instantiate wallets connected to providers
 */
const walletPrivateKey = process.env.PRIVATE_KEY;

const parentChainProvider = new providers.JsonRpcProvider(process.env.PARENT_CHAIN_RPC);
const childChainProvider = new providers.JsonRpcProvider(process.env.CHAIN_RPC);

const parentChainWallet = new Wallet(walletPrivateKey, parentChainProvider);
const childChainWallet = new Wallet(walletPrivateKey, childChainProvider);

const transferTo = process.env.TransferTo;

const main = async () => {
  await arbLog('Contract Cross-chain depositer');

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
   * We find out whether the child chain we are using is a custom gas token chain
   * We need to perform an additional approve call to transfer
   * the native tokens to pay for the gas of the retryable tickets.
   */
  const isCustomGasTokenChain =
    childChainNetwork.nativeToken && childChainNetwork.nativeToken !== ethers.constants.AddressZero;

  /**
   * We deploy EthDeposit contract to the parent chain first and send eth to
   * the child chain via this contract.
   * Funds will deposit to the contract's alias address first.
   */
  const depositContractName = isCustomGasTokenChain ? 'CustomGasTokenDeposit' : 'EthDeposit';
  const DepositContract = (await hre.ethers.getContractFactory(depositContractName)).connect(
    parentChainWallet,
  );
  console.log(`Deploying ${depositContractName} contract...`);
  const depositContract = await DepositContract.deploy(inboxAddress);
  await depositContract.deployed();
  console.log(`deployed to ${depositContract.address}`);

  /**
   * This sdk class will help we to get the alias address of the contract
   */
  const contractAddress = new Address(depositContract.address);
  const contractAliasAddress = contractAddress.applyAlias().value;

  console.log(`Sending deposit transaction...`);

  let depositTx;
  let nativeTokenDecimals = 18; // We default to 18 decimals for ETH and most of ERC-20 tokens
  if (isCustomGasTokenChain) {
    // Approve the gas token to be sent to the contract
    console.log('Giving allowance to the contract to transfer the chain native token');
    const nativeToken = new ethers.Contract(
      childChainNetwork.nativeToken,
      ERC20__factory.abi,
      parentChainWallet,
    );
    nativeTokenDecimals = await nativeToken.decimals();
    const approvalTransaction = await nativeToken.approve(
      depositContract.address,
      ethers.utils.parseUnits('1', nativeTokenDecimals),
    );
    const approvalTransactionReceipt = await approvalTransaction.wait();
    console.log(`Approval transaction receipt is: ${approvalTransactionReceipt.transactionHash}`);

    depositTx = await depositContract.depositToChildChain(
      ethers.utils.parseUnits('0.01', nativeTokenDecimals),
    );
  } else {
    depositTx = await depositContract.depositToChildChain({
      value: ethers.utils.parseEther('0.01'), // Here we know we are using ETH, so we can use parseEther
    });
  }
  const depositReceipt = await depositTx.wait();

  console.log(`Deposit txn confirmed on the parent chain! 🙌 ${depositReceipt.transactionHash}`);

  console.log(
    'Waiting for the execution of the deposit in the child chain. This may take up to 10-15 minutes ⏰',
  );

  const parentChainDepositTxReceipt = new ParentEthDepositTransactionReceipt(depositReceipt);
  const childChainDepositResult = await parentChainDepositTxReceipt.waitForChildTransactionReceipt(
    childChainProvider,
  );

  /**
   * If deposit success, check the alias address' balance.
   * If deposit failed, throw an error.
   */
  if (childChainDepositResult.complete) {
    console.log(
      `Deposit to the child chain is complete, the tx hash (in the child chain) is ${childChainDepositResult.childTxReceipt.transactionHash}`,
    );
    const beforeAliasBalance = await childChainProvider.getBalance(contractAliasAddress);
    console.log(
      `The balance on the alias address in the child chain before transfer: "${ethers.utils.formatEther(
        beforeAliasBalance,
      )} ethers"`,
    );
  } else {
    throw new Error(
      `Deposit to the child chain failed, DepositStatus is ${
        EthDepositStatus[childChainDepositResult.message.status]
      }`,
    );
  }

  console.log('Creating retryable ticket to send txn to the child chain to transfer funds...');

  /**
   * Now we can query the required gas params using the estimateAll method in Arbitrum SDK
   */
  const parentToChildMessageGasEstimate = new ParentToChildMessageGasEstimator(childChainProvider);

  /**
   * Users can override the estimated gas params when sending a parent-to-child message
   * Note that this is totally optional
   * Here we include and example for how to provide these overriding values
   */
  const RetryablesGasOverrides = {
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
   * The estimateAll method gives us the following values for sending a ParentToChild message
   * (1) maxSubmissionCost: The maximum cost to be paid for submitting the transaction
   * (2) gasLimit: The gas limit for execution in the child chain
   * (3) deposit: The total amount to deposit on the parent chain to cover gas and call value on the child chain
   */
  const parentToChildMessageGasParams = await parentToChildMessageGasEstimate.estimateAll(
    {
      from: contractAliasAddress,
      to: transferTo,
      l2CallValue: ethers.utils.parseUnits('0.01', nativeTokenDecimals), // because we deposited 0.01 ether, so we also transfer 0.01 ether out here.
      excessFeeRefundAddress: depositContract.address,
      callValueRefundAddress: depositContract.address,
      data: [],
    },
    await getBaseFee(parentChainProvider),
    parentChainProvider,
    RetryablesGasOverrides, //if provided, it will override the estimated values. Note that providing "RetryablesGasOverrides" is totally optional.
  );
  console.log(
    `Current retryable base submission price is: ${ethers.utils.formatEther(
      parentToChildMessageGasParams.maxSubmissionCost.toString(),
    )} ethers`,
  );

  /**
   * For the gas price in the child chain, we simply query it from the child chain's provider, as we would when using the parent chain
   */
  const gasPriceBid = await childChainProvider.getGasPrice();
  console.log(
    `Child chain's gas price: ${ethers.utils.formatUnits(gasPriceBid.toString(), 'gwei')} gwei`,
  );

  /**
   * Because parentToChildMessageGasParams.deposit adds the l2callvalue to the estimate,
   * we need to subtract it here so the transaction in the parent chain doesn't pay l2callvalue
   * and instead uses the alias balance on the child chain directly.
   */
  const depositAmount = parentToChildMessageGasParams.deposit.sub(
    ethers.utils.parseUnits('0.01', nativeTokenDecimals),
  );

  console.log(
    `Transfer funds txn needs ${ethers.utils.formatEther(
      depositAmount,
    )} ethers callValue for fees in the child chain`,
  );

  /**
   * Call the contract's method to transfer the funds from the alias to the address you set
   */
  let setTransferTx;
  if (isCustomGasTokenChain) {
    // We don't need to give allowance to the contract now since we already gave plenty in the
    // previous step

    setTransferTx = await depositContract.moveFundsFromChildChainAliasToAnotherAddress(
      transferTo,
      ethers.utils.parseUnits('0.01', nativeTokenDecimals), // because we deposited 0.01 ether, so we also transfer 0.01 ether out here.
      parentToChildMessageGasParams.maxSubmissionCost,
      parentToChildMessageGasParams.gasLimit,
      gasPriceBid,
      depositAmount,
    );
  } else {
    setTransferTx = await depositContract.moveFundsFromChildChainAliasToAnotherAddress(
      transferTo,
      ethers.utils.parseEther('0.01'), // because we deposited 0.01 ether, so we also transfer 0.01 ether out here.
      parentToChildMessageGasParams.maxSubmissionCost,
      parentToChildMessageGasParams.gasLimit,
      gasPriceBid,
      {
        value: depositAmount,
      },
    );
  }
  const setTransferRec = await setTransferTx.wait();

  console.log(
    `Transfer funds txn confirmed on the parent chain! 🙌 ${setTransferRec.transactionHash}`,
  );

  const parentTransferTxReceipt = new ParentTransactionReceipt(setTransferRec);

  /**
   * In principle, a single txn on the parent chain can trigger any number of ParentToChild messages
   * (each with its own sequencer number). In this case, we know our txn triggered only one
   * Here, We check if our ParentToChild message is redeemed on the child chain
   */
  const messages = await parentTransferTxReceipt.getParentToChildMessages(childChainWallet);
  const message = messages[0];
  console.log(
    'Waiting for the execution of the transaction on the child chain. This may take up to 10-15 minutes ⏰',
  );
  const messageResult = await message.waitForStatus();
  const status = messageResult.status;
  if (status === ParentToChildMessageStatus.REDEEMED) {
    console.log(
      `Retryable ticket is executed in the child chain 🥳 ${messageResult.childTxReceipt.transactionHash}`,
    );
  } else {
    throw new Error(
      `Retryable ticket execution failed in the child chain with status ${ParentToChildMessageStatus[status]}`,
    );
  }

  /**
   * Now when we get the balance again, we should see the funds transferred to the address you set
   */
  const afterAliasBalance = await childChainProvider.getBalance(contractAliasAddress);
  const balanceOnTransferTo = await childChainProvider.getBalance(transferTo);
  console.log(
    `The current balance on the alias of the address in the child chain: "${ethers.utils.formatEther(
      afterAliasBalance,
    )} ethers"`,
  );
  console.log(
    `The current balance on the address you set in the child chain: "${ethers.utils.formatEther(
      balanceOnTransferTo,
    )} ethers"`,
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
