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
    this.web3._extend({
      property: 'eth',
      methods: [
        new web3._extend.Method({
          name: 'getLogs',
          call: 'eth_getLogs',
          params: 1,
          inputFormatter: [null]
        })
      ]
    });
    this._options = parseOptions(options);
  }

  _confirmationBlockNumer () {
    return this.web3.eth.blockNumber - this._options.certainty;
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
    const contract = this.web3.eth.contract(abiArray);
    return new FirmContractFactory(this.web3, this._options, contract);
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

// Expose the same API as given contract
export class FirmContractFactory extends FirmBase {

  constructor (web3, options, factory) {
    super(web3, options);
    this._factory = factory;
  }

  withCertainty (newCertainty) {
    const options = Object.assign({}, this._options, {
      certainty: parseInt(newCertainty, 10)
    });
    return new FirmContractFactory(this.web3, options, this._factory);
  }

  new (...args) {
    let callback = args.pop();
    if (!isFunction(args[args.length - 1])) {
      throw new Error('Synchronous deployment is not possible.');
    }

    let deployed = null;
    const contract = this._factory.new(...args, (err, contract) => {
      // This callback will be fired twice (sic!)!
      if (!err && !deployed) {
        deployed = new FirmContract(this.web3, this._options, contract);
      }
      // Fire original callback
      callback(err, deployed);
    });

    return contract;
  }

  at (address, callback) {
    const contract = this._factory.at(address);
    const firmContract = new FirmContract(this.web3, this._options, contract);

    if (callback) {
      callback(null, firmContract);
    }

    return firmContract;
  }
}

export class FirmContract extends FirmBase {
  constructor (web3, options, contract) {
    super(web3, options);
    this._contract = contract;

    // Create functions
    contract.abi.filter(json => json.type === 'function').map(func => {
      const name = func._name;
      // TODO [todr] we don't really have wrapper for sendTransaction?
      // so just assign original function calls
      this[name] = this._contract[name];
    });
    contract.abi.filter(json => json.type === 'event').map(func => {
      const name = func._name;
      this[name] = this._callFunction.bind(this, name);
    });
  }

  withCertainty (newCertainty) {
    const options = Object.assign({}, this._options, {
      certainty: parseInt(newCertainty, 10)
    });
    return new FirmContract(this.web3, options, this._contract);
  }

  allEvents (...args) {
    return this._callEvent('allEvents', ...args);
  }

  _callEvent (name, ...args) {
    let callback = null;
    if (isFunction(args[args.length - 1])) {
      callback = args.pop();
    }
    const filter = this._contract[name](...args);
    const firmFilter = new FirmFilter(this.web3, this._options, filter.options);
    if (callback) {
      firmFilter.watch(callback);
    }
    return firmFilter;
  }

}

// Expose the same API as Web3 filter
export class FirmFilter extends FirmBase {

  constructor (web3, options, filterOptions) {
    super(web3, options);
    this._filter = null;
    this._filterOptions = parseFilterOptions(filterOptions);
  }

  withCertainty (newCertainty) {
    const options = Object.assign({}, this._options, {
      certainty: parseInt(newCertainty, 10)
    });
    return new FirmFilter(this.web3, options, this._filterOptions);
  }

  get (callback, progress) {
    const confirmationBlock = toBlockNumberHex(this._confirmationBlockNumer());
    const options = Object.assign({}, this._filterOptions, {
      fromBlock: confirmationBlock,
      toBlock: confirmationBlock
    });

    const withErrors = handleErrors(callback, progress);
    this.web3.eth.getLogs(options, withErrors(logs => {
      return callback(null, logs);
    }));

    return this;
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
        // For compatibility with std watch fire each log separately.
        res.forEach(function (log) {
          callback(null, log);
        });
      }));
    }));

    return this;
  }

  stopWatching () {
    if (this._filter) {
      this._filter.stopWatching();
    }
    this._filter = null;
    return this;
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
    retryLimit: 16,
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

  if (!isFunction(callback)) {
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

  if (filterOptions.fromBlock && filterOptions.fromBlock !== 'latest') {
    throw new Error('Only "latest" block is allowed for "fromBlock"');
  }

  return filterOptions;
}

function toBlockNumberHex (number) {
  return '0x' + number.toString(16);
}

function isObject (x) {
  return x && typeof x === 'object';
}

function isFunction (x) {
  return typeof x === 'function';
}

