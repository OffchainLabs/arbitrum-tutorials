// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;


import "./Arbsys.sol";

contract Withdraw {

    ArbSys constant arbsys = ArbSys(100);

    event L2ToL1TxCreated(uint256 indexed withdrawalId);

    function withdrawEth(address _destAddress) public payable
    {   

        uint256 withdrawalId = arbsys.withdrawEth(_destAddress);
        emit L2ToL1TxCreated(withdrawalId);

    }
    

    
}

