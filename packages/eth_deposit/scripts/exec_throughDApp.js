const {utils, providers, Wallet} = require("ethers");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const { parseEther } = utils

require('dotenv').config();

const main = async () => {
   

    const infuraKey = process.env.INFURA_KEY
    if(!infuraKey) throw new Error("No INFURA_KEY set.")

    const walletPrivateKey = process.env.DEVNET_PRIVKEY
    if(!walletPrivateKey) throw new Error("No DEVNET_PRIVKEY set.")

    const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
    const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

    
    const preFundedWallet = new Wallet(walletPrivateKey, l1Provider)
    const l2Wallet = new Wallet(walletPrivateKey, l2Provider)
    const l2InitialBalance = await l2Wallet.getBalance()
    
    const ethToL2DepositAmount = parseEther('0.0001')
    const L1Deposit = await (await ethers.getContractFactory('Deposit')).connect(preFundedWallet)
    
    console.log("Deploying Deposit contract to L1")
    
    const l1Deposit = await L1Deposit.deploy(process.env.INBOX_ADDR)
    await l1Deposit.deployed()
    console.log(`Deposit contract is deployed to ${l1Deposit.address}`)

    
    const tx = await l1Deposit.depositEther(preFundedWallet.address, {value: ethToL2DepositAmount});
    const rec = await tx.wait()
    expect(rec.status).to.equal(1)
    
    const l2EthBalance = await l2Provider.getBalance(l2Wallet.address)
    expect(l2InitialBalance.add(ethToL2DepositAmount).eq(l2EthBalance))


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 