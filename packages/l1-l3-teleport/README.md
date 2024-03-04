# L2 block verification in assertion

This tutorial shows how to bridge tokens from L1 to an Arbitrum L3.

It uses the [Teleport Contracts](https://github.com/OffchainLabs/l1-l3-teleport-contracts) to send ERC20 tokens through an L2's canonical token bridge, and then again through an L3's canonical token bridge. The entire process only requires a single user transaction on L1 (excluding token approval).

To bridge ETH, it uses a "double retryable", i.e. a retryable that creates another retryable.

See [`initiate-deposit.ts`](./scripts/initiate-deposit.ts) for initiating an ERC20 deposit.

See [`initiate-eth-deposit.ts`](./scripts/initiate-eth-deposit.ts) for initiating an ETH deposit.

See [`monitor-deposit-status.ts`](./scripts/monitor-deposit-status.ts) for monitoring ERC20 deposits.

See [`monitor-eth-deposit-status.ts`](./scripts//monitor-eth-deposit-status.ts) for monitoring ETH deposits.

### Run script:

```shell
yarn initiate-deposit --help

yarn initiate-eth-deposit --help

yarn monitor-deposit-status <txHash>

yarn monitor-eth-deposit-status <txHash>
```

## Configure environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```shell
cp .env-sample .env
```

You can also use an `.env` file at the root of the monorepo.

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
