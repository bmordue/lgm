// stryker.conf.js

const config = {
  mutate: ["lib/**/*.ts"],
  testRunner: "mocha",
  reporters: ["progress", "clear-text", "html", "dashboard"],
  coverageAnalysis: "perTest",
  mochaOptions: {
    spec: [ "built/test" ]
  }
};

module.exports = config;

