// SPDX-License-Identifier: GPL-3.0
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol";

pragma solidity ^0.8.0;

/**
 * @title Sponsor
 * @dev User pay the cost of L1 execution to the sponsor and get back the remained fund
 */
contract Sponsor is Ownable {

    address payable public sponsor;


    constructor(address payable _sponsor) Ownable() {
        require(_sponsor != address(0),"Set a non-zero address");
        sponsor = _sponsor;
   }

    /**
     * @dev Changing the sponsor address by Owner
     * @param _sponsor address of new sponsor
     */
    function setSponsor(address payable _sponsor) external onlyOwner {
        require(_sponsor != address(0),"Set a non-zero address");
        sponsor = _sponsor;
    }

    /**
     * @dev pays the cost to the sponsor and the remained ETH sent to the contrct to the user 
     * @param _gasAmount amount of gas that sponsor will need for executing the transaction 
     */
    function payToSponsor(uint256 _gasAmount) external payable{
        uint256 cost = _gasAmount * block.basefee;
        require(msg.value >= cost, "the fund is not enough");
        sponsor.transfer(cost);
        unchecked{
            payable(msg.sender).transfer(msg.value - cost);
        }
        
    }
}