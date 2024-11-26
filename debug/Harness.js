const libFable = require('fable');

const defaultFableSettings = (
	{
		Product:'Orator-Proxy',
		ProductVersion: '1.0.0',
		APIServerPort: 8765,

		OratorHTTPProxyDestinationURL: 'http://127.0.0.1:8086/'
	});

// Initialize Fable
let _Fable = new libFable(defaultFableSettings);

// Now initialize the Restify ServiceServer Fable Service
_Fable.serviceManager.addServiceType('OratorServiceServer', require('orator-serviceserver-restify'));
_Fable.serviceManager.instantiateServiceProvider('OratorServiceServer', 
	{
		RestifyConfiguration: { strictNext: true }
	});

// Now add the orator service to Fable
_Fable.serviceManager.addServiceType('Orator', require('orator'));
let _Orator = _Fable.serviceManager.instantiateServiceProvider('Orator', {});

let tmpAnticipate = _Fable.newAnticipate();

// Initialize the Orator server
tmpAnticipate.anticipate(_Orator.initialize.bind(_Orator));

// Create a simple custom endpoint on the server.
tmpAnticipate.anticipate(
	(fStageComplete)=>
	{
		// Create an endpoint.  This can also be done after the service is started.
		_Orator.serviceServer.get
		(
			'/1.0/test/:hash',
			(pRequest, pResponse, fNext) =>
			{
				// Send back the request parameters
				pResponse.send(pRequest.params);
				_Orator.fable.log.info(`Endpoint sent parameters object:`, pRequest.params);
				return fNext();
			}
		);
		return fStageComplete();
	});

// Add the http proxy service
const libOratorServeStatic = require(`../source/Orator-HTTP-Proxy.js`);
_Fable.serviceManager.addServiceType('OratorHTTPProxy', libOratorServeStatic);
_Fable.serviceManager.instantiateServiceProvider('OratorHTTPProxy', {LogLevel: 2});
// Proxy all /1.0/ requests to the locally-running bookstore service (you need to run this from https://github.com/stevenvelozo/retold-harness ... it's a one-liner to start the service)
tmpAnticipate.anticipate(
	(fNext)=>
	{
		_Fable.OratorHTTPProxy.connectProxyRoutes();
		return fNext();
	});


// Now start the service server.
tmpAnticipate.anticipate(_Orator.startService.bind(_Orator));

tmpAnticipate.wait(
	(pError)=>
	{
		if (pError)
		{
			_Fable.log.error('Error initializing Orator Service Server: '+pError.message, pError);
		}
		_Fable.log.info('Orator Service Server Initialized.');
	});
