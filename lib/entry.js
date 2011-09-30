/*!
 * Robots
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */
var ut = require('./utils');

exports.Entry = Entry;

/**
 * An entry has one or more user-agents and
 * zero or more rulelines
 *
 * @constructor
 */
function Entry () {
  this.userAgents = [];
  this.rules = [];
}

/**
 * Check if this entry applies to the specified agent
 *
 * @param {String} useragent User-Agent string
 * @return {Boolean}
 */
Entry.prototype.appliesTo = function(userAgent) {
  // split the name token and make it lower case
  var userAgent = userAgent.split('/')[0].toLowerCase()
    , agent;

  for (var i = 0, len = this.userAgents.length; i < len; i++) {
    agent = this.userAgents[i].toLowerCase();
    if ( agent === '*' ||      // we have the catch-all agent
         userAgent.indexOf( agent ) === 0
       ) {
      ut.d('* Entry.appliesTo, result:true, userAgent: '+userAgent+
                                        ', entryAgent: '+agent);
      return true;
    }
  };
      ut.d('* Entry.appliesTo, result:false');
  return false;
};

/**
 * Preconditions:
 *  - our agent applies to this entry
 *  - URL decoded
 *
 * @param {String} url
 * @return {Boolean}
 */
Entry.prototype.allowance = function(url) {
  ut.d('* Entry.allowance, url: '+url);
  for (var i = 0, len = this.rules.length, rule; i < len; i++) {
    rule = this.rules[i];

    if ( rule.appliesTo(url) ) {
      return rule.allowance;
    }
  };

  return true;
};

Entry.prototype.toString = function() {
  var res = [];
  for (var i = this.userAgents.length - 1; i >= 0; i--) {
    res.push('User-agent: '+this.userAgents[i]);
  };
  for (var i = this.rules.length - 1; i >= 0; i--) {
    res.push(this.rules[i]);
  };
  if(this.crawl_delay != null) {
    res.push('Crawl-Delay: ' + this.crawl_delay);
  }
  return "<Entry: " + res.join(', ') + ">";
};
