const { utils, providers, Wallet } = require('ethers')
const { Bridge } = require('arb-ts')
const { expect } = require('chai')
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
* Set the amount to be depositted in L2 (in wei)
*/
const ethToL2DepositAmount = parseEther('0.0001')


const main = async () => {

    /**
    * Use wallets to create an arb-ts bridge instance
    * We'll use bridge for its convenience methods around depsotting ETH to L2
    */
    const bridge = await Bridge.init(l1Wallet, l2Wallet)
    
    /**
    * First, let's check the l2Wallet initial ETH balance (befor deposit tx)
    */
    const l2WalletInitialEthBalance = await bridge.getL2EthBalance()
    
    /**
    * Deposit ether from L1 to L2 
    */
    const depositTx = await bridge.depositETH(ethToL2DepositAmount)
    const rec = await depositTx.wait()
    console.warn("deposit L1 receipt is:", rec.transactionHash)
    expect(rec.status).to.equal(1)


    /**
    * Below, we run some proper checks to make sure the L2 side of the depsitETH tx is also confirmed
    * First, we get the depositETH tx corresponding inbox sequence number
    */

    const seqNumArr = await bridge.getInboxSeqNumFromContractTransaction(rec)
    if (seqNumArr === undefined) {
        throw new Error('no seq num')
    }
    expect(seqNumArr.length).to.exist
    console.log("corresponding inbox sequence number is found!")
    const seqNum = seqNumArr[0]

    /**
    * Now, we get the hash of the L2 txn from corresponding inbox sequence number
    */

    const l2TxHash = await bridge.calculateL2TransactionHash(seqNum)
    console.log("l2TxHash is: " + l2TxHash)

    /**
    * Here we'll do a period check until the retryable ticket is executed on L2
    */
    console.log("Waiting for l2 transaction:")
    const l2TxnRec = await l2Provider.waitForTransaction(
        l2TxHash,
        undefined,
        1000 * 60 * 12
    )
    console.log("L2 transaction found!")
    expect(l2TxnRec.status).to.equal(1)

    /**
    * Now we check if the l2Wallet has been updated or not
    * To do so, need to make sure the L2 side if the depositTH tx is confirmed! (It can only be confirmed after he dispute period; Arbitrum is an optimistic rollup after-all)
    * Here we'll do a period check until the l2Wallet balance is updated.
    */

    let l2WalletUpdatedEthBalance;

    for (let i = 0; i < 60; i++) {
        console.log("L2 balance check attempt " + (i + 1))
        await wait(5000)

        l2WalletUpdatedEthBalance = await bridge.getL2EthBalance()
        if (!l2WalletInitialEthBalance.eq(l2WalletUpdatedEthBalance)) {
        console.log(
            `your L2 balance is updated from ${l2WalletInitialEthBalance.toString()} to ${l2WalletUpdatedEthBalance.toString()}`
        )
        break
        }
    }
    /**
    * We can also do extra check and see if the updated is equal to l2WalletInitialEthBalance + ethToL2DepositAmount
    */
    expect(l2WalletInitialEthBalance.add(ethToL2DepositAmount).eq(l2WalletUpdatedEthBalance))
    console.log("your L2 balance is properly updated!")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
})
