node-restify-include
====================

Simple middleware for restify (probably compatible with many other libraries as well) that adds the include query behavior to json api.

Let's say a random API request to http://api.something.com/api/cars/123 has the following schema:

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

The middleware listens to the query parameter 'include'. Any name specified is then searched in the response (1 layer down). If there is a property in any of the objects found that has name + '_url' in it, it will request that data.

Install
-------

```javascript
var includes = require('node-restify-include');

// create server here

server.use(includes()); //Add the middleware
```

Configuration
-------------

The middleware defaults includes the `authorization` header from the original request. You can also ask it to include any other headers from the original request like so:

```javascript
//Make the middleware forward the following headers from the original request.
server.use(includes({
  headers: ['authorization', 'user-agent', 'x-request-id']
}));
```
