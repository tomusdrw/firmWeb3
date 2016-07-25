import Web3 from 'web3';

export const Certainty = {
  LOW: 2,
  MEDIUM: 4,
  HIGH: 12
};

// TODO handle retries better
// TODO handle progress
//
class FirmBase {

  constructor (web3, options) {
    if (!web3) {
      throw new Error('Provide web3 instance.');
    }
    this.web3 = web3;
    this._options = parseOptions(options);
  }

  _confirmationBlockNumer () {
    return this.web3.eth.latestBlock - this._options.certainty;
  }

  _handleRetries (callback, progress, fn) {
    return handleRetries(this._options, callback, progress, fn);
  }
}

export class FirmWeb3 extends FirmBase {

  withCertainty (newCertainty) {
    const options = Object.assign({}, this._options, {
      certainty: parseInt(newCertainty, 10)
    });
    return new FirmWeb3(this.web3, options);
  }

  filter (filterOptions) {
    return new FirmFilter(this.web3, this._options, filterOptions);
  }

  contract (abiArray) {
    const contract = this.web3.contract(abiArray);
    return new FirmContract(this.web3, this._options, contract);
  }

  getTransactionReceipt (hash, callback, progress) {
    verifyDefined(hash, callback);

    const withErrors = handleErrors(callback, progress);

    this._handleRetries(callback, progress, (retry) => {
      this.web3.eth.getTransactionReceipt(hash, withErrors((receipt) => {
        // Seems that the code is not yet there
        if (!receipt) {
          return retry();
        }

        // Make sure if the same code is in previous blocks
        if (receipt.blockNumber > this._confirmationBlockNumer()) {
          return retry();
        }

        return callback(null, receipt);
      }));
    });
  }

  getCode (address, callback, progress) {
    verifyDefined(address, callback);

    const withErrors = handleErrors(callback, progress);

    this._handleRetries(callback, progress, (retry) => {
      this.web3.eth.getCode(address, 'latest', withErrors((latest) => {
        // Seems that the code is not yet there
        if (!latest) {
          return retry();
        }

        // Make sure if the same code is in previous blocks
        const confirmationBlock = this._confirmationBlockNumer();
        this.web3.eth.getCode(address, confirmationBlock, withErrors((res) => {
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
}

// Expose the same API as Web3 filter
export class FirmFilter extends FirmBase {

  constructor (web3, options, filterOptions) {
    super(web3, options);
    this._filter = null;
    this._filterOptions = parseFilterOptions(filterOptions);
  }

  get (callback) {
    const confirmationBlock = this._confirmationBlockNumer();
    const options = Object.assign({}, this._filterOptions, {
      toBlock: confirmationBlock
    });

    const filter = this.web3.eth.filter(options);

    // Also check if the logs were there in the confirmationBlock
    filter.get((err, logs) => {
      // always stop the filter
      filter.stopWatching();
      // handle errors and happy case
      return callback(err, logs);
    });
  }

  watch (callback, progress) {
    const withErrors = handleErrors(callback, progress);
    // let's listen for new blocks
    if (!this._filter) {
      this._filter = this.web3.eth.filter('latest');
    }

    // on each new block:
    this._filter.watch(withErrors(_newBlock => {
      // just get the value for older block
      this.get(withErrors(res => {
        // Filter-out empty results
        if (!res.length) {
          return;
        }
        // and return callback if it's ok
        callback(null, res);
      }));
    }));
  }

  stopWatching () {
    if (this._filter) {
      this._filter.stopWatching();
    }
    this._filter = null;
  }

}

// Expose the same API as given contract
export class FirmContract {

  constructor (web3, options, contract) {
    this.web3 = web3;
    this._options = parseOptions(options);
    this._contract = contract;
  }

}

function parseOptions (options) {
  if (!isObject(options)) {
    options = {
      certainty: parseInt(options, 10) || Certainty.MEDIUM
    };
  }

  return Object.assign({
    certainty: Certainty.MEDIUM,
    retryLimit: 5,
    retryTimeout: 2000
  }, options);
}

function handleRetries (options, callback, progress, fn) {
  const retry = (left) => {
    if (left <= 0) {
      const err = {
        message: `Maximal number of ${options.retryLimit} retries reached.`
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
      setTimeout(() => retry(left - 1), options.retryTimeout);
    });
  };

  retry(options.retryLimit);
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

function parseFilterOptions (filterOptions) {
  if (!isObject(filterOptions)) {
    throw new Error('Only logs watching is allowed.');
  }

  if (filterOptions.toBlock && filterOptions.toBlock !== 'latest') {
    throw new Error('Only "latest" block is allowed for "toBlock"');
  }

  return filterOptions;
}

function isObject (x) {
  return x && typeof x === 'object';
}

global.web3 = new Web3(new Web3.providers.HttpProvider('/rpc/'));
global.web3f = new FirmWeb3(global.web3);
