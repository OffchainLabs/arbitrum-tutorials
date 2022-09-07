# delayedInbox-l2msg Tutorial

(Note this can only be done in nitro stack, not in Arbitrum classic.)

delayedInbox-l2msg is a simple sample example that allows you to send a l2 msg without using sequencer way, this can be used when sequencer censors your tx or when sequencer is down.

The deme allows you to send an L2 message without having to use the L2 RPC (only using the L1 RPC). This demo has 2 parts; (1) one part will show how to send a norma L2 transaction using the delayed inbox, (2) another will show how to withdraw your funds back without the sequencer.

If the sequencer goes down when running the `Withdraw Funds`, you need to use our [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk/blob/master/src/lib/inbox/inbox.ts#L256) to force include your tx to continue. (example [here](https://github.com/OffchainLabs/arbitrum-sdk/blob/401fa424bb4c21b54b77d95fbc95faec15787fe2/fork_test/inbox.test.ts#L131))

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

### Run Demo

Normal Transaction:

```bash
yarn run normalTx
```

Withdraw Funds:

```bash
yarn run withdrawFunds
```

## Curious to see the output on the Arbitrum chain?

Once the script is successfully executed, you can go to the [Arbitrum nitro block explorer](https://goerli-rollup-explorer.arbitrum.io/), enter your L2 address, and see the corresponding transactions on the Arbitrum chain!

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
