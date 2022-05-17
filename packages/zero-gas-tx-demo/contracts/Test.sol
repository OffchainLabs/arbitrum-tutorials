// SPDX-License-Identifier: Apache-2.0
pragma solidity  >=0.6.11;

contract Test {

    uint256 public variable;

    function updateVar(uint256 _var) public returns (uint256){
       variable = _var;
       return variable;
    }

}
