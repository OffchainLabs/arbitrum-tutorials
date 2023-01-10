# L1 Confirmation Checker Tutorial

`l1 confirmation checker` is a simple demo of Arbitrum's transaction finality checker (used to check if transaction submitted to l1 or not).

It calls precompile `NodeInterface` to find information about an L1 transaction that posted the L2 transaction in a batch.

It has 2 functions; both functions will show you whether your L2 transaction has been posted in an L1 batch. 
The first function, `checkConfirmation`, will output the number of L1 block confirmations the L1 batch-posting transaction has.
The second is `findSubmissionTx`, which will output the L1 batch-posting transaction hash.

See [./exec.js](./scripts/exec.js) for inline explanations.


### Run Demo:

Check if tx recorded in L1 or not:
```
yarn ts-node scripts/exec.ts --action checkConfirmation --txHash {YOUR_TX_HASH}
```
Get submissiontx by a given L2 transaction status:
```
yarn ts-node scripts/exec.ts --action findSubmissionTx --txHash {YOUR_TX_HASH}
```

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
