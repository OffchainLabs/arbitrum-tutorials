
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

// Use binary search to find one of the target block.
const binarySearchMatchedBlock =async (
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
        //When we find one, we can return directly to reduce the rpc call load.
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

//Given one of the matched block, then find all matched blocks.
const findBlockRange =async (
    batchNum: BigNumber,
    blockNum: number,
    latestBlockNum: number,
    nodeInterface:NodeInterface,
    l2network: L2Network
): Promise<BlockRange> => {
    let start = l2network.nitroGenesisBlock;
    let end = latestBlockNum;

    /**
     * First try to find all blocks whose block height lower than this blocknum.
     * We should use a big number to reduce the search time, when find one not matched
     * to this batch, we will stop search and then search back one by one to see which
     * one is the last matched block. 15 was chosen based on the mean inequality and 
     * our batches now contain an average of 200-250 blocks.
     */
    for(let i = blockNum; i > 0; i -= 15) {
        const cur = await nodeInterface.findBatchContainingBlock(i)
        if(!(cur).eq(batchNum)) {
            start = i;
            break;
        }
    }
    for(let i = start; i <= (start + 15); i++){
        if((await nodeInterface.findBatchContainingBlock(i)).eq(batchNum)) {
            console.log(await nodeInterface.findBatchContainingBlock(i))
            start = i;
            break;
        }
    }

    /**
     * Then try to find all blocks whose block height higher than this blocknum use the
     * same method.
     */
    for(let i = blockNum; i < latestBlockNum; i += 15) {
        if(!(await nodeInterface.findBatchContainingBlock(i)).eq(batchNum)) {
            end = i;
            break;
        }
    }
    for(let i = end; i >= (end - 15); i--){
        if((await nodeInterface.findBatchContainingBlock(i)).eq(batchNum)) {
            console.log(await nodeInterface.findBatchContainingBlock(i))
            end = i;
            break;
        }
    }
    return {start, end}
}

//Find all txns within the block range.
export const getAllTxByBlockRange = async (
    blockRange: BlockRange,
    l2BatchProvider: providers.JsonRpcBatchProvider
): Promise<string[]> => {
    //To reduce the rpc call load, we use JsonRpcBatchProvider way.
    const promises:Promise<providers.Block>[] = [];

    //Add all the rpc call to the promises array.
    for(let i = blockRange.start; i <= blockRange.end; i++) {
        promises.push(l2BatchProvider.getBlock(i))
    }
    //Call those promises rpc call in a single time.
    const blockResults = await Promise.all(promises);

    //After we got those blocks information, we can extract all thx txns.
    let results: string[] = []
    for(let i = 0; i < blockResults.length; i++) {
        results.push(...blockResults[i].transactions)
    }
    return results
} 


 /**
   * This function is used to find the block range matched to a batch number.
   * To achieve this, we should use binary search to find one of the matched Block by
   * calling precompile nodeInterface.findBatchContainingBlock, then after we found one,
   * we can search around this block to find all matched block.
   */
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

    //Then find one of the matched block.
    console.log("Start querying nodeInterface to find one of matched Block...")
    const oneOfMatchedBlock = await binarySearchMatchedBlock(batchNum, latestBlockNum, nodeInterface, l2Network)
    
    //Search around the block to find all matched blocks
    console.log(`One of matched block founded: ${oneOfMatchedBlock}, now we will go and find all matched blocks...`)
    const targetBlockRange = await findBlockRange(batchNum, oneOfMatchedBlock, latestBlockNum, nodeInterface, l2Network)
    
    return targetBlockRange
}