
import { NodeInterface__factory } from "@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory"
import { SequencerInbox__factory } from "@arbitrum/sdk/dist/lib/abi/factories/SequencerInbox__factory"
import { NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/dataEntities/constants"
import { getL2Network } from "@arbitrum/sdk"
import { providers, BigNumber } from "ethers";

export const checkConfirmation = async (blockNumber: number,  l2Provider:providers.JsonRpcProvider) => {
    // check if blockNumber valid
    const currentBlockNumber = await l2Provider.getBlockNumber()
    if(currentBlockNumber < blockNumber) {
        throw new Error("Block number set too high!")
    }
    const blockHash = (await l2Provider.getBlock(blockNumber)).hash
    const nodeInterface = NodeInterface__factory.connect( NODE_INTERFACE_ADDRESS, l2Provider)
    let result
    try {
        result = await nodeInterface.functions.getL1Confirmations(blockHash)
    } catch(e){
        throw new Error("Check fail, reason: " + e)
    }
    
    if(result.confirmations.eq(0)) {
        console.log("Block has not been submitted to l1 yet, please check it later...")
    } else {
        console.log(`Congrations! This block has been submitted to l1 for ${result.confirmations} blocks`)
    }
}

export const findSubmissionTx = async (
    blockNumber: number, 
    l1Provider: providers.JsonRpcProvider,
    l2Provider: providers.JsonRpcProvider
) => {
    // check if blockNumber valid
    const currentBlockNumber = await l2Provider.getBlockNumber()
    if(currentBlockNumber < blockNumber) {
        throw new Error("Block number set too high!")
    }

    const l2Network = await getL2Network(l2Provider)
    const nodeInterface = NodeInterface__factory.connect( NODE_INTERFACE_ADDRESS, l2Provider)
    const sequencer = SequencerInbox__factory.connect(l2Network.ethBridge.sequencerInbox, l1Provider)
    
    // Get batch number first
    let result: BigNumber
    try {
        result = await (await nodeInterface.functions.findBatchContainingBlock(blockNumber)).batch
    } catch(e){
        throw new Error("Check l2 block fail, reason: " + e)
    }

    // Use batch number to query l1 sequencerInbox's SequencerBatchDelivered event,
    // then get it emitted transaction hash
    const queryBatch = sequencer.filters.SequencerBatchDelivered(result)
    const emittedEvent = await sequencer.queryFilter(queryBatch)
    if(emittedEvent.length === 0) {
        console.log("No submission transaction found. (If event too old some rpc will discard it)")
    } else {
        console.log(`Submission transaction found: ${emittedEvent[0].transactionHash}`)
    }
}