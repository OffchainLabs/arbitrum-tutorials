# Redeem Failed Retryable Tickets Tutorial

Retryable tickets are the Arbitrum protocol’s canonical method for passing generalized messages from Ethereum to Arbitrum. A retryable ticket is an L2 message encoded and delivered by L1; if gas is provided, it will be executed immediately. If no gas is provided or the execution reverts, it will be placed in the L2 retry buffer, where any user can re-execute for some fixed period (roughly one week).
You can use `exec-createFailedRetryable` script to create a failed retryable ticket and then use `redeem-failed-retryable` which shows you how to redeem (re-execute) a ticket that is sitting in the L2 retry buffer.

See [./exec-redeem.js](./scripts/exec-redeem.js) for inline explanation.

### Run Demo:

To create a failed retryable ticket:

```
 yarn run createFailedRetryable
```

To redeem a failed retryable ticket:

```
 yarn redeemFailedRetryable --txhash 0xmytxnhash
```

- _0xmytxnhash_ is expected to be the transaction hash of an L1 transaction that triggered an L1 to L2 message.

## Config Environment Variables

Set the values shown in `.env-sample` as environmental variables. To copy it into a `.env` file:

```bash
cp .env-sample .env
```

(you'll still need to edit some variables, i.e., `DEVNET_PRIVKEY`)

### More info

For more information on the retryable tickets, see our [developer documentation on messaging between layers](https://developer.offchainlabs.com/docs/l1_l2_messages).

<p align="center"><img src="../../assets/offchain_labs_logo.png" width="600"></p>
