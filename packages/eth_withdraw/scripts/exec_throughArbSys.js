const {utils, providers, Wallet} = require("ethers");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const { ArbSys__factory } = require("arb-ts");
const { parseEther } = utils

require('dotenv').config();


const main = async () => {

    const infuraKey = process.env.INFURA_KEY
    if(!infuraKey) throw new Error("No INFURA_KEY set.")

    const walletPrivateKey = process.env.DEVNET_PRIVKEY
    if(!walletPrivateKey) throw new Error("No DEVNET_PRIVKEY set.")

    const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

    
    const l2Wallet = new Wallet(walletPrivateKey, l2Provider)
    const L2initialbalance = await l2Wallet.getBalance()

    const ethFromL2WithdrawAmount = parseEther('0.00001')
    

    const arbSys = ArbSys__factory.connect(process.env.ARBSYS_ADDR, l2Wallet)

    //Use one of the following options to withdraw ETH from L2:

    //Option 1-- sendTxToL1(address _destAddress, bytes calldata _calldataForL1):
    const tx = await arbSys.sendTxToL1(l2Wallet.address, "0x", {value: ethFromL2WithdrawAmount});
    const rec = await tx.wait()
    expect(rec.status).to.equal(1)
    
    //Option 2-- withdrawEth(_destAddress):
    const tx = await arbSys.withdrawEth(l2Wallet.address, {value: ethFromL2WithdrawAmount})
    const rec = await tx.wait()
    expect(rec.status).to.equal(1)
    
    //Check to see if the balance is deducted after withdraw ETH
    const L2EthBalance = await l2Provider.getBalance(l2Wallet.address)
    expect(L2EthBalance.lt(L2initialbalance)).to.be.true

    
    



}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
