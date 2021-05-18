const hre = require("hardhat");
const { expect } = require("chai");
const ethers = require("ethers");
const { BigNumber } = require("ethers");

const ethercBridge = "0x1d750369c91b129524B68f308512b0FE2C903d71"; //kovan5

require('dotenv').config();

const main = async () => {
    
    const wait = (ms = 0) => {
        return new Promise(res => setTimeout(res, ms || 10000))
    }
   
    const accounts = await hre.ethers.getSigners();

    const infuraKey = process.env.INFURA_KEY
    if(!infuraKey) throw new Error("No INFURA_KEY set.")

    const walletPrivateKey = process.env.DEVNET_PRIVKEY
    if(!walletPrivateKey) throw new Error("No DEVNET_PRIVKEY set.")


    const l1Provider = new ethers.providers.JsonRpcProvider(process.env.L1RPC)
    const l2Provider = new ethers.providers.JsonRpcProvider(process.env.L2RPC)
    const signer = new ethers.Wallet(walletPrivateKey)

    const l1Signer = signer.connect(l1Provider);
    const l2Signer = signer.connect(l2Provider)

 
    const L1DappToken = await (await hre.ethers.getContractFactory('DappToken')).connect(l1Signer)
    console.log("Deploying DappToken to L1")
    
    const l1DappToken = await L1DappToken.deploy(10000000000)
    await l1DappToken.deployed()
    console.log(`DappToken deployed to ${l1DappToken.address}`)

    const TokenL1Add = l1DappToken.address;
   
    
    const ethrbidge = await (await hre.ethers.getContractAt("IEthERC20Bridge", ethercBridge)).connect(l1Signer); 

    await l1DappToken.connect(l1Signer).approve(ethrbidge.address, 1000);

    await wait()
    await wait()
    
    const allowance = await l1DappToken.allowance(l1Signer.address, ethrbidge.address);
    console.log("allowance", allowance.toNumber())
    
    await ethrbidge.deposit(TokenL1Add, signer.address, 100, 10000000, 50000000, 5, '0x');


    const TokenL2Add = await ethrbidge.calculateL2TokenAddress(erc20Address);
    console.log("Token L2 address", TokenL2Add)



    const L2DappToken = await (await hre.ethers.getContractFactory('DappToken')).connect(l2Signer)
    const l2DappToken = await L2DappToken.attach(TokenL2Add);

    const L2balance = await l2DappToken.balanceOf(signer.address);
    console.log("Token balance L2", balance2.toNumber())


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
