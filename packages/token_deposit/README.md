# token_deposit Tutorial

token_deposit is an example of moving standard and custom ERC20 tokens from Ethereum (Layer 1) into the Arbitrum (Layer 2) chain.

## How it works?

---

Three types of contracts are used to facilitate token bridging:

- Asset contracts: these are the token contracts themselves, i.e., an ERC20 on L1 and it's counterpart on Arbitrum.
- Gateways: Pairs of contracts (one on L1, one on L2) that implement a particular type of cross chain asset bridging.
- Routers: Exactly two contracts - (one on L1, one on L2) that route each asset to its designated Gateway.

All Ethereum to Arbitrum token transfers are initiated via the `L1GatewayRouter` contract. `L1GatewayRouter` forwards the token's deposit-call to it's appropriate `L1ArbitrumGateway` contract. `L1GatewayRouter` is responsible for mapping L1 token addresses to L1Gateway, thus acting as L1/L2 address oracle and ensuring that each token corresponds to only one gateway. The `L1ArbitrumGateway` communicates to an `L2ArbitrumGateway` (typically/expectedly via retryable tickets).

---

#### **Standard ERC20 Deposits**

Depositing an standard ERC20 token into Arbitrum chain is done via our Standard ERC20 gateway. Note that here we assume the token has already been registered in the `L1GatewayRouter`. Users can use the Bridge we provide to obtain the address of the ERC20 token gateway (the `L1ERC20Gateway` contract). Accessing bridging methods can be done via our `arb-ts` client side library.
Having the Bridge installed and initiated, users can then transfer tokens into Arbitrum chain by sending a `deposit(erc20L1Address,tokenDepositAmount)` transaction directly to the Bridge. See the `exec_throughBridge.js` for sample usage.

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
