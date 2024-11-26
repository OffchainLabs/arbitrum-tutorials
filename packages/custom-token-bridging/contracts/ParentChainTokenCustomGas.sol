// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@arbitrum/token-bridge-contracts/contracts/tokenbridge/ethereum/ICustomToken.sol";
import "@arbitrum/token-bridge-contracts/contracts/tokenbridge/ethereum/gateway/L1CustomGateway.sol";
import "@arbitrum/token-bridge-contracts/contracts/tokenbridge/ethereum/gateway/L1GatewayRouter.sol";
import { IERC20Bridge } from "@arbitrum/token-bridge-contracts/contracts/tokenbridge/libraries/IERC20Bridge.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IL1CustomGateway {
    function registerTokenToL2(
        address _l2Address,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost,
        address _creditBackAddress
    ) external payable returns (uint256);
}

interface IL1OrbitCustomGateway {
    function registerTokenToL2(
        address _l2Address,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost,
        address _creditBackAddress,
        uint256 _feeAmount
    ) external returns (uint256);
}

interface IGatewayRouter2 {
    function setGateway(
        address _gateway,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost,
        address _creditBackAddress
    ) external payable returns (uint256);
}

interface IOrbitGatewayRouter {
    function setGateway(
        address _gateway,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost,
        address _creditBackAddress,
        uint256 _feeAmount
    ) external returns (uint256);

    function inbox() external returns (address);
}

contract ParentChainToken is Ownable, ERC20, ICustomToken {
    using SafeERC20 for IERC20;

    address public gateway;
    address public router;
    bool internal shouldRegisterGateway;

    constructor(address _gateway, address _router, uint256 _initialSupply) ERC20("L1CustomToken", "LCT") {
        gateway = _gateway;
        router = _router;
        _mint(msg.sender, _initialSupply * 10 ** decimals());
    }

    function mint() external {
        _mint(msg.sender, 50000000);
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

    /// @dev we only set shouldRegisterGateway to true when in `registerTokenOnL2`
    function isArbitrumEnabled() external view override returns (uint8) {
        require(shouldRegisterGateway, "NOT_EXPECTED_CALL");
        return uint8(0xb1);
    }

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
    ) public payable override onlyOwner {
        // we temporarily set `shouldRegisterGateway` to true for the callback in registerTokenToL2 to succeed
        bool prev = shouldRegisterGateway;
        shouldRegisterGateway = true;

        address inbox = IOrbitGatewayRouter(router).inbox();
        address bridge = address(IInbox(inbox).bridge());

        // transfer fees from user to here, and approve router to use it
        {
            address nativeToken = IERC20Bridge(bridge).nativeToken();

            IERC20(nativeToken).safeTransferFrom(
                msg.sender,
                address(this),
                valueForGateway + valueForRouter
            );
            IERC20(nativeToken).approve(router, valueForRouter);
            IERC20(nativeToken).approve(gateway, valueForGateway);
        }

        IL1OrbitCustomGateway(gateway).registerTokenToL2(
            l2CustomTokenAddress,
            maxGasForCustomGateway,
            gasPriceBid,
            maxSubmissionCostForCustomGateway,
            creditBackAddress,
            valueForGateway
        );

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

            IERC20(nativeToken).approve(router, 0);
            IERC20(nativeToken).approve(gateway, 0);
        }

        shouldRegisterGateway = prev;
    }
}
