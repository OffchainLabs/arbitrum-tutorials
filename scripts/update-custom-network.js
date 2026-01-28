#!/usr/bin/env node

/*
 * Update customNetwork.json from a local nitro-testnode container.
 * Usage:
 *   yarn update-custom-network
 *   ORBIT_TEST=1 yarn update-custom-network   # also adds L3 network info
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const OUTPUT_PATH = path.join(__dirname, '..', 'customNetwork.json');
const isTestingOrbitChains = process.env.ORBIT_TEST === '1';

function getLocalNetworksFromContainer(which) {
  const dockerNames = [
    'nitro_sequencer_1',
    'nitro-sequencer-1',
    'nitro-testnode-sequencer-1',
    'nitro-testnode_sequencer_1',
  ];

  for (const dockerName of dockerNames) {
    try {
      const raw = execSync(
        `docker exec ${dockerName} cat /tokenbridge-data/${which}_network.json`
      ).toString();
      return JSON.parse(raw);
    } catch {
      // try next container name
    }
  }

  throw new Error('nitro-testnode sequencer not found');
}

function isLegacyNetworkType(network) {
  return network && 'partnerChainID' in network && !('parentChainId' in network);
}

function normalizeNetwork(network) {
  const normalized = { ...network };
  const chainId = normalized.chainId ?? normalized.chainID;
  const parentChainId = normalized.parentChainId ?? normalized.partnerChainID;

  if (chainId != null) {
    normalized.chainId = chainId;
    normalized.chainID = chainId;
  }

  if (parentChainId != null) {
    normalized.parentChainId = parentChainId;
    normalized.partnerChainID = parentChainId;
  }

  if (normalized.isArbitrum == null) normalized.isArbitrum = true;
  if (normalized.isCustom == null) normalized.isCustom = true;
  if (normalized.explorerUrl == null) normalized.explorerUrl = '';

  return normalized;
}

function buildCustomNetworks(output) {
  const networks = [];
  if (output.l2Network) networks.push(normalizeNetwork(output.l2Network));
  if (output.l3Network) networks.push(normalizeNetwork(output.l3Network));
  if (!networks.length) {
    throw new Error('No L2/L3 network info found in docker output.');
  }
  return networks;
}

async function main() {
  const output = getLocalNetworksFromContainer('l1l2');

  if (isTestingOrbitChains) {
    const { l2Network: l3Network } = getLocalNetworksFromContainer('l2l3');
    output.l3Network = l3Network;
  }

  if (
    isLegacyNetworkType(output.l2Network) ||
    (output.l3Network && isLegacyNetworkType(output.l3Network))
  ) {
    throw new Error(
      'Legacy L2Network type detected. Please use the latest testnode version and token-bridge-contracts version 1.2.5 or above.'
    );
  }

  const customNetworks = buildCustomNetworks(output);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(customNetworks, null, 2));
  console.log(`customNetwork.json updated: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
