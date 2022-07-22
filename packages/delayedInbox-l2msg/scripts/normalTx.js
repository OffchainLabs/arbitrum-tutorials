const { providers, Wallet } = require('ethers')
const hre = require('hardhat')
const ethers = require('ethers')
const { hexDataLength } = require('@ethersproject/bytes')
const { L1ToL2MessageGasEstimator} = require('@arbitrum/sdk/dist/lib/message/L1ToL2MessageGasEstimator')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const { L1TransactionReceipt, L1ToL2MessageStatus, getL2Network } = require('@arbitrum/sdk-nitro')
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC', 'INBOX_ADDR'])

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */
const walletPrivateKey = process.env.DEVNET_PRIVKEY

const L2MSG_signedTx = 4;

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
const l2Wallet = new Wallet(walletPrivateKey, l2Provider)
const main = async () => {
    await arbLog('DelayedInbox normal L2MSG_signedTx')

    /**
     * We deploy greeter to L2, to see if delayed inbox tx can be executed as we thought
     */
    const L2Greeter = await (
        await hre.ethers.getContractFactory('Greeter')
    ).connect(l2Wallet)


    console.log('Deploying Greeter on L2 👋👋')

    const l2Greeter = await L2Greeter.deploy(
        'Hello world'
    )
    await l2Greeter.deployed()
    console.log(`deployed to ${l2Greeter.address}`)

    /**
     * Let's log the L2 greeting string
     */
    const currentL2Greeting = await l2Greeter.greet()
    console.log(`Current L2 greeting: "${currentL2Greeting}"`)

    console.log(`Now we send a l2 tx through l1 delayed inbox (Please don't send any tx on l2 using ${l2Wallet.address}):`)

    /**
     * Here we have a new greeting message that we want to set as the L2 greeting; we'll be setting it by sending it as a message from delayed inbox!!!
     */
    const newGreeting = 'Greeting from delayedInbox'

    const GreeterIface = l2Greeter.interface;

    

    const calldatal2 = GreeterIface.encodeFunctionData("setGreeting", [
        newGreeting
    ])

    /**
     * Encode the l2's signed tx so this tx can be executed on l2
     */
    const l1GasPrice = await l2Provider.getGasPrice()
    let transactionl2Request = {
        data: calldatal2,
        to: l2Greeter.address,
        nonce: await l2Wallet.getTransactionCount(),
        value: 0,
        gasPrice: gasPrice,
        chainId: (await l2Provider.getNetwork()).chainId,
        from: l2Wallet.address
    };
    const l2GasLimit = await l2Provider.estimateGas(transactionl2Request)

    transactionl2Request.gasLimit = gasLimitL2

    const l2Balance = await l2Provider.getBalance(l2Wallet.address)

    /**
     * We need to check if the sender has enough funds on l2 to pay the gas fee
     */
    if(l2Balance.lt(l1GasPrice.mul(l2GasLimit))) {
        console.log("You l2 balance is not enough to pay the gas fee, please bridge some ethers to l2.")
        return
    }

    /**
     * We need extract l2's tx hash first so we can check if this tx executed on l2 later.
     */
    const l2SignedTx = await l2Wallet.signTransaction(transactionl2Request);

    const l2Txhash = ethers.utils.parseTransaction(l2SignedTx).hash

    /**
     * Pack the message data to parse to delayed inbox
     */
    const sendData = ethers.utils.solidityPack(["uint8","bytes"],[ethers.utils.hexlify(L2MSG_signedTx),l2SignedTx]);
    console.log("Now we get the send data: " + sendData)
    
    /**
     * Process the l1 delayed inbox tx, to process it, we need to have delayed inbox's abi and use it to encode the
     * function call data.
     */
     const ABI = ['function sendL2Message(bytes calldata messageData) external returns(uint256)']
     const iface = new ethers.utils.Interface(ABI)
     const calldatal1 = iface.encodeFunctionData('sendL2Message', [sendData])

     let transactionl1Request = {
        data: calldatal1,
        to: process.env.INBOX_ADDR,
        nonce: await l1Wallet.getTransactionCount(),
        value: 0,
        gasPrice: await l1Provider.getGasPrice(),
        chainId: (await l1Provider.getNetwork()).chainId,
        from: l1Wallet.address
    };

    const l1GasLimit = await l1Provider.estimateGas(transactionl1Request)

    transactionl1Request.gasLimit = l1GasLimit

    const resultsL1 = await l1Wallet.sendTransaction(transactionl1Request)


    
    const inboxRec = await resultsL1.wait()

    console.log(
        `Greeting txn confirmed on L1! 🙌 ${inboxRec.transactionHash}`
    )

    /**
     * Now we successfully send the tx to l1 delayed inbox, then we need to wait the tx executed on l2
     */
    console.log(
        `Now we need to wait tx: ${l2Txhash} to be included on l2 (may takes 5 minutes) ....... `
    )

    const l2TxReceipt = await l2Provider.waitForTransaction(l2Txhash);

    
    
    const status = l2TxReceipt.status
    if(status == true) {
        console.log(
            `L2 txn executed!!! 🥳 `
        )
    } else {
        console.log(
            `L2 txn failed, see if your gas is enough?`
        )
        return
    }
    
    /**
     * Now when we call greet again, we should see our new string on L2!
     */
    const newGreetingL2 = await l2Greeter.greet()
    console.log(`Updated L2 greeting: "${newGreetingL2}"`)
    console.log('✌️')
}

main()
.then(() => process.exit(0))
.catch(error => {
    console.error(error)
    process.exit(1)
})
