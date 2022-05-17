pragma solidity  >=0.6.11;

contract Bribe {
    function bribe() payable public {
        block.coinbase.transfer(msg.value);
    }
}
