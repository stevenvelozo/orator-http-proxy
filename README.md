# Orator HTTP Proxy

> HTTP proxy pass-through for Orator service servers

Orator HTTP Proxy provides a simple way to forward incoming requests to a backend service. Register route prefixes that should be proxied, point them at a destination URL, and the module handles the rest. This is useful for microservice architectures where a frontend server needs to proxy API calls to a separate backend service.

## Features

- **Route-Based Proxying** - Proxy specific route prefixes to a destination URL
- **Multi-Verb Support** - Proxies GET, PUT, POST, and DELETE requests
- **Configurable** - Settings via constructor options or Fable settings
- **HTTP-to-HTTPS** - Handles proxying from HTTP origins to HTTPS destinations
- **Fable Service Provider** - Registers as a standard Fable service

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

// Initialize Orator and connect proxy routes
_Fable.Orator.initialize(
	() =>
	{
		_Fable.OratorHTTPProxy.connectProxyRoutes();
		_Fable.Orator.startService();
	});
```

## Installation

```bash
npm install orator-http-proxy
```

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `DestinationURL` | string | `"http://127.0.0.1/"` | URL to proxy requests to |
| `RequestPrefixList` | array | `["/1.0/*"]` | Route prefixes to intercept and proxy |
| `LogLevel` | number | `0` | Logging verbosity (higher = more output) |
| `httpProxyOptions` | object | `{}` | Additional options passed to `http-proxy` |

Settings can also be provided via Fable settings:

| Fable Setting | Maps To |
|---------------|---------|
| `OratorHTTPProxyDestinationURL` | `DestinationURL` |
| `OratorHTTPProxyRequestPrefixList` | `RequestPrefixList` |
| `OratorHTTPProxyLogLevel` | `LogLevel` |

## API

### connectProxyRoutes(pRequestPrefixList, pProxyURL)

Create proxy handlers for the specified route prefixes. Both parameters are optional and fall back to the configured defaults.

```javascript
// Use configured defaults
_Fable.OratorHTTPProxy.connectProxyRoutes();

// Override at call time
_Fable.OratorHTTPProxy.connectProxyRoutes(
	['/api/*', '/data/*'],
	'http://other-backend:4000/'
);
```

## Documentation

Full documentation is available in the [`docs`](./docs) folder, or served locally:

```bash
npx docsify-cli serve docs
```

## Related Packages

- [orator](https://github.com/stevenvelozo/orator) - Main Orator service abstraction
- [orator-serviceserver-restify](https://github.com/stevenvelozo/orator-serviceserver-restify) - Restify service server
- [fable](https://github.com/stevenvelozo/fable) - Service provider framework
