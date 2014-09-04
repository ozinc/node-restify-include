'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var error = require('restify-errors');
var request = Promise.promisify(require('request'));

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

  function requestName(obj, headers, name) {
    if (obj[name + '_url']) {
      console.log(_.pick(headers, options.headers), 'Sending request to ' + obj[name + '_url'])

      return request({
        url: obj[name + '_url'],
        headers: _.pick(headers, options.headers)
      }).then(function(result) {
        obj[name] = JSON.parse(result[1]);
      });
    }
  }

  function processObject(names, headers, obj) {
    return Promise.all(names.map(requestName.bind(null, obj, headers)));
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

    var jobs = [];

    //If the output object is array, we need to loop through it.
    if (_.isArray(obj)) {
      console.log('test');
      return Promise.all(obj.map(processObject.bind(null, includes, headers)));
    } else {
      return processObject(includes, headers, obj);
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
      processQuery(req.query, req.headers, obj).then(function() {
        fn.call(res, statusCode, obj);
      }).catch(function(e) {
        res.send(new error.InternalError('Error while including data: ' + e.message));
      });
    }
  }

  var out = function(req, res, next) {
    //Make sure it hasn't been wrapped before.
    if (!res.__isJSONIncludeWrapped) {

      //Wrap the res.json function.
      res.json = jsonWrap(req, res, res.json);

      //Prevent any further wrapping.
      res.__isJSONIncludeWrapped = true;
    }
    next();
  }

  out._jsonWrap = jsonWrap;
  out._processQuery = processQuery;
  out._processObject = processObject;
  out._requestName = requestName;

  return out;
}
