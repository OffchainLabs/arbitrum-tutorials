# Contract alias control in the child chain, and fund-transfer guide

`Contract alias control in the child chain, and fund-transfer guide` is a simple demonstration of how Arbitrum facilitates sending deposits from a contract in the parent chain, to the child chain.

It will deposit funds to the child chain via a contract deployed to the parent chain, and because the inbox contract will alias the sender address if it is a contract, this tutorial shows how to control the alias address on the child chain via the address of the contract on the parent chain.

This tutorial demonstrates depositing funds to the child chain using a contract deployed to the parent chain. Since the Inbox contract changes the sender address if it's a contract [(a.k.a address aliasing)](https://docs.arbitrum.io/how-arbitrum-works/arbos/l1-l2-messaging#address-aliasing), it explains how to manage the aliased address on the child chain using the contract address on the parent chain. It's a basic example of how a contract controls its alias on the child chain, and transfers its funds from the aliased address to another address. For practical use, we recommend our [funds recovery tool](https://github.com/OffchainLabs/arbitrum-funds-recovery-tool).

The script and contracts demonstrate how to interact with Arbitrum's core bridge contracts to create these retryable messages, how to calculate and forward appropriate fees from the parent to the child chain, and how to use Arbitrum's cross-chain message [address aliasing](https://docs.arbitrum.io/how-arbitrum-works/arbos/l1-l2-messaging#address-aliasing).

See [./exec.js](./scripts/exec.js) for inline explanations.

[Click here](https://docs.arbitrum.io/how-arbitrum-works/arbos/l1-l2-messaging) for more info on retryable tickets.

### Run demo

```
yarn start
```

## Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```shell
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `PRIVATE_KEY`, `CHAIN_RPC`, `PARENT_CHAIN_RPC` and `TransferTo`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
