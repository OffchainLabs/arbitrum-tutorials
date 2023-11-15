# L2 block verification in assertion

This tutorial shows how to verify whether an L2 block has been processed as part of an RBlock assertion on L1.

It uses the `Rollup` contract to find the latest confirmed (or created if configured in the script) RBlock/node, find the event that created it, and get the latest processed L2 block hash that's part of the assertion of that RBlock/node.

Then it checks whether the block number passed as argument was created before the latest L2 block hash processed.

See [./exec.js](./scripts/exec.js) for inline explanations.

### Run script:

```shell
yarn run exec {l2_block_number}
```

## Configure environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```shell
cp .env-sample .env
```

You can also use an `.env` file at the root of the monorepo.

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
