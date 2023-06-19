// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface ArbitrumEnabledToken {
    /// Should return `0xb1` if token is enabled for arbitrum gateways
    function isArbitrumEnabled() external view returns (uint8);
}

/**
 * @title Minimum expected interface for an L1 custom token
 */
interface ICustomToken is ArbitrumEnabledToken {
    /**
     * Should make an external call to L2GatewayRouter.setGateway and probably L1CustomGateway.registerTokenToL2
     * @param l2CustomTokenAddress address of the custom token on L2
     * @param maxSubmissionCostForCustomBridge max gas deducted from user's L2 balance to cover submission fee for registerTokenToL2
     * @param maxSubmissionCostForRouter max gas deducted from user's L2 balance to cover submission fee for setGateway
     * @param maxGasForCustomBridge max gas deducted from user's L2 balance to cover L2 execution of registerTokenToL2
     * @param maxGasForRouter max gas deducted from user's L2 balance to cover L2 execution of setGateway
     * @param gasPriceBid gas price for L2 execution
     * @param valueForGateway callvalue sent on call to registerTokenToL2
     * @param valueForRouter callvalue sent on call to setGateway
     * @param creditBackAddress address for crediting back overpayment of maxSubmissionCosts
     */
    function registerTokenOnL2(
        address l2CustomTokenAddress,
        uint256 maxSubmissionCostForCustomBridge,
        uint256 maxSubmissionCostForRouter,
        uint256 maxGasForCustomBridge,
        uint256 maxGasForRouter,
        uint256 gasPriceBid,
        uint256 valueForGateway,
        uint256 valueForRouter,
        address creditBackAddress
    ) external payable;

    /// @dev See {IERC20-transferFrom}
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    /// @dev See {IERC20-balanceOf}
    function balanceOf(address account) external view returns (uint256);
}
