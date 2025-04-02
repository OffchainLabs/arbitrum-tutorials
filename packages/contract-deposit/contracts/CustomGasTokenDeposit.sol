// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@arbitrum/nitro-contracts/src/bridge/IERC20Inbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/IERC20Bridge.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract CustomGasTokenDeposit {
    using SafeERC20 for IERC20;

    IERC20Inbox public inbox;

    event CustomGasTokenDeposited(uint256 indexed ticketId);
    event RetryableTicketCreated(uint256 indexed ticketId);

    constructor(address _inbox) {
        inbox = IERC20Inbox(_inbox);
    }

    function depositToChildChain(uint256 amount) public returns (uint256) {
        // Transfer the native token to this contract
        // and allow Inbox to transfer those tokens
        address bridge = address(inbox.bridge());
        address nativeToken = IERC20Bridge(bridge).nativeToken();

        IERC20(nativeToken).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(nativeToken).approve(address(inbox), amount);

        uint256 ticketID = inbox.depositERC20(amount);

        emit CustomGasTokenDeposited(ticketID);
        return ticketID;
    }

    function moveFundsFromChildChainAliasToAnotherAddress(
        address to,
        uint256 l2callvalue,
        uint256 maxSubmissionCost,
        uint256 maxGas,
        uint256 gasPriceBid,
        uint256 tokenAmount
    ) public returns (uint256) {
        // Transfer the native token to this contract
        // and allow Inbox to transfer those tokens
        address bridge = address(inbox.bridge());
        address nativeToken = IERC20Bridge(bridge).nativeToken();

        IERC20(nativeToken).safeTransferFrom(msg.sender, address(this), tokenAmount);
        IERC20(nativeToken).approve(address(inbox), tokenAmount);

        /**
         * We are using unsafeCreateRetryableTicket because the safe one will check if
         * the parent chain's msg.value can be used to pay for the child chain's callvalue, while in this case
         * we'll use child chain's balance to pay for the callvalue rather than parent chain's msg.value
         */
        uint256 ticketID = inbox.unsafeCreateRetryableTicket(
            to,
            l2callvalue,
            maxSubmissionCost,
            msg.sender,
            msg.sender,
            maxGas,
            gasPriceBid,
            tokenAmount,
            ""
        );

        emit RetryableTicketCreated(ticketID);
        return ticketID;
    }
}
