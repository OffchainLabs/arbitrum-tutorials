import React, { Component } from "react";
import "./App.css";
import {ethers} from "ethers";
import {L2TransactionReceipt} from "@arbitrum/sdk/dist/index";
//import { L2TransactionReceipt, getL2Network, L2ToL1MessageStatus } = require('@arbitrum/sdk')
//import { arbLog, requireEnvVariables } = require('arb-shared-dependencies')
import { OldOutbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/OldOutbox__factory'


 
const provider = new ethers.providers.Web3Provider(window.ethereum);

const signer = provider.getSigner();
const {ethereum} =window;
class App extends Component {
  constructor(props) {

    super(props);

    this.state = {
      AmountToSend: "",
      SignedTransction:""
    };

    this.value = React.createRef();

  }
  AmountSubmit = async (t) => {
    t.preventDefault();
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    let account = accounts[0]
    const nonceNumber = await provider.getTransactionCount(account)
    //Change the chainId if you want to transmit to the Georli 
    let transaction = {
          to: '0xa238b6008Bc2FBd9E386A5d4784511980cE504Cd',
          value: ethers.utils.parseEther(this.state.AmountToSend),
          gasLimit: '21000',
          maxPriorityFeePerGas: ethers.utils.parseUnits('5', 'gwei'),
          maxFeePerGas: ethers.utils.parseUnits('20', 'gwei'),
          nonce: nonceNumber,
          type: 2,
          chainId: 4
    };

    const tx = await signer.populateTransaction(transaction)
    const serializedUnsignedTx = ethers.utils.serializeTransaction(tx);
    const tx1 = await ethers.utils.arrayify(serializedUnsignedTx)
    ethereum.request({ 
    method: 'eth_sign', 
    params: 
        [ account, ethers.utils.keccak256(tx1) ]
          }).then(data => {
    console.log("data ", data);
    this.setState({SignedTransction:data});
    })

    
};

TransactionSave = async (t) => {
  this.setState({AmountToSend:t});

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
         <button className="button" type="submit" value="Confirm" onClick={this.AmountSubmit}>
           Confirm
         </button>
         The Signed Transaction Is: {this.state.SignedTransction}
         </form>
     </div>
   </div>
 );
}
}
export default App;