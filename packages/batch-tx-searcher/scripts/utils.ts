
import { NodeInterface__factory } from "@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory"
import { Bridge__factory } from "@arbitrum/sdk/dist/lib/abi/factories/Bridge__factory"
import { NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/dataEntities/constants"
import { getL2Network, L2Network, MultiCaller } from "@arbitrum/sdk"
import { providers, BigNumber } from "ethers";
import { NodeInterface } from "@arbitrum/sdk/dist/lib/abi/NodeInterface";

export interface BlockRange {
    start: number,
    end: number
}

const binarySearchTargetBlock =async (
    batchNum: BigNumber,
    latestBlockNum: number,
    nodeInterface: NodeInterface,
    l2network: L2Network
): Promise<number> => {
    const nitroGenesisBlock = l2network.nitroGenesisBlock

    let high = latestBlockNum;
    let low = nitroGenesisBlock;

    while (low < high) {
        const mid = Math.round((low + high)/2);
        const currentBatch = await nodeInterface.findBatchContainingBlock(mid)
        if(currentBatch.eq(batchNum)) {
            return mid;
        } else if (currentBatch.gt(batchNum)) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return high == nitroGenesisBlock ? nitroGenesisBlock : high - 1;
}

const findBlockRange =async (
    batchNum: BigNumber,
    blockNum: number,
    latestBlockNum: number,
    nodeInterface:NodeInterface,
    l2network: L2Network
): Promise<BlockRange> => {
    let start = l2network.nitroGenesisBlock;
    let end = latestBlockNum;
    for(let i = blockNum; i > 0; i-=25) {
        const cur = await nodeInterface.findBatchContainingBlock(i)
        console.log(cur, " ", i)
        if(!(cur).eq(batchNum)) {
            console.log(await nodeInterface.findBatchContainingBlock(i))
            start = i;
            break;
        }
    }
    for(let i = start; i <= (start + 25); i++){
        if((await nodeInterface.findBatchContainingBlock(i)).eq(batchNum)) {
            console.log(await nodeInterface.findBatchContainingBlock(i))
            start = i;
            break;
        }
    }
    for(let i = blockNum; i < latestBlockNum; i+=25) {
        if(!(await nodeInterface.findBatchContainingBlock(i)).eq(batchNum)) {
            end = i;
            break;
        }
    }
    for(let i = end; i >= (end - 25); i--){
        if((await nodeInterface.findBatchContainingBlock(i)).eq(batchNum)) {
            console.log(await nodeInterface.findBatchContainingBlock(i))
            end = i;
            break;
        }
    }
    return {start, end}
}

export const getAllTxByBlockRange = async (
    blockRange: BlockRange,
    l2BatchProvider: providers.JsonRpcBatchProvider
): Promise<string[]> => {
    const promises:Promise<providers.Block>[] = [];
    for(let i = blockRange.start; i <= blockRange.end; i++) {
        promises.push(l2BatchProvider.getBlock(i))
    }
    const blockResults = await Promise.all(promises);
    let results: string[] = []
    for(let i = 0; i < blockResults.length; i++) {
        results.push(...blockResults[i].transactions)
    }
    return results
} 


 /**
   * This function will output the number of L1 block confirmations the L1 batch-posting transaction has 
   * by a given L2 transaction
   */
// by a given L2 transaction.
export const getBlockRangeByBatch = async (
    batchNum: BigNumber,
    l1Provider: providers.JsonRpcProvider,
    l2Provider: providers.JsonRpcProvider
):Promise<BlockRange> => {
    const l2Network = await getL2Network(l2Provider)
    const nodeInterface = NodeInterface__factory.connect( NODE_INTERFACE_ADDRESS, l2Provider)
    const bridge = Bridge__factory.connect(l2Network.ethBridge.bridge, l1Provider)
    const latestBlockNum = await l2Provider.getBlockNumber()

    //First check if the batch number is valid.
    const latestBatchNum = await bridge.sequencerMessageCount()
    if(batchNum.gt(latestBatchNum)) {
        throw new Error("Error: this is an invalid batch number. (Too high)")
    } else if(latestBatchNum.lt(1)) {
        throw new Error("Error: this is an invalid batch number. (Too low)")
    }

    const oneOfTargetBlock = await binarySearchTargetBlock(batchNum, latestBlockNum, nodeInterface, l2Network)
    const targetBlockRange = await findBlockRange(batchNum, oneOfTargetBlock, latestBlockNum, nodeInterface, l2Network)
    
    return targetBlockRange
}