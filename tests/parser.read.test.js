var robots = require('../index')
  , assert = require('assert')
  , util   = require('util')
  , ut     = require('../lib/utils')
  , url    = require('url');


var EventEmitter = require('events').EventEmitter;

/*
 * This will hold data to respond with such as
 * statusCode, location, content, etc.
 */
var test_request_data = {};


/*
 * Mock request function to use in mock http and https
 *
 * @param {Object} data     The same request object that would
 *                          be sent to the request function
 */
function mock_request(data) {
    var request = new EventEmitter();
    request.end = function() {}

    // Make sure host is what is expected
    assert.ok(data.hostname in test_request_data,
            "Got unexpected hostname: " + data.hostname)
    site_test_data = test_request_data[data.hostname];

    // Convert the data into url
    data.pathname = data.path;
    data.protocol = this.protocol;
    formatted_url = url.format(data);

    // Make sure url is what is expected for the test
    assert.ok(formatted_url in site_test_data,
            "Got unexpected url: " + formatted_url);
    url_data = site_test_data[formatted_url];

    var response = new EventEmitter();
    response.setEncoding = function() {};
    response.resume = function() {};

    ut.extend(response, url_data);

    // Emulate the request I/O with a setTimeout
    setTimeout(function() {
        request.emit('response', response);
        if(response.chunks) {
            var chunks = response.chunks
              , i;

            for(i = 0; i < chunks.length - 1; i++) {
                response.emit('data', chunks[i])
            }
            response.emit('end', chunks[chunks.length - 1]);
        }
    }, 0);
    return request;
};

mock_https = {
    'request': mock_request,
    'protocol': 'https',
};
mock_http = {
    'request': mock_request,
    'protocol': 'http',
};

robots.https = mock_https;
robots.http = mock_http;


/*
 * Main test function for testing the parser.read method
 *
 * @param {String}  test_url        URL of the robots.txt
 * @param {Object}  request_map     Mapping from URLs to
 *                                  response data
 * @param {Object}  test_map        Expected results data
 */
function testRead(test_url, request_map, test_map) {
    var test_site = url.parse(test_url).hostname;
    test_request_data[test_site] = request_map;

    parser = new robots.RobotsParser(test_url, 'testing', function(p, success) {
        assert.equal(success, test_map['success'],
            "Success is not what was expected");
        p.canFetch('testing', '/disallowed', function(disallowed) {
            assert.equal(disallowed, test_map['disallowed'],
                "/disallowed not correct status");
        });
        p.canFetch('testing', '/allowed', function(allowed) {
            assert.equal(allowed, test_map['allowed'],
                "/allowed not correct status");
        });
    });
}


// Chunks to be sent for most tests
var default_chunks = [
    'User-agent: testing\n',
    'Disallow: /disallowed\n',
    'Allow: /allowed'
];


/*
 * Tests
 */
module.exports = {
  '1. Test permanent redirect': function() {
    testRead(
        'http://testsite1.com/robots.txt',
        {
            'http://testsite1.com/robots.txt': {
                'statusCode': 301,
                'headers': { 'location': 'http://testsite1.com/redirect.txt' }
            },
            'http://testsite1.com/redirect.txt': {
                'statusCode': 200,
                'chunks': default_chunks
            }
        },
        {
            'success': true,
            'disallowed': false,
            'allowed': true,
        }
    );
  },
  '2. Test temporary redirect': function() {
    testRead(
        'http://testsite2.com/robots.txt',
        {
            'http://testsite2.com/robots.txt': {
                'statusCode': 302,
                'headers': { 'location': 'http://testsite2.com/redirect.txt' }
            },
            'http://testsite2.com/redirect.txt': {
                'statusCode': 200,
                'chunks': default_chunks
            }
        },
        {
            'success': true,
            'disallowed': false,
            'allowed': true,
        }
    );
  },
  '3. Test relative redirect': function() {
    testRead(
        'http://testsite3.com/robots.txt',
        {
            'http://testsite3.com/robots.txt': {
                'statusCode': 302,
                'headers': { 'location': '/redirect.txt' }
            },
            'http://testsite3.com/redirect.txt': {
                'statusCode': 200,
                'chunks': default_chunks
            }
        },
        {
            'success': true,
            'disallowed': false,
            'allowed': true,
        }
    );
  },
  '4. Test disallow all by 401': function() {
    testRead(
        'http://testsite4.com/robots.txt',
        {
            'http://testsite4.com/robots.txt': {
                'statusCode': 401
            }
        },
        {
            'success': false,
            'disallowed': false,
            'allowed': false,
        }
    );
  },
  '5. Test disallow all by 403': function() {
    testRead(
        'http://testsite5.com/robots.txt',
        {
            'http://testsite5.com/robots.txt': {
                'statusCode': 403
            }
        },
        {
            'success': false,
            'disallowed': false,
            'allowed': false,
        }
    );
  },
  '6. Test allow all by 404': function() {
    testRead(
        'http://testsite6.com/robots.txt',
        {
            'http://testsite6.com/robots.txt': {
                'statusCode': 404
            }
        },
        {
            'success': false,
            'disallowed': true,
            'allowed': true,
        }
    );
  },
  '7. Test https works': function() {
    testRead(
        'https://testsite7.com/robots.txt',
        {
            'https://testsite7.com/robots.txt': {
                'statusCode': 200,
                'chunks': default_chunks
            }
        },
        {
            'success': true,
            'disallowed': false,
            'allowed': true,
        }
    );
  },
  '8. Test strange chunks': function() {
    testRead(
        'https://testsite8.com/robots.txt',
        {
            'https://testsite8.com/robots.txt': {
                'statusCode': 200,
                'chunks': [
                    'User-agent: ',
                    'testing\nDisallow: /disallowed\nAl',
                    'low: /allowed'
                ]
            }
        },
        {
            'success': true,
            'disallowed': false,
            'allowed': true,
        }
    );
  },
  '9. Test port in redirect': function() {
    testRead(
        'http://testsite9.com/robots.txt',
        {
            'http://testsite9.com/robots.txt': {
                'statusCode': 302,
                'headers': { 'location': 'http://testsite9.com:8080/redirect.txt' }
            },
            'http://testsite9.com:8080/redirect.txt': {
                'statusCode': 200,
                'chunks': default_chunks
            }
        },
        {
            'success': true,
            'disallowed': false,
            'allowed': true,
        }
    );
  },
}

