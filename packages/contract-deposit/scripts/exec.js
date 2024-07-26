const { providers, Wallet } = require('ethers')
const { BigNumber } = require('@ethersproject/bignumber')
const hre = require('hardhat')
const ethers = require('ethers')
const {
  L1ToL2MessageGasEstimator,
} = require('@arbitrum/sdk/dist/lib/message/L1ToL2MessageGasEstimator')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
const {
  L1TransactionReceipt,
  L1ToL2MessageStatus,
  EthBridger,
  getL2Network,
  addDefaultLocalNetwork,
  Address,
  EthDepositStatus,
} = require('@arbitrum/sdk')
const {
  L1EthDepositTransactionReceipt,
} = require('@arbitrum/sdk/dist/lib/message/L1Transaction')
const { getBaseFee } = require('@arbitrum/sdk/dist/lib/utils/lib')
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */
const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const l1Wallet = new Wallet(walletPrivateKey, l1Provider)
const l2Wallet = new Wallet(walletPrivateKey, l2Provider)

if (!process.env.TransferTo) {
  throw new Error('Please set TransferTo in .env')
}

const transferTo = process.env.TransferTo

const main = async () => {
  await arbLog('Contract Cross-chain depositer')

  /**
   * Add the default local network configuration to the SDK
   * to allow this script to run on a local node
   */
  addDefaultLocalNetwork()

  /**
   * Use l2Network to create an Arbitrum SDK EthBridger instance
   * We'll use EthBridger to retrieve the Inbox address
   */

  const l2Network = await getL2Network(l2Provider)
  const ethBridger = new EthBridger(l2Network)
  const inboxAddress = ethBridger.l2Network.ethBridge.inbox

  /**
   * We deploy EthDeposit contract to L1 first and send eth to l2 via this contract,
   * the funds will deposit to the contract's alias address first.
   */
  const L1DepositContract = await (
    await hre.ethers.getContractFactory('EthDeposit')
  ).connect(l1Wallet)
  console.log('Deploying EthDeposit contract...')
  const l1DepositContract = await L1DepositContract.deploy(inboxAddress)
  await l1DepositContract.deployed()
  console.log(`deployed to ${l1DepositContract.address}`)

  /**
   * This sdk class will help we to get the alias address of the contract
   */
  const contractAddress = new Address(l1DepositContract.address)
  const contractAliasAddress = contractAddress.applyAlias().value

  console.log(`Sending deposit transaction...`)

  const ethDepositTx = await l1DepositContract.depositToL2({
    value: ethers.utils.parseEther('0.01'),
  })
  const ethDepositRec = await ethDepositTx.wait()

  console.log(
    `Deposit txn confirmed on L1! 🙌 ${ethDepositRec.transactionHash}`
  )

  console.log(
    'Waiting for the L2 execution of the deposit. This may take up to 10-15 minutes ⏰'
  )

  const l1DepositTxReceipt = new L1EthDepositTransactionReceipt(ethDepositRec)
  const l2DepositResult = await l1DepositTxReceipt.waitForL2(l2Provider)

  /**
   * If deposit success, check the alias address' balance.
   * If deposit failed, throw an error.
   */
  if (l2DepositResult.complete) {
    console.log(
      `Deposit to L2 is complete, the L2 tx hash is ${l2DepositResult.l2TxReceipt.transactionHash}`
    )
    const beforeAliasBalance = await l2Provider.getBalance(contractAliasAddress)
    console.log(
      `The balance on l2 alias before transfer: "${ethers.utils.formatEther(
        beforeAliasBalance
      )} ethers"`
    )
  } else {
    throw new Error(
      `Deposit to L2 failed, EthDepositStatus is ${
        EthDepositStatus[l2DepositResult.message.status]
      }`
    )
  }

  console.log(
    'Creating retryable ticket to send txn on l2 to transfer funds...'
  )

  /**
   * Now we can query the required gas params using the estimateAll method in Arbitrum SDK
   */
  const l1ToL2MessageGasEstimate = new L1ToL2MessageGasEstimator(l2Provider)

  /**
   * Users can override the estimated gas params when sending an L1-L2 message
   * Note that this is totally optional
   * Here we include and example for how to provide these overriding values
   */
  const RetryablesGasOverrides = {
    gasLimit: {
      base: undefined, // when undefined, the value will be estimated from rpc
      min: BigNumber.from(10000), // set a minimum gas limit, using 10000 as an example
      percentIncrease: BigNumber.from(30), // how much to increase the base for buffer
    },
    maxSubmissionFee: {
      base: undefined,
      percentIncrease: BigNumber.from(30),
    },
    maxFeePerGas: {
      base: undefined,
      percentIncrease: BigNumber.from(30),
    },
  }

  /**
   * The estimateAll method gives us the following values for sending an L1->L2 message
   * (1) maxSubmissionCost: The maximum cost to be paid for submitting the transaction
   * (2) gasLimit: The L2 gas limit
   * (3) deposit: The total amount to deposit on L1 to cover L2 gas and L2 call value
   */
  const L1ToL2MessageGasParams = await l1ToL2MessageGasEstimate.estimateAll(
    {
      from: contractAliasAddress,
      to: transferTo,
      l2CallValue: ethers.utils.parseEther('0.01'), // because we deposited 0.01 ether, so we also transfer 0.01 ether out here.
      excessFeeRefundAddress: l1DepositContract.address,
      callValueRefundAddress: l1DepositContract.address,
      data: [],
    },
    await getBaseFee(l1Provider),
    l1Provider,
    RetryablesGasOverrides //if provided, it will override the estimated values. Note that providing "RetryablesGasOverrides" is totally optional.
  )
  console.log(
    `Current retryable base submission price is: ${ethers.utils.formatEther(
      L1ToL2MessageGasParams.maxSubmissionCost.toString()
    )} ethers`
  )

  /**
   * For the L2 gas price, we simply query it from the L2 provider, as we would when using L1.
   */
  const gasPriceBid = await l2Provider.getGasPrice()
  console.log(
    `L2 gas price: ${ethers.utils.formatUnits(
      gasPriceBid.toString(),
      'gwei'
    )} gwei`
  )

  /**
   * Because L1ToL2MessageGasParams.deposit add the l2 callvalue to estimate,
   * we need to sub it here so l1 tx won't pay l2callvalue and it will use the
   * alias balance on l2 directly.
   */
  const depositAmount = L1ToL2MessageGasParams.deposit.sub(
    ethers.utils.parseEther('0.01')
  )

  console.log(
    `Transfer funds txn needs ${ethers.utils.formatEther(
      depositAmount
    )} ethers callValue for L2 fees`
  )

  /**
   * Call the contract's method to transfer the funds from the alias to the address you set
   */
  const setTransferTx =
    await l1DepositContract.moveFundsFromL2AliasToAnotherAddress(
      transferTo,
      ethers.utils.parseEther('0.01'), // because we deposited 0.01 ether, so we also transfer 0.01 ether out here.
      L1ToL2MessageGasParams.maxSubmissionCost,
      L1ToL2MessageGasParams.gasLimit,
      gasPriceBid,
      {
        value: depositAmount,
      }
    )
  const setTransferRec = await setTransferTx.wait()

  console.log(
    `Transfer funds txn confirmed on L1! 🙌 ${setTransferRec.transactionHash}`
  )

  const l1TransferTxReceipt = new L1TransactionReceipt(setTransferRec)

  /**
   * In principle, a single L1 txn can trigger any number of L1-to-L2 messages (each with its own sequencer number).
   * In this case, we know our txn triggered only one
   * Here, We check if our L1 to L2 message is redeemed on L2
   */
  const messages = await l1TransferTxReceipt.getL1ToL2Messages(l2Wallet)
  const message = messages[0]
  console.log(
    'Waiting for the L2 execution of the transaction. This may take up to 10-15 minutes ⏰'
  )
  const messageResult = await message.waitForStatus()
  const status = messageResult.status
  if (status === L1ToL2MessageStatus.REDEEMED) {
    console.log(
      `L2 retryable ticket is executed 🥳 ${messageResult.l2TxReceipt.transactionHash}`
    )
  } else {
    throw new Error(
      `L2 retryable ticket is failed with status ${L1ToL2MessageStatus[status]}`
    )
  }

  /**
   * Now when we get the balance again, we should see the funds transferred to the address you set
   */
  const afterAliasBalance = await l2Provider.getBalance(contractAliasAddress)
  const balanceOnTransferTo = await l2Provider.getBalance(transferTo)
  console.log(
    `The current balance on l2 alias: "${ethers.utils.formatEther(
      afterAliasBalance
    )} ethers"`
  )
  console.log(
    `The current balance on l2 address you set: "${ethers.utils.formatEther(
      balanceOnTransferTo
    )} ethers"`
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
