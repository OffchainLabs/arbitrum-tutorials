const {utils, providers, Wallet, BigNumber} = require("ethers");
const { ethers } = require("hardhat");
const { Bridge} = require ("arb-ts") 
const { expect } = require("chai");
const { parseEther } = utils


require('dotenv').config();


const main = async () => {
    const wait = (ms = 0) => {
        return new Promise(res => setTimeout(res, ms || 0))
    }

    const infuraKey = process.env.INFURA_KEY
    if(!infuraKey) throw new Error("No INFURA_KEY set.")

    const walletPrivateKey = process.env.DEVNET_PRIVKEY
    if(!walletPrivateKey) throw new Error("No DEVNET_PRIVKEY set.")

    const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
    const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
    
    const preFundedWallet = new Wallet(walletPrivateKey, l1Provider)
    const l2Wallet = new Wallet(walletPrivateKey, l2Provider)


    const ethFromL2WithdrawAmount = parseEther('0.00001')
    bridge = await Bridge.init(preFundedWallet, l2Wallet)
    const preWithdrawalL2Balance = await bridge.getAndUpdateL2EthBalance()

    const L2Withdraw = await (await ethers.getContractFactory('Withdraw')).connect(l2Wallet)
    const l2Withdraw = await L2Withdraw.deploy()
    console.log("Deploying Withdraw contract to L2")
    await l2Withdraw.deployed()
    console.log(`Withdraw contract is deployed to ${l2Withdraw.address}`)


    //Use one of the following options to withdraw ETH from L2:

    //Option 1-- sendTxToL1(address _destAddress, bytes calldata _calldataForL1):
    const withdrawEthTx = await l2Withdraw.sendTxToL1(l2Wallet.address, "0x", {value: ethFromL2WithdrawAmount })
    const withdrawRec = await withdrawEthTx.wait()
    expect(withdrawRec.status).to.equal(1)
    
    //Option 2-- withdrawEth(_destAddress):
    //const withdrawEthTx = await l2Withdraw.withdrawEth(l2Wallet.address,  {value: ethFromL2WithdrawAmount })
    //const withdrawRec = await withdrawEthTx.wait()
    //expect(withdrawRec.status).to.equal(1)

    const withdrawEventData = (await bridge.getWithdrawalsInL2Transaction(withdrawRec))[0]
    expect(withdrawEventData).to.exist

    //Check to see if the balance is deducted after withdraw ETH
    wait()
    const L2EthBalance = await bridge.getAndUpdateL2EthBalance()
    expect(L2EthBalance.lt(preWithdrawalL2Balance)).to.be.true
    

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
