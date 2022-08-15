// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.11;

contract Greeter {
    string greeting;
    address public deployer;

    //use this to check if the tx sent from delayed inbox doesn't alias the sender address.
    modifier onlyDeployer() {
        require(msg.sender == deployer, "Only deployer can do this");
        _;
    }

    constructor(string memory _greeting) public {
        greeting = _greeting;
        deployer = msg.sender;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public onlyDeployer {
        greeting = _greeting;
    }
}
