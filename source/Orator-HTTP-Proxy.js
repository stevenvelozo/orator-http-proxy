const FableServiceProviderBase = require('fable-serviceproviderbase');

const HttpProxy = require('http-proxy');

/**
 * Fable service that provies a simple proxy for an orator web server instance that redirects /1.0/* to
 * a given URL (ex. a hosted Headlight API).
 */
class HeadlightAPIProxyService extends FableServiceProviderBase
{
	/**
	 * Construct a service instance.
	 *
	 * @param {object} pFable The fable instance for the application. Used for logging and settings.
	 * @param {object} pOptions Custom settings for this service instance.
	 * @param {string} pServiceHash The hash for this service instance.
	 *
	 * @return a HeadlightAPIProxyService instance.
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		if (typeof(this.options.proxyUrl) != 'string' || !this.options.proxyUrl.startsWith('http'))
		{
			this.log.trace('API proxy url falling back to settings...', { badUrl: this.options.proxyUrl });
			this.options.proxyUrl = this.fable.settings.APIProxyUrl;
		}

		if (typeof(this.options.proxyUrl) != 'string' || !this.options.proxyUrl.startsWith('http'))
		{
			this.log.trace('API proxy url falling back to default...', { badUrl: this.options.proxyUrl });
			this.options.proxyUrl = 'https://127.0.0.1/';
		}

		if (typeof(this.options.requestPrefix) != 'string' || !this.options.requestPrefix.startsWith('/'))
		{
			this.options.requestPrefix = '/1.0/*';
		}

		if (!Array.isArray(this.options.requestPrefixes) || this.options.requestPrefixes.length < 1)
		{
			this.options.requestPrefixes = [this.options.requestPrefix];
		}

		this.httpProxyServer = HttpProxy.createProxyServer({});
	}

	/**
	 * Create handlers for each HTTP verb on /1.0/* that proxy requests to the configured proxy URL.
	 */
	connectProxyRoutes(pOrator)
	{
		const proxyRequest = (pRequest, pResponse, fNext) =>
		{
			this.log.info(`Proxying request from URI [${pRequest.url}] to [${this.options.proxyUrl}]`);
			const options =
			{
				target: this.options.proxyUrl,
				secure: false, // needed when proxying from HTTP to HTTPS
			};
			if (this.options.httpProxyOptions)
			{
				Object.assign(options, this.options.httpProxyOptions);
			}
			try
			{
				this.httpProxyServer.web(pRequest, pResponse, options);
			}
			catch (pError)
			{
				this.log.error(`Error proxying ${pRequest.url}: ${pError.message}`, { stack: pError.stack });
				pResponse.end(` - ERROR: ${pError.message}`);
			}
		};

		this.log.info('Adding API proxy to orator...', { proxyUrl: this.options.proxyUrl, requestPrefixes: this.options.requestPrefixes });

		for (const requestPrefix of this.options.requestPrefixes)
		{
			pOrator.webServer.get(requestPrefix, proxyRequest);
			pOrator.webServer.put(requestPrefix, proxyRequest);
			pOrator.webServer.del(requestPrefix, proxyRequest);
			pOrator.webServer.post(requestPrefix, proxyRequest);
		}
	}
}

module.exports = HeadlightAPIProxyService;
