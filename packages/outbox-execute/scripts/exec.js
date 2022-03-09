const { providers, Wallet } = require('ethers')
const { L2TransactionReceipt, getL2Network, L2ToL1MessageStatus } = require('arb-ts')
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')

require('dotenv').config()
requireEnvVariables(['DEVNET_PRIVKEY', 'L2RPC', 'L1RPC'])

const wait = (ms = 0) => {
  return new Promise(res => setTimeout(res, ms || 10000))
}

/**
 * Set up: instantiate L1 / L2 wallets connected to providers
 */

const walletPrivateKey = process.env.DEVNET_PRIVKEY

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const l1Wallet = new Wallet(walletPrivateKey, l1Provider)

module.exports = async txnHash => {
  await arbLog('Outbox Execution')
  /**
   / * We start with a txn hash; we assume this is transaction that triggered an L2 to L1 Message on L2 (i.e., ArbSys.sendTxToL1)
  */

  if (!txnHash)
    throw new Error(
      'Provide a transaction hash of an L2 transaction that sends an L2 to L1 message'
    )
  if (!txnHash.startsWith('0x') || txnHash.trim().length != 66)
    throw new Error(`Hmm, ${txnHash} doesn't look like a txn hash...`)
  
  /**
   * First, let's find the Arbitrum txn from the txn hash provided
   */
  const receipt = await l2Provider.getTransactionReceipt(txnHash)
  const l2Receipt = new L2TransactionReceipt(receipt)

  /**
   * Note that in principle, a single transaction could trigger any number of outgoing messages; the common case will be there's only one.
   * For the sake of this script, we assume there's only one / just grad the first one.
   */
  const l2Network = await getL2Network(l2Provider)
  const messages = await l2Receipt.getL2ToL1Messages(l1Wallet, l2Network)
  const l2ToL1Msg = messages[0]


  /**
   * before we try to execute out message, we need to make sure it's confirmed! (It can only be confirmed after the dispute period; Arbitrum is an optimistic rollup after-all)
   * Here we'll do a period check; once L2ToL1MessageStatus tells us our txn is confirm, we'll move on to execution
   */

  const outgoingMessageState = await l2Receipt.status
  const timeToWaitMs = 1000 * 60
  while (outgoingMessageState !== L2ToL1MessageStatus.CONFIRMED) {
    console.log(`Message not yet confirmed; we'll wait ${timeToWaitMs / 1000} seconds and try again`)
    await wait(timeToWaitMs)
    const outgoingMessageState = await l2Receipt.status

    switch (outgoingMessageState) {
      case 0: { //NOT_FOUND
        console.log('Message not found; something strange and bad happened')
        process.exit(1)
        break
      }
      case 3: { //EXECUTED
        console.log(`Message already executed! Nothing else to do here`)
        process.exit(1)
        break
      }
      case 1: { //UNCONFIRMED
        break
      }

      default:
        break
    }
  }

  console.log('Transaction confirmed! Trying to execute now')
  
  /**
   * Now that its confirmed, we can retrieve the Merkle proof data from the chain, and execute our message in its outbox entry.
   */
  const proofInfo = await l2ToL1Msg.tryGetProof(l2Provider)
  const res = await l2ToL1Msg.execute(proofInfo)
  const rec = await res.wait()
  console.log('Done! Your transaction is executed', rec)
}
