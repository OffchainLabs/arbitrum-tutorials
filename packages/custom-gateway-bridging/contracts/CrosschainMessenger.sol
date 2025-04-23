// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@arbitrum/nitro-contracts/src/bridge/IBridge.sol";
import "@arbitrum/nitro-contracts/src/bridge/IInbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/IERC20Inbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/IOutbox.sol";
import "@arbitrum/nitro-contracts/src/precompiles/ArbSys.sol";
import "@arbitrum/nitro-contracts/src/libraries/AddressAliasHelper.sol";

/**
 * @title Minimum expected implementation of a crosschain messenger contract to be deployed on L1
 */
abstract contract L1CrosschainMessenger {
    address public immutable inbox;

    /**
     * Emitted when calling sendTxToL2CustomRefund
     * @param from account that submitted the retryable ticket
     * @param to account recipient of the retryable ticket
     * @param seqNum id for the retryable ticket
     * @param data data of the retryable ticket
     */
    event TxToL2(address indexed from, address indexed to, uint256 indexed seqNum, bytes data);

    constructor(address inbox_) {
        inbox = inbox_;
    }

    modifier onlyCounterpartGateway(address l2Counterpart) {
        // A message coming from the counterpart gateway was executed by the bridge
        IBridge bridge = IInbox(inbox).bridge();
        require(msg.sender == address(bridge), "NOT_FROM_BRIDGE");

        // And the outbox reports that the L2 address of the sender is the counterpart gateway
        address l2ToL1Sender = IOutbox(bridge.activeOutbox()).l2ToL1Sender();
        require(l2ToL1Sender == l2Counterpart, "ONLY_COUNTERPART_GATEWAY");

        _;
    }

    /**
     * Creates the retryable ticket to send over to L2 through the Inbox
     * @param to account to be credited with the tokens in the destination layer
     * @param refundTo account, or its L2 alias if it have code in L1, to be credited with excess gas refund in L2
     * @param user account with rights to cancel the retryable and receive call value refund
     * @param l1CallValue callvalue sent in the L1 submission transaction
     * @param l2CallValue callvalue for the L2 message
     * @param maxSubmissionCost max gas deducted from user's L2 balance to cover base submission fee
     * @param maxGas max gas deducted from user's L2 balance to cover L2 execution
     * @param gasPriceBid gas price for L2 execution
     * @param data encoded data for the retryable
     * @return seqNum id for the retryable ticket
     */
    function _sendTxToL2CustomRefund(
        address to,
        address refundTo,
        address user,
        uint256 l1CallValue,
        uint256 l2CallValue,
        uint256 maxSubmissionCost,
        uint256 maxGas,
        uint256 gasPriceBid,
        bytes memory data
    ) internal virtual returns (uint256 seqNum) {
        seqNum = IInbox(inbox).createRetryableTicket{ value: l1CallValue }(
            to,
            l2CallValue,
            maxSubmissionCost,
            refundTo,
            user,
            maxGas,
            gasPriceBid,
            data
        );

        emit TxToL2(user, to, seqNum, data);
    }
}

/**
 * @title Minimum expected implementation of a crosschain messenger contract to be deployed on L1
 *        when using a custom gas orbit chain
 */
abstract contract L1CrosschainMessengerCustomGas is L1CrosschainMessenger {
    /**
     * Creates the retryable ticket to send over to L2 through the Inbox
     * @param to account to be credited with the tokens in the destination layer
     * @param refundTo account, or its L2 alias if it have code in L1, to be credited with excess gas refund in L2
     * @param user account with rights to cancel the retryable and receive call value refund
     * @param l1CallValue callvalue sent in the L1 submission transaction
     * @param l2CallValue callvalue for the L2 message
     * @param maxSubmissionCost max gas deducted from user's L2 balance to cover base submission fee
     * @param maxGas max gas deducted from user's L2 balance to cover L2 execution
     * @param gasPriceBid gas price for L2 execution
     * @param data encoded data for the retryable
     * @return seqNum id for the retryable ticket
     */
    function _sendTxToL2CustomRefund(
        address to,
        address refundTo,
        address user,
        uint256 l1CallValue,
        uint256 l2CallValue,
        uint256 maxSubmissionCost,
        uint256 maxGas,
        uint256 gasPriceBid,
        bytes memory data
    ) internal override returns (uint256 seqNum) {
        seqNum = IERC20Inbox(inbox).createRetryableTicket(
            to,
            l2CallValue,
            maxSubmissionCost,
            refundTo,
            user,
            maxGas,
            gasPriceBid,
            l1CallValue,
            data
        );

        emit TxToL2(user, to, seqNum, data);
    }
}

/**
 * @title Minimum expected implementation of a crosschain messenger contract to be deployed on L2
 */
abstract contract L2CrosschainMessenger {
    address internal constant ARB_SYS_ADDRESS = address(100);

    /**
     * Emitted when calling sendTxToL1
     * @param from account that submits the L2-to-L1 message
     * @param to account recipient of the L2-to-L1 message
     * @param id id for the L2-to-L1 message
     * @param data data of the L2-to-L1 message
     */
    event TxToL1(address indexed from, address indexed to, uint256 indexed id, bytes data);

    modifier onlyCounterpartGateway(address l1Counterpart) {
        require(
            msg.sender == AddressAliasHelper.applyL1ToL2Alias(l1Counterpart),
            "ONLY_COUNTERPART_GATEWAY"
        );

        _;
    }

    /**
     * Creates an L2-to-L1 message to send over to L1 through ArbSys
     * @param from account that is sending funds from L2
     * @param to account to be credited with the tokens in the destination layer
     * @param data encoded data for the L2-to-L1 message
     * @return id id for the L2-to-L1 message
     */
    function _sendTxToL1(address from, address to, bytes memory data) internal returns (uint256) {
        uint256 id = ArbSys(ARB_SYS_ADDRESS).sendTxToL1(to, data);

        emit TxToL1(from, to, id, data);
        return id;
    }
}
