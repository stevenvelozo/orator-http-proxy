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
	}


	/**
	 * Brought over from old orator and ported to work in the same way.
	 *
	 * @param {object} pOrator The Orator instance.
	 * @param {string} pFilePath The path on disk that we are serving files from.
	 * @param {string?} pDefaultFile (optional) The default file served if no specific file is requested.
	 * @param {string?} pRoute (optional) The route matcher that will be used. Defaults to everything.
	 * @param {string?} pRouteStrip (optional) If provided, this prefix will be removed from URL paths before being served.
	 * @param {object?} pParams (optional) Additional parameters to pass to serve-static.
	 * @return {boolean} true if the handler was successfully installed, otherwise false.
	 */
	addStaticRoute(pOrator, pFilePath, pDefaultFile, pRoute, pRouteStrip, pParams)
	{
		if (typeof(pFilePath) !== 'string')
		{
				pOrator.fable.log.error('A file path must be passed in as part of the server.');
				return false;
		}

		// Default to just serving from root
		const tmpRoute = (typeof(pRoute) === 'undefined') ? '/*' : pRoute;
		const tmpRouteStrip = (typeof(pRouteStrip) === 'undefined') ? '/' : pRouteStrip;

		// Default to serving index.html
		const tmpDefaultFile = (typeof(pDefaultFile) === 'undefined') ? 'index.html' : pDefaultFile;

		pOrator.fable.log.info('Orator mapping static route to files: '+tmpRoute+' ==> '+pFilePath+' '+tmpDefaultFile);

		// Add the route
		pOrator.serviceServer.server.get(tmpRoute, (pRequest, pResponse, fNext) =>
		{
				// The split removes query string parameters so they are ignored by our static web server.
				// The substring cuts that out from the file path so relative files serve from the folders and server
				//FIXME: .....
				// See if there is a magic subdomain put at the beginning of a request.
				// If there is, then we need to see if there is a subfolder and add that to the file path
				let tmpHostSet = pRequest.headers.host.split('.');
				let tmpPotentialSubfolderMagicHost = false;
				let servePath = pFilePath;
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
					}
				}
				pRequest.url = pRequest.url.split('?')[0].substr(tmpRouteStrip.length) || '/';
				pRequest.path = function()
				{
						return pRequest.url;
				};
				const tmpServe = libServeStatic(servePath, Object.assign({ index: tmpDefaultFile }, pParams));
				tmpServe(pRequest, pResponse, libFinalHandler(pRequest, pResponse));
		});
		return true;
	}
}

module.exports = OratorStaticFileService;
