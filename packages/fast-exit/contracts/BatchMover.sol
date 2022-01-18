pragma solidity  >=0.6.11;

import "./MMR.sol";


import "arb-bridge-peripherals/contracts/tokenbridge/arbitrum/StandardArbERC20.sol";
import "arb-bridge-peripherals/contracts/tokenbridge/arbitrum/gateway/L2ArbitrumGateway.sol";

//import "arbos-precompiles/arbos/builtin/ArbSys.sol";

import "./helpers/buddy-bridge/ethereum/L1Buddy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ArbBatchTokenMover {
    using MMR for MMR.Tree;

    MMR.Tree withdrawalTree;
    uint256 exitBlock;
    StandardArbERC20 erc20;
    L2ArbitrumGateway gateway;

    function withdrawInBatch(uint256 amount) external {
        require(erc20.transferFrom(msg.sender, address(this), amount), "TRANSFER_FAILED");
        withdrawalTree.append(abi.encode(msg.sender, amount));
    }

    function exitToL1() external {
        require(block.number >= exitBlock, "TOO_SOON");
        address l1Addr = erc20.l1Address();
        ArbSys(100).sendTxToL1(
            address(this),
            abi.encodeWithSignature(
                "distributeBatch(bytes32,address)",
                withdrawalTree.getRoot(),
                l1Addr
            )
        );

        gateway.outboundTransfer(l1Addr, address(this), erc20.balanceOf(address(this)), 0, 0, "0x");
        selfdestruct(msg.sender);
    }
}

contract EthBatchTokenReceiver is L1Buddy {
    bytes32 root;
    IERC20 erc20;
    mapping(uint256 => bool) redeemed;

    constructor(
        address _inbox,
        address _l2Deployer,
        uint256 _maxSubmissionCost,
        uint256 _maxGas,
        uint256 _gasPrice
    ) public payable L1Buddy(_inbox, _l2Deployer) {
        L1Buddy.initiateBuddyDeploy(
            _maxSubmissionCost,
            _maxGas,
            _gasPrice,
            type(ArbBatchTokenMover).creationCode
        );
    }

    function handleDeploySuccess() internal override {
        // this deletes the codehash from state!
        L1Buddy.handleDeploySuccess();
    }

    function handleDeployFail() internal override {}

    function distributeBatch(bytes32 _root) external onlyIfConnected onlyL2Buddy {
        root = _root;
    }

    function redeemWithdrawal(
        address dest,
        uint256 amount,
        uint256 width,
        uint256 index,
        bytes32[] memory peaks,
        bytes32[] memory siblings
    ) public {
        require(root != 0, "NOT_INITIALIZED");
        require(!redeemed[index], "ALREADY_REDEEMED");
        redeemed[index] = true;
        require(
            MMR.inclusionProof(root, width, index, abi.encode(dest, amount), peaks, siblings) ==
                true,
            "BAD_PROOF"
        );
        require(erc20.transfer(dest, amount), "BAD_TRANSFER");
    }
}