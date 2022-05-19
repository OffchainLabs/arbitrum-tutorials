# Address Table Demo

The Address table is a precompiled contract on Arbitrum for registering addresses which are then retrievable by an integer index; this saves gas by minimizing precious calldata required to input an address as a parameter.

This demo shows a simple contract with affordances to retrieve an address from a contract by its index in the address table, and a client-side script to pre-register the given address (if necessary).

See `exec.js` for inline comments / explanation.

### Run demo

```
 yarn run exec
```

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

### More info

See our [developer documentation for more info](https://developer.offchainlabs.com/docs/special_features).

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
