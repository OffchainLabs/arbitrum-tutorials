# token-deposit Tutorial

`token-deposit` demonstrates moving a token from Ethereum (Layer 1) into the Arbitrum (Layer 2) chain using the Standard Token Gateway in Arbitrum's token bridging system.

For info on how it works under the hood, see our [token bridging docs](https://developer.offchainlabs.com/docs/bridging_assets).

#### **Standard ERC20 Deposit**

Depositing an ERC20 token into the Arbitrum chain is done via our the Arbitrum token bridge.

Here, we deploy a [demo token](./contracts/DappToken.sol) and trigger a deposit; by default, the deposit will be routed through the standard ERC20 gateway, where on initial deposit, a standard arb erc20 contract will automatically be deployed to L2.

We use our [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk) library to initiate and verify the deposit.

See [./exec.js](./scripts/exec.js) for inline explanation.

### Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

### Run:

```
yarn run token-deposit
```

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
