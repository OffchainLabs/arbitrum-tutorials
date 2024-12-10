# Tutorial: withdraw Ether or native token

`eth-withdraw` shows how to move Ether (or your chain's native token if you're using a custom gas token) from an Arbitrum or Orbit chain into its parent chain.

Note that this repo covers initiating a withdrawal. For a demo on releasing the funds from the Outbox, see [outbox-execute](../outbox-execute/README.md)

## How it works (under the hood)

To withdraw Ether (or your chain's native token) from an Arbitrum chain, a client creates an outgoing / child to parent message using the `ArbSys` precompile that later lets them release the asset from its escrow in the parent chain's Bridge contract. For more info, see [this page of the Arbitrum documentation](https://docs.arbitrum.io/how-arbitrum-works/arbos/l2-l1-messaging).

## Using the Arbitrum SDK

Our [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk) provides a simply convenience method for withdrawing Ether (or your chain's native token), abstracting away the need for the client to connect to any contracts manually.

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
yarn run withdrawETH
```

_Note: Executing scripts will require your account be funded with .000001 Eth in the child chain._

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
