// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@arbitrum/nitro-contracts/src/bridge/Inbox.sol";

contract EthDeposit {
    IInbox public inbox;

    event EthDeposited(uint256 indexed ticketId);
    event RetryableTicketCreated(uint256 indexed ticketId);

    constructor(address _inbox) {
        inbox = IInbox(_inbox);
    }

    function depositToChildChain() public payable returns (uint256) {
        uint256 ticketID = inbox.depositEth{ value: msg.value }();

        emit EthDeposited(ticketID);
        return ticketID;
    }

    function moveFundsFromChildChainAliasToAnotherAddress(
        address to,
        uint256 l2callvalue,
        uint256 maxSubmissionCost,
        uint256 maxGas,
        uint256 gasPriceBid
    ) public payable returns (uint256) {
        /**
         * We are using unsafeCreateRetryableTicket because the safe one will check if
         * the parent chain's msg.value can be used to pay for the child chain's callvalue, while in this case
         * we'll use child chain's balance to pay for the callvalue rather than parent chain's msg.value
         */
        uint256 ticketID = inbox.unsafeCreateRetryableTicket{ value: msg.value }(
            to,
            l2callvalue,
            maxSubmissionCost,
            msg.sender,
            msg.sender,
            maxGas,
            gasPriceBid,
            ""
        );
        emit RetryableTicketCreated(ticketID);
        return ticketID;
    }
}
