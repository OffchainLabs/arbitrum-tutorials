# Tutorial: deposit Ether or native token to a different address

`eth-deposit-to-different-address` shows how to move Ether (or your chain's native token if you're using a custom gas token) from the parent chain into an Arbitrum or Orbit chain, to an address different than the depositor.

## How it works (under the hood)

For the common case of depositing Ether (or your chain's native token) to the same account on the child chain, use the tutorial [eth-deposit](../eth-deposit/README.md).

In this specific case, we will use a retryable ticket (Arbitrum's canonical method for creating cross-chain messages) to deposit the chain's native token (e.g. Ether) into a different address. We will use the parameter `l2CallValue` of the retryable ticket to specify the amount of assets to deposit, and `callValueRefundAddress` to specify the destination address. For more info on retryable tickets, see [this page of the Arbitrum documentation](https://docs.arbitrum.io/how-arbitrum-works/arbos/l1-l2-messaging#eth-deposits).

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
yarn run exec
```

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
