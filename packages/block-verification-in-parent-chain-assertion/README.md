# Block verification in an assertion posted on the parent chain

This tutorial shows how to verify whether a block of a chain has been processed as part of an RBlock assertion on its parent chain.

It uses the `Rollup` contract to find the latest confirmed (or created if configured in the script) RBlock/node, find the event that created it, and get the latest processed block hash of the child chain that's part of the assertion of that RBlock/node.

Then it checks whether the block number passed as argument was created before the latest block hash of the child chain processed.

See [./exec.js](./scripts/exec.js) for inline explanations.

## Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `CHAIN_RPC` and `PARENT_CHAIN_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

## Run

```shell
yarn run exec {block_number}
```

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
