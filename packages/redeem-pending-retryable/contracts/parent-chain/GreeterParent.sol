// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@arbitrum/nitro-contracts/src/bridge/Inbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/Outbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/IERC20Inbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/IERC20Bridge.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../Greeter.sol";

contract GreeterParent is Greeter {
    using SafeERC20 for IERC20;

    address public childTarget;
    address public inbox;

    event RetryableTicketCreated(uint256 indexed ticketId);

    constructor(string memory _greeting, address _childTarget, address _inbox) Greeter(_greeting) {
        childTarget = _childTarget;
        inbox = _inbox;
    }

    function updateChildTarget(address _childTarget) public {
        childTarget = _childTarget;
    }

    function setGreetingInChild(
        string memory _greeting,
        uint256 maxSubmissionCost,
        uint256 maxGas,
        uint256 gasPriceBid
    ) public payable returns (uint256) {
        bytes memory data = abi.encodeWithSelector(Greeter.setGreeting.selector, _greeting);

        // Find out if this chain uses a custom gas token
        address bridge = address(IInbox(inbox).bridge());
        address nativeToken;
        try IERC20Bridge(bridge).nativeToken() returns (address nativeTokenAddress) {
            nativeToken = nativeTokenAddress;
        } catch {}

        uint256 ticketID;
        if (nativeToken == address(0)) {
            // Chain uses ETH as the gas token
            ticketID = IInbox(inbox).createRetryableTicket{ value: msg.value }(
                childTarget,
                0,
                maxSubmissionCost,
                msg.sender,
                msg.sender,
                maxGas,
                gasPriceBid,
                data
            );
        } else {
            // Chain uses a custom gas token
            // l2callvalue + maxSubmissionCost + execution fee
            uint256 tokenAmount = 0 + maxSubmissionCost + (maxGas * gasPriceBid);

            IERC20(nativeToken).safeTransferFrom(msg.sender, address(this), tokenAmount);
            IERC20(nativeToken).approve(inbox, tokenAmount);

            ticketID = IERC20Inbox(inbox).createRetryableTicket(
                childTarget,
                0,
                maxSubmissionCost,
                msg.sender,
                msg.sender,
                maxGas,
                gasPriceBid,
                tokenAmount,
                data
            );
        }

        emit RetryableTicketCreated(ticketID);
        return ticketID;
    }

    /// @notice only childTarget can update greeting
    function setGreeting(string memory _greeting) public override {
        IBridge bridge = IInbox(inbox).bridge();
        // this prevents reentrancies on Child-to-Parent transactions
        require(msg.sender == address(bridge), "NOT_BRIDGE");
        IOutbox outbox = IOutbox(bridge.activeOutbox());
        address childSender = outbox.l2ToL1Sender();
        require(
            childSender == childTarget,
            "Greeting only updateable by the child chain's contract"
        );

        Greeter.setGreeting(_greeting);
    }
}
