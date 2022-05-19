# Outbox Demo

The Outbox contract is responsible for receiving and executing all "outgoing" messages; i.e., messages passed from Arbitrum to Ethereum.

The (expected) most-common use-case is withdrawals (of, i.e., Ether or tokens), but the Outbox handles any arbitrary contract call, as this demo illustrates.

See [./exec.js](./scripts/exec.js) for inline comments / explanation.

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

### Run demo

```
 yarn outbox-exec --txhash 0xmytxnhash
```

- _0xmytxnhash_ is expected to be the transaction hash of an L2 transaction that triggered an L2 to L1 message.

### More info

See our [developer documentation on messaging between layers](https://developer.offchainlabs.com/docs/l1_l2_messages).

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
