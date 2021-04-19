// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "./Inbox.sol";
import "../Greeter.sol";

contract GreeterL2 is Greeter {
    address l2Target;
    IInbox inbox;

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
        return ticketID;
    }
}
