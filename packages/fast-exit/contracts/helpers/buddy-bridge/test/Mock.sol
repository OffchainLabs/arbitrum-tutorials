// SPDX-License-Identifier: Apache-2.0
pragma solidity  >=0.6.11;

contract Mock {
    string public mocked;

    constructor(string memory _mocked) public {
        mocked = _mocked;
    }

    receive() external payable {}

    fallback() external payable {}

    function createRetryableTicket(
        address,
        uint256,
        uint256,
        address,
        address,
        uint256,
        uint256,
        bytes calldata data
    ) external returns (uint256) {
        return 0;
    }
}