// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./interfaces/IArbToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Example implementation of a custom ERC20 token to be deployed on L2
 */
contract L2Token is ERC20, IArbToken {
    address public l2GatewayAddress;
    address public override l1Address;

    modifier onlyL2Gateway() {
        require(msg.sender == l2GatewayAddress, "NOT_GATEWAY");
        _;
    }

    /**
     * @dev See {ERC20-constructor}
     * @param l2GatewayAddress_ address of the L2 custom gateway
     * @param l1TokenAddress_ address of the custom token deployed on L1
     */
    constructor(
        address l2GatewayAddress_,
        address l1TokenAddress_
    ) ERC20("NoCustomGatewayRegOOPS", "OOPS") {
        l2GatewayAddress = l2GatewayAddress_;
        l1Address = l1TokenAddress_;
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
