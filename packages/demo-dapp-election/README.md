# demo-dapp-election Tutorial

demo-dapp-election is a simple sample example that allows you to deploy the Election contract to Arbitrum and run its functions.

The contract lives entirely on L2 / involves no direct L1 interacts; writing, deploying, and interacting with it works just like using an L1 contract.

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

### Run Demo

```bash
yarn run exec
```

## Curious to see the output on the Arbitrum chain?

Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://rinkeby-explorer.arbitrum.io/#), enter your L2 address, and see the corresponding transactions on the Arbitrum chain!

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
