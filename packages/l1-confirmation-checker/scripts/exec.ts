import {providers} from "ethers"
import args from './getClargs';
import { checkConfirmation, findSubmissionTx } from "./utils";
const { requireEnvVariables } = require('arb-shared-dependencies')

requireEnvVariables(['L2RPC'])
const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const main = async () => {
    // check action param
    switch(args.action) {
        case "checkConfirmation":
            const confirmations = await checkConfirmation(args.txHash, l2Provider)
            if(confirmations.eq(0)) {
                console.log("Block has not been submitted to l1 yet, please check it later...")
            } else {
                console.log(`Congrats! This block has been submitted to l1 for ${confirmations} blocks`)
            }
            break

        case "findSubmissionTx":
            if(process.env.L1RPC === ''){
                throw new Error("L1RPC not defined in env!")
            }
            const submissionTx = await findSubmissionTx(args.txHash, l1Provider, l2Provider)
            if(submissionTx === "") {
                console.log("No submission transaction found. (If event too old some rpc will discard it)")
            } else {
                console.log(`Submission transaction found: ${submissionTx}`)
            }
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
