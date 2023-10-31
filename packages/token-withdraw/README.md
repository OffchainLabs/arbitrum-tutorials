# token-withdraw Tutorial

`token-withdraw` shows how to move ERC20 tokens from Arbitrum (Layer 2) into Ethereum (Layer 1).

Note that this repo covers initiating a token withdrawal; for a demo on (later) releasing the funds from the Outbox, see [outbox-execute](../outbox-execute/README.md)

## How it works (Under the hood)

To withdraw a token from Arbitrum, a message is send from a Gateway contract which burns the token on L2, and sends a message to L1, which allow the token to be released from escrow once the dispute period is expired. For more info, see [Outgoing messages documentation](https://developer.offchainlabs.com/docs/l1_l2_messages#l2-to-l1-messages-lifecycle).

---

#### **Standard ERC20 Withdrawal**

In this demo, we deploy a fresh token and then deposit some to L2. Then, we use these new tokens to trigger a withdrawal back to L1.

We use our [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk) library for the token bridge interactions.

See [./exec.js](./scripts/exec.js) for inline explanation.

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

### Run

```
git submodule update --init --recursive
yarn withdraw-token
```

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
