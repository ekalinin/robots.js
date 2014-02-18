robots.js
=========

robots.js — is parser for [robots.txt](www.robotstxt.org) files for node.js.

Installation
------------

It's recommended to install via [npm](https://github.com/isaacs/npm/):

```bash
$ npm install -g robots
```

Usage
-----

Here's an example of using robots.js:

```javascript
var robots = require('robots')
  , parser = new robots.RobotsParser();

parser.setUrl('http://nodeguide.ru/robots.txt', function(parser, success) {
  if(success) {
    parser.canFetch('*', '/doc/dailyjs-nodepad/', function (access) {
      if (access) {
        // parse url
      }
    });
  }
});
```

Default crawler user-agent is:

    Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0

Here's an example of using another user-agent and more detailed callback:

```javascript
var robots = require('robots')
  , parser = new robots.RobotsParser(
                'http://nodeguide.ru/robots.txt',
                'Mozilla/5.0 (compatible; RobotTxtBot/1.0)',
                after_parse
            );
            
function after_parse(parser, success) {
  if(success) {
    parser.canFetch('*', '/doc/dailyjs-nodepad/', function (access, url, reason) {
      if (access) {
        console.log(' url: '+url+', access: '+access);
        // parse url ...
      }
    });
  }
};
```

Here's an example of getting list of sitemaps:

```javascript
var robots = require('robots')
  , parser = new robots.RobotsParser();

parser.setUrl('http://nodeguide.ru/robots.txt', function(parser, success) {
  if(success) {
    parser.getSitemaps(function(sitemaps) {
      // sitemaps — array
    });
  }
});
```

Here's an example of getCrawlDelay usage:

```javascript
    var robots = require('robots')
      , parser = new robots.RobotsParser();

    // for example:
    //
    // $ curl -s http://nodeguide.ru/robots.txt
    //
    // User-agent: Google-bot
    // Disallow: / 
    // Crawl-delay: 2
    //
    // User-agent: *
    // Disallow: /
    // Crawl-delay: 2

    parser.setUrl('http://nodeguide.ru/robots.txt', function(parser, success) {
      if(success) {
        var GoogleBotDelay = parser.getCrawlDelay("Google-bot");
        // ...
      }
    });
```

An example of passing options to the HTTP request:

```javascript
var options = {
  headers:{
    Authorization:"Basic " + new Buffer("username:password").toString("base64")}
}

var robots = require('robots')
  , parser = new robots.RobotsParser(null, options);

parser.setUrl('http://nodeguide.ru/robots.txt', function(parser, success) {
  ...
});
```


API
---

RobotsParser — main class. This class provides a set of methods to read,
parse and answer questions about a single robots.txt file.

  * **setUrl(url, read)** — sets the URL referring to a robots.txt file.
    by default, invokes read() method.
    If read is a function, it is called once the remote file is downloaded and parsed, and it
      takes in two arguments: the first is the parser itself, and the second is a boolean
      which is True if the the remote file was successfully parsed.
  * **read(after_parse)** — reads the robots.txt URL and feeds it to the parser
  * **parse(lines)** — parse the input lines from a robots.txt file
  * **canFetch(userAgent, url, callback)** — using the parsed robots.txt decide if
    userAgent can fetch url. Callback function:
    ``function callback(access, url, reason) { ... }``
    where:
    * *access* — can this url be fetched. true/false.
    * *url* — target url
    * *reason* — reason for ``access``. Object:
      * type — valid values: 'statusCode', 'entry', 'defaultEntry', 'noRule'
      * entry — an instance of ``lib/Entry.js:``. Only for types: 'entry', 'defaultEntry'
      * statusCode — http response status code for url. Only for type 'statusCode'
  * **canFetchSync(userAgent, url)** — using the parsed robots.txt decide if
    userAgent can fetch url. Return true/false.
  * **getCrawlDelay(userAgent)** — returns Crawl-delay for the certain userAgent
  * **getSitemaps(sitemaps)** — gets Sitemaps from parsed robots.txt

License
-------

See [LICENSE](https://github.com/ekalinin/robots.js/blob/master/LICENSE)
file.


Resources
=========

  * [Robots.txt Specifications by Google](http://code.google.com/web/controlcrawlindex/docs/robots_txt.html)
  * [Robots.txt parser for python](http://docs.python.org/library/robotparser.html)
  * [A Standard for Robot Exclusion](http://www.robotstxt.org/orig.html)
