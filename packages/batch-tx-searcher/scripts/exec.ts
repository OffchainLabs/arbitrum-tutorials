import {providers, BigNumber} from "ethers"
import args from './getClargs';
import { getBlockRangeByBatch, getAllTxByBlockRange, BlockRange } from "./utils";
import { writeFileSync } from 'fs';
const { requireEnvVariables } = require('arb-shared-dependencies')

requireEnvVariables(['L2RPC', 'L1RPC'])

const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
const l2BatchProvider = new providers.JsonRpcBatchProvider(process.env.L2RPC)

const main = async () => {
    switch(args.action) {
        case "getBlockRange":
            const blockRangeOutput:BlockRange = await getBlockRangeByBatch(BigNumber.from(args.batchNum), l1Provider, l2Provider)
            console.log("Here is the block range of this batch: ")
            console.log(blockRangeOutput)
            break

        case "getAllTxns":
            if(!args.outputFile) {
                throw new Error("No outputFile! (You should add --outputFile)")
            }
            const blockRange:BlockRange = await getBlockRangeByBatch(BigNumber.from(args.batchNum), l1Provider, l2Provider)
            console.log("Here is the block range of this batch: ")
            console.log(blockRange)
            console.log("Now we query the txns within those blocks...")
            const allTxns = await getAllTxByBlockRange(blockRange, l2BatchProvider)
            console.log(`All ${allTxns.length} txns found, now writing to ${args.outputFile}...`)
            writeFileSync(args.outputFile, allTxns.toString())
            break

        default:
                console.log(`Unknown action: ${args.action}`)
    }
}

main()
.then(() => process.exit(0))
.catch(error => {
  console.error(error)
  process.exit(1)
})
