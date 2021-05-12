

const hre = require("hardhat");
const ethers = require("ethers");
const { Bridge } = require("arb-ts");
require('dotenv').config();



const main = async () => {
    const accounts = await hre.ethers.getSigners();

    const infuraKey = process.env.INFURA_KEY
    if(!infuraKey) throw new Error("No INFURA_KEY set.")

    const walletPrivateKey = process.env.DEVNET_PRIVKEY
    if(!walletPrivateKey) throw new Error("No DEVNET_PRIVKEY set.")


    const l2Provider = new ethers.providers.JsonRpcProvider(process.env.L2RPC)
    const signer = new ethers.Wallet(walletPrivateKey)

    const l2Signer = signer.connect(l2Provider)

    const L2Withdraw = await (await hre.ethers.getContractFactory('Withdraw')).connect(l2Signer)
    
    console.log("Deploying L2")
    
    const l2Withdraw = await L2Withdraw.deploy()
    await l2Withdraw.deployed()
    console.log(`deployed to ${l2Withdraw.address}`)

    //As explained in the README, there are two options to withdraw ETH:

    //Option 1:
    await l2Withdraw.sendTxToL1(signer.address,  {value: 10000000 })
    console.log("ETH has been withdrawn and sent to", signer.address)
    //Option 2:
    await l2Withdraw.withdrawEth(signer.address,  {value: 10000000 })
    console.log("ETH has been withdrawn and sent to", signer.address)
    
    



}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
