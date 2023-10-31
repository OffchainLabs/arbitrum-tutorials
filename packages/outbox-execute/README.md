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

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>

### Testnet Demo

L1: ERC1400Token [0x2296bcefd471e038bbF4dB52a25Fd2375171F79B](https://goerli.etherscan.io/address/0x2296bcefd471e038bbF4dB52a25Fd2375171F79B)

L1: Approve [0x04d2b212d969a5228e02e40b4431e12f1563beb41a0bb8d51c067f385c48369c](https://goerli.etherscan.io/tx/0x04d2b212d969a5228e02e40b4431e12f1563beb41a0bb8d51c067f385c48369c)

L1: Deposit Initiate [0x637039b154e5cf4a41c4c8efc2d538ba2fd0678e4ecb21bb90d8e56b4eca2318](https://goerli.etherscan.io/tx/0x637039b154e5cf4a41c4c8efc2d538ba2fd0678e4ecb21bb90d8e56b4eca2318)

L2: Deposit Execute [0xe60ad0f89efe384eecc321113de18a4009b7a7be12b25755df52eb7a18412b6c](https://goerli.arbiscan.io/tx/0xe60ad0f89efe384eecc321113de18a4009b7a7be12b25755df52eb7a18412b6c)

L2: Withdrawal Initiate [0x82351bbe963d1624b47793b5978400de141a25dcb33d100db00fd8514255cada](https://goerli.arbiscan.io/tx/0x82351bbe963d1624b47793b5978400de141a25dcb33d100db00fd8514255cada)

L1: Withdrawal Execute [0x791d0f1d41507f5e4000fbccb09a520fee25e80135e70b192540916f4b85fd1c](https://goerli.etherscan.io/tx/0x791d0f1d41507f5e4000fbccb09a520fee25e80135e70b192540916f4b85fd1c)
