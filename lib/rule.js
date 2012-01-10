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

var end_char = ut.quote('$');
/**
 * Check if this rule applies to the specified url
 *
 * @param {String} url
 * @return {Boolean}
 */
Rule.prototype.appliesTo = function(url) {
  if(!ut.is_path_safe(url)) {
    return false;
  }
  var url = ut.quote(ut.unquote(url));
  ut.d(' * Rule.appliesTo, url: '+url+', path: '+this.path);

  if (this.path === '*' || url.indexOf(this.path) === 0)
    return true;
  else if (this.path.indexOf('*') === -1)
    return false;
  else {
    // we have globed match
    var have_strict_end = this.path.indexOf(end_char) + end_char.length === this.path.length;
    var parts_to_match = this.path.split('*');
    url = url + end_char;

    var last_matched_index = 0;
    for (var i = 0; i < parts_to_match.length; i++) {
      last_matched_index = url.indexOf(parts_to_match[i], last_matched_index);
      if (last_matched_index === -1)
        break;
    }

    if (have_strict_end && last_matched_index === (this.path.length + end_char.length)) {
      return true;
    }
    else {
      return last_matched_index !== -1;
    }
  }
};

Rule.prototype.toString = function() {
  return (this.allowance ? 'Allow' : 'Disallow') + ": " + this.path
};
