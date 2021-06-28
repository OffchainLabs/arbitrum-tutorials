const { utils, providers, Wallet} = require("ethers");
const { expect } = require("chai");
const { Bridge } = require("arb-ts") 
const { parseEther } = utils


require('dotenv').config();


const main = async () => {

    const wait = (ms = 0) => { return new Promise(res => setTimeout(res, ms || 1000))}

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

    const withdrawEthTx = await bridge.withdrawETH(ethFromL2WithdrawAmount, '')
    const withdrawRec = await withdrawEthTx.wait()
    expect(withdrawRec.status).to.equal(1)
    
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
