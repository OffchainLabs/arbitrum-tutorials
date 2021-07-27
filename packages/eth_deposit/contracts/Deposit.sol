pragma solidity ^0.7.0;


import "arb-shared-dependencies/contracts/Inbox.sol";

contract Deposit {

    IInbox public inbox;
    constructor( address _inbox) public  {
      
        inbox = IInbox(_inbox);
    }
   
    
    function depositEther(uint256 _maxSubmissionCost) public payable
    {   
        // Note that gas price and gas are set to 0; for deposit Ether, we don't need / expect any execution to take place.
        inbox.createRetryableTicket{value: msg.value}(msg.sender, 0, _maxSubmissionCost, msg.sender, msg.sender, 0, 0, '0x');       
    
    
    }
    
}

