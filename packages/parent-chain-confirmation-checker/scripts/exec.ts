import { providers } from 'ethers'
import { requireEnvVariables } from 'arb-shared-dependencies'
import args from './getClargs'
import { checkConfirmation, findSubmissionTx } from './utils'
requireEnvVariables(['CHAIN_RPC'])

/**
 * Set up: instantiate wallets connected to providers
 */
const parentChainProvider = new providers.JsonRpcProvider(
  process.env.PARENT_CHAIN_RPC
)
const childChainProvider = new providers.JsonRpcProvider(process.env.CHAIN_RPC)

const main = async () => {
  // check action param
  switch (args.action) {
    case 'checkConfirmation':
      const confirmations = await checkConfirmation(
        args.txHash,
        childChainProvider
      )
      if (confirmations.eq(0)) {
        console.log(
          'Block has not been submitted to the parent chain yet, please check later...'
        )
      } else {
        console.log(
          `Congrats! This block has been submitted to the parent chain, and the batch-posting transaction has been confirmed for ${confirmations} blocks`
        )
      }
      break

    case 'findSubmissionTx':
      if (process.env.PARENT_CHAIN_RPC === '') {
        throw new Error('PARENT_CHAIN_RPC not defined in env!')
      }
      const submissionTx = await findSubmissionTx(
        args.txHash,
        parentChainProvider,
        childChainProvider
      )
      if (submissionTx === '') {
        console.log(
          'No submission transaction found (note that some RPCs might discard events that are too old)'
        )
      } else {
        console.log(
          `Submission transaction found on the parent chain: ${submissionTx}`
        )
      }
      break

    default:
      throw new Error(`Unknown action: ${args.action}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
