import { providers, Wallet, BigNumber } from "ethers"
import { arbLog, requireEnvVariables } from 'arb-shared-dependencies'
import { Erc20L1L3Bridger, EthL1L3Bridger, getL2Network } from "godzillaba-arbitrum-sdk"
import { ERC20__factory } from "godzillaba-arbitrum-sdk/dist/lib/abi/factories/ERC20__factory"
import yargs from 'yargs/yargs'
import { hideBin } from "yargs/helpers"

// Importing configuration //
require('dotenv').config()
requireEnvVariables(['L1RPC', 'L2RPC', 'L3RPC', 'L1PRIVKEY'])

// Initial setup //
const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
const l3Provider = new providers.JsonRpcProvider(process.env.L3RPC)

const l1Signer = new Wallet(process.env.L1PRIVKEY!, l1Provider)

const main = async (params: {
  amount: BigNumber, l3Recipient?: string
}) => {
  await arbLog(`Bridging ETH from L1 to L3`)

  /**
   * Use L3 Network to initialize a bridger
   */
  const l3Network = await getL2Network(l3Provider)
  const bridger = new EthL1L3Bridger(l3Network)

  /**
   * Information about the configuration of the bridger
   */
  const l1ChainId = (await l1Provider.getNetwork()).chainId
  const l2ChainId = (await l2Provider.getNetwork()).chainId
  const l3ChainId = (await l3Provider.getNetwork()).chainId
  const signerAddress = await l1Signer.getAddress()
  console.log('Recipient:', params.l3Recipient || signerAddress)
  console.log('Amount:', params.amount.toString())
  console.log('L1 chain id:', l1ChainId)
  console.log('L2 chain id:', l2ChainId)
  console.log('L3 chain id:', l3ChainId)

  /**
   * Get a deposit request
   */
  console.log('Getting deposit request...')
  const depositRequest = await bridger.getDepositRequest({
    l1Signer,
    amount: params.amount,
    l2Provider,
    l3Provider,
    to: params.l3Recipient, // optional, defaults to signer's address
  })
  console.log('Done')
  /**
   * Deposit ETH
   */
  console.log('Depositing ETH...')
  const depositTx = await bridger.deposit({
    ...depositRequest,
    l1Signer
  })
  await depositTx.wait()
  console.log('Done')

  console.log('Initiated deposit:', depositTx.hash)
};

const args = yargs(hideBin(process.argv))
  .options({
    amount: {
      type: 'number',
      description: 'Amount of ETH to bridge',
      demandOption: true
    },
    l3Recipient: {
      type: 'string',
      description: 'L3 recipient address'
    }
  })
  .usage('Initiate a deposit of ETH from L1 to L3')
  .parseSync()

main({
  amount: BigNumber.from(args.amount),
  l3Recipient: args.l3Recipient,
}).then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
})