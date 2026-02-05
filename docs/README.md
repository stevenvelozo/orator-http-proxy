# Orator HTTP Proxy

> HTTP proxy pass-through for Orator service servers

Orator HTTP Proxy is a Fable service that forwards incoming requests matching specified route prefixes to a backend destination URL. It uses the [http-proxy](https://github.com/http-party/node-http-proxy) library under the hood.

This is a common pattern in microservice architectures: a frontend Orator server handles static files and client-facing routes, while proxying API calls to a separate backend service. Instead of configuring a reverse proxy at the infrastructure level, you can handle it right in your application.

## Features

- **Route-Based Proxying** - Proxy specific route prefixes to a destination URL
- **Multi-Verb Support** - Proxies GET, PUT, POST, and DELETE requests
- **Configurable** - Settings via constructor options or Fable settings
- **HTTP-to-HTTPS** - Handles proxying from HTTP origins to HTTPS destinations
- **Fable Service Provider** - Registers as a standard Fable service

## How It Works

When you call `connectProxyRoutes()`, the module registers GET, PUT, POST, and DELETE handlers on the Orator service server for each prefix in the `RequestPrefixList`. When a matching request comes in, it is forwarded to the `DestinationURL` using `http-proxy`.

```
Client Request: GET /api/v1/users
    ↓
Orator ServiceServer matches /api/v1/*
    ↓
HTTP Proxy forwards to http://backend:3000/api/v1/users
    ↓
Backend response is returned to the client
```

## Quick Start

```javascript
const libFable = require('fable');
const libOrator = require('orator');
const libOratorServiceServerRestify = require('orator-serviceserver-restify');
const libOratorHTTPProxy = require('orator-http-proxy');

const _Fable = new libFable({
	Product: 'MyProxyServer',
	ServicePort: 8080
});

_Fable.serviceManager.addServiceType('Orator', libOrator);
_Fable.serviceManager.addServiceType('OratorServiceServer', libOratorServiceServerRestify);
_Fable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);
_Fable.serviceManager.instantiateServiceProvider('Orator');
_Fable.serviceManager.instantiateServiceProvider('OratorServiceServer');
_Fable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
	{
		DestinationURL: 'http://backend-api:3000/',
		RequestPrefixList: ['/api/v1/*']
	});

_Fable.Orator.initialize(
	() =>
	{
		_Fable.OratorHTTPProxy.connectProxyRoutes();
		_Fable.Orator.startService();
	});
```

## Related Packages

- [orator](https://github.com/stevenvelozo/orator) - Main Orator service abstraction
- [orator-serviceserver-restify](https://github.com/stevenvelozo/orator-serviceserver-restify) - Restify service server
- [fable](https://github.com/stevenvelozo/fable) - Service provider framework
