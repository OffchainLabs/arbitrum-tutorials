pragma solidity >=0.6.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "arb-bridge-peripherals/contracts/tokenbridge/libraries/ITransferAndCall.sol";
import "../L1PassiveFastExitManager.sol";

contract FastExitMock is IExitLiquidityProvider, ITransferAndCallReceiver {
    uint256 fee = 0;
    bytes constant RETVALUE = "";

    function setFee(uint256 _fee) external {
        fee = _fee;
    }

    event Triggered();

    function onTokenTransfer(
        address _sender,
        uint256 _value,
        bytes memory _data
    ) external override {
        require(keccak256(_data) == keccak256(RETVALUE), "WRONG_DATA");
        emit Triggered();
    }

    function requestLiquidity(
        address dest,
        address erc20,
        uint256 amount,
        uint256 exitNum,
        bytes calldata liquidityProof
    ) external override returns (bytes memory) {
        require(amount > fee, "UNDERFLOW");
        IERC20(erc20).transfer(dest, amount - fee);
        // new exit will now call fast exit mock with this data
        return RETVALUE;
    }
}