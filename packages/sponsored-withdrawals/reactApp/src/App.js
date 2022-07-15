import React, { Component } from "react";
import "./App.css";
import {ethers} from "ethers";

// Abi for the Sponsor Contract
const abi = [
  "function setSponsor(address)",
  "function payToSponsor(uint256) payable"
];
const iface = new ethers.utils.Interface( abi );
 
const provider = new ethers.providers.Web3Provider(window.ethereum);

const signer = provider.getSigner();
const {ethereum} =window;
class App extends Component {
  constructor(props) {

    super(props);

    this.state = {
      AmountToSend: "",
      FirstGasAmount : "",
      SignedTransction:"",
      NeededETH : ""
    };

    this.value = React.createRef();

  }
  GasAmountSubmit = async (g) => {
    g.preventDefault();
    const maxfee = (await provider.getFeeData()).maxFeePerGas
    const Eths = maxfee * this.state.FirstGasAmount / 10**18
    this.setState({NeededETH: Eths});
  };


  AmountSubmit = async (t) => {
    t.preventDefault();
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    let account = accounts[0]
    const nonceNumber = await provider.getTransactionCount(account)
    const idata = iface.encodeFunctionData("payToSponsor", [this.state.FirstGasAmount]);
    const estGas = await provider.estimateGas({
      to: "0xB3F44F713A267B95329977caD3E82370C02fE9e0",
      data: idata,
      value: ethers.utils.parseEther(this.state.AmountToSend)
    })
    //USer can send more ETH than needed and will be paid back by the Sponsor contract for the surplus
    //Address of Sponsor contract on Rinkeby is :  0xB3F44F713A267B95329977caD3E82370C02fE9e0
    //Change the chainId if you want to transmit to the Georli 
    let transaction = {
          to: '0xB3F44F713A267B95329977caD3E82370C02fE9e0',
          value: ethers.utils.parseEther(this.state.AmountToSend),
          data : idata,
          gasLimit: estGas,
          maxPriorityFeePerGas: (await provider.getFeeData()).maxPriorityFeePerGas,
          maxFeePerGas:(await provider.getFeeData()).maxFeePerGas,
          nonce: nonceNumber,
          type: 2,
          chainId: 4
    };

    const tx = await signer.populateTransaction(transaction)
    const serializedUnsignedTx = ethers.utils.serializeTransaction(tx);
    ethereum.request({ 
    method: 'eth_sign', 
    params: 
        [ account, ethers.utils.keccak256(serializedUnsignedTx) ]
          }).then(data => {
    const finalTx = ethers.utils.serializeTransaction(tx, data);
    this.setState({SignedTransction:finalTx});
    }) 
};

TransactionSave = async (t) => {
  this.setState({AmountToSend:t});

};

FirstGasSave = async (g) => {
  this.setState({FirstGasAmount:g});

};


render()  {
 return (
   <div className="cargo">
     <div className="case">
      
      <form>
      <label>
           Set your gas amount:
           <input
             className="input3"
             type="text"
             name="name3"
             onChange={(g) => this.FirstGasSave(g.target.value)}
           />
         </label>
         <button className="button2" type="submit" value="Confirm" onClick={this.GasAmountSubmit}>
           Confirm
         </button>
      </form>

      <form>
         Please send at least this Amount of ETH: 
         <a style={{backgroundColor: "greenyellow"}}>{this.state.NeededETH}
         </a> 
         </form>

     <form className="form" >
         <label>
           Set your amount you want to send to Sponsor:
           <input
             className="input"
             type="text"
             name="name"
             onChange={(t) => this.TransactionSave(t.target.value)}
           />
         </label>
         <button className="button" type="submit" value="Confirm" onClick={this.AmountSubmit}>
           Confirm
         </button>
         </form>
         <form>
         The Signed Transaction Is:
         </form>
         <p>
         <textarea rows="8" cols="100"  value={this.state.SignedTransction} />
         </p>
     </div>
   </div>
 );
}
}
export default App;