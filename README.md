# Swagger generated server

## Overview
This server was generated by the [swagger-codegen](https://github.com/swagger-api/swagger-codegen) project.  By using the [OpenAPI-Spec](https://github.com/OAI/OpenAPI-Specification) from a remote server, you can easily generate a server stub.

### Running the server
To run the server, run:

```
npm start
```

### Tests

Run `npm test`.

Some tests only run if an env var is set:

`RUN_E2E_TESTS=true npm test`

or 

`RUN_E2E_TESTS=true npx mocha built/test/e2e.js` for just the e2e tests.


### Running Stryker.js Mutation Testing Locally

Run `npx stryker run --config-file stryker.conf.js` in the root directory of the project.

Stryker.js will perform mutation testing and provide a report on the code coverage.

# TODO

Joining games
  - should limit number of players in a game
  - owner sets player limit is set when game is created
  - cannot join twice with the same user session
  - user session may be joined to many games

Game world
  - API to get state of the world for a given turn
