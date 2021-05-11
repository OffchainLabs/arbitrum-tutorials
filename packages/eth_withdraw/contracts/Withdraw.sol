// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "arb-shared-dependencies/contracts/Arbsys.sol";
contract Withdraw {

    ArbSys constant arbsys = ArbSys(100);

    event L2ToL1TxCreated(uint256 indexed withdrawalId);

    function withdrawEth(address _destAddress) public payable
    {   

        uint256 withdrawalId = arbsys.withdrawEth(_destAddress);
        emit L2ToL1TxCreated(withdrawalId);

    }
    
    function sendTxToL1(address _destAddress, bytes calldata calldataForL1) public payable
    {
        uint256 withdrawalId = arbsys.sendTxToL1(_destAddress);
        emit L2ToL1TxCreated(withdrawalId);
    }
    
}

