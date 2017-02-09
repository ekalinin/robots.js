/*!
 * Robots
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var Rule = require('./rule').Rule
  , Entry = require('./entry').Entry
  , urlparser = require('url')
  , ut = require('./utils');

// Export these to make mocking possible
exports.http = require('http');
exports.https = require('https');

exports.RobotsParser = RobotsParser;

/**
 * Provides a set of methods to read, parse and answer
 * questions about a single robots.txt file.
 *
 * @constructor
 * @param {String} url
 * @param {String} userAgent User-Agent for fetching robots.txt
 */
function RobotsParser (url, options, after_parse) {
  this.entries = [];
  this.sitemaps = [];
  this.defaultEntry = '';
  this.disallowAll = false;
  this.statusCode = -1;
  this.redirectLimit = 5;
  this.allowAll = false;
  if (null === options){
    this.options = {};
  } else if (typeof options === 'string'){
    this.options = { headers: {userAgent:options}};
  } else if (typeof options === 'object'){
    this.options = options;
  }
  this.options = this.options || {}; 
  this.options.headers = this.options.headers || {};
  this.options.headers.userAgent = this.options.headers.userAgent || 'Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0';;

  this.setUrl(url, after_parse);
}

/*
 * You can clone a JSON representation (based on a prior created one)
 * to enhance with it functions
 *
 * @param {Object} parserToClone JSON representation
 * @returns {RobotsParser}
 */
exports.clone = clone = function(parserToClone) {
  var parser = new RobotsParser ();
  var parseEntry = function(value){
    var defaultEntry = new Entry();
    for(var sub in value){
      var setValue;
      if(sub === "rules"){
        var rules = [];
        var orgRules = value[sub];
        for(var rule in orgRules){
          rules.push(new Rule(orgRules[rule].path, orgRules[rule].allowance));
        }
        setValue = rules;
      }else{
        setValue = value[sub];
      }
      defaultEntry[sub] = setValue;
    }
    return defaultEntry;
  };
  for(var key in parserToClone){
    var value;
    var orgValue = parserToClone[key];
    if(key === "defaultEntry"){
      value = parseEntry(orgValue);
    }else if(key === "entries"){
      var entries = [];
      for (var entry in orgValue){
        entries.push(parseEntry(orgValue[entry]));
      }
      value = entries;
    }else{
      value = orgValue;
    }
    parser[key] = value;
  }
  return parser;
};

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
    protocol = exports.https;
  } else {
    protocol = exports.http;
  }

  var request_args = {
      'hostname': url.hostname,
      'port': url.port || port,
      'method': 'GET',
      'path': url.pathname
  };
  // apply options to the request args
  for (var x in this.options){
    request_args[x] = this.options[x];
  }
  ut.d('RobotsParser.read: requesting: ' + JSON.stringify(request_args))
  var request = protocol.request(request_args);

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
      resp.resume();
      after_parse(self, false);
    }
    else if (resp.statusCode >= 400) {
      ut.d('RobotsParser.read: set allowAll');
      self.allowAll = true;
      resp.resume();
      after_parse(self, false);
    }
    else if ([301, 302].indexOf(resp.statusCode) > -1 && 'location' in resp.headers) {
      resp.resume();
      if (self.redirectLimit <= 0) {
        ut.d('RobotsParser.read: Redirect limit encountered');
        self.allowAll = true;
        after_parse(self, false);
      } else {
        self.redirectLimit--;
        // redirect
        var redirect_url = urlparser.resolve(
          self.url,
          resp.headers.location
        );
        self.setUrl(redirect_url, after_parse);
      }
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

  request.on('error', function(error) {
    ut.d('RobotsParser.read: request error: ' + error)
    self.error = error;
    after_parse(self, false);
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
    // sitemaps hack
    line = line.replace('http:', 'http_').replace('https:', 'https_');
    line = line.replace(/:(\d+\/)/, '__$1');
    // find 'field:value'
    line = line.split(':');
    if (line.length !== 2) {
      continue;
    }
    // sitemaps hack
    line[1] = line[1].replace('http_', 'http:').replace('https_', 'https:').replace(/__(\d+\/)/, ':$1');

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

      case 'sitemap':
        if (ut.is_path_safe(value)) {
          this.sitemaps.push(value);
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
  return this;
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

/**
 * Returns sitemaps from parsed robots.txt.
 *
 * @param {Function}  callback    function (sitemaps) { ... }
 *
 */
RobotsParser.prototype.getSitemaps = function(callback) {
  var self = this;

  process.nextTick( function () {
    callback(self.sitemaps);
  });
};
