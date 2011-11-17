/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var robots = require('../index')
  , assert = require('assert')
  , util   = require('util')
  , rule   = require('../lib/rule')
  , ut     = require('../lib/utils');

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
  ut.d(' ++ parser.entries: \n'+util.inspect(parser, false, 3));

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

    // Sync Test
    assert.eql( parser.canFetchSync(agent, url), isGood,
        'URL must be '+debug_str+': '+url+', User-Agent: '+agent+', [sync]');
    // Async Test
    parser.canFetch(agent, url, function (access, url, reason) {
      assert.eql(access, isGood, 'URL must be '+debug_str+': '+url+
                                              ', User-Agent: '+agent+', [async]');
    });
}

/**
 * Tests does_rule_fit_path function in Rule
 * @param {String} the_rule A rule which might appear in robots.txt
 * @param {String} path A url path to check against the_rule
 * @param {Boolean} pass Does the_rule match the given path
 */
function testMatching(the_rule, path, pass) {
  return function() {
    r = new rule.Rule('', '');
    // does_rule_fit_path is a static method
    assert.eql(r.does_rule_fit_path(the_rule, path), pass);
  };
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
  // Google also got the order wrong in #8.  You need to specify the
  // URLs from more specific to more general.
  '12. Get the order correct - 3': function () {
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
  // For issue #6325 (query string support)
  '13. query string support': function () {
    testRobot([
        'User-agent: *',
        'Disallow: /some/path?name=value',
      ],
      ['/some/path'],
      ['/some/path?name=value']
    );
  },
  // For issue #4108 (obey first * entry)
  '14. obey first * entry': function () {
    testRobot([
        'User-agent: *',
        'Disallow: /some/path',
        '',
        'User-agent: *',
        'Disallow: /another/path'
      ],
      ['/another/path'],
      ['/some/path']
    );
  },
  '15. Test asterisk mid rule': function() {
    testRobot([
      'User-Agent: *',
      'Disallow: /a/*.json',
      'Allow: /a/',
      'Allow: /b/*.html',
      'Disallow: /b/'
    ],
          ['/a/page.html', '/b/book.html'],
          ['/a/page.json', '/b/book.php']
         );
  },
  "Rule Matching 1: '/tmp', '/tmp', true":
    testMatching('/tmp', '/tmp', true),
  "Rule Matching 2: '/tmp', '/tmp/file', true":
    testMatching('/tmp', '/tmp/file', true),
  "Rule Matching 3: '/tmp', '/tmp/dir/file', true":
    testMatching('/tmp', '/tmp/dir/file', true),
  "Rule Matching 4: '/tmp*', '/tmp', true":
    testMatching('/tmp*', '/tmp', true),
  "Rule Matching 5: '/tmp*', '/tmp/file', true":
    testMatching('/tmp*', '/tmp/file', true),
  "Rule Matching 6: '/tmp*', '/tmp/dir/file', true":
    testMatching('/tmp*', '/tmp/dir/file', true),
  "Rule Matching 7: '/tmp/*', '/tmp', false":
    testMatching('/tmp/*', '/tmp', false),
  "Rule Matching 8: '/tmp/*', '/tmp/file', true":
    testMatching('/tmp/*', '/tmp/file', true),
  "Rule Matching 9: '/tmp/*', '/tmp/dir/file', true":
    testMatching('/tmp/*', '/tmp/dir/file', true),
  "Rule Matching 10: '/*', '/tmp', true":
    testMatching('/*', '/tmp', true),
  "Rule Matching 11: '/r/*/search', '/r/boink/search', true":
    testMatching('/r/*/search', '/r/boink/search', true),
  "Rule Matching 12: '/r/*/search', '/r/boink/search/term', true":
    testMatching('/r/*/search', '/r/boink/search/term', true),
  "Rule Matching 13: '/r/*/search', '/r/search/boink', false":
    testMatching('/r/*/search', '/r/search/boink', false),
  "Rule Matching 14: '/*json', '/thing.php', false":
    testMatching('/*json', '/thing.php', false),
  "Rule Matching 15: '/feeds*json', '/thing.php', false":
    testMatching('/feeds*json', '/thing.php', false),
  "Rule Matching 16: '/a/*/b/*/c/*', '/a/1/b/2/c/3', true":
    testMatching('/a/*/b/*/c/*', '/a/1/b/2/c/3', true),
  "Rule Matching 17: '/a/*/b/*/c/', '/a/1/b/2/c/yeah', true":
    testMatching('/a/*/b/*/c/', '/a/1/b/2/c/yeah', true),
  "Rule Matching 18: '/calendar', '/calendar/blah', true":
    testMatching('/calendar', '/calendar/blah', true),
  "Rule Matching 19: '/calendar/*', '/calendar/blah', true":
    testMatching('/calendar/*', '/calendar/blah', true),
  "Rule Matching 20: '/*.json', '/whatever.json', true":
    testMatching('/*.json', '/whatever.json', true),
  "Rule Matching 21: '/CASEsensitive', '/casesensitive', false":
    testMatching('/Case', '/case', false),
  "Rule Matching 22: '/case', '/CASE', false":
    testMatching('/case', '/CASE', false)
};

