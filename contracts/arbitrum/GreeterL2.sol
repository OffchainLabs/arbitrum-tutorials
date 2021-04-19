// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "./Arbsys.sol";
import "../Greeter.sol";

contract GreeterL2 is Greeter {
    ArbSys constant arbsys = ArbSys(100);
    address l1Target;

    constructor(
        string memory _greeting,
        address _l1Target
    ) public Greeter(_greeting) {
        l1Target = _l1Target;
    }

    function setGreetingInL1(string memory _greeting) public returns (uint256) {
        bytes memory data =
            abi.encodeWithSelector(Greeter.setGreeting.selector, _greeting);

        uint256 withdrawalId = arbsys.sendTxToL1(l1Target, data);
        return withdrawalId;
    }
}
