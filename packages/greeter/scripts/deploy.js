const hre = require("hardhat");
const ethers = require("ethers");
const { Bridge } = require("arb-ts");
const inboxAddr = "0xD71d47AD1b63981E9dB8e4A78C0b30170da8a601";

const main = async () => {
    const accounts = await hre.ethers.getSigners();

    const infuraKey = process.env.INFURA_KEY
    if(!infuraKey) throw new Error("No INFURA_KEY set.")

    const walletPrivateKey = process.env.DEVNET_PRIVKEY
    if(!walletPrivateKey) throw new Error("No DEVNET_PRIVKEY set.")


    const l1Provider = new ethers.providers.JsonRpcProvider(`https://kovan.infura.io/v3/${infuraKey}`)
    const l2Provider = new ethers.providers.JsonRpcProvider(`https://kovan4.arbitrum.io/rpc`)
    const signer = new ethers.Wallet(walletPrivateKey)

    const l1Signer = signer.connect(l1Provider);
    const l2Signer = signer.connect(l2Provider)

    const bridge = new Bridge(
        "0x2948ac43e4AfF448f6af0F7a11F18Bb6062dd271",
        "0x64b92d4f02cE1b4BDE2D16B6eAEe521E27f28e07",
        l1Signer,
        l2Signer
    )

    const L1Greeter = await (await hre.ethers.getContractFactory('GreeterL1')).connect(l1Signer)
    
    console.log("Deploying L1")
    
    const l1Greeter = await L1Greeter.deploy(
      "Hello world in L1",
      "0x0000000000000000000000000000000000000000", // temp l2 addr
      inboxAddr
    )
    await l1Greeter.deployed()
    console.log(`deployed to ${l1Greeter.address}`)

    const L2Greeter = await (await hre.ethers.getContractFactory('GreeterL2')).connect(l2Signer)
    
    console.log("Deploying L2")
    
    const l2Greeter = await L2Greeter.deploy(
      "Hello world in L2",
      "0x0000000000000000000000000000000000000000", // temp l1 addr
    )
    await l2Greeter.deployed()
    console.log(`deployed to ${l2Greeter.address}`)
    
    const updateL1Tx = await l1Greeter.updateL2Target(l2Greeter.address);
    await updateL1Tx.wait()
    
    const updateL2Tx = await l2Greeter.updateL1Target(l1Greeter.address);
    await updateL2Tx.wait()

    console.log("L1 greet")
    console.log(await l1Greeter.greet())

    console.log("L2 greet")
    console.log(await l2Greeter.greet())

    console.log("Updating greeting from L1 to L2")

    // submission price
    const newGreeting = "Greeting from far, far away"
    const newGreetingBytes = ethers.utils.defaultAbiCoder.encode(['string'], [newGreeting])
    const newGreetingBytesLength = ((newGreetingBytes.length - 2) / 2 ) + 4  // 4 bytes func identifier
    const [submissionPriceWei, nextUpdateTimestamp] = await bridge.getTxnSubmissionPrice(newGreetingBytesLength)

    console.log({submissionPriceWei: submissionPriceWei.toNumber()})

    console.log("time in seconds till price update")
    const timeNow = Math.floor(new Date().getTime() / 1000)
    console.log(nextUpdateTimestamp.toNumber() - timeNow)

    const maxSubmissionCost = 0
    const maxGas = 1000000000000
    const gasPriceBid = 0
    const setGreetingTx = await l1Greeter.setGreetingInL2(
      newGreeting, // string memory _greeting,
      maxSubmissionCost,
      maxGas,
      gasPriceBid,
      {
        value: submissionPriceWei
      }
    )
    await setGreetingTx.wait()

    
    const inboxSeqNums = await bridge.getInboxSeqNumFromContractTransaction(
      await bridge.getL1Transaction(setGreetingTx.hash)
      )
      
      
      if(!inboxSeqNums || inboxSeqNums.length !== 1) throw new Error("Inbox not triggered correctly")
      
    // console.log({
    //   setGreetingTxHash: setGreetingTx.hash
    // })
    // const utils = ethers.utils
    // console.log({inboxSeqNums})
    // const chainId = ethers.BigNumber.from(l2Provider.network.chainId)
    // const reqId = utils.keccak256(
    //   utils.concat([
    //     utils.zeroPad(chainId.toHexString(), 32), // chain id
    //     utils.zeroPad(inboxSeqNums[0], 32),
    //     // utils.zeroPad(BigNumber.from(1).toHexString(), 32),
    //   ])
    // )

    // console.log({reqId})
    // const txId = utils.keccak256(
    //   utils.concat([
    //     utils.zeroPad(reqId, 32), // chain id
    //     utils.zeroPad(ethers.BigNumber.from(0), 32),
    //     // utils.zeroPad(BigNumber.from(1).toHexString(), 32),
    //   ])
    // )
    // console.log({txId})

    const l2TxHash = await bridge.calculateL2RetryableTransactionHash(inboxSeqNums[0])
    // console.log({l2TxHash})

    console.log("waiting for L2 tx")

    await l2Provider.waitForTransaction(l2TxHash)
    
    console.log("got it")


    console.log("L2 greet again")
    console.log(await l2Greeter.greet())
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
