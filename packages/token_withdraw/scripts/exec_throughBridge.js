const { BigNumber, providers, Wallet } = require('ethers')
const { ethers } = require('hardhat')
const { expect } = require('chai')
const { Bridge } = require('arb-ts')

require('dotenv').config();


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
* Set the amount of token to be deposited and then withdrawn 
*/
const tokenDepositAmount = BigNumber.from(50)
const tokenWithdrawAmount = BigNumber.from(20)

const main = async () => {

    /**
    * Use wallets to create an arb-ts bridge instance
    * We'll use bridge for its convenience methods around depositing tokens to L2
    */
    const bridge = await Bridge.init(l1Wallet, l2Wallet)
        
    /**
    * For the purpose of our tests, here we deploy an standard ERC20 token (DappToken) to L1
    * With the initial supply of 1000000000000000 
    */

    const L1DappToken = await ( await ethers.getContractFactory('DappToken')).connect(l1Wallet)
    console.log('Deploying the test DappToken to L1')   
    const l1DappToken = await L1DappToken.deploy(1000000000000000)
    await l1DappToken.deployed()
    console.log(`DappToken is deployed to ${l1DappToken.address}`)
    const erc20Address = l1DappToken.address

    /**
    * First, let's check the l1Wallet initial DappToken balance 
    */ 
    const l1WalletInitialTokenBalance = await l1DappToken.balanceOf(l1Wallet.address)
    expect(l1WalletInitialTokenBalance.eq(BigNumber.from(1000000000000000))).to.be.true
    console.log(`your l1Wallet has 1000000000000000 DappToken`)

    /**
    * Allow the Bridge to spend the DappToken
    */ 
    const approveTx = await bridge.approveToken(erc20Address)
    const approveRec = await approveTx.wait()
    expect(approveRec.status).to.equal(1)
    console.log(`you successfully allowed the Arbitrum Bridge to spend DappToken!`)


    /**
    * Deposit DappToken to L2 using Bridge
    * Call the deposit() function from the Bridge
    * Pass the L1 address of the DappToke and the amount to be deposited as arguments 
    */
    const depositTx = await bridge.deposit(erc20Address, tokenDepositAmount)
    const depositRec = await depositTx.wait()


    /**
    * Below, we run some checks to see if the deposit tx is successfully executed on L1 and L2 
    */
   
    // First, we get the inbox sequence number for the deposit receipt
    const seqNumArr = await bridge.getInboxSeqNumFromContractTransaction(depositRec)
    if (seqNumArr === undefined) { throw new Error('no seq num')}
    expect(seqNumArr.length).to.exist
    console.log(`your deposit tx is sequences inside the Inbox!`)

    //Next, get hash of the associated L2 tx from its corresponding inbox sequence number
    const seqNum = seqNumArr[0]
    const l2TxHash = await bridge.calculateL2TransactionHash(seqNum)
    console.log('the l2TxHash associated with your deposit tx is: ' + l2TxHash)

    //Now, we have to wait for the L2 tx to go through
    console.log('waiting for L2 transaction:')
    const l2TxnRec = await l2Provider.waitForTransaction
    (
    l2TxHash,
    undefined,
    1000 * 60 * 12
    )
    console.log('L2 transaction found! Your DappToken balance is updated!')
    expect(l2TxnRec.status).to.equal(1)

    /**
    * Here, we run final checks to see if the balances are properly updated
    */

    const l2Data = await bridge.getAndUpdateL2TokenData(erc20Address)
    const l2WalletTokenBalance = l2Data && l2Data.ERC20 && l2Data.ERC20.balance
    expect(l2WalletTokenBalance && l2WalletTokenBalance.eq(tokenDepositAmount)).to.be.true
    console.log( `your l2Wallet has ${l2WalletTokenBalance.toString()} DappToken now!`)
    
    
    /**
    * Now we begin withdrawing DappToken from L2
    * Withdraw DappToken from L2 using Bridge
    * Call the withdrawERC20() function from the Bridge
    * Pass the L1 address of the DappToke and the amount to be withdrawn as arguments 
    */

    const withdrawTx = await bridge.withdrawERC20( erc20Address, tokenWithdrawAmount )
    const withdrawRec = await withdrawTx.wait()
    expect(withdrawRec.status).to.equal(1)


    /**
    * Below, we run some checks to see if the withdraw tx is successfully executed on L2
    * Check if the withdraw events were emitted by withdrawERC20()
    */
    const withdrawEventData = ( await bridge.getWithdrawalsInL2Transaction(withdrawRec))[0]
    expect(withdrawEventData).to.exist


    /**
    * Here, we run final checks to see if the balances are properly updated
    */

    const l2DataAfterWithdraw = await bridge.getAndUpdateL2TokenData(erc20Address)
    const updatedL2WalletTokenBalance = l2DataAfterWithdraw && l2DataAfterWithdraw.ERC20 && l2DataAfterWithdraw.ERC20.balance
    expect(updatedL2WalletTokenBalance.add(tokenWithdrawAmount).eq(l2WalletTokenBalance))
    console.log( `your have withdrawn ${tokenWithdrawAmount.toString()} DappToken!`)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
