const { ethers } = require('hardhat');
const { providers, Wallet, BigNumber } = require('ethers');
const { getArbitrumNetwork, ParentToChildMessageStatus } = require('@arbitrum/sdk');
const {
  arbLog,
  arbLogTitle,
  requireEnvVariables,
  addCustomNetworkFromFile,
} = require('arb-shared-dependencies');
const {
  AdminErc20Bridger,
  Erc20Bridger,
} = require('@arbitrum/sdk/dist/lib/assetBridger/erc20Bridger');
const { expect } = require('chai');
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

/**
 * Set the initial supply of the token that we want to bridge
 * Note that you can change the value.
 * We also set the amount we want to send in the test deposit and withdraw
 */
const premint = ethers.utils.parseEther('1000');
const tokenAmountToDeposit = BigNumber.from(50);
const tokenAmountToWithdraw = BigNumber.from(30);

const main = async () => {
  await arbLog('Setting up your token with a custom gateway using Arbitrum SDK library');

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile();

  /**
   * Use childChainNetwork to create an Arbitrum SDK AdminErc20Bridger instance
   * We'll use AdminErc20Bridger for its convenience methods around registering tokens to a custom gateway
   */
  const childChainNetwork = await getArbitrumNetwork(childChainProvider);
  const erc20Bridger = new Erc20Bridger(childChainNetwork);
  const adminTokenBridger = new AdminErc20Bridger(childChainNetwork);
  const parentChainGatewayRouter = childChainNetwork.tokenBridge.parentGatewayRouter;
  const childChainGatewayRouter = childChainNetwork.tokenBridge.childGatewayRouter;
  const inbox = childChainNetwork.ethBridge.inbox;

  arbLogTitle('Deployment of custom gateways and tokens');

  /**
   * Deploy our custom gateway to the parent chain
   */
  const ParentChainCustomGateway = await ethers.getContractFactory(
    'ParentChainCustomGateway',
    parentChainWallet,
  );
  console.log('Deploying custom gateway to the parent chain');
  const parentChainCustomGateway = await ParentChainCustomGateway.deploy(
    parentChainGatewayRouter,
    inbox,
  );
  await parentChainCustomGateway.deployed();
  console.log(
    `Custom gateway is deployed to the parent chain at ${parentChainCustomGateway.address}`,
  );
  const parentChainCustomGatewayAddress = parentChainCustomGateway.address;

  /**
   * Deploy our custom gateway to the child chain
   */
  const ChildChainCustomGateway = await ethers.getContractFactory(
    'ChildChainCustomGateway',
    childChainWallet,
  );
  console.log('Deploying custom gateway to the child chain');
  const childChainCustomGateway = await ChildChainCustomGateway.deploy(childChainGatewayRouter);
  await childChainCustomGateway.deployed();
  console.log(
    `Custom gateway is deployed to the child chain at ${childChainCustomGateway.address}`,
  );
  const childChainCustomGatewayAddress = childChainCustomGateway.address;

  /**
   * Deploy our custom token smart contract to the parent chain
   * We give the custom token contract the address of parentChainCustomGateway
   * and parentChainGatewayRouter as well as the initial supply (premint)
   */
  const ParentChainCustomToken = await ethers.getContractFactory(
    'ParentChainToken',
    parentChainWallet,
  );
  console.log('Deploying custom token to the parent chain');
  const parentChainCustomToken = await ParentChainCustomToken.deploy(
    parentChainCustomGatewayAddress,
    parentChainGatewayRouter,
    premint,
  );
  await parentChainCustomToken.deployed();
  console.log(`custom token is deployed to the parent chain at ${parentChainCustomToken.address}`);

  /**
   * Deploy our custom token smart contract to the child chain
   * We give the custom token contract the address of childChainCustomGateway
   * and our parentChainCustomToken
   */
  const ChildChainCustomToken = await ethers.getContractFactory(
    'ChildChainToken',
    childChainWallet,
  );
  console.log('Deploying custom token to the child chain');
  const childChainCustomToken = await ChildChainCustomToken.deploy(
    childChainCustomGatewayAddress,
    parentChainCustomToken.address,
  );
  await childChainCustomToken.deployed();
  console.log(`custom token is deployed to the child chain at ${childChainCustomToken.address}`);

  /**
   * Set the token bridge information on the custom gateways
   * (This is an optional step that depends on your configuration. In this example, we've added one-shot
   * functions on the custom gateways to set the token bridge addresses in a second step. This could be
   * avoided if you are using proxies or the opcode CREATE2 for example)
   */
  console.log('Setting token bridge information on ParentChainCustomGateway:');
  const setTokenBridgeInfoOnParentChain = await parentChainCustomGateway.setTokenBridgeInformation(
    parentChainCustomToken.address,
    childChainCustomToken.address,
    childChainCustomGatewayAddress,
  );

  const setTokenBridgeInfoOnParentChainReceipt = await setTokenBridgeInfoOnParentChain.wait();
  console.log(
    `Token bridge information set on ParentChainCustomGateway! Transaction receipt in the parent chain is: ${setTokenBridgeInfoOnParentChainReceipt.transactionHash}`,
  );

  console.log('Setting token bridge information on ChildChainCustomGateway:');
  const setTokenBridgeInfoOnChildChainTransaction =
    await childChainCustomGateway.setTokenBridgeInformation(
      parentChainCustomToken.address,
      childChainCustomToken.address,
      parentChainCustomGatewayAddress,
    );

  const setTokenBridgeInfoOnChildChainTransactionReceipt =
    await setTokenBridgeInfoOnChildChainTransaction.wait();
  console.log(
    `Token bridge information set on ChildChainCustomGateway! Transaction receipt in the child chain is: ${setTokenBridgeInfoOnChildChainTransactionReceipt.transactionHash}`,
  );

  /**
   * Register the custom gateway as the gateway of our custom token
   */
  console.log('Registering custom token on the child chain:');
  const registerTokenTransaction = await adminTokenBridger.registerCustomToken(
    parentChainCustomToken.address,
    childChainCustomToken.address,
    parentChainWallet,
    childChainProvider,
  );

  const registerTokenTransactionReceipt = await registerTokenTransaction.wait();
  console.log(
    `Registering token txn confirmed on the parent chain! 🙌 Receipt is: ${registerTokenTransactionReceipt.transactionHash}.`,
  );
  console.log(
    `Waiting for the retryable to be executed on the child chain (takes 10-15 minutes); current time: ${new Date().toTimeString()})`,
  );

  /**
   * The parent chain side is confirmed; now we listen and wait for the child chain side to be executed;
   * we can do this by computing the expected txn hash of the transaction in the child chain.
   * To compute this txn hash, we need our message's "sequence numbers", unique identifiers of each cross-chain message.
   * We'll fetch them from the event logs with a helper method.
   */
  const messages = await registerTokenTransactionReceipt.getParentToChildMessages(
    childChainProvider,
  );

  /**
   * In this case, the registerTokenOnChildChain method creates 1 cross-chain message to set the parent chain token
   * to the Custom Gateway via the Router. Here, We check if that message was executed on the child chain
   */
  expect(messages.length, 'Should be 1 message.').to.eq(1);

  const setGateways = await messages[0].waitForStatus();
  expect(setGateways.status, 'Set gateways not redeemed.').to.eq(
    ParentToChildMessageStatus.REDEEMED,
  );

  console.log('Your custom token and gateways are now registered on the token bridge 🥳!');

  /**
   * We now test a deposit to verify the gateway is working as intended
   */
  arbLogTitle('Test deposit');

  const expectedParentChainGatewayAddress = await erc20Bridger.getParentGatewayAddress(
    parentChainCustomToken.address,
    parentChainProvider,
  );
  expect(
    expectedParentChainGatewayAddress,
    `Expected gateway address in the parent chain is not right: ${expectedParentChainGatewayAddress} but expected ${parentChainCustomGatewayAddress}`,
  ).to.eq(parentChainCustomGatewayAddress);

  const initialBridgeTokenBalance = await parentChainCustomToken.balanceOf(
    expectedParentChainGatewayAddress,
  );

  /**
   * Because the token might have decimals, we update the amount to deposit taking into account those decimals
   */
  const tokenDecimals = await parentChainCustomToken.decimals();
  const tokenDepositAmount = tokenAmountToDeposit.mul(BigNumber.from(10).pow(tokenDecimals));

  /**
   * Approving the parentChainCustomGateway to transfer the tokens being deposited
   */
  console.log('Approving ParentChainCustomGateway:');
  const approveTransaction = await erc20Bridger.approveToken({
    parentSigner: parentChainWallet,
    erc20ParentAddress: parentChainCustomToken.address,
  });

  const approveTransactionReceipt = await approveTransaction.wait();
  console.log(
    `You successfully allowed the Arbitrum Bridge to spend ParentChainToken. Tx hash: ${approveTransactionReceipt.transactionHash}`,
  );

  /**
   * Deposit ParentChainToken to the child chain using erc20Bridger.
   * This will escrow funds in the custom gateway contract on the parent chain,
   * and send a message to mint tokens on the child chain
   */
  console.log('Transferring ParentChainToken to the child chain:');
  const depositTransaction = await erc20Bridger.deposit({
    amount: tokenDepositAmount,
    erc20ParentAddress: parentChainCustomToken.address,
    parentSigner: parentChainWallet,
    childProvider: childChainProvider,
  });

  /**
   * Now we wait for both the transaction and the cross-chain message to be confirmed and executed
   */
  console.log(
    `Deposit initiated: waiting for the retryable to be executed on the child chain (takes 10-15 minutes; current time: ${new Date().toTimeString()}) `,
  );
  const depositTransactionReceipt = await depositTransaction.wait();
  const childChainDepositResult = await depositTransactionReceipt.waitForChildTransactionReceipt(
    childChainProvider,
  );

  /**
   * The `complete` boolean tells us if the cross-chain message was successful
   */
  if (childChainDepositResult.complete) {
    console.log(
      `Deposit to the child chain complete. Status: ${
        ParentToChildMessageStatus[childChainDepositResult.status]
      }`,
    );
  } else {
    throw new Error(
      `Deposit to the child chain failed. Status ${
        ParentToChildMessageStatus[childChainDepositResult.status]
      }`,
    );
  }

  /**
   * Get the Bridge token balance
   */
  const finalBridgeTokenBalance = await parentChainCustomToken.balanceOf(
    expectedParentChainGatewayAddress,
  );

  /**
   * Check if Bridge balance has been updated correctly
   */
  expect(
    initialBridgeTokenBalance.add(tokenDepositAmount).eq(finalBridgeTokenBalance),
    'bridge balance not updated after token deposit from parent chain',
  ).to.be.true;

  /**
   * Check if our childChainWallet token balance has been updated correctly
   * To do so, we use erc20Bridger to get the childChainToken address and contract
   */
  const childChainTokenAddress = await erc20Bridger.getChildErc20Address(
    parentChainCustomToken.address,
    parentChainProvider,
  );
  expect(
    childChainTokenAddress,
    `Expected token address in the child chain is not right: ${childChainTokenAddress} but expected ${childChainCustomToken.address}`,
  ).to.eq(childChainCustomToken.address);

  const testWalletChildChainBalance = await childChainCustomToken.balanceOf(
    childChainWallet.address,
  );
  expect(
    testWalletChildChainBalance.eq(tokenDepositAmount),
    'token balance on child chain not updated after deposit',
  ).to.be.true;

  /**
   * We finally test a withdrawal to verify that the child chain gateway is also working as intended
   */
  arbLogTitle('Test withdrawal');

  /**
   * Because the token might have decimals, we update the amount to withdraw taking into account those decimals
   */
  const tokenWithdrawAmount = tokenAmountToWithdraw.mul(BigNumber.from(10).pow(tokenDecimals));

  /**
   * Withdraw ChildChainToken to the parent chain using erc20Bridger.
   * This will burn tokens on the child chain and release funds in the custom gateway contract on the parent chain
   */
  console.log('Withdrawing ChildChainToken to the parent chain:');
  const withdrawTransaction = await erc20Bridger.withdraw({
    amount: tokenWithdrawAmount,
    destinationAddress: parentChainWallet.address,
    erc20ParentAddress: parentChainCustomToken.address,
    childSigner: childChainWallet,
  });
  const withdrawTransactionReceipt = await withdrawTransaction.wait();
  console.log(`Token withdrawal initiated! 🥳 ${withdrawTransactionReceipt.transactionHash}`);

  /**
   * And with that, our withdrawal is initiated.
   * Any time after the transaction's assertion is confirmed (around 7 days by default),
   * funds can be transferred out of the bridge via the outbox contract
   * We'll check our childChainWallet balance of the ChildChainCustomToken here:
   */
  const childChainWalletBalance = await childChainCustomToken.balanceOf(childChainWallet.address);

  expect(
    childChainWalletBalance.add(tokenWithdrawAmount).eq(tokenDepositAmount),
    'token withdraw balance not deducted',
  ).to.be.true;

  console.log(`To claim funds (after dispute period), see outbox-execute repo 🤞🏻`);

  /**
   * As a final test, we remove the ability to do deposits and test the reverting call
   */
  arbLogTitle('Test custom functionality (Disable deposits)');
  const disableTransaction = await parentChainCustomGateway.disableDeposits();
  await disableTransaction.wait();

  console.log('Trying to deposit tokens after disabling deposits');
  try {
    await erc20Bridger.deposit({
      amount: tokenDepositAmount,
      erc20ParentAddress: parentChainCustomToken.address,
      parentSigner: parentChainWallet,
      childProvider: childChainProvider,
    });
    return;
  } catch (error) {
    console.log('Transaction failed as expected');
  }

  const enableTransaction = await parentChainCustomGateway.enableDeposits();
  await enableTransaction.wait();

  console.log('Trying to deposit after enabling deposits back:');
  const depositEnabledTransaction = await erc20Bridger.deposit({
    amount: tokenDepositAmount,
    erc20ParentAddress: parentChainCustomToken.address,
    parentSigner: parentChainWallet,
    childProvider: childChainProvider,
  });
  const depositEnabledTransactionReceipt = await depositEnabledTransaction.wait();
  console.log(
    `Deposit initiated: waiting for execution of the retryable on the child chain (takes 10-15 minutes; current time: ${new Date().toTimeString()}) `,
  );
  const childChainFinalResult =
    await depositEnabledTransactionReceipt.waitForChildTransactionReceipt(childChainProvider);

  /**
   * The `complete` boolean tells us if the cross-chain message was successful
   */
  if (childChainFinalResult.complete) {
    console.log(
      `Deposit on child chain successful. Status: ${
        ParentToChildMessageStatus[childChainFinalResult.status]
      }`,
    );
  } else {
    throw new Error(
      `Deposit on child chain failed. Status: ${
        ParentToChildMessageStatus[childChainFinalResult.status]
      }`,
    );
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
