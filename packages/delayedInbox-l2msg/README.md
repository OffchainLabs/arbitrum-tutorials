# delayedInbox-l2msg Tutorial
(Noted this can only be done in nitro stack, not in arbitrum classic, so l2 rpc please use nitro test rpc)
delayedInbox-l2msg is a simple sample example that allows you to send a l2 msg without using sequencer way, this can be used when sequencer censor your tx or when sequencer downs.

The demo will alow you send a l2 message while you don't need to use l2 rpc but just use l1 rpc; This demo has 2 part, one part will show how to send a normal l2 transaction using delayed inbox, another will show when sequencer downs, how to withdraw your funds back.

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

### Run Demo

part 1:
```bash
yarn run normalTx
```

part 2:
```bash
yarn run withdrawFunds
```


## Curious to see the output on the Arbitrum chain?

Once the script is successfully executed, you can go to the [Arbitrum nitro block explorer](https://goerli-rollup-explorer.arbitrum.io/), enter your L2 address, and see the corresponding transactions on the Arbitrum chain!

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
