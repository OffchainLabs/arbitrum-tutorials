// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/**
 * @title Minimum expected interface for L2 token that interacts with the L2 token bridge (this is the interface necessary
 * for a custom token that interacts with the bridge).
 */
interface IArbToken {
    /**
     * Should increase token supply by amount, and should only be callable by the L1 gateway.
     * @param account Account to be credited with the tokens in the L2
     * @param amount Token amount
     */
    function bridgeMint(address account, uint256 amount) external;

    /**
     * Should decrease token supply by amount.
     * @param account Account whose tokens will be burned in the L2, to be released on L1
     * @param amount Token amount
     */
    function bridgeBurn(address account, uint256 amount) external;

    /**
     * @return address of layer 1 token
     */
    function l1Address() external view returns (address);
}