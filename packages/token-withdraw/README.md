# Tutorial: token withdraw

`token-withdraw` shows how to move ERC-20 tokens from a chain to its parent chain (e.g. from Arbitrum to Ethereum).

Note that this repo covers initiating a token withdrawal; for a demo on releasing the funds from the Outbox, see [outbox-execute](../outbox-execute/README.md)

## How it works (under the hood)

To withdraw a token from an Arbitrum chain, a message is send from a gateway contract which burns the token on the origin chain, and sends a message to its parent chain, which allow the token to be released from escrow once the dispute period is expired.

For more info, see [child-to-parent messages](https://docs.arbitrum.io/how-arbitrum-works/arbos/l2-l1-messaging).

## Standard ERC-20 withdrawal

In this tutorial, we deploy a fresh token and then deposit some to the child chain. Then, we use these new tokens to trigger a withdrawal back to the parent chain.

We use our [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk) library for the token bridge interactions.

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
yarn run token-withdraw
```

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
