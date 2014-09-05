'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var error = require('restify-errors');
var request = Promise.promisifyAll(require('request'));

/**
 * Add include query functionality in the api. Will search
 * and automatically retrieve url data from the response.
 *
 * Example:
 *
 * Assuming we have API resource called /api/cars
 * that returns the following:
 *
 * {
 *   id: 1,
 *   name: 'Model S',
 *   manufacturer_id: 'tesla',
 *   manufacturer_url: 'http://api.oz.com/api/manufacturers/tesla'
 * }
 *
 * If we do a query of /api/cars?include=manufacturer, the middleware
 * will audomatically send request to the above url, get the data
 * and populate the response with the included data.
 */


module.exports = function(options) {
  if (!options) {
    options = {};
  }
  options.headers = options.headers || ['authorization'];

  var out = function(req, res, next) {
    //Make sure it hasn't been wrapped before.
    if (!res.__isJSONIncludeWrapped) {

      //Wrap the res.json function.
      res.json = out.jsonWrap(req, res, res.json);

      //Prevent any further wrapping.
      res.__isJSONIncludeWrapped = true;
    }
    next();
  };

  function requestName(obj, headers, name) {
    if (obj[name + '_url']) {
      return request.getAsync({
        url: obj[name + '_url'],
        headers: _.pick(headers, options.headers)
      }).spread(function(req, result) {
        obj[name] = JSON.parse(result);
      });
    }
    return Promise.resolve();
  }

  function processObject(names, headers, obj) {
    return Promise.all(names.map(out.requestName.bind(null, obj, headers)));
  }

  function processQuery(query, headers, obj) {
    //Make sure we have an include query.
    if (!query.include) {
      return Promise.resolve();
    }

    //Split include query with ',' and remove any empty
    //entries.
    var includes = _.compact(query.include.split(/,/g));

    if (includes.length === 0) {
      return Promise.resolve();
    }

    //If the output object is array, we need to loop through it.
    if (_.isArray(obj)) {
      return Promise.all(obj.map(out.processObject.bind(null, includes, headers)));
    } else {
      return out.processObject(includes, headers, obj);
    }
  }

  function jsonWrap(req, res, fn) {
    return function(statusCode, obj) {
      //Ensure default options.
      if (!obj) {
        obj = statusCode;
        statusCode = 200;
      }

      //Get required jobs
      out.processQuery(req.query, req.headers, obj).then(function() {
        fn.call(res, statusCode, obj);
      }).catch(function(e) {
        res.send(new error.InternalError('Error while including data: ' + e.message));
      });
    };
  }

  out.jsonWrap = jsonWrap;
  out.processQuery = processQuery;
  out.processObject = processObject;
  out.requestName = requestName;

  return out;
};
