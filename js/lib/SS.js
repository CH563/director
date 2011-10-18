
//
// sugarskull v0.9.1 (unstable) (http://www.github.com/hij1nx/sugarskull)
// generated by Codesurgeon (http://www.github.com/hij1nx/codesurgeon)
//
(function (w) {

if (!Array.prototype.filter) {
  Array.prototype.filter = function(filter, that) {
    var other = [], v;
    for (var i = 0, n = this.length; i < n; i++) {
      if (i in this && filter.call(that, v = this[i], i, this)) {
        other.push(v);
      }
    }
    return other;
  };
}

if (!Array.isArray){
  Array.isArray = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };
}

//
// Helper function to turn flatten an array.
//
function _flatten (arr) {
  var flat = [];

  arr.forEach(function (a) {
    flat = flat.concat(a);
  });

  return flat;
}

//
// Helper function for wrapping Array.every
// in the browser.
//
function _every (arr, iterator) {
  for (var i = 0; i < arr.length; i += 1) {
    if (iterator(arr[i], i, arr) === false) {
      return;
    }
  }
};

//
// Helper function for performing an asynchronous every 
// in series in the browser and the server.
//
function _asyncEverySeries (arr, iterator, callback) {
  if (!arr.length) {
    return callback();
  }
    
  var completed = 0;
  (function iterate() {
    iterator(arr[completed], function (err) {
      if (err || err === false) {
        callback(err);
        callback = function () {};
      }
      else {
        completed += 1;
        if (completed === arr.length) {
          callback();
        }
        else {
          iterate();
        }
      }
    });
  })();
};

var dloc = document.location;

var listener = {
  mode: "modern",
  hash: dloc.hash,
  check: function() {
    var h = dloc.hash;
    if (h != this.hash) {
      this.hash = h;
      this.onHashChanged();
    }
  },
  fire: function() {
    if (this.mode === "modern") {
      window.onhashchange();
    } else {
      this.onHashChanged();
    }
  },
  init: function(fn) {
    var self = this;
    if (!window.Router.listeners) {
      window.Router.listeners = [];
    }
    function onchange() {
      for (var i = 0, l = window.Router.listeners.length; i < l; i++) {
        window.Router.listeners[i]();
      }
    }
    if ("onhashchange" in window && (document.documentMode === undefined || document.documentMode > 7)) {
      window.onhashchange = onchange;
      this.mode = "modern";
    } else {
      var frame = document.createElement("iframe");
      frame.id = "state-frame";
      frame.style.display = "none";
      document.body.appendChild(frame);
      this.writeFrame("");
      if ("onpropertychange" in document && "attachEvent" in document) {
        document.attachEvent("onpropertychange", function() {
          if (event.propertyName === "location") {
            self.check();
          }
        });
      }
      window.setInterval(function() {
        self.check();
      }, 50);
      this.onHashChanged = onchange;
      this.mode = "legacy";
    }
    window.Router.listeners.push(fn);
    return this.mode;
  },
  destroy: function(fn) {
    if (!window.Router || !window.Router.listeners) {
      return;
    }
    var listeners = window.Router.listeners;
    for (var i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i] === fn) {
        listeners.splice(i, 1);
      }
    }
  },
  setHash: function(s) {
    if (mode === "legacy") {
      this.writeFrame(s);
    }
    dloc.hash = s[0] === "/" ? s : "/" + s;
    return this;
  },
  writeFrame: function(s) {
    var f = document.getElementById("state-frame");
    var d = f.contentDocument || f.contentWindow.document;
    d.open();
    d.write("<script>_hash = '" + s + "'; onload = parent.listener.syncHash;<script>");
    d.close();
  },
  syncHash: function() {
    var s = this._hash;
    if (s != dloc.hash) {
      dloc.hash = s;
    }
    return this;
  },
  onHashChanged: function() {}
};

//
// Helper function for expanding "named" matches 
// (e.g. `:dog`, etc.) against the given set 
// of params:
//
//    {
//      ':dog': function (str) { 
//        return str.replace(/:dog/, 'TARGET');
//      }
//      ...
//    }
//
function paramifyString(str, params, mod) {
  mod = str;
  for (var param in params) {
    if (params.hasOwnProperty(param)) {
      mod = params[param](str);
      if (mod !== str) { break }
    }
  }
  
  return mod === str
    ? '([a-zA-Z0-9-]+)'
    : mod;
}

//
// Helper function for expanding wildcards (*) and 
// "named" matches (:whatever)
// 
function regifyString(str, params) {
  if (~str.indexOf('*')) {
    str = str.replace(/\*/g, '([_\.\(\)!\\ %@&a-zA-Z0-9-]+)');
  }
  
  var captures = str.match(/:([^\/]+)/ig),
      length;
      
  if (captures) {
    length = captures.length;
    for (var i = 0; i < length; i++) {
      str = str.replace(captures[i], paramifyString(captures[i], params));
    }
  }
    
  return str;
}

//
// ### function Router (routes)
// #### @routes {Object} **Optional** Routing table for this instance.
// Constuctor function for the Router object responsible for building 
// and dispatching from a given routing table.
//
var Router = w.Router = function(routes) {
  if (!(this instanceof Router)) return new Router(routes);
  this.params = {};
  this.routes = {};
  this.methods = [ "on", "once", "after", "before" ];
  this._methods = {};
  this._insert = this.insert;
  this.insert = this.insertEx;
  this.configure();
  this.mount(routes || {});
};

//
// ### function configure (options)
// #### @options {Object} **Optional** Options to configure this instance with
// Configures this instance with the specified `options`.
//
Router.prototype.configure = function (options) {
  options = options || {};
  
  //
  // TODO: Use other existing configuration options
  //
  for (var i = 0; i < this.methods.length; i++) {
    this._methods[this.methods[i]] = true;
  }
  
  this.recurse   = options.recurse   || false;
  this.async     = options.async     || false;
  this.delimiter = options.delimiter || '\/';
  this.notfound  = options.notfound;
  this.resource  = options.resource;

  //
  // TODO: Global once
  //
  this.every     = {
    after: options.after || [],
    before: options.before || [],
    on: options.on || []
  };

  return this;
};

//
// ### function param (token, regex)
// #### @token {string} Token which to replace (e.g. `:dog`, 'cat')
// #### @matcher {string|RegExp} Target to replace the token with.
// Setups up a `params` function which replaces any instance of `token`,
// inside of a given `str` with `matcher`. This is very useful if you 
// have a common regular expression throughout your code base which
// you wish to be more DRY. 
//
Router.prototype.param = function (token, matcher) {
  if (token[0] !== ':') {
    token = ':' + token;
  }
  
  var compiled = new RegExp(token, 'g');
  this.params[token] = function (str) {
    return str.replace(compiled, matcher.source || matcher);
  };
};

//
// ### function on (method, path, route)
// #### @method {string} **Optional** Method to use 
// #### @path {string} Path to set this route on.
// #### @route {Array|function} Handler for the specified method and path.
// Adds a new `route` to this instance for the specified `method`
// and `path`.
//
Router.prototype.on = function (method, path, route) {
  if (!route && typeof path == 'function') {
    //
    // If only two arguments are supplied then assume this
    // `route` was meant to be a generic `on`. 
    //
    route = path;
    path = method;
    method = 'on';
  }
  
  if (path.source) {
    path = path.source;
  }
  
  this.insert(method, path.split(new RegExp(this.delimiter)), route);
};

//
// ### function dispatch (method, path)
// #### @method {string} Method to dispatch
// #### @path {string} Path to dispatch
// #### @callback {function} **Optional** Continuation to respond to for async scenarios. 
// Finds a set of functions on the traversal towards
// `method` and `path` in the core routing table then 
// invokes them based on settings in this instance.
//
Router.prototype.dispatch = function (method, path, callback) {  
  var self = this,
      fns = this.traverse(method, path, this.routes, ''),
      invoked = this._invoked,
      runlist,
      after;

  this._invoked = true;
  if (!fns || fns.length === 0) {
    this.last = [];
    if (typeof this.notfound === 'function') {
      this.notfound(callback);
    }

    return false;
  }

  if (this.recurse === 'forward') {
    fns = fns.reverse();
  }

  function updateAndInvoke() {
    self.last = fns.after;
    self.invoke(runlist, self, callback);    
  }

  //
  // Build the list of functions to invoke from this call
  // to dispatch conforming to the following order:
  //
  // 1. Global after (if any)
  // 2. After functions from the last call to dispatch
  // 3. Global before (if any)
  // 4. Global on (if any)
  // 5. Matched functions from routing table (`['before', 'on'], ['before', 'on`], ...]`)
  //
  after = [this.every.after].concat(this.last);
  runlist = [this.every.before].concat(_flatten(fns), this.every.on);
  runlist.captures = fns.captures;
  runlist.source = fns.source;

  if (after && after.length > 0 && invoked) {
    if (this.async) {
      this.invoke(after, this, updateAndInvoke);
    }
    else {
      this.invoke(after, this);
      updateAndInvoke();
    }

    return true;
  }

  updateAndInvoke();
  return true;
};

//
// ### function invoke (fns, thisArg)
// #### @fns {Array} Set of functions to invoke in order.
// #### @thisArg {Object} `thisArg` for each function.
// #### @callback {function} **Optional** Continuation to pass control to for async `fns`.
// Invokes the `fns` synchronously or asynchronously depending on the 
// value of `this.async`. Each function must **not** return (or respond)
// with false, or evaluation will short circuit.
//
Router.prototype.invoke = function (fns, thisArg, callback) {
  var self = this;

  if (this.async) {
    _asyncEverySeries(fns, function (fn, next) {
      fn.apply(thisArg, fns.captures.concat(next));
    }, function () {
      //
      // Ignore the response here. Let the routed take care
      // of themselves and eagerly return true. 
      //
      if (callback) {
        callback.apply(null, arguments);
      }
    });
  }
  else {
    _every(fns, function apply(fn) {
      if (Array.isArray(fn)) {
        return _every(fn, apply);
      }
      else if (typeof fn === 'function') {
        return fn.apply(thisArg, fns.captures || null);
      }
      else if (typeof fn === 'string' && self.resource) {
        self.resource[fn].apply(thisArg, fns.captures || null)
      }
    });
  }
};

//
// ### function traverse (method, path, routes, regexp)
// #### @method {string} Method to find in the `routes` table.
// #### @path {string} Path to find in the `routes` table.
// #### @routes {Object} Partial routing table to match against
// #### @regexp {string} Partial regexp representing the path to `routes`.
// Core routing logic for `sugarskull.Router`: traverses the
// specified `path` within `this.routes` looking for `method` 
// returning any `fns` that are found. 
//
Router.prototype.traverse = function (method, path, routes, regexp) {
  var fns = [],
      current,
      match,
      next,
      that;

  for (var r in routes) {
    //
    // We dont have an exact match, lets explore the tree
    // in a depth-first, recursive, in-order manner where
    // order is defined as:
    //
    //    ['before', 'on', '<method>', 'after']
    //
    // Remember to ignore keys (i.e. values of `r`) which 
    // are actual methods (e.g. `on`, `before`, etc).
    //
    if (routes.hasOwnProperty(r) && !this._methods[r]) {
      //
      // Attempt to make an exact match for the current route
      // which is built from the `regexp` that has been built 
      // through recursive iteration.
      //
      current = regexp + this.delimiter + r;
      match   = path.match(new RegExp('^' + current));
      
      if (!match) {
        //
        // If there isn't a `match` then continue. Here, the
        // `match` is a partial match. e.g.
        //
        //    '/foo/bar/buzz'.match(/^\/foo/)   // ['/foo']
        //    '/no-match/route'.match(/^\/foo/) // null
        //
        continue;
      }

      if (match[0] && match[0] == path && routes[r][method]) {
        //
        // ### Base case 1:
        // If we had a `match` and the capture is the path itself, 
        // then we have completed our recursion.
        //
        next = [[routes[r].before, routes[r][method]].filter(Boolean)];
        next.after = [routes[r].after].filter(Boolean);
        next.matched = true;
        next.captures = match.slice(1);
        return next;
      }
      
      //
      // ### Recursive case:
      // If we had a match, but it is not yet an exact match then
      // attempt to continue matching against the next portion of the
      // routing table. 
      //
      next = this.traverse(method, path, routes[r], current);

      //
      // `next.matched` will be true if the depth-first search of the routing
      // table from this position was successful. 
      //
      if (next.matched) {
        //
        // Build the in-place tree structure representing the function
        // in the correct order.
        //
        if (next.length > 0) {
          fns = fns.concat(next);
        }

        if (this.recurse) {
          fns.push([routes[r].before, routes[r].on].filter(Boolean));
          next.after = next.after.concat([routes[r].after].filter(Boolean));
        }

        fns.matched = true;
        fns.captures = next.captures;
        fns.after = next.after;

        //
        // ### Base case 2: 
        // Continue passing the partial tree structure back up the stack.
        // The caller for `dispatch()` will decide what to do with the functions.
        //
        return fns;
      }
    }
  }
  
  return false;
};

//
// ### function insert (method, path, route, context)
// #### @method {string} Method to insert the specific `route`.
// #### @path {Array} Parsed path to insert the `route` at.
// #### @route {Array|function} Route handlers to insert.
// #### @parent {Object} **Optional** Parent "routes" to insert into.
// Inserts the `route` for the `method` into the routing table for 
// this instance at the specified `path` within the `context` provided.
// If no context is provided then `this.routes` will be used.
//
Router.prototype.insert = function (method, path, route, parent) {
  var part = path.shift(),
      methodType,
      parentType,
      isArray,
      nested;
  
  parent = parent || this.routes;
  
  if (path.length > 0) {
    //
    // If this is not the last part left in the `path`
    // (e.g. `['cities', 'new-york']`) then recurse into that 
    // child 
    //
    parent[part] = parent[part] || {};
    return this.insert(method, path, route, parent[part]);
  }

  //
  // Otherwise, we are at the end of our insertion so we should
  // insert the `route` based on the `method` after getting the
  // `parent` of the last `part`.

  parentType = typeof parent[part];
  isArray = Array.isArray(parent[part]);
  
  if (parent[part] && !isArray && parentType == 'object') {
    methodType = typeof parent[part][method];

    switch (methodType) {
      case 'function':
        parent[part][method] = [parent[part][method], route];
        return;
      case 'object':
        parent[part][method].push(route)
        return;
      case 'undefined':
        parent[part][method] = route;
        return;
    }
  }
  else if (parentType == 'undefined') {
    nested = {};
    nested[method] = route;
    parent[part] = nested;
    return;
  }
  
  throw new Error('Invalid route context: ' + parentType);
};

Router.prototype.insertEx = function(method, path, route, parent) {
  if (method === "once") {
    method = "on";
    route = function(route) {
      var once = false;
      return function() {
        if (once) return;
        once = true;
        return route.apply(this, arguments);
      };
    }(route);
  }
  return this._insert(method, path, route, parent);
};

Router.prototype.extend = function(methods) {
  var self = this, len = methods.length, i;
  for (i = 0; i < len; i++) {
    (function(method) {
      self[method] = function(path, route) {
        self.on(method, path, route);
      };
    })(methods[i]);
  }
};

Router.prototype.mount = function(routes, path) {
  if (!routes || typeof routes !== "object" || Array.isArray(routes)) {
    return;
  }
  
  var self = this;
  path = path || [];

  function insertOrMount(route, local) {
    var rename = route, 
        parts = route.split(self.delimiter), 
        routeType = typeof routes[route], 
        isRoute = parts[0] === "" || !self._methods[parts[0]], 
        event = isRoute ? "on" : rename;

    if (isRoute) {
      rename = rename.slice(self.delimiter.length);
      parts.shift();
    }

    if (isRoute && routeType === "object" && !Array.isArray(routes[route])) {
      for (var i = 0; i < parts.length; i++) {
        if (/\:|\*/.test(parts[i])) {
          parts[i] = regifyString(parts[i], self.params);
        }  
      }
      
      local = local.concat(parts);
      self.mount(routes[route], local);
      return;
    }

    if (/\:|\*/.test(rename)) {
      rename = regifyString(rename, self.params);
    }
    
    if (isRoute) {
      local = local.concat(rename.split(self.delimiter));
    }
    
    self.insert(event, local, routes[route]);
  }

  for (var route in routes) {
    if (routes.hasOwnProperty(route)) {
      insertOrMount(route, path.slice(0));
    }
  }
};

Router.prototype.init = function(r) {
  var self = this;
  this.handler = function() {
    var hash = dloc.hash.replace(/^#/, "");
    self.dispatch("on", hash);
  };
  if (dloc.hash === "" && r) {
    dloc.hash = r;
  }
  if (dloc.hash.length > 0) {
    this.handler();
  }
  listener.init(this.handler);
  return this;
};

Router.prototype.explode = function() {
  var v = dloc.hash;
  if (v[1] === "/") {
    v = v.slice(1);
  }
  return v.slice(1, v.length).split("/");
};

Router.prototype.setRoute = function(i, v, val) {
  var url = this.explode();
  if (typeof i === "number" && typeof v === "string") {
    url[i] = v;
  } else if (typeof val === "string") {
    url.splice(i, v, s);
  } else {
    url = [ i ];
  }
  listener.setHash(url.join("/"));
  return url;
};

Router.prototype.getState = function() {
  return this.state;
};

Router.prototype.getRoute = function(v) {
  var ret = v;
  if (typeof v === "number") {
    ret = this.explode()[v];
  } else if (typeof v === "string") {
    var h = this.explode();
    ret = h.indexOf(v);
  } else {
    ret = this.explode();
  }
  return ret;
};

Router.prototype.destroy = function() {
  listener.destroy(this.handler);
  return this;
};

Router.prototype.recurse = function(value) {
  if (value === undefined) {
    return recurse;
  }
  this.add = (this._recurse = value) === "forward" ? "unshift" : "push";
};

}(window));