/**
 * Force Inclusion End-to-End Test
 *
 * This script runs the full force inclusion cycle in one command:
 *   1. Deploy a new Orbit rollup with a short force inclusion delay (90s)
 *   2. Deposit ETH via the delayed inbox on the parent chain
 *   3. Wait for the delay window, then force include the deposit
 *   4. (Optional, --with-node) Start a fullnode to verify the L2 state
 *
 * Usage:
 *   node scripts/force-inclusion-test.js                 # Steps 1-3
 *   node scripts/force-inclusion-test.js --with-node     # Steps 1-4 (requires docker)
 *
 * Required environment variables:
 *   DEPLOYER_PRIVATE_KEY  - Private key of the deployer (must have ETH on parent chain)
 *   PARENT_CHAIN_RPC      - RPC URL of the parent chain
 *
 * Optional:
 *   PARENT_CHAIN_ID       - Parent chain ID (default: Arbitrum Sepolia)
 */

const { createPublicClient, http, defineChain } = require('viem');
const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const { arbitrumSepolia } = require('viem/chains');
const {
  createRollupPrepareDeploymentParamsConfig,
  prepareChainConfig,
  createRollupPrepareTransactionRequest,
  createRollupPrepareTransactionReceipt,
  prepareNodeConfig,
} = require('@arbitrum/chain-sdk');
const { generateChainId, sanitizePrivateKey } = require('@arbitrum/chain-sdk/utils');
const {
  SequencerInbox__factory,
} = require('@arbitrum/sdk/dist/lib/abi/factories/SequencerInbox__factory');
const { utils, providers, Wallet } = require('ethers');
const { EthBridger, InboxTools, registerCustomArbitrumNetwork } = require('@arbitrum/sdk');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ============================================================
// Config
// ============================================================

const WITH_NODE = process.argv.includes('--with-node');

const FORCE_INCLUSION_DELAY_SECONDS = 72n;
const FORCE_INCLUSION_DELAY_BLOCKS = 6n;
const FUTURE_SECONDS = 3600n;
const FUTURE_BLOCKS = 12n;

const DEPOSIT_AMOUNT = utils.parseEther('0.01');
const POLL_INTERVAL_SECONDS = 10;
const FULLNODE_RPC = 'http://localhost:8449';
const SYNC_TIMEOUT_MS = 180_000;

// ============================================================
// Helpers
// ============================================================

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Please provide the "${name}" environment variable`);
  }
  return process.env[name];
}

function getParentChain(parentChainRpc) {
  if (process.env.PARENT_CHAIN_ID) {
    const id = Number(process.env.PARENT_CHAIN_ID);
    if (id === arbitrumSepolia.id) return { chain: arbitrumSepolia, isCustom: false };
    return {
      chain: defineChain({
        id,
        name: 'Custom Parent Chain',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [parentChainRpc] } },
      }),
      isCustom: true,
    };
  }
  return { chain: arbitrumSepolia, isCustom: false };
}

// ============================================================
// Step 1: Deploy Rollup
// ============================================================

async function deployRollup() {
  console.log('\n========================================');
  console.log(' Step 1: Deploy Orbit Rollup');
  console.log('========================================\n');

  const deployerPrivateKey = sanitizePrivateKey(requireEnv('DEPLOYER_PRIVATE_KEY'));
  const deployer = privateKeyToAccount(deployerPrivateKey);
  const parentChainRpc = requireEnv('PARENT_CHAIN_RPC');

  console.log(`Deployer: ${deployer.address}`);

  // Generate batch poster and validator keys (required for deployment but not used)
  const batchPosterPrivateKey = process.env.BATCH_POSTER_PRIVATE_KEY
    ? sanitizePrivateKey(process.env.BATCH_POSTER_PRIVATE_KEY)
    : generatePrivateKey();
  const batchPoster = privateKeyToAccount(batchPosterPrivateKey).address;

  const validatorPrivateKey = process.env.VALIDATOR_PRIVATE_KEY
    ? sanitizePrivateKey(process.env.VALIDATOR_PRIVATE_KEY)
    : generatePrivateKey();
  const validator = privateKeyToAccount(validatorPrivateKey).address;

  const { chain: parentChain, isCustom: parentChainIsCustom } = getParentChain(parentChainRpc);
  const parentChainPublicClient = createPublicClient({
    chain: parentChain,
    transport: http(parentChainRpc),
  });

  const chainId = generateChainId();
  console.log(`New rollup chain ID: ${chainId}`);
  console.log(
    `Force inclusion delay: ${FORCE_INCLUSION_DELAY_SECONDS}s / ${FORCE_INCLUSION_DELAY_BLOCKS} blocks`,
  );

  const chainConfig = prepareChainConfig({
    chainId,
    arbitrum: {
      InitialChainOwner: deployer.address,
      DataAvailabilityCommittee: false,
    },
  });

  const deploymentParamsConfig = {
    chainId: BigInt(chainId),
    owner: deployer.address,
    chainConfig,
    sequencerInboxMaxTimeVariation: {
      delayBlocks: FORCE_INCLUSION_DELAY_BLOCKS,
      futureBlocks: FUTURE_BLOCKS,
      delaySeconds: FORCE_INCLUSION_DELAY_SECONDS,
      futureSeconds: FUTURE_SECONDS,
    },
  };

  if (parentChainIsCustom) {
    deploymentParamsConfig.confirmPeriodBlocks = 150n;
  }

  const createRollupConfig = createRollupPrepareDeploymentParamsConfig(
    parentChainPublicClient,
    deploymentParamsConfig,
  );

  console.log('\nPreparing deployment transaction...');
  const request = await createRollupPrepareTransactionRequest({
    params: {
      config: createRollupConfig,
      batchPosters: [batchPoster],
      validators: [validator],
    },
    account: deployer.address,
    publicClient: parentChainPublicClient,
  });

  console.log('Sending deployment transaction...');
  const txHash = await parentChainPublicClient.sendRawTransaction({
    serializedTransaction: await deployer.signTransaction(request),
  });
  console.log(`Transaction hash: ${txHash}`);

  console.log('Waiting for confirmation...');
  const txReceipt = createRollupPrepareTransactionReceipt(
    await parentChainPublicClient.waitForTransactionReceipt({ hash: txHash }),
  );

  const coreContracts = txReceipt.getCoreContracts();
  console.log('\nRollup deployed!');
  console.log(`  Rollup:         ${coreContracts.rollup}`);
  console.log(`  Inbox:          ${coreContracts.inbox}`);
  console.log(`  SequencerInbox: ${coreContracts.sequencerInbox}`);
  console.log(`  Bridge:         ${coreContracts.bridge}`);

  // Generate fullnode config (for optional --with-node step)
  const nodeConfig = prepareNodeConfig({
    chainName: 'ForceInclusionTestChain',
    chainConfig,
    coreContracts,
    batchPosterPrivateKey,
    validatorPrivateKey,
    stakeToken: '0x0000000000000000000000000000000000000000',
    parentChainId: parentChain.id,
    parentChainRpcUrl: parentChainRpc,
  });
  nodeConfig.node.sequencer = false;
  nodeConfig.node['delayed-sequencer'] = { enable: false };
  nodeConfig.node['batch-poster'] = { enable: false };
  nodeConfig.node.staker = { enable: false };
  nodeConfig.execution.sequencer = { enable: false };
  nodeConfig.execution['forwarding-target'] = 'null';
  nodeConfig['ensure-rollup-deployment'] = false;

  const nodeConfigPath = path.join(__dirname, '..', 'fullnode-config.json');
  fs.writeFileSync(nodeConfigPath, JSON.stringify(nodeConfig, null, 2));

  return {
    chainId,
    parentChainId: parentChain.id,
    coreContracts,
    chainConfig,
    nodeConfigPath,
  };
}

// ============================================================
// Step 2: Deposit ETH via Delayed Inbox
// ============================================================

async function depositEth(chainId, coreContracts, parentChainId) {
  console.log('\n========================================');
  console.log(' Step 2: Deposit ETH via Delayed Inbox');
  console.log('========================================\n');

  const parentChainProvider = new providers.JsonRpcProvider(requireEnv('PARENT_CHAIN_RPC'));
  const parentChainWallet = new Wallet(requireEnv('DEPLOYER_PRIVATE_KEY'), parentChainProvider);

  // Register the custom network with Arbitrum SDK (v4 API)
  const childChainNetwork = registerCustomArbitrumNetwork({
    chainId,
    parentChainId,
    confirmPeriodBlocks: 150,
    ethBridge: {
      bridge: coreContracts.bridge,
      inbox: coreContracts.inbox,
      outbox: coreContracts.outbox,
      rollup: coreContracts.rollup,
      sequencerInbox: coreContracts.sequencerInbox,
    },
    isCustom: true,
    isTestnet: true,
    name: 'ForceInclusionTestChain',
  });
  const ethBridger = new EthBridger(childChainNetwork);

  console.log(`Depositing ${utils.formatEther(DEPOSIT_AMOUNT)} ETH to the delayed inbox...`);
  console.log(`Depositor: ${parentChainWallet.address}`);

  const depositTx = await ethBridger.deposit({
    amount: DEPOSIT_AMOUNT,
    parentSigner: parentChainWallet,
    childProvider: parentChainProvider,
  });

  const depositReceipt = await depositTx.wait();
  console.log(`\nDeposit confirmed! TX: ${depositReceipt.transactionHash}`);
  console.log('The deposit is now in the delayed inbox. No sequencer will pick it up.');

  return childChainNetwork;
}

// ============================================================
// Step 3: Force Include
// ============================================================

async function forceInclude(childChainNetwork) {
  console.log('\n========================================');
  console.log(' Step 3: Force Include');
  console.log('========================================\n');

  const parentChainProvider = new providers.JsonRpcProvider(requireEnv('PARENT_CHAIN_RPC'));
  const parentChainWallet = new Wallet(requireEnv('DEPLOYER_PRIVATE_KEY'), parentChainProvider);

  const inboxTools = new InboxTools(parentChainWallet, childChainNetwork);

  console.log(`Waiting for force inclusion delay (~${FORCE_INCLUSION_DELAY_SECONDS}s) to pass...`);
  console.log('Polling for force-includable events...\n');

  let forceIncludableEvent = null;
  while (!forceIncludableEvent) {
    try {
      // eslint-disable-next-line no-await-in-loop
      forceIncludableEvent = await inboxTools.getForceIncludableEvent();
    } catch (e) {
      console.log(
        `  Query failed (likely L1 block not yet mapped). Retrying in ${POLL_INTERVAL_SECONDS}s...`,
      );
    }
    if (!forceIncludableEvent) {
      console.log(`  No eligible messages yet. Retrying in ${POLL_INTERVAL_SECONDS}s...`);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_SECONDS * 1000));
    }
  }

  console.log('Found force-includable event!');
  console.log(`  Message index: ${forceIncludableEvent.event.messageIndex.toString()}`);

  console.log('\nCalling forceInclude()...');
  const tx = await inboxTools.forceInclude(forceIncludableEvent);
  const receipt = await tx.wait();

  console.log(`\nForce inclusion successful!`);
  console.log(`  TX: ${receipt.transactionHash}`);

  // Verify totalDelayedMessagesRead

  const sequencerInbox = SequencerInbox__factory.connect(
    childChainNetwork.ethBridge.sequencerInbox,
    parentChainProvider,
  );
  const totalRead = await sequencerInbox.totalDelayedMessagesRead();
  console.log(`  totalDelayedMessagesRead: ${totalRead.toString()}`);
}

// ============================================================
// Step 4 (Optional): Verify on Fullnode
// ============================================================

async function verifyOnFullnode(nodeConfigPath) {
  console.log('\n========================================');
  console.log(' Step 4: Verify on Fullnode (--with-node)');
  console.log('========================================\n');

  if (!fs.existsSync(nodeConfigPath)) {
    console.error('fullnode-config.json not found.');
    return;
  }

  console.log('Starting fullnode via docker (sequencer disabled)...');
  let dockerContainerId;
  try {
    dockerContainerId = execSync(
      `docker run -d ` +
        `-v ${nodeConfigPath}:/config/nodeConfig.json ` +
        `-p 8449:8449 ` +
        `offchainlabs/nitro-node:v3.9.5-66e42c4 ` +
        `--conf.file /config/nodeConfig.json`,
      { encoding: 'utf8' },
    ).trim();
    console.log(`Container started: ${dockerContainerId.substring(0, 12)}`);

    // Wait briefly then verify the container is still running
    await new Promise((r) => setTimeout(r, 3000));
    const running = execSync(`docker ps -q --filter id=${dockerContainerId}`, {
      encoding: 'utf8',
    }).trim();
    if (!running) {
      console.error('Container exited immediately. Logs:');
      try {
        console.error(execSync(`docker logs ${dockerContainerId}`, { encoding: 'utf8' }));
      } catch (_) {
        /* ignore */
      }
      try {
        execSync(`docker rm ${dockerContainerId}`, { encoding: 'utf8' });
      } catch (_) {
        /* ignore */
      }
      return;
    }

    console.log('Waiting for node to initialize...\n');
  } catch (error) {
    console.error('Failed to start docker container. Is docker running?');
    console.error(error.message);
    return;
  }

  try {
    console.log(`Connecting to fullnode RPC: ${FULLNODE_RPC}`);
    let childChainProvider;
    let connected = false;
    const connectStart = Date.now();
    while (Date.now() - connectStart < SYNC_TIMEOUT_MS) {
      try {
        childChainProvider = new providers.JsonRpcProvider(FULLNODE_RPC);
        // eslint-disable-next-line no-await-in-loop
        const network = await childChainProvider.getNetwork();
        console.log(`Connected! Chain ID: ${network.chainId}\n`);
        connected = true;
        break;
      } catch (e) {
        console.log('  Node not ready yet, retrying in 5s...');
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }
    if (!connected) {
      console.error('\nTimeout: could not connect to fullnode RPC.');
      return;
    }
    const wallet = new Wallet(requireEnv('DEPLOYER_PRIVATE_KEY'), childChainProvider);

    console.log('Waiting for fullnode to sync...');
    const startTime = Date.now();
    let latestBlock;
    while (Date.now() - startTime < SYNC_TIMEOUT_MS) {
      latestBlock = await childChainProvider.getBlock('latest');
      if (latestBlock.number > 0) break;
      console.log(`  Block: ${latestBlock.number}, waiting...`);
      await new Promise((r) => setTimeout(r, 5_000));
    }

    if (!latestBlock || latestBlock.number === 0) {
      console.error('\nTimeout: fullnode did not produce blocks.');
      return;
    }

    console.log(`Fullnode synced! Latest block: ${latestBlock.number}`);

    const balance = await wallet.getBalance();
    console.log(`\nWallet: ${wallet.address}`);
    console.log(`Balance on child chain: ${utils.formatEther(balance)} ETH`);

    if (balance.gt(0)) {
      console.log('\nETH deposit verified on child chain! Force inclusion works end-to-end.');
    } else {
      console.log('\nBalance is 0. Fullnode may need more time to process.');
    }
  } finally {
    console.log(`\nStopping container ${dockerContainerId.substring(0, 12)}...`);
    try {
      execSync(`docker stop ${dockerContainerId}`, { encoding: 'utf8' });
    } catch (e) {
      /* container may have already stopped */
    }
    try {
      execSync(`docker rm ${dockerContainerId}`, { encoding: 'utf8' });
    } catch (e) {
      /* container may have already been removed */
    }
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('=== Force Inclusion End-to-End Test ===');
  console.log(
    `Mode: ${
      WITH_NODE ? 'full (with fullnode verification)' : 'deploy + deposit + forceInclude'
    }\n`,
  );

  // Step 1: Deploy
  const { chainId, parentChainId, coreContracts, nodeConfigPath } = await deployRollup();

  // Step 2: Deposit
  const childChainNetwork = await depositEth(chainId, coreContracts, parentChainId);

  // Step 3: Force Include
  await forceInclude(childChainNetwork);

  // Step 4: (Optional) Verify on fullnode
  if (WITH_NODE) {
    await verifyOnFullnode(nodeConfigPath);
  }

  console.log('\n=== Done ===');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
