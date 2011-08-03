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
  },
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
  },
  '6. another escapes': function () {
    testRobot([
        'User-agent: *',
        'Disallow: /tmp/',
        'Disallow: /a%3Cd.html',
        'Disallow: /a/b.html',
        'Disallow: /%7ejoe/index.html'
      ],
      ['/tmp'],
      [
        '/tmp/','/tmp/a.html',
        '/a%3cd.html','/a%3Cd.html',"/a/b.html",
        '/%7Ejoe/index.html'
      ]
    );
  },
  // From bug report #523041
  // Bug report says "/" should be denied, but that is not in the RFC
  '7. bug report #523041': function () {
    testRobot([
        'User-agent: *',
        'Disallow: /.'
      ],
      ['/foo.html'],
      []
    );
  },
  // From Google:
  // http://www.google.com/support/webmasters/bin/answer.py?hl=en&answer=40364
  '8. Googlebot': function () {
    testRobot([
        'User-agent: Googlebot',
        'Allow: /folder1/myfile.html',
        'Disallow: /folder1/'
      ],
      ['/folder1/myfile.html'],
      ['/folder1/anotherfile.html'],
      'Googlebot'
    );
  },
  '9. ': function () {
    ['Googlebot', 'Googlebot-Mobile'].forEach( function ( agent ) {
      testRobot([
          'User-agent: Googlebot',
          'Disallow: /',
          '',
          'User-agent: Googlebot-Mobile',
          'Allow: /'
        ],
        [],
        ['/something.jpg'],
        agent
      );
    })
  },
  '10. Get the order correct - 1': function () {
    testRobot([
        'User-agent: Googlebot-Mobile',
        'Allow: /',
        '',
        'User-agent: Googlebot',
        'Disallow: /'
      ],
      [],
      ['/something.jpg'],
      'Googlebot'
    );
  },
  '11. Get the order correct - 2': function () {
    testRobot([
        'User-agent: Googlebot-Mobile',
        'Allow: /',
        '',
        'User-agent: Googlebot',
        'Disallow: /'
      ],
      ['/something.jpg'],
      [],
      'Googlebot-Mobile'
    );
  },
};
