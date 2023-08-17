// stryker.conf.js

module.exports = function (config) {
  config.set({
    mutate: ["lib/**/*.ts"],
    mutator: "typescript",
    testRunner: "mocha",
    reporters: ["progress", "clear-text", "html"],
    coverageAnalysis: "off",
    tsconfigFile: "tsconfig.json",
    mochaOptions: {
      files: ["lib/test/**/*.ts"],
    },
  });
};

