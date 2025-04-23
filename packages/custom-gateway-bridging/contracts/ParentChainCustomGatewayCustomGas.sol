// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./interfaces/ICustomGateway.sol";
import "./CrosschainMessenger.sol";
import "@arbitrum/token-bridge-contracts/contracts/tokenbridge/ethereum/ICustomToken.sol";
import "@arbitrum/token-bridge-contracts/contracts/tokenbridge/libraries/IERC20Bridge.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Example implementation of a custom gateway to be deployed on L1
 * @dev Inheritance of Ownable is optional. In this case we use it to call the function setTokenBridgeInformation
 * and simplify the test
 */
contract ParentChainCustomGateway is IL1CustomGateway, L1CrosschainMessengerCustomGas, Ownable {
    // Token bridge state variables
    address public l1CustomToken;
    address public l2CustomToken;
    address public l2Gateway;
    address public router;

    // Custom functionality
    bool public allowsDeposits;

    /**
     * Contract constructor, sets the L1 router to be used in the contract's functions and calls L1CrosschainMessenger's constructor
     * @param router_ L1GatewayRouter address
     * @param inbox_ Inbox address
     */
    constructor(address router_, address inbox_) L1CrosschainMessenger(inbox_) {
        router = router_;
        allowsDeposits = false;
    }

    /**
     * Sets the information needed to use the gateway. To simplify the process of testing, this function can be called once
     * by the owner of the contract to set these addresses.
     * @param l1CustomToken_ address of the custom token on L1
     * @param l2CustomToken_ address of the custom token on L2
     * @param l2Gateway_ address of the counterpart gateway (on L2)
     */
    function setTokenBridgeInformation(
        address l1CustomToken_,
        address l2CustomToken_,
        address l2Gateway_
    ) public onlyOwner {
        require(l1CustomToken == address(0), "Token bridge information already set");
        l1CustomToken = l1CustomToken_;
        l2CustomToken = l2CustomToken_;
        l2Gateway = l2Gateway_;

        // Allows deposits after the information has been set
        allowsDeposits = true;
    }

    /// @dev See {ICustomGateway-outboundTransfer}
    function outboundTransfer(
        address l1Token,
        address to,
        uint256 amount,
        uint256 maxGas,
        uint256 gasPriceBid,
        bytes calldata data
    ) public payable override returns (bytes memory) {
        return outboundTransferCustomRefund(l1Token, to, to, amount, maxGas, gasPriceBid, data);
    }

    /// @dev See {IL1CustomGateway-outboundTransferCustomRefund}
    function outboundTransferCustomRefund(
        address l1Token,
        address refundTo,
        address to,
        uint256 amount,
        uint256 maxGas,
        uint256 gasPriceBid,
        bytes calldata data
    ) public payable override returns (bytes memory res) {
        // Only execute if deposits are allowed
        require(allowsDeposits, "Deposits are currently disabled");

        // Only allow calls from the router
        require(msg.sender == router, "Call not received from router");

        // Only allow the custom token to be bridged through this gateway
        require(l1Token == l1CustomToken, "Token is not allowed through this gateway");

        // Not allow value for custom gas token chains
        // (We should be able to override this function as non-payable in the future, but this is now not allowed)
        require(msg.value == 0, "Value not allowed");

        address from;
        uint256 seqNum;
        {
            uint256 maxSubmissionCost;
            uint256 tokenTotalFeeAmount;
            {
                bytes memory extraData;
                (from, maxSubmissionCost, extraData, tokenTotalFeeAmount) = _parseOutboundData(
                    data
                );

                // The inboundEscrowAndCall functionality has been disabled, so no data is allowed
                require(extraData.length == 0, "EXTRA_DATA_DISABLED");

                // Escrowing the tokens in the gateway
                IERC20(l1Token).transferFrom(from, address(this), amount);

                // We override the res field to save on the stack
                res = getOutboundCalldata(l1Token, from, to, amount, extraData);
            }

            // transfer fees from user to here, and approve router to use it
            approveCustomGasTokenForInbox(from, tokenTotalFeeAmount);

            // Trigger the crosschain message
            seqNum = _sendTxToL2CustomRefund(
                l2Gateway,
                refundTo,
                from,
                tokenTotalFeeAmount,
                0,
                maxSubmissionCost,
                maxGas,
                gasPriceBid,
                res
            );

            // reset allowance back to 0 in case not all approved native tokens are spent
            approveCustomGasTokenForInbox(from, 0);
        }

        emit DepositInitiated(l1Token, from, to, seqNum, amount);
        res = abi.encode(seqNum);
    }

    /// @dev See {ICustomGateway-finalizeInboundTransfer}
    function finalizeInboundTransfer(
        address l1Token,
        address from,
        address to,
        uint256 amount,
        bytes calldata data
    ) public payable override onlyCounterpartGateway(l2Gateway) {
        // Only allow the custom token to be bridged through this gateway
        require(l1Token == l1CustomToken, "Token is not allowed through this gateway");

        // Decoding exitNum
        (uint256 exitNum, ) = abi.decode(data, (uint256, bytes));

        // Releasing the tokens in the gateway
        IERC20(l1Token).transfer(to, amount);

        emit WithdrawalFinalized(l1Token, from, to, exitNum, amount);
    }

    /// @dev See {ICustomGateway-getOutboundCalldata}
    function getOutboundCalldata(
        address l1Token,
        address from,
        address to,
        uint256 amount,
        bytes memory data
    ) public pure override returns (bytes memory outboundCalldata) {
        bytes memory emptyBytes = "";

        outboundCalldata = abi.encodeWithSelector(
            ICustomGateway.finalizeInboundTransfer.selector,
            l1Token,
            from,
            to,
            amount,
            abi.encode(emptyBytes, data)
        );
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
        return l2Gateway;
    }

    /**
     * Parse data received in outboundTransfer
     * @param data encoded data received
     * @return from account that initiated the deposit,
     *         maxSubmissionCost max gas deducted from user's L2 balance to cover base submission fee,
     *         extraData decoded data
     */
    function _parseOutboundData(
        bytes calldata data
    )
        internal
        pure
        returns (
            address from,
            uint256 maxSubmissionCost,
            bytes memory extraData,
            uint256 tokenTotalFeeAmount
        )
    {
        // Router encoded
        (from, extraData) = abi.decode(data, (address, bytes));

        // User encoded
        (maxSubmissionCost, extraData, tokenTotalFeeAmount) = abi.decode(
            extraData,
            (uint256, bytes, uint256)
        );
    }

    /**
     * Approves custom gas token to be used by the Inbox
     * @param user User that initiated the deposit
     * @param value Amount of gas token to pay for the retryable ticket
     */
    function approveCustomGasTokenForInbox(address user, uint256 value) internal {
        address bridge = address(IInbox(inbox).bridge());
        address nativeToken = IERC20Bridge(bridge).nativeToken();
        if (value > 0) {
            IERC20(nativeToken).transferFrom(user, address(this), value);
        }
        IERC20(nativeToken).approve(inbox, value);
    }

    // --------------------
    // Custom methods
    // --------------------
    /**
     * Disables the ability to deposit funds
     */
    function disableDeposits() external onlyOwner {
        allowsDeposits = false;
    }

    /**
     * Enables the ability to deposit funds
     */
    function enableDeposits() external onlyOwner {
        require(l1CustomToken != address(0), "Token bridge information has not been set yet");
        allowsDeposits = true;
    }
}
