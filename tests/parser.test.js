/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var robots = require('../index')
  , assert = require('assert')
  , util   = require('util')
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
        'Disallow: /%7ejoe/index.html',
        'Disallow: /wiki/Wikipedia%3Mediation_Committee', // malformed path, so it's ignored
        'Allow: /wiki/*'
      ],
      [ '/wiki/Wikipedia%3Mediation_Committee'
      ],
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
  '15. support globing inside allow/disallow': function () {
    testRobot([
        'User-agent: *',
        'Disallow: /*.php$',
        'Allow: /fish*'
        ],
        ['/fish', '/fish.html', '/fish/salmon.html', '/fish.htm?id=anything'],
        ['/filename.php', '/folder/filename.php']
    );
  },
  '16. globing images': function () {
    testRobot([
        'User-agent: *',
        'Disallow: /*.jpg$',
        'Allow: /'
        ],
        ['/fish', '/fish.html', '/fish/salmon.html', '/fish.htm?id=anything'],
        ['/miki.jpg', '/maus.jpg']
    );
  },
  '17. Test asterisk mid rule': function() {
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
  '18. Test sitemaps': function() {
    var parser = new robots.RobotsParser()
      , test_sitemap = [
          'http://test-server1.com/sitemap-1.xml',
          'http://test-server1.com/sitemap-2.xml'
        ]
      , test_robots_txt = [
        'User-Agent: *',
        'Disallow: /a/*.json',
        'Allow: /a/',
        'Allow: /b/*.html',
        'Disallow: /b/',
        'Sitemap: '+test_sitemap[0],
        'Sitemap: '+test_sitemap[1]
      ];
    parser.parse(test_robots_txt).getSitemaps(function(get_sitemaps){
      assert.eql(get_sitemaps, test_sitemap, 'Incorrect sitemaps: '+
                                              test_sitemap+', got: '+
                                              get_sitemaps);
    });
  },
};
