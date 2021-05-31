const { expect } = require("chai");
const { BigNumber, utils, providers, Wallet } = require("ethers");
const { ethers } = require("hardhat");
const { Bridge, StandardArbERC20__factory  } = require("arb-ts") 




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


    const bridge = new Bridge(
        process.env.L1EthErc20BridgeAddress,
        process.env.L2ArbTokenBridgeAddress,
        preFundedWallet,
        l2Wallet
    )

      

 
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
    const approvetx = await bridge.approveToken(erc20Address)
    const rec = await approvetx.wait()
    expect(rec.status).to.equal(1)
    
    const data2 = await bridge.getAndUpdateL1TokenData(erc20Address)
    const allowed = data2.ERC20 && data2.ERC20.allowed
    expect(allowed).to.be.true
//************************************************************************************ 

    //initial erc20 deposit txns — L1 and L2 — both succeed
    const initialBridgeTokenBalance = await l1DappToken.balanceOf(bridge.ethERC20Bridge.address)
    const l1gasPrice = utils.parseUnits('10', 'gwei')
    const tokenDepositAmount = BigNumber.from(50)

    const depositTx = await bridge.deposit(
        erc20Address,
        tokenDepositAmount,
        BigNumber.from(10000000000000),
        BigNumber.from(0),
        undefined,
        { gasLimit: 210000, gasPrice: l1gasPrice }
    )

    const depositRec = await depositTx.wait()
    await wait()

    expect(depositRec.status).to.equal(1)



    const finalBridgeTokenBalance = await l1DappToken.balanceOf(bridge.ethERC20Bridge.address)
    expect(initialBridgeTokenBalance.add(tokenDepositAmount).eq(finalBridgeTokenBalance))

    const tokenDepositData = (await bridge.getDepositTokenEventData(depositRec))[0] 
    const seqNum = tokenDepositData.seqNum
    const l2RetryableHash = await bridge.calculateL2RetryableTransactionHash(seqNum)
    const retryableReceipt = await l2Provider.waitForTransaction(l2RetryableHash) //TOOK a DAY!
    expect(retryableReceipt.status).to.equal(1)







}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
