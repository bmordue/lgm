// stryker.conf.js

const config = {
  mutate: ["lib/**/*.ts"],
  mutator: "typescript",
  testRunner: "mocha",
  reporters: ["progress", "clear-text", "html"],
  coverageAnalysis: "off",
  tsconfigFile: "tsconfig.json",
  mochaOptions: {
    files: ["lib/test/**/*.ts"],
  },
};

module.exports = config;

