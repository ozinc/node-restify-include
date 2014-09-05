node-restify-include
====================

Simple middleware for restify (probably compatible with many other libraries as well) that adds the include query behavior to your API.

Let's say a random API request to http://api.something.com/api/cars/123 has the following data:

```javascript
{
  id: 123,
  name: 'Model S',
  manufacturer_id: 'tesla',
  manufacturer_url: 'http://api.something.com/api/manufacturer/tesla'
}
```

Now with the include middleware, you can do http://api.something.com/api/cars/123?include=manufacturer and the middleware will automatically for you, request the manufacturer object for you (following the url above) and include it in the reponse:

```javascript
{
  id: 123,
  name: 'Model S',
  manufacturer_id: 'tesla',
  manufacturer_url: 'http://api.something.com/api/manufacturer/tesla',
  manufacturer: {
    id: 'tesla',
    name: 'Tesla'
  }
}
```

How it works
------------

The middleware checks for the query parameter `include`. If a url for the field(s) specified in the `include` parameter exists in the response object (`<fieldName>_url`), a request to that url is made and the results embeded in the response. 

Install
-------

```javascript
var include = require('node-restify-include');

// create server here

server.use(include()); //Add the middleware
```

Configuration
-------------

The middleware defaults includes the `authorization` header from the original request. You can also ask it to include any other headers from the original request like so:

```javascript
//Make the middleware forward the following headers from the original request.
server.use(include({
  headers: ['authorization', 'user-agent', 'x-request-id']
}));
```
