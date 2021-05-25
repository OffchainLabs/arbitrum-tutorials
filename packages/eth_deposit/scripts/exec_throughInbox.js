const {utils, providers, Wallet} = require("ethers");
const { Inbox__factory } = require("arb-ts") 
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
    
    const L1initialbalance = await preFundedWallet.getBalance()
    const L2initialbalance = await l2Wallet.getBalance()



    
    const ethToL2DepositAmount = parseEther('0.0001')

    //Transfer ETH to L2 directly through the Inbox contract instantiation:
    const inbox = Inbox__factory.connect(process.env.INBOX_ADDR, l1Signer)
    const tx = await inbox.depositEth(signer.address, {value: ethToL2DepositAmount})
    const rec = await tx.wait()
    expect(rec.status).to.equal(1)

    const finalBalance = await l1Provider.getBalance(preFundedWallet.address)
    expect(L1initialbalance.add(ethToL2DepositAmount).eq(finalBalance))
 
    
    const L2EthBalance = await l2Provider.getBalance(l2Wallet.address)
    expect(L2initialbalance.add(ethToL2DepositAmount).eq(L2EthBalance))



}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });