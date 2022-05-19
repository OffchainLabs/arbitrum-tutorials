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
yarn withdraw-token
```

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
