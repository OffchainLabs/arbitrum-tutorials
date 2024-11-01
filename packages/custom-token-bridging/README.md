# Custom token bridging tutorial

There are some tokens with requirements beyond what are offered via our starndard ERC20 gateway. `custom-token-bridging` demonstrates how to get these custom tokens set up to use our Generic-custom gateway.

For more info on bridging assets on Arbitrum, see our [token bridging docs](https://docs.arbitrum.io/build-decentralized-apps/token-bridging/token-bridge-erc20).

#### Custom token bridging using the Generic-custom gateway

Bridging a custom token to the Arbitrum chain is done via the Arbitrum Generic-custom gateway. Our Generic-custom gateway is designed to be flexible enough to be suitable for most (but not necessarily all) custom fungible token needs.

Here, we deploy a [demo custom token](./contracts/ParentChainToken.sol) to the parent chain and a [demo custom token](./contracts/ChildChainToken.sol) to the child chain. We then use the Arbitrum custom gateway contract to register our parent chain custom token to our child chain custom token. Once done with token's registration to the custom gateway, we register our token to the Arbitrum gateway router on the parent chain.

We use our [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk) library to initiate and verify the bridging.

See [./exec.js](./scripts/exec.js) for inline explanation.

### Note for custom-gas-token chains

This script also works on custom-gas-token chains. In that case, you'll have to add the information of your chain in the [`customNetwork.json`](../../customNetwork.json) file, which will be loaded automatically to the Arbitrum SDK (see [How to run the tutorials against a custom network](../../README.md) for more information). The script then will perform the extra operation needed for custom-gas-token chains.

### Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `PRIVATE_KEY`, `CHAIN_RPC` and `PARENT_CHAIN_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

### Run

```
yarn run custom-token-bridging
```

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>

