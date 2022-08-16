'use strict';

var path = require('path');
var http = require('http');

var oas3Tools = require('oas3-tools');
var serverPort = 8080;

// const { auth } = require('express-openid-connect');

// swaggerRouter configuration
var options = {
    controllers: path.join(__dirname, './built/controllers')
};

var expressAppConfig = oas3Tools.expressAppConfig(path.join(__dirname, 'api/openapi.yaml'), options);
expressAppConfig.addValidator();
var app = expressAppConfig.getApp();

// const config = {
//   required: false,
//   auth0Logout: true,
//   appSession: {
//     secret: 'a long, randomly-generated string stored in env'
//   },
//   baseURL: 'http://localhost:8080',
//   clientID: 'PjuDCyk1YHwXEE9i4rCn43GpRM4qraeC',
//   issuerBaseURL: 'https://dev-lgm.eu.auth0.com'
// };

// // auth router attaches /login, /logout, and /callback routes to the baseURL
// app.use(auth(config));

// Initialize the Swagger middleware
http.createServer(app).listen(serverPort, function () {
    console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
    console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
});

