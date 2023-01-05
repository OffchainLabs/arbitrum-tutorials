
import { NodeInterface__factory } from "@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory"
import { SequencerInbox__factory } from "@arbitrum/sdk/dist/lib/abi/factories/SequencerInbox__factory"
import { NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/dataEntities/constants"
import { getL2Network } from "@arbitrum/sdk"
import { providers, BigNumber } from "ethers";

// This function will output  the number of L1 block confirmations the L1 batch-posting transaction has 
// by a given L2 transaction.
export const checkConfirmation = async (
    txHash: string,
    l2Provider:providers.JsonRpcProvider
): Promise<BigNumber> => {
    // Call the related block hash
    let blockHash
    try{
        blockHash = (await l2Provider.getTransactionReceipt(txHash)).blockHash
    } catch(e){
        throw new Error("Check blockNumber fail, reason: " + e)
    }

    const nodeInterface = NodeInterface__factory.connect( NODE_INTERFACE_ADDRESS, l2Provider)
    let result

    // Call nodeInterface precompile to get the number of L1 confirmations the sequencer batch has.
    try {
        result = await nodeInterface.functions.getL1Confirmations(blockHash)
    } catch(e){
        throw new Error("Check fail, reason: " + e)
    }
    
    return result.confirmations  
}

// This function will output the L1 batch-posting transaction hash by a given L2 transaction hash.
export const findSubmissionTx = async (
    txHash: string, 
    l1Provider: providers.JsonRpcProvider,
    l2Provider: providers.JsonRpcProvider
): Promise<string> => {
    // Get the related block number
    let blockNumber
    try{
        blockNumber = (await l2Provider.getTransactionReceipt(txHash)).blockNumber
    } catch(e){
        throw new Error("Check blockNumber fail, reason: " + e)
    }
    
    const l2Network = await getL2Network(l2Provider)
    const nodeInterface = NodeInterface__factory.connect( NODE_INTERFACE_ADDRESS, l2Provider)
    const sequencer = SequencerInbox__factory.connect(l2Network.ethBridge.sequencerInbox, l1Provider)
    
    // Call the nodeInterface precompile to get the batch number first
    let result: BigNumber
    try {
        result = await (await nodeInterface.functions.findBatchContainingBlock(blockNumber)).batch
    } catch(e){
        throw new Error("Check l2 block fail, reason: " + e)
    }

    /**
      * We use the batch number to query the L1 sequencerInbox's SequencerBatchDelivered event
      * then, we get its emitted transaction hash.
    */
    const queryBatch = sequencer.filters.SequencerBatchDelivered(result)
    const emittedEvent = await sequencer.queryFilter(queryBatch)

    // If no event has been emitted, it just returns ""
    if(emittedEvent.length === 0) {
        return ""
    } else {
        return emittedEvent[0].transactionHash
    }
}