[![Build Status][travis-image]][travis-url]
[![Join the chat at https://gitter.im/ethcore/parity][gitter-image]][gitter-url]
[![GPLv3][license-image]][license-url]

[travis-image]: https://travis-ci.org/tomusdrw/firmWeb3.svg?branch=master
[travis-url]: https://travis-ci.org/tomusdrw/firmWeb3
[gitter-image]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/ethcore/parity?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
[license-image]: https://img.shields.io/badge/license-GPL%20v3-green.svg
[license-url]: http://www.gnu.org/licenses/gpl-3.0.en.html

# Firm Web3

Subset of original Web3 API with additional certainty checks. I.e. wait for some confirmations (new blocks) before triggering the callback.

# Usage

```js
// Import the library
import {FirmWeb3, Certainty} from 'firm.web3';

// Create new `FirmWeb3` passing existing `web3` instance.
let firmWeb3 = new FirmWeb3(global.web3);

// Change certainty level (default MEDIUM=4 blocks)
firmWeb3 = firmWeb3.withCertainty(Certainty.HIGH); // wait for 12 blocks

// send transaction and wait for receipt
web3.eth.sendTransaction({...}, (err, txHash) => {
  console.log('Transaction sent.');

  // wait for receipt with sufficient confirmations count
  firmWeb3.getTransactionReceipt(txHash, (err, receipt) => {
    console.log('Transaction has 12 confirmations.');
  });  
});

```

or without `ES2015`:
```js
// Import the library
var firmWeb3 = require('firm.web3');

// Create new `FirmWeb3` passing existing `web3` instance.
var firmWeb3 = new firmWeb3.FirmWeb3(global.web3);

// Change certainty level (default MEDIUM=4 blocks)
firmWeb3 = firmWeb3.withCertainty(firmWeb3.Certainty.HIGH); // wait for 12 blocks

// send transaction and wait for receipt
web3.eth.sendTransaction({...}, function (err, txHash) {
  console.log('Transaction sent.');

  // wait for receipt with sufficient confirmations count
  firmWeb3.getTransactionReceipt(txHash, function (err, receipt) {
    console.log('Transaction has 12 confirmations.');
  });
});

```

# API

### Web3

- `firmWeb3.withCertainty(level)` - returns a new instance with given certainty `level` (`Certainty.{LOW(2 blocks), MEDIUM(4), HIGH(12)}` or just number of blocks),
- `firmWeb3.getTransactionReceipt(hash, callback)` - gets a receipt for given `hash` (will retry up to 24 blocks),
- `firmWeb3.getCode(address, callback)` - gets contract code under given `address` (will retry up to 24 blocks),
- `firmWeb3.filter(filterOptions)` - returns a new logs (events) filter,
- `firmWeb3.contract(abiArray)` - returns a new contract factory.

### Filter

- `filter.withCertainty(level)` - returns a new filter with changed certainty `level`,
- `filter.get(callback)` - gets current "firm" logs (logs coming from block `latest - confirmationLevel`),
- `filter.watch(callback)` - fires a callback for each new logs specified in filter and happening in block `latest - confirmationLevel`,
- `filter.stopWatching()` - stops watching and uninstall filter.


### Contract

- `contractF.at(address)` - returns contract with current ABI bound to given `address`,
- `contractF.new([...args,] callback)` - deploys contract with current ABI and calls back with `FirmContract`.

- `contract.withCertainty(level)` - returns a new contract with different certainty `level`,
- `contract.allEvents([filterOptions] [, callback])` - returns a filter for all events hapening in contract
- `contract.[eventName]([filterValues] [, filterOptions] [, callback])` - returns a filter for specific event in contract


Parameters values are the same as specified here: [JavaScript API](https://github.com/ethereum/wiki/wiki/JavaScript-API#contract-events)

# TODO

- [] Better retries handling (each block instead of timeout)
- [] Information about progress

