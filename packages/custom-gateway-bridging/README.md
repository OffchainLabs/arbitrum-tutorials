# Custom gateway bridging tutorial

When neither the StandardERC20gateway nor the generic-custom-gateway are enough to fulfill the bridging requirements of a token, there is the possibility of creating and registering a custom gateway. `custom-gateway-bridging` demonstrates how to create and register a custom gateway in Arbitrum's Token Bridge protocol.

For more info on bridging assets on Arbitrum, see our [token bridging docs](https://developer.arbitrum.io/asset-bridging).

## Token bridging using a custom gateway

Bridging custom tokens through a custom gateway follow a similar process than that of Arbitrum's generic-custom gateway. The difference, however, is that during the gateway registration process, a custom gateway is registered instead of the generic-custom gateway.

Here, we deploy a [demo custom token](./contracts/L1Token.sol) on L1 and a [demo custom token](./contracts/L2Token.sol) on L2. We also deploy a demo custom gateway on both [L1](./contracts/L1CustomGateway.sol) and [L2](./contracts/L2CustomGateway.sol). We then use the Arbitrum router contract to register our L1 and L2 gateways.

We use the [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk) library to initiate and verify the bridging.

See [./exec.js](./scripts/exec.js) for inline explanation.

### Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

### Run:

```
yarn run exec
```

## Disclaimer

The code contained within this package is meant for testing purposes only and does not guarantee any level of security. It has not undergone any formal audit or security analysis. Use it at your own risk. Any potential damages or security breaches occurring from the use of this code are not the responsibility of the author(s) or contributor(s) of this repository. Please exercise caution and due diligence while using this code in any environment.

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
