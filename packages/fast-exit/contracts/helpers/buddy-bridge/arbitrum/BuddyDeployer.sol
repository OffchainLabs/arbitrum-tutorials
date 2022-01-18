// SPDX-License-Identifier: Apache-2.0
pragma solidity  >=0.6.11;

import "arbos-precompiles/arbos/builtin/ArbSys.sol";
import "../ethereum/L1Buddy.sol";

contract BuddyDeployer {
    constructor() public {}

    event Deployed(address indexed _sender, address indexed _contract, uint256 indexed withdrawalId, bool _success);

    function executeBuddyDeploy(bytes memory contractInitCode) external payable {
        // we don't want nasty address clashes
        require(tx.origin == msg.sender, "Function cant be called by L2 contract");
        // require(ArbSys(100).isTopLevelCall(), "Function must be called from L1");

        address user = msg.sender;
        uint256 salt = uint256(user);
        address addr;
        bool success;
        assembly {
            addr := create2(
                callvalue(), // wei sent in call
                add(contractInitCode, 0x20), // skip 32 bytes from rlp encoding length of bytearray
                mload(contractInitCode),
                salt
            )
            success := not(iszero(extcodesize(addr)))
        }

        // L1 callback to buddy
        /*
            If it calls back to an EOA the L1 call just won't execute as there is no function matching
            the selector, neither a fallback function to be executed.
        */
        bytes memory calldataForL1 =
            abi.encodeWithSelector(L1Buddy.finalizeBuddyDeploy.selector, success);
        uint256 withdrawalId = ArbSys(100).sendTxToL1(user, calldataForL1);
        emit Deployed(user, addr, withdrawalId, success);
    }
}