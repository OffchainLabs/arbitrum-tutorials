# Gas estimation tutorial

`gas-estimation` is a simple demo of how a developer can estimate transaction fees on Arbitrum.

It uses the formula described in this Medium article to estimate the fees to be paid on a transaction, also estimating each component of the formula sepparately: [Understanding Arbitrum: 2-Dimensional Fees](https://medium.com/offchainlabs/understanding-arbitrum-2-dimensional-fees-fd1d582596c9). For more information, you can also see [How to estimate gas](https://docs.arbitrum.io/build-decentralized-apps/how-to-estimate-gas) in the Arbitrum documentation portal.

See [./exec.ts](./scripts/exec.ts) for inline explanations.

## Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `CHAIN_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

## Run

Inside the script, you can edit the `txData` constant to suit your needs.

To run:

```
yarn run exec
```

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
