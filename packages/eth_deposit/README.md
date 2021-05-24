# eth_deposit Tutorial


eth_deposit is an example of moving Ether from Ethereum (Layer 1) onto the Arbitrum (Layer 2) chain.


## How it works?
---

Depositting ETH into the Arbitrum chain can be done in 3 different ways. Here, we explain the mechanics of each option:

---

####  **1. Through an L1 DApp:** 
You can transefr ETH to L2 through a DApp that executes a deposit transaction via `Inbox.depositEth(address destination)` on Layer 1. This transfers funds to the Bridge contract on the L1 and credits the same funds inside the Arbitrum chain at the specified address. See the `exec_throughDApp.js` for sample usage.

---
####  **2. Through Arbitrum / Ethereum Bridge:** 
Here, users do not have to depoly any L1 DApp that enables them to deposit ETH into the L2. Instead, they can do so using the Bridge that we provide. Accessing bridging methods can be done via our `arb-ts` library. See the `exec_throughBridge.js` for sample usage.

---

####  **2. Through the Inbox Contract :** 
`Inbox.sol` is the Arbitrum inbox contract that resides on Layer 1 and allows users and contracts to transfer ETH between Ethereum and Arbitrum chain. Users can transfer Ether into the Arbitrum chain by sending a `depositEth` transaction to the this contract that is deployed on the Layer 1. See the `exec_throughInbox.js` for sample usage.

---


## Running locally
---

eth_deposit is configurable.  You can configure it with the following environment variables:

1. In the application folder, copy the ```.env-sample``` file and create a file called ```.env```.

```bash
cp .env-sample .env
```

2. Open the .env file and add the variables.


3. Run one of the following commands (depending on which of the 3 methods you want to use to transfer ETH to the L2) in order to compile and execute the smart contracts.


```bash
1- yarn hardhat run scripts/exec_throughDApp.js
2- yarn hardhat run scripts/exec_throughBridge.js
3- yarn hardhat run scripts/exec_throughInbox.js
```


## Curious to see the output on the Arbitrum chain?


Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://explorer.arbitrum.io), enter your address, and see the amount of ETH that has been assigned to your address on the Arbitrum chain!

<img align=“center” src="https://offchainlabs.com/c79291eee1a8e736eebd9a2c708dbe44.png" width="350" height="100"> 
