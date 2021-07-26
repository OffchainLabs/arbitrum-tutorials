# Outbox Demo

The Outbox contract is responsible for receiving and executing all "outgoing" messages; i.e., messages passed from Arbitrum to Ethereum.

The (expected) most-common use-case is withdrawals (of, i.e., Ether or tokens), but the Outbox handles any arbitrary contract call, as this demo illustrates.

See `exec.js` for inline comments / explanation.

### Run demo

```
 yarn hardhat outbox-exec --txhash 0xmytxnhash
```

- _0xmytxnhash_ is expected to be the transaction hash of an L2 transaction that triggered an L2 to L1 message.

### Set up

See .env.sample for required environmental variables.

### More info

See our [developer documentation on messaging between layers](https://developer.offchainlabs.com/docs/l1_l2_messages).

<p align="center">
  <img width="350" height="100" src= "https://offchainlabs.com/static/media/full-logo.3271d3e8.png" />
</p>
