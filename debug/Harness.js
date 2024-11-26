const libFable = require('fable');

const defaultFableSettings = (
	{
		Product:'Orator-Static',
		ProductVersion: '1.0.0',
		APIServerPort: 8766,

		OratorStaticServerDefaultFolder: `${__dirname}/serve/`,
		OratorStaticServerAutoMap: true
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
	(fNext)=>
	{
		// Create an endpoint.  This can also be done after the service is started.
		_Orator.serviceServer.get
		(
			'/test/:hash',
			(pRequest, pResponse, fNext) =>
			{
				// Send back the request parameters
				pResponse.send(pRequest.params);
				_Orator.fable.log.info(`Endpoint sent parameters object:`, pRequest.params);
				return fNext();
			}
		);
		return fNext();
	});

// Add the orator static server service
const libOratorServeStatic = require(`../source/Orator-Static-Server.js`);
_Fable.serviceManager.addServiceType('OratorServeStatic', libOratorServeStatic);
_Fable.serviceManager.instantiateServiceProvider('OratorServeStatic', {LogLevel: 2});

// Manually map the ./serve/ folder to the root of the server.
// tmpAnticipate.anticipate(
// 	(fNext)=>
// 	{
// 		_Fable.OratorServeStatic.addStaticRoute(`${__dirname}/serve/`, 'index.html');
// 		return fNext();
// 	});

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
