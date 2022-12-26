# l1 confirmation checker Tutorial

`l1 confirmation checker` is a simple demo of Arbitrum's transaction finality checker (used to check if transaction submitted to l1 or not).

It calls precompile `NodeInterface` to check it related l1 transaction.

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
