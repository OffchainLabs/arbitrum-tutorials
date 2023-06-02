// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./interfaces/IArbToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract L2Token is ERC20, IArbToken {
    address public l2Gateway;
    address public override l1Address;

    modifier onlyL2Gateway() {
        require(msg.sender == l2Gateway, "NOT_GATEWAY");
        _;
    }

    constructor(address _l2Gateway, address _l1TokenAddress) ERC20("L2CustomToken", "LCT") {
        l2Gateway = _l2Gateway;
        l1Address = _l1TokenAddress;
    }

    /**
     * @notice should increase token supply by amount, and should only be callable by the L2Gateway.
     */
    function bridgeMint(address account, uint256 amount) external override onlyL2Gateway {
        _mint(account, amount);
    }

    /**
     * @notice should decrease token supply by amount, and should only be callable by the L2Gateway.
     */
    function bridgeBurn(address account, uint256 amount) external override onlyL2Gateway {
        _burn(account, amount);
    }
}
