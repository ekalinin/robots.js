/*!
 * Robots
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var debug = false;

exports.d = function (str) {
  if (debug) {
    console.log(str);
  }
}

// http://stackoverflow.com/questions/946170/equivalent-javascript-functions-for-pythons-urllib-quote-and-urllib-unquote
// JavaScript               |  Python
// -----------------------------------
// encodeURI(str)           |  urllib.quote(str, safe='~@#$&()*!+=:;,.?/\'');
// -----------------------------------
// encodeURIComponent(str)  |  urllib.quote(str, safe='~()*!.\'')
exports.quote = encodeURIComponent;
exports.unquote = decodeURIComponent;
//exports.quote = encodeURI;
//exports.unquote = decodeURI;

// Determine if a string cannot be unquoted, to prevent the parser from crashing
// Example of a malformed path, found in wikipedia robots.txt:
//     /wiki/Wikipedia%3Mediation_Committee/
exports.is_path_safe = function(str) {
  try{
    exports.quote(exports.unquote(str));
    return true;
  }
  catch(err) {
    return false;
  }
}


/*
 * Extends one object with another
 *
 * @param {Object} obj
 * @param {Object} extend_with
 */
exports.extend = function(obj, extend_with) {
    for(key in extend_with) {
        obj[key] = extend_with[key];
    }
};
