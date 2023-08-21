// stryker.conf.js

const config = {
  mutate: ["lib/**/*.ts"],
  testRunner: "mocha",
  reporters: ["progress", "json", "html", "dashboard"],
  coverageAnalysis: "perTest",
  mochaOptions: {
    spec: [ "built/test/**/*.js" ]
  },
  dashboard: {
    project: "github.com/bmordue/lgm",
    version: "main"
  }
};

module.exports = config;

