# eth_withdraw Tutorial

eth_withdraw is an example of moving Ether from Arbitrum (Layer 2) onto the Ethereum (Layer 1) chain.

## Running locally
---

eth_withdraw is configurable.  You can configure it with the following environment variables:

1. In the application folder, copy the ```.env-sample``` file and create a file called ```.env```.

```bash
cp .env-sample .env
```

2. Open the .env file and add the variables.


3. Run the following command in order to compile and execute the smart contracts.


```bash
yarn hardhat run scripts/exec.js

```
## How it works?
---

Two contracts are used in the `eth_withdraw` example: 

####  **1. Arbsys.sol:** 

* Arbsys is a pre-compiled contract that exists in every Arbitrum chain at address(100), 0x0000000000000000000000000000000000000064 and exposes a variety of system-level functionality.

####  **2. Withdraw.sol:** 

* This contract defines two different functions: `sendTxToL1(address _destAddress)` and `withdrawEth(_destAddress)`and users can withdraw ETH by calling either of these two. This burns the Ether balance on the Arbitrum side, and will later make it available on the Ethereum side.

    - `sendTxToL1(address _destAddress)`: This function executes a withdraw transaction via `ArbSys(100).sendTxToL1(address destination)` on the Arbitrum. It sends a transaction to L1 that gives the given amount of Eth to the specified L1 recipient address from sender and returns a unique identifier for this L2-to-L1 transaction.

    - `withdrawEth(_destAddress)`: This function executes a withdraw transaction via `ArbSys(100).withdrawEth(_destAddress)` on the Arbitrum. It sends a given amount of Eth to the destination address from sender and returns a unique identifier for this L2-to-L1 transaction. Note that this is a convenience function, which is equivalent to calling `ArbSys(100).sendTxToL1(address destination, bytes calldata calldataForL1)` with empty calldataForL1.


## Curious to see the output on the Arbitrum chain?
---

Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://explorer.arbitrum.io), enter your address, and see the amount of ETH that has been withdrawn to your address on Layer 1!

<p align="center">
  <img width="350" height="100" src= "https://offchainlabs.com/c79291eee1a8e736eebd9a2c708dbe44.png" />
</p>