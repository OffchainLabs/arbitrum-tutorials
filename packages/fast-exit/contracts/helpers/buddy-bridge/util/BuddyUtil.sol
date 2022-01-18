// SPDX-License-Identifier: Apache-2.0
pragma solidity  >=0.6.11;

library BuddyUtil {
    function calculateL2Address(
        address _deployer,
        address _l1Address,
        bytes32 _codeHash
    )
        internal
        pure
        returns (address)
    {
        bytes32 salt = bytes32(uint256(_l1Address));
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                _deployer,
                salt,
                _codeHash
            )
        );
        return address(uint160(uint256(hash)));
    }
}