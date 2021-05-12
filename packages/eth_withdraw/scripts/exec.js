

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

    const L2Witdraw = await (await hre.ethers.getContractFactory('Withdraw')).connect(l2Signer)
    
    console.log("Deploying L2")
    
    const l2Withdraw = await L2Witdraw.deploy()
    await l2Withdraw.deployed()
    console.log(`deployed to ${l2Withdraw.address}`)


    
    await l2Withdraw.withdrawEth(signer.address,  {value: 10000000 })
    
    console.log("ETH has been withdrwan and sent to", signer.address)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
