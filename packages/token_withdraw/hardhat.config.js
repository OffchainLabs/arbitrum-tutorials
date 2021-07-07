require("@nomiclabs/hardhat-ethers");


const accounts = {
  mnemonic:
    "rule nation tired logic palace city picnic bubble ridge grain problem pilot",
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 10,
};

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.0",
  networks: {
    kovan: {
      url: "https://kovan.infura.io/v3/" + process.env["INFURA_KEY"],
      accounts: accounts,
    },
    arbkovan4: {
      gasPrice: 0,
      url: "https://kovan4.arbitrum.io/rpc",
      accounts: accounts,
    },
  }
};


