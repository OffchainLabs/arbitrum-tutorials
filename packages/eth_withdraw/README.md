# eth_withdraw Tutorial

eth_withdraw is an example of moving Ether from Arbitrum (Layer 2) onto the Ethereum (Layer 1) chain.

## Running locally

eth_withdraw is configurable.  You can configure it with the following environment variables:

1. In the application folder, copy the ```.env-sample``` file and create a file called ```.env```.

```bash
cp .env.example .env
```

2. Open the .env file and add the variables.


3. Run the following command in order to compile and execute the smart contracts.


```bash
yarn hardhat run scripts/exec.js

```
## How It Works?

#### Arbsys.sol:

* Arbsys is a Precompiled contract that exists in every Arbitrum chain at address(100), 0x0000000000000000000000000000000000000064 and exposes a variety of system-level functionality.

####  Withdraw.sol:

* This contract executes a withdraw transaction via `ArbSys(100).withdrawEth(_destAddress)`on the Arbitrum testnet. This burns the Ether balance on the Arbitrum side, and will later make it available on the Ethereum side. 

## Curious to see the output on the Arbitrum chain?

Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://explorer.arbitrum.io), enter your public key, and see the amount of ETH that has been withdrawn to your address on the Kovan testnet!

<p align="center">
  <img width="350" height="100" src= "https://offchainlabs.com/c79291eee1a8e736eebd9a2c708dbe44.png" />
</p>