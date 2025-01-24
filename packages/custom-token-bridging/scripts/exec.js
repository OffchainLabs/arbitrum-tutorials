const { ethers } = require('hardhat');
const { providers, Wallet, Contract, constants } = require('ethers');
const { getArbitrumNetwork, ParentToChildMessageStatus } = require('@arbitrum/sdk');
const { AdminErc20Bridger } = require('@arbitrum/sdk/dist/lib/assetBridger/erc20Bridger');
const { ERC20__factory } = require('@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory');
const {
  arbLog,
  requireEnvVariables,
  addCustomNetworkFromFile,
} = require('arb-shared-dependencies');
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
 * Note that you can change the value
 */
const premine = ethers.utils.parseEther('3');

const main = async () => {
  await arbLog('Setting Up Your Token With The Generic Custom Gateway Using Arbitrum SDK Library');

  /**
   * Add the custom network configuration to the SDK if present
   */
  addCustomNetworkFromFile();

  /**
   * Use childChainNetwork to create an Arbitrum SDK AdminErc20Bridger instance
   * We'll use AdminErc20Bridger for its convenience methods around registering tokens to the custom gateway
   */
  const childChainNetwork = await getArbitrumNetwork(childChainProvider);
  const adminTokenBridger = new AdminErc20Bridger(childChainNetwork);

  const parentChainGateway = childChainNetwork.tokenBridge.parentCustomGateway;
  const parentChainRouter = childChainNetwork.tokenBridge.parentGatewayRouter;
  const childChainGateway = childChainNetwork.tokenBridge.childCustomGateway;

  /**
   * We first find out whether the child chain we are using is a custom gas token chain
   * We'll use a different parent chain token contract in that case (the register method has
   * a slightly different behavior) and we'll perform an additional approve call to transfer
   * the native tokens to pay for the gas of the retryable tickets
   */
  const isCustomGasTokenChain =
    adminTokenBridger.nativeToken && adminTokenBridger.nativeToken !== constants.AddressZero;

  /**
   * Deploy our custom token smart contract to the parent chain
   * We give the custom token contract the address of parentChainCustomGateway and parentChainGatewayRouter
   * as well as the initial supply (premine). If the child chain we are using is a custom gas token chain,
   * we will deploy a different ParentChainToken contract, since the register method has a slightly different behavior
   */
  const parentChainTokenContractName = isCustomGasTokenChain
    ? 'contracts/ParentChainTokenCustomGas.sol:ParentChainToken'
    : 'contracts/ParentChainToken.sol:ParentChainToken';
  const ParentChainCustomToken = await (
    await ethers.getContractFactory(parentChainTokenContractName)
  ).connect(parentChainWallet);
  console.log('Deploying custom token to the parent chain');
  const parentChainCustomToken = await ParentChainCustomToken.deploy(
    parentChainGateway,
    parentChainRouter,
    premine,
  );
  await parentChainCustomToken.deployed();
  console.log(`custom token is deployed to the parent chain at ${parentChainCustomToken.address}`);

  /**
   * Deploy our custom token smart contract to the child chain
   * We give the custom token contract the address of childChainCustomGateway and our parentChainCustomToken
   */
  const ChildChainCustomToken = await (
    await ethers.getContractFactory('ChildChainToken')
  ).connect(childChainWallet);
  console.log('Deploying custom token to the child chain');
  const childChainCustomToken = await ChildChainCustomToken.deploy(
    childChainGateway,
    parentChainCustomToken.address,
  );
  await childChainCustomToken.deployed();
  console.log(`custom token is deployed to the child chain at ${childChainCustomToken.address}`);

  /**
   * For chains that use a custom gas token, we'll have to approve the transfer of native tokens
   * to pay for the execution of the retryable tickets on the child chain
   */
  if (isCustomGasTokenChain) {
    console.log('Giving allowance to the deployed token to transfer the chain native token');
    const nativeToken = new Contract(
      childChainNetwork.nativeToken,
      ERC20__factory.abi,
      parentChainWallet,
    );
    const approvalTransaction = await nativeToken.approve(
      parentChainCustomToken.address,
      ethers.utils.parseEther('1'),
    );
    const approvalTransactionReceipt = await approvalTransaction.wait();
    console.log(`Approval transaction receipt is: ${approvalTransactionReceipt.transactionHash}`);
  }

  /**
   * Register custom token on our custom gateway
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
    `Registering token txn confirmed! 🙌 Transaction receipt in the parent chain is: ${registerTokenTransactionReceipt.transactionHash}`,
  );

  /**
   * The parent chain side is confirmed; now we listen and wait for the child chain side to be executed;
   * we can do this by computing the expected txn hash of the transaction on the child chain.
   * To compute this txn hash, we need our message's "sequence numbers", unique identifiers of each cross-chain message.
   * We'll fetch them from the event logs with a helper method.
   */
  const messages = await registerTokenTransactionReceipt.getParentToChildMessages(
    childChainProvider,
  );

  /**
   * In principle, a single transaction on the parent chain can trigger any number of cross-chain messages
   * (each with its own sequencer number). In this case, the registerTokenOnL2 method created 2 cross-chain messages:
   * - (1) one to set the parent chain token to the Custom Gateway via the Router, and
   * - (2) another to set the parent chain token to its child chain token address via the Generic-Custom Gateway
   * Here, We check if both messages have been redeemed on the child chain
   */
  expect(messages.length, 'Should be 2 messages.').to.eq(2);

  const setTokenMessage = await messages[0].waitForStatus();
  expect(setTokenMessage.status, 'Set token not redeemed.').to.eq(
    ParentToChildMessageStatus.REDEEMED,
  );

  const setGatewaysMessage = await messages[1].waitForStatus();
  expect(setGatewaysMessage.status, 'Set gateways not redeemed.').to.eq(
    ParentToChildMessageStatus.REDEEMED,
  );

  console.log(
    'Your custom token is now registered on our custom gateway 🥳  Go ahead and make the deposit!',
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
