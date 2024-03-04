import { providers, Wallet, BigNumber } from "ethers"
import { arbLog, requireEnvVariables } from 'arb-shared-dependencies'
import { Erc20L1L3Bridger, getL2Network } from "godzillaba-arbitrum-sdk"
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
  l1Token: string, amount: BigNumber, l3Recipient?: string, skipFeeToken?: boolean
}) => {
  await arbLog(`Bridging tokens from L1 to L3`)

  /**
   * Use L3 Network to initialize a bridger
   */
  const l3Network = await getL2Network(l3Provider)
  const bridger = new Erc20L1L3Bridger(l3Network)

  /**
   * Information about the configuration of the bridger
   * 
   * Note that if the L3's fee token is not ETH you must pay for the L2->L3 fee in the L3's fee token.
   * In this case you may either:
   * A) Pay the fee in the L3's fee token when initiating the deposit on L1. 
   *    This can only be done if the fee token is available and held on L1.
   *    This is the default behavior, and no additional steps are required besides approving the fee token.
   * B) Manually redeem the retryable on L3 to pay the fee (this can be done by anyone, not just the sender of the deposit). 
   *    If the fee token is unavailable on L1 or skipFeeToken is set to true, manual redemption is required.
   * 
   * If the L3 uses ETH for fees, all retryables are paid for when initiating the deposit by default and no additional steps are required.
   */
  const l1ChainId = (await l1Provider.getNetwork()).chainId
  const l2ChainId = (await l2Provider.getNetwork()).chainId
  const l3ChainId = (await l3Provider.getNetwork()).chainId
  const signerAddress = await l1Signer.getAddress()
  const l3FeeTokenL1Address = await bridger.l1FeeTokenAddress(l1Provider, l2Provider)
  const feeTokenSymbol = bridger.l2FeeTokenAddress ? await ERC20__factory.connect(bridger.l2FeeTokenAddress, l2Provider).symbol() : 'ETH'
  console.log('L1 Token:', params.l1Token)
  console.log('L3 Fee Token:', feeTokenSymbol || 'ETH')
  console.log('L3 Fee Token Address on L2:', bridger.l2FeeTokenAddress || 'NONE')
  console.log('L3 Fee Token Address on L1:', !l3FeeTokenL1Address || l3FeeTokenL1Address === bridger.skipL1FeeTokenMagic ? 'NONE' : l3FeeTokenL1Address)
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
    erc20L1Address: params.l1Token,
    amount: params.amount,
    l2Provider,
    l3Provider,
    to: params.l3Recipient, // optional, defaults to signer's address
    /**
     * Optional, defaults to false.
     * Skip paying the L2->L3 fee if the L3 doesn't use ETH for fees
     * This has no effect if the L3 uses ETH for fees.
     */
    skipFeeToken: params.skipFeeToken
  })
  console.log('Done')

  /**
   * If the deposit request has nonzero feeTokenAmount, we are paying for the L2->L3 retryable when initiating the deposit.
   * We must approve the fee token on L1.
   */
  if (depositRequest.feeTokenAmount.gt(0)) {
    console.log('Approving fee token on L1...')
    await (await bridger.approveFeeToken({
      l1Signer,
      l2Provider,
      amount: depositRequest.feeTokenAmount,
    })).wait()
    console.log('Done')
  }

  /**
   * Approve the token on L1
   */
  console.log('Approving token on L1...')
  await (await bridger.approveToken({
    erc20L1Address: params.l1Token,
    l1Signer,
    amount: params.amount // optional, defaults to max
  })).wait()
  console.log('Done')

  /**
   * Deposit the token
   */
  console.log('Depositing token...')
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
    l1Token: {
      type: 'string',
      description: 'L1 token address',
      demandOption: true
    },
    amount: {
      type: 'number',
      description: 'Amount of tokens to bridge',
      demandOption: true
    },
    l3Recipient: {
      type: 'string',
      description: 'L3 recipient address'
    },
    skipFeeToken: {
      type: 'boolean',
      description: 'Skip paying the L2->L3 fee if the L3 doesn\'t use ETH for fees.\nThis has no effect if the L3 uses ETH for fees.',
      default: false
    }
  })
  .usage('Initiate a deposit of ERC20 tokens from L1 to L3')
  .parseSync()

main({
  l1Token: args.l1Token,
  amount: BigNumber.from(args.amount),
  l3Recipient: args.l3Recipient,
  skipFeeToken: args.skipFeeToken
}).then(() => process.exit(0)).catch(error => {
  console.error(error)
  process.exit(1)
})