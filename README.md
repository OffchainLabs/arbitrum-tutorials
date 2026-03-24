# Arbitrum Tutorials

This monorepo will help you get started with building on Arbitrum chains. It provides various simple demos showing and explaining how to interact with Arbitrum chains (including Orbit chains) — deploying and using contracts directly on Arbitrum, moving Ether and tokens betweens the parent and child chains, and more.

We show how you can use broadly supported Ethereum ecosystem tooling (Hardhat, Ethers-js, etc.) as well as our special [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk) for convenience.

## Installation

From root directory:

```bash
yarn install
```

## Environment Setup

To simplify providing environment variables across all tutorials, a helper script automates creating `.env` files from each existing `.env-sample`.

```bash
yarn setup-envs

# To update existing .env files as well
yarn setup-envs --update
```

## Testing

1. Start the nitro-testnode (you can find instructions [here](https://docs.arbitrum.io/run-arbitrum-node/run-local-full-chain-simulation)) with the following parameters:

```shell
./test-node.bash --init --tokenbridge --l3node --l3-token-bridge
```

2. Execute all tests with the following command

```shell
yarn run testAll
```

### Notes on RPCs and Finality

Using public testnet RPCs can be slow because many tutorials wait for transaction finality or multiple confirmations. Some tests may take 10–15 minutes to complete on testnets. For faster and more reliable execution, prefer running a local node and pointing your environment variables (`CHAIN_RPC`, `PARENT_CHAIN_RPC`, and `L1_RPC` when applicable) to local RPC endpoints.

## What's included?

#### :white_check_mark: Basics

- 🐹 [Pet Shop DApp](./packages/demo-dapp-pet-shop/)
- 🗳 [Election DApp](./packages/demo-dapp-election/)

#### :white_check_mark: Moving stuff around

- ⤴️ 🔹 [Deposit Ether or native token](./packages/eth-deposit/)
- ⤴️ 🔹 [Deposit Ether or native token to a different address](./packages/eth-deposit-to-different-address/)
- ⤵️ 🔹 [Withdraw Ether or native token](./packages/eth-withdraw/)
- ⤴️ 💸 [Deposit token](./packages/token-deposit/)
- ⤵️ 💸 [Withdraw token](./packages/token-withdraw/)
- ⤴️ 🔹 [Contract alias control in the child chain, and fund-transfer guide](./packages/contract-deposit/)

#### :white_check_mark: General interop

- 🤝 [Greeter](./packages/greeter/) (parent to child messages)
- 📤 [Outbox tutorial: execute a child-to-parent message](./packages/outbox-execute/) (child to parent messages)
- ⏰ [Parent chain confirmation checker](./packages/parent-chain-confirmation-checker/)
- ⏰ [Block verification in parent chain's assertion](./packages/block-verification-in-parent-chain-assertion/)

#### :white_check_mark: Advanced features

- ®️ [ArbAddress table](./packages/address-table/)
- 🌉 [Bridging a custom token through the generic-custom gateway](./packages/custom-token-bridging/)
- 🌉 [Bridging a custom token through a custom gateway](./packages/custom-gateway-bridging/)
- ✈️ [Send a signed transaction from the parent chain](./packages/delayedInbox-l2msg/)
- 🛡️ [Force inclusion end-to-end test](./packages/force-inclusion/)
- 🎁 [Redeem pending retryable ticket](./packages/redeem-pending-retryable/)
- 🧮 [Gas estimation](./packages/gas-estimation/)
- 🌀 [Deposit Ether or Tokens from L1 to L3](./packages/l1-l3-teleport/)

## How to run the tutorials against a custom network

As mentioned above, these tutorials use the [Arbitrum SDK](https://github.com/OffchainLabs/arbitrum-sdk), which loads the regular Arbitrum chains by default (Arbitrum One, Arbitrum Nova and Arbitrum Sepolia). You can use these tutorials against any other Arbitrum chain (including Orbit chains), by loading it to the Arbitrum SDK.

To do that, fill the information of your chain in the [`customNetwork.json`](./customNetwork.json) file, which is automatically loaded in all tutorials.

To obtain the information of a specific chain, you can use the method [`prepareArbitrumNetwork`](https://github.com/OffchainLabs/arbitrum-orbit-sdk/blob/main/src/utils/registerNewNetwork.ts#L18) of the Orbit SDK.

You can also register multiple chains if you need to (for example, for the `l1-l3-teleport` tutorial). In that case, create an array of chain information objects in the `customNetwork.json` file.

<p align="center"><img src="assets/logo.svg" width="300"></p>
