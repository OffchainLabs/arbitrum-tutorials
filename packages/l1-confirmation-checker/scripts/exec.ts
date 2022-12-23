
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
import {providers} from "ethers"
import { exit } from "yargs";
requireEnvVariables(['L2RPC'])
const l1Provider = new providers.JsonRpcProvider(process.env.L1RPC)
const l2Provider = new providers.JsonRpcProvider(process.env.L2RPC)
import args from './getClargs';
import { checkConfirmation } from "./utils";
const main = async () => {
    switch(args.action) {
        case "checkConfirmation":
            console.log("in")
            if(!args.blockHash) {
                throw new Error("blockHash not defined!")
            }
            await checkConfirmation(args.blockHash, l2Provider)
            break
        case "findSubmissionTx":
    }
}
main()