const hardhatConfig = require('./hardhat.config.js');
const path = require('path');
const fs = require('fs');
const { registerCustomArbitrumNetwork } = require('@arbitrum/sdk');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const wait = (ms = 0) => {
  return new Promise((res) => setTimeout(res, ms || 0));
};

const arbLog = async (text) => {
  let str = '🔵';
  for (let i = 0; i < 25; i++) {
    // eslint-disable-next-line no-await-in-loop
    await wait(40);
    if (i == 12) {
      str = `🔵${'🔵'.repeat(i)}🔵`;
    } else {
      str = `🔵${' '.repeat(i * 2)}🔵`;
    }
    while (str.length < 60) {
      str = ` ${str} `;
    }

    console.log(str);
  }

  console.log('Arbitrum Demo:', text);
  await wait(2000);

  console.log('Lets');
  await wait(1000);

  console.log('Go ➡️');
  await wait(1000);
  console.log('...🚀');
  await wait(1000);
  console.log('');
};

const arbLogTitle = (text) => {
  console.log('\n###################');
  console.log(text);
  console.log('###################');
};

const requireEnvVariables = (envVars) => {
  for (const envVar of envVars) {
    if (!process.env[envVar]) {
      throw new Error(`Error: set your '${envVar}' environmental variable `);
    }
  }
  console.log('Environmental variables properly set 👍');
};

const addCustomNetworkFromFile = (registerFn) => {
  const pathToCustomNetworkFile = path.join(__dirname, '..', '..', 'customNetwork.json');
  if (!fs.existsSync(pathToCustomNetworkFile)) {
    return;
  }

  // Use the provided register function, or fall back to the local one
  const register = registerFn || registerCustomArbitrumNetwork;

  const customNetworkFileContents = fs.readFileSync(pathToCustomNetworkFile, 'utf8');
  const customNetworkInformation = JSON.parse(customNetworkFileContents);
  if (customNetworkInformation instanceof Array) {
    customNetworkInformation.map((customNetwork) => register(customNetwork));
  } else {
    register(customNetworkInformation);
  }
};

module.exports = {
  arbLog,
  arbLogTitle,
  hardhatConfig,
  requireEnvVariables,
  addCustomNetworkFromFile,
};
