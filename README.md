robotstxt.js
============

Robotstxt — is parser for [robots.txt](www.robotstxt.org) files.

Installation
------------

It's recommended to install via [npm](https://github.com/isaacs/npm/):

    npm install -g robotstxt

Usage
-----

Here's an example of using robotstxt.js:

    var robots = require('robotstxt')
      , parser = new robotstxt.RobotsParser();

    parser.setUrl('http://nodeguide.ru/robots.txt');
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

See [LICENSE](https://github.com/ekalinin/robotstxt.js/blob/master/LICENSE)
file.
