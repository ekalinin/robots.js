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
var fs = require('fs')
  , path = require('path')
  , pack_file = path.join(__dirname, 'package.json');

if ( !module.exports.version ) {
  /** @type {String} */
  module.exports.version = JSON.parse(
    fs.readFileSync(pack_file, 'utf8')).version;
}
