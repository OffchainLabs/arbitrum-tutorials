import { utils, providers } from "ethers";
import { NodeInterface__factory } from "@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory";
import { NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/dataEntities/constants";
const { requireEnvVariables, addCustomNetworkFromFile } = require('arb-shared-dependencies');

// Importing configuration //
require('dotenv').config();
requireEnvVariables(['CHAIN_RPC']);

// Initial setup //
const provider = new providers.StaticJsonRpcProvider(process.env.CHAIN_RPC);

///////////////////////////////////////////
// Values of the transaction to estimate //
///////////////////////////////////////////

// Address where the transaction being estimated will be sent
// (add here the address you will send the transaction to)
const destinationAddress = "0x1234563d5de0d7198451f87bcbf15aefd00d434d";

// The input data of the transaction, in hex. You can find examples of this information in Arbiscan,
// in the "Input Data" field of a transaction.
// (add here the calladata you will send in the transaction)
const txData = "0x";

const gasEstimator = async () => {
    // ***************************
    // * Gas formula explanation *
    // ***************************
    //
    // NOTE: In this explanation, L1 and L2 terms are used to represent the Layer-1 and Layer-2 components.
    //       For L3 Orbit chains, L1 should be viewed as the parent chain (Layer 2), and L2 as the orbit chain (L3)
    //
    // Transaction fees (TXFEES) = L2 Gas Price (P) * Gas Limit (G)
    //      ----> Gas Limit (G) = L2 Gas used (L2G) + Extra Buffer for L1 cost (B)
    //      ----> L1 Estimated Cost (L1C) = L1 estimated calldata price per byte (L1P) * L1 Calldata size in bytes (L1S)
    //      ----> Extra Buffer (B) = L1 Cost (L1C) / L2 Gas Price (P)
    //
    // TXFEES = P * (L2G + ((L1P * L1S) / P))

    // ********************************************
    // * How do we get all parts of that equation *
    // ********************************************
    // P (L2 Gas Price) =>
    //      ArbGasInfo.getPricesInWei() and get the sixth element => result[5]
    //      NodeInterface.GasEstimateL1Component() and get the second element => result[1]
    //      NodeInterface.GasEstimateComponents() and get the third element => result[2]
    // L2G (L2 Gas used) => Will depend on the transaction itself
    // L1P (L1 estimated calldata price per byte) =>
    //      (this is the child-chain's estimated view of the current parent-chain's price per byte of data, which the child-chain dynamically adjusts over time)
    //      ArbGasInfo.getL1BaseFeeEstimate() and multiply by 16
    //      ArbGasInfo.getL1GasPriceEstimate() and multiply by 16
    //      ArbGasInfo.getPricesInWei() and get the second element => result[1]
    //      NodeInterface.GasEstimateL1Component() and get the third element and multiply by 16 => result[2]*16
    //      NodeInterface.GasEstimateComponents() and get the fourth element and multiply by 16 => result[3]*16
    // L1S (Size in bytes of the calldata to post on the parent chain) =>
    //      Will depend on the size (in bytes) of the calldata of the transaction

    // ****************************
    // * Other values you can get *
    // ****************************
    // B =>
    //      NodeInterface.GasEstimateL1Component() and get the first element => result[0]
    //      NodeInterface.GasEstimateComponents() and get the second element => result[1]
    //

    // dd the custom network configuration to the SDK if present
    addCustomNetworkFromFile()

    // Instantiation of the NodeInterface object
    const nodeInterface = NodeInterface__factory.connect(
        NODE_INTERFACE_ADDRESS,
        provider
    );

    // Getting the estimations from NodeInterface.GasEstimateComponents()
    // ------------------------------------------------------------------
    const gasEstimateComponents = await nodeInterface.callStatic.gasEstimateComponents(
        destinationAddress,
        false,
        txData,
        {
            blockTag: "latest"
        }
    );

    // Getting useful values for calculating the formula
    const parentChainGasEstimated = gasEstimateComponents.gasEstimateForL1;
    const childChainGasUsed = gasEstimateComponents.gasEstimate.sub(gasEstimateComponents.gasEstimateForL1);
    const childChainEstimatedPrice = gasEstimateComponents.baseFee;
    const parentChainEstimatedPrice = gasEstimateComponents.l1BaseFeeEstimate.mul(16);


    // Calculating some extra values to be able to apply all variables of the formula
    // -------------------------------------------------------------------------------
    // NOTE: This one might be a bit confusing, but parentChainGasEstimated (B in the formula) is calculated based on child-chain's gas fees
    const parentChainCost = parentChainGasEstimated.mul(childChainEstimatedPrice);
    const parentChainSize = parentChainCost.div(parentChainEstimatedPrice);

    // Getting the result of the formula
    // ---------------------------------
    // Setting the basic variables of the formula
    const P = childChainEstimatedPrice;
    const L2G = childChainGasUsed;
    const L1P = parentChainEstimatedPrice;
    const L1S = parentChainSize;

    // L1C (L1 Cost) = L1P * L1S
    const L1C = L1P.mul(L1S);

    // B (Extra Buffer) = L1C / P
    const B = L1C.div(P);

    // G (Gas Limit) = L2G + B
    const G = L2G.add(B);

    // TXFEES (Transaction fees) = P * G
    const TXFEES = P.mul(G);

    console.log("Gas estimation components");
    console.log("-------------------");
    console.log(`Full gas estimation = ${gasEstimateComponents.gasEstimate.toNumber()} units`);
    console.log(`Child chain Gas (L2G) = ${L2G.toNumber()} units`);
    console.log(`Parent chain estimated Gas (L1G) = ${parentChainGasEstimated.toNumber()} units`);

    console.log(`P (Child chain gas price) = ${utils.formatUnits(P, "gwei")} gwei`);
    console.log(`L1P (Parent chain estimated calldata price per byte) = ${utils.formatUnits(L1P, "gwei")} gwei`);
    console.log(`L1S (Parent chain calldata size in bytes) = ${L1S} bytes`);
    
    console.log("-------------------");
    console.log(`Transaction estimated fees to pay = ${utils.formatEther(TXFEES)} ETH`);
}

gasEstimator()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    });
