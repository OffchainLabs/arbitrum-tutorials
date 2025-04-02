// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@arbitrum/nitro-contracts/src/bridge/IInbox.sol";
import "@arbitrum/token-bridge-contracts/contracts/tokenbridge/ethereum/ICustomToken.sol";
import "@arbitrum/token-bridge-contracts/contracts/tokenbridge/libraries/IERC20Bridge.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Interface needed to call function registerTokenToL2 of the L1CustomGateway
 *        (We don't need this interface for this example, but we're keeping it for completion)
 */
interface IL1OrbitCustomGateway {
    function registerTokenToL2(
        address l2Address,
        uint256 maxGas,
        uint256 gasPriceBid,
        uint256 maxSubmissionCost,
        address creditBackAddress,
        uint256 feeAmount
    ) external returns (uint256);
}

interface IOrbitGatewayRouter {
    function setGateway(
        address gateway,
        uint256 maxGas,
        uint256 gasPriceBid,
        uint256 maxSubmissionCost,
        address creditBackAddress,
        uint256 feeAmount
    ) external returns (uint256);

    function inbox() external returns (address);
}

contract ParentChainToken is Ownable, ERC20, ICustomToken {
    using SafeERC20 for ERC20;

    address public gateway;
    address public router;
    bool internal shouldRegisterGateway;

    constructor(
        address _gateway,
        address _router,
        uint256 initialSupply
    ) ERC20("L1CustomToken", "LCT") {
        gateway = _gateway;
        router = _router;
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    /// @dev we only set shouldRegisterGateway to true when in `registerTokenOnL2`
    function isArbitrumEnabled() external view override returns (uint8) {
        require(shouldRegisterGateway, "NOT_EXPECTED_CALL");
        return uint8(0xb1);
    }

    function registerTokenOnL2(
        address /* l2CustomTokenAddress */,
        uint256 /* maxSubmissionCostForCustomGateway */,
        uint256 maxSubmissionCostForRouter,
        uint256 /* maxGasForCustomGateway */,
        uint256 maxGasForRouter,
        uint256 gasPriceBid,
        uint256 /* valueForGateway */,
        uint256 valueForRouter,
        address creditBackAddress
    ) public payable override onlyOwner {
        // we temporarily set `shouldRegisterGateway` to true for the callback in registerTokenToL2 to succeed
        bool prev = shouldRegisterGateway;
        shouldRegisterGateway = true;

        address inbox = IOrbitGatewayRouter(router).inbox();
        address bridge = address(IInbox(inbox).bridge());

        // transfer fees from user to here, and approve router to use it
        {
            address nativeToken = IERC20Bridge(bridge).nativeToken();

            ERC20(nativeToken).safeTransferFrom(msg.sender, address(this), valueForRouter);
            ERC20(nativeToken).approve(router, valueForRouter);
        }

        IOrbitGatewayRouter(router).setGateway(
            gateway,
            maxGasForRouter,
            gasPriceBid,
            maxSubmissionCostForRouter,
            creditBackAddress,
            valueForRouter
        );

        // reset allowance back to 0 in case not all approved native tokens are spent
        {
            address nativeToken = IERC20Bridge(bridge).nativeToken();

            ERC20(nativeToken).approve(router, 0);
        }

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
    function balanceOf(
        address account
    ) public view override(ICustomToken, ERC20) returns (uint256) {
        return super.balanceOf(account);
    }
}
