//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "arb-shared-dependencies/contracts/ArbAddressTable.sol";


contract ArbitrumVIP {
  string greeting;
  mapping(address => uint) arbitrumVIPPoints; // Maps address to vip points. More points you have, cooler you are.
  
  ArbAddressTable arbAddressTable; 
  
  constructor(){
    // connect to precomiled address table contract
    arbAddressTable = ArbAddressTable(102);
  }

  function addVIPPoints (uint addressIndex ) external {
    // retreive address from address table
    address addressFromTable = arbAddressTable.lookupIndex(addressIndex);
    
    arbitrumVIPPoints[addressFromTable]++;
  }
}
