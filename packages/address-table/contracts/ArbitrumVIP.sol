//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.2;

import "@arbitrum/nitro-contracts/src/precompiles/ArbAddressTable.sol";
import "hardhat/console.sol";

contract ArbitrumVIP {
    string greeting;
    mapping(address => uint256) arbitrumVIPPoints; // Maps address to vip points. More points you have, cooler you are.

    ArbAddressTable arbAddressTable;

    constructor() public {
        // connect to precomiled address table contract
        arbAddressTable = ArbAddressTable(102);
    }

    function addVIPPoints(uint256 addressIndex) external {
        // retrieve address from address table
        address addressFromTable = arbAddressTable.lookupIndex(addressIndex);

        arbitrumVIPPoints[addressFromTable]++;
    }
}
