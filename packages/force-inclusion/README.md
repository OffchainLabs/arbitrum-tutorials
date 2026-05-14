# Tutorial: Force Inclusion End-to-End Test

`force-inclusion` demonstrates Arbitrum's **censorship resistance** mechanism end-to-end. It deploys a fresh Orbit rollup with a short force inclusion delay (90 seconds), deposits ETH via the delayed inbox, waits for the delay window to pass, and then force includes the deposit — all without a running sequencer.

## What is force inclusion?

Arbitrum's [Sequencer](https://docs.arbitrum.io/how-arbitrum-works/sequencer) normally orders transactions. But what if the sequencer goes offline or starts censoring? Arbitrum guarantees that any message sent to the **delayed inbox** on the parent chain can be **force included** into the chain's inbox after a time delay, bypassing the sequencer entirely.

This tutorial runs the full cycle in a single command:

1. **Deploy** a new Orbit rollup with `maxTimeVariation.delaySeconds = 90` (instead of the default 24 hours)
2. **Deposit** ETH via `Inbox.depositEth()` on the parent chain (goes into the delayed inbox)
3. **Force include** the deposit by calling `SequencerInbox.forceInclusion()` after the delay window passes
4. _(Optional)_ **Start a fullnode** (no sequencer) to verify the deposit appears on the child chain

## Prerequisites

- Node.js 18+
- A deployer account with ETH on the parent chain (Arbitrum Sepolia or a custom parent chain)
- Docker (only needed for the `--with-node` option)

## Set environment variables

Copy the sample env file and fill in your values:

```bash
cp .env-sample .env
```

Required variables:

| Variable               | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| `DEPLOYER_PRIVATE_KEY` | Private key of the deployer (must have ETH on the parent chain) |
| `PARENT_CHAIN_RPC`     | RPC URL of the parent chain                                     |

Optional variables:

| Variable                   | Description                                           |
| -------------------------- | ----------------------------------------------------- |
| `PARENT_CHAIN_ID`          | Parent chain ID (defaults to Arbitrum Sepolia 421614) |
| `BATCH_POSTER_PRIVATE_KEY` | Batch poster key (auto-generated if not set)          |
| `VALIDATOR_PRIVATE_KEY`    | Validator key (auto-generated if not set)             |

## Run

Run steps 1–3 (deploy, deposit, force include):

```bash
yarn test
```

Run all 4 steps including fullnode verification (requires Docker):

```bash
yarn test:withNode
```

## How it works

### Rollup deployment

The script uses `@arbitrum/chain-sdk` (Orbit SDK) to deploy a new rollup. The key configuration is `sequencerInboxMaxTimeVariation`, which controls how long a delayed message must wait before it can be force included:

```js
sequencerInboxMaxTimeVariation: {
  delayBlocks: 6n,
  futureBlocks: 12n,
  delaySeconds: 90n,
  futureSeconds: 3600n,
}
```

### Delayed inbox deposit

ETH is deposited using `@arbitrum/sdk`'s `EthBridger.deposit()`. Under the hood, this calls `Inbox.depositEth()` on the parent chain, which routes through `bridge.enqueueDelayedMessage()`. Without a running sequencer, this message stays in the delayed inbox.

### Force inclusion

After the delay window passes (90 seconds + 6 blocks), `InboxTools.forceInclude()` calls `SequencerInbox.forceInclusion()` on the parent chain. This emits the same `SequencerBatchDelivered` event as a normal sequencer batch, making the deposit part of the canonical chain.

### Fullnode verification (--with-node)

When `--with-node` is passed, the script starts a Nitro fullnode via Docker with the sequencer disabled (`node.sequencer = false`, `execution.forwarding-target = "null"`). The fullnode reads from the parent chain and processes the force-included batch, allowing you to verify that the deposited ETH appears on the child chain.

## Related tutorials

- [Send a signed transaction from the parent chain](../delayedInbox-l2msg/) — demonstrates sending transactions via the delayed inbox with a running sequencer

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
