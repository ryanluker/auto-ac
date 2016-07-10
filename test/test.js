var expect = require('chai').expect;
var autoAC = require('../index.js');

describe('Auto-AC', function() {
  describe('#checkState', function() {
    it('should turn the ac on', function() {
      var fakeTail = {};
      fakeTail.writeSync = function(state) {
        expect(state).to.be.equal(1);
      }
      autoAC.checkState(fakeTail, 20, 22);
    });

    it('should turn the ac off', function() {
      var fakeTail = {};
      fakeTail.writeSync = function(state) {
        expect(state).to.be.equal(0);
      }
      autoAC.checkState(fakeTail, 24, 22);
    });
  });
});