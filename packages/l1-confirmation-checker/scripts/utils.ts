
import { NodeInterface__factory } from "@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory"
import { NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/dataEntities/constants"
import { providers } from "ethers";
import { exit } from 'process';
export const checkConfirmation = async (blockHash: string, l2Provider:providers.JsonRpcProvider) => {
    const nodeInterface = NodeInterface__factory.connect( NODE_INTERFACE_ADDRESS, l2Provider)
    let result
    try {
        result = await nodeInterface.functions.getL1Confirmations(blockHash)
    } catch(e){
        console.log("Check fail, reason: " + e)
        exit(1)
    }
    
    if(result.confirmations.eq(0)) {
        console.log("Block has not been submitted to l1")
    } else {
        console.log(`Congrations! This block has been submitted to l1 for ${result.confirmations} blocks`)
    }
}

export const findSubmissionTx = (tx: string) => {

}