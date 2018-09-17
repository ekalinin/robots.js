/*!
 * Robots
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

 // @ts-check
/// <reference types="node" />

module.exports = require('./lib/parser');

/**
 * Framework version.
 */
if ( !module.exports.version ) {
  /** @type {String} */
  module.exports.version = require('./package.json').version;
}
