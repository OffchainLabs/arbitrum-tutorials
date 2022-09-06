# eth-deposit Tutorial

`eth-deposit` shows how to move Ether from Ethereum (Layer 1) into the Arbitrum (Layer 2) chain.

## How it works (Under the hood)

A user deposits Ether onto Arbitrum using Arbitrum's general L1-to-L2 message passing system, and simply passing the desired Ether as callvalue and no additional data. For more info, see [Retryable Tickets documentation](https://developer.offchainlabs.com/docs/l1_l2_messages#depositing-eth-via-retryables).

### **Using Arbitrum SDK tooling**

Our [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk) provides a simply convenience method for depositing Ether, abstracting away the need for the client to connect to any contracts manually.

See [./exec.js](./scripts/exec.js) for inline explanation.

To run:

```
yarn run depositETH
```

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

---

Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://goerli-rollup-explorer.arbitrum.io/), enter your address, and see the amount of ETH that has been assigned to your address on the Arbitrum chain!

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
