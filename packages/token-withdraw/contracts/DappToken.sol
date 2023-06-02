// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DappToken is ERC20 {
    /**
     * @dev See {ERC20-constructor}.
     *
     * An initial supply amount is passed, which is pre-minted and sent to the deployer.
     */
    constructor(uint256 _initialSupply) ERC20("Dapp Token", "DAPP") {
        _mint(msg.sender, _initialSupply * 10 ** decimals());
    }
}
