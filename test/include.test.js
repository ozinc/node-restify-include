'use strict';

var Promise = require('bluebird');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.should();
chai.use(chaiAsPromised);
var assert = chai.assert;
var sinon = require('sinon');
var request = require('request');

describe('include', function() {
  //Create our middleware
  var include = require('./../lib/include')({headers: ['foobar']});

  describe('include#requestName', function() {
    beforeEach(function() {
      this.stub = sinon.stub(request, 'get');
    });

    it('should send request correctly', function() {
      var data = {a: 1};
      var keeper = {};
      var propertyName = 'asdf';
      keeper[propertyName + '_url'] = 'asdf';

      this.stub.yields(null, {}, JSON.stringify(data));

      return include.requestName(keeper, {}, propertyName).then(function() {
        assert(keeper[propertyName], 'Property on keeper should be filled');
        assert.deepEqual(keeper[propertyName], data, 'Property should be filled with correct data');
      });
    });

    it('should fail on invalid json', function() {
      var keeper = {};
      var propertyName = 'asdf';
      keeper[propertyName + '_url'] = 'asdf';

      this.stub.yields(null, {}, '{a:1}');

      return include.requestName(keeper, {}, propertyName).then(function() {
        assert(false, 'Promise should not pass');
      }).catch(function(e) {
        assert(e, 'Promise should fail');
        assert.instanceOf(e, SyntaxError, 'error should be SyntaxError');
      });
    });

    afterEach(function() {
      this.stub.restore();
    });
  });

  describe('include#processQuery', function() {

    it('should not process on no query', function() {
      this.stub = sinon.stub(include, 'processObject', Promise.reject);

      return include.processQuery({}, {}, {}).then(function() {
        assert(!this.stub.called);
      }.bind(this));
    });

    it('should not process if query empty', function() {
      this.stub = sinon.stub(include, 'processObject', Promise.reject);

      return include.processQuery({include: ','}, {}, {}).then(function() {
        assert(!this.stub.called);
      }.bind(this));
    });

    it('should process if valid query', function() {
      this.stub = sinon.stub(include, 'processObject', Promise.resolve);

      return include.processQuery({include: 'a,b'}, {}, {}).then(function() {
        assert(this.stub.called);
        assert.deepEqual(this.stub.firstCall.args[0], ['a', 'b']);
      }.bind(this));
    });

    afterEach(function() {
      this.stub.restore();
    });
  });

  describe('include#include', function() {

    beforeEach(function() {
      this.sinon = sinon.sandbox.create();
      this.res = { };
      this.req = {
        headers: { },
        query: { }
      };
    });

    it('should wrap correctly', function(done) {
      this.res.send = function() {
        assert(false, 'res.send was called which should not happen.');
      };
      this.res.json = wrapUp;
      var data = {};
      var stub = this.sinon.stub(include, 'processObject', Promise.reject);

      include(this.req, this.res, function() {
        assert.notEqual(this.res.json, wrapUp, 'res.json should be wrapped');
        this.res.json(data);
      }.bind(this));

      function wrapUp(code, output) {
        assert(!stub.called, 'stub should not be called.');
        assert.deepEqual(data, output);
        done();
      }
    });

    afterEach(function() {
      this.sinon.restore();
    });
  });
});
