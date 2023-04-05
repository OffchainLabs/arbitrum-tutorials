# Gas estimation tutorial

`gas-estimation` is a simple demo of how a developer can estimate transaction fees on Arbitrum.

It uses the formula described in this Medium article to estimate the fees to be paid on a transaction, also estimating each component of the formula sepparately: [Understanding Arbitrum: 2-Dimensional Fees](https://medium.com/offchainlabs/understanding-arbitrum-2-dimensional-fees-fd1d582596c9).

See [./exec.ts](./scripts/exec.ts) for inline explanations.

Inside the script, you can edit `txData` constant to suit your needs.

To run:

```
yarn run exec
```

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `L2RPC`)

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>