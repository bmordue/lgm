// stryker.conf.js

const config = {
  mutate: ["lib/**/*.ts"],
  mutator: "typescript",
  testRunner: "mocha-runner",
  reporters: ["progress", "clear-text", "html"],
  coverageAnalysis: "off",
  
  
};

module.exports = config;

