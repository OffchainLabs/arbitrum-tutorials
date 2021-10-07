# eth-withdraw Tutorial

`eth-withdraw` shows how to move Ether from Arbitrum (Layer 2) into the Ethereum (Layer 1) chain.

Note that this repo covers initiating and Ether withdrawal; for a demo on (later) releasing the funds from the Outbox, see [outbox-execute](../outbox-execute/README.md)

## How it works (Under the hood)

---

To withdraw Ether from Arbitrum, a client creates an outgoing / L2 to L1 message using the `ArbSys` interface that later lets them release Ether from its escrow in the L1 Bridge.sol contract. For more info, see [Outgoing messages documentation](https://developer.offchainlabs.com/docs/l1_l2_messages#l2-to-l1-messages-lifecycle).

---

## Demos

In this repo we show 3 different examples of how a client may trigger an Ether withdrawal.

_Note: Executing scripts will require your L2 account be funded with .000001 Eth._

#### **1. Directly Through the ArbSys Contract**

[ArbSys](https://developer.offchainlabs.com/docs/arbsys) is a pre-compiled contract that exists in every Arbitrum Chain at address [0x0000000000000000000000000000000000000064](https://explorer.arbitrum.io/address/0x0000000000000000000000000000000000000064). Its interface includes a `withdrawEth` method that can be called on L2 to initiate an Ether-withdrawal outgoing message (`sendTxToL1` can also be used to withdraw Ether).

See [./exec-viaArbSys.js](./scripts/exec-viaArbSys.js) for inline explanation.

To run:

```
yarn run withdraw:arbsys
```

---

#### **2. Through an L2 DApp:**

[Withdraw.sol](./contracts/Deposit.sol) is an L2 contract that itself can make an external call to trigger a withdrawal. Our script connects to it and uses it to trigger an Ether withdrawal.

See [./exec-viaDApp.js](./scripts/exec-viaDApp.js) for inline explanation.

To run:

```
yarn run withdraw:dapp
```

---

#### 3. **Using arb-ts tooling**

Finally, our [arb-ts](https://github.com/OffchainLabs/arbitrum/tree/master/packages/arb-ts) provides a simply convenience method for withdrawing Ether, abstracting away the need for the client to connect to any contracts manually.

See [./exec-viaLib.js](./scripts/exec-viaLib.js) for inline explanation.

To run:

```
yarn run withdraw:arb-ts
```

---

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

---

## Curious to see the output on the Arbitrum chain?

Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://rinkeby-explorer.arbitrum.io/#), enter your address and see the amount of ETH has been deducted from your Layer 2 balance. Note that your Layer 1 balance will only be updated after rollup's confirmation period is over.

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>