pragma solidity ^0.7.0;

contract Adoption {
    event PetAdopted(uint256 returnValue);

    address[16] public adopters = [
        address(0),
        address(0),
        address(0),
        address(0),
        address(0),
        address(0),
        address(0),
        address(0),
        address(0),
        address(0),
        address(0),
        address(0),
        address(0),
        address(0),
        address(0),
        address(0)
    ];

    // Adopting a pet
    function adopt(uint256 petId) public returns (uint256) {
        require(petId >= 0 && petId <= 15);

        adopters[petId] = msg.sender;
        emit PetAdopted(petId);
        return petId;
    }

    // Retrieving the adopters
    function getAdopters() public view returns (address[16] memory) {
        return adopters;
    }
}
