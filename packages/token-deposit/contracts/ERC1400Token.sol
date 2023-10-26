// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./UniversalToken/contracts/ERC1400.sol";

contract ERC1400Token is ERC1400 {
    constructor(uint256 _initialSupply, address[] memory initialControllers, bytes32[] memory defaultPartitions)
        ERC1400("ERC1400Token", "E14", 1, initialControllers, defaultPartitions)
    {
        _issueByPartition(defaultPartitions[0], msg.sender, msg.sender, _initialSupply * 10 ** 18, "");
    }
}
