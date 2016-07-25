/* global describe, it */
import {FirmWeb3, Certainty} from './index.js';

import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chai from 'chai';
chai.use(sinonChai);
const expect = chai.expect;

describe('Firm Web3', () => {
  // fake web3
  function fakeWeb3 () {
    return {
      eth: {
        latestBlock: 15,
        getCode: sinon.stub(),
        getTransactionReceipt: sinon.stub(),
        filter: sinon.stub(),
      }
    };
  }

  describe('The instance', () => {
    it('should return original web3', () => {
      // given
      const web3 = fakeWeb3();
      const cut = new FirmWeb3(web3);

      // when
      const w = cut.web3;

      // then
      expect(w).to.be.equal(web3);
    });
  });

  describe('Confirmation level spec', () => {
    it('should return new instance with different confirmation level', () => {
      // given
      const cut = new FirmWeb3(fakeWeb3());

      // when
      const i2 = cut.withCertainty(Certainty.HIGH);

      // then
      expect(i2).not.to.equal(cut);
    });
  });

  describe('getCode spec', () => {
    it('should fail without parameter', () => {
      // given
      const cut = new FirmWeb3(fakeWeb3());

      // when
      const fn = () => cut.getCode();

      // then
      expect(fn).to.throw(Error);
    });

    it('should fail without callback', () => {
      // given
      const cut = new FirmWeb3(fakeWeb3());

      // when
      const fn = () => cut.getCode('0x123');

      // then
      expect(fn).to.throw(Error);
    });

    it('should handle error', done => {
      // given
      const web3 = fakeWeb3();
      const cut = new FirmWeb3(web3);

      // when
      cut.getCode('0x0', (err, data) => {
        // then
        expect(err).to.be.truthy;
        expect(data).to.be.null;
        done();
      });

      web3.eth.getCode.callArgWith(2, 'err', null);
    });

    it('should allow to getCode with default confirmation level', done => {
      // given
      const web3 = fakeWeb3();
      const cut = new FirmWeb3(web3);
      web3.eth.getCode.onCall(0).callsArgWith(2, null, '0x1');
      web3.eth.getCode.onCall(1).callsArgWith(2, null, '0x1');
      web3.eth.getCode.callsArgWith(2, 'No more calls expected.', null);

      // when
      cut.getCode('0x0', (err, data) => {
        // then
        expect(err).to.be.null;
        expect(data).to.be.equal('0x1');
        done();
      });
    });
  });

  describe('getTransactionReceipt spec', () => {
    it('should return if block number is in a right distance', done => {
      // given
      const web3 = fakeWeb3();
      const cut = new FirmWeb3(web3);
      cut._options.retryTimeout = 0;

      // no receipt at first (should do a retry)
      web3.eth.getTransactionReceipt.onCall(0).yields(null, null);
      // and a response with insufficient block number
      web3.eth.getTransactionReceipt.onCall(1).yields(null, { blockNumber: 14 });
      // And finally correct response
      web3.eth.getTransactionReceipt.onCall(2).yields(null, { blockNumber: 11 });

      // when
      cut.getTransactionReceipt('0x0', (err, data) => {
        // then
        expect(err).to.be.null;
        expect(data.blockNumber).to.equal(11);
        done();
      });
    });
  });

  describe('filter spec', () => {
    it('should validate filter options', () => {
      // given
      const web3 = fakeWeb3();
      const cut = new FirmWeb3(web3);

      // when
      const fn1 = () => cut.filter('pending');
      const fn2 = () => cut.filter({ toBlock: 'pending' });

      // then
      expect(fn1).to.throw(Error);
      expect(fn2).to.throw(Error);
      expect(web3.eth.filter).to.have.not.been.called;
    });

    it('should return filters from older block', done => {
      // given
      const web3 = fakeWeb3();
      const cut = new FirmWeb3(web3);
      const fakeFilter = {
        get: sinon.stub(),
        stopWatching: sinon.stub(),
      };
      fakeFilter.get.yields(null, ['a']);
      web3.eth.filter.returns(fakeFilter);

      // when
      const filter = cut.filter({});
      filter.get((err, res) => {
        expect(err).to.be.null;
        expect(res).to.deep.equal(['a']);
        done();
      });

      // then
      expect(web3.eth.filter).to.have.been.calledWith({
        toBlock: 11
      });
    });
  });

});
