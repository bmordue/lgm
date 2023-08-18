// stryker.conf.js

const config = {
  mutate: ["lib/**/*.ts"],
  testRunner: "mocha",
  reporters: ["progress", "json", "html", "dashboard"],
  coverageAnalysis: "perTest",
  mochaOptions: {
    spec: [ "built/test" ]
  },
  "checkers": ["typescript"],
  "tsconfigFile": "tsconfig.json",
  "typescriptChecker": {
    "prioritizePerformanceOverAccuracy": true
  }
};

module.exports = config;

