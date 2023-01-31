# eth-deposit-to-different-address Tutorial

`eth-deposit-to-different-address` shows how to move Ether from Ethereum (Layer 1) into the Arbitrum (Layer 2) chain, to an address different than the depositor.

## How it works (Under the hood)

For the common case of depositing ETH to the same account on L2, use the tutorial [eth-deposit](../eth-deposit/README.md).
In this specific case, we will use the retryable tickets system to deposit ETH into a different address. We will use the parameter `l2CallValue` of the Retryable ticket to specify the amount of ETH to deposit, and `callValueRefundAddress` to specify the destination address. For more info on Retryable tickets, see [Retryable Tickets documentation](https://developer.offchainlabs.com/docs/l1_l2_messages#depositing-eth-via-retryables).

### **Using Arbitrum SDK tooling**

Our [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk) provides a simple convenient method for creating a retryable ticket, abstracting away the need for the client to connect to any contracts manually.

See [./exec.js](./scripts/exec.js) for inline explanation.

To run:

```
yarn run exec
```

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

---

Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://goerli-rollup-explorer.arbitrum.io/), enter your address, and see the amount of ETH that has been assigned to the specified address on the Arbitrum chain!

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
