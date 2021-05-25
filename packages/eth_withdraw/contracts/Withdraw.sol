// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "arb-shared-dependencies/contracts/ArbSys.sol";
contract Withdraw {

    ArbSys constant arbsys = ArbSys(100);

    event L2ToL1TxCreated(uint256 indexed withdrawalId);

    
    function sendTxToL1(address _destAddress, bytes calldata _calldataForL1) public payable returns(uint)
    {
        uint withdrawalId = arbsys.sendTxToL1(_destAddress, _calldataForL1);
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

