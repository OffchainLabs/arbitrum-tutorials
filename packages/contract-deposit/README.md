# Contract deposit Tutorial

`Contract deposit` is a simple demo of Arbitrum's L1-to-L2 deposit sending from a l1 contract

It will deposit funds to l2 via a l1 contract, and because the contract will alias the sender address if it is a contract,
this tutorial shows how to control the alias address on l2 via its l1 contract address.

This tutorial is just used to simply show how l1 contract controls its l2 alias and transfer its l2 alias funds to other address, if you want to use it as a tool, we suggest you to use our [Funds Recovery Tool](https://github.com/OffchainLabs/arbitrum-funds-recovery-tool).


The script and contracts demonstrate how to interact with Arbitrum's core bridge contracts to create these retryable messages, how to calculate and forward appropriate fees from L1 to L2, and how to use Arbitrum's L1-to-L2 message [address aliasing](https://developer.offchainlabs.com/docs/l1_l2_messages#address-aliasing).

See [./exec.js](./scripts/exec.js) for inline explanation.

[Click here](https://developer.offchainlabs.com/docs/l1_l2_messages) for more info on retryable tickets.

### Run Demo:

```
yarn start
```

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
