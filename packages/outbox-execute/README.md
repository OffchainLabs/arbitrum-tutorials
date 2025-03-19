# Outbox tutorial: execute a child-to-parent message

The outbox contract is responsible for receiving and executing all "outgoing" messages; i.e., messages passed from a chain to its parent chain (for example, from Arbitrum to Ethereum).

The (expected) most-common use-case is withdrawals (of, i.e., Ether or tokens), but the outbox handles any arbitrary contract call, as this tutorial illustrates.

See [./exec.js](./scripts/exec.js) for inline comments / explanation.

[Click here](https://docs.arbitrum.io/how-arbitrum-works/arbos/l2-l1-messaging) for more information on child-to-parent message passing.

## Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `PRIVATE_KEY`, `CHAIN_RPC` and `PARENT_CHAIN_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

## Run

To run:

```shell
yarn outbox-exec 0xmytxnhash
```

- _0xmytxnhash_ is expected to be the transaction hash of a transaction in the child chain that triggered a child-to-parent message.

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
