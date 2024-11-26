const FableServiceProviderBase = require('fable-serviceproviderbase');

const libServeStatic = require('serve-static');
const libFinalHandler = require('finalhandler');

/**
 * Fable service that provides a simple static file server.
 */
class OratorStaticFileService extends FableServiceProviderBase
{
	/**
	 * Construct a service instance.
	 *
	 * @param {object} pFable The fable instance for the application. Used for logging and settings.
	 * @param {object} pOptions Custom settings for this service instance.
	 * @param {string} pServiceHash The hash for this service instance.
	 *
	 * @return a static file service instance.
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		if (typeof(this.options.proxyUrl) != 'string' || !this.options.proxyUrl.startsWith('http'))
		{
			this.log.trace('API proxy url falling back to settings...', { badUrl: this.options.proxyUrl });
			this.options.proxyUrl = this.fable.settings.APIProxyUrl;
		}

		// By jacking up the log level, the static server will become more and more communicative.
		this.logLevel = (`LogLevel` in this.options) ? this.options.LogLevel
						: `OratorStaticServerLogLevel` in this.fable.settings ? this.fable.settings.OratorStaticServerLogLevel
						: 0;

		// The magic hosts option will look for the leftmost subdomain and use it as a subfolder.
		this.magicHostsEnabled = (`MagicHosts` in this.options) ? this.options.LogLevel
						: `OratorStaticServerMagicHosts` in this.fable.settings ? this.fable.settings.OratorStaticServerLogLevel
						: false;

		// The default folder to serve from
		this.defaultFolder = (`DefaultFolder` in this.options) ? this.options.DefaultFolder
						: (`OratorStaticServerDefaultFolder` in this.fable.settings) ? this.fable.settings.OratorStaticServerDefaultFolder
						: false;

		// Whether or not to auto map the route
		this.autoMap = (`AutoMap` in this.options) ? this.options.AutoMap
						: (`OratorStaticServerAutoMap` in this.fable.settings) ? this.fable.settings.OratorStaticServerAutoMap
						: false;

		this.fable.instantiateServiceProviderIfNotExists('FilePersistence');

		if (this.autoMap && this.defaultFolder)
		{
			this.log.info(`Auto-mapping static route [/*] to files in ==> [${this.defaultFolder}] default file [index.html]`);
			this.addStaticRoute(this.defaultFolder);
		}
	}


	/**
	 * Brought over from old orator and ported to work in the same way.
	 *
	 * @param {object} this.fable.Orator The Orator instance.
	 * @param {string} pFilePath The path on disk that we are serving files from.
	 * @param {string?} pDefaultFile (optional) The default file served if no specific file is requested.
	 * @param {string?} pRoute (optional) The route matcher that will be used. Defaults to everything.
	 * @param {string?} pRouteStrip (optional) If provided, this prefix will be removed from URL paths before being served.
	 * @param {object?} pParams (optional) Additional parameters to pass to serve-static.
	 * @return {boolean} true if the handler was successfully installed, otherwise false.
	 */
	addStaticRoute(pFilePath, pDefaultFile, pRoute, pRouteStrip, pParams)
	{
		if (!'Orator' in this.fable)
		{
			this.fable.log.error('Orator must be initialized before adding a static route.');
			return false;
		}
		if (!'serviceServer' in this.fable.Orator)
		{
			this.fable.log.error('Orator must have a service server initialized before adding a static route.');
			return false;
		}
		if (typeof(pFilePath) !== 'string')
		{
				this.fable.log.error('A file path must be passed in as part of the server.');
				return false;
		}

		// Default to just serving from root
		const tmpRoute = (typeof(pRoute) === 'undefined') ? '/*' : pRoute;
		const tmpRouteStrip = (typeof(pRouteStrip) === 'undefined') ? '/' : pRouteStrip;

		// Default to serving index.html
		const tmpDefaultFile = (typeof(pDefaultFile) === 'undefined') ? 'index.html' : pDefaultFile;

		this.fable.log.info('Orator mapping static route to files: '+tmpRoute+' ==> '+pFilePath+' '+tmpDefaultFile);

		// Add the route
		this.fable.Orator.serviceServer.get(tmpRoute, (pRequest, pResponse, fNext) =>
		{
				let servePath = pFilePath;

				if (this.magicHostsEnabled)
				{
					// See if there is a magic subdomain put at the beginning of a request.
					// If there is, then we need to see if there is a subfolder and add that to the file path
					let tmpHostSet = pRequest.headers.host.split('.');
					let tmpPotentialSubfolderMagicHost = false;
					// Check if there are more than one host in the host header (this will be 127 a lot)
					if (tmpHostSet.length > 1)
					{
						tmpPotentialSubfolderMagicHost = tmpHostSet[0];
					}
					if (tmpPotentialSubfolderMagicHost)
					{
						// Check if the subfolder exists
						let tmpPotentialSubfolder = servePath + tmpPotentialSubfolderMagicHost;
						if (this.fable.FilePersistence.libFS.existsSync(tmpPotentialSubfolder))
						{
							// If it does, then we need to add it to the file path
							servePath = `${tmpPotentialSubfolder}/`;
							if (this.logLevel > 1)
							{
								this.fable.log.trace(`Orator static magic mapped subdomain ${tmpPotentialSubfolderMagicHost}, altering servepath to [${servePath}]`);
							}
						}
					}
				}

				pRequest.url = pRequest.url.split('?')[0].substr(tmpRouteStrip.length) || '/';
				pRequest.path = function()
				{
						return pRequest.url;
				};

				if (this.logLevel > 0)
				{
					this.fable.log.trace(`Static request from host [${pRequest.headers.host}] URL [${pRequest.url}]`,
						{
							Host: pRequest.headers.host,
							UserAgent: pRequest.headers['user-agent'],
							Method: pRequest.method,
							ClientInterface: {Family: pRequest.connection.remoteFamily, Address: pRequest.connection.remoteAddress, Port: pRequest.connection.remotePort},
							ServerInterface: {Family: pRequest.connection.localFamily, Address: pRequest.connection.localAddress, Port: pRequest.connection.localPort},
							URL: pRequest.url
						}
					);
				}
				const tmpServe = libServeStatic(servePath, Object.assign({ index: tmpDefaultFile }, pParams));
				tmpServe(pRequest, pResponse, libFinalHandler(pRequest, pResponse));
		});
		return true;
	}
}

module.exports = OratorStaticFileService;
