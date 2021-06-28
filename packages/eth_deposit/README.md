# eth_deposit Tutorial


eth_deposit is an example of moving Ether from Ethereum (Layer 1) onto the Arbitrum (Layer 2) chain.


## How it works?
---

Depositting ETH into the Arbitrum chain can be done in 3 different ways. Here we describe the mechanics of each option:

---

####  **1. Through an L1 DApp and Retryables:** 

Depositing ETH into Arbitrum can be done using an L1 DApp and retryable tickets. Users can use the DApp to create a Retryable Ticket is with 0 Callvalue, 0 MaxGas, 0 GasPrice, and empty Calldata. When a retryable ticket is initiated from the L1, the DepositValue is credited to the sender’s account on L2. See the `exec_throughDApp.js` for sample usage.

---


####  **2. Through Arbitrum / Ethereum Bridge:** 

Instead of having to deploy an L1 DApp, users can use the Bridge we provide to deposit ETH into Arbitrum. Accessing bridging methods can be done via our `arb-ts` library. Having the Bridge installed and intiated, users can transfer ETH into Arbitrum chain by sending a `depositETH(depositAmount)` transaction directly to the Bridge. See the `exec_throughBridge.js` for sample usage.

---

####  **3. Directly Through the Inbox Contract :** 

`Inbox.sol` is the Arbitrum inbox contract that resides on Layer 1 and allows users and contracts to transfer ETH between Ethereum and Arbitrum chain. Users can transfer ETH into Arbitrum by sending a `depositEth(maxSubmisisonCost)` transaction directly to the this contract that is deployed on the Layer 1. See the `exec_throughInbox.js` for sample usage.

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


Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://rinkeby-explorer.arbitrum.io/#), enter your address, and see the amount of ETH that has been assigned to your address on the Arbitrum chain!

<p align="center">
  <img width="350" height="100" src= "https://offchainlabs.com/static/media/full-logo.3271d3e8.png" />
</p>
