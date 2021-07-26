const { utils, providers, Wallet } = require('ethers')
const { expect } = require('chai')
const { Bridge } = require('arb-ts')
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
    * Call the withdrawETH() frunction from the Bridge 
    * Pass the amount of ETH to be withdrawn (in wei)
    */

    const withdrawTx = await bridge.withdrawETH(ethFromL2WithdrawAmount)
    const rec = await withdrawTx.wait()
    expect(rec.status).to.equal(1)
    console.warn('withdraw L2 receipt is:', rec.transactionHash)
    
    /**
    * Below, we run some proper checks to make sure the L2 side of the withdrawETH tx is confirmed
    * Here we get the L2ToL1Transaction event that was emitted by ArbSys.sendTxToL1 when bridge.withdrawETH was called
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
