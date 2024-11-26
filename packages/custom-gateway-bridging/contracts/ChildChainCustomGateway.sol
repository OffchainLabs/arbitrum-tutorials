// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./interfaces/ICustomGateway.sol";
import "./CrosschainMessenger.sol";
import "./interfaces/IArbToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Example implementation of a custom gateway to be deployed on L2
 * @dev Inheritance of Ownable is optional. In this case we use it to call the function setTokenBridgeInformation
 * and simplify the test
 */
contract ChildChainCustomGateway is IL2CustomGateway, L2CrosschainMessenger, Ownable {
    // Exit number (used for tradeable exits)
    uint256 public exitNum;

    // Token bridge state variables
    address public l1CustomToken;
    address public l2CustomToken;
    address public l1Gateway;
    address public router;

    // Custom functionality
    bool public allowsWithdrawals;

    /**
     * Contract constructor, sets the L2 router to be used in the contract's functions
     * @param router_ L2GatewayRouter address
     */
    constructor(address router_) {
        router = router_;
        allowsWithdrawals = false;
    }

    /**
     * Sets the information needed to use the gateway. To simplify the process of testing, this function can be called once
     * by the owner of the contract to set these addresses.
     * @param l1CustomToken_ address of the custom token on L1
     * @param l2CustomToken_ address of the custom token on L2
     * @param l1Gateway_ address of the counterpart gateway (on L1)
     */
    function setTokenBridgeInformation(
        address l1CustomToken_,
        address l2CustomToken_,
        address l1Gateway_
    ) public onlyOwner {
        require(l1CustomToken == address(0), "Token bridge information already set");
        l1CustomToken = l1CustomToken_;
        l2CustomToken = l2CustomToken_;
        l1Gateway = l1Gateway_;

        // Allows withdrawals after the information has been set
        allowsWithdrawals = true;
    }

    /// @dev See {ICustomGateway-outboundTransfer}
    function outboundTransfer(
        address l1Token,
        address to,
        uint256 amount,
        bytes calldata data
    ) public payable returns (bytes memory) {
        return outboundTransfer(l1Token, to, amount, 0, 0, data);
    }

    /// @dev See {ICustomGateway-outboundTransfer}
    function outboundTransfer(
        address l1Token,
        address to,
        uint256 amount,
        uint256, /* _maxGas */
        uint256, /* _gasPriceBid */
        bytes calldata data
    ) public payable override returns (bytes memory res) {
        // Only execute if deposits are allowed
        require(allowsWithdrawals == true, "Withdrawals are currently disabled");

        // The function is marked as payable to conform to the inheritance setup
        // This particular code path shouldn't have a msg.value > 0
        require(msg.value == 0, "NO_VALUE");
        
        // Only allow the custom token to be bridged through this gateway
        require(l1Token == l1CustomToken, "Token is not allowed through this gateway");

        (address from, bytes memory extraData) = _parseOutboundData(data);

        // The inboundEscrowAndCall functionality has been disabled, so no data is allowed
        require(extraData.length == 0, "EXTRA_DATA_DISABLED");

        // Burns L2 tokens in order to release escrowed L1 tokens
        IArbToken(l2CustomToken).bridgeBurn(from, amount);

        // Current exit number for this operation
        uint256 currExitNum = exitNum++;

        // We override the res field to save on the stack
        res = getOutboundCalldata(l1Token, from, to, amount, extraData);

        // Trigger the crosschain message
        uint256 id = _sendTxToL1(
            from,
            l1Gateway,
            res
        );

        emit WithdrawalInitiated(l1Token, from, to, id, currExitNum, amount);
        return abi.encode(id);
    }

    /// @dev See {ICustomGateway-finalizeInboundTransfer}
    function finalizeInboundTransfer(
        address l1Token,
        address from,
        address to,
        uint256 amount,
        bytes calldata data
    ) public payable override onlyCounterpartGateway(l1Gateway) {
        // Only allow the custom token to be bridged through this gateway
        require(l1Token == l1CustomToken, "Token is not allowed through this gateway");

        // Abi decode may revert, but the encoding is done by L1 gateway, so we trust it
        (, bytes memory callHookData) = abi.decode(data, (bytes, bytes));
        if (callHookData.length != 0) {
            // callHookData should always be 0 since inboundEscrowAndCall is disabled
            callHookData = bytes("");
        }

        // Mints L2 tokens
        IArbToken(l2CustomToken).bridgeMint(to, amount);

        emit DepositFinalized(l1Token, from, to, amount);
    }

    /// @dev See {ICustomGateway-getOutboundCalldata}
    function getOutboundCalldata(
        address l1Token,
        address from,
        address to,
        uint256 amount,
        bytes memory data
    ) public view override returns (bytes memory outboundCalldata) {
        outboundCalldata = abi.encodeWithSelector(
            ICustomGateway.finalizeInboundTransfer.selector,
            l1Token,
            from,
            to,
            amount,
            abi.encode(exitNum, data)
        );

        return outboundCalldata;
    }

    /// @dev See {ICustomGateway-calculateL2TokenAddress}
    function calculateL2TokenAddress(address l1Token) public view override returns (address) {
        if (l1Token == l1CustomToken) {
            return l2CustomToken;
        }
        
        return address(0);
    }

    /// @dev See {ICustomGateway-counterpartGateway}
    function counterpartGateway() public view override returns (address) {
        return l1Gateway;
    }

    /**
     * Parse data received in outboundTransfer
     * @param data encoded data received
     * @return from account that initiated the deposit,
     *         extraData decoded data
     */
    function _parseOutboundData(bytes memory data)
    internal
    view
    returns (
        address from,
        bytes memory extraData
    )
    {
        if (msg.sender == router) {
            // Router encoded
            (from, extraData) = abi.decode(data, (address, bytes));
        } else {
            from = msg.sender;
            extraData = data;
        }
    }

    // --------------------
    // Custom methods
    // --------------------
    /**
     * Disables the ability to deposit funds
     */
    function disableWithdrawals() external onlyOwner {
        allowsWithdrawals = false;
    }

    /**
     * Enables the ability to deposit funds
     */
    function enableWithdrawals() external onlyOwner {
        require(l1CustomToken != address(0), "Token bridge information has not been set yet");
        allowsWithdrawals = true;
    }
}
