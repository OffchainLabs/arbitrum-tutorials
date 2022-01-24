const { ethers } = require("hardhat");
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
var assert = require('assert');
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC', "INBOX_ADDR"])



const main = async () => {
  await arbLog('Bridge peripherals layer 1 integrations')

  const maxSubmissionCost = 1
  const maxGas = 1000000000
  const gasPrice = 0

    accounts = await ethers.getSigners()
    l2Address = accounts[0].address

    TestBridge = await ethers.getContractFactory('L1GatewayTester')
    testBridge = await TestBridge.deploy()

    const Inbox = await ethers.getContractFactory('InboxMock')
    inbox = await Inbox.deploy()

    await testBridge.initialize(
      l2Address,
      accounts[0].address,
      inbox.address,
      '0x0000000000000000000000000000000000000000000000000000000000000001', // cloneable proxy hash
      accounts[0].address // beaconProxyFactory
    )
  

  //should process fast withdrawal correctly

    const Token = await ethers.getContractFactory('TestERC20')
    const token = await Token.deploy()
    // send escrowed tokens to bridge
    const tokenAmount = 100

    let data = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'bytes'],
      [maxSubmissionCost, '0x']
    )

    // router usually does this encoding part
    data = ethers.utils.defaultAbiCoder.encode(
      ['address', 'bytes'],
      [accounts[0].address, data]
    )

    await token.mint()
    await token.approve(testBridge.address, tokenAmount)
    await testBridge.outboundTransfer(
      token.address,
      accounts[0].address,
      tokenAmount,
      maxGas,
      gasPrice,
      data
    )

    // parameters used for exit
    const exitNum = 0
    const maxFee = 10
    const liquidityProof = '0x'

    const FastExitMock = await ethers.getContractFactory('FastExitMock')
    const fastExitMock = await FastExitMock.deploy()

    await fastExitMock.setFee(maxFee)

    // send tokens to liquidity provider
    const liquidityProviderBalance = 10000
    await token.transfer(fastExitMock.address, liquidityProviderBalance)

    const prevUserBalance = await token.balanceOf(accounts[0].address)

    // request liquidity from them
    const PassiveFastExitManager = await ethers.getContractFactory(
      'L1PassiveFastExitManager'
    )
    const passiveFastExitManager = await PassiveFastExitManager.deploy()

    const tradeData = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256', 'address', 'uint256', 'address', 'bytes', 'bytes'],
      [
        accounts[0].address,
        maxFee,
        fastExitMock.address,
        tokenAmount,
        token.address,
        liquidityProof,
        '0x',
      ]
    )
    // doesn't make a difference since the passive fast exit manager transfers the exit again
    const newData = "0x"
    

    await testBridge.transferExitAndCall(
      exitNum,
      accounts[0].address,
      passiveFastExitManager.address,
      newData,
      tradeData
    )

    const postUserBalance = await token.balanceOf(accounts[0].address)

    assert.equal(
      prevUserBalance.toNumber() + tokenAmount - maxFee,
      postUserBalance.toNumber(),
      'Tokens not escrowed'
    )

    await inbox.setL2ToL1Sender(l2Address)

    // withdrawal should now be sent to liquidity provider
    // const prevLPBalance = await token.balanceOf(expensiveFastExitMock[0].address)

    const inboundData = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'bytes'],
      [exitNum, '0x']
    )

    const finalizeTx = await testBridge.finalizeInboundTransfer(
      token.address,
      accounts[0].address,
      accounts[0].address,
      tokenAmount,
      inboundData
    )
    const finalizeTxReceipt = await finalizeTx.wait()

    const postLPBalance = await token.balanceOf(fastExitMock.address)

    assert.equal(
      postLPBalance.toNumber(),
      liquidityProviderBalance + maxFee,
      'Liquidity provider balance not as expected'
    )
    }
main()
  .then(() => process.exit(0))
  .catch(error => {
  console.error(error)
  process.exit(1)
})