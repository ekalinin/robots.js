robots.js
=========

robots.js — is parser for [robots.txt](www.robotstxt.org) files for node.js.

Installation
------------

It's recommended to install via [npm](https://github.com/isaacs/npm/):

    npm install -g robots

Usage
-----

Here's an example of using robots.js:

    var robots = require('robots')
      , parser = new robots.RobotsParser();

    parser.setUrl('http://nodeguide.ru/robots.txt');
    parser.canFetch('*', '/doc/dailyjs-nodepad/', function (access) {
      if (access) {
        // parse url
      }
    });

Default crawler user-agent is:

    Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0

Here's an example of using another user-agent and more detailed callback:

    var robots = require('robots')
      , parser = new robots.RobotsParser(
                    'http://nodeguide.ru/robots.txt',
                    'Mozilla/5.0 (compatible; RobotTxtBot/1.0)'
                );
    parser.canFetch('*', '/doc/dailyjs-nodepad/', function (access, url, reason) {
      if (access) {
        console.log(' url: '+url+', access: '+access);
        // parse url ...
      }
    });



API
---

RobotsParser — main class. This class provides a set of methods to read,
parse and answer questions about a single robots.txt file.

  * **setUrl(url, read)** — sets the URL referring to a robots.txt file.
    By default, invokes read() method.
  * **read()** — reads the robots.txt URL and feeds it to the parser
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

License
-------

See [LICENSE](https://github.com/ekalinin/robots.js/blob/master/LICENSE)
file.


Resources
=========

  * [Robots.txt Specifications by Google](http://code.google.com/web/controlcrawlindex/docs/robots_txt.html)
  * [Robots.txt parser for python](http://docs.python.org/library/robotparser.html)
  * [A Standard for Robot Exclusion](http://www.robotstxt.org/orig.html)
