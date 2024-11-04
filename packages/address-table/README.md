# Address table demo

The Address table is a precompiled contract on Arbitrum chains for registering addresses which are then retrievable by an integer index; this saves gas by minimizing precious calldata required to input an address as a parameter.

This demo shows a simple contract with affordances to retrieve an address from a contract by its index in the address table, and a client-side script to pre-register the given address (if necessary).

See `exec.js` for inline comments / explanation.

### Run demo

```
 yarn run exec
```

## Set environment variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

You'll still need to edit some variables, i.e., `PRIVATE_KEY` and `CHAIN_RPC`.

Note that you can also set the environment variables in an `.env` file in the root of the monorepo, which will be available in all tutorials.

### More info

See our [developer documentation for more info](https://docs.arbitrum.io/).

<p align="left">
  <img width="350" height="150" src= "../../assets/logo.svg" />
</p>
