// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/ICustomToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Interface needed to call function registerTokenToL2 of the L1CustomGateway
 */
interface IL1CustomGateway {
    function registerTokenToL2(
        address _l2Address,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost,
        address _creditBackAddress
    ) external payable returns (uint256);
}

/**
 * @title Interface needed to call function setGateway of the L2GatewayRouter
 */
interface IL1GatewayRouter {
    function setGateway(
        address _gateway,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost,
        address _creditBackAddress
    ) external payable returns (uint256);
}

contract L1Token is Ownable, ICustomToken, ERC20 {
    address private customGatewayAddress;
    address private routerAddress;
    bool private shouldRegisterGateway;

    /**
     * @dev See {ERC20-constructor} and {Ownable-constructor}
     *
     * An initial supply amount is passed, which is preminted to the deployer.
     */
    constructor(address _customGatewayAddress, address _routerAddress, uint256 _initialSupply) ERC20("L1CustomToken", "LCT") {
        customGatewayAddress = _customGatewayAddress;
        routerAddress = _routerAddress;
        _mint(msg.sender, _initialSupply * 10 ** decimals());
    }

    /// @dev we only set shouldRegisterGateway to true when in `registerTokenOnL2`
    function isArbitrumEnabled() external view override returns (uint8) {
        require(shouldRegisterGateway, "NOT_EXPECTED_CALL");
        return uint8(0xb1);
    }

    /// @dev See {ICustomToken-registerTokenOnL2}
    function registerTokenOnL2(
        address l2CustomTokenAddress,
        uint256 maxSubmissionCostForCustomGateway,
        uint256 maxSubmissionCostForRouter,
        uint256 maxGasForCustomGateway,
        uint256 maxGasForRouter,
        uint256 gasPriceBid,
        uint256 valueForGateway,
        uint256 valueForRouter,
        address creditBackAddress
    ) public override payable onlyOwner {
        // we temporarily set `shouldRegisterGateway` to true for the callback in registerTokenToL2 to succeed
        bool prev = shouldRegisterGateway;
        shouldRegisterGateway = true;

        IL1CustomGateway(customGatewayAddress).registerTokenToL2{ value: valueForGateway }(
            l2CustomTokenAddress,
            maxGasForCustomGateway,
            gasPriceBid,
            maxSubmissionCostForCustomGateway,
            creditBackAddress
        );

        IL1GatewayRouter(routerAddress).setGateway{ value: valueForRouter }(
            customGatewayAddress,
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
