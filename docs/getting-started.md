# Getting Started

## Installation

```bash
npm install orator-http-proxy
```

You will also need `orator` and a service server implementation (like `orator-serviceserver-restify`):

```bash
npm install fable orator orator-serviceserver-restify orator-http-proxy
```

## Basic Setup

```javascript
const libFable = require('fable');
const libOrator = require('orator');
const libOratorServiceServerRestify = require('orator-serviceserver-restify');
const libOratorHTTPProxy = require('orator-http-proxy');

const _Fable = new libFable({
	Product: 'MyProxyServer',
	ServicePort: 8080
});

// Set up Orator with Restify
_Fable.serviceManager.addServiceType('Orator', libOrator);
_Fable.serviceManager.addServiceType('OratorServiceServer', libOratorServiceServerRestify);
_Fable.serviceManager.instantiateServiceProvider('Orator');
_Fable.serviceManager.instantiateServiceProvider('OratorServiceServer');

// Set up the proxy
_Fable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);
_Fable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
	{
		DestinationURL: 'http://backend-api:3000/',
		RequestPrefixList: ['/api/v1/*']
	});

// Initialize and connect
_Fable.Orator.initialize(
	() =>
	{
		_Fable.OratorHTTPProxy.connectProxyRoutes();
		_Fable.Orator.startService();
	});
```

## Multiple Proxy Prefixes

You can proxy multiple route prefixes to the same backend:

```javascript
_Fable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
	{
		DestinationURL: 'http://backend-api:3000/',
		RequestPrefixList: ['/api/v1/*', '/api/v2/*', '/auth/*']
	});
```

## Multiple Backends

To proxy different prefixes to different backends, instantiate multiple proxy services:

```javascript
_Fable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
	{
		DestinationURL: 'http://api-service:3000/',
		RequestPrefixList: ['/api/*']
	}, 'APIProxy');

_Fable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
	{
		DestinationURL: 'http://auth-service:4000/',
		RequestPrefixList: ['/auth/*']
	}, 'AuthProxy');

// Connect both after Orator initializes
_Fable.Orator.initialize(
	() =>
	{
		_Fable.servicesMap['OratorHTTPProxy']['APIProxy'].connectProxyRoutes();
		_Fable.servicesMap['OratorHTTPProxy']['AuthProxy'].connectProxyRoutes();
		_Fable.Orator.startService();
	});
```

## Combining with Static Files

A common pattern is to serve a frontend application statically while proxying API calls to a backend:

```javascript
_Fable.Orator.initialize(
	() =>
	{
		// Proxy API calls to the backend
		_Fable.OratorHTTPProxy.connectProxyRoutes();

		// Serve static files for everything else
		_Fable.Orator.addStaticRoute('./public/', 'index.html', '/*');

		_Fable.Orator.startService();
	});
```
