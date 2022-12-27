import {providers} from "ethers"
import args from './getClargs';
import { checkConfirmation, findSubmissionTx } from "./utils";
const { requireEnvVariables } = require('arb-shared-dependencies')

requireEnvVariables(['L2RPC'])
const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)

const main = async () => {
    switch(args.action) {
        case "checkConfirmation":
            await checkConfirmation(args.txHash, l2Provider)
            break
        case "findSubmissionTx":
            if(process.env.L1RPC === ''){
                throw new Error("L1RPC not defined in env!")
            }
            await findSubmissionTx(args.txHash, l1Provider, l2Provider)
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
