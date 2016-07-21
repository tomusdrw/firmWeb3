import Web3 from 'web3';

export const Certainty = {
  LOW: 2,
  MEDIUM: 4,
  HIGH: 12
}


// TODO handle retries better
// TODO handle progress

export class FirmWeb3 {

  constructor (web3, certainty) {
    if (!web3) {
      throw new Error('Provide web3 instance.');
    }
    this._web3 = web3;
    this.certainty = certainty || Certainty.MEDIUM;
    this.maxRetries = 50;
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
    const contract = this._web3.contract(abiArray);
    return new FirmFilter(this._web3, this.certainty, filter);
  }

  sendTransaction (transactionObject, callback, progress) {
  
  }

  sendRawTransaction (signedTransactionData, callback, progress) {
  
  }

  getTransactionReceipt (hash, callback, progress) {
  
  }

  getCode (address, callback, progress) {
    verifyDefined(address, callback);

    const withErrors = handleErrors(callback, progress);

    this._handleRetries(callback, progress, (retry) => {
      this._web3.eth.getCode(address, 'latest', withErrors((latest) => {
        // Seems that the code is not yet there
        if (!latest) {
          return retry();
        }

        // Make sure if the same code is in previous blocks
        const confirmationBlock = this._confirmationBlockNumer();
        this._web3.eth.getCode(address, confirmationBlock, withErrors((res) => {
          // Seems the same
          if (res === latest) {
            return callback(null, res);
          }
          // Somethings went south. Let's retry
          return retry();
        }));
      }));
    });
  }
  
  _confirmationBlockNumer () {
    return this._web3.eth.latestBlock - this.certainty;
  }

  _handleRetries (callback, progress, fn) {
    return handleRetries(this.maxRetries, callback, progress, fn);
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

function handleRetries (maxRetries, callback, progress, fn) {
  const retry = (left) => {
    if (left <= 0) {
      const err = {
        message: `Maximal number of ${maxRetries} retries reached.`
      };
      callback(err, null);
      if (progress) {
        progress(err, null);
      }
      return;
    }

    // We can still retry, let's just invoke the function
    // TODO [todr] Retries - we can do them much better.
    fn(() => {
      setTimeout(() => retry(left - 1), 2000);
    });
  };

  retry(maxRetries);
}

function handleErrors (callback, progress) {
  return cb => (err, res) => {
    if (!err) {
      return cb(res);
    }

    callback(err, null);
    if (progress) {
      progress(err, null);
    }
  };
}

function verifyDefined (args, callback) {
  if (!args) {
    throw new Error('Provide required parameters.');
  }

  if (!callback) {
    throw new Error('Provide callback function.');
  }

  if (typeof callback !== 'function') {
    throw new Error('Callback has to be a function.');
  }
}

global.web3 = new Web3(new Web3.providers.HttpProvider('/rpc'));
global.web3f = new FirmWeb3(global.web3);
