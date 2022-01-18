pragma solidity >=0.6.11;

import "arb-bridge-eth/contracts/rollup/Rollup.sol";
import "arb-bridge-eth/contracts/libraries/MerkleLib.sol";

import "./ConfirmRoots.sol";
import { IExitLiquidityProvider } from "./L1PassiveFastExitManager.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";

contract L1SignedLiquidityProvider is Ownable, IExitLiquidityProvider {
    uint256 public constant fee_div = 100;
    address tokenBridge;
    address signer;

    constructor(address _tokenBridge, address _signer) public {
        tokenBridge = _tokenBridge;
        signer = _signer;
    }

    function withdrawLiquidity(
        address dest,
        address erc20,
        uint256 amount
    ) external onlyOwner {
        require(IERC20(erc20).transfer(dest, amount), "INSUFFICIENT_LIQUIDITIY");
    }

    function requestLiquidity(
        address dest,
        address erc20,
        uint256 amount,
        uint256 exitNum,
        bytes calldata liquidityProof
    ) external override returns (bytes memory) {
        require(msg.sender == tokenBridge, "NOT_BRIDGE");
        bytes32 withdrawData = keccak256(abi.encodePacked(exitNum, dest, erc20, amount));
        require(ECDSA.recover(withdrawData, liquidityProof) == signer, "BAD_SIG");
        uint256 fee = amount / fee_div;
        require(IERC20(erc20).transfer(dest, amount - fee), "INSUFFICIENT_LIQUIDITIY");
        return "";
    }
}