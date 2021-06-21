const {utils, providers, Wallet} = require("ethers");
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
    const initialWalletEth2Balance = await l2Provider.getBalance(l2Wallet.address)
    const ethToL2DepositAmount = parseEther('0.0001')
    bridge = await Bridge.init(preFundedWallet, l2Wallet)



    const L1Deposit = await (await ethers.getContractFactory('Deposit')).connect(preFundedWallet)
    const l1Deposit = await L1Deposit.deploy(process.env.INBOX_ADDR)
    console.log("Deploying Deposit contract to L1")
    await l1Deposit.deployed()
    console.log(`Deposit contract is deployed to ${l1Deposit.address}`)

    


    const depositTx = await l1Deposit.depositEther(1000000000, {value: ethToL2DepositAmount});
    const rec = await depositTx.wait()
    console.warn(
        'deposit L1 receipt',
        rec.transactionHash
    )

    // const seqNumArr = await bridge.getInboxSeqNumFromContractTransaction(rec)
    // if (seqNumArr === undefined) {
    //   throw new Error('no seq num')
    // }
    // expect(seqNumArr.length).to.exist
    

    // const seqNum = seqNumArr[0]
    // const l2TxHash = await bridge.calculateL2TransactionHash(seqNum)
    // console.log('l2TxHash: ' + l2TxHash)

    // console.log('waiting for l2 transaction:')
    // const l2TxnRec = await l2Provider.waitForTransaction(
    //   l2TxHash,
    //   undefined,
    //   1000 * 60 * 12
    // )
    // console.log('l2 transaction found!')
    // expect(l2TxnRec.status).to.equal(1)

    
        
    



    // let testWalletL2EthBalance;
    // //L2 address has expected balance after deposit eth
    // for (let i = 0; i < 60; i++) {
    //     console.log('balance check attempt ' + (i + 1))
    //     await wait(5000)
    //     testWalletL2EthBalance = await l2Provider.getAndUpdateL2EthBalance()
    //     if (!initialWalletEth2Balance.eq(testWalletL2EthBalance)) {
    //         console.log(
    //           `balance updated! ${initialWalletEth2Balance.toString()} ${testWalletL2EthBalance.toString()}`
    //         )
    //         break
    //       }
    //     }
    
    // expect(testWalletL2EthBalance.gte(initialWalletEth2Balance)).to.be.true

    // updatedWalletEth2Balance = await l2Provider.getBalance(l2Wallet.address)
    // expect(initialWalletEth2Balance.add(ethToL2DepositAmount).eq(updatedWalletEth2Balance))


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 