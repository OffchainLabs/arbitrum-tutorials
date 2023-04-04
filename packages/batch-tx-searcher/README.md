# Batch tx searcher Tutorial

`Batch tx searcher` is a simple demo of how to query all the blocks and transactions on Arbitrum.

To achieve this, we should use binary search to find one of the matched Block by calling precompile nodeInterface.findBatchContainingBlock method, then after we found one, we can search around this block to find all matched block. After got all matched block (block range), we can use rpc call to get all txns within those blocks.

It has 2 functions;
The first function, `getBlockRange`, will output the range of blocks that matched to the batch number.
The second is `getAllTxns`, which will not only output the range of blocks, but also write all the txns to a specific file.

See [./exec.js](./scripts/exec.js) for inline explanations.

### Run Demo:

Only get the block range:

```
yarn getBlockRange --batchNum {YOUR_BATCH_NUMBER}
```

Get the block range and all txns:

```
yarn getAllTxns --batchNum {YOUR_BATCH_NUMBER} --outputFile {FILE_TO_RECORD_TXNS}
```

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
