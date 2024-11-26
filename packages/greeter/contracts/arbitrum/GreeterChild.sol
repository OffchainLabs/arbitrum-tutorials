// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@arbitrum/nitro-contracts/src/precompiles/ArbSys.sol";
import "@arbitrum/nitro-contracts/src/libraries/AddressAliasHelper.sol";
import "../Greeter.sol";

contract GreeterChild is Greeter {
    ArbSys constant arbsys = ArbSys(address(100));
    address public parentTarget;

    event ChildToParentTxCreated(uint256 indexed withdrawalId);

    constructor(string memory _greeting, address _parentTarget) Greeter(_greeting) {
        parentTarget = _parentTarget;
    }

    function updateParentTarget(address _parentTarget) public {
        parentTarget = _parentTarget;
    }

    function setGreetingInParent(string memory _greeting) public returns (uint256) {
        bytes memory data = abi.encodeWithSelector(Greeter.setGreeting.selector, _greeting);

        uint256 withdrawalId = arbsys.sendTxToL1(parentTarget, data);

        emit ChildToParentTxCreated(withdrawalId);
        return withdrawalId;
    }

    /// @notice only parentTarget can update greeting
    function setGreeting(string memory _greeting) public override {
        // To check that message came from the parent chain,
        // we check that the sender is the parent chain contract's alias.
        require(
            msg.sender == AddressAliasHelper.applyL1ToL2Alias(parentTarget),
            "Greeting only updateable by parent chain's address"
        );
        Greeter.setGreeting(_greeting);
    }
}
