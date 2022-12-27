# l1 confirmation checker Tutorial

`l1 confirmation checker` is a simple demo of Arbitrum's transaction finality checker (used to check if transaction submitted to l1 or not).

It calls precompile `NodeInterface` to find information about an L1 transactions that posted the L2 transaction in a batch.

It has 2 functions, first is `checkConfirmation` which you can use to check if your l2 transaction is confirmed on L1 or not, second is `findSubmissionTx` which can be used when your L2 transaction is confirmed on L1, you can call it to find what the L1 submission transaction is.

See [./exec.js](./scripts/exec.js) for inline explanation.


### Run Demo:

check if tx recorded to l1 or not:
```
yarn ts-node scripts/exec.ts --action checkConfirmation --blockNumber {YOUR_BLOCK_NUMBER}
```
get submissiontx by a given l2 transaction status:
```
yarn ts-node scripts/exec.ts --action findSubmissionTx --blockNumber {YOUR_BLOCK_NUMBER}
```

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
