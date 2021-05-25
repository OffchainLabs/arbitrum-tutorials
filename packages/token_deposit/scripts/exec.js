const hre = require("hardhat");
const { expect } = require("chai");
const ethers = require("ethers");
const { BigNumber, utils } = require("ethers");
const { Bridge } = require("arb-ts") 

//require('./StandardArbERC20__factory.ts')


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

    //const testPk = utils.formatBytes32String(Math.random().toString())
    //const l1TestWallet = new Wallet(testPk, l1Provider)
    //const l2TestWallet = new Wallet(testPk, l2Provider)

    const bridge = new Bridge(
        '0x1d750369c91b129524B68f308512b0FE2C903d71',
        '0x2EEBB8EE9c377caBC476654ca4aba016ECA1B9fc',
        l1Signer,
        l2Signer
      )

      

 
    const L1DappToken = await (await hre.ethers.getContractFactory('DappToken')).connect(l1Signer)
    console.log("Deploying DappToken to L1")
    
    const l1DappToken = await L1DappToken.deploy(1000000000000000)
    await l1DappToken.deployed()
    console.log(`DappToken deployed to ${l1DappToken.address}`)

    const erc20Address = l1DappToken.address;


    //const ethrbidge = await (await hre.ethers.getContractAt("IEthERC20Bridge", ethercBridge)).connect(l1Signer); 
    
    //*********************** approve token for bridge contract ****************************// 

    const approveRes = await bridge.approveToken(erc20Address)
    const approveRec = await approveRes.wait()
    expect(approveRec.status).to.equal(1)
    
    const data = await bridge.getAndUpdateL1TokenData(erc20Address)
    const allowed = data.ERC20 && data.ERC20.allowed
    expect(allowed).to.be.true
    //**********************************************************************// 

    //*********************** initial erc20 deposit txns — L1 and L2 — both succeed ****************************// 

    //const despositRes = await bridge.deposit(erc20Address, signer.address, 50, 10000000000000,300000, 0, '0x')
    const tokenDepositAmount = BigNumber.from(50)
    const l1gasPrice = utils.parseUnits('10', 'gwei')
    const retryableDepositAmount = utils.parseEther('0.01')


    const initialBridgeTokenBalance = await l1DappToken.balanceOf(bridge.ethERC20Bridge.address)

    const depositRes = await bridge.deposit(
        
        erc20Address, 
        tokenDepositAmount,
        BigNumber.from(50000000000000),
        BigNumber.from(5000000000), 
        undefined, { gasLimit: 210000, gasPrice: l1gasPrice})
    
    

    const depositRec = await depositRes.wait()
    //console.warn('deposit rec status', depositRec.status)

    await wait()
    

    

    // expect(depositRec.status).to.equal(1)
    // const finalBridgeTokenBalance = await l1DappToken.balanceOf(
    //     bridge.ethERC20Bridge.address
    // )
    // expect(
    //   initialBridgeTokenBalance
    //     .add(tokenDepositAmount)
    //     .eq(finalBridgeTokenBalance)
    // )



    // const tokenDepositData = (
    //  await bridge.getDepositTokenEventData(depositRec))[0] 
    //   const seqNum = tokenDepositData.seqNum
  
    //   const l2RetryableHash = await bridge.calculateL2RetryableTransactionHash(seqNum)
  
    //   const retryableReceipt = await l2Provider.waitForTransaction(l2RetryableHash)
      
    //   expect(retryableReceipt.status).to.equal(1)
    

    const l2Data = await bridge.getAndUpdateL2TokenData(erc20Address)

    const testWalletL2Balance = l2Data && l2Data.ERC20 && l2Data.ERC20.balance
  
    expect(testWalletL2Balance && testWalletL2Balance.eq(tokenDepositAmount)).to.be.true
    
    //const erc20L2Address = await bridge.getERC20L2Address(erc20Address)

    //const ArbERC20 = await (await hre.ethers.getContractAt("IStandardArbERC20", erc20L2Address)).connect(l2Provider);
    //const arbERC20 = await ArbERC20.attach(erc20L2Address)
    //const arbERC20 = StandardArbERC20__factory.connect(
      //erc20L2Address,
      //l2Provider
    //)
    //const balance = await arbERC20.balanceOf(signer.address)
   // expect(balance.eq(tokenDepositAmount)).to.be.true


    
    
    //const ArbERC20 = await (await hre.ethers.getContractFactory("IStandardArbERC20")).connect(l2Provider);
    //const arbERC20 = await ArbERC20.attach(erc20L2Address)

// Now you can call functions of the contract

    //const arbERC20 = await (await hre.ethers.getContract("IStandardArbERC20", erc20L2Address)).connect(l2Provider);
    //const arbERC20 = await ArbERC20.attach(erc20L2Address)

    //const arbERC20 = await (await hre.ethers.getContractAt("IStandardArbERC20", erc20L2Address)).connect(l2Signer); 
  
   
    //const l2Code = await l2Provider.getCode(erc20L2Address)
    //expect(l2Code.length > 2).to.be.true

  


    //**********************************************************************// 





















   
    

    //await l1DappToken.connect(l1Signer).approve(ethrbidge.address, 1000);

    //await wait()
    //await wait()
    
    //const allowance = await l1DappToken.allowance(l1Signer.address, ethrbidge.address);
    //console.log("allowance", allowance.toNumber())
    
    //await ethrbidge.deposit(TokenL1Add, signer.address, 100, 10000000, 50000000, 5, '0x');


    //const TokenL2Add = await ethrbidge.calculateL2TokenAddress(TokenL1Add);
    //console.log("Token L2 address", TokenL2Add)



    //const L2DappToken = await (await hre.ethers.getContractFactory('DappToken')).connect(l2Signer)
    //const l2DappToken = await L2DappToken.attach(TokenL2Add);

   // const L2balance = await l2DappToken.balanceOf(signer.address);
    //console.log("Token balance L2", balance2.toNumber())


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
