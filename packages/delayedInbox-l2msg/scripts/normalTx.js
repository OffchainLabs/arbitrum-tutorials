const { providers, Wallet } = require('ethers')
const hre = require('hardhat')
const ethers = require('ethers')
const { hexDataLength } = require('@ethersproject/bytes')
const { L1ToL2MessageGasEstimator} = require('@arbitrum/sdk/dist/lib/message/L1ToL2MessageGasEstimator')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk')
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
     * We deploy L1 Greeter to L1, L2 greeter to L2, each with a different "greeting" message.
     * After deploying, save set each contract's counterparty's address to its state so that they can later talk to each other.
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

    console.log(`Now we send a l2 tx through l1 delayed inbox(Please don't send any tx on l2 using ${l2Wallet.address}):`)

    /**
     * Here we have a new greeting message that we want to set as the L2 greeting; we'll be setting it by sending it as a message from layer 1!!!
     */
    const newGreeting = 'Greeting from delayedInbox'

    const GreeterIface = l2Greeter.interface;

    

    const calldatal2 = GreeterIface.encodeFunctionData("setGreeting", [
        newGreeting
    ])



    let transactionl2Request = {
        data: calldatal2,
        to: l2Greeter.address,
        nonce: await l2Wallet.getTransactionCount(),
        value: 0,
        gasPrice: await l2Provider.getGasPrice(),
        chainId: (await l2Provider.getNetwork()).chainId,
        from: l2Wallet.address
    };
    const gasLimitL2 = await l2Provider.estimateGas(transactionl2Request)

    transactionl2Request.gasLimit = gasLimitL2

    let signedTx = await l2Wallet.signTransaction(transactionl2Request);
    let sendData = ethers.utils.solidityPack(["uint8","bytes"],[ethers.utils.hexlify(L2MSG_signedTx),signedTx]);
    console.log("Now we get the send data: " + sendData)
    /**
     * To send an L1-to-L2 message (aka a "retryable ticket"), we need to send ether from L1 to pay for the txn costs on L2.
     * There are two costs we need to account for: base submission cost and cost of L2 execution. We'll start with base submission cost.
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

    const gasLimit1 = await l1Provider.estimateGas(transactionl1Request)

    transactionl1Request.gasLimit = gasLimit1

    let resultsL1 = await l1Wallet.sendTransaction(transactionl1Request)


    
    const inboxRec = await resultsL1.wait()

    console.log(
        `Greeting txn confirmed on L1! 🙌 ${inboxRec.transactionHash}`
    )

    // const l1TxReceipt = new L1TransactionReceipt(inboxRec)

    // /**
    //  * In principle, a single L1 txn can trigger any number of L1-to-L2 messages (each with its own sequencer number).
    //  * In this case, we know our txn triggered only one
    //  * Here, We check if our L1 to L2 message is redeemed on L2
    //  */
    // const message = await l1TxReceipt.getL1ToL2Message(l2Wallet)
    // const status = await message.waitForStatus()
    // console.log(status)
    // if (status === L1ToL2MessageStatus.REDEEMED) {
    //     console.log(`L2 txn executed 🥳 ${message.l2TxHash}`)
    // } else {
    //     console.log(
    //     `L2 retryable txn failed with status ${L1ToL2MessageStatus[status]}`
    //     )
    // }

    // /**
    //  * Note that during L2 execution, a retryable's sender address is transformed to its L2 alias.
    //  * Thus, when GreeterL2 checks that the message came from the L1, we check that the sender is this L2 Alias.
    //  * See setGreeting in GreeterL2.sol for this check.
    //  */

    // /**
    //  * Now when we call greet again, we should see our new string on L2!
    //  */
    // const newGreetingL2 = await l2Greeter.greet()
    // console.log(`Updated L2 greeting: "${newGreetingL2}"`)
    // console.log('✌️')
}

main()
.then(() => process.exit(0))
.catch(error => {
    console.error(error)
    process.exit(1)
})
