# token_deposit Tutorial

`token_deposit` demonstrates moving a token from Ethereum (Layer 1) into the Arbitrum (Layer 2) chain using the Standard Token Gateway in Arbitrum's token bridging system.

For info on how it works under the hood, see our [token bridging docs](https://developer.offchainlabs.com/docs/bridging_assets).

#### **Standard ERC20 Deposit**

Depositing an ERC20 token into the Arbitrum chain is done via our the Arbitrum token bridge.

Here, we deploy a [demo token](./contracts/DappToken.sol) and trigger a deposit; by default, the deposit will be routed through the standard ERC20 gateway, where on initial deposit, a standard arb erc20 contract will automatically be deployed to L2.

We use our [arb-ts](https://github.com/OffchainLabs/arbitrum/tree/master/packages/arb-ts) library to initiate and verify the deposit.

See [./exec.js](./scripts/exec.js) for inline explanation.

To run:

```
yarn run token_deposit
```

---

## Running locally

---

token_deposit is configurable. You can configure it with the following environment variables:

1. In the application folder, copy the `.env-sample` file and create a file called `.env`.

```bash
cp .env-sample .env
```

2. Open the .env file and add the variables.

3. Run one of the following commands in order to compile and execute the smart contracts.

```bash
yarn hardhat run scripts/exec_throughBridge.js

```

<p align="center">
  <img width="350" height="100" src= "https://offchainlabs.com/static/media/full-logo.3271d3e8.png" />
</p>
