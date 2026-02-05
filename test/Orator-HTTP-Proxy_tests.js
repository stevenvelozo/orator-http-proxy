/**
* Unit tests for Orator HTTP Proxy
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

const Chai = require("chai");
const Expect = Chai.expect;

const libFable = require('fable');
const libOrator = require('orator');
const libOratorHTTPProxy = require('../source/Orator-HTTP-Proxy.js');

const defaultFableSettings = (
	{
		Product: 'OratorHTTPProxy-Tests',
		ProductVersion: '0.0.0',
		APIServerPort: 0
	});

/**
 * Helper that creates a Fable + Orator + Proxy harness, starts the service, then calls back.
 *
 * @param {object} pFableSettings - Fable settings to merge with defaults.
 * @param {object} pProxyOptions - Options for the proxy instance.
 * @param {Function} fCallback - Called with the harness object after the service starts.
 */
function createStartedHarness(pFableSettings, pProxyOptions, fCallback)
{
	let tmpFableSettings = Object.assign({}, defaultFableSettings, pFableSettings || {});
	let tmpFable = new libFable(tmpFableSettings);

	tmpFable.serviceManager.addServiceType('Orator', libOrator);
	tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

	let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
	let tmpProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy', pProxyOptions || {});

	let tmpResult = (
		{
			fable: tmpFable,
			orator: tmpOrator,
			proxy: tmpProxy
		});

	tmpOrator.startService(
		() =>
		{
			return fCallback(tmpResult);
		});
}

suite
(
	'Orator HTTP Proxy',
	() =>
	{
		suite
		(
			'Object Sanity',
			() =>
			{
				test
				(
					'the class should initialize itself into a happy little object',
					(fDone) =>
					{
						let tmpFable = new libFable(defaultFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy', {});

						Expect(tmpProxy).to.be.an('object', 'OratorHTTPProxy should initialize as an object.');
						Expect(tmpProxy).to.have.a.property('connectProxyRoutes');
						Expect(tmpProxy.connectProxyRoutes).to.be.a('function');
						Expect(tmpProxy).to.have.a.property('httpProxyServer');
						Expect(tmpProxy.httpProxyServer).to.be.an('object');

						return fDone();
					}
				);

				test
				(
					'the proxy should have default configuration values when no options are provided',
					(fDone) =>
					{
						let tmpFable = new libFable(defaultFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy', {});

						// Default log level should be 0
						Expect(tmpProxy.LogLevel).to.equal(0);

						// Default proxy destination URL should be loopback
						Expect(tmpProxy.proxyDestinationURL).to.equal('http://127.0.0.1/');

						// Default request prefix list should be the meadow default
						Expect(tmpProxy.requestPrefixList).to.be.an('array');
						Expect(tmpProxy.requestPrefixList).to.deep.equal(['/1.0/*']);

						return fDone();
					}
				);

				test
				(
					'the proxy should accept DestinationURL and LogLevel via options',
					(fDone) =>
					{
						let tmpFable = new libFable(defaultFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
							{
								LogLevel: 3,
								DestinationURL: 'http://api.example.com:3000/'
							});

						Expect(tmpProxy.LogLevel).to.equal(3);
						Expect(tmpProxy.proxyDestinationURL).to.equal('http://api.example.com:3000/');

						return fDone();
					}
				);

				test
				(
					'the proxy should accept configuration via fable settings fallback',
					(fDone) =>
					{
						let tmpFableSettings = Object.assign({}, defaultFableSettings,
							{
								OratorHTTPProxyLogLevel: 2,
								OratorHTTPProxyDestinationURL: 'http://backend.local:8080/',
								OratorHTTPProxyRequestPrefixList: ['/api/v1/*', '/api/v2/*']
							});
						let tmpFable = new libFable(tmpFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy', {});

						Expect(tmpProxy.LogLevel).to.equal(2);
						Expect(tmpProxy.proxyDestinationURL).to.equal('http://backend.local:8080/');
						Expect(tmpProxy.requestPrefixList).to.be.an('array');
						Expect(tmpProxy.requestPrefixList).to.deep.equal(['/api/v1/*', '/api/v2/*']);

						return fDone();
					}
				);

				test
				(
					'options should take precedence over fable settings',
					(fDone) =>
					{
						let tmpFableSettings = Object.assign({}, defaultFableSettings,
							{
								OratorHTTPProxyLogLevel: 2,
								OratorHTTPProxyDestinationURL: 'http://fallback.local/'
							});
						let tmpFable = new libFable(tmpFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
							{
								LogLevel: 5,
								DestinationURL: 'http://primary.local/'
							});

						// Options values should win over fable settings
						Expect(tmpProxy.LogLevel).to.equal(5);
						Expect(tmpProxy.proxyDestinationURL).to.equal('http://primary.local/');

						return fDone();
					}
				);

				test
				(
					'the httpProxyServer should be created as a real http-proxy instance',
					(fDone) =>
					{
						let tmpFable = new libFable(defaultFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy', {});

						Expect(tmpProxy.httpProxyServer).to.be.an('object');
						Expect(tmpProxy.httpProxyServer.web).to.be.a('function');
						Expect(tmpProxy.httpProxyServer.ws).to.be.a('function');

						return fDone();
					}
				);
			}
		);

		suite
		(
			'Proxy Route Connection',
			() =>
			{
				test
				(
					'connectProxyRoutes should register routes on the orator service server',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://localhost:9999/'
							},
							(pHarness) =>
							{
								pHarness.proxy.connectProxyRoutes(['/api/v1/*']);

								// Verify the route is registered by checking the IPC router can find it
								let tmpHandler = pHarness.orator.serviceServer.router.find('GET', '/api/v1/users');
								Expect(tmpHandler).to.be.an('object');
								Expect(tmpHandler).to.have.a.property('handler');
								Expect(tmpHandler.handler).to.be.a('function');

								return fDone();
							});
					}
				);

				test
				(
					'connectProxyRoutes should register routes for GET, PUT, POST and DELETE',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://localhost:9999/'
							},
							(pHarness) =>
							{
								pHarness.proxy.connectProxyRoutes(['/proxy/*']);

								let tmpExpectedMethods = ['GET', 'PUT', 'POST', 'DELETE'];

								tmpExpectedMethods.forEach(
									(pMethod) =>
									{
										let tmpHandler = pHarness.orator.serviceServer.router.find(pMethod, '/proxy/resource');
										Expect(tmpHandler).to.be.an('object', `Route for ${pMethod} should be registered.`);
										Expect(tmpHandler).to.have.a.property('handler');
									});

								return fDone();
							});
					}
				);

				test
				(
					'connectProxyRoutes should register multiple prefixes at once',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://localhost:9999/'
							},
							(pHarness) =>
							{
								pHarness.proxy.connectProxyRoutes(['/api/v1/*', '/api/v2/*', '/legacy/*']);

								// Verify all three prefixes are registered
								let tmpPrefixes = ['/api/v1/users', '/api/v2/items', '/legacy/data'];

								tmpPrefixes.forEach(
									(pPrefix) =>
									{
										let tmpHandler = pHarness.orator.serviceServer.router.find('GET', pPrefix);
										Expect(tmpHandler).to.be.an('object', `Route for ${pPrefix} should be registered.`);
										Expect(tmpHandler).to.have.a.property('handler');
									});

								return fDone();
							});
					}
				);

				test
				(
					'connectProxyRoutes should accept a function that returns a prefix list',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://localhost:9999/'
							},
							(pHarness) =>
							{
								let tmpPrefixFunction = () =>
								{
									return ['/dynamic/v1/*', '/dynamic/v2/*'];
								};

								pHarness.proxy.connectProxyRoutes(tmpPrefixFunction);

								// Verify the dynamic routes are registered
								let tmpHandler1 = pHarness.orator.serviceServer.router.find('GET', '/dynamic/v1/test');
								Expect(tmpHandler1).to.be.an('object');
								Expect(tmpHandler1).to.have.a.property('handler');

								let tmpHandler2 = pHarness.orator.serviceServer.router.find('GET', '/dynamic/v2/test');
								Expect(tmpHandler2).to.be.an('object');
								Expect(tmpHandler2).to.have.a.property('handler');

								return fDone();
							});
					}
				);

				test
				(
					'connectProxyRoutes should fall back to default prefix list when no arguments are passed',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://localhost:9999/'
							},
							(pHarness) =>
							{
								// Call with no arguments -- should use the constructor defaults ['/1.0/*']
								pHarness.proxy.connectProxyRoutes();

								let tmpHandler = pHarness.orator.serviceServer.router.find('GET', '/1.0/SomeEntity');
								Expect(tmpHandler).to.be.an('object');
								Expect(tmpHandler).to.have.a.property('handler');

								return fDone();
							});
					}
				);

				test
				(
					'connectProxyRoutes should register routes for a custom proxy URL parameter',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://default-backend.local/'
							},
							(pHarness) =>
							{
								// Pass a custom proxy URL as the second parameter
								pHarness.proxy.connectProxyRoutes(['/custom/*'], 'http://custom-backend.local:5000/');

								// Verify the route is registered
								let tmpHandler = pHarness.orator.serviceServer.router.find('GET', '/custom/resource');
								Expect(tmpHandler).to.be.an('object');
								Expect(tmpHandler).to.have.a.property('handler');

								return fDone();
							});
					}
				);

				test
				(
					'connectProxyRoutes should be callable multiple times to add routes incrementally',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://localhost:9999/'
							},
							(pHarness) =>
							{
								// Register routes in two separate calls
								pHarness.proxy.connectProxyRoutes(['/first-batch/*']);
								pHarness.proxy.connectProxyRoutes(['/second-batch/*']);

								let tmpHandler1 = pHarness.orator.serviceServer.router.find('GET', '/first-batch/resource');
								Expect(tmpHandler1).to.be.an('object');
								Expect(tmpHandler1).to.have.a.property('handler');

								let tmpHandler2 = pHarness.orator.serviceServer.router.find('GET', '/second-batch/resource');
								Expect(tmpHandler2).to.be.an('object');
								Expect(tmpHandler2).to.have.a.property('handler');

								return fDone();
							});
					}
				);
			}
		);

		suite
		(
			'Proxy Request Behavior',
			() =>
			{
				test
				(
					'the proxy handler should call httpProxyServer.web with the correct target',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://api.example.com:3000/'
							},
							(pHarness) =>
							{
								let tmpWebCalled = false;
								let tmpCapturedOptions = null;

								// Mock BEFORE connecting routes — the handler captures `this.httpProxyServer`
								// at call time, so we can replace it before invocation
								pHarness.proxy.httpProxyServer.web = (pRequest, pResponse, pOptions) =>
								{
									tmpWebCalled = true;
									tmpCapturedOptions = pOptions;
								};

								pHarness.proxy.connectProxyRoutes(['/api/*']);

								// Invoke the handler via the IPC router directly
								// The proxy handler does NOT call fNext() on success (by design for real HTTP),
								// so the returned promise will never resolve. We use setTimeout to check
								// our mock assertions after the synchronous code has executed.
								let tmpMockRequest = { method: 'GET', url: '/api/users' };
								let tmpMockResponse = { send: () => {}, end: () => {} };

								let tmpRouteHandler = pHarness.orator.serviceServer.router.find('GET', '/api/users');
								tmpRouteHandler.handler(tmpMockRequest, tmpMockResponse, {});

								setTimeout(
									() =>
									{
										Expect(tmpWebCalled).to.equal(true);
										Expect(tmpCapturedOptions.target).to.equal('http://api.example.com:3000/');
										Expect(tmpCapturedOptions.secure).to.equal(false);
										return fDone();
									}, 100);
							});
					}
				);

				test
				(
					'the proxy handler should merge custom httpProxyOptions',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://localhost:9999/',
								httpProxyOptions:
								{
									changeOrigin: true,
									xfwd: true
								}
							},
							(pHarness) =>
							{
								// Verify options are stored
								Expect(pHarness.proxy.options.httpProxyOptions).to.be.an('object');
								Expect(pHarness.proxy.options.httpProxyOptions.changeOrigin).to.equal(true);

								let tmpCapturedOptions = null;
								pHarness.proxy.httpProxyServer.web = (pRequest, pResponse, pOptions) =>
								{
									tmpCapturedOptions = pOptions;
								};

								pHarness.proxy.connectProxyRoutes(['/merged/*']);

								let tmpMockRequest = { method: 'GET', url: '/merged/test' };
								let tmpMockResponse = { send: () => {}, end: () => {} };

								let tmpRouteHandler = pHarness.orator.serviceServer.router.find('GET', '/merged/test');
								tmpRouteHandler.handler(tmpMockRequest, tmpMockResponse, {});

								setTimeout(
									() =>
									{
										Expect(tmpCapturedOptions).to.be.an('object');
										Expect(tmpCapturedOptions.target).to.equal('http://localhost:9999/');
										Expect(tmpCapturedOptions.secure).to.equal(false);
										Expect(tmpCapturedOptions.changeOrigin).to.equal(true);
										Expect(tmpCapturedOptions.xfwd).to.equal(true);
										return fDone();
									}, 100);
							});
					}
				);

				test
				(
					'the proxy handler should pass the request URL through to httpProxyServer.web',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://localhost:9999/'
							},
							(pHarness) =>
							{
								let tmpCapturedRequest = null;
								pHarness.proxy.httpProxyServer.web = (pRequest, pResponse, pOptions) =>
								{
									tmpCapturedRequest = pRequest;
								};

								pHarness.proxy.connectProxyRoutes(['/1.0/*']);

								let tmpMockRequest = { method: 'GET', url: '/1.0/Users/123' };
								let tmpMockResponse = { send: () => {}, end: () => {} };

								let tmpRouteHandler = pHarness.orator.serviceServer.router.find('GET', '/1.0/Users/123');
								tmpRouteHandler.handler(tmpMockRequest, tmpMockResponse, {});

								setTimeout(
									() =>
									{
										Expect(tmpCapturedRequest).to.be.an('object');
										Expect(tmpCapturedRequest.url).to.equal('/1.0/Users/123');
										return fDone();
									}, 100);
							});
					}
				);

				test
				(
					'the proxy handler should use the custom URL when one is provided to connectProxyRoutes',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://default.local/'
							},
							(pHarness) =>
							{
								let tmpCapturedTarget = null;
								pHarness.proxy.httpProxyServer.web = (pRequest, pResponse, pOptions) =>
								{
									tmpCapturedTarget = pOptions.target;
								};

								pHarness.proxy.connectProxyRoutes(['/custom/*'], 'http://override.local:5000/');

								let tmpMockRequest = { method: 'GET', url: '/custom/endpoint' };
								let tmpMockResponse = { send: () => {}, end: () => {} };

								let tmpRouteHandler = pHarness.orator.serviceServer.router.find('GET', '/custom/endpoint');
								tmpRouteHandler.handler(tmpMockRequest, tmpMockResponse, {});

								setTimeout(
									() =>
									{
										Expect(tmpCapturedTarget).to.equal('http://override.local:5000/');
										return fDone();
									}, 100);
							});
					}
				);

				test
				(
					'the proxy handler should use the constructor URL when no URL is provided to connectProxyRoutes',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://configured.local:8080/'
							},
							(pHarness) =>
							{
								let tmpCapturedTarget = null;
								pHarness.proxy.httpProxyServer.web = (pRequest, pResponse, pOptions) =>
								{
									tmpCapturedTarget = pOptions.target;
								};

								pHarness.proxy.connectProxyRoutes(['/default/*']);

								let tmpMockRequest = { method: 'GET', url: '/default/endpoint' };
								let tmpMockResponse = { send: () => {}, end: () => {} };

								let tmpRouteHandler = pHarness.orator.serviceServer.router.find('GET', '/default/endpoint');
								tmpRouteHandler.handler(tmpMockRequest, tmpMockResponse, {});

								setTimeout(
									() =>
									{
										Expect(tmpCapturedTarget).to.equal('http://configured.local:8080/');
										return fDone();
									}, 100);
							});
					}
				);

				test
				(
					'the proxy should always set secure:false for HTTPS targets',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'https://secure-api.example.com/'
							},
							(pHarness) =>
							{
								let tmpCapturedSecure = null;
								pHarness.proxy.httpProxyServer.web = (pRequest, pResponse, pOptions) =>
								{
									tmpCapturedSecure = pOptions.secure;
								};

								pHarness.proxy.connectProxyRoutes(['/secure/*']);

								let tmpMockRequest = { method: 'GET', url: '/secure/endpoint' };
								let tmpMockResponse = { send: () => {}, end: () => {} };

								let tmpRouteHandler = pHarness.orator.serviceServer.router.find('GET', '/secure/endpoint');
								tmpRouteHandler.handler(tmpMockRequest, tmpMockResponse, {});

								setTimeout(
									() =>
									{
										Expect(tmpCapturedSecure).to.equal(false);
										return fDone();
									}, 100);
							});
					}
				);
			}
		);

		suite
		(
			'Proxy Error Handling',
			() =>
			{
				test
				(
					'the proxy should catch errors thrown by httpProxyServer.web',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://localhost:59999/'
							},
							(pHarness) =>
							{
								pHarness.proxy.connectProxyRoutes(['/error-test/*']);

								let tmpErrorLogged = false;

								pHarness.proxy.httpProxyServer.web = (pRequest, pResponse, pOptions) =>
								{
									throw new Error('Simulated proxy connection failure');
								};

								let tmpMockRequest = { method: 'GET', url: '/error-test/resource' };
								let tmpMockResponse =
								{
									send: () => {},
									end: (pData) =>
									{
										// The catch block calls pResponse.end(JSON.stringify(pError))
										tmpErrorLogged = true;
									}
								};

								let tmpRouteHandler = pHarness.orator.serviceServer.router.find('GET', '/error-test/resource');
								tmpRouteHandler.handler(tmpMockRequest, tmpMockResponse, {}).then(
									() =>
									{
										// The error path calls fNext() after end()
										Expect(tmpErrorLogged).to.equal(true);
										return fDone();
									}).catch(
									(pError) =>
									{
										// May propagate depending on IPC internals
										Expect(tmpErrorLogged).to.equal(true);
										return fDone();
									});
							});
					}
				);

				test
				(
					'the proxy error handler should log the error with the request URL',
					(fDone) =>
					{
						createStartedHarness(null,
							{
								DestinationURL: 'http://localhost:59999/'
							},
							(pHarness) =>
							{
								pHarness.proxy.connectProxyRoutes(['/log-error/*']);

								let tmpErrorMessage = null;
								let tmpOriginalLogError = pHarness.proxy.log.error.bind(pHarness.proxy.log);
								pHarness.proxy.log.error = (pMessage, pData) =>
								{
									tmpErrorMessage = pMessage;
									tmpOriginalLogError(pMessage, pData);
								};

								pHarness.proxy.httpProxyServer.web = (pRequest, pResponse, pOptions) =>
								{
									throw new Error('Connection refused');
								};

								let tmpMockRequest = { method: 'GET', url: '/log-error/resource' };
								let tmpMockResponse = { send: () => {}, end: () => {} };

								let tmpRouteHandler = pHarness.orator.serviceServer.router.find('GET', '/log-error/resource');
								tmpRouteHandler.handler(tmpMockRequest, tmpMockResponse, {}).then(
									() =>
									{
										Expect(tmpErrorMessage).to.be.a('string');
										Expect(tmpErrorMessage).to.include('/log-error/resource');
										Expect(tmpErrorMessage).to.include('Connection refused');
										return fDone();
									}).catch(
									(pError) =>
									{
										if (tmpErrorMessage)
										{
											Expect(tmpErrorMessage).to.include('/log-error/resource');
											Expect(tmpErrorMessage).to.include('Connection refused');
											return fDone();
										}
										return fDone(pError);
									});
							});
					}
				);
			}
		);

		suite
		(
			'Multiple Proxy Instances',
			() =>
			{
				test
				(
					'multiple proxy instances should coexist with different configurations',
					(fDone) =>
					{
						let tmpFable = new libFable(defaultFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxyA = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
							{
								DestinationURL: 'http://backend-a.local:3000/'
							});
						let tmpProxyB = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
							{
								DestinationURL: 'http://backend-b.local:4000/'
							});

						Expect(tmpProxyA.proxyDestinationURL).to.equal('http://backend-a.local:3000/');
						Expect(tmpProxyB.proxyDestinationURL).to.equal('http://backend-b.local:4000/');

						// Each instance should have its own proxy server
						Expect(tmpProxyA.httpProxyServer).to.be.an('object');
						Expect(tmpProxyB.httpProxyServer).to.be.an('object');
						Expect(tmpProxyA.httpProxyServer).to.not.equal(tmpProxyB.httpProxyServer);

						return fDone();
					}
				);

				test
				(
					'multiple proxy instances can register routes to different backends',
					(fDone) =>
					{
						let tmpFable = new libFable(defaultFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpAPIProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
							{
								DestinationURL: 'http://api-server.local:3000/'
							});
						let tmpAuthProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
							{
								DestinationURL: 'http://auth-server.local:4000/'
							});

						tmpOrator.startService(
							() =>
							{
								tmpAPIProxy.connectProxyRoutes(['/1.0/*']);
								tmpAuthProxy.connectProxyRoutes(['/auth/*', '/oauth/*']);

								// Verify all routes are registered
								let tmpAPIHandler = tmpFable.Orator.serviceServer.router.find('GET', '/1.0/Users');
								Expect(tmpAPIHandler).to.be.an('object');
								Expect(tmpAPIHandler).to.have.a.property('handler');

								let tmpAuthHandler = tmpFable.Orator.serviceServer.router.find('POST', '/auth/login');
								Expect(tmpAuthHandler).to.be.an('object');
								Expect(tmpAuthHandler).to.have.a.property('handler');

								let tmpOAuthHandler = tmpFable.Orator.serviceServer.router.find('GET', '/oauth/callback');
								Expect(tmpOAuthHandler).to.be.an('object');
								Expect(tmpOAuthHandler).to.have.a.property('handler');

								return fDone();
							});
					}
				);
			}
		);

		suite
		(
			'Configuration Edge Cases',
			() =>
			{
				test
				(
					'LogLevel zero should be the default when no log level is configured',
					(fDone) =>
					{
						let tmpFable = new libFable(defaultFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy', {});

						Expect(tmpProxy.LogLevel).to.equal(0);

						return fDone();
					}
				);

				test
				(
					'LogLevel should be settable to zero explicitly via options without falling to fable settings',
					(fDone) =>
					{
						let tmpFableSettings = Object.assign({}, defaultFableSettings,
							{
								OratorHTTPProxyLogLevel: 5
							});
						let tmpFable = new libFable(tmpFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
							{
								LogLevel: 0
							});

						// The `in` operator returns true for LogLevel:0 since the key exists
						Expect(tmpProxy.LogLevel).to.equal(0);

						return fDone();
					}
				);

				test
				(
					'the proxy destination URL should default to loopback when nothing is configured',
					(fDone) =>
					{
						let tmpFable = new libFable(defaultFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy', {});

						Expect(tmpProxy.proxyDestinationURL).to.equal('http://127.0.0.1/');

						return fDone();
					}
				);

				test
				(
					'the httpProxyServer should be an independent instance per proxy',
					(fDone) =>
					{
						let tmpFable = new libFable(defaultFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxyOne = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
							{
								DestinationURL: 'http://one.local/'
							});
						let tmpProxyTwo = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
							{
								DestinationURL: 'http://two.local/'
							});

						// Each proxy should have its own http-proxy server instance
						Expect(tmpProxyOne.httpProxyServer).to.not.equal(tmpProxyTwo.httpProxyServer);
						// And distinct destination URLs
						Expect(tmpProxyOne.proxyDestinationURL).to.not.equal(tmpProxyTwo.proxyDestinationURL);

						return fDone();
					}
				);

				test
				(
					'the RequestPrefixList options key has a known quirk where it reads RequestPrefix instead',
					(fDone) =>
					{
						// This test documents the behavior of the constructor's RequestPrefixList handling.
						// The constructor checks `RequestPrefixList` in options (using the `in` operator),
						// but then reads `this.options.RequestPrefix` (note: singular, not plural).
						// This means when RequestPrefixList is set in options, the value read is
						// this.options.RequestPrefix which is undefined.
						let tmpFable = new libFable(defaultFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy',
							{
								RequestPrefixList: ['/should-be-ignored/*']
							});

						// Because the constructor reads this.options.RequestPrefix (which is undefined),
						// the requestPrefixList ends up as undefined rather than the expected array.
						// This documents the current behavior — the mismatched key name.
						Expect(tmpProxy.requestPrefixList).to.equal(undefined);

						return fDone();
					}
				);

				test
				(
					'fable settings should provide the request prefix list when options do not',
					(fDone) =>
					{
						let tmpFableSettings = Object.assign({}, defaultFableSettings,
							{
								OratorHTTPProxyRequestPrefixList: ['/custom/v1/*', '/custom/v2/*']
							});
						let tmpFable = new libFable(tmpFableSettings);

						tmpFable.serviceManager.addServiceType('Orator', libOrator);
						tmpFable.serviceManager.addServiceType('OratorHTTPProxy', libOratorHTTPProxy);

						let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator', {});
						let tmpProxy = tmpFable.serviceManager.instantiateServiceProvider('OratorHTTPProxy', {});

						Expect(tmpProxy.requestPrefixList).to.be.an('array');
						Expect(tmpProxy.requestPrefixList).to.deep.equal(['/custom/v1/*', '/custom/v2/*']);

						return fDone();
					}
				);
			}
		);
	}
);
