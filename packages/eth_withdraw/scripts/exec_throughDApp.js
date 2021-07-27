const { utils, providers, Wallet } = require('ethers')
const { ethers } = require('hardhat')
const { Bridge } = require('arb-ts')
const { expect } = require('chai')
const { parseEther } = utils

require('dotenv').config()
const wait = (ms = 0) => {
    return new Promise(res => setTimeout(res, ms || 1000))
}

/**
* Set up: instantiate L1 / L2 wallets connected to providers
*/
const infuraKey = process.env.INFURA_KEY
if (!infuraKey) throw new Error('No INFURA_KEY set.')

const walletPrivateKey = process.env.DEVNET_PRIVKEY
if (!walletPrivateKey) throw new Error('No DEVNET_PRIVKEY set.')

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

/**
* Set the amount to be withdrawn from L2 (in wei)
*/
const ethFromL2WithdrawAmount = parseEther('0.00001')

const main = async () => {

    /**
    * Use wallets to create an arb-ts bridge instance
    * We'll use bridge for its convenience methods around withdrawing ETH from L2
    */
     const bridge = await Bridge.init(l1Wallet, l2Wallet)

     /**
     * First, let's check the l2Wallet initial ETH balance (befor withdraw tx)
     */
     const l2WalletInitialEthBalance = await bridge.getL2EthBalance()

    /**
    * First, we have to depoly the Withdraw contract to L2
    */

    const L2Withdraw = await ( await ethers.getContractFactory('Withdraw')).connect(l2Wallet)
    const l2Withdraw = await L2Withdraw.deploy()
    console.log('Deploying Withdraw contract to L2')
    await l2Withdraw.deployed()
    console.log(`The address of the Withdraw contract is: ${l2Withdraw.address}`)


    /**
    * As pointed in the readme, ETh withdrawals can be done by calling either of the following functions from the ArbSys contract
    * The Withdraw contract contains 2 functions 1- withdrawEth(address destination) and 2-sendTxToL1(address destination, bytes calldata calldataForL1) that facilitates the ETH withdrawals for us
    * Here we try both, feel free to choose between the two option and Don't forget the other one.
    */

    // // 1- Option #1: Withdrawing ETH using sendTxToL1(address _destAddress, bytes calldata _calldataForL1):


    // /**
    // * Call the sendTxToL1() frunction from the Withdraw contract
    // * Pass (1) the l1Wallet.address as argument:  recipient address on L1 plus (2) empty calldata for L1 contract call
    // */

    // const withdrawTx = await l2Withdraw.sendTxToL1(l1Wallet.address, '0x', { value: ethFromL2WithdrawAmount})
    // const rec = await withdrawTx.wait()
    // expect(rec.status).to.equal(1)
    // console.warn('withdraw L2 receipt is:', rec.transactionHash)


    // /**
    // * Below, we run some proper checks to make sure the L2 side of the sendTxToL1 tx is confirmed
    // * Here we get the L2ToL1Transaction event that was emitted by ArbSys.sendTxToL1
    // * If this event exists, it means the withfraw tx has been fully excuted
    // */
    // const withdrawEventData = (await bridge.getWithdrawalsInL2Transaction(rec))[0]
    // expect(withdrawEventData).to.exist
   
   
    // //Here we check if l2Wallet balance is prperly updated after withdraw ETH
    // //Note that it takes ~1 week for l1Wallet balance to be updated (once the dispute period is over)
    // wait()
    // const l2WalletUpdatedEthBalance = await bridge.getL2EthBalance()
    // expect(l2WalletUpdatedEthBalance.lt(l2WalletInitialEthBalance)).to.be.true
    // console.log(
    //     `your L2 balance is updated from ${l2WalletInitialEthBalance.toString()} to ${l2WalletUpdatedEthBalance.toString()} and your L1 balance will be updated after the dispute period!`
    //)


    // 2- Option #2: Withdrawing ETH using withdrawEth():
           
    // /**
    // * Call the withdrawEth() frunction from the Withdraw contract
    // * Pass the l1Wallet.address as argument:  recipient address on L1
    // * Note that this is a convenience function, which is equivalent to calling sendTxToL1 with empty calldataForL1 (Option #1)
    // */

    const withdrawTx = await l2Withdraw.withdrawEth(l1Wallet.address,  {value: ethFromL2WithdrawAmount})
    const rec = await withdrawTx.wait()
    expect(rec.status).to.equal(1)
    console.warn('withdraw L2 receipt is:', rec.transactionHash)
    
    /**
    * Below, we run some proper checks to make sure the L2 side of the withdrawEth tx is confirmed
    * Here we get the L2ToL1Transaction event that was emitted by ArbSys.sendTxToL1
    * If this event exists, it means the withfraw tx has been fully excuted
    */
    const withdrawEventData = ( await bridge.getWithdrawalsInL2Transaction(rec))[0]
    expect(withdrawEventData).to.exist

    //Here we check if l2Wallet balance is prperly updated after withdraw ETH
    //Note that it takes ~1 week for l1Wallet balance to be updated (once the dispute period is over)
    wait()
    const l2WalletUpdatedEthBalance = await bridge.getL2EthBalance()
    expect(l2WalletUpdatedEthBalance.lt(l2WalletInitialEthBalance)).to.be.true
    console.log(
        `your L2 balance is updated from ${l2WalletInitialEthBalance.toString()} to ${l2WalletUpdatedEthBalance.toString()} and your L1 balance will be updated after the dispute period!`
    )

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
