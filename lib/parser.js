/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var Rule = require('./rule').Rule
  , Entry = require('./entry').Entry
  , urlparser = require('url')
  , http = require('http')
  , ut = require('./utils');

exports.Rule = Rule;
exports.Entry = Entry;
exports.RobotsParser = RobotsParser;

/**
 * Provides a set of methods to read, parse and answer
 * questions about a single robots.txt file.
 *
 * @param {String} url
 */
function RobotsParser (url, userAgent) {
  this.entries = [];
  this.defaultEntry = '';
  this.disallowAll = false;
  this.allowAll = false;
  this.setUrl(url);
  this.lastChecked = '';
  this.userAgent = userAgent || 'User-Agent: Mozilla/5.0 '+
                                '(X11; Linux i686; rv:5.0) '+
                                'Gecko/20100101 Firefox/5.0';
}


/**
 * Sets the URL referring to a robots.txt file
 *
 * @param {String} url
 *
 */
RobotsParser.prototype.setUrl = function(url) {
  this.url = url;
};


/**
 * Reads the robots.txt URL and feeds it to the parser
 *
 */
RobotsParser.prototype.read = function() {
  var self = this
    , url = urlparser.parse(this.url)
    , client = http.createClient(url.port || 80, url.host)
    , request = client.request("GET", url.pathname, {
        'host'        : url.host,
        "User-Agent"  : self.userAgent,
      });

  request.on('response', function(resp) {
    if ( [401, 403].indexOf(resp.statusCode) > -1 ) {
      self.disallow_all = true;
    }
    else if (resp.statusCode >= 400) {
      self.allow_all = true;
    }
    else {
      resp.setEncoding('utf8');
      resp.on('data', function (chunk) {
         self.parse(chunk.split('\r\n'));
      });
    }
  });
  req.end();
};

/**
 * Adds entry
 *
 * @private
 * @param {Entry} entry
 */
RobotsParser.prototype._addEntry = function(entry) {
  ut.d('Parser._addEntry, entry: '+entry);
  if( entry.userAgents.indexOf('*') > -1 ) {
    // the default entry is considered last
    // the first default entry wins
    if ( !this.defaultEntry ) {
      this.defaultEntry = entry;
    }
  }
  else {
    this.entries.push(entry);
  }
};


/**
 * Parse the input lines from a robots.txt file.
 *
 * We allow that a user-agent: line is not preceded by
 * one or more blank lines.
 *
 * @param {Array} lines Array of rows from robots.txt
 */
RobotsParser.prototype.parse = function(lines) {
  // states:
  //    0: start state
  //    1: saw user-agent line
  //    2: saw an allow or disallow line
  var STATE_START = 0
    , STATE_SAW_AGENT = 1
    , STATE_SAW_ALLOW_OR_DISALLOW = 2
    , state = STATE_START
    , entry = new Entry()
    , line
    , comment
    , field
    , value;


  for (var i = 0; i < lines.length; i++) {
    line = lines[i];

    if (!line) {
      if (state === STATE_SAW_AGENT) {
        entry = new Entry();
        state = STATE_START;
      }
      else if (state === STATE_SAW_ALLOW_OR_DISALLOW) {
        this._addEntry(entry);
        entry = new Entry();
        state = STATE_START;
      }
    }

    // remove optional comment and strip line
    comment = line.indexOf('#')
    if (comment > -1) {
      line = line.substring(0, comment);
    }

    // strip line
    line = line.replace(/^\s+|\s+$/g, '');
    // find 'field:value'
    line = line.split(':');
    if (line.length !== 2) {
      continue;
    }

    field = line[0].replace(/^\s+|\s+$/g, '').toLowerCase();
    value = line[1].replace(/^\s+|\s+$/g, '');

    switch(field) {
      case 'user-agent':
        if (state === STATE_SAW_ALLOW_OR_DISALLOW) {
          this._addEntry(entry);
          entry = new Entry();
        }
        entry.userAgents.push(value);
        state = STATE_SAW_AGENT;
        break;

      case 'disallow':
        if (state !== STATE_START) {
          entry.rules.push(new Rule(value, false));
          state = STATE_SAW_ALLOW_OR_DISALLOW;
        }
        break;

      case 'allow':
        if (state !== STATE_START) {
          entry.rules.push(new Rule(value, true));
          state = STATE_SAW_ALLOW_OR_DISALLOW;
        }
        break;
    }
  };

  if (state === STATE_SAW_ALLOW_OR_DISALLOW) {
    this._addEntry(entry);
  }
};


/**
 * Using the parsed robots.txt decide if userAgent can fetch url.
 *
 * @param {String} userAgent
 * @param {String} url
 * @return {Boolean}
 *
 */
RobotsParser.prototype.canFetch = function(userAgent, url) {
  var url = url || '/'
    , entry;

  ut.d('Parser.canFetch: url:'+url);

  if (this.disallowAll) {
    return false;
  }
  if (this.allowAll) {
    return true;
  }

  // search for given user agent matches
  // the first match counts
  for (var i = 0; i < this.entries.length; i++) {
    entry = this.entries[i];
    if (entry.appliesTo(userAgent)) {
      return entry.allowance(url);
    }
  };

  // try the default entry last
  if (this.defaultEntry) {
    return this.defaultEntry.allowance(url);
  }

  // agent not found ==> access granted
  return true;
};
