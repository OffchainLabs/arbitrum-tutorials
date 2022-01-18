// SPDX-License-Identifier: Apache-2.0
pragma solidity  >=0.6.11;

import "arb-bridge-eth/contracts/bridge/Outbox.sol";
import "arb-bridge-eth/contracts/bridge/Inbox.sol";

import "../ethereum/L1Buddy.sol";
import "../util/BuddyUtil.sol";


contract TestConstructorBuddy is L1Buddy {
    constructor(
        address _inbox,
        address _l2Deployer,
        uint256 _maxSubmissionCost,
        uint256 _maxGas,
        uint256 _gasPrice,
        bytes memory _deployCode
    ) public payable L1Buddy(_inbox, _l2Deployer) {
        L1Buddy.initiateBuddyDeploy(_maxSubmissionCost, _maxGas, _gasPrice, _deployCode);
    }

    function handleDeploySuccess() internal override {
        // this deletes the codehash from state!
        L1Buddy.handleDeploySuccess();
    }

    function handleDeployFail() internal override {}
}

contract TestBuddy is L1Buddy {
    constructor(address _inbox, address _l2Deployer) public L1Buddy(_inbox, _l2Deployer) {}

    function handleDeploySuccess() internal override {
        // this deletes the codehash from state!
        L1Buddy.handleDeploySuccess();
    }

    function handleDeployFail() internal override {}
}