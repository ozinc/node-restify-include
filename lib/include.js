'use strict';

var url = require('url');
var p = require('bluebird');
var _ = require('lodash');
var restify = require('restify');

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

  function createPromise(obj, name, headers) {
    //Return a promise job.
    return new p(function(resolve, reject) {
      //First parse the url so we can seperate it
      //by host and path.
      var parsed = url.parse(obj[name + '_url']);

      //Create our json client. We use lodash to pick
      //out the headers from the request to pass along.
      var client = restify.createJsonClient({
        url: parsed.protocol + '//' + parsed.host,
        headers: _.pick(headers, options.headers)
      });

      //console.log(_.pick(headers, options.headers), 'Sending request to ' + obj[name + '_url'])

      //Get the data!
      client.get(parsed.path, function(err, req, res, result) {
        if (err) {
          return reject(err);
        }
        obj[name] = result;
        resolve();
      })
    });
  }

  function processObject(obj, names, headers) {
    var jobs = [];
    for (var i = 0; i < names.length; i++) {
      if (obj[names[i] + '_url']) {
        jobs.push(createPromise(obj, names[i], headers));
      }
    }
    return jobs;
  }

  function processQuery(query, headers, obj) {
    //Make sure we have an include query.
    if (!query.include) {
      return [];
    }

    //Split include query with ',' and remove any empty
    //entries.
    var includes = _.compact(query.include.split(/,/g));

    if (includes.length === 0) {
      return [];
    }

    var jobs = [];

    //If the output object is array, we need to loop through it.
    if (_.isArray(obj)) {
      obj.forEach(function(item) {
        jobs.push(processObject(item, includes, headers));
      });
    } else {
      jobs.push(processObject(obj, includes, headers));
    }

    //Flatten the jobs array. In case we have array of array jobs
    jobs = _.flatten(jobs);

    return jobs;
  }

  function jsonWrap(req, res, next, fn) {
    return function(statusCode, obj) {
      //Ensure default options.
      if (!obj) {
        obj = statusCode;
        statusCode = 200;
      }

      //Get required jobs
      var jobs = processQuery(req.query, req.headers, obj);

      //If there's nothing to do, just call original res.json.
      if (jobs.length === 0) {
        return fn.call(res, statusCode, obj);
      }

      //Process all the jobs and then call the original res.json.
      p.all(jobs).then(function() {
        return fn.call(res, statusCode, obj);
      }).catch(function(e) {
        next(e);
      });
    }
  }

  var out = function(req, res, next) {
    //Make sure it hasn't been wrapped before.
    if (!res.__isJSONIncludeWrapped) {
      //Wrap the res.json function.
      res.json = jsonWrap(req, res, next, res.json);

      //Prevent any further wrapping.
      res.__isJSONIncludeWrapped = true;
    }
    next();
  }

  out._jsonWrap = jsonWrap;
  out._processQuery = processQuery;
  out._processObject = processObject;
  out._createPromise = createPromise;

  return out;
}
