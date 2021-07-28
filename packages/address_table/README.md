# Address Table Demo

The Address table is a precompiled contract on Arbitrum for registering addresses which are then retrievable by an integer index; this saves gas by minimizing precious calldata required to input an address as a parameter.

This demo shows a simple contract with affordances to retrieve an address from a contract by its index in the address table, and a client-side script to pre-register the given address (if necessary).

See `exec.js` for inline comments / explanation.

### Run demo

```
 yarn run exec
```

### Set up

See .env.sample for required environmental variables.

### More info

See our [developer documentation for more info](https://developer.offchainlabs.com/docs/special_features).

<p align="center">
  <img width="350" height="100" src= "https://offchainlabs.com/static/media/full-logo.3271d3e8.png" />
</p>
