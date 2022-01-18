pragma solidity >=0.6.11;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "arb-bridge-peripherals/contracts/tokenbridge/ethereum/gateway/L1ArbitrumExtendedGateway.sol";

interface IExitLiquidityProvider {
    function requestLiquidity(
        address dest,
        address erc20,
        uint256 amount,
        uint256 exitNum,
        bytes calldata liquidityProof
    ) external returns (bytes memory);
}

contract L1PassiveFastExitManager is ITradeableExitReceiver {
    struct ExitDataFrame {
        address initialDestination;
        uint256 maxFee;
        address liquidityProvider;
        uint256 amount;
        address erc20;
        bytes liquidityProof;
        bytes spareData;
    }

    function onExitTransfer(
        address sender,
        uint256 exitNum,
        bytes calldata data
    ) external override returns (bool) {
        ExitDataFrame memory frame;
        {
            (
                frame.initialDestination,
                frame.maxFee,
                frame.liquidityProvider,
                frame.amount,
                frame.erc20,
                frame.liquidityProof,
                frame.spareData
            ) = abi.decode(data, (address, uint256, address, uint256, address, bytes, bytes));
        }

        bytes memory liquidityProviderData;
        {
            uint256 balancePrior;
            {
                balancePrior = IERC20(frame.erc20).balanceOf(sender);
            }

            // Liquidity provider is responsible for validating if this is a valid exit
            liquidityProviderData = IExitLiquidityProvider(frame.liquidityProvider)
                .requestLiquidity(
                frame.initialDestination,
                frame.erc20,
                frame.amount,
                exitNum,
                frame.liquidityProof
            );

            uint256 balancePost = IERC20(frame.erc20).balanceOf(sender);

            // User must be sent at least (amount - maxFee) or execution reverts
            require(
                SafeMath.sub(balancePost, balancePrior) >= SafeMath.sub(frame.amount, frame.maxFee),
                "User did not get credited with enough tokens"
            );
        }

        L1ArbitrumExtendedGateway(msg.sender).transferExitAndCall(
            exitNum,
            frame.initialDestination,
            frame.liquidityProvider,
            liquidityProviderData,
            frame.spareData
        );
        return true;
    }
}