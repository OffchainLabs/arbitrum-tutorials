# eth_withdraw Tutorial

eth_withdraw is an example of moving Ether from Arbitrum (Layer 2) onto the Ethereum (Layer 1) chain.

## Installation

Run the following commands in order to install the necessary dependencies and compile your smart contracts.

```bash
export INFURA_KEY='InfuraAccessKey'
export DEVNET_PRIVKEY='0xYourPrivateKey'
```


*Note that the **InfuraAccessKey** can be found in the setting of your project on [Infura](https://infura.io) and it is called PROJECT ID in their terms.*

## Usage

```bash
yarn hardhat run scripts/deploy.js
```


## How It Works?

#### Arbsys.sol:

* Arbsys is a Precompiled contract that exists in every Arbitrum chain at address(100), 0x0000000000000000000000000000000000000064 and exposes a variety of system-level functionality.

####  Withdraw.sol:

* This contract executes a withdraw transaction via `ArbSys(100).withdrawEth(_destAddress)`on the Arbitrum testnet. This burns the Ether balance on the Arbitrum side, and will later make it available on the Ethereum side. 

## Curious to see the output on the Arbitrum chain?

Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://explorer.offchainlabs.com/#/), enter your public key, and see the amount of ETH that has been depsoyyed to your address on the Kovan testnet!

<img align=“center” src="https://offchainlabs.com/c79291eee1a8e736eebd9a2c708dbe44.png" width="350" height="100"> 
