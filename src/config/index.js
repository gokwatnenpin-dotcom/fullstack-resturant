"use strict";

const config = require("./env");

module.exports = Object.freeze({
  ...config,
  env: config.nodeEnv,
});
