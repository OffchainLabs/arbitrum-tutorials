// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/**
 * @title Minimum expected interface for a custom gateway
 */
interface ICustomGateway {
    /**
     * Initiates an ERC20 token transfer between Ethereum and Arbitrum using the registered or otherwise default gateway
     * @dev Some legacy gateway might not have the outboundTransferCustomRefund method and will revert, in such case use outboundTransfer instead
     * @dev L2 address alias will not be applied to the following types of addresses on L1:
     *      - an externally-owned account
     *      - a contract in construction
     *      - an address where a contract will be created
     *      - an address where a contract lived, but was destroyed
     * @param l1Token L1 address of ERC20
     * @param to Account to be credited with the tokens in the counterpart layer (can be the user's account or a contract in the destination layer), not subject to L2 aliasing
                  In case of deposits (L1->L2), this account, or its L2 alias if it has code in L1, will also be able to cancel the retryable ticket and receive callvalue refund
     * @param amount Token Amount
     * @param maxGas Max gas deducted from user's L2 balance to cover L2 execution (only needed for deposits, L1->L2)
     * @param gasPriceBid Gas price for L2 execution (only needed for deposits, L1->L2)
     * @param data encoded data from router and user
     * @return res abi encoded inbox sequence number in case of deposits (L1->L2) or id from ArbSys call in case of withdrawals (L2->L1)
     */
    function outboundTransfer(
        address l1Token,
        address to,
        uint256 amount,
        uint256 maxGas,
        uint256 gasPriceBid,
        bytes calldata data
    ) external payable returns (bytes memory);

    /**
     * In case of deposits (L1->L2), mints tokens on L2 upon L1 deposit. In case of withdrawals (L2->L1), release tokens on L1.
     * @dev Callable only by the L1Gateway.outboundTransfer method, or L2Gateway.outboundTransfer method
     * @param l1Token L1 address of ERC20
     * @param from account that initiated the deposit in the L1, or the withdrawal on L2
     * @param to account to be credited with the tokens in the destination layer
     * @param amount token amount to be credited to the user
     * @param data encoded additional callhook data, and exitNum (sequentially increasing exit counter determined by the L2Gateway) for withdrawals (L2->L1)
     */
    function finalizeInboundTransfer(
        address l1Token,
        address from,
        address to,
        uint256 amount,
        bytes calldata data
    ) external payable;

    /**
     * Returns the data to be added to the outboundTransfer calls
     * @param l1Token L1 address of ERC20
     * @param from account that will initiate the deposit in the L1, or the withdrawal on L2
     * @param to account to be credited with the tokens in the destination layer
     * @param amount token amount to be credited to the user
     * @param data encoded additional callhook data, and exitNum (sequentially increasing exit counter determined by the L2Gateway) for withdrawals (L2->L1)
     */
    function getOutboundCalldata(
        address l1Token,
        address from,
        address to,
        uint256 amount,
        bytes memory data
    ) external view returns (bytes memory);

    /**
     * Calculate the address used when bridging an ERC20 token
     * @dev the L1 and L2 address oracles may not always be in sync.
     * For example, a custom token may have been registered but not deploy or the contract self destructed.
     * @param l1Token address of L1 token
     * @return L2 address of a bridged ERC20 token
     */
    function calculateL2TokenAddress(address l1Token) external view returns (address);

    /**
     * Returns the address of the counterpart gateway
     */
    function counterpartGateway() external view returns (address);
}

/**
 * @title Minimum expected interface for a custom gateway to be deployed on L1
 */
interface IL1CustomGateway is ICustomGateway {
    /**
     * Emitted when calling outboundTransfer
     * @param l1Token L1 address of ERC20
     * @param from account that initiated the deposit in the L1
     * @param to account to be credited with the tokens in the L2
     * @param sequenceNumber id for retryable ticket
     * @param amount token amount to be credited to the user
     */
    event DepositInitiated(
        address l1Token,
        address indexed from,
        address indexed to,
        uint256 indexed sequenceNumber,
        uint256 amount
    );

    /**
     * Emitted when receiving the call in finalizeInboundTransfer
     * @param l1Token L1 address of ERC20
     * @param from account that initiated the deposit in the L1
     * @param to account that was credited with the tokens in the L2
     * @param exitNum sequentially increasing exit counter determined by the L2Gateway
     * @param amount token amount to be credited to the user
     */
    event WithdrawalFinalized(
        address l1Token,
        address indexed from,
        address indexed to,
        uint256 indexed exitNum,
        uint256 amount
    );

    /**
     * Initiates an ERC20 token transfer between Ethereum and Arbitrum using the registered or otherwise default gateway
     * @dev Some legacy gateway might not have the outboundTransferCustomRefund method and will revert, in such case use outboundTransfer instead
     * @dev L2 address alias will not be applied to the following types of addresses on L1:
     *      - an externally-owned account
     *      - a contract in construction
     *      - an address where a contract will be created
     *      - an address where a contract lived, but was destroyed
     * @param l1Token L1 address of ERC20
     * @param refundTo Account, or its L2 alias if it have code in L1, to be credited with excess gas refund in L2
     * @param to Account to be credited with the tokens in the counterpart layer (can be the user's account or a contract in the destination layer), not subject to L2 aliasing
                  In case of deposits (L1->L2), this account, or its L2 alias if it has code in L1, will also be able to cancel the retryable ticket and receive callvalue refund
     * @param amount Token Amount
     * @param maxGas Max gas deducted from user's L2 balance to cover L2 execution (only needed for deposits, L1->L2)
     * @param gasPriceBid Gas price for L2 execution (only needed for deposits, L1->L2)
     * @param data encoded data from router and user
     * @return res abi encoded inbox sequence number
     */
    function outboundTransferCustomRefund(
        address l1Token,
        address refundTo,
        address to,
        uint256 amount,
        uint256 maxGas,
        uint256 gasPriceBid,
        bytes calldata data
    ) external payable returns (bytes memory);
}

/**
 * @title Minimum expected interface for a custom gateway to be deployed on L2
 */
interface IL2CustomGateway is ICustomGateway {
    /**
     * Emitted when calling outboundTransfer
     * @param l1Token L1 address of ERC20
     * @param from account that initiated the deposit in the L1
     * @param to account that was credited with the tokens in the L2
     * @param l2ToL1Id unique identifier for the L2-to-L1 transaction
     * @param exitNum sequentially increasing exit counter determined by the L2Gateway
     * @param amount token amount to be credited to the user
     */
    event WithdrawalInitiated(
        address l1Token,
        address indexed from,
        address indexed to,
        uint256 indexed l2ToL1Id,
        uint256 exitNum,
        uint256 amount
    );

    /**
     * Emitted when receiving the call in finalizeInboundTransfer
     * @param l1Token L1 address of ERC20
     * @param from account that initiated the deposit in the L1
     * @param to account to be credited with the tokens in the L2
     * @param amount token amount to be credited to the user
     */
    event DepositFinalized(
        address indexed l1Token,
        address indexed from,
        address indexed to,
        uint256 amount
    );
}