# Tutorial: send a signed transaction from the parent chain

`delayedInbox-l2msg` shows how to send a signed transaction to your chain (also referred to as an L2Message) only using an RPC of the parent chain. This demo has 2 parts:

1. how to send a normal signed transaction using the delayed inbox ([./scripts/normalTx.js](./scripts/normalTx.js))
2. how to withdraw your funds back without sending a transaction directly to the sequencer ([./scripts/withdrawFunds.js](./scripts/withdrawFunds.js))

## Bypassing the sequencer

This tutorial also shows the initial step to take if the [sequencer is misbehaving](https://docs.arbitrum.io/how-arbitrum-works/sequencer#unhappyuncommon-case-sequencer-isnt-doing-its-job). In that case, after 24 hours have passed from the moment the message was sent from the parent chain, you can use the SequencerInbox's `forceInclusion` method to move it from the delayed inbox into the core inbox, at which point it's considered finalized.

You can also use the [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk/blob/v4.0.1/src/lib/inbox/inbox.ts#L349-L355) to force include your transaction. See an example [here](https://github.com/OffchainLabs/arbitrum-sdk/blob/v4.0.1/tests/fork/inbox.test.ts#L112).

## Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `PRIVATE_KEY`, `CHAIN_RPC` and `PARENT_CHAIN_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

## Run

Normal transaction:

```bash
yarn normalTx
```

Withdraw funds:

```bash
yarn withdrawFunds
```

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
