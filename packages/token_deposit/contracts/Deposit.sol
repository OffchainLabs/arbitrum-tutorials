pragma solidity ^0.7.0;


import "./IEthERC20Bridge.sol";

contract Deposit {

    IEthERC20Bridge public etherc20bridge;
    constructor( address _etherc20bridge) public  {
      
        etherc20bridge = IEthERC20Bridge(_etherc20bridge);
    }
    


    // /**
    //  * @param _token L1 address of ERC20
    //  * @param _dest account to be credited with the tokens in the L2 (can be the user's L2 account or a contract)
    //  * @param _amount Token Amount
    //  * @param _maxSubmissionCost Max gas deducted from user's L2 balance to cover base submission fee
    //  * @param _maxGas Max gas deducted from user's L2 balance to cover L2 execution
    //  * @param _gasPriceBid Gas price for L2 execution
    //  * @param _callHookData optional data for external call upon minting
    //  * @return ticket ID used to redeem the retryable transaction in the L2
    //  */
    function depositToken(address _token, address _dest, uint256 _amount, uint256 _maxSubmissionCost, uint256 _maxGas, uint256 _gasPriceBid, bytes memory _callHookData ) public payable
    {      
        
        etherc20bridge.deposit(_token, _dest, _amount, _maxSubmissionCost, _maxGas, _gasPriceBid, _callHookData);
    

    }

    function getL2address(address _token) public returns (address){

        address L2Token = etherc20bridge.calculateL2TokenAddress(_token);
        return L2Token;
    }


    
}

