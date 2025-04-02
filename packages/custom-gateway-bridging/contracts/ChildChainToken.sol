// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@arbitrum/token-bridge-contracts/contracts/tokenbridge/arbitrum/IArbToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Example implementation of a custom ERC20 token to be deployed on L2
 */
contract ChildChainToken is ERC20, IArbToken {
    address public gateway; // The child chain custom gateway contract
    address public override l1Address; // The address of the token on the parent chain

    modifier onlyL2Gateway() {
        require(msg.sender == gateway, "NOT_GATEWAY");
        _;
    }

    /**
     * @dev See {ERC20-constructor}
     * @param _gateway address of the L2 custom gateway
     * @param _l1Address address of the custom token deployed on L1
     */
    constructor(address _gateway, address _l1Address) ERC20("L2CustomToken", "LCT") {
        gateway = _gateway;
        l1Address = _l1Address;
    }

    /**
     * Should increase token supply by amount, and should only be callable by the L2Gateway.
     */
    function bridgeMint(address account, uint256 amount) external override onlyL2Gateway {
        _mint(account, amount);
    }

    /**
     * Should decrease token supply by amount, and should only be callable by the L2Gateway.
     */
    function bridgeBurn(address account, uint256 amount) external override onlyL2Gateway {
        _burn(account, amount);
    }
}
