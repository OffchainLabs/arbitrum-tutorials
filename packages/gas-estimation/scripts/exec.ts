import { utils, providers } from "ethers";
import { ArbGasInfo__factory } from "@arbitrum/sdk/dist/lib/abi/factories/ArbGasInfo__factory";
import { NodeInterface__factory } from "@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory";
import { ARB_GAS_INFO, NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/dataEntities/constants";

// Importing configuration //
require('dotenv').config();

// Initial setup //
const baseL2Provider = new providers.StaticJsonRpcProvider(process.env.L2RPC);
const GENERIC_NON_ZERO_ADDRESS = "0x1234563d5de0d7198451f87bcbf15aefd00d434d";

// Transaction dependent variables (modify this values)
const txData = "0x";

const gasEstimator = async () => {
    // ***************************
    // * Gas formula explanation *
    // ***************************
    //
    // Transaction fees (TXFEES) = L2 Gas Price (P) * Gas Limit (G)
    //      ----> Gas Limit (G) = L2 Gas used (L2G) + Extra Buffer for L1 cost (B)
    //      ----> L1 Cost (L1C) = L1 Calldata price per byte (L1P) * L1 Calldata size in bytes (L1S)
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
    // L1P (L1 Calldata price per byte) => 
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

    // Instantiation of the ArbGasInfo and NodeInterface objects
    const arbGasInfo = ArbGasInfo__factory.connect(
        ARB_GAS_INFO,
        baseL2Provider
    );
    const nodeInterface = NodeInterface__factory.connect(
        NODE_INTERFACE_ADDRESS,
        baseL2Provider
    );

    // Getting the gas prices from ArbGasInfo.getPricesInWei()
    const gasComponents = await arbGasInfo.callStatic.getPricesInWei();

    // And the estimations from NodeInterface.GasEstimateComponents()
    const gasEstimateComponents = await nodeInterface.callStatic.gasEstimateComponents(
        GENERIC_NON_ZERO_ADDRESS,
        false,
        txData
    );
    const l2GasUsed = gasEstimateComponents.gasEstimate.sub(gasEstimateComponents.gasEstimateForL1);

    // Setting the variables of the formula
    const P = gasComponents[5];
    const L2G = l2GasUsed;
    const L1P = gasComponents[1];
    const L1S = 140 + utils.hexDataLength(txData);

    // Getting the result of the formula
    // ---------------------------------

    // L1C (L1 Cost) = L1P * L1S
    const L1C = L1P.mul(L1S);

    // B (Extra Buffer) = L1C / P
    const B = L1C.div(P);

    // G (Gas Limit) = L2G + B
    const G = L2G.add(B);

    // TXFEES (Transaction fees) = P * G
    const TXFEES = P.mul(G);

    console.log("Transaction summary");
    console.log("-------------------");
    console.log(`P (L2 Gas Price) = ${utils.formatUnits(P, "gwei")} gwei`);
    console.log(`L2G (L2 Gas used) = ${L2G.toNumber()} units`);
    console.log(`L1P (L1 Calldata price per byte) = ${utils.formatUnits(L1P, "gwei")} gwei`);
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