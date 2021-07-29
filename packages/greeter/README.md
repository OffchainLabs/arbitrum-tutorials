# Greeter Tutorial

`greeter` is a simple demo of Arbitrum's L1-to-L2 message passing system (aka "retryable tickets").

It deploys 2 contracts - one to L1, and another to L2, and has the L1 contract send a message to the L2 contract to be executed automatically.

he script and contracts demonstrate how to interact with Arbitrum's core bridge contracts to create these retryable messages, how to calculate and forward appropriate fees from L1 to L2, etc.

See [./exec.js](./scripts/exec.js) for inline explanation.

To run:

```
yarn run greeter
```

[Click here](https://developer.offchainlabs.com/docs/l1_l2_messages) for more info on retryable tickets.

## Running locally

Greeter is configurable. You can configure it with the following environment variables:

1. In the application folder, copy the `.env-sample` file and create a file called `.env`.

```bash
cp .env-sample .env
```

2. Open the .env file and add the variables.

3. Run the following command in order to compile and execute the smart contracts.

```bash
yarn hardhat run scripts/exec.js
```
