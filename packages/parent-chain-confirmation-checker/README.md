# Tutorial: Parent chain confirmation checker

`parent-chain-confirmation-checker` is a simple demo of Arbitrum's transaction finality checker (used to check if a transaction was already submitted to the parent chain or not).

It calls the precompile `NodeInterface` to find information about a transaction on the parent chain that includes a batch containing the specified child chain's transaction.

This tutorial has 2 scripts; both will show you whether your transaction has been posted in a batch on the parent chain or not.

- The first script, `checkConfirmation`, will output the number of block confirmations of the batch-posting transaction on the parent chain.
- The second is `findSubmissionTx`, which will output the batch-posting transaction hash on the parent chain.

See [./exec.js](./scripts/exec.js) for inline explanations.

## Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `CHAIN_RPC` and `PARENT_CHAIN_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

## Run

Script 1: check if the transaction is already on a batch on the parent chain:

```
yarn checkConfirmation --txHash {YOUR_TX_HASH}
```

Script 2: get the transaction hash on the parent chain that includes a batch that contains a given transaction of the child chain:

```
yarn findSubmissionTx --txHash {YOUR_TX_HASH}
```

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
