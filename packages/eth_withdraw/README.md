# eth_withdraw Tutorial

`eth_withdraw` shows how to move Ether from Arbitrum (Layer 2) into the Ethereum (Layer 1) chain.

Note that this repo covers initiating and Ether withdrawal; for a demo on (later) releasing the funds from the Outbox, see [outbox_execute](../outbox-execute/README.md)

## How it works (Under the hood)

---

To withdraw Ether from Arbitrum, a client creates an outgoing / L2 to L1 message using the `ArbSys` interface that later lets them release Ether from its escrow in the L1 Bridge.sol contract. For more info, see [Outgoing messages documentation](https://developer.offchainlabs.com/docs/l1_l2_messages#l2-to-l1-messages-lifecycle).

---

## Demos

In this repo we show 3 different examples of how a client may trigger an Ether withdrawal.

_Note: Executing scripts will require your L2 account be funded with .000001 Eth._

#### **1. Directly Through the ArbSys Contract**

[ArbSys](https://developer.offchainlabs.com/docs/arbsys) is a pre-compiled contract that exists in every Arbitrum Chain at address [0x0000000000000000000000000000000000000064](https://explorer.arbitrum.io/address/0x0000000000000000000000000000000000000064). Its interface includes a `withdrawEth` method that can be called on L2 to initiate an Ether-withdrawal outgoing message (`sendTxToL1` can also be used to withdraw Ether).

See [./exec_ThroughArbSys.js](./scripts/exec_ThroughArbSys.js) for inline explanation.

To run:

```
yarn run withdraw:arbsys
```

---

#### **2. Through an L2 DApp:**

[Withdraw.sol](./contracts/Deposit.sol)) is an L2 contract that itself can make an external call to trigger a withdrawal. Our script connects to it and uses it to trigger an Ether withdrawal.

See [./exec_ThroughDApp.js](./scripts/exec_ThroughDApps.js) for inline explanation.

To run:

```
yarn run withdraw:dapp
```

---

#### **Via Arb-ts**

Finally, our [arb-ts](https://github.com/OffchainLabs/arbitrum/tree/master/packages/arb-ts) provides a simply convenience method for withdrawing Ether, abstracting away the need for the client to connect to any contracts manually.

See [./exec_viaLib.js](./scripts/exec_viaLib.js) for inline explanation.

To run:

```
yarn deposit:arb-ts
```

---

## Running locally

---

eth_withdraw is configurable. You can configure it with the following environment variables:

1. In the application folder, copy the `.env-sample` file and create a file called `.env`.

```bash
cp .env-sample .env
```

2. Open the .env file and add the variables.

3. Run one of the following commands (depending on which of the 3 methods you want to use to withdraw ETH from L2) in order to compile and execute the smart contracts.

```bash
1- yarn hardhat run scripts/exec_throughDApp.js
2- yarn hardhat run scripts/exec_throughBridge.js
3- yarn hardhat run scripts/exec_throughArbSys.js
```

## Curious to see the output on the Arbitrum chain?

---

Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://rinkeby-explorer.arbitrum.io/#), enter your address and see the amount of ETH has been deducted from your Layer 2 balance. Note that your Layer 1 balance will only be updated after rollup's confirmation period is over.

<p align="center">
  <img width="350" height="100" src= "https://offchainlabs.com/static/media/full-logo.3271d3e8.png" />
</p>
