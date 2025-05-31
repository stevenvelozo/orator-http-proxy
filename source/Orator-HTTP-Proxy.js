const FableServiceProviderBase = require('fable-serviceproviderbase');

const HttpProxy = require('http-proxy');

/**
 * Fable service that provies a simple proxy for an orator web server instance that redirects /1.0/* to
 * a given URL (ex. a hosted REST API).
 */
class OratorAPIProxy extends FableServiceProviderBase
{
	/**
	 * Construct a service instance.
	 *
	 * @param {object} pFable The fable instance for the application. Used for logging and settings.
	 * @param {object} pOptions Custom settings for this service instance.
	 * @param {string} pServiceHash The hash for this service instance.
	 *
	 * @return a OratorAPIProxy instance.
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);


		// By jacking up the log level, the static server will become more and more communicative.
		this.LogLevel = (`LogLevel` in this.options) ? this.options.LogLevel
						: `OratorHTTPProxyLogLevel` in this.fable.settings ? this.fable.settings.OratorHTTPProxyLogLevel
						: 0;

		// The proxy url falls back to loopback if not provided.
		this.proxyDestinationURL = (`DestinationURL` in this.options) ? this.options.DestinationURL
						: `OratorHTTPProxyDestinationURL` in this.fable.settings ? this.fable.settings.OratorHTTPProxyDestinationURL
						: 'http://127.0.0.1/';

		// The request prefix falls back to the /1.0/* meadow default if not provided.
		this.requestPrefixList = (`RequestPrefixList` in this.options) ? this.options.RequestPrefix
						: `OratorHTTPProxyRequestPrefixList` in this.fable.settings ? this.fable.settings.OratorHTTPProxyRequestPrefixList
						: ['/1.0/*'];

		this.httpProxyServer = HttpProxy.createProxyServer({});
	}

	/**
	 * Create handlers for each HTTP verb on the request prefix list to proxy requests to the configured proxy URL.
	 */
	connectProxyRoutes(pRequestPrefixList, pProxyURL)
	{
		if (!'Orator' in this.fable)
		{
			this.fable.log.error('Orator must be initialized before adding a static route.');
			return false;
		}

		// We will proxy each prefix in the array -- this is a convenience function to allow for a single string or function to be passed in.
		let tmpRequestPrefixList = (typeof(pRequestPrefix) === 'string') ? [pRequestPrefixList]
						// Expect the function to return an array
						: (typeof(pRequestPrefixList) === 'function') ? pRequestPrefixList()
						: Array.isArray(pRequestPrefixList) ? pRequestPrefixList
						: this.requestPrefixList;

		// The complete URL to proxy to (e.g. `http://localhost:3000/`)
		let tmpProxyDestinationURL = (typeof(pProxyURL) === 'string') ? pProxyURL : this.proxyDestinationURL;

		const proxyRequest = (pRequest, pResponse, fNext) =>
		{
			this.log.info(`Proxying request from URI [${pRequest.url}] to [${tmpProxyDestinationURL}]`);
			const tmpHTTPProxyOptions =
			{
				target: tmpProxyDestinationURL,
				secure: false, // needed when proxying from HTTP to HTTPS
			};
			if (this.options.httpProxyOptions)
			{
				Object.assign(tmpHTTPProxyOptions, this.options.httpProxyOptions);
			}
			try
			{
				this.httpProxyServer.web(pRequest, pResponse, tmpHTTPProxyOptions);
				// return fNext();
			}
			catch (pError)
			{
				this.log.error(`Error proxying ${pRequest.url}: ${pError.message}`, { Error: pError });
				// TODO: Make this a configuration
				pResponse.end(JSON.stringify(pError));
				return fNext();
			}
		};

		this.log.info('Adding API proxies to orator...', { proxyUrl: this.options.proxyUrl, requestPrefixes: this.options.requestPrefixes });

		for (let i = 0; i < tmpRequestPrefixList.length; i++)
		{
			let tmpRequestPrefix = tmpRequestPrefixList[i];
			this.log.info(`Adding http connection from [${tmpRequestPrefix}] proxied to ${tmpProxyDestinationURL}`);
			this.fable.Orator.serviceServer.get(tmpRequestPrefix, proxyRequest);
			this.fable.Orator.serviceServer.put(tmpRequestPrefix, proxyRequest);
			this.fable.Orator.serviceServer.del(tmpRequestPrefix, proxyRequest);
			this.fable.Orator.serviceServer.post(tmpRequestPrefix, proxyRequest);
		}
	}
}

module.exports = OratorAPIProxy;
