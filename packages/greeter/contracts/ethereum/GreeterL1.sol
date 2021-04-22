// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "./Outbox.sol";
import "./Inbox.sol";
import "../Greeter.sol";

contract GreeterL1 is Greeter {
    address l2Target;
    IInbox inbox;

    event RetryableTicketCreated(uint256 indexed ticketId);

    constructor(
        string memory _greeting,
        address _l2Target,
        address _inbox
    ) public Greeter(_greeting) {
        l2Target = _l2Target;
        inbox = IInbox(_inbox);
    }

    function setGreetingInL2(
        string memory _greeting,
        uint256 maxSubmissionCost,
        uint256 maxGas,
        uint256 gasPriceBid
    ) public returns (uint256) {
        bytes memory data =
            abi.encodeWithSelector(Greeter.setGreeting.selector, _greeting);
        
        uint256 ticketID = inbox.createRetryableTicket(
            l2Target,
            0,
            maxSubmissionCost,
            msg.sender,
            msg.sender,
            maxGas,
            gasPriceBid,
            data
        );

        emit RetryableTicketCreated(ticketID);
        return ticketID;
    }

    /// @notice only l2Target can update greeting
    function setGreeting(string memory _greeting) public override {
        IOutbox outbox = IOutbox(inbox.bridge().activeOutbox());
        address l2Sender = outbox.l2ToL1Sender();
        require(l2Sender == l2Target, "Greeting only updateable by L2");

        Greeter.setGreeting(_greeting);
    }
}
