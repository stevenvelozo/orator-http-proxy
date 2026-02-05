# Configuration

## Options

Configuration can be provided through constructor options, Fable settings, or both. The module checks in this order:

1. Constructor options (passed when instantiating the service)
2. Fable settings (with `OratorHTTPProxy` prefix)
3. Built-in defaults

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `DestinationURL` | string | `"http://127.0.0.1/"` | URL to proxy requests to |
| `RequestPrefixList` | array | `["/1.0/*"]` | Route prefixes to intercept and proxy |
| `LogLevel` | number | `0` | Logging verbosity (0 = quiet, higher = more output) |
| `httpProxyOptions` | object | `{}` | Additional options passed to `http-proxy` |

### Fable Settings

| Fable Setting | Maps To |
|---------------|---------|
| `OratorHTTPProxyDestinationURL` | `DestinationURL` |
| `OratorHTTPProxyRequestPrefixList` | `RequestPrefixList` |
| `OratorHTTPProxyLogLevel` | `LogLevel` |

### Example: Configuration via Options

```javascript
_Fable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
	{
		DestinationURL: 'http://backend:3000/',
		RequestPrefixList: ['/api/*'],
		LogLevel: 2
	});
```

### Example: Configuration via Fable Settings

```javascript
const _Fable = new libFable({
	Product: 'MyProxyServer',
	ServicePort: 8080,
	OratorHTTPProxyDestinationURL: 'http://backend:3000/',
	OratorHTTPProxyRequestPrefixList: ['/api/*'],
	OratorHTTPProxyLogLevel: 2
});

_Fable.serviceManager.instantiateServiceProvider('OratorHTTPProxy');
```

### Example: JSON Configuration File

```json
{
	"Product": "MyProxyServer",
	"ServicePort": 8080,
	"OratorHTTPProxyDestinationURL": "http://backend:3000/",
	"OratorHTTPProxyRequestPrefixList": ["/api/*"],
	"OratorHTTPProxyLogLevel": 0
}
```

## HTTP Proxy Options

The `httpProxyOptions` object is passed directly to the `http-proxy` library. Some useful options:

| Option | Type | Description |
|--------|------|-------------|
| `secure` | boolean | Verify SSL certificates (default: `false` in proxy handler) |
| `changeOrigin` | boolean | Change the origin header to the target URL |
| `headers` | object | Additional headers to add to proxied requests |
| `ws` | boolean | Enable WebSocket proxying |

```javascript
_Fable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
	{
		DestinationURL: 'https://secure-backend:443/',
		RequestPrefixList: ['/api/*'],
		httpProxyOptions:
		{
			changeOrigin: true,
			headers: { 'X-Proxy-Source': 'orator' }
		}
	});
```
