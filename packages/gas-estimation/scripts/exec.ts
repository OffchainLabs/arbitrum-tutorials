import { utils, providers } from "ethers";
import { addDefaultLocalNetwork } from "@arbitrum/sdk";
import { NodeInterface__factory } from "@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory";
import { NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/dataEntities/constants";
const { requireEnvVariables } = require('arb-shared-dependencies');

// Importing configuration //
require('dotenv').config();
requireEnvVariables(['L2RPC']);

// Initial setup //
const baseL2Provider = new providers.StaticJsonRpcProvider(process.env.L2RPC);

/////////////////////////
// Variables to modify //
/////////////////////////

// Address where the transaction being estimated will be sent
const destinationAddress = "0x1234563d5de0d7198451f87bcbf15aefd00d434d";

// The input data of the transaction, in hex. You can find examples of this information in Arbiscan,
// in the "Input Data" field of a transaction.
const txData = "0x";

const gasEstimator = async () => {
    // ***************************
    // * Gas formula explanation *
    // ***************************
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
    //      (this is the L2's estimated view of the current L1's price per byte of data, which the L2 dynamically adjusts over time)
    //      ArbGasInfo.getL1BaseFeeEstimate() and multiply by 16
    //      ArbGasInfo.getL1GasPriceEstimate() and multiply by 16
    //      ArbGasInfo.getPricesInWei() and get the second element => result[1]
    //      NodeInterface.GasEstimateL1Component() and get the third element and multiply by 16 => result[2]*16
    //      NodeInterface.GasEstimateComponents() and get the fourth element and multiply by 16 => result[3]*16
    // L1S (Size in bytes of the calldata to post on L1) =>
    //      Will depend on the size (in bytes) of the calldata of the transaction
    //      We add a fixed amount of 140 bytes to that amount for the transaction metadata (recipient, nonce, gas price, ...)
    //      Final size will be less after compression, but this calculation gives a good estimation

    // ****************************
    // * Other values you can get *
    // ****************************
    // B =>
    //      NodeInterface.GasEstimateL1Component() and get the first element => result[0]
    //      NodeInterface.GasEstimateComponents() and get the second element => result[1]
    //

    // Add the default local network configuration to the SDK
    // to allow this script to run on a local node
    addDefaultLocalNetwork()

    // Instantiation of the NodeInterface object
    const nodeInterface = NodeInterface__factory.connect(
        NODE_INTERFACE_ADDRESS,
        baseL2Provider
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
    const l1GasEstimated = gasEstimateComponents.gasEstimateForL1;
    const l2GasUsed = gasEstimateComponents.gasEstimate.sub(gasEstimateComponents.gasEstimateForL1);
    const l2EstimatedPrice = gasEstimateComponents.baseFee;
    const l1EstimatedPrice = gasEstimateComponents.l1BaseFeeEstimate.mul(16);


    // Calculating some extra values to be able to apply all variables of the formula
    // -------------------------------------------------------------------------------
    // NOTE: This one might be a bit confusing, but l1GasEstimated (B in the formula) is calculated based on l2 gas fees
    const l1Cost = l1GasEstimated.mul(l2EstimatedPrice);
    // NOTE: This is similar to 140 + utils.hexDataLength(txData);
    const l1Size = l1Cost.div(l1EstimatedPrice);

    // Getting the result of the formula
    // ---------------------------------
    // Setting the basic variables of the formula
    const P = l2EstimatedPrice;
    const L2G = l2GasUsed;
    const L1P = l1EstimatedPrice;
    const L1S = l1Size;

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
    console.log(`L2 Gas (L2G) = ${L2G.toNumber()} units`);
    console.log(`L1 estimated Gas (L1G) = ${l1GasEstimated.toNumber()} units`);

    console.log(`P (L2 Gas Price) = ${utils.formatUnits(P, "gwei")} gwei`);
    console.log(`L1P (L1 estimated calldata price per byte) = ${utils.formatUnits(L1P, "gwei")} gwei`);
    console.log(`L1S (L1 Calldata size in bytes) = ${L1S} bytes`);
    
    console.log("-------------------");
    console.log(`Transaction estimated fees to pay = ${utils.formatEther(TXFEES)} ETH`);
}

gasEstimator()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    });
