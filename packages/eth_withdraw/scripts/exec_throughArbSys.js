const { utils, providers, Wallet } = require('ethers')
const { expect } = require('chai')
const { ArbSys__factory,  Bridge } = require('arb-ts')
const { parseEther } = utils

require('dotenv').config();


const wait = (ms = 0) => {
    return new Promise(res => setTimeout(res, ms || 0))
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
    * To deposit ETH from L2 directly through the ArbSys, we first create an instance of this contract
    */
    const arbSys = ArbSys__factory.connect(process.env.ARBSYS_ADDR, l2Wallet)

    /**
    * As pointed in the readme, ETh withdrawals can be done by calling either of the following functions from the ArbSys contract:
    * 1- withdrawEth(address destination) and 2-sendTxToL1(address destination, bytes calldata calldataForL1)
    * Here we try both, feel free to choose between the two option and Don't forget the other one.
    */


    // // 1- Option #1: Withdrawing ETH using Arbsys.withdrawEth():

    // /**
    // * Call the withdrawEth() frunction from the ArbSys contract
    // * Pass the l1Wallet.address as argument:  recipient address on L1
    // * Note that this is a convenience function, which is equivalent to calling sendTxToL1 with empty calldataForL1 (Option #2)
    // */

    // const withdrawTx = await arbSys.withdrawEth(l1Wallet.address, { value: ethFromL2WithdrawAmount })
    // const rec = await withdrawTx.wait()
    // expect(rec.status).to.equal(1)
    // console.warn('withdraw L2 receipt is:', rec.transactionHash)

    // /**
    // * Below, we run some proper checks to make sure the L2 side of the withdrawEth tx is confirmed
    // * Here we get the L2ToL1Transaction event that was emitted by ArbSys.withdrawEth
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
    // )

    // 2- Option #2: Withdrawing ETH using Arbsys.sendTxToL1():
           
    /**
    * Call the sendTxToL1() frunction from the ArbSys contract
    * Pass (1) the l1Wallet.address as argument:  recipient address on L1 plus (2) empty calldata for L1 contract call
    * Note that this is a convenience function, which is equivalent to calling sendTxToL1 with empty calldataForL1 (Option #2)
    */
    const withdrawTx = await arbSys.sendTxToL1(l1Wallet.address, "0x", {value: ethFromL2WithdrawAmount});
    const rec = await withdrawTx.wait()
    expect(rec.status).to.equal(1)
    console.warn('withdraw L2 receipt is:', rec.transactionHash)

    /**
    * Below, we run some proper checks to make sure the L2 side of the sendTxToL1 tx is confirmed
    * Here we get the L2ToL1Transaction event that was emitted by ArbSys.sendTxToL1
    * If this event exists, it means the withfraw tx has been fully excuted
    */
    const withdrawEventData = (await bridge.getWithdrawalsInL2Transaction(rec))[0]
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
