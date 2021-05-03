pragma solidity ^0.7.0;


import "arb-shared-dependencies/contracts/Inbox.sol";

contract Payment {

    IInbox public inbox;
    constructor( address _inbox) public  {
      
        inbox = IInbox(_inbox);
    }
    mapping(address => uint256) public EtherBalance;
    
    function depositEther(address _destAddress) public payable
    {   

        inbox.depositEth{value: msg.value}(_destAddress);
        EtherBalance[_destAddress] += msg.value;

    }

    
}

