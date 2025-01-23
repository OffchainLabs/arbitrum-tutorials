# Custom gateway bridging tutorial

When neither the standard ERC20 gateway, nor the generic-custom gateway are enough to fulfill the bridging requirements of a token, there is the possibility of creating and registering a custom gateway. `custom-gateway-bridging` demonstrates how to create and register a custom gateway in the Arbitrum's Token Bridge.

For more info on bridging assets on Arbitrum, see our [token bridging docs](https://docs.arbitrum.io/build-decentralized-apps/token-bridging/token-bridge-erc20).

## Token bridging using a custom gateway

Bridging custom tokens through a custom gateway follow a similar process than that of Arbitrum's generic-custom gateway. The difference, however, is that during the gateway registration process, a custom gateway is registered instead of the generic-custom gateway.

Here, we deploy a [demo custom token](./contracts/ParentChainToken.sol) to the parent chain and a [demo custom token](./contracts/ChildChainToken.sol) to the child chain. We also deploy a demo custom gateway on both [the parent chain](./contracts/ParentChainCustomGateway.sol) and [the child chain](./contracts/ChildChainCustomGateway.sol). We then use the Arbitrum router contract to register both gateways.

We use the [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk) library to initiate and verify the bridging.

See [./exec.js](./scripts/exec.js) for inline explanation.

### Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `PRIVATE_KEY`, `CHAIN_RPC`, `PARENT_CHAIN_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

### Run:

```
yarn run exec
```

## Disclaimer

The code contained within this package is meant for testing purposes only and does not guarantee any level of security. It has not undergone any formal audit or security analysis. Use it at your own risk. Any potential damages or security breaches occurring from the use of this code are not the responsibility of the author(s) or contributor(s) of this repository. Please exercise caution and due diligence while using this code in any environment.

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
