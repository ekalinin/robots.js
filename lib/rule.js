/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var ut = require('./utils');

exports.Rule = Rule;

/**
 * A rule line is a single
 *  - "Allow:" (allowance==True) or
 *  - "Disallow:" (allowance==False)
 * followed by a path.
 *
 * @constructor
 * @param {String}  path        URL-string
 * @param {Boolean} allowance   Is path allowed
 */
function Rule (path, allowance) {

  this.path = ut.quote(ut.unquote(path));
  this.allowance = allowance;

  // an empty value means allow all
  if( path === '' && !allowance) {
    this.allowance = true;
  }
}

/**
 * Check if this rule applies to the specified url
 *
 * @param {String} url
 * @return {Boolean}
 */
Rule.prototype.appliesTo = function(url) {
  var url = ut.quote(ut.unquote(url));
  ut.d(' * Rule.appliesTo, url: '+url+', path: '+this.path);
  return this.path === '*' || url.indexOf(this.path) === 0;
};

Rule.prototype.toString = function() {
  return (this.allowance ? 'Allow' : 'Disallow') + ": " + this.path
};
