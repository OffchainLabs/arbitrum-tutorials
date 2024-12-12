# demo-dapp-election tutorial

`demo-dapp-election` is a simple sample example that allows you to deploy the Election contract to Arbitrum and run its functions.

The contract lives entirely on the targetted chain, and involves no direct interacts from the parent chain; writing, deploying, and interacting with it works just like using a regular contract on Ethereum.

## Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```shell
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `PRIVATE_KEY` and `CHAIN_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

## Run demo

```
yarn run exec
```

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
