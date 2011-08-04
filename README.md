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
    parser.canFetch('*', '/doc/dailyjs-nodepad/');

Default crawler user-agent is:

  User-Agent: Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0

Here's an example of using another user-agent:

    var robots = require('robots')
      , parser = new robots.RobotsParser(
                    'http://nodeguide.ru/robots.txt',
                    'Mozilla/5.0 (compatible; RobotTxtBot/1.0)'
                );
    parser.canFetch('*', '/doc/dailyjs-nodepad/');

API
---

RobotsParser — main class. This class provides a set of methods to read,
parse and answer questions about a single robots.txt file.

  * **setUrl(url, read)** — sets the URL referring to a robots.txt file.
    By default, invokes read() method.
  * **read()** — reads the robots.txt URL and feeds it to the parser
  * **parse(lines)** — parse the input lines from a robots.txt file
  * **canFetch(userAgent, url)** — using the parsed robots.txt decide if
    userAgent can fetch url.

License
-------

See [LICENSE](https://github.com/ekalinin/robots.js/blob/master/LICENSE)
file.


Resources
=========

  * [Robots.txt Specifications by Google](http://code.google.com/web/controlcrawlindex/docs/robots_txt.html)
  * [Robots.txt parser for python](http://docs.python.org/library/robotparser.html)
  * [A Standard for Robot Exclusion](http://www.robotstxt.org/orig.html)
