// stryker.conf.js

const config = {
  mutate: ["lib/**/*.ts"],
  testRunner: "mocha",
  reporters: ["progress", "clear-text", "html", "json"],
  coverageAnalysis: "perTest",
  mochaOptions: {
    spec: [ "built/test" ]
  }
};

module.exports = config;

