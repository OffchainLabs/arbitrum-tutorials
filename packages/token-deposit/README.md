# Tutorial: token deposit

`token-deposit` demonstrates moving a token from a parent chain to a child chain (e.g. from Ethereum to Arbitrum) using the standard token gateway in Arbitrum's token bridging system.

For info on how it works under the hood, see our [token bridging docs](https://docs.arbitrum.io/build-decentralized-apps/token-bridging/token-bridge-erc20).

## Standard ERC-20 deposit

Depositing an ERC-20 token into an Arbitrum chain is done via our Arbitrum token bridge.

In this tutorial, we deploy a [demo token](./contracts/DappToken.sol) and trigger a deposit; by default, the deposit will be routed through the standard ERC-20 gateway, where on initial deposit, a standard arb ERC-20 contract will automatically be deployed to the destination chain.

We use our [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk) library to initiate and verify the deposit.

See [./exec.js](./scripts/exec.js) for inline explanation.

## Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `PRIVATE_KEY`, `CHAIN_RPC` and `PARENT_CHAIN_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

## Run

```
yarn run token-deposit
```

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>