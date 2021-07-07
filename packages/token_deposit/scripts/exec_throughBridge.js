const { expect } = require("chai");
const { BigNumber, utils, providers, Wallet } = require("ethers");
const { ethers } = require("hardhat");
const { Bridge  } = require("arb-ts"); 




require('dotenv').config();

const main = async () => {

    const wait = (ms = 0) => {
        return new Promise(res => setTimeout(res, ms || 10000))
    }


    const infuraKey = process.env.INFURA_KEY
    if(!infuraKey) throw new Error("No INFURA_KEY set.")

    const walletPrivateKey = process.env.DEVNET_PRIVKEY
    if(!walletPrivateKey) throw new Error("No DEVNET_PRIVKEY set.")

    const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
    const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

    const preFundedWallet = new Wallet(walletPrivateKey, l1Provider)
    const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

    const tokenDepositAmount = BigNumber.from(50)
    bridge = await Bridge.init(preFundedWallet, l2Wallet)

 
    const L1DappToken = await (await ethers.getContractFactory('DappToken')).connect(preFundedWallet)
    console.log("Deploying DappToken to L1")
    
    const l1DappToken = await L1DappToken.deploy(1000000000000000)
    await l1DappToken.deployed()
    console.log(`DappToken deployed to ${l1DappToken.address}`)

    const bal = await l1DappToken.balanceOf(preFundedWallet.address)
    expect(bal.eq(BigNumber.from(1000000000000000))).to.be.true

    const erc20Address = l1DappToken.address;


    const data = await bridge.getAndUpdateL1TokenData(erc20Address)
    const preFundedWallettBal = data.ERC20 && data.ERC20.balance
    expect(preFundedWallettBal && preFundedWallettBal.eq(BigNumber.from(1000000000000000))).to.be.true
//************************************************************************************ 
    //approve token for bridge contract
    const approveTx = await bridge.approveToken(erc20Address)
    const approveRec = await approveTx.wait()
    expect(approveRec.status).to.equal(1)


    const data2 = await bridge.getAndUpdateL1TokenData(erc20Address)
    const allowed = data2.ERC20 && data2.ERC20.allowed
    expect(allowed).to.be.true
//************************************************************************************ 

    const expectedL1GatewayAddress = await bridge.l1Bridge.getGatewayAddress(l1DappToken.address)
    const initialBridgeTokenBalance = await l1DappToken.balanceOf(expectedL1GatewayAddress)

    const depositRes = await bridge.deposit(erc20Address,tokenDepositAmount)

    const depositRec = await depositRes.wait()

    const seqNumArr = await bridge.getInboxSeqNumFromContractTransaction(depositRec)
    if (seqNumArr === undefined) {
      throw new Error('no seq num')
    }
    expect(seqNumArr.length).to.exist
    

    const seqNum = seqNumArr[0]
    const l2TxHash = await bridge.calculateL2TransactionHash(seqNum)
    console.log('l2TxHash: ' + l2TxHash)

    console.log('waiting for l2 transaction:')
    const l2TxnRec = await l2Provider.waitForTransaction(
      l2TxHash,
      undefined,
      1000 * 60 * 12
    )
    console.log('l2 transaction found!')
    expect(l2TxnRec.status).to.equal(1)


    const finalBridgeTokenBalance = await l1DappToken.balanceOf(expectedL1GatewayAddress)

    expect(initialBridgeTokenBalance.add(tokenDepositAmount).eq(finalBridgeTokenBalance)).to.be.true
    const l2Data = await bridge.getAndUpdateL2TokenData(erc20Address)

    const testWalletL2Balance = l2Data && l2Data.ERC20 && l2Data.ERC20.balance

    expect(testWalletL2Balance && testWalletL2Balance.eq(tokenDepositAmount)).to .be.true












}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
