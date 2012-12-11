/*!
 * Robots
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var Rule = require('./rule').Rule
  , Entry = require('./entry').Entry
  , urlparser = require('url')
  , http = require('http')
  , https = require('https')
  , ut = require('./utils');

exports.RobotsParser = RobotsParser;

/**
 * Provides a set of methods to read, parse and answer
 * questions about a single robots.txt file.
 *
 * @constructor
 * @param {String} url
 * @param {String} userAgent User-Agent for fetching robots.txt
 */
function RobotsParser (url, userAgent, after_parse) {
  this.entries = [];
  this.defaultEntry = '';
  this.disallowAll = false;
  this.statusCode = -1;
  this.allowAll = false;
  this.userAgent = userAgent || 'Mozilla/5.0 (X11; Linux i686; rv:5.0) '+
                                'Gecko/20100101 Firefox/5.0';
  this.setUrl(url, after_parse);
}


/**
 * Sets the URL referring to a robots.txt file
 *
 * @param {String} url
 * @param {String} read   Optional, default=true. Immediate read robots.txt
 *                        if read is a callback function, pass it through to this.read
 */
RobotsParser.prototype.setUrl = function(url, read) {
  this.url = url;
  if(url) {
    if(read === undefined || read === null || read === true) {
      this.read();
    } else if(typeof(read) === "function") {
      this.read(read)
    }
  }
};


/**
 * Reads the robots.txt URL and feeds it to the parser
 *
 * @param {Function} callback called after remote robots.txt is downloaded and parsed
 */
RobotsParser.prototype.read = function(after_parse) {
  var self = this;
  var url = urlparser.parse(this.url);
  var port;
  var protocol;
  if (url.protocol == 'https:') {
    port = 443;
    protocol = https;
  } else {
    port = 80
    protocol = http;
  }
  var request = protocol.request({
      'host': url.host,
      'headers': { "User-Agent": self.userAgent },
      'port': url.port || port,
      'method': 'GET',
      'path': url.pathname
  });

  ut.d('RobotsParser.read: start ...');
  if(typeof(after_parse) !== "function") {
    after_parse = function(obj, success) { };
  }
  self.chunks = [];
  request.on('response', function(resp) {
    ut.d('RobotsParser.read: get response, code: '+resp.statusCode);

    self.statusCode = resp.statusCode;

    if ( [401, 403].indexOf(resp.statusCode) > -1 ) {
      ut.d('RobotsParser.read: set disallowAll');
      self.disallowAll = true;
      after_parse(self, false);
    }
    else if (resp.statusCode >= 400) {
      ut.d('RobotsParser.read: set allowAll');
      self.allowAll = true;
      after_parse(self, false);
    }
    else if ([301, 302].indexOf(resp.statusCode) > -1) {
      // redirect
      var redirect_url = urlparser.resolve(
          self.url,
          resp.headers.location
      )
      self.setUrl(redirect_url, after_parse);
    }
    else {
      resp.setEncoding('utf8');
      resp.on('data', function (chunk) {
        ut.d('RobotsParser.read: reads robots.txt');
        self.chunks.push(chunk);
      });
      resp.on('end', function(chunk) {
        self.chunks.push(chunk);
        var allchunks = self.chunks.join('');
        ut.d('RobotsParser.end: allchunks - ' + allchunks);
        self.parse(allchunks.split(/\r\n|\r|\n/));
        after_parse(self, true);
      });
    }


  });
  request.end();
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
    line = line.trim();
    // find 'field:value'
    line = line.split(':');
    if (line.length !== 2) {
      continue;
    }

    field = line[0].trim().toLowerCase();
    value = line[1].trim();

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
      case 'allow':
        if (state !== STATE_START && ut.is_path_safe(value)) {
          entry.rules.push(new Rule(value, field === 'allow'));
          state = STATE_SAW_ALLOW_OR_DISALLOW;
        }
        break;

      case 'crawl-delay':
        if (state !== STATE_START) {
          entry.crawl_delay = value;
          state = STATE_SAW_ALLOW_OR_DISALLOW;
        }
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
RobotsParser.prototype.canFetchSync = function(userAgent, url) {
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

/**
 * Using the parsed robots.txt decide if userAgent can fetch url.
 *
 * @param {String}    userAgent
 * @param {String}    url
 * @param {Function}  callback    function (access, url, rule) { ... }
 *
 */
RobotsParser.prototype.canFetch = function(userAgent, url, callback) {
  var self = this
    , url = url || '/'
    , entry;


  process.nextTick( function () {
    if (self.disallowAll) {
      callback(false, url, {
        type:       "statusCode",
        statusCode: self.statusCode});
      return;
    }

    if (self.allowAll) {
      callback(true, url, {
        type:       "statusCode",
        statusCode: self.statusCode});
      return;
    }

    // search for given user agent matches
    // the first match counts
    for (var i = 0; i < self.entries.length; i++) {
      entry = self.entries[i];
      if (entry.appliesTo(userAgent)) {
        callback(entry.allowance(url), url, {
          type:     "entry",
          entry:    entry});
        return;
      }
    };

    // try the default entry last
    if (self.defaultEntry) {
      callback(self.defaultEntry.allowance(url), url, {
          type:     "defaultEntry",
          entry:    self.defaultEntry});
      return;
    }

    // agent not found ==> access granted
    callback(true, url, {type: "noRule"});
  });
};


/**
 * Using the parsed robots.txt decide if userAgent has a specified
 * Crawl-delay.
 *
 * @param {String}    userAgent
 * @param {String}    url
 * @param {Function}  callback    function (access, url, rule) { ... }
 * @return {Number} or undefined
 *
 */
RobotsParser.prototype.getCrawlDelay = function (userAgent) {
  var entry;
  for (var i = 0; i < this.entries.length; i++) {
    entry = this.entries[i];
    if (entry.appliesTo(userAgent) && (entry.crawl_delay != null)) {
      return entry.crawl_delay;
    }
  }
  return this.defaultEntry.crawl_delay;
};

/**
 * Returns a string representation of this RobotsParser
 *
 */
RobotsParser.prototype.toString = function() {
    var res = [];
    res.push("<Parser: Crawler User Agent: " + this.userAgent);
    res.push(this.defaultEntry.toString());
    for (var i in this.entries) {
        res.push(this.entries[i].toString());
    };
    res.push(">");
    return res.join('\n');
};

/**
 * Returns a (shorter) string representation of this RobotsParser
 *
 */
RobotsParser.prototype.toStringLite = function() {
  var res = [];
  var agent_names = [];
  function list_agent_names(entry) {
    var names = [];
    for(var j in entry.userAgents) {
      names.push(entry.userAgents[j]);
    }
    return names;
  }
  agent_names = list_agent_names(this.defaultEntry);
  for (var i in this.entries) {
    agent_names = agent_names.concat(list_agent_names(this.entries[i]));
  };
  var output = "<Parser: ";
  output += "Crawler User Agent is `" + this.userAgent + "`, ";
  output += "Listed Robot Agents: `" + agent_names.join('`, `');
  output += "`>";
  return output;
};

