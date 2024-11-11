# Tutorial: deposit Ether or native token

`eth-deposit` shows how to move Ether (or your chain's native token if you're using a custom gas token) from the parent chain into an Arbitrum or Orbit chain.

## How it works (under the hood)

A user deposits the chain's native token (e.g. Ether) onto an Arbitrum chain using Arbitrum's general Parent-to-child message passing system, and simply passing the desired Ether as callvalue and no additional data. For more info, see [this page of the Arbitrum documentation](https://docs.arbitrum.io/how-arbitrum-works/arbos/l1-l2-messaging#eth-deposits).

## Using the Arbitrum SDK

Our [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk) provides a simply convenience method for depositing Ether (or your chain's native token), abstracting away the need for the client to connect to any contracts manually.

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
yarn run depositETH
```

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
