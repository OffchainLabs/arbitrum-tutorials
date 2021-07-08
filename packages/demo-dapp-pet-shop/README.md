# demo-dapp-pet-shop Tutorial

demo-dapp-pet-shop is a simple sample example that allows you to deploy the adoption contract to Arbitrum and run its functions.

## Running locally

---

demo-dapp-pet-shop is configurable. You can configure it with the following environment variables:

1. In the application folder, copy the `.env-sample` file and create a file called `.env`.

```bash
cp .env-sample .env
```

2. Open the .env file and add the variables.

3. Run the following in order to compile and execute the smart contract.

```bash
yarn hardhat run scripts/exec.js
```

## Curious to see the output on the Arbitrum chain?

Once the script is successfully executed, you can go to the [Arbitrum block explorer](https://rinkeby-explorer.arbitrum.io/#), enter your L2 address, and see the corresponding trasnactions on the Arbitrum chain!

<p align="center">
  <img width="350" height="100" src= "https://offchainlabs.com/static/media/full-logo.3271d3e8.png" />
</p>
