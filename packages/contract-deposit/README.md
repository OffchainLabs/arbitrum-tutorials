# L2 alias control and fund transfer guide

`L2 Alias Control and Fund Transfer Guide` is a simple demonstration of how Arbitrum facilitates sending deposits from an L1 contract to L2.

It will deposit funds to l2 via a l1 contract, and because the inbox contract will alias the sender address if it is a contract,
this tutorial shows how to control the alias address on l2 via its l1 contract address.

This tutorial demonstrates depositing funds to L2 using an L1 contract. Since the Inbox contract changes the sender address if it's a contract [(a.k.a address aliasing)](https://docs.arbitrum.io/how-arbitrum-works/arbos/l1-l2-messaging#address-aliasing), it explains how to manage the new L2 address using the L1 contract address. It's a basic example of how an L1 contract controls its L2 alias and transfers its alias funds to another address. For practical use, we recommend our [funds recovery tool](<(https://github.com/OffchainLabs/arbitrum-funds-recovery-tool)>).

The script and contracts demonstrate how to interact with Arbitrum's core bridge contracts to create these retryable messages, how to calculate and forward appropriate fees from L1 to L2, and how to use Arbitrum's L1-to-L2 message [address aliasing](https://developer.offchainlabs.com/docs/l1_l2_messages#address-aliasing).

See [./exec.js](./scripts/exec.js) for inline explanations.

[Click here](https://developer.offchainlabs.com/docs/l1_l2_messages) for more info on retryable tickets.

### Run demo:

```
yarn start
```

## Config environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```shell
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
