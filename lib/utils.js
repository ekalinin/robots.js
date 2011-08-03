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
