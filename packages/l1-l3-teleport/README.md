# L1 to L3 Bridging

This tutorial shows how to bridge tokens from L1 to an Arbitrum L3.

It uses the [Teleport Contracts](https://github.com/OffchainLabs/l1-l3-teleport-contracts) to send ERC-20 tokens through an L2's canonical token bridge, and then again through an L3's canonical token bridge. The entire process only requires a single user transaction on L1 (excluding token approval).

To bridge ETH, it uses a "double retryable", i.e. a retryable that creates another retryable. You can read more about retryable tickets [here](https://docs.arbitrum.io/how-arbitrum-works/arbos/l1-l2-messaging).

See [`initiate-deposit.ts`](./scripts/initiate-deposit.ts) for initiating an ERC-20 deposit.

See [`initiate-eth-deposit.ts`](./scripts/initiate-eth-deposit.ts) for initiating an ETH deposit.

See [`monitor-deposit-status.ts`](./scripts/monitor-deposit-status.ts) for monitoring ERC-20 deposits.

See [`monitor-eth-deposit-status.ts`](./scripts//monitor-eth-deposit-status.ts) for monitoring ETH deposits.

## Paying for retryables

When initiating an ERC-20 deposit, there are multiple ways retryable fees can be paid.

There are 2 (or 3) L1-to-L2 retryables and 1 L2-to-L3 retryable created during a deposit. By default, the L1-to-L2 retryables will be paid for in ETH when the deposit is initiated. 

If the L3 uses ETH for fees, by default, the L2-to-L3 retryable will be paid for in ETH when the deposit is initiated.

If the L3 uses a custom gas token that is available on L1, by default, the L2-to-L3 retryable will be paid for in the fee token when the deposit is initiated. This requires an extra approval transaction.

If [the L3 uses a custom gas token] AND [that token is unavailable on L1 OR `skipFeeToken` is passed to `getDepositRequest`], the L2-to-L3 retryable will NOT be paid for when the deposit is initiated. If the L2-to-L3 retryable is not paid for up front, it must be eventually manually redeemed on L3. Manually redeeming retryables is permissionless. See instructions [here](https://docs.arbitrum.io/how-arbitrum-works/arbos/l1-l2-messaging#manual-redemption) to manually redeem a retryable ticket. 

## Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```shell
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `PRIVATE_KEY`, `CHAIN_RPC`, `PARENT_CHAIN_RPC` and `L1_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

### Run

```shell
yarn initiate-deposit --help
```

```shell
yarn initiate-eth-deposit --help
```

```shell
yarn monitor-deposit-status <txHash>
```

```shell
yarn monitor-eth-deposit-status <txHash>
```

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
