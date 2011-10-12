/*!
 * Robots
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
  return this.does_rule_fit_path(this.path, url)
};

Rule.prototype.toString = function() {
  return (this.allowance ? 'Allow' : 'Disallow') + ": " + this.path
};

/**
   Returns true iff the given url matches the pattern of the given
   rule. This takes into account rules containing wildcards (*).
**/
Rule.prototype.does_rule_fit_path = function(rule, url) {
  rule_pieces = rule.split('*');
  index = 0;
  if(!this.startsWith(url, rule_pieces[0])) {
    return false;
  }
  for(i in rule_pieces) {
    piece = rule_pieces[i];
    if(!this.contains(url.substr(index), piece)) {
      return false;
    }
    index += piece.length + url.indexOf(piece)
  }
  return true;
}

/**
   Returns true iff the given haystack starts with the given needle.
   (does not take into account wildcards)
**/
Rule.prototype.startsWith = function(haystack, needle) {
  return haystack.indexOf(needle) == 0;
}

/**
   Returns true iff the given haystack contains the given needle.
   (does not take into account wildcards)
**/
Rule.prototype.contains = function(haystack, needle) {
  return haystack.indexOf(needle) >= 0;
}
