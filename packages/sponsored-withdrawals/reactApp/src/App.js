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
      GasAmount : "",
      SignedTransction:""
    };

    this.value = React.createRef();

  }
  AmountSubmit = async (t) => {
    t.preventDefault();
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    let account = accounts[0]
    const nonceNumber = await provider.getTransactionCount(account)
    //change 121000 to the real amount of gas provided by user
    const idata = iface.encodeFunctionData("payToSponsor", [this.state.GasAmount]);
    //console.log(idata)
    const estGas = await provider.estimateGas({
      to: "0xB3F44F713A267B95329977caD3E82370C02fE9e0",
      data: idata,
      value: ethers.utils.parseEther(this.state.AmountToSend)
    })
    console.log(estGas) 
    //Change the chainId if you want to transmit to the Georli 
    let transaction = {
          to: '0xB3F44F713A267B95329977caD3E82370C02fE9e0',
          value: ethers.utils.parseEther(this.state.AmountToSend),
          data : idata,
          gasLimit: estGas,
          maxPriorityFeePerGas: ethers.utils.parseUnits('5', 'gwei'),
          maxFeePerGas: ethers.utils.parseUnits('20', 'gwei'),
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
    //console.log("data ", data);
    const finalTx = ethers.utils.serializeTransaction(tx, data);
    //console.log(finalTx);
    this.setState({SignedTransction:finalTx});
    }) 
};

TransactionSave = async (t) => {
  this.setState({AmountToSend:t});

};
GasSave = async (f) => {
  this.setState({GasAmount:f});

};
render() {
 return (
   <div className="cargo">
     <div className="case">
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
         <label>
           Set your gas:
           <input
             className="input2"
             type="text"
             name="name2"
             onChange={(f) => this.GasSave(f.target.value)}
           />
         </label>
         <button className="button" type="submit" value="Confirm" onClick={this.AmountSubmit}>
           Confirm
         </button>
         
         </form>
         <form>
         The Signed Transaction Is: {this.state.SignedTransction}
         </form>
     </div>
   </div>
 );
}
}
export default App;