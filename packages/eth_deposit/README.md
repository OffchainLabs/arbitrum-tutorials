# eth_deposit Tutorial


eth_deposit is an example of moving Ether from Ethereum (Layer 1) onto the Arbitrum (Layer 2) chain.

## Running locally
---

eth_deposit is configurable.  You can configure it with the following environment variables:

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
Two contracts are used in the `eth_deposit` example: 

####  **1. Inbox.sol:** 

* This contract is the Arbitrum inbox contract that resides on Layer 1 and allows people and contracts to transfer Ether between Ethereum and Arbitrum chain.


####  **2. Payment.sol:** 

* This contract executes a deposit transaction via `Inbox.depositEth(address destination)` on Layer 1. This transfers funds to the Bridge contract on the L1 and credits the same funds inside the Arbitrum chain at the specified address.

    **DISCLAIMER:** you can only call the `Inbox.depositEth(address destination)` function from your account on Layer 1 instead of going through a contract.

## Curious to see the output on the Arbitrum chain?
---

Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://explorer.arbitrum.io), enter your address, and see the amount of ETH that has been assigned to your address on the Arbitrum chain!

<img align=“center” src="https://offchainlabs.com/c79291eee1a8e736eebd9a2c708dbe44.png" width="350" height="100"> 
