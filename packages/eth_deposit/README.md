# eth_deposit Tutorial

eth_deposit is an example of moving Ether from Ethereum (Layer 1) onto the Arbitrum (Layer 2) chain.

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

#### Inbox.sol:

* This contract is the arbitrum inbox contract that resides on the Kovan testnet and allows people and contracts to transfer Ether between Ethereum and Arbitrum chain. 
* Inbox contract address on the Kovan testnet: <span style="color: blue">0xD71d47AD1b63981E9dB8e4A78C0b30170da8a601</span>


####  Payment.sol:

* This contract executes a deposit transaction via `Inbox.depositEth(address destination)` on the Kovan testnet. This transfers funds to the Bridge contract on the L1 and credits the same funds to you inside the Arbitrum chain at the specified address.

## Curious to see the output on the Arbitrum chain?

Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://explorer.offchainlabs.com/#/), enter your public key, and see the amount of ETH that has been assigned to your address on the Arbitrum chain!

<img align=“center” src="https://offchainlabs.com/c79291eee1a8e736eebd9a2c708dbe44.png" width="350" height="100"> 
