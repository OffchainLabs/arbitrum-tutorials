# eth_deposit Tutorial

`eth_deposit` shows how to move Ether from Ethereum (Layer 1) into the Arbitrum (Layer 2) chain.

## How it works (Under the hood)

---

A user deposits Ether onto Arbitrum using Arbitrum's general L1-to-L2 message passing system, and simply passing the desired Ether as callvalue and no additional data. For more info, see [Retryable Tickets documentation](https://developer.offchainlabs.com/docs/l1_l2_messages#depositing-eth-via-retryables).

## Demos

In this repo we show 3 different examples of how a client may trigger an Ether deposit.

---

#### **1. Directly Through the Inbox Contract**

`Inbox.sol` is an Arbitrum core protocol contract; it includes a `depositEth` method which triggers an L1-to-L2 message that will deposit Ether to the destination address. In this demo, a client connects to this contract directly to trigger their Ether deposit.

See [./exec_ThroughInbox.js](./scripts/exec_ThroughInbox.js) for inline explanation.

To run:

```
yarn deposit:inbox
```

---

#### **2. Through an L1 DApp**

[Deposit.sol](./contracts/Deposit.sol) is a contract which itself triggers an Eth deposit. Here we show a client connecting to Deposit.sol and triggering and Eth deposit that way.

See [./exec_ThroughDapp.js](./scripts/exec_ThroughDApp.js) for inline explanation.

To run:

```
yarn deposit:dapp
```

---

#### **3. Using arb-ts tooling**

Finally, our [arb-ts](https://github.com/OffchainLabs/arbitrum/tree/master/packages/arb-ts) provides a simply convenience method for depositing Ether, abstracting away the need for the client to connect to any contracts manually.

See [./exec_ThroughLib.js](./scripts/exec_ThroughLib.js) for inline explanation.

To run:

```
yarn deposit:arb-ts
```

---

## Running locally

---

eth_deposit is configurable. You can configure it with the following environment variables:

1. In the application folder, copy the `.env-sample` file and create a file called `.env`.

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
