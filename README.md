# Orator Service Server Proxy

Proxy API requests from a stable prefix.  This lets you map /1.0/ to one set
of servers, /1.1/ to another and /1.0/CustomApi* to a third.

Meant to be used for local development and pass-through API for front-side
web servers, not an industrial-grade API routing service.