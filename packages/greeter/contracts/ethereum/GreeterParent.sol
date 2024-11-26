// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@arbitrum/nitro-contracts/src/bridge/Inbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/Outbox.sol";
import "../Greeter.sol";

contract GreeterParent is Greeter {
    address public childTarget;
    IInbox public inbox;

    event RetryableTicketCreated(uint256 indexed ticketId);

    constructor(
        string memory _greeting,
        address _childTarget,
        address _inbox
    ) Greeter(_greeting) {
        childTarget = _childTarget;
        inbox = IInbox(_inbox);
    }

    function updateChildTarget(address _childTarget) public {
        childTarget = _childTarget;
    }

    function setGreetingInChild(
        string memory _greeting,
        uint256 maxSubmissionCost,
        uint256 maxGas,
        uint256 gasPriceBid
    ) public payable returns (uint256) {
        bytes memory data = abi.encodeWithSelector(Greeter.setGreeting.selector, _greeting);
        uint256 ticketID = inbox.createRetryableTicket{ value: msg.value }(
            childTarget,
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

    /// @notice only childTarget can update greeting
    function setGreeting(string memory _greeting) public override {
        IBridge bridge = inbox.bridge();
        // this prevents reentrancies on Child-to-Parent transactions
        require(msg.sender == address(bridge), "NOT_BRIDGE");
        IOutbox outbox = IOutbox(bridge.activeOutbox());
        address childSender = outbox.l2ToL1Sender();
        require(childSender == childTarget, "Greeting only updateable by the child chain's contract");

        Greeter.setGreeting(_greeting);
    }
}
