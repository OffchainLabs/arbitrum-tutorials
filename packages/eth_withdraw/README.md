# eth_withdraw Tutorial

eth_withdraw is an example of moving Ether from Arbitrum (Layer 2) into the Ethereum (Layer 1) chain.

## How it works?

---

Withdrawing ETH from L2 is facilitated through the `EthBridge` contracts. There are 3 ways of interacting with these contracts from the client side when withdrawing ETH from L2. Our goal here is to illustrate these 3 options and describe the mechanics of each.
Note that all these options are essentially doing similar/the same functions under the hood and are just different in terms of how they interact with the `EthBridge` contracts from the client side.

---

#### **1. Through an L2 DApp:**

Withdrawing ETH from Arbitrum can be done using an L2 DApp that executes a withdraw transaction on L2. As you can see in the `exec_throughDApp.js` sample, users can initiate the withdraw transaction in 2 ways (see below). Note that both these options are essentially the same and are just different in terms of interacting with the `Ethbridge` contracts from the client side. Withdrawing ETH will burn the Ether balance on the Arbitrum side, and will later make it available on the Ethereum side


- `sendTxToL1(address _destAddress, bytes calldata _calldataForL1)`: This function executes a withdraw transaction via `ArbSys(100).sendTxToL1(address destination)` on the Arbitrum. Arbsys is a pre-compiled contract that exists in every Arbitrum chain at address(100 0x0000000000000000000000000000000000000064 and exposes a variety of system-level functionality. `sendTxToL1(address _destAddress, bytes calldata _calldataForL1)` sends a transaction to L1 that gives the given amount of ETH to the specified L1 recipient address from sender and returns a unique identifier for this L2-to-L1 transaction. `calldataForL1` is the calldata for L1 contract call (optional).

- `withdrawEth(_destAddress)`: This is a convenience function, which is equivalent to calling `ArbSys(100).sendTxToL1(address destination, bytes calldata calldataForL1)` with empty calldataForL1.

See the `exec_throughDApp.js` for sample usage.

---

#### **2. Through Arbitrum / Ethereum Bridge:**

Users can use the Bridge we provide to withdraw ETH from Arbitrum ino Ethereum. Accessing bridging methods can be done via our `arb-ts` client side library. Having the Bridge installed and initiated, users can withdraw ETH by sending a `withdrawETH(ethFromL2WithdrawAmount)` transaction directly to the Bridge. See the `exec_throughBridge.js` for sample usage.

---

#### **3. Directly Through the ArbSys Contract :**

ArbSys is a pre-compiled contract that exists in every Arbitrum Chain. As its name would imply, ArbSys provides systems functionality useful to some Arbitrum contracts. Any contract running on an Arbitrum Chain can call the chain's ArbSys. ArbSys lives at address `0x0000000000000000000000000000000000000064`. Users can withdraw ETH from Arbitrum by sending a `withdrawEth(_destAddress)` or `sendTxToL1(address _destAddress, bytes calldata _calldataForL1)` directly to the ArbSys contract that lives on L2. See the `exec_throughArbsys.js` for sample usage.

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
