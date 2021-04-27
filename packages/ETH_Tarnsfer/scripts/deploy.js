const hre = require("hardhat");
const ethers = require("ethers");
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


    const L1Payment = await (await hre.ethers.getContractFactory('Payment')).connect(l1Signer)
    
    console.log("Deploying L1")
    
    const l1Payment = await L1Payment.deploy(inboxAddr)
    await l1Payment.deployed()
    console.log(`deployed to ${l1Payment.address}`)

    


    await l1Payment.depositEther(signer.address, {value: 100});
    console.log("ETH has been assigned to", signer.address)


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
