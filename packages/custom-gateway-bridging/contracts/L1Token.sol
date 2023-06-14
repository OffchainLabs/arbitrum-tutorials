// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// import "./interfaces/ICustomToken.sol";
import "@arbitrum/token-bridge-contracts/contracts/tokenbridge/ethereum/ICustomToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Interface needed to call function registerTokenToL2 of the L1CustomGateway
 *        (We don't need this interface for this example, but we're keeping it for completion)
 */
interface IL1CustomGenericGateway {
    function registerTokenToL2(
        address l2Address,
        uint256 maxGas,
        uint256 gasPriceBid,
        uint256 maxSubmissionCost,
        address creditBackAddress
    ) external payable returns (uint256);
}

/**
 * @title Interface needed to call function setGateway of the L2GatewayRouter
 */
interface IL1GatewayRouter {
    function setGateway(
        address gateway,
        uint256 maxGas,
        uint256 gasPriceBid,
        uint256 maxSubmissionCost,
        address creditBackAddress
    ) external payable returns (uint256);
}

/**
 * @title Example implementation of a custom ERC20 token to be deployed on L1
 */
contract L1Token is Ownable, ICustomToken, ERC20 {
    address private l1GatewayAddress;
    address private routerAddress;
    bool private shouldRegisterGateway;

    /**
     * @dev See {ERC20-constructor} and {Ownable-constructor}
     * An initial supply amount is passed, which is preminted to the deployer.
     * @param l1GatewayAddress_ address of the L1 custom gateway
     * @param routerAddress_ address of the L1GatewayRouter
     * @param initialSupply initial supply amount to be minted to the deployer
     */
    constructor(address l1GatewayAddress_, address routerAddress_, uint256 initialSupply) ERC20("L1CustomToken", "LCT") {
        l1GatewayAddress = l1GatewayAddress_;
        routerAddress = routerAddress_;
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    /// @dev we only set shouldRegisterGateway to true when in `registerTokenOnL2`
    function isArbitrumEnabled() external view override returns (uint8) {
        require(shouldRegisterGateway, "NOT_EXPECTED_CALL");
        return uint8(0xb1);
    }

    /**
     * @dev See {ICustomToken-registerTokenOnL2}
     * In this case, we don't need to call IL1CustomGateway.registerTokenToL2, because our
     * custom gateway works for a single token it already knows.
     */
    function registerTokenOnL2(
        address, /* l2CustomTokenAddress */
        uint256, /* maxSubmissionCostForCustomGateway */
        uint256 maxSubmissionCostForRouter,
        uint256, /*  maxGasForCustomGateway */
        uint256 maxGasForRouter,
        uint256 gasPriceBid,
        uint256, /* valueForGateway */
        uint256 valueForRouter,
        address creditBackAddress
    ) public override payable onlyOwner {
        // we temporarily set `shouldRegisterGateway` to true for the callback in registerTokenToL2 to succeed
        bool prev = shouldRegisterGateway;
        shouldRegisterGateway = true;

        IL1GatewayRouter(routerAddress).setGateway{ value: valueForRouter }(
            l1GatewayAddress,
            maxGasForRouter,
            gasPriceBid,
            maxSubmissionCostForRouter,
            creditBackAddress
        );

        shouldRegisterGateway = prev;
    }

    /// @dev See {ERC20-transferFrom}
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override(ICustomToken, ERC20) returns (bool) {
        return super.transferFrom(sender, recipient, amount);
    }

    /// @dev See {ERC20-balanceOf}
    function balanceOf(address account) public view override(ICustomToken, ERC20) returns (uint256) {
        return super.balanceOf(account);
    }
}
