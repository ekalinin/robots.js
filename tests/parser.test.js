/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var robots = require('../index')
  , assert = require('assert')
  , util   = require('util');

/**
 * Main testing function.
 *
 * @param {Array}   robotsText   Raws from testing robots.txt
 * @param {Array}   goodUrls
 * @param {Array}   badUrls
 * @param {String}  agent
 */
function testRobot (robotsText, goodUrls, badUrls, agent) {
  var agent = agent || 'test_robotparser'
    , parser = new robots.RobotsParser();
  parser.parse(robotsText);
  //console.log(' ++ parser.entries: \n'+util.inspect(parser));

  for (var i = 0; i < goodUrls.length; i++) {
    testFetch(parser, goodUrls[i], true, agent);
  };
  for (var i = 0; i < badUrls.length; i++) {
    testFetch(parser, badUrls[i], false, agent);
  };
}

/**
 * TestCase function
 * @param {RobotsParser}  parser  Instance of robots.txt parser
 * @param {String|Array}  url     Testing URL
 * @param {Boolean}       isGood  Is allowed URL
 * @param {String}        agent   Test User-Agent
 */
function testFetch (parser, url, isGood, agent) {
    var agent = agent
      , url = url
      , debug_str = isGood ? 'allowed' : 'disallowed';

    if (url instanceof Array) {
      agent = url[0];
      url = url[1];
    }

    assert.eql( parser.canFetch(agent, url), isGood,
        'URL must be '+debug_str+': '+url+', User-Agent: '+agent);
}

/**
 * Tests
 */
module.exports = {
  '1. simple': function () {
    testRobot([
        'User-agent: *',
        'Disallow: /cyberworld/map/ # This is an infinite virtual URL space',
        'Disallow: /tmp/ # these will soon disappear',
        'Disallow: /foo.html'
      ],
      ['/','/test.html'],
      ['/cyberworld/map/index.html','/tmp/xxx','/foo.html']
    );
  },
  '2. two user-agents': function () {
    testRobot([
        '# robots.txt for http://www.example.com/',
        '',
        'User-agent: *',
        'Disallow: /cyberworld/map/ # This is an infinite virtual URL space',
        '',
        '# Cybermapper knows where to go.',
        'User-agent: cybermapper',
        'Disallow:',
        ''
      ],
      ['/','/test.html', ['cybermapper','/cyberworld/map/index.html']],
      ['/cyberworld/map/index.html']
    );
  },
  '3. closed all': function () {
    testRobot([
        '',
        '# go away',
        'User-agent: *',
        'Disallow: /',
      ],
      [],
      ['/cyberworld/map/index.html','/','/tmp/']
    );
  },
  '4. quote/unquote urls': function () {
    testRobot([
        'User-agent: figtree',
        'Disallow: /tmp',
        'Disallow: /a%3cd.html',
        'Disallow: /a%2fb.html',
        'Disallow: /%7ejoe/index.html'
      ],
      [],
      [
        '/tmp','/tmp.html','/tmp/a.html',
        '/a%3cd.html','/a%3Cd.html','/a%2fb.html',
        '/~joe/index.html'
      ],
      'figtree'
      //'FigTree Robot libwww-perl/5.04'
    );
  },/*
  '5. User-Agent case sensivity': function () {
    testRobot([
        'User-agent: figtree',
        'Disallow: /tmp',
        'Disallow: /a%3cd.html',
        'Disallow: /a%2fb.html',
        'Disallow: /%7ejoe/index.html'
      ],
      [],
      [
        '/tmp','/tmp.html','/tmp/a.html',
        '/a%3cd.html','/a%3Cd.html','/a%2fb.html',
        '/~joe/index.html'
      ],
      'FigTree Robot libwww-perl/5.04'
    );
  },*/
};
