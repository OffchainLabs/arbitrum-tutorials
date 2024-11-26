# Greeter tutorial

`greeter` is a simple demo of Arbitrum's Parent-to-child message passing system (aka "L1-to-L2" or "retryable tickets").

It deploys 2 contracts - one to the parent chain, and another to the child chain, and has the parent chain contract send a message to the child chain contract to be executed automatically.

The script and contracts demonstrate how to interact with Arbitrum's core bridge contracts to create these retryable messages, how to calculate and forward appropriate fees from parent to child, and how to use Arbitrum's Parent-to-child message [address aliasing](https://docs.arbitrum.io/how-arbitrum-works/arbos/l1-l2-messaging#address-aliasing).

See [./exec.js](./scripts/exec.js) for inline explanation.

[Click here](https://docs.arbitrum.io/how-arbitrum-works/arbos/l1-l2-messaging) for more info on retryable tickets.

## Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `PRIVATE_KEY`, `CHAIN_RPC` and `PARENT_CHAIN_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

## Run

To run:

```
yarn run greeter
```

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
