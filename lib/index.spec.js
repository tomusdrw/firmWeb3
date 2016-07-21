import {FirmWeb3, Certainty} from './index.js';

import sinon from 'sinon';
import { expect } from 'chai';

describe('Firm Web3', () => {

  // fake web3
  function web3 () {
    return {
      getCode: sinon.spy(),
    };
  }

  describe('The instance', () => {
    it('should return original web3', () => {
      // given
      const w3 = web3();
      const cut = new FirmWeb3(w3);
      
      // when
      const w = cut.web3();
      
      // then
      expect(w).to.be.equal(w3);
    });
  });

  describe('Confirmation level spec', () => {
    it('should return new instance with different confirmation level', () => {
      // given
      const cut = new FirmWeb3(web3());

      // when
      const i2 = cut.with(Certainty.HIGH)

      // then
      expect(i2).not.to.equal(cut);
    });


    it('should allow to getCode with default confirmation level', done => {
      // given
      const cut = new FirmWeb3(web3());

      // when
      cut.getCode('0x0', (data) => {
        // then
        expect(data);
        done();
      });

      expect(web3.getCode).to.have.been.called;
    });
  });

});
