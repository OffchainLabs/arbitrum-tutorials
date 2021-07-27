# token_withdraw Tutorial

token_withdrawis an example of moving standard and custom ERC20 tokens from Arbitrum (Layer 2) into Ethereum (Layer 1).

## How it works?

---

Three types of contracts are used to facilitate token bridging:

- Asset contracts: these are the token contracts themselves, i.e., an ERC20 on L1 and it's counterpart on Arbitrum.
- Gateways: Pairs of contracts (one on L1, one on L2) that implement a particular type of cross chain asset bridging.
- Routers: Exactly two contracts - (one on L1, one on L2) that route each asset to its designated Gateway.

All Arbitrum to Ethereum token transfers are initiated via the `L2GatewayRouter` contract. `L2GatewayRouter` forwards the token's withdrawa-call to its `L2ArbitrumGateway`, which in turn communicates to its corresponding `L1ArbitrumGateway` (typically/expectedly via sending messages to the Outbox.)

---

#### **Standard ERC20 Withdrawal**

Withdrawing ERC20 tokens from Arbitrum into Ethereum can be done using the Bridge that we provide in our `arb-ts` client side library. Having the Bridge installed and intiated, users can transfer tokens from Arbitrum chain by sending a `withdrawERC20(erc20Address, tokenWithdrawAmount)` transaction directly to the Bridge. See the `exec_throughBridge.js` for sample usage. In this example, (1) we deploy a sample ERC20 token called `DappToken` on L1, (2) deposit a certain amount of `DappToken` to L2, (3) and finally, withdraw a certain amount of `DappToken` from L2 to L1.

---

## Running locally

---

token_deposit is configurable. You can configure it with the following environment variables:

1. In the application folder, copy the `.env-sample` file and create a file called `.env`.

```bash
cp .env-sample .env
```

2. Open the .env file and add the variables.

3. Run one of the following commands in order to compile and execute the smart contracts.

```bash
yarn hardhat run scripts/exec_throughBridge.js

```

<p align="center">
  <img width="350" height="100" src= "https://offchainlabs.com/static/media/full-logo.3271d3e8.png" />
</p>
