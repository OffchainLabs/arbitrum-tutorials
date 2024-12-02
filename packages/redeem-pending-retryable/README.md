# Tutorial: redeem pending retryable ticket

Retryable tickets are the Arbitrum protocol’s canonical method for passing generalized messages from the parent chain to a child chain (for example, from Ethereum to Arbitrum). A retryable ticket is a message for a chain, encoded and delivered by its parent chain; if gas is provided, it will be executed immediately. If no gas is provided or the execution reverts, it will be placed in the chain's retry buffer, where any user can re-execute for some fixed period (roughly one week).

You can use `exec-createFailedRetryable` script to create a failed retryable ticket and then use `exec-redeem` which shows you how to redeem (re-execute) a ticket that is sitting in the chain's retry buffer.

See [./exec-redeem.js](./scripts/exec-redeem.js) for inline explanation.

[Click here](https://docs.arbitrum.io/how-arbitrum-works/arbos/l1-l2-messaging) for more info on retryable tickets.

## Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `PRIVATE_KEY`, `CHAIN_RPC` and `PARENT_CHAIN_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

## Run

To create a failed retryable ticket:

```
 yarn run createFailedRetryable
```

To redeem a pending retryable ticket:

```
 yarn redeemPendingRetryable --txhash 0xmytxnhash
```

- _0xmytxnhash_ is expected to be the transaction hash of the transaction on the parent chain that triggered the parent-to-child message.

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>