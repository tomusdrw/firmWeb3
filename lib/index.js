import Web3 from 'web3';

export const Certainty = {
  LOW: 2,
  MEDIUM: 4,
  HIGH: 12
}

export class FirmWeb3 {

  constructor (web3, certainty) {
    if (!web3) {
      throw new Error('Provide web3 instance.');
    }
    this._web3 = web3;
    this.certainty = certainty || Certainty.MEDIUM;
  }

  with (newCertainty) {
    return new FirmWeb3(this._web3, newCertainty)
  }

  web3 () {
    return this._web3;
  }

  filter (filterOptions) {
    const filter = this._web3.filter(filterOptions);
    return new FirmFilter(this._web3, this.certainty, filter);
  }

  contract (abiArray) {
    const contract = this.web3.contract(abiArray);
    return new FirmFilter(this._web3, this.certainty, filter);
  }

  sendTransaction (transactionObject, callback, progress) {
  
  }

  sendRawTransaction (signedTransactionData, callback, progress) {
  
  }

  getTransactionReceipt (hash, callback, progress) {
  
  }

  getCode (address, callback, progress) {
  
  }

}

// Expose the same API as Web3 filter
export class FirmFilter {
  
  constructor (web3, certainty, filter) {
  
  }

}

// Expose the same API as given contract
export class FirmContract {
  
  constructor (web3, certainty, filter) {
  
  }

}

global.web3 = new Web3(new Web3.providers.HttpProvider('/rpc'));
global.web3f = new FirmWeb3(global.web3);
