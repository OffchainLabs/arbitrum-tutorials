pragma solidity >=0.4.22;

contract DappToken {
    string public name = "Dapp Token"; //Token name
    string public symbol = "DAPP"; //Toekn symbol
    string public standard = "Dapp Token v1.0";
    uint256 public totalSupply;
    uint8 public decimals = 2;

    mapping(address => uint256) public balanceOf; //stores the balance of addresses. Every time a token is baught/sold/transferred, this mapping is responsible for knowing who has each token
    mapping(address => mapping(address => uint256)) public allowance;
    //It keeps track of all of my appovals that I have approved for transferring tokens
    //account A:  1)approved account B to spend 10 tokens
    //            2)approved account C to spend 20 tokens
    //            ...

    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value); //I (the owner) approved account spender to spend _value of my Dapp tokens o

    //constructor: Set the value and the number of the tokens that we have
    //everytime the smart contract is deployed
    //The following cobstructor accepts the total supply as function arguments
    constructor(uint256 _initialSupply) public {
        balanceOf[msg.sender] = _initialSupply; //allocates the initial supply
        totalSupply = _initialSupply; //the number of tokens that will exist and store it in a variable
    }

    //transfer function allows users to trasfer tokens and MUST fire the "transfer event"
    //The function SHOULD throw exception if the _from address does not have enough tokens to spend
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value);
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    //approve function: allows sb to approve another account to spend tokens on tehir behalf. You're basically approving the exchange to spend x tokens on your behalf
    //MUST trigger the approval event
    function approve(address _spender, uint256 _value) public returns (bool success) {
        //spender: the exchange

        allowance[msg.sender][_spender] = _value; //set the allowance: the amount which _spender is still allowed to withdraw from _owner
        //Allowance: If I approve the exchange to spend x Dapp tokens on my belhaf, that x gets stored in allowance

        emit Approval(msg.sender, _spender, _value); //approve event
        return true;
    }

    //Once you approve that transfer, the transferFrom function allows the exchange to do that
    //acts like a transfer but on behalf on another account
    //account A approved account B to spend _value
    //so account B calls transferFrom function to transfer _value tokens from account A to some account (_to)
    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public returns (bool success) {
        require(_value <= balanceOf[_from]);
        require(_value <= allowance[_from][msg.sender]);

        balanceOf[_from] -= _value; //update the balance of _from and _to
        balanceOf[_to] += _value; //update the balance of _from and _to

        allowance[_from][msg.sender] -= _value; //update the allowance; ammount of tokens the exchange (msg.sender) can spend on behalf of _from account

        emit Transfer(_from, _to, _value); //transfer event: everytime there is a transfer happened we should emit an event

        return true;
    }
}
