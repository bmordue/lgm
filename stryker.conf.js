// stryker.conf.js

const config = {
  mutate: ["lib/**/*.ts", "!lib/Hex.ts"],
  testRunner: "mocha",
  reporters: ["progress", "clear-text", "html", "dashboard"],
  coverageAnalysis: "perTest",
  mochaOptions: {
    spec: [ "built/test" ]
  },
  disableTypeChecks: false,
  concurrency: 2
};

module.exports = config;

