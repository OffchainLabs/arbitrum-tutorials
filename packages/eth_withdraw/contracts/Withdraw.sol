// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "arb-shared-dependencies/contracts/Arbsys.sol";
contract Withdraw {

    ArbSys constant arbsys = ArbSys(100);

    event L2ToL1TxCreated(uint256 indexed withdrawalId);

    
    function sendTxToL1(address _destAddress) public payable returns(uint)
    {
        uint withdrawalId = arbsys.sendTxToL1(_destAddress);
        emit L2ToL1TxCreated(withdrawalId);
        return withdrawalId;
    }
    function withdrawEth(address _destAddress) public payable returns(uint)
    {   

        uint withdrawalId = arbsys.withdrawEth(_destAddress);
        emit L2ToL1TxCreated(withdrawalId);
        return withdrawalId;
    }
    
    
    
}

