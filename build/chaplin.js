/*!
 * Chaplin 1.2.0
 *
 * Chaplin may be freely distributed under the MIT license.
 * For all details and documentation:
 * http://chaplinjs.org
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['backbone', 'underscore'], factory);
  } else if (typeof module === 'object' && module && module.exports) {
    module.exports = factory(require('backbone'), require('underscore'));
  } else if (typeof require === 'function') {
    factory(window.Backbone, window._ || window.Backbone.utils);
  } else {
    throw new Error('Chaplin requires Common.js or AMD modules');
  }
}(this, function(Backbone, _) {
  function require(name) {
    return {backbone: Backbone, underscore: _}[name];
  }

  require =(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
module.exports = {
  Application: require('./chaplin/application'),
  Composer: require('./chaplin/composer'),
  Controller: require('./chaplin/controllers/controller'),
  Dispatcher: require('./chaplin/dispatcher'),
  Composition: require('./chaplin/lib/composition'),
  EventBroker: require('./chaplin/lib/event_broker'),
  History: require('./chaplin/lib/history'),
  Route: require('./chaplin/lib/route'),
  Router: require('./chaplin/lib/router'),
  support: require('./chaplin/lib/support'),
  SyncMachine: require('./chaplin/lib/sync_machine'),
  utils: require('./chaplin/lib/utils'),
  mediator: require('./chaplin/mediator'),
  Collection: require('./chaplin/models/collection'),
  Model: require('./chaplin/models/model'),
  CollectionView: require('./chaplin/views/collection_view'),
  Layout: require('./chaplin/views/layout'),
  View: require('./chaplin/views/view')
};


},{"./chaplin/application":2,"./chaplin/composer":3,"./chaplin/controllers/controller":4,"./chaplin/dispatcher":5,"./chaplin/lib/composition":6,"./chaplin/lib/event_broker":7,"./chaplin/lib/history":8,"./chaplin/lib/route":9,"./chaplin/lib/router":10,"./chaplin/lib/support":11,"./chaplin/lib/sync_machine":12,"./chaplin/lib/utils":13,"./chaplin/mediator":14,"./chaplin/models/collection":15,"./chaplin/models/model":16,"./chaplin/views/collection_view":17,"./chaplin/views/layout":18,"./chaplin/views/view":19}],2:[function(require,module,exports){
'use strict';
var Application, Backbone, Composer, Dispatcher, EventBroker, Layout, Router, _, mediator;

_ = require('underscore');

Backbone = require('backbone');

Composer = require('./composer');

Dispatcher = require('./dispatcher');

Router = require('./lib/router');

Layout = require('./views/layout');

EventBroker = require('./lib/event_broker');

mediator = require('./mediator');

module.exports = Application = (function() {
  Application.extend = Backbone.Model.extend;

  _.extend(Application.prototype, EventBroker);

  Application.prototype.title = '';

  Application.prototype.dispatcher = null;

  Application.prototype.layout = null;

  Application.prototype.router = null;

  Application.prototype.composer = null;

  Application.prototype.started = false;

  function Application(options) {
    if (options == null) {
      options = {};
    }
    this.initialize(options);
  }

  Application.prototype.initialize = function(options) {
    if (options == null) {
      options = {};
    }
    if (this.started) {
      throw new Error('Application#initialize: App was already started');
    }
    this.initRouter(options.routes, options);
    this.initDispatcher(options);
    this.initLayout(options);
    this.initComposer(options);
    this.initMediator();
    return this.start();
  };

  Application.prototype.initDispatcher = function(options) {
    return this.dispatcher = new Dispatcher(options);
  };

  Application.prototype.initLayout = function(options) {
    if (options == null) {
      options = {};
    }
    if (options.title == null) {
      options.title = this.title;
    }
    return this.layout = new Layout(options);
  };

  Application.prototype.initComposer = function(options) {
    if (options == null) {
      options = {};
    }
    return this.composer = new Composer(options);
  };

  Application.prototype.initMediator = function() {
    return Object.seal(mediator);
  };

  Application.prototype.initRouter = function(routes, options) {
    this.router = new Router(options);
    return typeof routes === "function" ? routes(this.router.match) : void 0;
  };

  Application.prototype.start = function() {
    this.router.startHistory();
    this.started = true;
    this.disposed = false;
    return Object.seal(this);
  };

  Application.prototype.dispose = function() {
    var i, len, prop, properties;
    if (this.disposed) {
      return;
    }
    properties = ['dispatcher', 'layout', 'router', 'composer'];
    for (i = 0, len = properties.length; i < len; i++) {
      prop = properties[i];
      if (this[prop] != null) {
        this[prop].dispose();
      }
    }
    this.disposed = true;
    return Object.freeze(this);
  };

  return Application;

})();


},{"./composer":3,"./dispatcher":5,"./lib/event_broker":7,"./lib/router":10,"./mediator":14,"./views/layout":18,"backbone":"backbone","underscore":"underscore"}],3:[function(require,module,exports){
'use strict';
var Backbone, Composer, Composition, EventBroker, _, mediator;

_ = require('underscore');

Backbone = require('backbone');

Composition = require('./lib/composition');

EventBroker = require('./lib/event_broker');

mediator = require('./mediator');

module.exports = Composer = (function() {
  Composer.extend = Backbone.Model.extend;

  _.extend(Composer.prototype, EventBroker);

  Composer.prototype.compositions = null;

  function Composer() {
    this.initialize.apply(this, arguments);
  }

  Composer.prototype.initialize = function(options) {
    if (options == null) {
      options = {};
    }
    this.compositions = {};
    mediator.setHandler('composer:compose', this.compose, this);
    mediator.setHandler('composer:retrieve', this.retrieve, this);
    return this.subscribeEvent('dispatcher:dispatch', this.cleanup);
  };

  Composer.prototype.compose = function(name, second, third) {
    if (typeof second === 'function') {
      if (third || second.prototype.dispose) {
        if (second.prototype instanceof Composition) {
          return this._compose(name, {
            composition: second,
            options: third
          });
        } else {
          return this._compose(name, {
            options: third,
            compose: function() {
              var autoRender, disabledAutoRender;
              if (second.prototype instanceof Backbone.Model || second.prototype instanceof Backbone.Collection) {
                this.item = new second(null, this.options);
              } else {
                this.item = new second(this.options);
              }
              autoRender = this.item.autoRender;
              disabledAutoRender = autoRender === void 0 || !autoRender;
              if (disabledAutoRender && typeof this.item.render === 'function') {
                return this.item.render();
              }
            }
          });
        }
      }
      return this._compose(name, {
        compose: second
      });
    }
    if (typeof third === 'function') {
      return this._compose(name, {
        compose: third,
        options: second
      });
    }
    return this._compose(name, second);
  };

  Composer.prototype._compose = function(name, options) {
    var composition, current, isPromise, returned;
    if (typeof options.compose !== 'function' && (options.composition == null)) {
      throw new Error('Composer#compose was used incorrectly');
    }
    if (options.composition != null) {
      composition = new options.composition(options.options);
    } else {
      composition = new Composition(options.options);
      composition.compose = options.compose;
      if (options.check) {
        composition.check = options.check;
      }
    }
    current = this.compositions[name];
    if (current && current.check(composition.options)) {
      current.stale(false);
    } else {
      if (current) {
        current.dispose();
      }
      returned = composition.compose(composition.options);
      isPromise = typeof (returned != null ? returned.then : void 0) === 'function';
      composition.stale(false);
      this.compositions[name] = composition;
    }
    if (isPromise) {
      return returned;
    } else {
      return this.compositions[name].item;
    }
  };

  Composer.prototype.retrieve = function(name) {
    var active;
    active = this.compositions[name];
    if (active && !active.stale()) {
      return active.item;
    }
  };

  Composer.prototype.cleanup = function() {
    var composition, i, key, len, ref;
    ref = Object.keys(this.compositions);
    for (i = 0, len = ref.length; i < len; i++) {
      key = ref[i];
      composition = this.compositions[key];
      if (composition.stale()) {
        composition.dispose();
        delete this.compositions[key];
      } else {
        composition.stale(true);
      }
    }
  };

  Composer.prototype.disposed = false;

  Composer.prototype.dispose = function() {
    var i, key, len, ref;
    if (this.disposed) {
      return;
    }
    this.unsubscribeAllEvents();
    mediator.removeHandlers(this);
    ref = Object.keys(this.compositions);
    for (i = 0, len = ref.length; i < len; i++) {
      key = ref[i];
      this.compositions[key].dispose();
    }
    delete this.compositions;
    this.disposed = true;
    return Object.freeze(this);
  };

  return Composer;

})();


},{"./lib/composition":6,"./lib/event_broker":7,"./mediator":14,"backbone":"backbone","underscore":"underscore"}],4:[function(require,module,exports){
'use strict';
var Backbone, Controller, EventBroker, _, mediator, utils,
  slice = [].slice;

_ = require('underscore');

Backbone = require('backbone');

mediator = require('../mediator');

EventBroker = require('../lib/event_broker');

utils = require('../lib/utils');

module.exports = Controller = (function() {
  Controller.extend = Backbone.Model.extend;

  _.extend(Controller.prototype, Backbone.Events);

  _.extend(Controller.prototype, EventBroker);

  Controller.prototype.view = null;

  Controller.prototype.redirected = false;

  function Controller() {
    this.initialize.apply(this, arguments);
  }

  Controller.prototype.initialize = function() {};

  Controller.prototype.beforeAction = function() {};

  Controller.prototype.adjustTitle = function(subtitle) {
    return mediator.execute('adjustTitle', subtitle);
  };

  Controller.prototype.reuse = function() {
    var method;
    method = arguments.length === 1 ? 'retrieve' : 'compose';
    return mediator.execute.apply(mediator, ["composer:" + method].concat(slice.call(arguments)));
  };

  Controller.prototype.compose = function() {
    throw new Error('Controller#compose was moved to Controller#reuse');
  };

  Controller.prototype.redirectTo = function() {
    this.redirected = true;
    return utils.redirectTo.apply(utils, arguments);
  };

  Controller.prototype.disposed = false;

  Controller.prototype.dispose = function() {
    var i, key, len, member, ref;
    if (this.disposed) {
      return;
    }
    ref = Object.keys(this);
    for (i = 0, len = ref.length; i < len; i++) {
      key = ref[i];
      member = this[key];
      if (typeof (member != null ? member.dispose : void 0) === 'function') {
        member.dispose();
        delete this[key];
      }
    }
    this.unsubscribeAllEvents();
    this.stopListening();
    this.disposed = true;
    return Object.freeze(this);
  };

  return Controller;

})();


},{"../lib/event_broker":7,"../lib/utils":13,"../mediator":14,"backbone":"backbone","underscore":"underscore"}],5:[function(require,module,exports){
'use strict';
var Backbone, Dispatcher, EventBroker, _, mediator, utils;

_ = require('underscore');

Backbone = require('backbone');

EventBroker = require('./lib/event_broker');

utils = require('./lib/utils');

mediator = require('./mediator');

module.exports = Dispatcher = (function() {
  Dispatcher.extend = Backbone.Model.extend;

  _.extend(Dispatcher.prototype, EventBroker);

  Dispatcher.prototype.previousRoute = null;

  Dispatcher.prototype.currentController = null;

  Dispatcher.prototype.currentRoute = null;

  Dispatcher.prototype.currentParams = null;

  Dispatcher.prototype.currentQuery = null;

  function Dispatcher() {
    this.initialize.apply(this, arguments);
  }

  Dispatcher.prototype.initialize = function(options) {
    if (options == null) {
      options = {};
    }
    this.settings = _.defaults(options, {
      controllerPath: 'controllers/',
      controllerSuffix: '_controller'
    });
    return this.subscribeEvent('router:match', this.dispatch);
  };

  Dispatcher.prototype.dispatch = function(route, params, options) {
    var ref, ref1;
    params = _.extend({}, params);
    options = _.extend({}, options);
    if (options.query == null) {
      options.query = {};
    }
    if (options.forceStartup !== true) {
      options.forceStartup = false;
    }
    if (!options.forceStartup && ((ref = this.currentRoute) != null ? ref.controller : void 0) === route.controller && ((ref1 = this.currentRoute) != null ? ref1.action : void 0) === route.action && _.isEqual(this.currentParams, params) && _.isEqual(this.currentQuery, options.query)) {
      return;
    }
    return this.loadController(route.controller, (function(_this) {
      return function(Controller) {
        return _this.controllerLoaded(route, params, options, Controller);
      };
    })(this));
  };

  Dispatcher.prototype.loadController = function(name, handler) {
    var fileName, moduleName;
    if (name === Object(name)) {
      return handler(name);
    }
    fileName = name + this.settings.controllerSuffix;
    moduleName = this.settings.controllerPath + fileName;
    return utils.loadModule(moduleName, handler);
  };

  Dispatcher.prototype.controllerLoaded = function(route, params, options, Controller) {
    var controller, prev, previous;
    if (this.nextPreviousRoute = this.currentRoute) {
      previous = _.extend({}, this.nextPreviousRoute);
      if (this.currentParams != null) {
        previous.params = this.currentParams;
      }
      if (previous.previous) {
        delete previous.previous;
      }
      prev = {
        previous: previous
      };
    }
    this.nextCurrentRoute = _.extend({}, route, prev);
    controller = new Controller(params, this.nextCurrentRoute, options);
    return this.executeBeforeAction(controller, this.nextCurrentRoute, params, options);
  };

  Dispatcher.prototype.executeAction = function(controller, route, params, options) {
    if (this.currentController) {
      this.publishEvent('beforeControllerDispose', this.currentController);
      this.currentController.dispose(params, route, options);
    }
    this.currentController = controller;
    this.currentParams = _.extend({}, params);
    this.currentQuery = _.extend({}, options.query);
    controller[route.action](params, route, options);
    if (controller.redirected) {
      return;
    }
    return this.publishEvent('dispatcher:dispatch', this.currentController, params, route, options);
  };

  Dispatcher.prototype.executeBeforeAction = function(controller, route, params, options) {
    var before, executeAction, promise;
    before = controller.beforeAction;
    executeAction = (function(_this) {
      return function() {
        if (controller.redirected || _this.currentRoute && route === _this.currentRoute) {
          _this.nextPreviousRoute = _this.nextCurrentRoute = null;
          controller.dispose();
          return;
        }
        _this.previousRoute = _this.nextPreviousRoute;
        _this.currentRoute = _this.nextCurrentRoute;
        _this.nextPreviousRoute = _this.nextCurrentRoute = null;
        return _this.executeAction(controller, route, params, options);
      };
    })(this);
    if (!before) {
      executeAction();
      return;
    }
    if (typeof before !== 'function') {
      throw new TypeError('Controller#beforeAction: function expected. ' + 'Old object-like form is not supported.');
    }
    promise = controller.beforeAction(params, route, options);
    if (typeof (promise != null ? promise.then : void 0) === 'function') {
      return promise.then(executeAction);
    } else {
      return executeAction();
    }
  };

  Dispatcher.prototype.disposed = false;

  Dispatcher.prototype.dispose = function() {
    if (this.disposed) {
      return;
    }
    this.unsubscribeAllEvents();
    this.disposed = true;
    return Object.freeze(this);
  };

  return Dispatcher;

})();


},{"./lib/event_broker":7,"./lib/utils":13,"./mediator":14,"backbone":"backbone","underscore":"underscore"}],6:[function(require,module,exports){
'use strict';
var Backbone, Composition, EventBroker, _;

_ = require('underscore');

Backbone = require('backbone');

EventBroker = require('./event_broker');

module.exports = Composition = (function() {
  Composition.extend = Backbone.Model.extend;

  _.extend(Composition.prototype, Backbone.Events);

  _.extend(Composition.prototype, EventBroker);

  Composition.prototype.item = null;

  Composition.prototype.options = null;

  Composition.prototype._stale = false;

  function Composition(options) {
    this.options = _.extend({}, options);
    this.item = this;
    this.initialize(this.options);
  }

  Composition.prototype.initialize = function() {};

  Composition.prototype.compose = function() {};

  Composition.prototype.check = function(options) {
    return _.isEqual(this.options, options);
  };

  Composition.prototype.stale = function(value) {
    var item, name, ref;
    if (value == null) {
      return this._stale;
    }
    this._stale = value;
    ref = this;
    for (name in ref) {
      item = ref[name];
      if (item && item !== this && typeof item === 'object' && item.hasOwnProperty('stale')) {
        item.stale = value;
      }
    }
  };

  Composition.prototype.disposed = false;

  Composition.prototype.dispose = function() {
    var i, key, len, member, ref;
    if (this.disposed) {
      return;
    }
    ref = Object.keys(this);
    for (i = 0, len = ref.length; i < len; i++) {
      key = ref[i];
      member = this[key];
      if (member && member !== this && typeof member.dispose === 'function') {
        member.dispose();
        delete this[key];
      }
    }
    this.unsubscribeAllEvents();
    this.stopListening();
    delete this.redirected;
    this.disposed = true;
    return Object.freeze(this);
  };

  return Composition;

})();


},{"./event_broker":7,"backbone":"backbone","underscore":"underscore"}],7:[function(require,module,exports){
'use strict';
var EventBroker, mediator,
  slice = [].slice;

mediator = require('../mediator');

EventBroker = {
  subscribeEvent: function(type, handler) {
    if (typeof type !== 'string') {
      throw new TypeError('EventBroker#subscribeEvent: ' + 'type argument must be a string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('EventBroker#subscribeEvent: ' + 'handler argument must be a function');
    }
    mediator.unsubscribe(type, handler, this);
    return mediator.subscribe(type, handler, this);
  },
  subscribeEventOnce: function(type, handler) {
    if (typeof type !== 'string') {
      throw new TypeError('EventBroker#subscribeEventOnce: ' + 'type argument must be a string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('EventBroker#subscribeEventOnce: ' + 'handler argument must be a function');
    }
    mediator.unsubscribe(type, handler, this);
    return mediator.subscribeOnce(type, handler, this);
  },
  unsubscribeEvent: function(type, handler) {
    if (typeof type !== 'string') {
      throw new TypeError('EventBroker#unsubscribeEvent: ' + 'type argument must be a string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('EventBroker#unsubscribeEvent: ' + 'handler argument must be a function');
    }
    return mediator.unsubscribe(type, handler);
  },
  unsubscribeAllEvents: function() {
    return mediator.unsubscribe(null, null, this);
  },
  publishEvent: function() {
    var args, type;
    type = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    if (typeof type !== 'string') {
      throw new TypeError('EventBroker#publishEvent: ' + 'type argument must be a string');
    }
    return mediator.publish.apply(mediator, [type].concat(slice.call(args)));
  }
};

Object.freeze(EventBroker);

module.exports = EventBroker;


},{"../mediator":14}],8:[function(require,module,exports){
'use strict';
var Backbone, History, _, rootStripper, routeStripper,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require('underscore');

Backbone = require('backbone');

routeStripper = /^[#\/]|\s+$/g;

rootStripper = /^\/+|\/+$/g;

History = (function(superClass) {
  extend(History, superClass);

  function History() {
    return History.__super__.constructor.apply(this, arguments);
  }

  History.prototype.getFragment = function(fragment, forcePushState) {
    var root;
    if (fragment == null) {
      if (this._hasPushState || !this._wantsHashChange || forcePushState) {
        fragment = this.location.pathname + this.location.search;
        root = this.root.replace(/\/$/, '');
        if (!fragment.indexOf(root)) {
          fragment = fragment.slice(root.length);
        }
      } else {
        fragment = this.getHash();
      }
    }
    return fragment.replace(routeStripper, '');
  };

  History.prototype.start = function(options) {
    var atRoot, fragment, loc, ref, ref1, ref2;
    if (Backbone.History.started) {
      throw new Error('Backbone.history has already been started');
    }
    Backbone.History.started = true;
    this.options = _.extend({}, {
      root: '/'
    }, this.options, options);
    this.root = this.options.root;
    this._wantsHashChange = this.options.hashChange !== false;
    this._wantsPushState = Boolean(this.options.pushState);
    this._hasPushState = Boolean(this.options.pushState && ((ref = this.history) != null ? ref.pushState : void 0));
    fragment = this.getFragment();
    routeStripper = (ref1 = this.options.routeStripper) != null ? ref1 : routeStripper;
    rootStripper = (ref2 = this.options.rootStripper) != null ? ref2 : rootStripper;
    this.root = ('/' + this.root + '/').replace(rootStripper, '/');
    if (this._hasPushState) {
      Backbone.$(window).on('popstate', this.checkUrl);
    } else if (this._wantsHashChange) {
      Backbone.$(window).on('hashchange', this.checkUrl);
    }
    this.fragment = fragment;
    loc = this.location;
    atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;
    if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
      this.fragment = this.getFragment(null, true);
      this.location.replace(this.root + '#' + this.fragment);
      return true;
    } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
      this.fragment = this.getHash().replace(routeStripper, '');
      this.history.replaceState({}, document.title, this.root + this.fragment);
    }
    if (!this.options.silent) {
      return this.loadUrl();
    }
  };

  History.prototype.navigate = function(fragment, options) {
    var historyMethod, url;
    if (fragment == null) {
      fragment = '';
    }
    if (!Backbone.History.started) {
      return false;
    }
    if (!options || options === true) {
      options = {
        trigger: options
      };
    }
    fragment = this.getFragment(fragment);
    url = this.root + fragment;
    if (this.fragment === fragment) {
      return false;
    }
    this.fragment = fragment;
    if (fragment.length === 0 && url !== this.root) {
      url = url.slice(0, -1);
    }
    if (this._hasPushState) {
      historyMethod = options.replace ? 'replaceState' : 'pushState';
      this.history[historyMethod]({}, document.title, url);
    } else if (this._wantsHashChange) {
      this._updateHash(this.location, fragment, options.replace);
    } else {
      return this.location.assign(url);
    }
    if (options.trigger) {
      return this.loadUrl(fragment);
    }
  };

  return History;

})(Backbone.History);

module.exports = Backbone.$ ? History : Backbone.History;


},{"backbone":"backbone","underscore":"underscore"}],9:[function(require,module,exports){
'use strict';
var Backbone, Controller, EventBroker, Route, _, utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

_ = require('underscore');

Backbone = require('backbone');

EventBroker = require('./event_broker');

utils = require('./utils');

Controller = require('../controllers/controller');

module.exports = Route = (function() {
  var escapeRegExp, optionalRegExp, paramRegExp, processTrailingSlash;

  Route.extend = Backbone.Model.extend;

  _.extend(Route.prototype, EventBroker);

  escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  optionalRegExp = /\((.*?)\)/g;

  paramRegExp = /(?::|\*)(\w+)/g;

  processTrailingSlash = function(path, trailing) {
    switch (trailing) {
      case true:
        if (path.slice(-1) !== '/') {
          path += '/';
        }
        break;
      case false:
        if (path.slice(-1) === '/') {
          path = path.slice(0, -1);
        }
    }
    return path;
  };

  function Route(pattern1, controller, action, options) {
    this.pattern = pattern1;
    this.controller = controller;
    this.action = action;
    this.handler = bind(this.handler, this);
    this.parseOptionalPortion = bind(this.parseOptionalPortion, this);
    if (typeof this.pattern !== 'string') {
      throw new Error('Route: RegExps are not supported. Use strings with :names and `constraints` option of route');
    }
    this.options = _.extend({}, options);
    if (this.options.paramsInQS !== false) {
      this.options.paramsInQS = true;
    }
    if (this.options.name != null) {
      this.name = this.options.name;
    }
    if (this.name && this.name.indexOf('#') !== -1) {
      throw new Error('Route: "#" cannot be used in name');
    }
    if (this.name == null) {
      this.name = this.controller + '#' + this.action;
    }
    this.allParams = [];
    this.requiredParams = [];
    this.optionalParams = [];
    if (this.action in Controller.prototype) {
      throw new Error('Route: You should not use existing controller ' + 'properties as action names');
    }
    this.createRegExp();
    Object.freeze(this);
  }

  Route.prototype.matches = function(criteria) {
    var i, invalidParamsCount, len, name, propertiesCount, property, ref;
    if (typeof criteria === 'string') {
      return criteria === this.name;
    } else {
      propertiesCount = 0;
      ref = ['name', 'action', 'controller'];
      for (i = 0, len = ref.length; i < len; i++) {
        name = ref[i];
        propertiesCount++;
        property = criteria[name];
        if (property && property !== this[name]) {
          return false;
        }
      }
      invalidParamsCount = propertiesCount === 1 && (name === 'action' || name === 'controller');
      return !invalidParamsCount;
    }
  };

  Route.prototype.reverse = function(params, query) {
    var i, j, len, len1, name, raw, ref, ref1, remainingParams, url, value;
    params = this.normalizeParams(params);
    remainingParams = _.extend({}, params);
    if (params === false) {
      return false;
    }
    url = this.pattern;
    ref = this.requiredParams;
    for (i = 0, len = ref.length; i < len; i++) {
      name = ref[i];
      value = params[name];
      url = url.replace(RegExp("[:*]" + name, "g"), value);
      delete remainingParams[name];
    }
    ref1 = this.optionalParams;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      name = ref1[j];
      if (value = params[name]) {
        url = url.replace(RegExp("[:*]" + name, "g"), value);
        delete remainingParams[name];
      }
    }
    raw = url.replace(optionalRegExp, function(match, portion) {
      if (portion.match(/[:*]/g)) {
        return "";
      } else {
        return portion;
      }
    });
    url = processTrailingSlash(raw, this.options.trailing);
    if (typeof query !== 'object') {
      query = utils.queryParams.parse(query);
    }
    if (this.options.paramsInQS !== false) {
      _.extend(query, remainingParams);
    }
    if (!utils.isEmpty(query)) {
      url += '?' + utils.queryParams.stringify(query);
    }
    return url;
  };

  Route.prototype.normalizeParams = function(params) {
    var i, paramIndex, paramName, paramsHash, ref, routeParams;
    if (Array.isArray(params)) {
      if (params.length < this.requiredParams.length) {
        return false;
      }
      paramsHash = {};
      routeParams = this.requiredParams.concat(this.optionalParams);
      for (paramIndex = i = 0, ref = params.length - 1; i <= ref; paramIndex = i += 1) {
        paramName = routeParams[paramIndex];
        paramsHash[paramName] = params[paramIndex];
      }
      if (!this.testConstraints(paramsHash)) {
        return false;
      }
      params = paramsHash;
    } else {
      if (params == null) {
        params = {};
      }
      if (!this.testParams(params)) {
        return false;
      }
    }
    return params;
  };

  Route.prototype.testConstraints = function(params) {
    var constraints;
    constraints = this.options.constraints;
    return Object.keys(constraints || {}).every(function(key) {
      return constraints[key].test(params[key]);
    });
  };

  Route.prototype.testParams = function(params) {
    var i, len, paramName, ref;
    ref = this.requiredParams;
    for (i = 0, len = ref.length; i < len; i++) {
      paramName = ref[i];
      if (params[paramName] === void 0) {
        return false;
      }
    }
    return this.testConstraints(params);
  };

  Route.prototype.createRegExp = function() {
    var pattern;
    pattern = this.pattern;
    pattern = pattern.replace(escapeRegExp, '\\$&');
    this.replaceParams(pattern, (function(_this) {
      return function(match, param) {
        return _this.allParams.push(param);
      };
    })(this));
    pattern = pattern.replace(optionalRegExp, this.parseOptionalPortion);
    pattern = this.replaceParams(pattern, (function(_this) {
      return function(match, param) {
        _this.requiredParams.push(param);
        return _this.paramCapturePattern(match);
      };
    })(this));
    return this.regExp = RegExp("^" + pattern + "(?=\\/*(?=\\?|$))");
  };

  Route.prototype.parseOptionalPortion = function(match, optionalPortion) {
    var portion;
    portion = this.replaceParams(optionalPortion, (function(_this) {
      return function(match, param) {
        _this.optionalParams.push(param);
        return _this.paramCapturePattern(match);
      };
    })(this));
    return "(?:" + portion + ")?";
  };

  Route.prototype.replaceParams = function(s, callback) {
    return s.replace(paramRegExp, callback);
  };

  Route.prototype.paramCapturePattern = function(param) {
    if (param[0] === ':') {
      return '([^\/\?]+)';
    } else {
      return '(.*?)';
    }
  };

  Route.prototype.test = function(path) {
    var constraints, matched;
    matched = this.regExp.test(path);
    if (!matched) {
      return false;
    }
    constraints = this.options.constraints;
    if (constraints) {
      return this.testConstraints(this.extractParams(path));
    }
    return true;
  };

  Route.prototype.handler = function(pathParams, options) {
    var actionParams, params, path, query, ref, route;
    options = _.extend({}, options);
    if (pathParams && typeof pathParams === 'object') {
      query = utils.queryParams.stringify(options.query);
      params = pathParams;
      path = this.reverse(params);
    } else {
      ref = pathParams.split('?'), path = ref[0], query = ref[1];
      if (query == null) {
        query = '';
      } else {
        options.query = utils.queryParams.parse(query);
      }
      params = this.extractParams(path);
      path = processTrailingSlash(path, this.options.trailing);
    }
    actionParams = _.extend({}, params, this.options.params);
    route = {
      path: path,
      action: this.action,
      controller: this.controller,
      name: this.name,
      query: query
    };
    return this.publishEvent('router:match', route, actionParams, options);
  };

  Route.prototype.extractParams = function(path) {
    var i, index, len, match, matches, paramName, params, ref;
    params = {};
    matches = this.regExp.exec(path);
    ref = matches.slice(1);
    for (index = i = 0, len = ref.length; i < len; index = ++i) {
      match = ref[index];
      paramName = this.allParams.length ? this.allParams[index] : index;
      params[paramName] = match;
    }
    return params;
  };

  return Route;

})();


},{"../controllers/controller":4,"./event_broker":7,"./utils":13,"backbone":"backbone","underscore":"underscore"}],10:[function(require,module,exports){
'use strict';
var Backbone, EventBroker, History, Route, Router, _, mediator, utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

_ = require('underscore');

Backbone = require('backbone');

EventBroker = require('./event_broker');

History = require('./history');

Route = require('./route');

utils = require('./utils');

mediator = require('../mediator');

module.exports = Router = (function() {
  Router.extend = Backbone.Model.extend;

  _.extend(Router.prototype, EventBroker);

  function Router(options1) {
    var isWebFile;
    this.options = options1 != null ? options1 : {};
    this.match = bind(this.match, this);
    isWebFile = window.location.protocol !== 'file:';
    _.defaults(this.options, {
      pushState: isWebFile,
      root: '/',
      trailing: false
    });
    this.removeRoot = new RegExp('^' + utils.escapeRegExp(this.options.root) + '(#)?');
    this.subscribeEvent('!router:route', this.oldEventError);
    this.subscribeEvent('!router:routeByName', this.oldEventError);
    this.subscribeEvent('!router:changeURL', this.oldURLEventError);
    this.subscribeEvent('dispatcher:dispatch', this.changeURL);
    mediator.setHandler('router:route', this.route, this);
    mediator.setHandler('router:reverse', this.reverse, this);
    this.createHistory();
  }

  Router.prototype.oldEventError = function() {
    throw new Error('!router:route and !router:routeByName events were removed. Use `Chaplin.utils.redirectTo`');
  };

  Router.prototype.oldURLEventError = function() {
    throw new Error('!router:changeURL event was removed.');
  };

  Router.prototype.createHistory = function() {
    return Backbone.history = new History();
  };

  Router.prototype.startHistory = function() {
    return Backbone.history.start(this.options);
  };

  Router.prototype.stopHistory = function() {
    if (Backbone.History.started) {
      return Backbone.history.stop();
    }
  };

  Router.prototype.findHandler = function(predicate) {
    var handler, i, len, ref;
    ref = Backbone.history.handlers;
    for (i = 0, len = ref.length; i < len; i++) {
      handler = ref[i];
      if (predicate(handler)) {
        return handler;
      }
    }
  };

  Router.prototype.match = function(pattern, target, options) {
    var action, controller, ref, ref1, route;
    if (options == null) {
      options = {};
    }
    if (arguments.length === 2 && target && typeof target === 'object') {
      ref = options = target, controller = ref.controller, action = ref.action;
      if (!(controller && action)) {
        throw new Error('Router#match must receive either target or ' + 'options.controller & options.action');
      }
    } else {
      controller = options.controller, action = options.action;
      if (controller || action) {
        throw new Error('Router#match cannot use both target and ' + 'options.controller / options.action');
      }
      ref1 = target.split('#'), controller = ref1[0], action = ref1[1];
    }
    _.defaults(options, {
      trailing: this.options.trailing
    });
    route = new Route(pattern, controller, action, options);
    Backbone.history.handlers.push({
      route: route,
      callback: route.handler
    });
    return route;
  };

  Router.prototype.route = function(pathDesc, params, options) {
    var handler, path, pathParams;
    if (pathDesc && typeof pathDesc === 'object') {
      path = pathDesc.url;
      if (!params && pathDesc.params) {
        params = pathDesc.params;
      }
    }
    params = Array.isArray(params) ? params.slice() : _.extend({}, params);
    if (path != null) {
      path = path.replace(this.removeRoot, '');
      handler = this.findHandler(function(handler) {
        return handler.route.test(path);
      });
      options = params;
      params = null;
    } else {
      options = _.extend({}, options);
      handler = this.findHandler(function(handler) {
        if (handler.route.matches(pathDesc)) {
          params = handler.route.normalizeParams(params);
          if (params) {
            return true;
          }
        }
        return false;
      });
    }
    if (handler) {
      _.defaults(options, {
        changeURL: true
      });
      pathParams = path != null ? path : params;
      handler.callback(pathParams, options);
      return true;
    } else {
      throw new Error('Router#route: request was not routed');
    }
  };

  Router.prototype.reverse = function(criteria, params, query) {
    var handler, handlers, i, len, reversed, root, url;
    root = this.options.root;
    if ((params != null) && typeof params !== 'object') {
      throw new TypeError('Router#reverse: params must be an array or an ' + 'object');
    }
    handlers = Backbone.history.handlers;
    for (i = 0, len = handlers.length; i < len; i++) {
      handler = handlers[i];
      if (!(handler.route.matches(criteria))) {
        continue;
      }
      reversed = handler.route.reverse(params, query);
      if (reversed !== false) {
        url = root ? root + reversed : reversed;
        return url;
      }
    }
    throw new Error('Router#reverse: invalid route criteria specified: ' + ("" + (JSON.stringify(criteria))));
  };

  Router.prototype.changeURL = function(controller, params, route, options) {
    var navigateOptions, url;
    if (!((route.path != null) && (options != null ? options.changeURL : void 0))) {
      return;
    }
    url = route.path + (route.query ? "?" + route.query : '');
    navigateOptions = {
      trigger: options.trigger === true,
      replace: options.replace === true
    };
    return Backbone.history.navigate(url, navigateOptions);
  };

  Router.prototype.disposed = false;

  Router.prototype.dispose = function() {
    if (this.disposed) {
      return;
    }
    this.stopHistory();
    delete Backbone.history;
    this.unsubscribeAllEvents();
    mediator.removeHandlers(this);
    this.disposed = true;
    return Object.freeze(this);
  };

  return Router;

})();


},{"../mediator":14,"./event_broker":7,"./history":8,"./route":9,"./utils":13,"backbone":"backbone","underscore":"underscore"}],11:[function(require,module,exports){
'use strict';
module.exports = {
  propertyDescriptors: true
};


},{}],12:[function(require,module,exports){
'use strict';
var STATE_CHANGE, SYNCED, SYNCING, SyncMachine, UNSYNCED, event, fn, i, len, ref;

UNSYNCED = 'unsynced';

SYNCING = 'syncing';

SYNCED = 'synced';

STATE_CHANGE = 'syncStateChange';

SyncMachine = {
  _syncState: UNSYNCED,
  _previousSyncState: null,
  syncState: function() {
    return this._syncState;
  },
  isUnsynced: function() {
    return this._syncState === UNSYNCED;
  },
  isSynced: function() {
    return this._syncState === SYNCED;
  },
  isSyncing: function() {
    return this._syncState === SYNCING;
  },
  unsync: function() {
    var ref;
    if ((ref = this._syncState) === SYNCING || ref === SYNCED) {
      this._previousSync = this._syncState;
      this._syncState = UNSYNCED;
      this.trigger(this._syncState, this, this._syncState);
      this.trigger(STATE_CHANGE, this, this._syncState);
    }
  },
  beginSync: function() {
    var ref;
    if ((ref = this._syncState) === UNSYNCED || ref === SYNCED) {
      this._previousSync = this._syncState;
      this._syncState = SYNCING;
      this.trigger(this._syncState, this, this._syncState);
      this.trigger(STATE_CHANGE, this, this._syncState);
    }
  },
  finishSync: function() {
    if (this._syncState === SYNCING) {
      this._previousSync = this._syncState;
      this._syncState = SYNCED;
      this.trigger(this._syncState, this, this._syncState);
      this.trigger(STATE_CHANGE, this, this._syncState);
    }
  },
  abortSync: function() {
    if (this._syncState === SYNCING) {
      this._syncState = this._previousSync;
      this._previousSync = this._syncState;
      this.trigger(this._syncState, this, this._syncState);
      this.trigger(STATE_CHANGE, this, this._syncState);
    }
  }
};

ref = [UNSYNCED, SYNCING, SYNCED, STATE_CHANGE];
fn = function(event) {
  return SyncMachine[event] = function(callback, context) {
    if (context == null) {
      context = this;
    }
    this.on(event, callback, context);
    if (this._syncState === event) {
      return callback.call(context);
    }
  };
};
for (i = 0, len = ref.length; i < len; i++) {
  event = ref[i];
  fn(event);
}

Object.freeze(SyncMachine);

module.exports = SyncMachine;


},{}],13:[function(require,module,exports){
'use strict';
var utils,
  slice = [].slice,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

utils = {
  isEmpty: function(object) {
    return !Object.getOwnPropertyNames(object).length;
  },
  serialize: function(data) {
    if (typeof data.serialize === 'function') {
      return data.serialize();
    } else if (typeof data.toJSON === 'function') {
      return data.toJSON();
    } else {
      throw new TypeError('utils.serialize: Unknown data was passed');
    }
  },
  readonly: function() {
    var i, key, keys, len, object;
    object = arguments[0], keys = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    for (i = 0, len = keys.length; i < len; i++) {
      key = keys[i];
      Object.defineProperty(object, key, {
        value: object[key],
        writable: false,
        configurable: false
      });
    }
    return true;
  },
  getPrototypeChain: function(object) {
    var chain;
    chain = [];
    while (object = Object.getPrototypeOf(object)) {
      chain.unshift(object);
    }
    return chain;
  },
  getAllPropertyVersions: function(object, key) {
    var i, len, proto, ref, result, value;
    result = [];
    ref = utils.getPrototypeChain(object);
    for (i = 0, len = ref.length; i < len; i++) {
      proto = ref[i];
      value = proto[key];
      if (value && indexOf.call(result, value) < 0) {
        result.push(value);
      }
    }
    return result;
  },
  upcase: function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  escapeRegExp: function(str) {
    return String(str || '').replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
  },
  modifierKeyPressed: function(event) {
    return event.shiftKey || event.altKey || event.ctrlKey || event.metaKey;
  },
  reverse: function(criteria, params, query) {
    return require('../mediator').execute('router:reverse', criteria, params, query);
  },
  redirectTo: function(pathDesc, params, options) {
    return require('../mediator').execute('router:route', pathDesc, params, options);
  },
  loadModule: (function() {
    return function(moduleName, handler) {
      return require.ensure([moduleName], function() {
        return handler(require(moduleName));
      });
    };
  })(),
  matchesSelector: (function() {
    var el, matches;
    el = document.documentElement;
    matches = el.matches || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector;
    return function() {
      return matches.call.apply(matches, arguments);
    };
  })(),
  querystring: {
    stringify: function(params, replacer) {
      if (params == null) {
        params = {};
      }
      if (typeof replacer !== 'function') {
        replacer = function(key, value) {
          if (Array.isArray(value)) {
            return value.map(function(value) {
              return {
                key: key,
                value: value
              };
            });
          } else if (value != null) {
            return {
              key: key,
              value: value
            };
          }
        };
      }
      return Object.keys(params).reduce(function(pairs, key) {
        var pair;
        pair = replacer(key, params[key]);
        return pairs.concat(pair || []);
      }, []).map(function(arg) {
        var key, value;
        key = arg.key, value = arg.value;
        return [key, value].map(encodeURIComponent).join('=');
      }).join('&');
    },
    parse: function(string, reviver) {
      if (string == null) {
        string = '';
      }
      if (typeof reviver !== 'function') {
        reviver = function(key, value) {
          return {
            key: key,
            value: value
          };
        };
      }
      string = string.slice(1 + string.indexOf('?'));
      return string.split('&').reduce(function(params, pair) {
        var key, parts, ref, value;
        parts = pair.split('=').map(decodeURIComponent);
        ref = reviver.apply(null, parts) || {}, key = ref.key, value = ref.value;
        if (value != null) {
          params[key] = params.hasOwnProperty(key) ? [].concat(params[key], value) : value;
        }
        return params;
      }, {});
    }
  }
};

utils.beget = Object.create;

utils.indexOf = function(array, item) {
  return array.indexOf(item);
};

utils.isArray = Array.isArray;

utils.queryParams = utils.querystring;

Object.seal(utils);

module.exports = utils;


},{"../mediator":14}],14:[function(require,module,exports){
'use strict';
var Backbone, handlers, mediator, utils,
  slice = [].slice;

Backbone = require('backbone');

utils = require('./lib/utils');

mediator = {};

mediator.subscribe = mediator.on = Backbone.Events.on;

mediator.subscribeOnce = mediator.once = Backbone.Events.once;

mediator.unsubscribe = mediator.off = Backbone.Events.off;

mediator.publish = mediator.trigger = Backbone.Events.trigger;

mediator._callbacks = null;

handlers = mediator._handlers = {};

mediator.setHandler = function(name, method, instance) {
  return handlers[name] = {
    instance: instance,
    method: method
  };
};

mediator.execute = function() {
  var args, handler, name, options, silent;
  options = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  if (options && typeof options === 'object') {
    name = options.name, silent = options.silent;
  } else {
    name = options;
  }
  handler = handlers[name];
  if (handler) {
    return handler.method.apply(handler.instance, args);
  } else if (!silent) {
    throw new Error("mediator.execute: " + name + " handler is not defined");
  }
};

mediator.removeHandlers = function(instanceOrNames) {
  var handler, i, len, name;
  if (!instanceOrNames) {
    mediator._handlers = {};
  }
  if (Array.isArray(instanceOrNames)) {
    for (i = 0, len = instanceOrNames.length; i < len; i++) {
      name = instanceOrNames[i];
      delete handlers[name];
    }
  } else {
    for (name in handlers) {
      handler = handlers[name];
      if (handler.instance === instanceOrNames) {
        delete handlers[name];
      }
    }
  }
};

mediator.seal = function() {
  return Object.seal(mediator);
};

utils.readonly(mediator, 'subscribe', 'subscribeOnce', 'unsubscribe', 'publish', 'setHandler', 'execute', 'removeHandlers', 'seal');

module.exports = mediator;


},{"./lib/utils":13,"backbone":"backbone"}],15:[function(require,module,exports){
'use strict';
var Backbone, Collection, EventBroker, Model, _, utils,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require('underscore');

Backbone = require('backbone');

Model = require('./model');

EventBroker = require('../lib/event_broker');

utils = require('../lib/utils');

module.exports = Collection = (function(superClass) {
  extend(Collection, superClass);

  function Collection() {
    return Collection.__super__.constructor.apply(this, arguments);
  }

  _.extend(Collection.prototype, EventBroker);

  Collection.prototype.model = Model;

  Collection.prototype.serialize = function() {
    return this.map(utils.serialize);
  };

  Collection.prototype.disposed = false;

  Collection.prototype.dispose = function() {
    var i, len, prop, ref;
    if (this.disposed) {
      return;
    }
    this.trigger('dispose', this);
    this.reset([], {
      silent: true
    });
    this.unsubscribeAllEvents();
    this.stopListening();
    this.off();
    ref = ['model', 'models', '_byCid', '_callbacks'];
    for (i = 0, len = ref.length; i < len; i++) {
      prop = ref[i];
      delete this[prop];
    }
    this._byId = {};
    this.disposed = true;
    return Object.freeze(this);
  };

  return Collection;

})(Backbone.Collection);


},{"../lib/event_broker":7,"../lib/utils":13,"./model":16,"backbone":"backbone","underscore":"underscore"}],16:[function(require,module,exports){
'use strict';
var Backbone, EventBroker, Model, _, serializeAttributes, serializeModelAttributes,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require('underscore');

Backbone = require('backbone');

EventBroker = require('../lib/event_broker');

serializeAttributes = function(model, attributes, modelStack) {
  var delegator, i, key, len, otherModel, ref, serializedModels, value;
  delegator = Object.create(attributes);
  if (modelStack == null) {
    modelStack = {};
  }
  modelStack[model.cid] = true;
  for (key in attributes) {
    value = attributes[key];
    if (value instanceof Backbone.Model) {
      delegator[key] = serializeModelAttributes(value, model, modelStack);
    } else if (value instanceof Backbone.Collection) {
      serializedModels = [];
      ref = value.models;
      for (i = 0, len = ref.length; i < len; i++) {
        otherModel = ref[i];
        serializedModels.push(serializeModelAttributes(otherModel, model, modelStack));
      }
      delegator[key] = serializedModels;
    }
  }
  delete modelStack[model.cid];
  return delegator;
};

serializeModelAttributes = function(model, currentModel, modelStack) {
  var attributes;
  if (model === currentModel || model.cid in modelStack) {
    return null;
  }
  attributes = typeof model.getAttributes === 'function' ? model.getAttributes() : model.attributes;
  return serializeAttributes(model, attributes, modelStack);
};

module.exports = Model = (function(superClass) {
  extend(Model, superClass);

  function Model() {
    return Model.__super__.constructor.apply(this, arguments);
  }

  _.extend(Model.prototype, EventBroker);

  Model.prototype.getAttributes = function() {
    return this.attributes;
  };

  Model.prototype.serialize = function() {
    return serializeAttributes(this, this.getAttributes());
  };

  Model.prototype.disposed = false;

  Model.prototype.dispose = function() {
    var i, len, prop, ref, ref1;
    if (this.disposed) {
      return;
    }
    this.trigger('dispose', this);
    if ((ref = this.collection) != null) {
      if (typeof ref.remove === "function") {
        ref.remove(this, {
          silent: true
        });
      }
    }
    this.unsubscribeAllEvents();
    this.stopListening();
    this.off();
    ref1 = ['collection', 'attributes', 'changed', 'defaults', '_escapedAttributes', '_previousAttributes', '_silent', '_pending', '_callbacks'];
    for (i = 0, len = ref1.length; i < len; i++) {
      prop = ref1[i];
      delete this[prop];
    }
    this.disposed = true;
    return Object.freeze(this);
  };

  return Model;

})(Backbone.Model);


},{"../lib/event_broker":7,"backbone":"backbone","underscore":"underscore"}],17:[function(require,module,exports){
'use strict';
var $, Backbone, CollectionView, View, addClass, endAnimation, filterChildren, insertView, startAnimation, toggleElement, utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Backbone = require('backbone');

View = require('./view');

utils = require('../lib/utils');

$ = Backbone.$;

filterChildren = function(nodeList, selector) {
  var i, len, node, results;
  if (!selector) {
    return nodeList;
  }
  results = [];
  for (i = 0, len = nodeList.length; i < len; i++) {
    node = nodeList[i];
    if (utils.matchesSelector(node, selector)) {
      results.push(node);
    }
  }
  return results;
};

toggleElement = (function() {
  if ($) {
    return function(elem, visible) {
      return elem.toggle(visible);
    };
  } else {
    return function(elem, visible) {
      return elem.style.display = (visible ? '' : 'none');
    };
  }
})();

addClass = (function() {
  if ($) {
    return function(elem, cls) {
      return elem.addClass(cls);
    };
  } else {
    return function(elem, cls) {
      return elem.classList.add(cls);
    };
  }
})();

startAnimation = (function() {
  if ($) {
    return function(elem, useCssAnimation, cls) {
      if (useCssAnimation) {
        return addClass(elem, cls);
      } else {
        return elem.css('opacity', 0);
      }
    };
  } else {
    return function(elem, useCssAnimation, cls) {
      if (useCssAnimation) {
        return addClass(elem, cls);
      } else {
        return elem.style.opacity = 0;
      }
    };
  }
})();

endAnimation = (function() {
  if ($) {
    return function(elem, duration) {
      return elem.animate({
        opacity: 1
      }, duration);
    };
  } else {
    return function(elem, duration) {
      elem.style.transition = "opacity " + duration + "ms";
      return elem.style.opacity = 1;
    };
  }
})();

insertView = (function() {
  if ($) {
    return function(list, viewEl, position, length, itemSelector) {
      var children, childrenLength, insertInMiddle, isEnd, method;
      insertInMiddle = (0 < position && position < length);
      isEnd = function(length) {
        return length === 0 || position >= length;
      };
      if (insertInMiddle || itemSelector) {
        children = list.children(itemSelector);
        childrenLength = children.length;
        if (children[position] !== viewEl) {
          if (isEnd(childrenLength)) {
            return list.append(viewEl);
          } else {
            if (position === 0) {
              return children.eq(position).before(viewEl);
            } else {
              return children.eq(position - 1).after(viewEl);
            }
          }
        }
      } else {
        method = isEnd(length) ? 'append' : 'prepend';
        return list[method](viewEl);
      }
    };
  } else {
    return function(list, viewEl, position, length, itemSelector) {
      var children, childrenLength, insertInMiddle, isEnd, last;
      insertInMiddle = (0 < position && position < length);
      isEnd = function(length) {
        return length === 0 || position === length;
      };
      if (insertInMiddle || itemSelector) {
        children = filterChildren(list.children, itemSelector);
        childrenLength = children.length;
        if (children[position] !== viewEl) {
          if (isEnd(childrenLength)) {
            return list.appendChild(viewEl);
          } else if (position === 0) {
            return list.insertBefore(viewEl, children[position]);
          } else {
            last = children[position - 1];
            if (list.lastChild === last) {
              return list.appendChild(viewEl);
            } else {
              return list.insertBefore(viewEl, last.nextElementSibling);
            }
          }
        }
      } else if (isEnd(length)) {
        return list.appendChild(viewEl);
      } else {
        return list.insertBefore(viewEl, list.firstChild);
      }
    };
  }
})();

module.exports = CollectionView = (function(superClass) {
  extend(CollectionView, superClass);

  CollectionView.prototype.itemView = null;

  CollectionView.prototype.autoRender = true;

  CollectionView.prototype.renderItems = true;

  CollectionView.prototype.animationDuration = 500;

  CollectionView.prototype.useCssAnimation = false;

  CollectionView.prototype.animationStartClass = 'animated-item-view';

  CollectionView.prototype.animationEndClass = 'animated-item-view-end';

  CollectionView.prototype.listSelector = null;

  CollectionView.prototype.$list = null;

  CollectionView.prototype.fallbackSelector = null;

  CollectionView.prototype.$fallback = null;

  CollectionView.prototype.loadingSelector = null;

  CollectionView.prototype.$loading = null;

  CollectionView.prototype.itemSelector = null;

  CollectionView.prototype.filterer = null;

  CollectionView.prototype.filterCallback = function(view, included) {
    if ($) {
      view.$el.stop(true, true);
    }
    return toggleElement(($ ? view.$el : view.el), included);
  };

  CollectionView.prototype.visibleItems = null;

  CollectionView.prototype.optionNames = View.prototype.optionNames.concat(['renderItems', 'itemView']);

  function CollectionView(options) {
    this.renderAllItems = bind(this.renderAllItems, this);
    this.toggleFallback = bind(this.toggleFallback, this);
    this.itemsReset = bind(this.itemsReset, this);
    this.itemRemoved = bind(this.itemRemoved, this);
    this.itemAdded = bind(this.itemAdded, this);
    this.visibleItems = [];
    CollectionView.__super__.constructor.apply(this, arguments);
  }

  CollectionView.prototype.initialize = function(options) {
    if (options == null) {
      options = {};
    }
    this.addCollectionListeners();
    if (options.filterer != null) {
      return this.filter(options.filterer);
    }
  };

  CollectionView.prototype.addCollectionListeners = function() {
    this.listenTo(this.collection, 'add', this.itemAdded);
    this.listenTo(this.collection, 'remove', this.itemRemoved);
    return this.listenTo(this.collection, 'reset sort', this.itemsReset);
  };

  CollectionView.prototype.getTemplateData = function() {
    var templateData;
    templateData = {
      length: this.collection.length
    };
    if (typeof this.collection.isSynced === 'function') {
      templateData.synced = this.collection.isSynced();
    }
    return templateData;
  };

  CollectionView.prototype.getTemplateFunction = function() {};

  CollectionView.prototype.render = function() {
    var listSelector;
    CollectionView.__super__.render.apply(this, arguments);
    listSelector = typeof this.listSelector === 'function' ? this.listSelector() : this.listSelector;
    if ($) {
      this.$list = listSelector ? this.find(listSelector) : this.$el;
    } else {
      this.list = listSelector ? this.find(this.listSelector) : this.el;
    }
    this.initFallback();
    this.initLoadingIndicator();
    if (this.renderItems) {
      return this.renderAllItems();
    }
  };

  CollectionView.prototype.itemAdded = function(item, collection, options) {
    return this.insertView(item, this.renderItem(item), options.at);
  };

  CollectionView.prototype.itemRemoved = function(item) {
    return this.removeViewForItem(item);
  };

  CollectionView.prototype.itemsReset = function() {
    return this.renderAllItems();
  };

  CollectionView.prototype.initFallback = function() {
    if (!this.fallbackSelector) {
      return;
    }
    if ($) {
      this.$fallback = this.find(this.fallbackSelector);
    } else {
      this.fallback = this.find(this.fallbackSelector);
    }
    this.on('visibilityChange', this.toggleFallback);
    this.listenTo(this.collection, 'syncStateChange', this.toggleFallback);
    return this.toggleFallback();
  };

  CollectionView.prototype.toggleFallback = function() {
    var visible;
    visible = this.visibleItems.length === 0 && (typeof this.collection.isSynced === 'function' ? this.collection.isSynced() : true);
    return toggleElement(($ ? this.$fallback : this.fallback), visible);
  };

  CollectionView.prototype.initLoadingIndicator = function() {
    if (!(this.loadingSelector && typeof this.collection.isSyncing === 'function')) {
      return;
    }
    if ($) {
      this.$loading = this.find(this.loadingSelector);
    } else {
      this.loading = this.find(this.loadingSelector);
    }
    this.listenTo(this.collection, 'syncStateChange', this.toggleLoadingIndicator);
    return this.toggleLoadingIndicator();
  };

  CollectionView.prototype.toggleLoadingIndicator = function() {
    var visible;
    visible = this.collection.length === 0 && this.collection.isSyncing();
    return toggleElement(($ ? this.$loading : this.loading), visible);
  };

  CollectionView.prototype.getItemViews = function() {
    var i, itemViews, key, len, ref;
    itemViews = {};
    ref = Object.keys(this.subviewsByName);
    for (i = 0, len = ref.length; i < len; i++) {
      key = ref[i];
      if (!key.indexOf('itemView:')) {
        itemViews[key.slice(9)] = this.subviewsByName[key];
      }
    }
    return itemViews;
  };

  CollectionView.prototype.filter = function(filterer, filterCallback) {
    var hasItemViews, i, included, index, item, len, ref, view;
    if (typeof filterer === 'function' || filterer === null) {
      this.filterer = filterer;
    }
    if (typeof filterCallback === 'function' || filterCallback === null) {
      this.filterCallback = filterCallback;
    }
    hasItemViews = Object.keys(this.subviewsByName).some(function(key) {
      return 0 === key.indexOf('itemView:');
    });
    if (hasItemViews) {
      ref = this.collection.models;
      for (index = i = 0, len = ref.length; i < len; index = ++i) {
        item = ref[index];
        included = typeof this.filterer === 'function' ? this.filterer(item, index) : true;
        view = this.subview("itemView:" + item.cid);
        if (!view) {
          throw new Error('CollectionView#filter: ' + ("no view found for " + item.cid));
        }
        this.filterCallback(view, included);
        this.updateVisibleItems(view.model, included, false);
      }
    }
    return this.trigger('visibilityChange', this.visibleItems);
  };

  CollectionView.prototype.renderAllItems = function() {
    var cid, i, index, item, items, j, k, len, len1, len2, ref, remainingViewsByCid, view;
    items = this.collection.models;
    this.visibleItems.length = 0;
    remainingViewsByCid = {};
    for (i = 0, len = items.length; i < len; i++) {
      item = items[i];
      view = this.subview("itemView:" + item.cid);
      if (view) {
        remainingViewsByCid[item.cid] = view;
      }
    }
    ref = Object.keys(this.getItemViews());
    for (j = 0, len1 = ref.length; j < len1; j++) {
      cid = ref[j];
      if (!(cid in remainingViewsByCid)) {
        this.removeSubview("itemView:" + cid);
      }
    }
    for (index = k = 0, len2 = items.length; k < len2; index = ++k) {
      item = items[index];
      view = this.subview("itemView:" + item.cid);
      if (view) {
        this.insertView(item, view, index, false);
      } else {
        this.insertView(item, this.renderItem(item), index);
      }
    }
    if (items.length === 0) {
      return this.trigger('visibilityChange', this.visibleItems);
    }
  };

  CollectionView.prototype.renderItem = function(item) {
    var view;
    view = this.subview("itemView:" + item.cid);
    if (!view) {
      view = this.initItemView(item);
      this.subview("itemView:" + item.cid, view);
    }
    view.render();
    return view;
  };

  CollectionView.prototype.initItemView = function(model) {
    if (this.itemView) {
      return new this.itemView({
        autoRender: false,
        model: model
      });
    } else {
      throw new Error('The CollectionView#itemView property ' + 'must be defined or the initItemView() must be overridden.');
    }
  };

  CollectionView.prototype.insertView = function(item, view, position, enableAnimation) {
    var elem, included, length, list;
    if (enableAnimation == null) {
      enableAnimation = true;
    }
    if (this.animationDuration === 0) {
      enableAnimation = false;
    }
    if (typeof position !== 'number') {
      position = this.collection.indexOf(item);
    }
    included = typeof this.filterer === 'function' ? this.filterer(item, position) : true;
    elem = $ ? view.$el : view.el;
    if (included && enableAnimation) {
      startAnimation(elem, this.useCssAnimation, this.animationStartClass);
    }
    if (this.filterer) {
      this.filterCallback(view, included);
    }
    length = this.collection.length;
    list = $ ? this.$list : this.list;
    if (included) {
      insertView(list, elem, position, length, this.itemSelector);
      view.trigger('addedToParent');
    }
    this.updateVisibleItems(item, included);
    if (included && enableAnimation) {
      if (this.useCssAnimation) {
        setTimeout((function(_this) {
          return function() {
            return addClass(elem, _this.animationEndClass);
          };
        })(this));
      } else {
        endAnimation(elem, this.animationDuration);
      }
    }
    return view;
  };

  CollectionView.prototype.removeViewForItem = function(item) {
    this.updateVisibleItems(item, false);
    return this.removeSubview("itemView:" + item.cid);
  };

  CollectionView.prototype.updateVisibleItems = function(item, includedInFilter, triggerEvent) {
    var includedInVisibleItems, visibilityChanged, visibleItemsIndex;
    if (triggerEvent == null) {
      triggerEvent = true;
    }
    visibilityChanged = false;
    visibleItemsIndex = this.visibleItems.indexOf(item);
    includedInVisibleItems = visibleItemsIndex !== -1;
    if (includedInFilter && !includedInVisibleItems) {
      this.visibleItems.push(item);
      visibilityChanged = true;
    } else if (!includedInFilter && includedInVisibleItems) {
      this.visibleItems.splice(visibleItemsIndex, 1);
      visibilityChanged = true;
    }
    if (visibilityChanged && triggerEvent) {
      this.trigger('visibilityChange', this.visibleItems);
    }
    return visibilityChanged;
  };

  CollectionView.prototype.dispose = function() {
    var i, len, prop, ref;
    if (this.disposed) {
      return;
    }
    ref = ['$list', '$fallback', '$loading', 'visibleItems'];
    for (i = 0, len = ref.length; i < len; i++) {
      prop = ref[i];
      delete this[prop];
    }
    return CollectionView.__super__.dispose.apply(this, arguments);
  };

  return CollectionView;

})(View);


},{"../lib/utils":13,"./view":19,"backbone":"backbone"}],18:[function(require,module,exports){
'use strict';
var $, Backbone, EventBroker, Layout, View, _, mediator, utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require('underscore');

Backbone = require('backbone');

View = require('./view');

EventBroker = require('../lib/event_broker');

utils = require('../lib/utils');

mediator = require('../mediator');

$ = Backbone.$;

module.exports = Layout = (function(superClass) {
  extend(Layout, superClass);

  Layout.prototype.el = 'body';

  Layout.prototype.keepElement = true;

  Layout.prototype.title = '';

  Layout.prototype.globalRegions = null;

  Layout.prototype.listen = {
    'beforeControllerDispose mediator': 'scroll'
  };

  function Layout(options) {
    if (options == null) {
      options = {};
    }
    this.openLink = bind(this.openLink, this);
    this.globalRegions = [];
    this.title = options.title;
    if (options.regions) {
      this.regions = options.regions;
    }
    this.settings = _.defaults(options, {
      titleTemplate: function(data) {
        var st;
        st = data.subtitle ? data.subtitle + " \u2013 " : '';
        return st + data.title;
      },
      openExternalToBlank: false,
      routeLinks: 'a, .go-to',
      skipRouting: '.noscript',
      scrollTo: [0, 0]
    });
    mediator.setHandler('region:show', this.showRegion, this);
    mediator.setHandler('region:register', this.registerRegionHandler, this);
    mediator.setHandler('region:unregister', this.unregisterRegionHandler, this);
    mediator.setHandler('region:find', this.regionByName, this);
    mediator.setHandler('adjustTitle', this.adjustTitle, this);
    Layout.__super__.constructor.apply(this, arguments);
    if (this.settings.routeLinks) {
      this.startLinkRouting();
    }
  }

  Layout.prototype.scroll = function() {
    var to, x, y;
    to = this.settings.scrollTo;
    if (to && typeof to === 'object') {
      x = to[0], y = to[1];
      return window.scrollTo(x, y);
    }
  };

  Layout.prototype.adjustTitle = function(subtitle) {
    var title;
    if (subtitle == null) {
      subtitle = '';
    }
    title = this.settings.titleTemplate({
      title: this.title,
      subtitle: subtitle
    });
    document.title = title;
    this.publishEvent('adjustTitle', subtitle, title);
    return title;
  };

  Layout.prototype.startLinkRouting = function() {
    var route;
    route = this.settings.routeLinks;
    if (route) {
      return this.delegate('click', route, this.openLink);
    }
  };

  Layout.prototype.stopLinkRouting = function() {
    var route;
    route = this.settings.routeLinks;
    if (route) {
      return this.undelegate('click', route);
    }
  };

  Layout.prototype.isExternalLink = function(link) {
    var host, protocol, target;
    if (!utils.matchesSelector(link, 'a, area')) {
      return false;
    }
    if (link.hasAttribute('download')) {
      return true;
    }
    if (!link.host) {
      link.href += '';
    }
    protocol = location.protocol, host = location.host;
    target = link.target;
    return target === '_blank' || link.rel === 'external' || link.protocol !== protocol || link.host !== host || (target === '_parent' && parent !== self) || (target === '_top' && top !== self);
  };

  Layout.prototype.openLink = function(event) {
    var el, href, skipRouting;
    if (utils.modifierKeyPressed(event)) {
      return;
    }
    el = $ ? event.currentTarget : event.delegateTarget;
    href = el.getAttribute('href') || el.getAttribute('data-href');
    if (!href || href[0] === '#') {
      return;
    }
    skipRouting = this.settings.skipRouting;
    switch (typeof skipRouting) {
      case 'function':
        if (!skipRouting(href, el)) {
          return;
        }
        break;
      case 'string':
        if (utils.matchesSelector(el, skipRouting)) {
          return;
        }
    }
    if (this.isExternalLink(el)) {
      if (this.settings.openExternalToBlank) {
        event.preventDefault();
        this.openWindow(href);
      }
      return;
    }
    utils.redirectTo({
      url: href
    });
    return event.preventDefault();
  };

  Layout.prototype.openWindow = function(href) {
    return window.open(href);
  };

  Layout.prototype.registerRegionHandler = function(instance, name, selector) {
    if (name != null) {
      return this.registerGlobalRegion(instance, name, selector);
    } else {
      return this.registerGlobalRegions(instance);
    }
  };

  Layout.prototype.registerGlobalRegion = function(instance, name, selector) {
    this.unregisterGlobalRegion(instance, name);
    return this.globalRegions.unshift({
      instance: instance,
      name: name,
      selector: selector
    });
  };

  Layout.prototype.registerGlobalRegions = function(instance) {
    var i, len, name, ref, selector, version;
    ref = utils.getAllPropertyVersions(instance, 'regions');
    for (i = 0, len = ref.length; i < len; i++) {
      version = ref[i];
      for (name in version) {
        selector = version[name];
        this.registerGlobalRegion(instance, name, selector);
      }
    }
  };

  Layout.prototype.unregisterRegionHandler = function(instance, name) {
    if (name != null) {
      return this.unregisterGlobalRegion(instance, name);
    } else {
      return this.unregisterGlobalRegions(instance);
    }
  };

  Layout.prototype.unregisterGlobalRegion = function(instance, name) {
    var cid, region;
    cid = instance.cid;
    return this.globalRegions = (function() {
      var i, len, ref, results;
      ref = this.globalRegions;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        region = ref[i];
        if (region.instance.cid !== cid || region.name !== name) {
          results.push(region);
        }
      }
      return results;
    }).call(this);
  };

  Layout.prototype.unregisterGlobalRegions = function(instance) {
    var region;
    return this.globalRegions = (function() {
      var i, len, ref, results;
      ref = this.globalRegions;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        region = ref[i];
        if (region.instance.cid !== instance.cid) {
          results.push(region);
        }
      }
      return results;
    }).call(this);
  };

  Layout.prototype.regionByName = function(name) {
    var i, len, ref, reg;
    ref = this.globalRegions;
    for (i = 0, len = ref.length; i < len; i++) {
      reg = ref[i];
      if (reg.name === name && !reg.instance.stale) {
        return reg;
      }
    }
  };

  Layout.prototype.showRegion = function(name, instance) {
    var region;
    region = this.regionByName(name);
    if (!region) {
      throw new Error("No region registered under " + name);
    }
    return instance.container = region.selector === '' ? $ ? region.instance.$el : region.instance.el : region.instance.noWrap ? region.instance.container.find(region.selector) : region.instance.find(region.selector);
  };

  Layout.prototype.dispose = function() {
    var i, len, prop, ref;
    if (this.disposed) {
      return;
    }
    this.stopLinkRouting();
    ref = ['globalRegions', 'title', 'route'];
    for (i = 0, len = ref.length; i < len; i++) {
      prop = ref[i];
      delete this[prop];
    }
    mediator.removeHandlers(this);
    return Layout.__super__.dispose.apply(this, arguments);
  };

  return Layout;

})(View);


},{"../lib/event_broker":7,"../lib/utils":13,"../mediator":14,"./view":19,"backbone":"backbone","underscore":"underscore"}],19:[function(require,module,exports){
'use strict';
var $, Backbone, EventBroker, View, _, attach, mediator, setHTML, utils,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require('underscore');

Backbone = require('backbone');

EventBroker = require('../lib/event_broker');

utils = require('../lib/utils');

mediator = require('../mediator');

$ = Backbone.$;

setHTML = (function() {
  if ($) {
    return function(view, html) {
      view.$el.html(html);
      return html;
    };
  } else {
    return function(view, html) {
      return view.el.innerHTML = html;
    };
  }
})();

attach = (function() {
  if ($) {
    return function(view) {
      var actual;
      actual = $(view.container);
      if (typeof view.containerMethod === 'function') {
        return view.containerMethod(actual, view.el);
      } else {
        return actual[view.containerMethod](view.el);
      }
    };
  } else {
    return function(view) {
      var actual;
      actual = typeof view.container === 'string' ? document.querySelector(view.container) : view.container;
      if (typeof view.containerMethod === 'function') {
        return view.containerMethod(actual, view.el);
      } else {
        return actual[view.containerMethod](view.el);
      }
    };
  }
})();

module.exports = View = (function(superClass) {
  extend(View, superClass);

  _.extend(View.prototype, EventBroker);

  View.prototype.autoRender = false;

  View.prototype.autoAttach = true;

  View.prototype.container = null;

  View.prototype.containerMethod = $ ? 'append' : 'appendChild';

  View.prototype.regions = null;

  View.prototype.region = null;

  View.prototype.stale = false;

  View.prototype.noWrap = false;

  View.prototype.keepElement = false;

  View.prototype.subviews = null;

  View.prototype.subviewsByName = null;

  View.prototype.optionNames = ['autoAttach', 'autoRender', 'container', 'containerMethod', 'region', 'regions', 'noWrap'];

  function View(options) {
    var i, key, len, ref, region, render;
    if (options == null) {
      options = {};
    }
    ref = Object.keys(options);
    for (i = 0, len = ref.length; i < len; i++) {
      key = ref[i];
      if (indexOf.call(this.optionNames, key) >= 0) {
        this[key] = options[key];
      }
    }
    render = this.render;
    this.render = function() {
      var returnValue;
      if (this.disposed) {
        return false;
      }
      returnValue = render.apply(this, arguments);
      if (this.autoAttach) {
        this.attach.apply(this, arguments);
      }
      return returnValue;
    };
    this.subviews = [];
    this.subviewsByName = {};
    if (this.noWrap) {
      if (this.region) {
        region = mediator.execute('region:find', this.region);
        if (region != null) {
          this.el = region.instance.container != null ? region.instance.region != null ? $(region.instance.container).find(region.selector) : region.instance.container : region.instance.$(region.selector);
        }
      }
      if (this.container) {
        this.el = this.container;
      }
    }
    View.__super__.constructor.apply(this, arguments);
    this.delegateListeners();
    if (this.model) {
      this.listenTo(this.model, 'dispose', this.dispose);
    }
    if (this.collection) {
      this.listenTo(this.collection, 'dispose', (function(_this) {
        return function(subject) {
          if (!subject || subject === _this.collection) {
            return _this.dispose();
          }
        };
      })(this));
    }
    if (this.regions != null) {
      mediator.execute('region:register', this);
    }
    if (this.autoRender) {
      this.render();
    }
  }

  View.prototype.find = function(selector) {
    if ($) {
      return this.$el.find(selector);
    } else {
      return this.el.querySelector(selector);
    }
  };

  View.prototype.delegate = function(eventName, second, third) {
    var bound, event, events, handler, i, len, ref, selector;
    if (typeof eventName !== 'string') {
      throw new TypeError('View#delegate: first argument must be a string');
    }
    switch (arguments.length) {
      case 2:
        handler = second;
        break;
      case 3:
        selector = second;
        handler = third;
        if (typeof selector !== 'string') {
          throw new TypeError('View#delegate: ' + 'second argument must be a string');
        }
        break;
      default:
        throw new TypeError('View#delegate: ' + 'only two or three arguments are allowed');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('View#delegate: ' + 'handler argument must be function');
    }
    bound = handler.bind(this);
    if ($) {
      events = eventName.split(' ').map((function(_this) {
        return function(name) {
          return name + ".delegateEvents" + _this.cid;
        };
      })(this)).join(' ');
      this.$el.on(events, selector, bound);
    } else {
      ref = eventName.split(' ');
      for (i = 0, len = ref.length; i < len; i++) {
        event = ref[i];
        View.__super__.delegate.call(this, event, selector, bound);
      }
    }
    return bound;
  };

  View.prototype._delegateEvents = function(events) {
    var handler, i, key, len, match, ref, value;
    ref = Object.keys(events);
    for (i = 0, len = ref.length; i < len; i++) {
      key = ref[i];
      value = events[key];
      handler = typeof value === 'function' ? value : this[value];
      if (!handler) {
        throw new Error("Method `" + value + "` does not exist");
      }
      match = /^(\S+)\s*(.*)$/.exec(key);
      this.delegate(match[1], match[2], handler);
    }
  };

  View.prototype.delegateEvents = function(events, keepOld) {
    var classEvents, i, len, ref;
    if (!keepOld) {
      this.undelegateEvents();
    }
    if (events) {
      return this._delegateEvents(events);
    }
    ref = utils.getAllPropertyVersions(this, 'events');
    for (i = 0, len = ref.length; i < len; i++) {
      classEvents = ref[i];
      if (typeof classEvents === 'function') {
        classEvents = classEvents.call(this);
      }
      this._delegateEvents(classEvents);
    }
  };

  View.prototype.undelegate = function(eventName, second) {
    var events, selector;
    if (eventName == null) {
      eventName = '';
    }
    if (typeof eventName !== 'string') {
      throw new TypeError('View#undelegate: first argument must be a string');
    }
    switch (arguments.length) {
      case 2:
        if (typeof second === 'string') {
          selector = second;
        }
        break;
      case 3:
        selector = second;
        if (typeof selector !== 'string') {
          throw new TypeError('View#undelegate: ' + 'second argument must be a string');
        }
    }
    if ($) {
      events = eventName.split(' ').map((function(_this) {
        return function(name) {
          return name + ".delegateEvents" + _this.cid;
        };
      })(this)).join(' ');
      return this.$el.off(events, selector);
    } else {
      if (eventName) {
        return View.__super__.undelegate.call(this, eventName, selector);
      } else {
        return this.undelegateEvents();
      }
    }
  };

  View.prototype.delegateListeners = function() {
    var eventName, i, j, key, len, len1, method, ref, ref1, ref2, target, version;
    if (!this.listen) {
      return;
    }
    ref = utils.getAllPropertyVersions(this, 'listen');
    for (i = 0, len = ref.length; i < len; i++) {
      version = ref[i];
      if (typeof version === 'function') {
        version = version.call(this);
      }
      ref1 = Object.keys(version);
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        key = ref1[j];
        method = version[key];
        if (typeof method !== 'function') {
          method = this[method];
        }
        if (typeof method !== 'function') {
          throw new Error('View#delegateListeners: ' + ("listener for `" + key + "` must be function"));
        }
        ref2 = key.split(' '), eventName = ref2[0], target = ref2[1];
        this.delegateListener(eventName, target, method);
      }
    }
  };

  View.prototype.delegateListener = function(eventName, target, callback) {
    var prop;
    if (target === 'model' || target === 'collection') {
      prop = this[target];
      if (prop) {
        this.listenTo(prop, eventName, callback);
      }
    } else if (target === 'mediator') {
      this.subscribeEvent(eventName, callback);
    } else if (!target) {
      this.on(eventName, callback, this);
    }
  };

  View.prototype.registerRegion = function(name, selector) {
    return mediator.execute('region:register', this, name, selector);
  };

  View.prototype.unregisterRegion = function(name) {
    return mediator.execute('region:unregister', this, name);
  };

  View.prototype.unregisterAllRegions = function() {
    return mediator.execute({
      name: 'region:unregister',
      silent: true
    }, this);
  };

  View.prototype.subview = function(name, view) {
    var byName, subviews;
    subviews = this.subviews;
    byName = this.subviewsByName;
    if (name && view) {
      this.removeSubview(name);
      subviews.push(view);
      byName[name] = view;
      return view;
    } else if (name) {
      return byName[name];
    }
  };

  View.prototype.removeSubview = function(nameOrView) {
    var byName, index, name, subviews, view;
    if (!nameOrView) {
      return;
    }
    subviews = this.subviews;
    byName = this.subviewsByName;
    if (typeof nameOrView === 'string') {
      name = nameOrView;
      view = byName[name];
    } else {
      view = nameOrView;
      Object.keys(byName).some(function(key) {
        if (byName[key] === view) {
          return name = key;
        }
      });
    }
    if (!(name && (view != null ? view.dispose : void 0))) {
      return;
    }
    view.dispose();
    index = subviews.indexOf(view);
    if (index !== -1) {
      subviews.splice(index, 1);
    }
    return delete byName[name];
  };

  View.prototype.getTemplateData = function() {
    var data, source;
    data = this.model ? utils.serialize(this.model) : this.collection ? {
      items: utils.serialize(this.collection),
      length: this.collection.length
    } : {};
    source = this.model || this.collection;
    if (source) {
      if (typeof source.isSynced === 'function' && !('synced' in data)) {
        data.synced = source.isSynced();
      }
    }
    return data;
  };

  View.prototype.getTemplateFunction = function() {
    throw new Error('View#getTemplateFunction must be overridden');
  };

  View.prototype.render = function() {
    var el, html, templateFunc;
    if (this.disposed) {
      return false;
    }
    templateFunc = this.getTemplateFunction();
    if (typeof templateFunc === 'function') {
      html = templateFunc(this.getTemplateData());
      if (this.noWrap) {
        el = document.createElement('div');
        el.innerHTML = html;
        if (el.children.length > 1) {
          throw new Error('There must be a single top-level element ' + 'when using `noWrap`');
        }
        this.undelegateEvents();
        this.setElement(el.firstChild, true);
      } else {
        setHTML(this, html);
      }
    }
    return this;
  };

  View.prototype.attach = function() {
    if (this.region != null) {
      mediator.execute('region:show', this.region, this);
    }
    if (this.container && !document.body.contains(this.el)) {
      attach(this);
      return this.trigger('addedToDOM');
    }
  };

  View.prototype.disposed = false;

  View.prototype.dispose = function() {
    var i, j, len, len1, prop, ref, ref1, subview;
    if (this.disposed) {
      return;
    }
    this.unregisterAllRegions();
    ref = this.subviews;
    for (i = 0, len = ref.length; i < len; i++) {
      subview = ref[i];
      subview.dispose();
    }
    this.unsubscribeAllEvents();
    this.off();
    if (this.keepElement) {
      this.undelegateEvents();
      this.undelegate();
      this.stopListening();
    } else {
      this.remove();
    }
    ref1 = ['el', '$el', 'options', 'model', 'collection', 'subviews', 'subviewsByName', '_callbacks'];
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      prop = ref1[j];
      delete this[prop];
    }
    this.disposed = true;
    return Object.freeze(this);
  };

  return View;

})(Backbone.NativeView || Backbone.View);


},{"../lib/event_broker":7,"../lib/utils":13,"../mediator":14,"backbone":"backbone","underscore":"underscore"}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2hhcGxpbi5jb2ZmZWUiLCJzcmMvY2hhcGxpbi9hcHBsaWNhdGlvbi5jb2ZmZWUiLCJzcmMvY2hhcGxpbi9jb21wb3Nlci5jb2ZmZWUiLCJzcmMvY2hhcGxpbi9jb250cm9sbGVycy9jb250cm9sbGVyLmNvZmZlZSIsInNyYy9jaGFwbGluL2Rpc3BhdGNoZXIuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL2NvbXBvc2l0aW9uLmNvZmZlZSIsInNyYy9jaGFwbGluL2xpYi9ldmVudF9icm9rZXIuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL2hpc3RvcnkuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL3JvdXRlLmNvZmZlZSIsInNyYy9jaGFwbGluL2xpYi9yb3V0ZXIuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL3N1cHBvcnQuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL3N5bmNfbWFjaGluZS5jb2ZmZWUiLCJzcmMvY2hhcGxpbi9saWIvdXRpbHMuY29mZmVlIiwic3JjL2NoYXBsaW4vbWVkaWF0b3IuY29mZmVlIiwic3JjL2NoYXBsaW4vbW9kZWxzL2NvbGxlY3Rpb24uY29mZmVlIiwic3JjL2NoYXBsaW4vbW9kZWxzL21vZGVsLmNvZmZlZSIsInNyYy9jaGFwbGluL3ZpZXdzL2NvbGxlY3Rpb25fdmlldy5jb2ZmZWUiLCJzcmMvY2hhcGxpbi92aWV3cy9sYXlvdXQuY29mZmVlIiwic3JjL2NoYXBsaW4vdmlld3Mvdmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3ZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9RQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgQXBwbGljYXRpb246IHJlcXVpcmUoJy4vY2hhcGxpbi9hcHBsaWNhdGlvbicpLFxuICBDb21wb3NlcjogcmVxdWlyZSgnLi9jaGFwbGluL2NvbXBvc2VyJyksXG4gIENvbnRyb2xsZXI6IHJlcXVpcmUoJy4vY2hhcGxpbi9jb250cm9sbGVycy9jb250cm9sbGVyJyksXG4gIERpc3BhdGNoZXI6IHJlcXVpcmUoJy4vY2hhcGxpbi9kaXNwYXRjaGVyJyksXG4gIENvbXBvc2l0aW9uOiByZXF1aXJlKCcuL2NoYXBsaW4vbGliL2NvbXBvc2l0aW9uJyksXG4gIEV2ZW50QnJva2VyOiByZXF1aXJlKCcuL2NoYXBsaW4vbGliL2V2ZW50X2Jyb2tlcicpLFxuICBIaXN0b3J5OiByZXF1aXJlKCcuL2NoYXBsaW4vbGliL2hpc3RvcnknKSxcbiAgUm91dGU6IHJlcXVpcmUoJy4vY2hhcGxpbi9saWIvcm91dGUnKSxcbiAgUm91dGVyOiByZXF1aXJlKCcuL2NoYXBsaW4vbGliL3JvdXRlcicpLFxuICBzdXBwb3J0OiByZXF1aXJlKCcuL2NoYXBsaW4vbGliL3N1cHBvcnQnKSxcbiAgU3luY01hY2hpbmU6IHJlcXVpcmUoJy4vY2hhcGxpbi9saWIvc3luY19tYWNoaW5lJyksXG4gIHV0aWxzOiByZXF1aXJlKCcuL2NoYXBsaW4vbGliL3V0aWxzJyksXG4gIG1lZGlhdG9yOiByZXF1aXJlKCcuL2NoYXBsaW4vbWVkaWF0b3InKSxcbiAgQ29sbGVjdGlvbjogcmVxdWlyZSgnLi9jaGFwbGluL21vZGVscy9jb2xsZWN0aW9uJyksXG4gIE1vZGVsOiByZXF1aXJlKCcuL2NoYXBsaW4vbW9kZWxzL21vZGVsJyksXG4gIENvbGxlY3Rpb25WaWV3OiByZXF1aXJlKCcuL2NoYXBsaW4vdmlld3MvY29sbGVjdGlvbl92aWV3JyksXG4gIExheW91dDogcmVxdWlyZSgnLi9jaGFwbGluL3ZpZXdzL2xheW91dCcpLFxuICBWaWV3OiByZXF1aXJlKCcuL2NoYXBsaW4vdmlld3MvdmlldycpXG59O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaVkyaGhjR3hwYmk1cWN5SXNJbk52ZFhKalpWSnZiM1FpT2lJaUxDSnpiM1Z5WTJWeklqcGJJbU5vWVhCc2FXNHVZMjltWm1WbElsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lKQlFVRkJPMEZCU1VFc1RVRkJUU3hEUVVGRExFOUJRVkFzUjBGRFJUdEZRVUZCTEZkQlFVRXNSVUZCWjBJc1QwRkJRU3hEUVVGUkxIVkNRVUZTTEVOQlFXaENPMFZCUTBFc1VVRkJRU3hGUVVGblFpeFBRVUZCTEVOQlFWRXNiMEpCUVZJc1EwRkVhRUk3UlVGRlFTeFZRVUZCTEVWQlFXZENMRTlCUVVFc1EwRkJVU3hyUTBGQlVpeERRVVpvUWp0RlFVZEJMRlZCUVVFc1JVRkJaMElzVDBGQlFTeERRVUZSTEhOQ1FVRlNMRU5CU0doQ08wVkJTVUVzVjBGQlFTeEZRVUZuUWl4UFFVRkJMRU5CUVZFc01rSkJRVklzUTBGS2FFSTdSVUZMUVN4WFFVRkJMRVZCUVdkQ0xFOUJRVUVzUTBGQlVTdzBRa0ZCVWl4RFFVeG9RanRGUVUxQkxFOUJRVUVzUlVGQlowSXNUMEZCUVN4RFFVRlJMSFZDUVVGU0xFTkJUbWhDTzBWQlQwRXNTMEZCUVN4RlFVRm5RaXhQUVVGQkxFTkJRVkVzY1VKQlFWSXNRMEZRYUVJN1JVRlJRU3hOUVVGQkxFVkJRV2RDTEU5QlFVRXNRMEZCVVN4elFrRkJVaXhEUVZKb1FqdEZRVk5CTEU5QlFVRXNSVUZCWjBJc1QwRkJRU3hEUVVGUkxIVkNRVUZTTEVOQlZHaENPMFZCVlVFc1YwRkJRU3hGUVVGblFpeFBRVUZCTEVOQlFWRXNORUpCUVZJc1EwRldhRUk3UlVGWFFTeExRVUZCTEVWQlFXZENMRTlCUVVFc1EwRkJVU3h4UWtGQlVpeERRVmhvUWp0RlFWbEJMRkZCUVVFc1JVRkJaMElzVDBGQlFTeERRVUZSTEc5Q1FVRlNMRU5CV21oQ08wVkJZVUVzVlVGQlFTeEZRVUZuUWl4UFFVRkJMRU5CUVZFc05rSkJRVklzUTBGaWFFSTdSVUZqUVN4TFFVRkJMRVZCUVdkQ0xFOUJRVUVzUTBGQlVTeDNRa0ZCVWl4RFFXUm9RanRGUVdWQkxHTkJRVUVzUlVGQlowSXNUMEZCUVN4RFFVRlJMR2xEUVVGU0xFTkJabWhDTzBWQlowSkJMRTFCUVVFc1JVRkJaMElzVDBGQlFTeERRVUZSTEhkQ1FVRlNMRU5CYUVKb1FqdEZRV2xDUVN4SlFVRkJMRVZCUVdkQ0xFOUJRVUVzUTBGQlVTeHpRa0ZCVWl4RFFXcENhRUlpZlE9PVxuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIEFwcGxpY2F0aW9uLCBCYWNrYm9uZSwgQ29tcG9zZXIsIERpc3BhdGNoZXIsIEV2ZW50QnJva2VyLCBMYXlvdXQsIFJvdXRlciwgXywgbWVkaWF0b3I7XG5cbl8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbkJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuQ29tcG9zZXIgPSByZXF1aXJlKCcuL2NvbXBvc2VyJyk7XG5cbkRpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2Rpc3BhdGNoZXInKTtcblxuUm91dGVyID0gcmVxdWlyZSgnLi9saWIvcm91dGVyJyk7XG5cbkxheW91dCA9IHJlcXVpcmUoJy4vdmlld3MvbGF5b3V0Jyk7XG5cbkV2ZW50QnJva2VyID0gcmVxdWlyZSgnLi9saWIvZXZlbnRfYnJva2VyJyk7XG5cbm1lZGlhdG9yID0gcmVxdWlyZSgnLi9tZWRpYXRvcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcGxpY2F0aW9uID0gKGZ1bmN0aW9uKCkge1xuICBBcHBsaWNhdGlvbi5leHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ7XG5cbiAgXy5leHRlbmQoQXBwbGljYXRpb24ucHJvdG90eXBlLCBFdmVudEJyb2tlcik7XG5cbiAgQXBwbGljYXRpb24ucHJvdG90eXBlLnRpdGxlID0gJyc7XG5cbiAgQXBwbGljYXRpb24ucHJvdG90eXBlLmRpc3BhdGNoZXIgPSBudWxsO1xuXG4gIEFwcGxpY2F0aW9uLnByb3RvdHlwZS5sYXlvdXQgPSBudWxsO1xuXG4gIEFwcGxpY2F0aW9uLnByb3RvdHlwZS5yb3V0ZXIgPSBudWxsO1xuXG4gIEFwcGxpY2F0aW9uLnByb3RvdHlwZS5jb21wb3NlciA9IG51bGw7XG5cbiAgQXBwbGljYXRpb24ucHJvdG90eXBlLnN0YXJ0ZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBBcHBsaWNhdGlvbihvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgPT0gbnVsbCkge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICB0aGlzLmluaXRpYWxpemUob3B0aW9ucyk7XG4gIH1cblxuICBBcHBsaWNhdGlvbi5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucyA9PSBudWxsKSB7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIGlmICh0aGlzLnN0YXJ0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQXBwbGljYXRpb24jaW5pdGlhbGl6ZTogQXBwIHdhcyBhbHJlYWR5IHN0YXJ0ZWQnKTtcbiAgICB9XG4gICAgdGhpcy5pbml0Um91dGVyKG9wdGlvbnMucm91dGVzLCBvcHRpb25zKTtcbiAgICB0aGlzLmluaXREaXNwYXRjaGVyKG9wdGlvbnMpO1xuICAgIHRoaXMuaW5pdExheW91dChvcHRpb25zKTtcbiAgICB0aGlzLmluaXRDb21wb3NlcihvcHRpb25zKTtcbiAgICB0aGlzLmluaXRNZWRpYXRvcigpO1xuICAgIHJldHVybiB0aGlzLnN0YXJ0KCk7XG4gIH07XG5cbiAgQXBwbGljYXRpb24ucHJvdG90eXBlLmluaXREaXNwYXRjaGVyID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcihvcHRpb25zKTtcbiAgfTtcblxuICBBcHBsaWNhdGlvbi5wcm90b3R5cGUuaW5pdExheW91dCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucyA9PSBudWxsKSB7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnRpdGxlID09IG51bGwpIHtcbiAgICAgIG9wdGlvbnMudGl0bGUgPSB0aGlzLnRpdGxlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5sYXlvdXQgPSBuZXcgTGF5b3V0KG9wdGlvbnMpO1xuICB9O1xuXG4gIEFwcGxpY2F0aW9uLnByb3RvdHlwZS5pbml0Q29tcG9zZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgPT0gbnVsbCkge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21wb3NlciA9IG5ldyBDb21wb3NlcihvcHRpb25zKTtcbiAgfTtcblxuICBBcHBsaWNhdGlvbi5wcm90b3R5cGUuaW5pdE1lZGlhdG9yID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE9iamVjdC5zZWFsKG1lZGlhdG9yKTtcbiAgfTtcblxuICBBcHBsaWNhdGlvbi5wcm90b3R5cGUuaW5pdFJvdXRlciA9IGZ1bmN0aW9uKHJvdXRlcywgb3B0aW9ucykge1xuICAgIHRoaXMucm91dGVyID0gbmV3IFJvdXRlcihvcHRpb25zKTtcbiAgICByZXR1cm4gdHlwZW9mIHJvdXRlcyA9PT0gXCJmdW5jdGlvblwiID8gcm91dGVzKHRoaXMucm91dGVyLm1hdGNoKSA6IHZvaWQgMDtcbiAgfTtcblxuICBBcHBsaWNhdGlvbi5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJvdXRlci5zdGFydEhpc3RvcnkoKTtcbiAgICB0aGlzLnN0YXJ0ZWQgPSB0cnVlO1xuICAgIHRoaXMuZGlzcG9zZWQgPSBmYWxzZTtcbiAgICByZXR1cm4gT2JqZWN0LnNlYWwodGhpcyk7XG4gIH07XG5cbiAgQXBwbGljYXRpb24ucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaSwgbGVuLCBwcm9wLCBwcm9wZXJ0aWVzO1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHByb3BlcnRpZXMgPSBbJ2Rpc3BhdGNoZXInLCAnbGF5b3V0JywgJ3JvdXRlcicsICdjb21wb3NlciddO1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IHByb3BlcnRpZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHByb3AgPSBwcm9wZXJ0aWVzW2ldO1xuICAgICAgaWYgKHRoaXNbcHJvcF0gIT0gbnVsbCkge1xuICAgICAgICB0aGlzW3Byb3BdLmRpc3Bvc2UoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUodGhpcyk7XG4gIH07XG5cbiAgcmV0dXJuIEFwcGxpY2F0aW9uO1xuXG59KSgpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaVlYQndiR2xqWVhScGIyNHVhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjeUk2V3lKaGNIQnNhV05oZEdsdmJpNWpiMlptWldVaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRTdRVUZCUVN4SlFVRkJPenRCUVVkQkxFTkJRVUVzUjBGQlNTeFBRVUZCTEVOQlFWRXNXVUZCVWpzN1FVRkRTaXhSUVVGQkxFZEJRVmNzVDBGQlFTeERRVUZSTEZWQlFWSTdPMEZCUjFnc1VVRkJRU3hIUVVGWExFOUJRVUVzUTBGQlVTeFpRVUZTT3p0QlFVTllMRlZCUVVFc1IwRkJZU3hQUVVGQkxFTkJRVkVzWTBGQlVqczdRVUZEWWl4TlFVRkJMRWRCUVZNc1QwRkJRU3hEUVVGUkxHTkJRVkk3TzBGQlExUXNUVUZCUVN4SFFVRlRMRTlCUVVFc1EwRkJVU3huUWtGQlVqczdRVUZIVkN4WFFVRkJMRWRCUVdNc1QwRkJRU3hEUVVGUkxHOUNRVUZTT3p0QlFVZGtMRkZCUVVFc1IwRkJWeXhQUVVGQkxFTkJRVkVzV1VGQlVqczdRVUZIV0N4TlFVRk5MRU5CUVVNc1QwRkJVQ3hIUVVGMVFqdEZRVVZ5UWl4WFFVRkRMRU5CUVVFc1RVRkJSQ3hIUVVGVkxGRkJRVkVzUTBGQlF5eExRVUZMTEVOQlFVTTdPMFZCUjNwQ0xFTkJRVU1zUTBGQlF5eE5RVUZHTEVOQlFWTXNWMEZCUXl4RFFVRkJMRk5CUVZZc1JVRkJjVUlzVjBGQmNrSTdPM2RDUVVkQkxFdEJRVUVzUjBGQlR6czdkMEpCVFZBc1ZVRkJRU3hIUVVGWk96dDNRa0ZEV2l4TlFVRkJMRWRCUVZFN08zZENRVU5TTEUxQlFVRXNSMEZCVVRzN2QwSkJRMUlzVVVGQlFTeEhRVUZWT3p0M1FrRkRWaXhQUVVGQkxFZEJRVk03TzBWQlJVa3NjVUpCUVVNc1QwRkJSRHM3VFVGQlF5eFZRVUZWT3p0SlFVTjBRaXhKUVVGRExFTkJRVUVzVlVGQlJDeERRVUZaTEU5QlFWbzdSVUZFVnpzN2QwSkJSMklzVlVGQlFTeEhRVUZaTEZOQlFVTXNUMEZCUkRzN1RVRkJReXhWUVVGVk96dEpRVVZ5UWl4SlFVRkhMRWxCUVVNc1EwRkJRU3hQUVVGS08wRkJRMFVzV1VGQlRTeEpRVUZKTEV0QlFVb3NRMEZCVlN4cFJFRkJWaXhGUVVSU096dEpRVmxCTEVsQlFVTXNRMEZCUVN4VlFVRkVMRU5CUVZrc1QwRkJUeXhEUVVGRExFMUJRWEJDTEVWQlFUUkNMRTlCUVRWQ08wbEJSMEVzU1VGQlF5eERRVUZCTEdOQlFVUXNRMEZCWjBJc1QwRkJhRUk3U1VGSFFTeEpRVUZETEVOQlFVRXNWVUZCUkN4RFFVRlpMRTlCUVZvN1NVRkhRU3hKUVVGRExFTkJRVUVzV1VGQlJDeERRVUZqTEU5QlFXUTdTVUZIUVN4SlFVRkRMRU5CUVVFc1dVRkJSQ3hEUVVGQk8xZEJSMEVzU1VGQlF5eERRVUZCTEV0QlFVUXNRMEZCUVR0RlFUZENWVHM3ZDBKQmIwTmFMR05CUVVFc1IwRkJaMElzVTBGQlF5eFBRVUZFTzFkQlEyUXNTVUZCUXl4RFFVRkJMRlZCUVVRc1IwRkJZeXhKUVVGSkxGVkJRVW9zUTBGQlpTeFBRVUZtTzBWQlJFRTdPM2RDUVZWb1FpeFZRVUZCTEVkQlFWa3NVMEZCUXl4UFFVRkVPenROUVVGRExGVkJRVlU3T3p0TlFVTnlRaXhQUVVGUExFTkJRVU1zVVVGQlV5eEpRVUZETEVOQlFVRTdPMWRCUTJ4Q0xFbEJRVU1zUTBGQlFTeE5RVUZFTEVkQlFWVXNTVUZCU1N4TlFVRktMRU5CUVZjc1QwRkJXRHRGUVVaQk96dDNRa0ZKV2l4WlFVRkJMRWRCUVdNc1UwRkJReXhQUVVGRU96dE5RVUZETEZWQlFWVTdPMWRCUTNaQ0xFbEJRVU1zUTBGQlFTeFJRVUZFTEVkQlFWa3NTVUZCU1N4UlFVRktMRU5CUVdFc1QwRkJZanRGUVVSQk96dDNRa0ZUWkN4WlFVRkJMRWRCUVdNc1UwRkJRVHRYUVVOYUxFMUJRVTBzUTBGQlF5eEpRVUZRTEVOQlFWa3NVVUZCV2p0RlFVUlpPenQzUWtGVFpDeFZRVUZCTEVkQlFWa3NVMEZCUXl4TlFVRkVMRVZCUVZNc1QwRkJWRHRKUVVkV0xFbEJRVU1zUTBGQlFTeE5RVUZFTEVkQlFWVXNTVUZCU1N4TlFVRktMRU5CUVZjc1QwRkJXRHN3UTBGSFZpeFBRVUZSTEVsQlFVTXNRMEZCUVN4TlFVRk5MRU5CUVVNN1JVRk9UanM3ZDBKQlUxb3NTMEZCUVN4SFFVRlBMRk5CUVVFN1NVRkZUQ3hKUVVGRExFTkJRVUVzVFVGQlRTeERRVUZETEZsQlFWSXNRMEZCUVR0SlFVZEJMRWxCUVVNc1EwRkJRU3hQUVVGRUxFZEJRVmM3U1VGSFdDeEpRVUZETEVOQlFVRXNVVUZCUkN4SFFVRlpPMWRCUjFvc1RVRkJUU3hEUVVGRExFbEJRVkFzUTBGQldTeEpRVUZhTzBWQldFczdPM2RDUVdGUUxFOUJRVUVzUjBGQlV5eFRRVUZCTzBGQlJWQXNVVUZCUVR0SlFVRkJMRWxCUVZVc1NVRkJReXhEUVVGQkxGRkJRVmc3UVVGQlFTeGhRVUZCT3p0SlFVVkJMRlZCUVVFc1IwRkJZU3hEUVVGRExGbEJRVVFzUlVGQlpTeFJRVUZtTEVWQlFYbENMRkZCUVhwQ0xFVkJRVzFETEZWQlFXNURPMEZCUTJJc1UwRkJRU3cwUTBGQlFUczdWVUZCTkVJN1VVRkRNVUlzU1VGQlN5eERRVUZCTEVsQlFVRXNRMEZCU3l4RFFVRkRMRTlCUVZnc1EwRkJRVHM3UVVGRVJqdEpRVWRCTEVsQlFVTXNRMEZCUVN4UlFVRkVMRWRCUVZrN1YwRkhXaXhOUVVGTkxFTkJRVU1zVFVGQlVDeERRVUZqTEVsQlFXUTdSVUZZVHlKOVxuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIEJhY2tib25lLCBDb21wb3NlciwgQ29tcG9zaXRpb24sIEV2ZW50QnJva2VyLCBfLCBtZWRpYXRvcjtcblxuXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG5Db21wb3NpdGlvbiA9IHJlcXVpcmUoJy4vbGliL2NvbXBvc2l0aW9uJyk7XG5cbkV2ZW50QnJva2VyID0gcmVxdWlyZSgnLi9saWIvZXZlbnRfYnJva2VyJyk7XG5cbm1lZGlhdG9yID0gcmVxdWlyZSgnLi9tZWRpYXRvcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvc2VyID0gKGZ1bmN0aW9uKCkge1xuICBDb21wb3Nlci5leHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ7XG5cbiAgXy5leHRlbmQoQ29tcG9zZXIucHJvdG90eXBlLCBFdmVudEJyb2tlcik7XG5cbiAgQ29tcG9zZXIucHJvdG90eXBlLmNvbXBvc2l0aW9ucyA9IG51bGw7XG5cbiAgZnVuY3Rpb24gQ29tcG9zZXIoKSB7XG4gICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICBDb21wb3Nlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucyA9PSBudWxsKSB7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIHRoaXMuY29tcG9zaXRpb25zID0ge307XG4gICAgbWVkaWF0b3Iuc2V0SGFuZGxlcignY29tcG9zZXI6Y29tcG9zZScsIHRoaXMuY29tcG9zZSwgdGhpcyk7XG4gICAgbWVkaWF0b3Iuc2V0SGFuZGxlcignY29tcG9zZXI6cmV0cmlldmUnLCB0aGlzLnJldHJpZXZlLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcy5zdWJzY3JpYmVFdmVudCgnZGlzcGF0Y2hlcjpkaXNwYXRjaCcsIHRoaXMuY2xlYW51cCk7XG4gIH07XG5cbiAgQ29tcG9zZXIucHJvdG90eXBlLmNvbXBvc2UgPSBmdW5jdGlvbihuYW1lLCBzZWNvbmQsIHRoaXJkKSB7XG4gICAgaWYgKHR5cGVvZiBzZWNvbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmICh0aGlyZCB8fCBzZWNvbmQucHJvdG90eXBlLmRpc3Bvc2UpIHtcbiAgICAgICAgaWYgKHNlY29uZC5wcm90b3R5cGUgaW5zdGFuY2VvZiBDb21wb3NpdGlvbikge1xuICAgICAgICAgIHJldHVybiB0aGlzLl9jb21wb3NlKG5hbWUsIHtcbiAgICAgICAgICAgIGNvbXBvc2l0aW9uOiBzZWNvbmQsXG4gICAgICAgICAgICBvcHRpb25zOiB0aGlyZFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLl9jb21wb3NlKG5hbWUsIHtcbiAgICAgICAgICAgIG9wdGlvbnM6IHRoaXJkLFxuICAgICAgICAgICAgY29tcG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHZhciBhdXRvUmVuZGVyLCBkaXNhYmxlZEF1dG9SZW5kZXI7XG4gICAgICAgICAgICAgIGlmIChzZWNvbmQucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuTW9kZWwgfHwgc2Vjb25kLnByb3RvdHlwZSBpbnN0YW5jZW9mIEJhY2tib25lLkNvbGxlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW0gPSBuZXcgc2Vjb25kKG51bGwsIHRoaXMub3B0aW9ucyk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtID0gbmV3IHNlY29uZCh0aGlzLm9wdGlvbnMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGF1dG9SZW5kZXIgPSB0aGlzLml0ZW0uYXV0b1JlbmRlcjtcbiAgICAgICAgICAgICAgZGlzYWJsZWRBdXRvUmVuZGVyID0gYXV0b1JlbmRlciA9PT0gdm9pZCAwIHx8ICFhdXRvUmVuZGVyO1xuICAgICAgICAgICAgICBpZiAoZGlzYWJsZWRBdXRvUmVuZGVyICYmIHR5cGVvZiB0aGlzLml0ZW0ucmVuZGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbS5yZW5kZXIoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fY29tcG9zZShuYW1lLCB7XG4gICAgICAgIGNvbXBvc2U6IHNlY29uZFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdGhpcmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jb21wb3NlKG5hbWUsIHtcbiAgICAgICAgY29tcG9zZTogdGhpcmQsXG4gICAgICAgIG9wdGlvbnM6IHNlY29uZFxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb21wb3NlKG5hbWUsIHNlY29uZCk7XG4gIH07XG5cbiAgQ29tcG9zZXIucHJvdG90eXBlLl9jb21wb3NlID0gZnVuY3Rpb24obmFtZSwgb3B0aW9ucykge1xuICAgIHZhciBjb21wb3NpdGlvbiwgY3VycmVudCwgaXNQcm9taXNlLCByZXR1cm5lZDtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuY29tcG9zZSAhPT0gJ2Z1bmN0aW9uJyAmJiAob3B0aW9ucy5jb21wb3NpdGlvbiA9PSBudWxsKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb21wb3NlciNjb21wb3NlIHdhcyB1c2VkIGluY29ycmVjdGx5Jyk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmNvbXBvc2l0aW9uICE9IG51bGwpIHtcbiAgICAgIGNvbXBvc2l0aW9uID0gbmV3IG9wdGlvbnMuY29tcG9zaXRpb24ob3B0aW9ucy5vcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcG9zaXRpb24gPSBuZXcgQ29tcG9zaXRpb24ob3B0aW9ucy5vcHRpb25zKTtcbiAgICAgIGNvbXBvc2l0aW9uLmNvbXBvc2UgPSBvcHRpb25zLmNvbXBvc2U7XG4gICAgICBpZiAob3B0aW9ucy5jaGVjaykge1xuICAgICAgICBjb21wb3NpdGlvbi5jaGVjayA9IG9wdGlvbnMuY2hlY2s7XG4gICAgICB9XG4gICAgfVxuICAgIGN1cnJlbnQgPSB0aGlzLmNvbXBvc2l0aW9uc1tuYW1lXTtcbiAgICBpZiAoY3VycmVudCAmJiBjdXJyZW50LmNoZWNrKGNvbXBvc2l0aW9uLm9wdGlvbnMpKSB7XG4gICAgICBjdXJyZW50LnN0YWxlKGZhbHNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGN1cnJlbnQpIHtcbiAgICAgICAgY3VycmVudC5kaXNwb3NlKCk7XG4gICAgICB9XG4gICAgICByZXR1cm5lZCA9IGNvbXBvc2l0aW9uLmNvbXBvc2UoY29tcG9zaXRpb24ub3B0aW9ucyk7XG4gICAgICBpc1Byb21pc2UgPSB0eXBlb2YgKHJldHVybmVkICE9IG51bGwgPyByZXR1cm5lZC50aGVuIDogdm9pZCAwKSA9PT0gJ2Z1bmN0aW9uJztcbiAgICAgIGNvbXBvc2l0aW9uLnN0YWxlKGZhbHNlKTtcbiAgICAgIHRoaXMuY29tcG9zaXRpb25zW25hbWVdID0gY29tcG9zaXRpb247XG4gICAgfVxuICAgIGlmIChpc1Byb21pc2UpIHtcbiAgICAgIHJldHVybiByZXR1cm5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY29tcG9zaXRpb25zW25hbWVdLml0ZW07XG4gICAgfVxuICB9O1xuXG4gIENvbXBvc2VyLnByb3RvdHlwZS5yZXRyaWV2ZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgYWN0aXZlO1xuICAgIGFjdGl2ZSA9IHRoaXMuY29tcG9zaXRpb25zW25hbWVdO1xuICAgIGlmIChhY3RpdmUgJiYgIWFjdGl2ZS5zdGFsZSgpKSB7XG4gICAgICByZXR1cm4gYWN0aXZlLml0ZW07XG4gICAgfVxuICB9O1xuXG4gIENvbXBvc2VyLnByb3RvdHlwZS5jbGVhbnVwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNvbXBvc2l0aW9uLCBpLCBrZXksIGxlbiwgcmVmO1xuICAgIHJlZiA9IE9iamVjdC5rZXlzKHRoaXMuY29tcG9zaXRpb25zKTtcbiAgICBmb3IgKGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGtleSA9IHJlZltpXTtcbiAgICAgIGNvbXBvc2l0aW9uID0gdGhpcy5jb21wb3NpdGlvbnNba2V5XTtcbiAgICAgIGlmIChjb21wb3NpdGlvbi5zdGFsZSgpKSB7XG4gICAgICAgIGNvbXBvc2l0aW9uLmRpc3Bvc2UoKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuY29tcG9zaXRpb25zW2tleV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21wb3NpdGlvbi5zdGFsZSh0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgQ29tcG9zZXIucHJvdG90eXBlLmRpc3Bvc2VkID0gZmFsc2U7XG5cbiAgQ29tcG9zZXIucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaSwga2V5LCBsZW4sIHJlZjtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnVuc3Vic2NyaWJlQWxsRXZlbnRzKCk7XG4gICAgbWVkaWF0b3IucmVtb3ZlSGFuZGxlcnModGhpcyk7XG4gICAgcmVmID0gT2JqZWN0LmtleXModGhpcy5jb21wb3NpdGlvbnMpO1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAga2V5ID0gcmVmW2ldO1xuICAgICAgdGhpcy5jb21wb3NpdGlvbnNba2V5XS5kaXNwb3NlKCk7XG4gICAgfVxuICAgIGRlbGV0ZSB0aGlzLmNvbXBvc2l0aW9ucztcbiAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgfTtcblxuICByZXR1cm4gQ29tcG9zZXI7XG5cbn0pKCk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pWTI5dGNHOXpaWEl1YW5NaUxDSnpiM1Z5WTJWU2IyOTBJam9pSWl3aWMyOTFjbU5sY3lJNld5SmpiMjF3YjNObGNpNWpiMlptWldVaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRTdRVUZCUVN4SlFVRkJPenRCUVVWQkxFTkJRVUVzUjBGQlNTeFBRVUZCTEVOQlFWRXNXVUZCVWpzN1FVRkRTaXhSUVVGQkxFZEJRVmNzVDBGQlFTeERRVUZSTEZWQlFWSTdPMEZCUlZnc1YwRkJRU3hIUVVGakxFOUJRVUVzUTBGQlVTeHRRa0ZCVWpzN1FVRkRaQ3hYUVVGQkxFZEJRV01zVDBGQlFTeERRVUZSTEc5Q1FVRlNPenRCUVVOa0xGRkJRVUVzUjBGQlZ5eFBRVUZCTEVOQlFWRXNXVUZCVWpzN1FVRmhXQ3hOUVVGTkxFTkJRVU1zVDBGQlVDeEhRVUYxUWp0RlFVVnlRaXhSUVVGRExFTkJRVUVzVFVGQlJDeEhRVUZWTEZGQlFWRXNRMEZCUXl4TFFVRkxMRU5CUVVNN08wVkJSM3BDTEVOQlFVTXNRMEZCUXl4TlFVRkdMRU5CUVZNc1VVRkJReXhEUVVGQkxGTkJRVllzUlVGQmNVSXNWMEZCY2tJN08zRkNRVWRCTEZsQlFVRXNSMEZCWXpzN1JVRkZSQ3hyUWtGQlFUdEpRVU5ZTEVsQlFVTXNRMEZCUVN4VlFVRkVMR0ZCUVZrc1UwRkJXanRGUVVSWE96dHhRa0ZIWWl4VlFVRkJMRWRCUVZrc1UwRkJReXhQUVVGRU96dE5RVUZETEZWQlFWVTdPMGxCUlhKQ0xFbEJRVU1zUTBGQlFTeFpRVUZFTEVkQlFXZENPMGxCUjJoQ0xGRkJRVkVzUTBGQlF5eFZRVUZVTEVOQlFXOUNMR3RDUVVGd1FpeEZRVUYzUXl4SlFVRkRMRU5CUVVFc1QwRkJla01zUlVGQmEwUXNTVUZCYkVRN1NVRkRRU3hSUVVGUkxFTkJRVU1zVlVGQlZDeERRVUZ2UWl4dFFrRkJjRUlzUlVGQmVVTXNTVUZCUXl4RFFVRkJMRkZCUVRGRExFVkJRVzlFTEVsQlFYQkVPMWRCUTBFc1NVRkJReXhEUVVGQkxHTkJRVVFzUTBGQlowSXNjVUpCUVdoQ0xFVkJRWFZETEVsQlFVTXNRMEZCUVN4UFFVRjRRenRGUVZCVk96dHhRa0Z2UTFvc1QwRkJRU3hIUVVGVExGTkJRVU1zU1VGQlJDeEZRVUZQTEUxQlFWQXNSVUZCWlN4TFFVRm1PMGxCUjFBc1NVRkJSeXhQUVVGUExFMUJRVkFzUzBGQmFVSXNWVUZCY0VJN1RVRkhSU3hKUVVGSExFdEJRVUVzU1VGQlV5eE5RVUZOTEVOQlFVRXNVMEZCUlN4RFFVRkJMRTlCUVhCQ08xRkJSVVVzU1VGQlJ5eE5RVUZOTEVOQlFVTXNVMEZCVUN4WlFVRTBRaXhYUVVFdlFqdEJRVU5GTEdsQ1FVRlBMRWxCUVVNc1EwRkJRU3hSUVVGRUxFTkJRVlVzU1VGQlZpeEZRVUZuUWp0WlFVRkJMRmRCUVVFc1JVRkJZU3hOUVVGaU8xbEJRWEZDTEU5QlFVRXNSVUZCVXl4TFFVRTVRanRYUVVGb1FpeEZRVVJVTzFOQlFVRXNUVUZCUVR0QlFVZEZMR2xDUVVGUExFbEJRVU1zUTBGQlFTeFJRVUZFTEVOQlFWVXNTVUZCVml4RlFVRm5RanRaUVVGQkxFOUJRVUVzUlVGQlV5eExRVUZVTzFsQlFXZENMRTlCUVVFc1JVRkJVeXhUUVVGQk8wRkJSemxETEd0Q1FVRkJPMk5CUVVFc1NVRkJSeXhOUVVGTkxFTkJRVU1zVTBGQlVDeFpRVUUwUWl4UlFVRlJMRU5CUVVNc1MwRkJja01zU1VGRFNDeE5RVUZOTEVOQlFVTXNVMEZCVUN4WlFVRTBRaXhSUVVGUkxFTkJRVU1zVlVGRWNrTTdaMEpCUlVVc1NVRkJReXhEUVVGQkxFbEJRVVFzUjBGQlVTeEpRVUZKTEUxQlFVb3NRMEZCVnl4SlFVRllMRVZCUVdsQ0xFbEJRVU1zUTBGQlFTeFBRVUZzUWl4RlFVWldPMlZCUVVFc1RVRkJRVHRuUWtGSlJTeEpRVUZETEVOQlFVRXNTVUZCUkN4SFFVRlJMRWxCUVVrc1RVRkJTaXhEUVVGWExFbEJRVU1zUTBGQlFTeFBRVUZhTEVWQlNsWTdPMk5CVTBFc1ZVRkJRU3hIUVVGaExFbEJRVU1zUTBGQlFTeEpRVUZKTEVOQlFVTTdZMEZEYmtJc2EwSkJRVUVzUjBGQmNVSXNWVUZCUVN4TFFVRmpMRTFCUVdRc1NVRkJNa0lzUTBGQlNUdGpRVU53UkN4SlFVRkhMR3RDUVVGQkxFbEJRWFZDTEU5QlFVOHNTVUZCUXl4RFFVRkJMRWxCUVVrc1EwRkJReXhOUVVGaUxFdEJRWFZDTEZWQlFXcEVPM1ZDUVVORkxFbEJRVU1zUTBGQlFTeEpRVUZKTEVOQlFVTXNUVUZCVGl4RFFVRkJMRVZCUkVZN08xbEJaRGhETEVOQlFYcENPMWRCUVdoQ0xFVkJTRlE3VTBGR1JqczdRVUYxUWtFc1lVRkJUeXhKUVVGRExFTkJRVUVzVVVGQlJDeERRVUZWTEVsQlFWWXNSVUZCWjBJN1VVRkJRU3hQUVVGQkxFVkJRVk1zVFVGQlZEdFBRVUZvUWl4RlFURkNWRHM3U1VFMlFrRXNTVUZCUnl4UFFVRlBMRXRCUVZBc1MwRkJaMElzVlVGQmJrSTdRVUZEUlN4aFFVRlBMRWxCUVVNc1EwRkJRU3hSUVVGRUxFTkJRVlVzU1VGQlZpeEZRVUZuUWp0UlFVRkJMRTlCUVVFc1JVRkJVeXhMUVVGVU8xRkJRV2RDTEU5QlFVRXNSVUZCVXl4TlFVRjZRanRQUVVGb1FpeEZRVVJVT3p0QlFVbEJMRmRCUVU4c1NVRkJReXhEUVVGQkxGRkJRVVFzUTBGQlZTeEpRVUZXTEVWQlFXZENMRTFCUVdoQ08wVkJjRU5CT3p0eFFrRnpRMVFzVVVGQlFTeEhRVUZWTEZOQlFVTXNTVUZCUkN4RlFVRlBMRTlCUVZBN1FVRkZVaXhSUVVGQk8wbEJRVUVzU1VGQlJ5eFBRVUZQTEU5QlFVOHNRMEZCUXl4UFFVRm1MRXRCUVRSQ0xGVkJRVFZDTEVsQlFTdERMRFpDUVVGc1JEdEJRVU5GTEZsQlFVMHNTVUZCU1N4TFFVRktMRU5CUVZVc2RVTkJRVllzUlVGRVVqczdTVUZIUVN4SlFVRkhMREpDUVVGSU8wMUJSVVVzVjBGQlFTeEhRVUZqTEVsQlFVa3NUMEZCVHl4RFFVRkRMRmRCUVZvc1EwRkJkMElzVDBGQlR5eERRVUZETEU5QlFXaERMRVZCUm1oQ08wdEJRVUVzVFVGQlFUdE5RVXRGTEZkQlFVRXNSMEZCWXl4SlFVRkpMRmRCUVVvc1EwRkJaMElzVDBGQlR5eERRVUZETEU5QlFYaENPMDFCUTJRc1YwRkJWeXhEUVVGRExFOUJRVm9zUjBGQmMwSXNUMEZCVHl4RFFVRkRPMDFCUXpsQ0xFbEJRWEZETEU5QlFVOHNRMEZCUXl4TFFVRTNRenRSUVVGQkxGZEJRVmNzUTBGQlF5eExRVUZhTEVkQlFXOUNMRTlCUVU4c1EwRkJReXhOUVVFMVFqdFBRVkJHT3p0SlFWVkJMRTlCUVVFc1IwRkJWU3hKUVVGRExFTkJRVUVzV1VGQllTeERRVUZCTEVsQlFVRTdTVUZIZUVJc1NVRkJSeXhQUVVGQkxFbEJRVmtzVDBGQlR5eERRVUZETEV0QlFWSXNRMEZCWXl4WFFVRlhMRU5CUVVNc1QwRkJNVUlzUTBGQlpqdE5RVVZGTEU5QlFVOHNRMEZCUXl4TFFVRlNMRU5CUVdNc1MwRkJaQ3hGUVVaR08wdEJRVUVzVFVGQlFUdE5RVXRGTEVsQlFYRkNMRTlCUVhKQ08xRkJRVUVzVDBGQlR5eERRVUZETEU5QlFWSXNRMEZCUVN4RlFVRkJPenROUVVOQkxGRkJRVUVzUjBGQlZ5eFhRVUZYTEVOQlFVTXNUMEZCV2l4RFFVRnZRaXhYUVVGWExFTkJRVU1zVDBGQmFFTTdUVUZEV0N4VFFVRkJMRWRCUVZrc01rSkJRVThzVVVGQlVTeERRVUZGTEdOQlFXcENMRXRCUVhsQ08wMUJRM0pETEZkQlFWY3NRMEZCUXl4TFFVRmFMRU5CUVd0Q0xFdEJRV3hDTzAxQlEwRXNTVUZCUXl4RFFVRkJMRmxCUVdFc1EwRkJRU3hKUVVGQkxFTkJRV1FzUjBGQmMwSXNXVUZVZUVJN08wbEJXVUVzU1VGQlJ5eFRRVUZJTzJGQlEwVXNVMEZFUmp0TFFVRkJMRTFCUVVFN1lVRkhSU3hKUVVGRExFTkJRVUVzV1VGQllTeERRVUZCTEVsQlFVRXNRMEZCU3l4RFFVRkRMRXRCU0hSQ096dEZRVGxDVVRzN2NVSkJiME5XTEZGQlFVRXNSMEZCVlN4VFFVRkRMRWxCUVVRN1FVRkRVaXhSUVVGQk8wbEJRVUVzVFVGQlFTeEhRVUZUTEVsQlFVTXNRMEZCUVN4WlFVRmhMRU5CUVVFc1NVRkJRVHRKUVVOMlFpeEpRVUZITEUxQlFVRXNTVUZCVnl4RFFVRkpMRTFCUVUwc1EwRkJReXhMUVVGUUxFTkJRVUVzUTBGQmJFSTdZVUZCYzBNc1RVRkJUU3hEUVVGRExFdEJRVGRET3p0RlFVWlJPenR4UWtGTlZpeFBRVUZCTEVkQlFWTXNVMEZCUVR0QlFVdFFMRkZCUVVFN1FVRkJRVHRCUVVGQkxGTkJRVUVzY1VOQlFVRTdPMDFCUTBVc1YwRkJRU3hIUVVGakxFbEJRVU1zUTBGQlFTeFpRVUZoTEVOQlFVRXNSMEZCUVR0TlFVTTFRaXhKUVVGSExGZEJRVmNzUTBGQlF5eExRVUZhTEVOQlFVRXNRMEZCU0R0UlFVTkZMRmRCUVZjc1EwRkJReXhQUVVGYUxFTkJRVUU3VVVGRFFTeFBRVUZQTEVsQlFVTXNRMEZCUVN4WlFVRmhMRU5CUVVFc1IwRkJRU3hGUVVaMlFqdFBRVUZCTEUxQlFVRTdVVUZKUlN4WFFVRlhMRU5CUVVNc1MwRkJXaXhEUVVGclFpeEpRVUZzUWl4RlFVcEdPenRCUVVaR08wVkJURTg3TzNGQ1FXZENWQ3hSUVVGQkxFZEJRVlU3TzNGQ1FVVldMRTlCUVVFc1IwRkJVeXhUUVVGQk8wRkJRMUFzVVVGQlFUdEpRVUZCTEVsQlFWVXNTVUZCUXl4RFFVRkJMRkZCUVZnN1FVRkJRU3hoUVVGQk96dEpRVWRCTEVsQlFVTXNRMEZCUVN4dlFrRkJSQ3hEUVVGQk8wbEJSVUVzVVVGQlVTeERRVUZETEdOQlFWUXNRMEZCZDBJc1NVRkJlRUk3UVVGSFFUdEJRVUZCTEZOQlFVRXNjVU5CUVVFN08wMUJRMFVzU1VGQlF5eERRVUZCTEZsQlFXRXNRMEZCUVN4SFFVRkJMRU5CUVVrc1EwRkJReXhQUVVGdVFpeERRVUZCTzBGQlJFWTdTVUZKUVN4UFFVRlBMRWxCUVVNc1EwRkJRVHRKUVVkU0xFbEJRVU1zUTBGQlFTeFJRVUZFTEVkQlFWazdWMEZIV2l4TlFVRk5MRU5CUVVNc1RVRkJVQ3hEUVVGakxFbEJRV1E3UlVGdVFrOGlmUT09XG4iLCIndXNlIHN0cmljdCc7XG52YXIgQmFja2JvbmUsIENvbnRyb2xsZXIsIEV2ZW50QnJva2VyLCBfLCBtZWRpYXRvciwgdXRpbHMsXG4gIHNsaWNlID0gW10uc2xpY2U7XG5cbl8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbkJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxubWVkaWF0b3IgPSByZXF1aXJlKCcuLi9tZWRpYXRvcicpO1xuXG5FdmVudEJyb2tlciA9IHJlcXVpcmUoJy4uL2xpYi9ldmVudF9icm9rZXInKTtcblxudXRpbHMgPSByZXF1aXJlKCcuLi9saWIvdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVyID0gKGZ1bmN0aW9uKCkge1xuICBDb250cm9sbGVyLmV4dGVuZCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZDtcblxuICBfLmV4dGVuZChDb250cm9sbGVyLnByb3RvdHlwZSwgQmFja2JvbmUuRXZlbnRzKTtcblxuICBfLmV4dGVuZChDb250cm9sbGVyLnByb3RvdHlwZSwgRXZlbnRCcm9rZXIpO1xuXG4gIENvbnRyb2xsZXIucHJvdG90eXBlLnZpZXcgPSBudWxsO1xuXG4gIENvbnRyb2xsZXIucHJvdG90eXBlLnJlZGlyZWN0ZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBDb250cm9sbGVyKCkge1xuICAgIHRoaXMuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgQ29udHJvbGxlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge307XG5cbiAgQ29udHJvbGxlci5wcm90b3R5cGUuYmVmb3JlQWN0aW9uID0gZnVuY3Rpb24oKSB7fTtcblxuICBDb250cm9sbGVyLnByb3RvdHlwZS5hZGp1c3RUaXRsZSA9IGZ1bmN0aW9uKHN1YnRpdGxlKSB7XG4gICAgcmV0dXJuIG1lZGlhdG9yLmV4ZWN1dGUoJ2FkanVzdFRpdGxlJywgc3VidGl0bGUpO1xuICB9O1xuXG4gIENvbnRyb2xsZXIucHJvdG90eXBlLnJldXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG1ldGhvZDtcbiAgICBtZXRob2QgPSBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gJ3JldHJpZXZlJyA6ICdjb21wb3NlJztcbiAgICByZXR1cm4gbWVkaWF0b3IuZXhlY3V0ZS5hcHBseShtZWRpYXRvciwgW1wiY29tcG9zZXI6XCIgKyBtZXRob2RdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgfTtcblxuICBDb250cm9sbGVyLnByb3RvdHlwZS5jb21wb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDb250cm9sbGVyI2NvbXBvc2Ugd2FzIG1vdmVkIHRvIENvbnRyb2xsZXIjcmV1c2UnKTtcbiAgfTtcblxuICBDb250cm9sbGVyLnByb3RvdHlwZS5yZWRpcmVjdFRvID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZWRpcmVjdGVkID0gdHJ1ZTtcbiAgICByZXR1cm4gdXRpbHMucmVkaXJlY3RUby5hcHBseSh1dGlscywgYXJndW1lbnRzKTtcbiAgfTtcblxuICBDb250cm9sbGVyLnByb3RvdHlwZS5kaXNwb3NlZCA9IGZhbHNlO1xuXG4gIENvbnRyb2xsZXIucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaSwga2V5LCBsZW4sIG1lbWJlciwgcmVmO1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlZiA9IE9iamVjdC5rZXlzKHRoaXMpO1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAga2V5ID0gcmVmW2ldO1xuICAgICAgbWVtYmVyID0gdGhpc1trZXldO1xuICAgICAgaWYgKHR5cGVvZiAobWVtYmVyICE9IG51bGwgPyBtZW1iZXIuZGlzcG9zZSA6IHZvaWQgMCkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbWVtYmVyLmRpc3Bvc2UoKTtcbiAgICAgICAgZGVsZXRlIHRoaXNba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy51bnN1YnNjcmliZUFsbEV2ZW50cygpO1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICAgIHJldHVybiBPYmplY3QuZnJlZXplKHRoaXMpO1xuICB9O1xuXG4gIHJldHVybiBDb250cm9sbGVyO1xuXG59KSgpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaVkyOXVkSEp2Ykd4bGNpNXFjeUlzSW5OdmRYSmpaVkp2YjNRaU9pSWlMQ0p6YjNWeVkyVnpJanBiSW1OdmJuUnliMnhzWlhJdVkyOW1abVZsSWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk8wRkJRVUVzU1VGQlFTeHhSRUZCUVR0RlFVRkJPenRCUVVWQkxFTkJRVUVzUjBGQlNTeFBRVUZCTEVOQlFWRXNXVUZCVWpzN1FVRkRTaXhSUVVGQkxFZEJRVmNzVDBGQlFTeERRVUZSTEZWQlFWSTdPMEZCUlZnc1VVRkJRU3hIUVVGWExFOUJRVUVzUTBGQlVTeGhRVUZTT3p0QlFVTllMRmRCUVVFc1IwRkJZeXhQUVVGQkxFTkJRVkVzY1VKQlFWSTdPMEZCUTJRc1MwRkJRU3hIUVVGUkxFOUJRVUVzUTBGQlVTeGpRVUZTT3p0QlFVVlNMRTFCUVUwc1EwRkJReXhQUVVGUUxFZEJRWFZDTzBWQlJYSkNMRlZCUVVNc1EwRkJRU3hOUVVGRUxFZEJRVlVzVVVGQlVTeERRVUZETEV0QlFVc3NRMEZCUXpzN1JVRkhla0lzUTBGQlF5eERRVUZETEUxQlFVWXNRMEZCVXl4VlFVRkRMRU5CUVVFc1UwRkJWaXhGUVVGeFFpeFJRVUZSTEVOQlFVTXNUVUZCT1VJN08wVkJRMEVzUTBGQlF5eERRVUZETEUxQlFVWXNRMEZCVXl4VlFVRkRMRU5CUVVFc1UwRkJWaXhGUVVGeFFpeFhRVUZ5UWpzN2RVSkJSVUVzU1VGQlFTeEhRVUZOT3p0MVFrRkpUaXhWUVVGQkxFZEJRVms3TzBWQlJVTXNiMEpCUVVFN1NVRkRXQ3hKUVVGRExFTkJRVUVzVlVGQlJDeGhRVUZaTEZOQlFWbzdSVUZFVnpzN2RVSkJSMklzVlVGQlFTeEhRVUZaTEZOQlFVRXNSMEZCUVRzN2RVSkJSMW9zV1VGQlFTeEhRVUZqTEZOQlFVRXNSMEZCUVRzN2RVSkJTV1FzVjBGQlFTeEhRVUZoTEZOQlFVTXNVVUZCUkR0WFFVTllMRkZCUVZFc1EwRkJReXhQUVVGVUxFTkJRV2xDTEdGQlFXcENMRVZCUVdkRExGRkJRV2hETzBWQlJGYzdPM1ZDUVZGaUxFdEJRVUVzUjBGQlR5eFRRVUZCTzBGQlEwd3NVVUZCUVR0SlFVRkJMRTFCUVVFc1IwRkJXU3hUUVVGVExFTkJRVU1zVFVGQlZpeExRVUZ2UWl4RFFVRjJRaXhIUVVFNFFpeFZRVUU1UWl4SFFVRTRRenRYUVVOMlJDeFJRVUZSTEVOQlFVTXNUMEZCVkN4cFFrRkJhVUlzUTBGQlFTeFhRVUZCTEVkQlFWa3NUVUZCVlN4VFFVRkJMRmRCUVVFc1UwRkJRU3hEUVVGQkxFTkJRWFpETzBWQlJrczdPM1ZDUVV0UUxFOUJRVUVzUjBGQlV5eFRRVUZCTzBGQlExQXNWVUZCVFN4SlFVRkpMRXRCUVVvc1EwRkJWU3hyUkVGQlZqdEZRVVJET3p0MVFrRlBWQ3hWUVVGQkxFZEJRVmtzVTBGQlFUdEpRVU5XTEVsQlFVTXNRMEZCUVN4VlFVRkVMRWRCUVdNN1YwRkRaQ3hMUVVGTExFTkJRVU1zVlVGQlRpeGpRVUZwUWl4VFFVRnFRanRGUVVaVk96dDFRa0ZQV2l4UlFVRkJMRWRCUVZVN08zVkNRVVZXTEU5QlFVRXNSMEZCVXl4VFFVRkJPMEZCUTFBc1VVRkJRVHRKUVVGQkxFbEJRVlVzU1VGQlF5eERRVUZCTEZGQlFWZzdRVUZCUVN4aFFVRkJPenRCUVVkQk8wRkJRVUVzVTBGQlFTeHhRMEZCUVRzN1RVRkRSU3hOUVVGQkxFZEJRVk1zU1VGQlJTeERRVUZCTEVkQlFVRTdUVUZEV0N4SlFVRkhMSGxDUVVGUExFMUJRVTBzUTBGQlJTeHBRa0ZCWml4TFFVRXdRaXhWUVVFM1FqdFJRVU5GTEUxQlFVMHNRMEZCUXl4UFFVRlFMRU5CUVVFN1VVRkRRU3hQUVVGUExFbEJRVVVzUTBGQlFTeEhRVUZCTEVWQlJsZzdPMEZCUmtZN1NVRlBRU3hKUVVGRExFTkJRVUVzYjBKQlFVUXNRMEZCUVR0SlFVZEJMRWxCUVVNc1EwRkJRU3hoUVVGRUxFTkJRVUU3U1VGSFFTeEpRVUZETEVOQlFVRXNVVUZCUkN4SFFVRlpPMWRCUjFvc1RVRkJUU3hEUVVGRExFMUJRVkFzUTBGQll5eEpRVUZrTzBWQmNFSlBJbjA9XG4iLCIndXNlIHN0cmljdCc7XG52YXIgQmFja2JvbmUsIERpc3BhdGNoZXIsIEV2ZW50QnJva2VyLCBfLCBtZWRpYXRvciwgdXRpbHM7XG5cbl8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbkJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuRXZlbnRCcm9rZXIgPSByZXF1aXJlKCcuL2xpYi9ldmVudF9icm9rZXInKTtcblxudXRpbHMgPSByZXF1aXJlKCcuL2xpYi91dGlscycpO1xuXG5tZWRpYXRvciA9IHJlcXVpcmUoJy4vbWVkaWF0b3InKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEaXNwYXRjaGVyID0gKGZ1bmN0aW9uKCkge1xuICBEaXNwYXRjaGVyLmV4dGVuZCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZDtcblxuICBfLmV4dGVuZChEaXNwYXRjaGVyLnByb3RvdHlwZSwgRXZlbnRCcm9rZXIpO1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLnByZXZpb3VzUm91dGUgPSBudWxsO1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmN1cnJlbnRDb250cm9sbGVyID0gbnVsbDtcblxuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5jdXJyZW50Um91dGUgPSBudWxsO1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmN1cnJlbnRQYXJhbXMgPSBudWxsO1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmN1cnJlbnRRdWVyeSA9IG51bGw7XG5cbiAgZnVuY3Rpb24gRGlzcGF0Y2hlcigpIHtcbiAgICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgPT0gbnVsbCkge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICB0aGlzLnNldHRpbmdzID0gXy5kZWZhdWx0cyhvcHRpb25zLCB7XG4gICAgICBjb250cm9sbGVyUGF0aDogJ2NvbnRyb2xsZXJzLycsXG4gICAgICBjb250cm9sbGVyU3VmZml4OiAnX2NvbnRyb2xsZXInXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuc3Vic2NyaWJlRXZlbnQoJ3JvdXRlcjptYXRjaCcsIHRoaXMuZGlzcGF0Y2gpO1xuICB9O1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoID0gZnVuY3Rpb24ocm91dGUsIHBhcmFtcywgb3B0aW9ucykge1xuICAgIHZhciByZWYsIHJlZjE7XG4gICAgcGFyYW1zID0gXy5leHRlbmQoe30sIHBhcmFtcyk7XG4gICAgb3B0aW9ucyA9IF8uZXh0ZW5kKHt9LCBvcHRpb25zKTtcbiAgICBpZiAob3B0aW9ucy5xdWVyeSA9PSBudWxsKSB7XG4gICAgICBvcHRpb25zLnF1ZXJ5ID0ge307XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmZvcmNlU3RhcnR1cCAhPT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5mb3JjZVN0YXJ0dXAgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFvcHRpb25zLmZvcmNlU3RhcnR1cCAmJiAoKHJlZiA9IHRoaXMuY3VycmVudFJvdXRlKSAhPSBudWxsID8gcmVmLmNvbnRyb2xsZXIgOiB2b2lkIDApID09PSByb3V0ZS5jb250cm9sbGVyICYmICgocmVmMSA9IHRoaXMuY3VycmVudFJvdXRlKSAhPSBudWxsID8gcmVmMS5hY3Rpb24gOiB2b2lkIDApID09PSByb3V0ZS5hY3Rpb24gJiYgXy5pc0VxdWFsKHRoaXMuY3VycmVudFBhcmFtcywgcGFyYW1zKSAmJiBfLmlzRXF1YWwodGhpcy5jdXJyZW50UXVlcnksIG9wdGlvbnMucXVlcnkpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxvYWRDb250cm9sbGVyKHJvdXRlLmNvbnRyb2xsZXIsIChmdW5jdGlvbihfdGhpcykge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKENvbnRyb2xsZXIpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLmNvbnRyb2xsZXJMb2FkZWQocm91dGUsIHBhcmFtcywgb3B0aW9ucywgQ29udHJvbGxlcik7XG4gICAgICB9O1xuICAgIH0pKHRoaXMpKTtcbiAgfTtcblxuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5sb2FkQ29udHJvbGxlciA9IGZ1bmN0aW9uKG5hbWUsIGhhbmRsZXIpIHtcbiAgICB2YXIgZmlsZU5hbWUsIG1vZHVsZU5hbWU7XG4gICAgaWYgKG5hbWUgPT09IE9iamVjdChuYW1lKSkge1xuICAgICAgcmV0dXJuIGhhbmRsZXIobmFtZSk7XG4gICAgfVxuICAgIGZpbGVOYW1lID0gbmFtZSArIHRoaXMuc2V0dGluZ3MuY29udHJvbGxlclN1ZmZpeDtcbiAgICBtb2R1bGVOYW1lID0gdGhpcy5zZXR0aW5ncy5jb250cm9sbGVyUGF0aCArIGZpbGVOYW1lO1xuICAgIHJldHVybiB1dGlscy5sb2FkTW9kdWxlKG1vZHVsZU5hbWUsIGhhbmRsZXIpO1xuICB9O1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmNvbnRyb2xsZXJMb2FkZWQgPSBmdW5jdGlvbihyb3V0ZSwgcGFyYW1zLCBvcHRpb25zLCBDb250cm9sbGVyKSB7XG4gICAgdmFyIGNvbnRyb2xsZXIsIHByZXYsIHByZXZpb3VzO1xuICAgIGlmICh0aGlzLm5leHRQcmV2aW91c1JvdXRlID0gdGhpcy5jdXJyZW50Um91dGUpIHtcbiAgICAgIHByZXZpb3VzID0gXy5leHRlbmQoe30sIHRoaXMubmV4dFByZXZpb3VzUm91dGUpO1xuICAgICAgaWYgKHRoaXMuY3VycmVudFBhcmFtcyAhPSBudWxsKSB7XG4gICAgICAgIHByZXZpb3VzLnBhcmFtcyA9IHRoaXMuY3VycmVudFBhcmFtcztcbiAgICAgIH1cbiAgICAgIGlmIChwcmV2aW91cy5wcmV2aW91cykge1xuICAgICAgICBkZWxldGUgcHJldmlvdXMucHJldmlvdXM7XG4gICAgICB9XG4gICAgICBwcmV2ID0ge1xuICAgICAgICBwcmV2aW91czogcHJldmlvdXNcbiAgICAgIH07XG4gICAgfVxuICAgIHRoaXMubmV4dEN1cnJlbnRSb3V0ZSA9IF8uZXh0ZW5kKHt9LCByb3V0ZSwgcHJldik7XG4gICAgY29udHJvbGxlciA9IG5ldyBDb250cm9sbGVyKHBhcmFtcywgdGhpcy5uZXh0Q3VycmVudFJvdXRlLCBvcHRpb25zKTtcbiAgICByZXR1cm4gdGhpcy5leGVjdXRlQmVmb3JlQWN0aW9uKGNvbnRyb2xsZXIsIHRoaXMubmV4dEN1cnJlbnRSb3V0ZSwgcGFyYW1zLCBvcHRpb25zKTtcbiAgfTtcblxuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5leGVjdXRlQWN0aW9uID0gZnVuY3Rpb24oY29udHJvbGxlciwgcm91dGUsIHBhcmFtcywgb3B0aW9ucykge1xuICAgIGlmICh0aGlzLmN1cnJlbnRDb250cm9sbGVyKSB7XG4gICAgICB0aGlzLnB1Ymxpc2hFdmVudCgnYmVmb3JlQ29udHJvbGxlckRpc3Bvc2UnLCB0aGlzLmN1cnJlbnRDb250cm9sbGVyKTtcbiAgICAgIHRoaXMuY3VycmVudENvbnRyb2xsZXIuZGlzcG9zZShwYXJhbXMsIHJvdXRlLCBvcHRpb25zKTtcbiAgICB9XG4gICAgdGhpcy5jdXJyZW50Q29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG4gICAgdGhpcy5jdXJyZW50UGFyYW1zID0gXy5leHRlbmQoe30sIHBhcmFtcyk7XG4gICAgdGhpcy5jdXJyZW50UXVlcnkgPSBfLmV4dGVuZCh7fSwgb3B0aW9ucy5xdWVyeSk7XG4gICAgY29udHJvbGxlcltyb3V0ZS5hY3Rpb25dKHBhcmFtcywgcm91dGUsIG9wdGlvbnMpO1xuICAgIGlmIChjb250cm9sbGVyLnJlZGlyZWN0ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucHVibGlzaEV2ZW50KCdkaXNwYXRjaGVyOmRpc3BhdGNoJywgdGhpcy5jdXJyZW50Q29udHJvbGxlciwgcGFyYW1zLCByb3V0ZSwgb3B0aW9ucyk7XG4gIH07XG5cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuZXhlY3V0ZUJlZm9yZUFjdGlvbiA9IGZ1bmN0aW9uKGNvbnRyb2xsZXIsIHJvdXRlLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgYmVmb3JlLCBleGVjdXRlQWN0aW9uLCBwcm9taXNlO1xuICAgIGJlZm9yZSA9IGNvbnRyb2xsZXIuYmVmb3JlQWN0aW9uO1xuICAgIGV4ZWN1dGVBY3Rpb24gPSAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIucmVkaXJlY3RlZCB8fCBfdGhpcy5jdXJyZW50Um91dGUgJiYgcm91dGUgPT09IF90aGlzLmN1cnJlbnRSb3V0ZSkge1xuICAgICAgICAgIF90aGlzLm5leHRQcmV2aW91c1JvdXRlID0gX3RoaXMubmV4dEN1cnJlbnRSb3V0ZSA9IG51bGw7XG4gICAgICAgICAgY29udHJvbGxlci5kaXNwb3NlKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIF90aGlzLnByZXZpb3VzUm91dGUgPSBfdGhpcy5uZXh0UHJldmlvdXNSb3V0ZTtcbiAgICAgICAgX3RoaXMuY3VycmVudFJvdXRlID0gX3RoaXMubmV4dEN1cnJlbnRSb3V0ZTtcbiAgICAgICAgX3RoaXMubmV4dFByZXZpb3VzUm91dGUgPSBfdGhpcy5uZXh0Q3VycmVudFJvdXRlID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIF90aGlzLmV4ZWN1dGVBY3Rpb24oY29udHJvbGxlciwgcm91dGUsIHBhcmFtcywgb3B0aW9ucyk7XG4gICAgICB9O1xuICAgIH0pKHRoaXMpO1xuICAgIGlmICghYmVmb3JlKSB7XG4gICAgICBleGVjdXRlQWN0aW9uKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYmVmb3JlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDb250cm9sbGVyI2JlZm9yZUFjdGlvbjogZnVuY3Rpb24gZXhwZWN0ZWQuICcgKyAnT2xkIG9iamVjdC1saWtlIGZvcm0gaXMgbm90IHN1cHBvcnRlZC4nKTtcbiAgICB9XG4gICAgcHJvbWlzZSA9IGNvbnRyb2xsZXIuYmVmb3JlQWN0aW9uKHBhcmFtcywgcm91dGUsIG9wdGlvbnMpO1xuICAgIGlmICh0eXBlb2YgKHByb21pc2UgIT0gbnVsbCA/IHByb21pc2UudGhlbiA6IHZvaWQgMCkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBwcm9taXNlLnRoZW4oZXhlY3V0ZUFjdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBleGVjdXRlQWN0aW9uKCk7XG4gICAgfVxuICB9O1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3Bvc2VkID0gZmFsc2U7XG5cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMudW5zdWJzY3JpYmVBbGxFdmVudHMoKTtcbiAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgfTtcblxuICByZXR1cm4gRGlzcGF0Y2hlcjtcblxufSkoKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2laR2x6Y0dGMFkyaGxjaTVxY3lJc0luTnZkWEpqWlZKdmIzUWlPaUlpTENKemIzVnlZMlZ6SWpwYkltUnBjM0JoZEdOb1pYSXVZMjltWm1WbElsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lKQlFVRkJPMEZCUVVFc1NVRkJRVHM3UVVGRlFTeERRVUZCTEVkQlFVa3NUMEZCUVN4RFFVRlJMRmxCUVZJN08wRkJRMG9zVVVGQlFTeEhRVUZYTEU5QlFVRXNRMEZCVVN4VlFVRlNPenRCUVVWWUxGZEJRVUVzUjBGQll5eFBRVUZCTEVOQlFWRXNiMEpCUVZJN08wRkJRMlFzUzBGQlFTeEhRVUZSTEU5QlFVRXNRMEZCVVN4aFFVRlNPenRCUVVOU0xGRkJRVUVzUjBGQlZ5eFBRVUZCTEVOQlFWRXNXVUZCVWpzN1FVRkZXQ3hOUVVGTkxFTkJRVU1zVDBGQlVDeEhRVUYxUWp0RlFVVnlRaXhWUVVGRExFTkJRVUVzVFVGQlJDeEhRVUZWTEZGQlFWRXNRMEZCUXl4TFFVRkxMRU5CUVVNN08wVkJSM3BDTEVOQlFVTXNRMEZCUXl4TlFVRkdMRU5CUVZNc1ZVRkJReXhEUVVGQkxGTkJRVllzUlVGQmNVSXNWMEZCY2tJN08zVkNRVWxCTEdGQlFVRXNSMEZCWlRzN2RVSkJTV1lzYVVKQlFVRXNSMEZCYlVJN08zVkNRVU51UWl4WlFVRkJMRWRCUVdNN08zVkNRVU5rTEdGQlFVRXNSMEZCWlRzN2RVSkJRMllzV1VGQlFTeEhRVUZqT3p0RlFVVkVMRzlDUVVGQk8wbEJRMWdzU1VGQlF5eERRVUZCTEZWQlFVUXNZVUZCV1N4VFFVRmFPMFZCUkZjN08zVkNRVWRpTEZWQlFVRXNSMEZCV1N4VFFVRkRMRTlCUVVRN08wMUJRVU1zVlVGQlZUczdTVUZGY2tJc1NVRkJReXhEUVVGQkxGRkJRVVFzUjBGQldTeERRVUZETEVOQlFVTXNVVUZCUml4RFFVRlhMRTlCUVZnc1JVRkRWanROUVVGQkxHTkJRVUVzUlVGQlowSXNZMEZCYUVJN1RVRkRRU3huUWtGQlFTeEZRVUZyUWl4aFFVUnNRanRMUVVSVk8xZEJTMW9zU1VGQlF5eERRVUZCTEdOQlFVUXNRMEZCWjBJc1kwRkJhRUlzUlVGQlowTXNTVUZCUXl4RFFVRkJMRkZCUVdwRE8wVkJVRlU3TzNWQ1FYRkNXaXhSUVVGQkxFZEJRVlVzVTBGQlF5eExRVUZFTEVWQlFWRXNUVUZCVWl4RlFVRm5RaXhQUVVGb1FqdEJRVVZTTEZGQlFVRTdTVUZCUVN4TlFVRkJMRWRCUVZNc1EwRkJReXhEUVVGRExFMUJRVVlzUTBGQlV5eEZRVUZVTEVWQlFXRXNUVUZCWWp0SlFVTlVMRTlCUVVFc1IwRkJWU3hEUVVGRExFTkJRVU1zVFVGQlJpeERRVUZUTEVWQlFWUXNSVUZCWVN4UFFVRmlPMGxCUjFZc1NVRkJNRUlzY1VKQlFURkNPMDFCUVVFc1QwRkJUeXhEUVVGRExFdEJRVklzUjBGQlowSXNSMEZCYUVJN08wbEJTMEVzU1VGQmIwTXNUMEZCVHl4RFFVRkRMRmxCUVZJc1MwRkJkMElzU1VGQk5VUTdUVUZCUVN4UFFVRlBMRU5CUVVNc1dVRkJVaXhIUVVGMVFpeE5RVUYyUWpzN1NVRkpRU3hKUVVGVkxFTkJRVWtzVDBGQlR5eERRVUZETEZsQlFWb3NORU5CUTBzc1EwRkJSU3h2UWtGQlppeExRVUUyUWl4TFFVRkxMRU5CUVVNc1ZVRkVNMElzT0VOQlJVc3NRMEZCUlN4blFrRkJaaXhMUVVGNVFpeExRVUZMTEVOQlFVTXNUVUZHZGtJc1NVRkhVaXhEUVVGRExFTkJRVU1zVDBGQlJpeERRVUZWTEVsQlFVTXNRMEZCUVN4aFFVRllMRVZCUVRCQ0xFMUJRVEZDTEVOQlNGRXNTVUZKVWl4RFFVRkRMRU5CUVVNc1QwRkJSaXhEUVVGVkxFbEJRVU1zUTBGQlFTeFpRVUZZTEVWQlFYbENMRTlCUVU4c1EwRkJReXhMUVVGcVF5eERRVXBHTzBGQlFVRXNZVUZCUVRzN1YwRlBRU3hKUVVGRExFTkJRVUVzWTBGQlJDeERRVUZuUWl4TFFVRkxMRU5CUVVNc1ZVRkJkRUlzUlVGQmEwTXNRMEZCUVN4VFFVRkJMRXRCUVVFN1lVRkJRU3hUUVVGRExGVkJRVVE3WlVGRGFFTXNTMEZCUXl4RFFVRkJMR2RDUVVGRUxFTkJRV3RDTEV0QlFXeENMRVZCUVhsQ0xFMUJRWHBDTEVWQlFXbERMRTlCUVdwRExFVkJRVEJETEZWQlFURkRPMDFCUkdkRE8wbEJRVUVzUTBGQlFTeERRVUZCTEVOQlFVRXNTVUZCUVN4RFFVRnNRenRGUVhSQ1VUczdkVUpCTUVKV0xHTkJRVUVzUjBGQlowSXNVMEZCUXl4SlFVRkVMRVZCUVU4c1QwRkJVRHRCUVVOa0xGRkJRVUU3U1VGQlFTeEpRVUYxUWl4SlFVRkJMRXRCUVZFc1RVRkJRU3hEUVVGUExFbEJRVkFzUTBGQkwwSTdRVUZCUVN4aFFVRlBMRTlCUVVFc1EwRkJVU3hKUVVGU0xFVkJRVkE3TzBsQlJVRXNVVUZCUVN4SFFVRlhMRWxCUVVFc1IwRkJUeXhKUVVGRExFTkJRVUVzVVVGQlVTeERRVUZETzBsQlF6VkNMRlZCUVVFc1IwRkJZU3hKUVVGRExFTkJRVUVzVVVGQlVTeERRVUZETEdOQlFWWXNSMEZCTWtJN1YwRkRlRU1zUzBGQlN5eERRVUZETEZWQlFVNHNRMEZCYVVJc1ZVRkJha0lzUlVGQk5rSXNUMEZCTjBJN1JVRk1ZenM3ZFVKQlVXaENMR2RDUVVGQkxFZEJRV3RDTEZOQlFVTXNTMEZCUkN4RlFVRlJMRTFCUVZJc1JVRkJaMElzVDBGQmFFSXNSVUZCZVVJc1ZVRkJla0k3UVVGRGFFSXNVVUZCUVR0SlFVRkJMRWxCUVVjc1NVRkJReXhEUVVGQkxHbENRVUZFTEVkQlFYRkNMRWxCUVVNc1EwRkJRU3haUVVGNlFqdE5RVU5GTEZGQlFVRXNSMEZCVnl4RFFVRkRMRU5CUVVNc1RVRkJSaXhEUVVGVExFVkJRVlFzUlVGQllTeEpRVUZETEVOQlFVRXNhVUpCUVdRN1RVRkRXQ3hKUVVGdlF5d3dRa0ZCY0VNN1VVRkJRU3hSUVVGUkxFTkJRVU1zVFVGQlZDeEhRVUZyUWl4SlFVRkRMRU5CUVVFc1kwRkJia0k3TzAxQlEwRXNTVUZCTkVJc1VVRkJVU3hEUVVGRExGRkJRWEpETzFGQlFVRXNUMEZCVHl4UlFVRlJMRU5CUVVNc1UwRkJhRUk3TzAxQlEwRXNTVUZCUVN4SFFVRlBPMUZCUVVNc1ZVRkJRU3hSUVVGRU8xRkJTbFE3TzBsQlMwRXNTVUZCUXl4RFFVRkJMR2RDUVVGRUxFZEJRVzlDTEVOQlFVTXNRMEZCUXl4TlFVRkdMRU5CUVZNc1JVRkJWQ3hGUVVGaExFdEJRV0lzUlVGQmIwSXNTVUZCY0VJN1NVRkZjRUlzVlVGQlFTeEhRVUZoTEVsQlFVa3NWVUZCU2l4RFFVRmxMRTFCUVdZc1JVRkJkVUlzU1VGQlF5eERRVUZCTEdkQ1FVRjRRaXhGUVVFd1F5eFBRVUV4UXp0WFFVTmlMRWxCUVVNc1EwRkJRU3h0UWtGQlJDeERRVUZ4UWl4VlFVRnlRaXhGUVVGcFF5eEpRVUZETEVOQlFVRXNaMEpCUVd4RExFVkJRVzlFTEUxQlFYQkVMRVZCUVRSRUxFOUJRVFZFTzBWQlZHZENPenQxUWtGWmJFSXNZVUZCUVN4SFFVRmxMRk5CUVVNc1ZVRkJSQ3hGUVVGaExFdEJRV0lzUlVGQmIwSXNUVUZCY0VJc1JVRkJORUlzVDBGQk5VSTdTVUZGWWl4SlFVRkhMRWxCUVVNc1EwRkJRU3hwUWtGQlNqdE5RVVZGTEVsQlFVTXNRMEZCUVN4WlFVRkVMRU5CUVdNc2VVSkJRV1FzUlVGQmVVTXNTVUZCUXl4RFFVRkJMR2xDUVVFeFF6dE5RVWRCTEVsQlFVTXNRMEZCUVN4cFFrRkJhVUlzUTBGQlF5eFBRVUZ1UWl4RFFVRXlRaXhOUVVFelFpeEZRVUZ0UXl4TFFVRnVReXhGUVVFd1F5eFBRVUV4UXl4RlFVeEdPenRKUVZGQkxFbEJRVU1zUTBGQlFTeHBRa0ZCUkN4SFFVRnhRanRKUVVOeVFpeEpRVUZETEVOQlFVRXNZVUZCUkN4SFFVRnBRaXhEUVVGRExFTkJRVU1zVFVGQlJpeERRVUZUTEVWQlFWUXNSVUZCWVN4TlFVRmlPMGxCUTJwQ0xFbEJRVU1zUTBGQlFTeFpRVUZFTEVkQlFXZENMRU5CUVVNc1EwRkJReXhOUVVGR0xFTkJRVk1zUlVGQlZDeEZRVUZoTEU5QlFVOHNRMEZCUXl4TFFVRnlRanRKUVVkb1FpeFZRVUZYTEVOQlFVRXNTMEZCU3l4RFFVRkRMRTFCUVU0c1EwRkJXQ3hEUVVGNVFpeE5RVUY2UWl4RlFVRnBReXhMUVVGcVF5eEZRVUYzUXl4UFFVRjRRenRKUVVkQkxFbEJRVlVzVlVGQlZTeERRVUZETEZWQlFYSkNPMEZCUVVFc1lVRkJRVHM3VjBGSFFTeEpRVUZETEVOQlFVRXNXVUZCUkN4RFFVRmpMSEZDUVVGa0xFVkJRWEZETEVsQlFVTXNRMEZCUVN4cFFrRkJkRU1zUlVGRFJTeE5RVVJHTEVWQlExVXNTMEZFVml4RlFVTnBRaXhQUVVScVFqdEZRWEpDWVRzN2RVSkJlVUptTEcxQ1FVRkJMRWRCUVhGQ0xGTkJRVU1zVlVGQlJDeEZRVUZoTEV0QlFXSXNSVUZCYjBJc1RVRkJjRUlzUlVGQk5FSXNUMEZCTlVJN1FVRkRia0lzVVVGQlFUdEpRVUZCTEUxQlFVRXNSMEZCVXl4VlFVRlZMRU5CUVVNN1NVRkZjRUlzWVVGQlFTeEhRVUZuUWl4RFFVRkJMRk5CUVVFc1MwRkJRVHRoUVVGQkxGTkJRVUU3VVVGRFpDeEpRVUZITEZWQlFWVXNRMEZCUXl4VlFVRllMRWxCUVhsQ0xFdEJRVU1zUTBGQlFTeFpRVUZFTEVsQlFXdENMRXRCUVVFc1MwRkJVeXhMUVVGRExFTkJRVUVzV1VGQmVFUTdWVUZEUlN4TFFVRkRMRU5CUVVFc2FVSkJRVVFzUjBGQmNVSXNTMEZCUXl4RFFVRkJMR2RDUVVGRUxFZEJRVzlDTzFWQlEzcERMRlZCUVZVc1EwRkJReXhQUVVGWUxFTkJRVUU3UVVGRFFTeHBRa0ZJUmpzN1VVRkpRU3hMUVVGRExFTkJRVUVzWVVGQlJDeEhRVUZwUWl4TFFVRkRMRU5CUVVFN1VVRkRiRUlzUzBGQlF5eERRVUZCTEZsQlFVUXNSMEZCWjBJc1MwRkJReXhEUVVGQk8xRkJRMnBDTEV0QlFVTXNRMEZCUVN4cFFrRkJSQ3hIUVVGeFFpeExRVUZETEVOQlFVRXNaMEpCUVVRc1IwRkJiMEk3WlVGRGVrTXNTMEZCUXl4RFFVRkJMR0ZCUVVRc1EwRkJaU3hWUVVGbUxFVkJRVEpDTEV0QlFUTkNMRVZCUVd0RExFMUJRV3hETEVWQlFUQkRMRTlCUVRGRE8wMUJVbU03U1VGQlFTeERRVUZCTEVOQlFVRXNRMEZCUVN4SlFVRkJPMGxCVldoQ0xFbEJRVUVzUTBGQlR5eE5RVUZRTzAxQlEwVXNZVUZCUVN4RFFVRkJPMEZCUTBFc1lVRkdSanM3U1VGTFFTeEpRVUZITEU5QlFVOHNUVUZCVUN4TFFVRnRRaXhWUVVGMFFqdEJRVU5GTEZsQlFVMHNTVUZCU1N4VFFVRktMRU5CUVdNc09FTkJRVUVzUjBGRGJFSXNkME5CUkVrc1JVRkVVanM3U1VGTFFTeFBRVUZCTEVkQlFWVXNWVUZCVlN4RFFVRkRMRmxCUVZnc1EwRkJkMElzVFVGQmVFSXNSVUZCWjBNc1MwRkJhRU1zUlVGQmRVTXNUMEZCZGtNN1NVRkRWaXhKUVVGSExEQkNRVUZQTEU5QlFVOHNRMEZCUlN4alFVRm9RaXhMUVVGM1FpeFZRVUV6UWp0aFFVTkZMRTlCUVU4c1EwRkJReXhKUVVGU0xFTkJRV0VzWVVGQllpeEZRVVJHTzB0QlFVRXNUVUZCUVR0aFFVZEZMR0ZCUVVFc1EwRkJRU3hGUVVoR096dEZRWGhDYlVJN08zVkNRV2REY2tJc1VVRkJRU3hIUVVGVk96dDFRa0ZGVml4UFFVRkJMRWRCUVZNc1UwRkJRVHRKUVVOUUxFbEJRVlVzU1VGQlF5eERRVUZCTEZGQlFWZzdRVUZCUVN4aFFVRkJPenRKUVVWQkxFbEJRVU1zUTBGQlFTeHZRa0ZCUkN4RFFVRkJPMGxCUlVFc1NVRkJReXhEUVVGQkxGRkJRVVFzUjBGQldUdFhRVWRhTEUxQlFVMHNRMEZCUXl4TlFVRlFMRU5CUVdNc1NVRkJaRHRGUVZKUEluMD1cbiIsIid1c2Ugc3RyaWN0JztcbnZhciBCYWNrYm9uZSwgQ29tcG9zaXRpb24sIEV2ZW50QnJva2VyLCBfO1xuXG5fID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG5CYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbkV2ZW50QnJva2VyID0gcmVxdWlyZSgnLi9ldmVudF9icm9rZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb3NpdGlvbiA9IChmdW5jdGlvbigpIHtcbiAgQ29tcG9zaXRpb24uZXh0ZW5kID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kO1xuXG4gIF8uZXh0ZW5kKENvbXBvc2l0aW9uLnByb3RvdHlwZSwgQmFja2JvbmUuRXZlbnRzKTtcblxuICBfLmV4dGVuZChDb21wb3NpdGlvbi5wcm90b3R5cGUsIEV2ZW50QnJva2VyKTtcblxuICBDb21wb3NpdGlvbi5wcm90b3R5cGUuaXRlbSA9IG51bGw7XG5cbiAgQ29tcG9zaXRpb24ucHJvdG90eXBlLm9wdGlvbnMgPSBudWxsO1xuXG4gIENvbXBvc2l0aW9uLnByb3RvdHlwZS5fc3RhbGUgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBDb21wb3NpdGlvbihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gXy5leHRlbmQoe30sIG9wdGlvbnMpO1xuICAgIHRoaXMuaXRlbSA9IHRoaXM7XG4gICAgdGhpcy5pbml0aWFsaXplKHRoaXMub3B0aW9ucyk7XG4gIH1cblxuICBDb21wb3NpdGlvbi5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge307XG5cbiAgQ29tcG9zaXRpb24ucHJvdG90eXBlLmNvbXBvc2UgPSBmdW5jdGlvbigpIHt9O1xuXG4gIENvbXBvc2l0aW9uLnByb3RvdHlwZS5jaGVjayA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gXy5pc0VxdWFsKHRoaXMub3B0aW9ucywgb3B0aW9ucyk7XG4gIH07XG5cbiAgQ29tcG9zaXRpb24ucHJvdG90eXBlLnN0YWxlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgaXRlbSwgbmFtZSwgcmVmO1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fc3RhbGU7XG4gICAgfVxuICAgIHRoaXMuX3N0YWxlID0gdmFsdWU7XG4gICAgcmVmID0gdGhpcztcbiAgICBmb3IgKG5hbWUgaW4gcmVmKSB7XG4gICAgICBpdGVtID0gcmVmW25hbWVdO1xuICAgICAgaWYgKGl0ZW0gJiYgaXRlbSAhPT0gdGhpcyAmJiB0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcgJiYgaXRlbS5oYXNPd25Qcm9wZXJ0eSgnc3RhbGUnKSkge1xuICAgICAgICBpdGVtLnN0YWxlID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIENvbXBvc2l0aW9uLnByb3RvdHlwZS5kaXNwb3NlZCA9IGZhbHNlO1xuXG4gIENvbXBvc2l0aW9uLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGksIGtleSwgbGVuLCBtZW1iZXIsIHJlZjtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZWYgPSBPYmplY3Qua2V5cyh0aGlzKTtcbiAgICBmb3IgKGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGtleSA9IHJlZltpXTtcbiAgICAgIG1lbWJlciA9IHRoaXNba2V5XTtcbiAgICAgIGlmIChtZW1iZXIgJiYgbWVtYmVyICE9PSB0aGlzICYmIHR5cGVvZiBtZW1iZXIuZGlzcG9zZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBtZW1iZXIuZGlzcG9zZSgpO1xuICAgICAgICBkZWxldGUgdGhpc1trZXldO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnVuc3Vic2NyaWJlQWxsRXZlbnRzKCk7XG4gICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgZGVsZXRlIHRoaXMucmVkaXJlY3RlZDtcbiAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgfTtcblxuICByZXR1cm4gQ29tcG9zaXRpb247XG5cbn0pKCk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pWTI5dGNHOXphWFJwYjI0dWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGN5STZXeUpqYjIxd2IzTnBkR2x2Ymk1amIyWm1aV1VpWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJa0ZCUVVFN1FVRkJRU3hKUVVGQk96dEJRVVZCTEVOQlFVRXNSMEZCU1N4UFFVRkJMRU5CUVZFc1dVRkJVanM3UVVGRFNpeFJRVUZCTEVkQlFWY3NUMEZCUVN4RFFVRlJMRlZCUVZJN08wRkJRMWdzVjBGQlFTeEhRVUZqTEU5QlFVRXNRMEZCVVN4blFrRkJVanM3UVVGVFpDeE5RVUZOTEVOQlFVTXNUMEZCVUN4SFFVRjFRanRGUVVWeVFpeFhRVUZETEVOQlFVRXNUVUZCUkN4SFFVRlZMRkZCUVZFc1EwRkJReXhMUVVGTExFTkJRVU03TzBWQlIzcENMRU5CUVVNc1EwRkJReXhOUVVGR0xFTkJRVk1zVjBGQlF5eERRVUZCTEZOQlFWWXNSVUZCY1VJc1VVRkJVU3hEUVVGRExFMUJRVGxDT3p0RlFVTkJMRU5CUVVNc1EwRkJReXhOUVVGR0xFTkJRVk1zVjBGQlF5eERRVUZCTEZOQlFWWXNSVUZCY1VJc1YwRkJja0k3TzNkQ1FVZEJMRWxCUVVFc1IwRkJUVHM3ZDBKQlIwNHNUMEZCUVN4SFFVRlRPenQzUWtGSFZDeE5RVUZCTEVkQlFWRTdPMFZCUlVzc2NVSkJRVU1zVDBGQlJEdEpRVU5ZTEVsQlFVTXNRMEZCUVN4UFFVRkVMRWRCUVZjc1EwRkJReXhEUVVGRExFMUJRVVlzUTBGQlV5eEZRVUZVTEVWQlFXRXNUMEZCWWp0SlFVTllMRWxCUVVNc1EwRkJRU3hKUVVGRUxFZEJRVkU3U1VGRFVpeEpRVUZETEVOQlFVRXNWVUZCUkN4RFFVRlpMRWxCUVVNc1EwRkJRU3hQUVVGaU8wVkJTRmM3TzNkQ1FVdGlMRlZCUVVFc1IwRkJXU3hUUVVGQkxFZEJRVUU3TzNkQ1FVbGFMRTlCUVVFc1IwRkJVeXhUUVVGQkxFZEJRVUU3TzNkQ1FVMVVMRXRCUVVFc1IwRkJUeXhUUVVGRExFOUJRVVE3VjBGRFRDeERRVUZETEVOQlFVTXNUMEZCUml4RFFVRlZMRWxCUVVNc1EwRkJRU3hQUVVGWUxFVkJRVzlDTEU5QlFYQkNPMFZCUkVzN08zZENRVWxRTEV0QlFVRXNSMEZCVHl4VFFVRkRMRXRCUVVRN1FVRkZUQ3hSUVVGQk8wbEJRVUVzU1VGQmMwSXNZVUZCZEVJN1FVRkJRU3hoUVVGUExFbEJRVU1zUTBGQlFTeFBRVUZTT3p0SlFVZEJMRWxCUVVNc1EwRkJRU3hOUVVGRUxFZEJRVlU3UVVGRFZqdEJRVUZCTEZOQlFVRXNWMEZCUVRzN1ZVRkRSU3hKUVVGQkxFbEJRVk1zU1VGQlFTeExRVUZWTEVsQlFXNUNMRWxCUTBFc1QwRkJUeXhKUVVGUUxFdEJRV1VzVVVGRVppeEpRVU0wUWl4SlFVRkpMRU5CUVVNc1kwRkJUQ3hEUVVGdlFpeFBRVUZ3UWp0UlFVVTFRaXhKUVVGSkxFTkJRVU1zUzBGQlRDeEhRVUZoT3p0QlFVcG1PMFZCVGtzN08zZENRV3RDVUN4UlFVRkJMRWRCUVZVN08zZENRVVZXTEU5QlFVRXNSMEZCVXl4VFFVRkJPMEZCUTFBc1VVRkJRVHRKUVVGQkxFbEJRVlVzU1VGQlF5eERRVUZCTEZGQlFWZzdRVUZCUVN4aFFVRkJPenRCUVVkQk8wRkJRVUVzVTBGQlFTeHhRMEZCUVRzN1RVRkRSU3hOUVVGQkxFZEJRVk1zU1VGQlJTeERRVUZCTEVkQlFVRTdUVUZEV0N4SlFVRkhMRTFCUVVFc1NVRkJWeXhOUVVGQkxFdEJRVmtzU1VGQmRrSXNTVUZEU0N4UFFVRlBMRTFCUVUwc1EwRkJReXhQUVVGa0xFdEJRWGxDTEZWQlJIcENPMUZCUlVVc1RVRkJUU3hEUVVGRExFOUJRVkFzUTBGQlFUdFJRVU5CTEU5QlFVOHNTVUZCUlN4RFFVRkJMRWRCUVVFc1JVRklXRHM3UVVGR1JqdEpRVkZCTEVsQlFVTXNRMEZCUVN4dlFrRkJSQ3hEUVVGQk8wbEJSMEVzU1VGQlF5eERRVUZCTEdGQlFVUXNRMEZCUVR0SlFVZEJMRTlCUVU4c1NVRkJTU3hEUVVGRE8wbEJSMW9zU1VGQlF5eERRVUZCTEZGQlFVUXNSMEZCV1R0WFFVZGFMRTFCUVUwc1EwRkJReXhOUVVGUUxFTkJRV01zU1VGQlpEdEZRWGhDVHlKOVxuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIEV2ZW50QnJva2VyLCBtZWRpYXRvcixcbiAgc2xpY2UgPSBbXS5zbGljZTtcblxubWVkaWF0b3IgPSByZXF1aXJlKCcuLi9tZWRpYXRvcicpO1xuXG5FdmVudEJyb2tlciA9IHtcbiAgc3Vic2NyaWJlRXZlbnQ6IGZ1bmN0aW9uKHR5cGUsIGhhbmRsZXIpIHtcbiAgICBpZiAodHlwZW9mIHR5cGUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFdmVudEJyb2tlciNzdWJzY3JpYmVFdmVudDogJyArICd0eXBlIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFdmVudEJyb2tlciNzdWJzY3JpYmVFdmVudDogJyArICdoYW5kbGVyIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cbiAgICBtZWRpYXRvci51bnN1YnNjcmliZSh0eXBlLCBoYW5kbGVyLCB0aGlzKTtcbiAgICByZXR1cm4gbWVkaWF0b3Iuc3Vic2NyaWJlKHR5cGUsIGhhbmRsZXIsIHRoaXMpO1xuICB9LFxuICBzdWJzY3JpYmVFdmVudE9uY2U6IGZ1bmN0aW9uKHR5cGUsIGhhbmRsZXIpIHtcbiAgICBpZiAodHlwZW9mIHR5cGUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFdmVudEJyb2tlciNzdWJzY3JpYmVFdmVudE9uY2U6ICcgKyAndHlwZSBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgaGFuZGxlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXZlbnRCcm9rZXIjc3Vic2NyaWJlRXZlbnRPbmNlOiAnICsgJ2hhbmRsZXIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIG1lZGlhdG9yLnVuc3Vic2NyaWJlKHR5cGUsIGhhbmRsZXIsIHRoaXMpO1xuICAgIHJldHVybiBtZWRpYXRvci5zdWJzY3JpYmVPbmNlKHR5cGUsIGhhbmRsZXIsIHRoaXMpO1xuICB9LFxuICB1bnN1YnNjcmliZUV2ZW50OiBmdW5jdGlvbih0eXBlLCBoYW5kbGVyKSB7XG4gICAgaWYgKHR5cGVvZiB0eXBlICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXZlbnRCcm9rZXIjdW5zdWJzY3JpYmVFdmVudDogJyArICd0eXBlIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFdmVudEJyb2tlciN1bnN1YnNjcmliZUV2ZW50OiAnICsgJ2hhbmRsZXIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHJldHVybiBtZWRpYXRvci51bnN1YnNjcmliZSh0eXBlLCBoYW5kbGVyKTtcbiAgfSxcbiAgdW5zdWJzY3JpYmVBbGxFdmVudHM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBtZWRpYXRvci51bnN1YnNjcmliZShudWxsLCBudWxsLCB0aGlzKTtcbiAgfSxcbiAgcHVibGlzaEV2ZW50OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncywgdHlwZTtcbiAgICB0eXBlID0gYXJndW1lbnRzWzBdLCBhcmdzID0gMiA8PSBhcmd1bWVudHMubGVuZ3RoID8gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpIDogW107XG4gICAgaWYgKHR5cGVvZiB0eXBlICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXZlbnRCcm9rZXIjcHVibGlzaEV2ZW50OiAnICsgJ3R5cGUgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgIH1cbiAgICByZXR1cm4gbWVkaWF0b3IucHVibGlzaC5hcHBseShtZWRpYXRvciwgW3R5cGVdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3MpKSk7XG4gIH1cbn07XG5cbk9iamVjdC5mcmVlemUoRXZlbnRCcm9rZXIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50QnJva2VyO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaVpYWmxiblJmWW5KdmEyVnlMbXB6SWl3aWMyOTFjbU5sVW05dmRDSTZJaUlzSW5OdmRYSmpaWE1pT2xzaVpYWmxiblJmWW5KdmEyVnlMbU52Wm1abFpTSmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaVFVRkJRVHRCUVVGQkxFbEJRVUVzY1VKQlFVRTdSVUZCUVRzN1FVRkZRU3hSUVVGQkxFZEJRVmNzVDBGQlFTeERRVUZSTEdGQlFWSTdPMEZCWTFnc1YwRkJRU3hIUVVORk8wVkJRVUVzWTBGQlFTeEZRVUZuUWl4VFFVRkRMRWxCUVVRc1JVRkJUeXhQUVVGUU8wbEJRMlFzU1VGQlJ5eFBRVUZQTEVsQlFWQXNTMEZCYVVJc1VVRkJjRUk3UVVGRFJTeFpRVUZOTEVsQlFVa3NVMEZCU2l4RFFVRmpMRGhDUVVGQkxFZEJRMnhDTEdkRFFVUkpMRVZCUkZJN08wbEJSMEVzU1VGQlJ5eFBRVUZQTEU5QlFWQXNTMEZCYjBJc1ZVRkJka0k3UVVGRFJTeFpRVUZOTEVsQlFVa3NVMEZCU2l4RFFVRmpMRGhDUVVGQkxFZEJRMnhDTEhGRFFVUkpMRVZCUkZJN08wbEJTMEVzVVVGQlVTeERRVUZETEZkQlFWUXNRMEZCY1VJc1NVRkJja0lzUlVGQk1rSXNUMEZCTTBJc1JVRkJiME1zU1VGQmNFTTdWMEZIUVN4UlFVRlJMRU5CUVVNc1UwRkJWQ3hEUVVGdFFpeEpRVUZ1UWl4RlFVRjVRaXhQUVVGNlFpeEZRVUZyUXl4SlFVRnNRenRGUVZwakxFTkJRV2hDTzBWQlkwRXNhMEpCUVVFc1JVRkJiMElzVTBGQlF5eEpRVUZFTEVWQlFVOHNUMEZCVUR0SlFVTnNRaXhKUVVGSExFOUJRVThzU1VGQlVDeExRVUZwUWl4UlFVRndRanRCUVVORkxGbEJRVTBzU1VGQlNTeFRRVUZLTEVOQlFXTXNhME5CUVVFc1IwRkRiRUlzWjBOQlJFa3NSVUZFVWpzN1NVRkhRU3hKUVVGSExFOUJRVThzVDBGQlVDeExRVUZ2UWl4VlFVRjJRanRCUVVORkxGbEJRVTBzU1VGQlNTeFRRVUZLTEVOQlFXTXNhME5CUVVFc1IwRkRiRUlzY1VOQlJFa3NSVUZFVWpzN1NVRkxRU3hSUVVGUkxFTkJRVU1zVjBGQlZDeERRVUZ4UWl4SlFVRnlRaXhGUVVFeVFpeFBRVUV6UWl4RlFVRnZReXhKUVVGd1F6dFhRVWRCTEZGQlFWRXNRMEZCUXl4aFFVRlVMRU5CUVhWQ0xFbEJRWFpDTEVWQlFUWkNMRTlCUVRkQ0xFVkJRWE5ETEVsQlFYUkRPMFZCV210Q0xFTkJaSEJDTzBWQk5FSkJMR2RDUVVGQkxFVkJRV3RDTEZOQlFVTXNTVUZCUkN4RlFVRlBMRTlCUVZBN1NVRkRhRUlzU1VGQlJ5eFBRVUZQTEVsQlFWQXNTMEZCYVVJc1VVRkJjRUk3UVVGRFJTeFpRVUZOTEVsQlFVa3NVMEZCU2l4RFFVRmpMR2REUVVGQkxFZEJRMnhDTEdkRFFVUkpMRVZCUkZJN08wbEJSMEVzU1VGQlJ5eFBRVUZQTEU5QlFWQXNTMEZCYjBJc1ZVRkJka0k3UVVGRFJTeFpRVUZOTEVsQlFVa3NVMEZCU2l4RFFVRmpMR2REUVVGQkxFZEJRMnhDTEhGRFFVUkpMRVZCUkZJN08xZEJTMEVzVVVGQlVTeERRVUZETEZkQlFWUXNRMEZCY1VJc1NVRkJja0lzUlVGQk1rSXNUMEZCTTBJN1JVRlVaMElzUTBFMVFteENPMFZCZDBOQkxHOUNRVUZCTEVWQlFYTkNMRk5CUVVFN1YwRkZjRUlzVVVGQlVTeERRVUZETEZkQlFWUXNRMEZCY1VJc1NVRkJja0lzUlVGQk1rSXNTVUZCTTBJc1JVRkJhVU1zU1VGQmFrTTdSVUZHYjBJc1EwRjRRM1JDTzBWQk5FTkJMRmxCUVVFc1JVRkJZeXhUUVVGQk8wRkJRMW9zVVVGQlFUdEpRVVJoTEhGQ1FVRk5PMGxCUTI1Q0xFbEJRVWNzVDBGQlR5eEpRVUZRTEV0QlFXbENMRkZCUVhCQ08wRkJRMFVzV1VGQlRTeEpRVUZKTEZOQlFVb3NRMEZCWXl3MFFrRkJRU3hIUVVOc1FpeG5RMEZFU1N4RlFVUlNPenRYUVV0QkxGRkJRVkVzUTBGQlF5eFBRVUZVTEdsQ1FVRnBRaXhEUVVGQkxFbEJRVTBzVTBGQlFTeFhRVUZCTEVsQlFVRXNRMEZCUVN4RFFVRjJRanRGUVU1WkxFTkJOVU5rT3pzN1FVRnhSRVlzVFVGQlRTeERRVUZETEUxQlFWQXNRMEZCWXl4WFFVRmtPenRCUVVkQkxFMUJRVTBzUTBGQlF5eFBRVUZRTEVkQlFXbENJbjA9XG4iLCIndXNlIHN0cmljdCc7XG52YXIgQmFja2JvbmUsIEhpc3RvcnksIF8sIHJvb3RTdHJpcHBlciwgcm91dGVTdHJpcHBlcixcbiAgZXh0ZW5kID0gZnVuY3Rpb24oY2hpbGQsIHBhcmVudCkgeyBmb3IgKHZhciBrZXkgaW4gcGFyZW50KSB7IGlmIChoYXNQcm9wLmNhbGwocGFyZW50LCBrZXkpKSBjaGlsZFtrZXldID0gcGFyZW50W2tleV07IH0gZnVuY3Rpb24gY3RvcigpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9IGN0b3IucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTsgY2hpbGQucHJvdG90eXBlID0gbmV3IGN0b3IoKTsgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTsgcmV0dXJuIGNoaWxkOyB9LFxuICBoYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHk7XG5cbl8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbkJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxucm91dGVTdHJpcHBlciA9IC9eWyNcXC9dfFxccyskL2c7XG5cbnJvb3RTdHJpcHBlciA9IC9eXFwvK3xcXC8rJC9nO1xuXG5IaXN0b3J5ID0gKGZ1bmN0aW9uKHN1cGVyQ2xhc3MpIHtcbiAgZXh0ZW5kKEhpc3RvcnksIHN1cGVyQ2xhc3MpO1xuXG4gIGZ1bmN0aW9uIEhpc3RvcnkoKSB7XG4gICAgcmV0dXJuIEhpc3RvcnkuX19zdXBlcl9fLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICBIaXN0b3J5LnByb3RvdHlwZS5nZXRGcmFnbWVudCA9IGZ1bmN0aW9uKGZyYWdtZW50LCBmb3JjZVB1c2hTdGF0ZSkge1xuICAgIHZhciByb290O1xuICAgIGlmIChmcmFnbWVudCA9PSBudWxsKSB7XG4gICAgICBpZiAodGhpcy5faGFzUHVzaFN0YXRlIHx8ICF0aGlzLl93YW50c0hhc2hDaGFuZ2UgfHwgZm9yY2VQdXNoU3RhdGUpIHtcbiAgICAgICAgZnJhZ21lbnQgPSB0aGlzLmxvY2F0aW9uLnBhdGhuYW1lICsgdGhpcy5sb2NhdGlvbi5zZWFyY2g7XG4gICAgICAgIHJvb3QgPSB0aGlzLnJvb3QucmVwbGFjZSgvXFwvJC8sICcnKTtcbiAgICAgICAgaWYgKCFmcmFnbWVudC5pbmRleE9mKHJvb3QpKSB7XG4gICAgICAgICAgZnJhZ21lbnQgPSBmcmFnbWVudC5zbGljZShyb290Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZyYWdtZW50ID0gdGhpcy5nZXRIYXNoKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmcmFnbWVudC5yZXBsYWNlKHJvdXRlU3RyaXBwZXIsICcnKTtcbiAgfTtcblxuICBIaXN0b3J5LnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB2YXIgYXRSb290LCBmcmFnbWVudCwgbG9jLCByZWYsIHJlZjEsIHJlZjI7XG4gICAgaWYgKEJhY2tib25lLkhpc3Rvcnkuc3RhcnRlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdCYWNrYm9uZS5oaXN0b3J5IGhhcyBhbHJlYWR5IGJlZW4gc3RhcnRlZCcpO1xuICAgIH1cbiAgICBCYWNrYm9uZS5IaXN0b3J5LnN0YXJ0ZWQgPSB0cnVlO1xuICAgIHRoaXMub3B0aW9ucyA9IF8uZXh0ZW5kKHt9LCB7XG4gICAgICByb290OiAnLydcbiAgICB9LCB0aGlzLm9wdGlvbnMsIG9wdGlvbnMpO1xuICAgIHRoaXMucm9vdCA9IHRoaXMub3B0aW9ucy5yb290O1xuICAgIHRoaXMuX3dhbnRzSGFzaENoYW5nZSA9IHRoaXMub3B0aW9ucy5oYXNoQ2hhbmdlICE9PSBmYWxzZTtcbiAgICB0aGlzLl93YW50c1B1c2hTdGF0ZSA9IEJvb2xlYW4odGhpcy5vcHRpb25zLnB1c2hTdGF0ZSk7XG4gICAgdGhpcy5faGFzUHVzaFN0YXRlID0gQm9vbGVhbih0aGlzLm9wdGlvbnMucHVzaFN0YXRlICYmICgocmVmID0gdGhpcy5oaXN0b3J5KSAhPSBudWxsID8gcmVmLnB1c2hTdGF0ZSA6IHZvaWQgMCkpO1xuICAgIGZyYWdtZW50ID0gdGhpcy5nZXRGcmFnbWVudCgpO1xuICAgIHJvdXRlU3RyaXBwZXIgPSAocmVmMSA9IHRoaXMub3B0aW9ucy5yb3V0ZVN0cmlwcGVyKSAhPSBudWxsID8gcmVmMSA6IHJvdXRlU3RyaXBwZXI7XG4gICAgcm9vdFN0cmlwcGVyID0gKHJlZjIgPSB0aGlzLm9wdGlvbnMucm9vdFN0cmlwcGVyKSAhPSBudWxsID8gcmVmMiA6IHJvb3RTdHJpcHBlcjtcbiAgICB0aGlzLnJvb3QgPSAoJy8nICsgdGhpcy5yb290ICsgJy8nKS5yZXBsYWNlKHJvb3RTdHJpcHBlciwgJy8nKTtcbiAgICBpZiAodGhpcy5faGFzUHVzaFN0YXRlKSB7XG4gICAgICBCYWNrYm9uZS4kKHdpbmRvdykub24oJ3BvcHN0YXRlJywgdGhpcy5jaGVja1VybCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl93YW50c0hhc2hDaGFuZ2UpIHtcbiAgICAgIEJhY2tib25lLiQod2luZG93KS5vbignaGFzaGNoYW5nZScsIHRoaXMuY2hlY2tVcmwpO1xuICAgIH1cbiAgICB0aGlzLmZyYWdtZW50ID0gZnJhZ21lbnQ7XG4gICAgbG9jID0gdGhpcy5sb2NhdGlvbjtcbiAgICBhdFJvb3QgPSBsb2MucGF0aG5hbWUucmVwbGFjZSgvW15cXC9dJC8sICckJi8nKSA9PT0gdGhpcy5yb290O1xuICAgIGlmICh0aGlzLl93YW50c0hhc2hDaGFuZ2UgJiYgdGhpcy5fd2FudHNQdXNoU3RhdGUgJiYgIXRoaXMuX2hhc1B1c2hTdGF0ZSAmJiAhYXRSb290KSB7XG4gICAgICB0aGlzLmZyYWdtZW50ID0gdGhpcy5nZXRGcmFnbWVudChudWxsLCB0cnVlKTtcbiAgICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZSh0aGlzLnJvb3QgKyAnIycgKyB0aGlzLmZyYWdtZW50KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fd2FudHNQdXNoU3RhdGUgJiYgdGhpcy5faGFzUHVzaFN0YXRlICYmIGF0Um9vdCAmJiBsb2MuaGFzaCkge1xuICAgICAgdGhpcy5mcmFnbWVudCA9IHRoaXMuZ2V0SGFzaCgpLnJlcGxhY2Uocm91dGVTdHJpcHBlciwgJycpO1xuICAgICAgdGhpcy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgZG9jdW1lbnQudGl0bGUsIHRoaXMucm9vdCArIHRoaXMuZnJhZ21lbnQpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgIHJldHVybiB0aGlzLmxvYWRVcmwoKTtcbiAgICB9XG4gIH07XG5cbiAgSGlzdG9yeS5wcm90b3R5cGUubmF2aWdhdGUgPSBmdW5jdGlvbihmcmFnbWVudCwgb3B0aW9ucykge1xuICAgIHZhciBoaXN0b3J5TWV0aG9kLCB1cmw7XG4gICAgaWYgKGZyYWdtZW50ID09IG51bGwpIHtcbiAgICAgIGZyYWdtZW50ID0gJyc7XG4gICAgfVxuICAgIGlmICghQmFja2JvbmUuSGlzdG9yeS5zdGFydGVkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghb3B0aW9ucyB8fCBvcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0ge1xuICAgICAgICB0cmlnZ2VyOiBvcHRpb25zXG4gICAgICB9O1xuICAgIH1cbiAgICBmcmFnbWVudCA9IHRoaXMuZ2V0RnJhZ21lbnQoZnJhZ21lbnQpO1xuICAgIHVybCA9IHRoaXMucm9vdCArIGZyYWdtZW50O1xuICAgIGlmICh0aGlzLmZyYWdtZW50ID09PSBmcmFnbWVudCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLmZyYWdtZW50ID0gZnJhZ21lbnQ7XG4gICAgaWYgKGZyYWdtZW50Lmxlbmd0aCA9PT0gMCAmJiB1cmwgIT09IHRoaXMucm9vdCkge1xuICAgICAgdXJsID0gdXJsLnNsaWNlKDAsIC0xKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX2hhc1B1c2hTdGF0ZSkge1xuICAgICAgaGlzdG9yeU1ldGhvZCA9IG9wdGlvbnMucmVwbGFjZSA/ICdyZXBsYWNlU3RhdGUnIDogJ3B1c2hTdGF0ZSc7XG4gICAgICB0aGlzLmhpc3RvcnlbaGlzdG9yeU1ldGhvZF0oe30sIGRvY3VtZW50LnRpdGxlLCB1cmwpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fd2FudHNIYXNoQ2hhbmdlKSB7XG4gICAgICB0aGlzLl91cGRhdGVIYXNoKHRoaXMubG9jYXRpb24sIGZyYWdtZW50LCBvcHRpb25zLnJlcGxhY2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5sb2NhdGlvbi5hc3NpZ24odXJsKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudHJpZ2dlcikge1xuICAgICAgcmV0dXJuIHRoaXMubG9hZFVybChmcmFnbWVudCk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBIaXN0b3J5O1xuXG59KShCYWNrYm9uZS5IaXN0b3J5KTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS4kID8gSGlzdG9yeSA6IEJhY2tib25lLkhpc3Rvcnk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pYUdsemRHOXllUzVxY3lJc0luTnZkWEpqWlZKdmIzUWlPaUlpTENKemIzVnlZMlZ6SWpwYkltaHBjM1J2Y25rdVkyOW1abVZsSWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk8wRkJRVUVzU1VGQlFTeHBSRUZCUVR0RlFVRkJPenM3UVVGRlFTeERRVUZCTEVkQlFVa3NUMEZCUVN4RFFVRlJMRmxCUVZJN08wRkJRMG9zVVVGQlFTeEhRVUZYTEU5QlFVRXNRMEZCVVN4VlFVRlNPenRCUVVkWUxHRkJRVUVzUjBGQlowSTdPMEZCUjJoQ0xGbEJRVUVzUjBGQlpUczdRVUZIVkRzN096czdPenR2UWtGSlNpeFhRVUZCTEVkQlFXRXNVMEZCUXl4UlFVRkVMRVZCUVZjc1kwRkJXRHRCUVVOWUxGRkJRVUU3U1VGQlFTeEpRVUZQTEdkQ1FVRlFPMDFCUTBVc1NVRkJSeXhKUVVGRExFTkJRVUVzWVVGQlJDeEpRVUZyUWl4RFFVRkpMRWxCUVVNc1EwRkJRU3huUWtGQmRrSXNTVUZCTWtNc1kwRkJPVU03VVVGRlJTeFJRVUZCTEVkQlFWY3NTVUZCUXl4RFFVRkJMRkZCUVZFc1EwRkJReXhSUVVGV0xFZEJRWEZDTEVsQlFVTXNRMEZCUVN4UlFVRlJMRU5CUVVNN1VVRkZNVU1zU1VGQlFTeEhRVUZQTEVsQlFVTXNRMEZCUVN4SlFVRkpMRU5CUVVNc1QwRkJUaXhEUVVGakxFdEJRV1FzUlVGQmNVSXNSVUZCY2tJN1VVRkRVQ3hKUVVGQkxFTkJRVFpETEZGQlFWRXNRMEZCUXl4UFFVRlVMRU5CUVdsQ0xFbEJRV3BDTEVOQlFUZERPMVZCUVVFc1VVRkJRU3hIUVVGWExGRkJRVkVzUTBGQlF5eExRVUZVTEVOQlFXVXNTVUZCU1N4RFFVRkRMRTFCUVhCQ0xFVkJRVmc3VTBGTVJqdFBRVUZCTEUxQlFVRTdVVUZQUlN4UlFVRkJMRWRCUVZjc1NVRkJReXhEUVVGQkxFOUJRVVFzUTBGQlFTeEZRVkJpTzA5QlJFWTdPMWRCVlVFc1VVRkJVU3hEUVVGRExFOUJRVlFzUTBGQmFVSXNZVUZCYWtJc1JVRkJaME1zUlVGQmFFTTdSVUZZVnpzN2IwSkJaV0lzUzBGQlFTeEhRVUZQTEZOQlFVTXNUMEZCUkR0QlFVTk1MRkZCUVVFN1NVRkJRU3hKUVVGSExGRkJRVkVzUTBGQlF5eFBRVUZQTEVOQlFVTXNUMEZCY0VJN1FVRkRSU3haUVVGTkxFbEJRVWtzUzBGQlNpeERRVUZWTERKRFFVRldMRVZCUkZJN08wbEJSVUVzVVVGQlVTeERRVUZETEU5QlFVOHNRMEZCUXl4UFFVRnFRaXhIUVVFeVFqdEpRVWt6UWl4SlFVRkRMRU5CUVVFc1QwRkJSQ3hIUVVGdlFpeERRVUZETEVOQlFVTXNUVUZCUml4RFFVRlRMRVZCUVZRc1JVRkJZVHROUVVGRExFbEJRVUVzUlVGQlRTeEhRVUZRTzB0QlFXSXNSVUZCTUVJc1NVRkJReXhEUVVGQkxFOUJRVE5DTEVWQlFXOURMRTlCUVhCRE8wbEJRM0JDTEVsQlFVTXNRMEZCUVN4SlFVRkVMRWRCUVc5Q0xFbEJRVU1zUTBGQlFTeFBRVUZQTEVOQlFVTTdTVUZETjBJc1NVRkJReXhEUVVGQkxHZENRVUZFTEVkQlFXOUNMRWxCUVVNc1EwRkJRU3hQUVVGUExFTkJRVU1zVlVGQlZDeExRVUY1UWp0SlFVTTNReXhKUVVGRExFTkJRVUVzWlVGQlJDeEhRVUZ2UWl4UFFVRkJMRU5CUVZFc1NVRkJReXhEUVVGQkxFOUJRVThzUTBGQlF5eFRRVUZxUWp0SlFVTndRaXhKUVVGRExFTkJRVUVzWVVGQlJDeEhRVUZ2UWl4UFFVRkJMRU5CUVZFc1NVRkJReXhEUVVGQkxFOUJRVThzUTBGQlF5eFRRVUZVTEhWRFFVRXJRaXhEUVVGRkxHMUNRVUY2UXp0SlFVTndRaXhSUVVGQkxFZEJRVzlDTEVsQlFVTXNRMEZCUVN4WFFVRkVMRU5CUVVFN1NVRkRjRUlzWVVGQlFTeDNSRUZCTmtNN1NVRkROME1zV1VGQlFTeDFSRUZCTkVNN1NVRkhOVU1zU1VGQlF5eERRVUZCTEVsQlFVUXNSMEZCVVN4RFFVRkRMRWRCUVVFc1IwRkJUU3hKUVVGRExFTkJRVUVzU1VGQlVDeEhRVUZqTEVkQlFXWXNRMEZCYlVJc1EwRkJReXhQUVVGd1FpeERRVUUwUWl4WlFVRTFRaXhGUVVFd1F5eEhRVUV4UXp0SlFVbFNMRWxCUVVjc1NVRkJReXhEUVVGQkxHRkJRVW83VFVGRFJTeFJRVUZSTEVOQlFVTXNRMEZCVkN4RFFVRlhMRTFCUVZnc1EwRkJhMElzUTBGQlF5eEZRVUZ1UWl4RFFVRnpRaXhWUVVGMFFpeEZRVUZyUXl4SlFVRkRMRU5CUVVFc1VVRkJia01zUlVGRVJqdExRVUZCTEUxQlJVc3NTVUZCUnl4SlFVRkRMRU5CUVVFc1owSkJRVW83VFVGRFNDeFJRVUZSTEVOQlFVTXNRMEZCVkN4RFFVRlhMRTFCUVZnc1EwRkJhMElzUTBGQlF5eEZRVUZ1UWl4RFFVRnpRaXhaUVVGMFFpeEZRVUZ2UXl4SlFVRkRMRU5CUVVFc1VVRkJja01zUlVGRVJ6czdTVUZMVEN4SlFVRkRMRU5CUVVFc1VVRkJSQ3hIUVVGWk8wbEJRMW9zUjBGQlFTeEhRVUZOTEVsQlFVTXNRMEZCUVR0SlFVTlFMRTFCUVVFc1IwRkJVeXhIUVVGSExFTkJRVU1zVVVGQlVTeERRVUZETEU5QlFXSXNRMEZCY1VJc1VVRkJja0lzUlVGQkswSXNTMEZCTDBJc1EwRkJRU3hMUVVGNVF5eEpRVUZETEVOQlFVRTdTVUZKYmtRc1NVRkJSeXhKUVVGRExFTkJRVUVzWjBKQlFVUXNTVUZCYzBJc1NVRkJReXhEUVVGQkxHVkJRWFpDTEVsQlEwZ3NRMEZCU1N4SlFVRkRMRU5CUVVFc1lVRkVSaXhKUVVOdlFpeERRVUZKTEUxQlJETkNPMDFCUzBVc1NVRkJReXhEUVVGQkxGRkJRVVFzUjBGQldTeEpRVUZETEVOQlFVRXNWMEZCUkN4RFFVRmhMRWxCUVdJc1JVRkJiVUlzU1VGQmJrSTdUVUZEV2l4SlFVRkRMRU5CUVVFc1VVRkJVU3hEUVVGRExFOUJRVllzUTBGQmEwSXNTVUZCUXl4RFFVRkJMRWxCUVVRc1IwRkJVU3hIUVVGU0xFZEJRV01zU1VGQlF5eERRVUZCTEZGQlFXcERPMEZCUlVFc1lVRkJUeXhMUVZKVU8wdEJRVUVzVFVGWlN5eEpRVUZITEVsQlFVTXNRMEZCUVN4bFFVRkVMRWxCUVhGQ0xFbEJRVU1zUTBGQlFTeGhRVUYwUWl4SlFVRjNReXhOUVVGNFF5eEpRVUZ0UkN4SFFVRkhMRU5CUVVNc1NVRkJNVVE3VFVGRFNDeEpRVUZETEVOQlFVRXNVVUZCUkN4SFFVRlpMRWxCUVVNc1EwRkJRU3hQUVVGRUxFTkJRVUVzUTBGQlZTeERRVUZETEU5QlFWZ3NRMEZCYlVJc1lVRkJia0lzUlVGQmEwTXNSVUZCYkVNN1RVRkhXaXhKUVVGRExFTkJRVUVzVDBGQlR5eERRVUZETEZsQlFWUXNRMEZCYzBJc1JVRkJkRUlzUlVGQk1FSXNVVUZCVVN4RFFVRkRMRXRCUVc1RExFVkJRVEJETEVsQlFVTXNRMEZCUVN4SlFVRkVMRWRCUVZFc1NVRkJReXhEUVVGQkxGRkJRVzVFTEVWQlNrYzdPMGxCVFV3c1NVRkJZeXhEUVVGSkxFbEJRVU1zUTBGQlFTeFBRVUZQTEVOQlFVTXNUVUZCTTBJN1lVRkJRU3hKUVVGRExFTkJRVUVzVDBGQlJDeERRVUZCTEVWQlFVRTdPMFZCY0VSTE96dHZRa0Z6UkZBc1VVRkJRU3hIUVVGVkxGTkJRVU1zVVVGQlJDeEZRVUZuUWl4UFFVRm9RanRCUVVOU0xGRkJRVUU3TzAxQlJGTXNWMEZCVnpzN1NVRkRjRUlzU1VGQlFTeERRVUZ2UWl4UlFVRlJMRU5CUVVNc1QwRkJUeXhEUVVGRExFOUJRWEpETzBGQlFVRXNZVUZCVHl4TlFVRlFPenRKUVVWQkxFbEJRV2RETEVOQlFVa3NUMEZCU2l4SlFVRmxMRTlCUVVFc1MwRkJWeXhKUVVFeFJEdE5RVUZCTEU5QlFVRXNSMEZCVlR0UlFVRkRMRTlCUVVFc1JVRkJVeXhQUVVGV08xRkJRVlk3TzBsQlJVRXNVVUZCUVN4SFFVRlhMRWxCUVVNc1EwRkJRU3hYUVVGRUxFTkJRV0VzVVVGQllqdEpRVU5ZTEVkQlFVRXNSMEZCVFN4SlFVRkRMRU5CUVVFc1NVRkJSQ3hIUVVGUk8wbEJUV1FzU1VGQlowSXNTVUZCUXl4RFFVRkJMRkZCUVVRc1MwRkJZU3hSUVVFM1FqdEJRVUZCTEdGQlFVOHNUVUZCVURzN1NVRkRRU3hKUVVGRExFTkJRVUVzVVVGQlJDeEhRVUZaTzBsQlIxb3NTVUZCUnl4UlFVRlJMRU5CUVVNc1RVRkJWQ3hMUVVGdFFpeERRVUZ1UWl4SlFVRjVRaXhIUVVGQkxFdEJRVk1zU1VGQlF5eERRVUZCTEVsQlFYUkRPMDFCUTBVc1IwRkJRU3hIUVVGTkxFZEJRVWNzUTBGQlF5eExRVUZLTEVOQlFWVXNRMEZCVml4RlFVRmhMRU5CUVVNc1EwRkJaQ3hGUVVSU096dEpRVWxCTEVsQlFVY3NTVUZCUXl4RFFVRkJMR0ZCUVVvN1RVRkRSU3hoUVVGQkxFZEJRVzFDTEU5QlFVOHNRMEZCUXl4UFFVRllMRWRCUVhkQ0xHTkJRWGhDTEVkQlFUUkRPMDFCUXpWRUxFbEJRVU1zUTBGQlFTeFBRVUZSTEVOQlFVRXNZVUZCUVN4RFFVRlVMRU5CUVhkQ0xFVkJRWGhDTEVWQlFUUkNMRkZCUVZFc1EwRkJReXhMUVVGeVF5eEZRVUUwUXl4SFFVRTFReXhGUVVaR08wdEJRVUVzVFVGTlN5eEpRVUZITEVsQlFVTXNRMEZCUVN4blFrRkJTanROUVVOSUxFbEJRVU1zUTBGQlFTeFhRVUZFTEVOQlFXRXNTVUZCUXl4RFFVRkJMRkZCUVdRc1JVRkJkMElzVVVGQmVFSXNSVUZCYTBNc1QwRkJUeXhEUVVGRExFOUJRVEZETEVWQlJFYzdTMEZCUVN4TlFVRkJPMEZCVFVnc1lVRkJUeXhKUVVGRExFTkJRVUVzVVVGQlVTeERRVUZETEUxQlFWWXNRMEZCYVVJc1IwRkJha0lzUlVGT1NqczdTVUZSVEN4SlFVRkhMRTlCUVU4c1EwRkJReXhQUVVGWU8yRkJRMFVzU1VGQlF5eERRVUZCTEU5QlFVUXNRMEZCVXl4UlFVRlVMRVZCUkVZN08wVkJiRU5ST3pzN08wZEJla1ZWTEZGQlFWRXNRMEZCUXpzN1FVRTRSeTlDTEUxQlFVMHNRMEZCUXl4UFFVRlFMRWRCUVc5Q0xGRkJRVkVzUTBGQlF5eERRVUZhTEVkQlFXMUNMRTlCUVc1Q0xFZEJRV2RETEZGQlFWRXNRMEZCUXlKOVxuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIEJhY2tib25lLCBDb250cm9sbGVyLCBFdmVudEJyb2tlciwgUm91dGUsIF8sIHV0aWxzLFxuICBiaW5kID0gZnVuY3Rpb24oZm4sIG1lKXsgcmV0dXJuIGZ1bmN0aW9uKCl7IHJldHVybiBmbi5hcHBseShtZSwgYXJndW1lbnRzKTsgfTsgfTtcblxuXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG5FdmVudEJyb2tlciA9IHJlcXVpcmUoJy4vZXZlbnRfYnJva2VyJyk7XG5cbnV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5Db250cm9sbGVyID0gcmVxdWlyZSgnLi4vY29udHJvbGxlcnMvY29udHJvbGxlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdXRlID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgZXNjYXBlUmVnRXhwLCBvcHRpb25hbFJlZ0V4cCwgcGFyYW1SZWdFeHAsIHByb2Nlc3NUcmFpbGluZ1NsYXNoO1xuXG4gIFJvdXRlLmV4dGVuZCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZDtcblxuICBfLmV4dGVuZChSb3V0ZS5wcm90b3R5cGUsIEV2ZW50QnJva2VyKTtcblxuICBlc2NhcGVSZWdFeHAgPSAvW1xcLXt9XFxbXFxdKz8uLFxcXFxcXF4kfCNcXHNdL2c7XG5cbiAgb3B0aW9uYWxSZWdFeHAgPSAvXFwoKC4qPylcXCkvZztcblxuICBwYXJhbVJlZ0V4cCA9IC8oPzo6fFxcKikoXFx3KykvZztcblxuICBwcm9jZXNzVHJhaWxpbmdTbGFzaCA9IGZ1bmN0aW9uKHBhdGgsIHRyYWlsaW5nKSB7XG4gICAgc3dpdGNoICh0cmFpbGluZykge1xuICAgICAgY2FzZSB0cnVlOlxuICAgICAgICBpZiAocGF0aC5zbGljZSgtMSkgIT09ICcvJykge1xuICAgICAgICAgIHBhdGggKz0gJy8nO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBmYWxzZTpcbiAgICAgICAgaWYgKHBhdGguc2xpY2UoLTEpID09PSAnLycpIHtcbiAgICAgICAgICBwYXRoID0gcGF0aC5zbGljZSgwLCAtMSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhdGg7XG4gIH07XG5cbiAgZnVuY3Rpb24gUm91dGUocGF0dGVybjEsIGNvbnRyb2xsZXIsIGFjdGlvbiwgb3B0aW9ucykge1xuICAgIHRoaXMucGF0dGVybiA9IHBhdHRlcm4xO1xuICAgIHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG4gICAgdGhpcy5hY3Rpb24gPSBhY3Rpb247XG4gICAgdGhpcy5oYW5kbGVyID0gYmluZCh0aGlzLmhhbmRsZXIsIHRoaXMpO1xuICAgIHRoaXMucGFyc2VPcHRpb25hbFBvcnRpb24gPSBiaW5kKHRoaXMucGFyc2VPcHRpb25hbFBvcnRpb24sIHRoaXMpO1xuICAgIGlmICh0eXBlb2YgdGhpcy5wYXR0ZXJuICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSb3V0ZTogUmVnRXhwcyBhcmUgbm90IHN1cHBvcnRlZC4gVXNlIHN0cmluZ3Mgd2l0aCA6bmFtZXMgYW5kIGBjb25zdHJhaW50c2Agb3B0aW9uIG9mIHJvdXRlJyk7XG4gICAgfVxuICAgIHRoaXMub3B0aW9ucyA9IF8uZXh0ZW5kKHt9LCBvcHRpb25zKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLnBhcmFtc0luUVMgIT09IGZhbHNlKSB7XG4gICAgICB0aGlzLm9wdGlvbnMucGFyYW1zSW5RUyA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMubmFtZSAhPSBudWxsKSB7XG4gICAgICB0aGlzLm5hbWUgPSB0aGlzLm9wdGlvbnMubmFtZTtcbiAgICB9XG4gICAgaWYgKHRoaXMubmFtZSAmJiB0aGlzLm5hbWUuaW5kZXhPZignIycpICE9PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSb3V0ZTogXCIjXCIgY2Fubm90IGJlIHVzZWQgaW4gbmFtZScpO1xuICAgIH1cbiAgICBpZiAodGhpcy5uYW1lID09IG51bGwpIHtcbiAgICAgIHRoaXMubmFtZSA9IHRoaXMuY29udHJvbGxlciArICcjJyArIHRoaXMuYWN0aW9uO1xuICAgIH1cbiAgICB0aGlzLmFsbFBhcmFtcyA9IFtdO1xuICAgIHRoaXMucmVxdWlyZWRQYXJhbXMgPSBbXTtcbiAgICB0aGlzLm9wdGlvbmFsUGFyYW1zID0gW107XG4gICAgaWYgKHRoaXMuYWN0aW9uIGluIENvbnRyb2xsZXIucHJvdG90eXBlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JvdXRlOiBZb3Ugc2hvdWxkIG5vdCB1c2UgZXhpc3RpbmcgY29udHJvbGxlciAnICsgJ3Byb3BlcnRpZXMgYXMgYWN0aW9uIG5hbWVzJyk7XG4gICAgfVxuICAgIHRoaXMuY3JlYXRlUmVnRXhwKCk7XG4gICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgfVxuXG4gIFJvdXRlLnByb3RvdHlwZS5tYXRjaGVzID0gZnVuY3Rpb24oY3JpdGVyaWEpIHtcbiAgICB2YXIgaSwgaW52YWxpZFBhcmFtc0NvdW50LCBsZW4sIG5hbWUsIHByb3BlcnRpZXNDb3VudCwgcHJvcGVydHksIHJlZjtcbiAgICBpZiAodHlwZW9mIGNyaXRlcmlhID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGNyaXRlcmlhID09PSB0aGlzLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb3BlcnRpZXNDb3VudCA9IDA7XG4gICAgICByZWYgPSBbJ25hbWUnLCAnYWN0aW9uJywgJ2NvbnRyb2xsZXInXTtcbiAgICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBuYW1lID0gcmVmW2ldO1xuICAgICAgICBwcm9wZXJ0aWVzQ291bnQrKztcbiAgICAgICAgcHJvcGVydHkgPSBjcml0ZXJpYVtuYW1lXTtcbiAgICAgICAgaWYgKHByb3BlcnR5ICYmIHByb3BlcnR5ICE9PSB0aGlzW25hbWVdKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpbnZhbGlkUGFyYW1zQ291bnQgPSBwcm9wZXJ0aWVzQ291bnQgPT09IDEgJiYgKG5hbWUgPT09ICdhY3Rpb24nIHx8IG5hbWUgPT09ICdjb250cm9sbGVyJyk7XG4gICAgICByZXR1cm4gIWludmFsaWRQYXJhbXNDb3VudDtcbiAgICB9XG4gIH07XG5cbiAgUm91dGUucHJvdG90eXBlLnJldmVyc2UgPSBmdW5jdGlvbihwYXJhbXMsIHF1ZXJ5KSB7XG4gICAgdmFyIGksIGosIGxlbiwgbGVuMSwgbmFtZSwgcmF3LCByZWYsIHJlZjEsIHJlbWFpbmluZ1BhcmFtcywgdXJsLCB2YWx1ZTtcbiAgICBwYXJhbXMgPSB0aGlzLm5vcm1hbGl6ZVBhcmFtcyhwYXJhbXMpO1xuICAgIHJlbWFpbmluZ1BhcmFtcyA9IF8uZXh0ZW5kKHt9LCBwYXJhbXMpO1xuICAgIGlmIChwYXJhbXMgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHVybCA9IHRoaXMucGF0dGVybjtcbiAgICByZWYgPSB0aGlzLnJlcXVpcmVkUGFyYW1zO1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgbmFtZSA9IHJlZltpXTtcbiAgICAgIHZhbHVlID0gcGFyYW1zW25hbWVdO1xuICAgICAgdXJsID0gdXJsLnJlcGxhY2UoUmVnRXhwKFwiWzoqXVwiICsgbmFtZSwgXCJnXCIpLCB2YWx1ZSk7XG4gICAgICBkZWxldGUgcmVtYWluaW5nUGFyYW1zW25hbWVdO1xuICAgIH1cbiAgICByZWYxID0gdGhpcy5vcHRpb25hbFBhcmFtcztcbiAgICBmb3IgKGogPSAwLCBsZW4xID0gcmVmMS5sZW5ndGg7IGogPCBsZW4xOyBqKyspIHtcbiAgICAgIG5hbWUgPSByZWYxW2pdO1xuICAgICAgaWYgKHZhbHVlID0gcGFyYW1zW25hbWVdKSB7XG4gICAgICAgIHVybCA9IHVybC5yZXBsYWNlKFJlZ0V4cChcIls6Kl1cIiArIG5hbWUsIFwiZ1wiKSwgdmFsdWUpO1xuICAgICAgICBkZWxldGUgcmVtYWluaW5nUGFyYW1zW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgICByYXcgPSB1cmwucmVwbGFjZShvcHRpb25hbFJlZ0V4cCwgZnVuY3Rpb24obWF0Y2gsIHBvcnRpb24pIHtcbiAgICAgIGlmIChwb3J0aW9uLm1hdGNoKC9bOipdL2cpKSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHBvcnRpb247XG4gICAgICB9XG4gICAgfSk7XG4gICAgdXJsID0gcHJvY2Vzc1RyYWlsaW5nU2xhc2gocmF3LCB0aGlzLm9wdGlvbnMudHJhaWxpbmcpO1xuICAgIGlmICh0eXBlb2YgcXVlcnkgIT09ICdvYmplY3QnKSB7XG4gICAgICBxdWVyeSA9IHV0aWxzLnF1ZXJ5UGFyYW1zLnBhcnNlKHF1ZXJ5KTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5wYXJhbXNJblFTICE9PSBmYWxzZSkge1xuICAgICAgXy5leHRlbmQocXVlcnksIHJlbWFpbmluZ1BhcmFtcyk7XG4gICAgfVxuICAgIGlmICghdXRpbHMuaXNFbXB0eShxdWVyeSkpIHtcbiAgICAgIHVybCArPSAnPycgKyB1dGlscy5xdWVyeVBhcmFtcy5zdHJpbmdpZnkocXVlcnkpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsO1xuICB9O1xuXG4gIFJvdXRlLnByb3RvdHlwZS5ub3JtYWxpemVQYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICB2YXIgaSwgcGFyYW1JbmRleCwgcGFyYW1OYW1lLCBwYXJhbXNIYXNoLCByZWYsIHJvdXRlUGFyYW1zO1xuICAgIGlmIChBcnJheS5pc0FycmF5KHBhcmFtcykpIHtcbiAgICAgIGlmIChwYXJhbXMubGVuZ3RoIDwgdGhpcy5yZXF1aXJlZFBhcmFtcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcGFyYW1zSGFzaCA9IHt9O1xuICAgICAgcm91dGVQYXJhbXMgPSB0aGlzLnJlcXVpcmVkUGFyYW1zLmNvbmNhdCh0aGlzLm9wdGlvbmFsUGFyYW1zKTtcbiAgICAgIGZvciAocGFyYW1JbmRleCA9IGkgPSAwLCByZWYgPSBwYXJhbXMubGVuZ3RoIC0gMTsgaSA8PSByZWY7IHBhcmFtSW5kZXggPSBpICs9IDEpIHtcbiAgICAgICAgcGFyYW1OYW1lID0gcm91dGVQYXJhbXNbcGFyYW1JbmRleF07XG4gICAgICAgIHBhcmFtc0hhc2hbcGFyYW1OYW1lXSA9IHBhcmFtc1twYXJhbUluZGV4XTtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy50ZXN0Q29uc3RyYWludHMocGFyYW1zSGFzaCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcGFyYW1zID0gcGFyYW1zSGFzaDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHBhcmFtcyA9PSBudWxsKSB7XG4gICAgICAgIHBhcmFtcyA9IHt9O1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLnRlc3RQYXJhbXMocGFyYW1zKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG4gIH07XG5cbiAgUm91dGUucHJvdG90eXBlLnRlc3RDb25zdHJhaW50cyA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIHZhciBjb25zdHJhaW50cztcbiAgICBjb25zdHJhaW50cyA9IHRoaXMub3B0aW9ucy5jb25zdHJhaW50cztcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoY29uc3RyYWludHMgfHwge30pLmV2ZXJ5KGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGNvbnN0cmFpbnRzW2tleV0udGVzdChwYXJhbXNba2V5XSk7XG4gICAgfSk7XG4gIH07XG5cbiAgUm91dGUucHJvdG90eXBlLnRlc3RQYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICB2YXIgaSwgbGVuLCBwYXJhbU5hbWUsIHJlZjtcbiAgICByZWYgPSB0aGlzLnJlcXVpcmVkUGFyYW1zO1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgcGFyYW1OYW1lID0gcmVmW2ldO1xuICAgICAgaWYgKHBhcmFtc1twYXJhbU5hbWVdID09PSB2b2lkIDApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy50ZXN0Q29uc3RyYWludHMocGFyYW1zKTtcbiAgfTtcblxuICBSb3V0ZS5wcm90b3R5cGUuY3JlYXRlUmVnRXhwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhdHRlcm47XG4gICAgcGF0dGVybiA9IHRoaXMucGF0dGVybjtcbiAgICBwYXR0ZXJuID0gcGF0dGVybi5yZXBsYWNlKGVzY2FwZVJlZ0V4cCwgJ1xcXFwkJicpO1xuICAgIHRoaXMucmVwbGFjZVBhcmFtcyhwYXR0ZXJuLCAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihtYXRjaCwgcGFyYW0pIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLmFsbFBhcmFtcy5wdXNoKHBhcmFtKTtcbiAgICAgIH07XG4gICAgfSkodGhpcykpO1xuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnJlcGxhY2Uob3B0aW9uYWxSZWdFeHAsIHRoaXMucGFyc2VPcHRpb25hbFBvcnRpb24pO1xuICAgIHBhdHRlcm4gPSB0aGlzLnJlcGxhY2VQYXJhbXMocGF0dGVybiwgKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24obWF0Y2gsIHBhcmFtKSB7XG4gICAgICAgIF90aGlzLnJlcXVpcmVkUGFyYW1zLnB1c2gocGFyYW0pO1xuICAgICAgICByZXR1cm4gX3RoaXMucGFyYW1DYXB0dXJlUGF0dGVybihtYXRjaCk7XG4gICAgICB9O1xuICAgIH0pKHRoaXMpKTtcbiAgICByZXR1cm4gdGhpcy5yZWdFeHAgPSBSZWdFeHAoXCJeXCIgKyBwYXR0ZXJuICsgXCIoPz1cXFxcLyooPz1cXFxcP3wkKSlcIik7XG4gIH07XG5cbiAgUm91dGUucHJvdG90eXBlLnBhcnNlT3B0aW9uYWxQb3J0aW9uID0gZnVuY3Rpb24obWF0Y2gsIG9wdGlvbmFsUG9ydGlvbikge1xuICAgIHZhciBwb3J0aW9uO1xuICAgIHBvcnRpb24gPSB0aGlzLnJlcGxhY2VQYXJhbXMob3B0aW9uYWxQb3J0aW9uLCAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihtYXRjaCwgcGFyYW0pIHtcbiAgICAgICAgX3RoaXMub3B0aW9uYWxQYXJhbXMucHVzaChwYXJhbSk7XG4gICAgICAgIHJldHVybiBfdGhpcy5wYXJhbUNhcHR1cmVQYXR0ZXJuKG1hdGNoKTtcbiAgICAgIH07XG4gICAgfSkodGhpcykpO1xuICAgIHJldHVybiBcIig/OlwiICsgcG9ydGlvbiArIFwiKT9cIjtcbiAgfTtcblxuICBSb3V0ZS5wcm90b3R5cGUucmVwbGFjZVBhcmFtcyA9IGZ1bmN0aW9uKHMsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHMucmVwbGFjZShwYXJhbVJlZ0V4cCwgY2FsbGJhY2spO1xuICB9O1xuXG4gIFJvdXRlLnByb3RvdHlwZS5wYXJhbUNhcHR1cmVQYXR0ZXJuID0gZnVuY3Rpb24ocGFyYW0pIHtcbiAgICBpZiAocGFyYW1bMF0gPT09ICc6Jykge1xuICAgICAgcmV0dXJuICcoW15cXC9cXD9dKyknO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJyguKj8pJztcbiAgICB9XG4gIH07XG5cbiAgUm91dGUucHJvdG90eXBlLnRlc3QgPSBmdW5jdGlvbihwYXRoKSB7XG4gICAgdmFyIGNvbnN0cmFpbnRzLCBtYXRjaGVkO1xuICAgIG1hdGNoZWQgPSB0aGlzLnJlZ0V4cC50ZXN0KHBhdGgpO1xuICAgIGlmICghbWF0Y2hlZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdHJhaW50cyA9IHRoaXMub3B0aW9ucy5jb25zdHJhaW50cztcbiAgICBpZiAoY29uc3RyYWludHMpIHtcbiAgICAgIHJldHVybiB0aGlzLnRlc3RDb25zdHJhaW50cyh0aGlzLmV4dHJhY3RQYXJhbXMocGF0aCkpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICBSb3V0ZS5wcm90b3R5cGUuaGFuZGxlciA9IGZ1bmN0aW9uKHBhdGhQYXJhbXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgYWN0aW9uUGFyYW1zLCBwYXJhbXMsIHBhdGgsIHF1ZXJ5LCByZWYsIHJvdXRlO1xuICAgIG9wdGlvbnMgPSBfLmV4dGVuZCh7fSwgb3B0aW9ucyk7XG4gICAgaWYgKHBhdGhQYXJhbXMgJiYgdHlwZW9mIHBhdGhQYXJhbXMgPT09ICdvYmplY3QnKSB7XG4gICAgICBxdWVyeSA9IHV0aWxzLnF1ZXJ5UGFyYW1zLnN0cmluZ2lmeShvcHRpb25zLnF1ZXJ5KTtcbiAgICAgIHBhcmFtcyA9IHBhdGhQYXJhbXM7XG4gICAgICBwYXRoID0gdGhpcy5yZXZlcnNlKHBhcmFtcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlZiA9IHBhdGhQYXJhbXMuc3BsaXQoJz8nKSwgcGF0aCA9IHJlZlswXSwgcXVlcnkgPSByZWZbMV07XG4gICAgICBpZiAocXVlcnkgPT0gbnVsbCkge1xuICAgICAgICBxdWVyeSA9ICcnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3B0aW9ucy5xdWVyeSA9IHV0aWxzLnF1ZXJ5UGFyYW1zLnBhcnNlKHF1ZXJ5KTtcbiAgICAgIH1cbiAgICAgIHBhcmFtcyA9IHRoaXMuZXh0cmFjdFBhcmFtcyhwYXRoKTtcbiAgICAgIHBhdGggPSBwcm9jZXNzVHJhaWxpbmdTbGFzaChwYXRoLCB0aGlzLm9wdGlvbnMudHJhaWxpbmcpO1xuICAgIH1cbiAgICBhY3Rpb25QYXJhbXMgPSBfLmV4dGVuZCh7fSwgcGFyYW1zLCB0aGlzLm9wdGlvbnMucGFyYW1zKTtcbiAgICByb3V0ZSA9IHtcbiAgICAgIHBhdGg6IHBhdGgsXG4gICAgICBhY3Rpb246IHRoaXMuYWN0aW9uLFxuICAgICAgY29udHJvbGxlcjogdGhpcy5jb250cm9sbGVyLFxuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgcXVlcnk6IHF1ZXJ5XG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5wdWJsaXNoRXZlbnQoJ3JvdXRlcjptYXRjaCcsIHJvdXRlLCBhY3Rpb25QYXJhbXMsIG9wdGlvbnMpO1xuICB9O1xuXG4gIFJvdXRlLnByb3RvdHlwZS5leHRyYWN0UGFyYW1zID0gZnVuY3Rpb24ocGF0aCkge1xuICAgIHZhciBpLCBpbmRleCwgbGVuLCBtYXRjaCwgbWF0Y2hlcywgcGFyYW1OYW1lLCBwYXJhbXMsIHJlZjtcbiAgICBwYXJhbXMgPSB7fTtcbiAgICBtYXRjaGVzID0gdGhpcy5yZWdFeHAuZXhlYyhwYXRoKTtcbiAgICByZWYgPSBtYXRjaGVzLnNsaWNlKDEpO1xuICAgIGZvciAoaW5kZXggPSBpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaW5kZXggPSArK2kpIHtcbiAgICAgIG1hdGNoID0gcmVmW2luZGV4XTtcbiAgICAgIHBhcmFtTmFtZSA9IHRoaXMuYWxsUGFyYW1zLmxlbmd0aCA/IHRoaXMuYWxsUGFyYW1zW2luZGV4XSA6IGluZGV4O1xuICAgICAgcGFyYW1zW3BhcmFtTmFtZV0gPSBtYXRjaDtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfTtcblxuICByZXR1cm4gUm91dGU7XG5cbn0pKCk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pY205MWRHVXVhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjeUk2V3lKeWIzVjBaUzVqYjJabVpXVWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUU3UVVGQlFTeEpRVUZCTEd0RVFVRkJPMFZCUVVFN08wRkJSVUVzUTBGQlFTeEhRVUZKTEU5QlFVRXNRMEZCVVN4WlFVRlNPenRCUVVOS0xGRkJRVUVzUjBGQlZ5eFBRVUZCTEVOQlFWRXNWVUZCVWpzN1FVRkZXQ3hYUVVGQkxFZEJRV01zVDBGQlFTeERRVUZSTEdkQ1FVRlNPenRCUVVOa0xFdEJRVUVzUjBGQlVTeFBRVUZCTEVOQlFWRXNVMEZCVWpzN1FVRkRVaXhWUVVGQkxFZEJRV0VzVDBGQlFTeERRVUZSTERKQ1FVRlNPenRCUVVWaUxFMUJRVTBzUTBGQlF5eFBRVUZRTEVkQlFYVkNPMEZCUlhKQ0xFMUJRVUU3TzBWQlFVRXNTMEZCUXl4RFFVRkJMRTFCUVVRc1IwRkJWU3hSUVVGUkxFTkJRVU1zUzBGQlN5eERRVUZET3p0RlFVZDZRaXhEUVVGRExFTkJRVU1zVFVGQlJpeERRVUZUTEV0QlFVTXNRMEZCUVN4VFFVRldMRVZCUVhGQ0xGZEJRWEpDT3p0RlFVZEJMRmxCUVVFc1IwRkJaVHM3UlVGRFppeGpRVUZCTEVkQlFXbENPenRGUVVOcVFpeFhRVUZCTEVkQlFXTTdPMFZCUjJRc2IwSkJRVUVzUjBGQmRVSXNVMEZCUXl4SlFVRkVMRVZCUVU4c1VVRkJVRHRCUVVOeVFpeFpRVUZQTEZGQlFWQTdRVUZCUVN4WFFVTlBMRWxCUkZBN1VVRkZTU3hKUVVGdFFpeEpRVUZMTEZWQlFVd3NTMEZCWXl4SFFVRnFRenRWUVVGQkxFbEJRVUVzU1VGQlVTeEpRVUZTT3p0QlFVUkhPMEZCUkZBc1YwRkhUeXhMUVVoUU8xRkJTVWtzU1VGQmMwSXNTVUZCU3l4VlFVRk1MRXRCUVdNc1IwRkJjRU03VlVGQlFTeEpRVUZCTEVkQlFVOHNTVUZCU3l4alFVRmFPenRCUVVwS08xZEJTMEU3UlVGT2NVSTdPMFZCVlZZc1pVRkJReXhSUVVGRUxFVkJRVmNzVlVGQldDeEZRVUYzUWl4TlFVRjRRaXhGUVVGcFF5eFBRVUZxUXp0SlFVRkRMRWxCUVVNc1EwRkJRU3hWUVVGRU8wbEJRVlVzU1VGQlF5eERRVUZCTEdGQlFVUTdTVUZCWVN4SlFVRkRMRU5CUVVFc1UwRkJSRHM3TzBsQlJXNURMRWxCUVVjc1QwRkJUeXhKUVVGRExFTkJRVUVzVDBGQlVpeExRVUZ4UWl4UlFVRjRRanRCUVVORkxGbEJRVTBzU1VGQlNTeExRVUZLTEVOQlFWVXNOa1pCUVZZc1JVRkVVanM3U1VGTFFTeEpRVUZETEVOQlFVRXNUMEZCUkN4SFFVRlhMRU5CUVVNc1EwRkJReXhOUVVGR0xFTkJRVk1zUlVGQlZDeEZRVUZoTEU5QlFXSTdTVUZEV0N4SlFVRTRRaXhKUVVGRExFTkJRVUVzVDBGQlR5eERRVUZETEZWQlFWUXNTMEZCZVVJc1MwRkJka1E3VFVGQlFTeEpRVUZETEVOQlFVRXNUMEZCVHl4RFFVRkRMRlZCUVZRc1IwRkJjMElzUzBGQmRFSTdPMGxCUjBFc1NVRkJlVUlzZVVKQlFYcENPMDFCUVVFc1NVRkJReXhEUVVGQkxFbEJRVVFzUjBGQlVTeEpRVUZETEVOQlFVRXNUMEZCVHl4RFFVRkRMRXRCUVdwQ096dEpRVWRCTEVsQlFVY3NTVUZCUXl4RFFVRkJMRWxCUVVRc1NVRkJWU3hKUVVGRExFTkJRVUVzU1VGQlNTeERRVUZETEU5QlFVNHNRMEZCWXl4SFFVRmtMRU5CUVVFc1MwRkJkMElzUTBGQlF5eERRVUYwUXp0QlFVTkZMRmxCUVUwc1NVRkJTU3hMUVVGS0xFTkJRVlVzYlVOQlFWWXNSVUZFVWpzN08wMUJTVUVzU1VGQlF5eERRVUZCTEU5QlFWRXNTVUZCUXl4RFFVRkJMRlZCUVVRc1IwRkJZeXhIUVVGa0xFZEJRVzlDTEVsQlFVTXNRMEZCUVRzN1NVRkhPVUlzU1VGQlF5eERRVUZCTEZOQlFVUXNSMEZCWVR0SlFVTmlMRWxCUVVNc1EwRkJRU3hqUVVGRUxFZEJRV3RDTzBsQlEyeENMRWxCUVVNc1EwRkJRU3hqUVVGRUxFZEJRV3RDTzBsQlIyeENMRWxCUVVjc1NVRkJReXhEUVVGQkxFMUJRVVFzU1VGQlZ5eFZRVUZWTEVOQlFVTXNVMEZCZWtJN1FVRkRSU3haUVVGTkxFbEJRVWtzUzBGQlNpeERRVUZWTEdkRVFVRkJMRWRCUTJRc05FSkJSRWtzUlVGRVVqczdTVUZKUVN4SlFVRkRMRU5CUVVFc1dVRkJSQ3hEUVVGQk8wbEJSMEVzVFVGQlRTeERRVUZETEUxQlFWQXNRMEZCWXl4SlFVRmtPMFZCYWtOWE96dHJRa0Z2UTJJc1QwRkJRU3hIUVVGVExGTkJRVU1zVVVGQlJEdEJRVU5RTEZGQlFVRTdTVUZCUVN4SlFVRkhMRTlCUVU4c1VVRkJVQ3hMUVVGdFFpeFJRVUYwUWp0aFFVTkZMRkZCUVVFc1MwRkJXU3hKUVVGRExFTkJRVUVzUzBGRVpqdExRVUZCTEUxQlFVRTdUVUZIUlN4bFFVRkJMRWRCUVd0Q08wRkJRMnhDTzBGQlFVRXNWMEZCUVN4eFEwRkJRVHM3VVVGRFJTeGxRVUZCTzFGQlEwRXNVVUZCUVN4SFFVRlhMRkZCUVZNc1EwRkJRU3hKUVVGQk8xRkJRM0JDTEVsQlFXZENMRkZCUVVFc1NVRkJZU3hSUVVGQkxFdEJRV01zU1VGQlN5eERRVUZCTEVsQlFVRXNRMEZCYUVRN1FVRkJRU3hwUWtGQlR5eE5RVUZRT3p0QlFVaEdPMDFCU1VFc2EwSkJRVUVzUjBGQmNVSXNaVUZCUVN4TFFVRnRRaXhEUVVGdVFpeEpRVUY1UWl4RFFVRkJMRWxCUVVFc1MwRkRNME1zVVVGRU1rTXNTVUZCUVN4SlFVRkJMRXRCUTJwRExGbEJSR2xETzJGQlJUbERMRU5CUVVrc2JVSkJWazQ3TzBWQlJFODdPMnRDUVdOVUxFOUJRVUVzUjBGQlV5eFRRVUZETEUxQlFVUXNSVUZCVXl4TFFVRlVPMEZCUTFBc1VVRkJRVHRKUVVGQkxFMUJRVUVzUjBGQlV5eEpRVUZETEVOQlFVRXNaVUZCUkN4RFFVRnBRaXhOUVVGcVFqdEpRVU5VTEdWQlFVRXNSMEZCYTBJc1EwRkJReXhEUVVGRExFMUJRVVlzUTBGQlV5eEZRVUZVTEVWQlFXRXNUVUZCWWp0SlFVTnNRaXhKUVVGblFpeE5RVUZCTEV0QlFWVXNTMEZCTVVJN1FVRkJRU3hoUVVGUExFMUJRVkE3TzBsQlJVRXNSMEZCUVN4SFFVRk5MRWxCUVVNc1EwRkJRVHRCUVV0UU8wRkJRVUVzVTBGQlFTeHhRMEZCUVRzN1RVRkRSU3hMUVVGQkxFZEJRVkVzVFVGQlR5eERRVUZCTEVsQlFVRTdUVUZEWml4SFFVRkJMRWRCUVUwc1IwRkJSeXhEUVVGRExFOUJRVW9zUTBGQldTeE5RVUZCTEVOQlFVRXNUVUZCUVN4SFFVRlRMRWxCUVZRc1JVRkJaMElzUjBGQmFFSXNRMEZCV2l4RlFVRm5ReXhMUVVGb1F6dE5RVU5PTEU5QlFVOHNaVUZCWjBJc1EwRkJRU3hKUVVGQk8wRkJTSHBDTzBGQlRVRTdRVUZCUVN4VFFVRkJMSGREUVVGQk96dE5RVU5GTEVsQlFVY3NTMEZCUVN4SFFVRlJMRTFCUVU4c1EwRkJRU3hKUVVGQkxFTkJRV3hDTzFGQlEwVXNSMEZCUVN4SFFVRk5MRWRCUVVjc1EwRkJReXhQUVVGS0xFTkJRVmtzVFVGQlFTeERRVUZCTEUxQlFVRXNSMEZCVXl4SlFVRlVMRVZCUVdkQ0xFZEJRV2hDTEVOQlFWb3NSVUZCWjBNc1MwRkJhRU03VVVGRFRpeFBRVUZQTEdWQlFXZENMRU5CUVVFc1NVRkJRU3hGUVVaNlFqczdRVUZFUmp0SlFVMUJMRWRCUVVFc1IwRkJUU3hIUVVGSExFTkJRVU1zVDBGQlNpeERRVUZaTEdOQlFWb3NSVUZCTkVJc1UwRkJReXhMUVVGRUxFVkJRVkVzVDBGQlVqdE5RVU5vUXl4SlFVRkhMRTlCUVU4c1EwRkJReXhMUVVGU0xFTkJRV01zVDBGQlpDeERRVUZJTzJWQlEwVXNSMEZFUmp0UFFVRkJMRTFCUVVFN1pVRkhSU3hSUVVoR096dEpRVVJuUXl4RFFVRTFRanRKUVU5T0xFZEJRVUVzUjBGQlRTeHZRa0ZCUVN4RFFVRnhRaXhIUVVGeVFpeEZRVUV3UWl4SlFVRkRMRU5CUVVFc1QwRkJUeXhEUVVGRExGRkJRVzVETzBsQlJVNHNTVUZCZVVNc1QwRkJUeXhMUVVGUUxFdEJRV3RDTEZGQlFUTkVPMDFCUVVFc1MwRkJRU3hIUVVGUkxFdEJRVXNzUTBGQlF5eFhRVUZYTEVOQlFVTXNTMEZCYkVJc1EwRkJkMElzUzBGQmVFSXNSVUZCVWpzN1NVRkRRU3hKUVVGMVF5eEpRVUZETEVOQlFVRXNUMEZCVHl4RFFVRkRMRlZCUVZRc1MwRkJkVUlzUzBGQk9VUTdUVUZCUVN4RFFVRkRMRU5CUVVNc1RVRkJSaXhEUVVGVExFdEJRVlFzUlVGQlowSXNaVUZCYUVJc1JVRkJRVHM3U1VGRFFTeEpRVUZCTEVOQlFYTkVMRXRCUVVzc1EwRkJReXhQUVVGT0xFTkJRV01zUzBGQlpDeERRVUYwUkR0TlFVRkJMRWRCUVVFc1NVRkJUeXhIUVVGQkxFZEJRVTBzUzBGQlN5eERRVUZETEZkQlFWY3NRMEZCUXl4VFFVRnNRaXhEUVVFMFFpeExRVUUxUWl4RlFVRmlPenRYUVVOQk8wVkJiRU5QT3p0clFrRnhRMVFzWlVGQlFTeEhRVUZwUWl4VFFVRkRMRTFCUVVRN1FVRkRaaXhSUVVGQk8wbEJRVUVzU1VGQlJ5eExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRTFCUVdRc1EwRkJTRHROUVVWRkxFbEJRV2RDTEUxQlFVMHNRMEZCUXl4TlFVRlFMRWRCUVdkQ0xFbEJRVU1zUTBGQlFTeGpRVUZqTEVOQlFVTXNUVUZCYUVRN1FVRkJRU3hsUVVGUExFMUJRVkE3TzAxQlIwRXNWVUZCUVN4SFFVRmhPMDFCUTJJc1YwRkJRU3hIUVVGakxFbEJRVU1zUTBGQlFTeGpRVUZqTEVOQlFVTXNUVUZCYUVJc1EwRkJkVUlzU1VGQlF5eERRVUZCTEdOQlFYaENPMEZCUTJRc1YwRkJhMElzTUVWQlFXeENPMUZCUTBVc1UwRkJRU3hIUVVGWkxGZEJRVmtzUTBGQlFTeFZRVUZCTzFGQlEzaENMRlZCUVZjc1EwRkJRU3hUUVVGQkxFTkJRVmdzUjBGQmQwSXNUVUZCVHl4RFFVRkJMRlZCUVVFN1FVRkdha003VFVGSlFTeEpRVUZCTEVOQlFXOUNMRWxCUVVNc1EwRkJRU3hsUVVGRUxFTkJRV2xDTEZWQlFXcENMRU5CUVhCQ08wRkJRVUVzWlVGQlR5eE5RVUZRT3p0TlFVVkJMRTFCUVVFc1IwRkJVeXhYUVdKWU8wdEJRVUVzVFVGQlFUczdVVUZuUWtVc1UwRkJWVHM3VFVGRlZpeEpRVUZCTEVOQlFXOUNMRWxCUVVNc1EwRkJRU3hWUVVGRUxFTkJRVmtzVFVGQldpeERRVUZ3UWp0QlFVRkJMR1ZCUVU4c1RVRkJVRHRQUVd4Q1JqczdWMEZ2UWtFN1JVRnlRbVU3TzJ0Q1FYZENha0lzWlVGQlFTeEhRVUZwUWl4VFFVRkRMRTFCUVVRN1FVRkZaaXhSUVVGQk8wbEJRVUVzVjBGQlFTeEhRVUZqTEVsQlFVTXNRMEZCUVN4UFFVRlBMRU5CUVVNN1YwRkRka0lzVFVGQlRTeERRVUZETEVsQlFWQXNRMEZCV1N4WFFVRkJMRWxCUVdVc1JVRkJNMElzUTBGQk9FSXNRMEZCUXl4TFFVRXZRaXhEUVVGeFF5eFRRVUZETEVkQlFVUTdZVUZEYmtNc1YwRkJXU3hEUVVGQkxFZEJRVUVzUTBGQlNTeERRVUZETEVsQlFXcENMRU5CUVhOQ0xFMUJRVThzUTBGQlFTeEhRVUZCTEVOQlFUZENPMGxCUkcxRExFTkJRWEpETzBWQlNHVTdPMnRDUVU5cVFpeFZRVUZCTEVkQlFWa3NVMEZCUXl4TlFVRkVPMEZCUlZZc1VVRkJRVHRCUVVGQk8wRkJRVUVzVTBGQlFTeHhRMEZCUVRzN1RVRkRSU3hKUVVGblFpeE5RVUZQTEVOQlFVRXNVMEZCUVN4RFFVRlFMRXRCUVhGQ0xFMUJRWEpETzBGQlFVRXNaVUZCVHl4TlFVRlFPenRCUVVSR08xZEJSMEVzU1VGQlF5eERRVUZCTEdWQlFVUXNRMEZCYVVJc1RVRkJha0k3UlVGTVZUczdhMEpCVTFvc1dVRkJRU3hIUVVGakxGTkJRVUU3UVVGRFdpeFJRVUZCTzBsQlFVRXNUMEZCUVN4SFFVRlZMRWxCUVVNc1EwRkJRVHRKUVVkWUxFOUJRVUVzUjBGQlZTeFBRVUZQTEVOQlFVTXNUMEZCVWl4RFFVRm5RaXhaUVVGb1FpeEZRVUU0UWl4TlFVRTVRanRKUVUxV0xFbEJRVU1zUTBGQlFTeGhRVUZFTEVOQlFXVXNUMEZCWml4RlFVRjNRaXhEUVVGQkxGTkJRVUVzUzBGQlFUdGhRVUZCTEZOQlFVTXNTMEZCUkN4RlFVRlJMRXRCUVZJN1pVRkRkRUlzUzBGQlF5eERRVUZCTEZOQlFWTXNRMEZCUXl4SlFVRllMRU5CUVdkQ0xFdEJRV2hDTzAxQlJITkNPMGxCUVVFc1EwRkJRU3hEUVVGQkxFTkJRVUVzU1VGQlFTeERRVUY0UWp0SlFVbEJMRTlCUVVFc1IwRkJWU3hQUVVGUExFTkJRVU1zVDBGQlVpeERRVUZuUWl4alFVRm9RaXhGUVVGblF5eEpRVUZETEVOQlFVRXNiMEpCUVdwRE8wbEJSMVlzVDBGQlFTeEhRVUZWTEVsQlFVTXNRMEZCUVN4aFFVRkVMRU5CUVdVc1QwRkJaaXhGUVVGM1FpeERRVUZCTEZOQlFVRXNTMEZCUVR0aFFVRkJMRk5CUVVNc1MwRkJSQ3hGUVVGUkxFdEJRVkk3VVVGRGFFTXNTMEZCUXl4RFFVRkJMR05CUVdNc1EwRkJReXhKUVVGb1FpeERRVUZ4UWl4TFFVRnlRanRsUVVOQkxFdEJRVU1zUTBGQlFTeHRRa0ZCUkN4RFFVRnhRaXhMUVVGeVFqdE5RVVpuUXp0SlFVRkJMRU5CUVVFc1EwRkJRU3hEUVVGQkxFbEJRVUVzUTBGQmVFSTdWMEZOVml4SlFVRkRMRU5CUVVFc1RVRkJSQ3hIUVVGVkxFMUJRVUVzUTBGQlFTeEhRVUZCTEVkQlFVMHNUMEZCVGl4SFFVRmpMRzFDUVVGa08wVkJka0pGT3p0clFrRjVRbVFzYjBKQlFVRXNSMEZCYzBJc1UwRkJReXhMUVVGRUxFVkJRVkVzWlVGQlVqdEJRVVZ3UWl4UlFVRkJPMGxCUVVFc1QwRkJRU3hIUVVGVkxFbEJRVU1zUTBGQlFTeGhRVUZFTEVOQlFXVXNaVUZCWml4RlFVRm5ReXhEUVVGQkxGTkJRVUVzUzBGQlFUdGhRVUZCTEZOQlFVTXNTMEZCUkN4RlFVRlJMRXRCUVZJN1VVRkRlRU1zUzBGQlF5eERRVUZCTEdOQlFXTXNRMEZCUXl4SlFVRm9RaXhEUVVGeFFpeExRVUZ5UWp0bFFVVkJMRXRCUVVNc1EwRkJRU3h0UWtGQlJDeERRVUZ4UWl4TFFVRnlRanROUVVoM1F6dEpRVUZCTEVOQlFVRXNRMEZCUVN4RFFVRkJMRWxCUVVFc1EwRkJhRU03VjBGTlZpeExRVUZCTEVkQlFVMHNUMEZCVGl4SFFVRmpPMFZCVWswN08ydENRVlYwUWl4aFFVRkJMRWRCUVdVc1UwRkJReXhEUVVGRUxFVkJRVWtzVVVGQlNqdFhRVVZpTEVOQlFVTXNRMEZCUXl4UFFVRkdMRU5CUVZVc1YwRkJWaXhGUVVGMVFpeFJRVUYyUWp0RlFVWmhPenRyUWtGSlppeHRRa0ZCUVN4SFFVRnhRaXhUUVVGRExFdEJRVVE3U1VGRGJrSXNTVUZCUnl4TFFVRk5MRU5CUVVFc1EwRkJRU3hEUVVGT0xFdEJRVmtzUjBGQlpqdGhRVVZGTEdGQlJrWTdTMEZCUVN4TlFVRkJPMkZCUzBVc1VVRk1SanM3UlVGRWJVSTdPMnRDUVZOeVFpeEpRVUZCTEVkQlFVMHNVMEZCUXl4SlFVRkVPMEZCUlVvc1VVRkJRVHRKUVVGQkxFOUJRVUVzUjBGQlZTeEpRVUZETEVOQlFVRXNUVUZCVFN4RFFVRkRMRWxCUVZJc1EwRkJZU3hKUVVGaU8wbEJRMVlzU1VGQlFTeERRVUZ2UWl4UFFVRndRanRCUVVGQkxHRkJRVThzVFVGQlVEczdTVUZIUVN4WFFVRkJMRWRCUVdNc1NVRkJReXhEUVVGQkxFOUJRVThzUTBGQlF6dEpRVU4yUWl4SlFVRkhMRmRCUVVnN1FVRkRSU3hoUVVGUExFbEJRVU1zUTBGQlFTeGxRVUZFTEVOQlFXbENMRWxCUVVNc1EwRkJRU3hoUVVGRUxFTkJRV1VzU1VGQlppeERRVUZxUWl4RlFVUlVPenRYUVVkQk8wVkJWa2s3TzJ0Q1FXTk9MRTlCUVVFc1IwRkJVeXhUUVVGRExGVkJRVVFzUlVGQllTeFBRVUZpTzBGQlExQXNVVUZCUVR0SlFVRkJMRTlCUVVFc1IwRkJWU3hEUVVGRExFTkJRVU1zVFVGQlJpeERRVUZUTEVWQlFWUXNSVUZCWVN4UFFVRmlPMGxCU1ZZc1NVRkJSeXhWUVVGQkxFbEJRV1VzVDBGQlR5eFZRVUZRTEV0QlFYRkNMRkZCUVhaRE8wMUJRMFVzUzBGQlFTeEhRVUZSTEV0QlFVc3NRMEZCUXl4WFFVRlhMRU5CUVVNc1UwRkJiRUlzUTBGQk5FSXNUMEZCVHl4RFFVRkRMRXRCUVhCRE8wMUJRMUlzVFVGQlFTeEhRVUZUTzAxQlExUXNTVUZCUVN4SFFVRlBMRWxCUVVNc1EwRkJRU3hQUVVGRUxFTkJRVk1zVFVGQlZDeEZRVWhVTzB0QlFVRXNUVUZCUVR0TlFVdEZMRTFCUVdkQ0xGVkJRVlVzUTBGQlF5eExRVUZZTEVOQlFXbENMRWRCUVdwQ0xFTkJRV2hDTEVWQlFVTXNZVUZCUkN4RlFVRlBPMDFCUTFBc1NVRkJUeXhoUVVGUU8xRkJRMFVzUzBGQlFTeEhRVUZSTEVkQlJGWTdUMEZCUVN4TlFVRkJPMUZCUjBVc1QwRkJUeXhEUVVGRExFdEJRVklzUjBGQlowSXNTMEZCU3l4RFFVRkRMRmRCUVZjc1EwRkJReXhMUVVGc1FpeERRVUYzUWl4TFFVRjRRaXhGUVVoc1FqczdUVUZKUVN4TlFVRkJMRWRCUVZNc1NVRkJReXhEUVVGQkxHRkJRVVFzUTBGQlpTeEpRVUZtTzAxQlExUXNTVUZCUVN4SFFVRlBMRzlDUVVGQkxFTkJRWEZDTEVsQlFYSkNMRVZCUVRKQ0xFbEJRVU1zUTBGQlFTeFBRVUZQTEVOQlFVTXNVVUZCY0VNc1JVRllWRHM3U1VGaFFTeFpRVUZCTEVkQlFXVXNRMEZCUXl4RFFVRkRMRTFCUVVZc1EwRkJVeXhGUVVGVUxFVkJRV0VzVFVGQllpeEZRVUZ4UWl4SlFVRkRMRU5CUVVFc1QwRkJUeXhEUVVGRExFMUJRVGxDTzBsQlIyWXNTMEZCUVN4SFFVRlJPMDFCUVVNc1RVRkJRU3hKUVVGRU8wMUJRVkVzVVVGQlJDeEpRVUZETEVOQlFVRXNUVUZCVWp0TlFVRnBRaXhaUVVGRUxFbEJRVU1zUTBGQlFTeFZRVUZxUWp0TlFVRTRRaXhOUVVGRUxFbEJRVU1zUTBGQlFTeEpRVUU1UWp0TlFVRnZReXhQUVVGQkxFdEJRWEJET3p0WFFVbFNMRWxCUVVNc1EwRkJRU3haUVVGRUxFTkJRV01zWTBGQlpDeEZRVUU0UWl4TFFVRTVRaXhGUVVGeFF5eFpRVUZ5UXl4RlFVRnRSQ3hQUVVGdVJEdEZRWHBDVHpzN2EwSkJORUpVTEdGQlFVRXNSMEZCWlN4VFFVRkRMRWxCUVVRN1FVRkRZaXhSUVVGQk8wbEJRVUVzVFVGQlFTeEhRVUZUTzBsQlIxUXNUMEZCUVN4SFFVRlZMRWxCUVVNc1EwRkJRU3hOUVVGTkxFTkJRVU1zU1VGQlVpeERRVUZoTEVsQlFXSTdRVUZIVmp0QlFVRkJMRk5CUVVFc2NVUkJRVUU3TzAxQlEwVXNVMEZCUVN4SFFVRmxMRWxCUVVNc1EwRkJRU3hUUVVGVExFTkJRVU1zVFVGQlpDeEhRVUV3UWl4SlFVRkRMRU5CUVVFc1UwRkJWU3hEUVVGQkxFdEJRVUVzUTBGQmNrTXNSMEZCYVVRN1RVRkROMFFzVFVGQlR5eERRVUZCTEZOQlFVRXNRMEZCVUN4SFFVRnZRanRCUVVaMFFqdFhRVWxCTzBWQldHRWlmUT09XG4iLCIndXNlIHN0cmljdCc7XG52YXIgQmFja2JvbmUsIEV2ZW50QnJva2VyLCBIaXN0b3J5LCBSb3V0ZSwgUm91dGVyLCBfLCBtZWRpYXRvciwgdXRpbHMsXG4gIGJpbmQgPSBmdW5jdGlvbihmbiwgbWUpeyByZXR1cm4gZnVuY3Rpb24oKXsgcmV0dXJuIGZuLmFwcGx5KG1lLCBhcmd1bWVudHMpOyB9OyB9O1xuXG5fID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG5CYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG5cbkV2ZW50QnJva2VyID0gcmVxdWlyZSgnLi9ldmVudF9icm9rZXInKTtcblxuSGlzdG9yeSA9IHJlcXVpcmUoJy4vaGlzdG9yeScpO1xuXG5Sb3V0ZSA9IHJlcXVpcmUoJy4vcm91dGUnKTtcblxudXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbm1lZGlhdG9yID0gcmVxdWlyZSgnLi4vbWVkaWF0b3InKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXIgPSAoZnVuY3Rpb24oKSB7XG4gIFJvdXRlci5leHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQ7XG5cbiAgXy5leHRlbmQoUm91dGVyLnByb3RvdHlwZSwgRXZlbnRCcm9rZXIpO1xuXG4gIGZ1bmN0aW9uIFJvdXRlcihvcHRpb25zMSkge1xuICAgIHZhciBpc1dlYkZpbGU7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9uczEgIT0gbnVsbCA/IG9wdGlvbnMxIDoge307XG4gICAgdGhpcy5tYXRjaCA9IGJpbmQodGhpcy5tYXRjaCwgdGhpcyk7XG4gICAgaXNXZWJGaWxlID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sICE9PSAnZmlsZTonO1xuICAgIF8uZGVmYXVsdHModGhpcy5vcHRpb25zLCB7XG4gICAgICBwdXNoU3RhdGU6IGlzV2ViRmlsZSxcbiAgICAgIHJvb3Q6ICcvJyxcbiAgICAgIHRyYWlsaW5nOiBmYWxzZVxuICAgIH0pO1xuICAgIHRoaXMucmVtb3ZlUm9vdCA9IG5ldyBSZWdFeHAoJ14nICsgdXRpbHMuZXNjYXBlUmVnRXhwKHRoaXMub3B0aW9ucy5yb290KSArICcoIyk/Jyk7XG4gICAgdGhpcy5zdWJzY3JpYmVFdmVudCgnIXJvdXRlcjpyb3V0ZScsIHRoaXMub2xkRXZlbnRFcnJvcik7XG4gICAgdGhpcy5zdWJzY3JpYmVFdmVudCgnIXJvdXRlcjpyb3V0ZUJ5TmFtZScsIHRoaXMub2xkRXZlbnRFcnJvcik7XG4gICAgdGhpcy5zdWJzY3JpYmVFdmVudCgnIXJvdXRlcjpjaGFuZ2VVUkwnLCB0aGlzLm9sZFVSTEV2ZW50RXJyb3IpO1xuICAgIHRoaXMuc3Vic2NyaWJlRXZlbnQoJ2Rpc3BhdGNoZXI6ZGlzcGF0Y2gnLCB0aGlzLmNoYW5nZVVSTCk7XG4gICAgbWVkaWF0b3Iuc2V0SGFuZGxlcigncm91dGVyOnJvdXRlJywgdGhpcy5yb3V0ZSwgdGhpcyk7XG4gICAgbWVkaWF0b3Iuc2V0SGFuZGxlcigncm91dGVyOnJldmVyc2UnLCB0aGlzLnJldmVyc2UsIHRoaXMpO1xuICAgIHRoaXMuY3JlYXRlSGlzdG9yeSgpO1xuICB9XG5cbiAgUm91dGVyLnByb3RvdHlwZS5vbGRFdmVudEVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCchcm91dGVyOnJvdXRlIGFuZCAhcm91dGVyOnJvdXRlQnlOYW1lIGV2ZW50cyB3ZXJlIHJlbW92ZWQuIFVzZSBgQ2hhcGxpbi51dGlscy5yZWRpcmVjdFRvYCcpO1xuICB9O1xuXG4gIFJvdXRlci5wcm90b3R5cGUub2xkVVJMRXZlbnRFcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignIXJvdXRlcjpjaGFuZ2VVUkwgZXZlbnQgd2FzIHJlbW92ZWQuJyk7XG4gIH07XG5cbiAgUm91dGVyLnByb3RvdHlwZS5jcmVhdGVIaXN0b3J5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIEJhY2tib25lLmhpc3RvcnkgPSBuZXcgSGlzdG9yeSgpO1xuICB9O1xuXG4gIFJvdXRlci5wcm90b3R5cGUuc3RhcnRIaXN0b3J5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQodGhpcy5vcHRpb25zKTtcbiAgfTtcblxuICBSb3V0ZXIucHJvdG90eXBlLnN0b3BIaXN0b3J5ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKEJhY2tib25lLkhpc3Rvcnkuc3RhcnRlZCkge1xuICAgICAgcmV0dXJuIEJhY2tib25lLmhpc3Rvcnkuc3RvcCgpO1xuICAgIH1cbiAgfTtcblxuICBSb3V0ZXIucHJvdG90eXBlLmZpbmRIYW5kbGVyID0gZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgdmFyIGhhbmRsZXIsIGksIGxlbiwgcmVmO1xuICAgIHJlZiA9IEJhY2tib25lLmhpc3RvcnkuaGFuZGxlcnM7XG4gICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBoYW5kbGVyID0gcmVmW2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZShoYW5kbGVyKSkge1xuICAgICAgICByZXR1cm4gaGFuZGxlcjtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgUm91dGVyLnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uKHBhdHRlcm4sIHRhcmdldCwgb3B0aW9ucykge1xuICAgIHZhciBhY3Rpb24sIGNvbnRyb2xsZXIsIHJlZiwgcmVmMSwgcm91dGU7XG4gICAgaWYgKG9wdGlvbnMgPT0gbnVsbCkge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMiAmJiB0YXJnZXQgJiYgdHlwZW9mIHRhcmdldCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJlZiA9IG9wdGlvbnMgPSB0YXJnZXQsIGNvbnRyb2xsZXIgPSByZWYuY29udHJvbGxlciwgYWN0aW9uID0gcmVmLmFjdGlvbjtcbiAgICAgIGlmICghKGNvbnRyb2xsZXIgJiYgYWN0aW9uKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JvdXRlciNtYXRjaCBtdXN0IHJlY2VpdmUgZWl0aGVyIHRhcmdldCBvciAnICsgJ29wdGlvbnMuY29udHJvbGxlciAmIG9wdGlvbnMuYWN0aW9uJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRyb2xsZXIgPSBvcHRpb25zLmNvbnRyb2xsZXIsIGFjdGlvbiA9IG9wdGlvbnMuYWN0aW9uO1xuICAgICAgaWYgKGNvbnRyb2xsZXIgfHwgYWN0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUm91dGVyI21hdGNoIGNhbm5vdCB1c2UgYm90aCB0YXJnZXQgYW5kICcgKyAnb3B0aW9ucy5jb250cm9sbGVyIC8gb3B0aW9ucy5hY3Rpb24nKTtcbiAgICAgIH1cbiAgICAgIHJlZjEgPSB0YXJnZXQuc3BsaXQoJyMnKSwgY29udHJvbGxlciA9IHJlZjFbMF0sIGFjdGlvbiA9IHJlZjFbMV07XG4gICAgfVxuICAgIF8uZGVmYXVsdHMob3B0aW9ucywge1xuICAgICAgdHJhaWxpbmc6IHRoaXMub3B0aW9ucy50cmFpbGluZ1xuICAgIH0pO1xuICAgIHJvdXRlID0gbmV3IFJvdXRlKHBhdHRlcm4sIGNvbnRyb2xsZXIsIGFjdGlvbiwgb3B0aW9ucyk7XG4gICAgQmFja2JvbmUuaGlzdG9yeS5oYW5kbGVycy5wdXNoKHtcbiAgICAgIHJvdXRlOiByb3V0ZSxcbiAgICAgIGNhbGxiYWNrOiByb3V0ZS5oYW5kbGVyXG4gICAgfSk7XG4gICAgcmV0dXJuIHJvdXRlO1xuICB9O1xuXG4gIFJvdXRlci5wcm90b3R5cGUucm91dGUgPSBmdW5jdGlvbihwYXRoRGVzYywgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgdmFyIGhhbmRsZXIsIHBhdGgsIHBhdGhQYXJhbXM7XG4gICAgaWYgKHBhdGhEZXNjICYmIHR5cGVvZiBwYXRoRGVzYyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHBhdGggPSBwYXRoRGVzYy51cmw7XG4gICAgICBpZiAoIXBhcmFtcyAmJiBwYXRoRGVzYy5wYXJhbXMpIHtcbiAgICAgICAgcGFyYW1zID0gcGF0aERlc2MucGFyYW1zO1xuICAgICAgfVxuICAgIH1cbiAgICBwYXJhbXMgPSBBcnJheS5pc0FycmF5KHBhcmFtcykgPyBwYXJhbXMuc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBwYXJhbXMpO1xuICAgIGlmIChwYXRoICE9IG51bGwpIHtcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UodGhpcy5yZW1vdmVSb290LCAnJyk7XG4gICAgICBoYW5kbGVyID0gdGhpcy5maW5kSGFuZGxlcihmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVyLnJvdXRlLnRlc3QocGF0aCk7XG4gICAgICB9KTtcbiAgICAgIG9wdGlvbnMgPSBwYXJhbXM7XG4gICAgICBwYXJhbXMgPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gXy5leHRlbmQoe30sIG9wdGlvbnMpO1xuICAgICAgaGFuZGxlciA9IHRoaXMuZmluZEhhbmRsZXIoZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICBpZiAoaGFuZGxlci5yb3V0ZS5tYXRjaGVzKHBhdGhEZXNjKSkge1xuICAgICAgICAgIHBhcmFtcyA9IGhhbmRsZXIucm91dGUubm9ybWFsaXplUGFyYW1zKHBhcmFtcyk7XG4gICAgICAgICAgaWYgKHBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoaGFuZGxlcikge1xuICAgICAgXy5kZWZhdWx0cyhvcHRpb25zLCB7XG4gICAgICAgIGNoYW5nZVVSTDogdHJ1ZVxuICAgICAgfSk7XG4gICAgICBwYXRoUGFyYW1zID0gcGF0aCAhPSBudWxsID8gcGF0aCA6IHBhcmFtcztcbiAgICAgIGhhbmRsZXIuY2FsbGJhY2socGF0aFBhcmFtcywgb3B0aW9ucyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSb3V0ZXIjcm91dGU6IHJlcXVlc3Qgd2FzIG5vdCByb3V0ZWQnKTtcbiAgICB9XG4gIH07XG5cbiAgUm91dGVyLnByb3RvdHlwZS5yZXZlcnNlID0gZnVuY3Rpb24oY3JpdGVyaWEsIHBhcmFtcywgcXVlcnkpIHtcbiAgICB2YXIgaGFuZGxlciwgaGFuZGxlcnMsIGksIGxlbiwgcmV2ZXJzZWQsIHJvb3QsIHVybDtcbiAgICByb290ID0gdGhpcy5vcHRpb25zLnJvb3Q7XG4gICAgaWYgKChwYXJhbXMgIT0gbnVsbCkgJiYgdHlwZW9mIHBhcmFtcyAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1JvdXRlciNyZXZlcnNlOiBwYXJhbXMgbXVzdCBiZSBhbiBhcnJheSBvciBhbiAnICsgJ29iamVjdCcpO1xuICAgIH1cbiAgICBoYW5kbGVycyA9IEJhY2tib25lLmhpc3RvcnkuaGFuZGxlcnM7XG4gICAgZm9yIChpID0gMCwgbGVuID0gaGFuZGxlcnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGhhbmRsZXIgPSBoYW5kbGVyc1tpXTtcbiAgICAgIGlmICghKGhhbmRsZXIucm91dGUubWF0Y2hlcyhjcml0ZXJpYSkpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcmV2ZXJzZWQgPSBoYW5kbGVyLnJvdXRlLnJldmVyc2UocGFyYW1zLCBxdWVyeSk7XG4gICAgICBpZiAocmV2ZXJzZWQgIT09IGZhbHNlKSB7XG4gICAgICAgIHVybCA9IHJvb3QgPyByb290ICsgcmV2ZXJzZWQgOiByZXZlcnNlZDtcbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdSb3V0ZXIjcmV2ZXJzZTogaW52YWxpZCByb3V0ZSBjcml0ZXJpYSBzcGVjaWZpZWQ6ICcgKyAoXCJcIiArIChKU09OLnN0cmluZ2lmeShjcml0ZXJpYSkpKSk7XG4gIH07XG5cbiAgUm91dGVyLnByb3RvdHlwZS5jaGFuZ2VVUkwgPSBmdW5jdGlvbihjb250cm9sbGVyLCBwYXJhbXMsIHJvdXRlLCBvcHRpb25zKSB7XG4gICAgdmFyIG5hdmlnYXRlT3B0aW9ucywgdXJsO1xuICAgIGlmICghKChyb3V0ZS5wYXRoICE9IG51bGwpICYmIChvcHRpb25zICE9IG51bGwgPyBvcHRpb25zLmNoYW5nZVVSTCA6IHZvaWQgMCkpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHVybCA9IHJvdXRlLnBhdGggKyAocm91dGUucXVlcnkgPyBcIj9cIiArIHJvdXRlLnF1ZXJ5IDogJycpO1xuICAgIG5hdmlnYXRlT3B0aW9ucyA9IHtcbiAgICAgIHRyaWdnZXI6IG9wdGlvbnMudHJpZ2dlciA9PT0gdHJ1ZSxcbiAgICAgIHJlcGxhY2U6IG9wdGlvbnMucmVwbGFjZSA9PT0gdHJ1ZVxuICAgIH07XG4gICAgcmV0dXJuIEJhY2tib25lLmhpc3RvcnkubmF2aWdhdGUodXJsLCBuYXZpZ2F0ZU9wdGlvbnMpO1xuICB9O1xuXG4gIFJvdXRlci5wcm90b3R5cGUuZGlzcG9zZWQgPSBmYWxzZTtcblxuICBSb3V0ZXIucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnN0b3BIaXN0b3J5KCk7XG4gICAgZGVsZXRlIEJhY2tib25lLmhpc3Rvcnk7XG4gICAgdGhpcy51bnN1YnNjcmliZUFsbEV2ZW50cygpO1xuICAgIG1lZGlhdG9yLnJlbW92ZUhhbmRsZXJzKHRoaXMpO1xuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICAgIHJldHVybiBPYmplY3QuZnJlZXplKHRoaXMpO1xuICB9O1xuXG4gIHJldHVybiBSb3V0ZXI7XG5cbn0pKCk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pY205MWRHVnlMbXB6SWl3aWMyOTFjbU5sVW05dmRDSTZJaUlzSW5OdmRYSmpaWE1pT2xzaWNtOTFkR1Z5TG1OdlptWmxaU0pkTENKdVlXMWxjeUk2VzEwc0ltMWhjSEJwYm1keklqb2lRVUZCUVR0QlFVRkJMRWxCUVVFc2FVVkJRVUU3UlVGQlFUczdRVUZGUVN4RFFVRkJMRWRCUVVrc1QwRkJRU3hEUVVGUkxGbEJRVkk3TzBGQlEwb3NVVUZCUVN4SFFVRlhMRTlCUVVFc1EwRkJVU3hWUVVGU096dEJRVVZZTEZkQlFVRXNSMEZCWXl4UFFVRkJMRU5CUVZFc1owSkJRVkk3TzBGQlEyUXNUMEZCUVN4SFFVRlZMRTlCUVVFc1EwRkJVU3hYUVVGU096dEJRVU5XTEV0QlFVRXNSMEZCVVN4UFFVRkJMRU5CUVZFc1UwRkJVanM3UVVGRFVpeExRVUZCTEVkQlFWRXNUMEZCUVN4RFFVRlJMRk5CUVZJN08wRkJRMUlzVVVGQlFTeEhRVUZYTEU5QlFVRXNRMEZCVVN4aFFVRlNPenRCUVV0WUxFMUJRVTBzUTBGQlF5eFBRVUZRTEVkQlFYVkNPMFZCUlhKQ0xFMUJRVU1zUTBGQlFTeE5RVUZFTEVkQlFWVXNVVUZCVVN4RFFVRkRMRXRCUVVzc1EwRkJRenM3UlVGSGVrSXNRMEZCUXl4RFFVRkRMRTFCUVVZc1EwRkJVeXhOUVVGRExFTkJRVUVzVTBGQlZpeEZRVUZ4UWl4WFFVRnlRanM3UlVGRllTeG5Ra0ZCUXl4UlFVRkVPMEZCUjFnc1VVRkJRVHRKUVVoWkxFbEJRVU1zUTBGQlFTdzJRa0ZCUkN4WFFVRlhPenRKUVVkMlFpeFRRVUZCTEVkQlFWa3NUVUZCVFN4RFFVRkRMRkZCUVZFc1EwRkJReXhSUVVGb1FpeExRVUU0UWp0SlFVTXhReXhEUVVGRExFTkJRVU1zVVVGQlJpeERRVUZYTEVsQlFVTXNRMEZCUVN4UFFVRmFMRVZCUTBVN1RVRkJRU3hUUVVGQkxFVkJRVmNzVTBGQldEdE5RVU5CTEVsQlFVRXNSVUZCVFN4SFFVUk9PMDFCUlVFc1VVRkJRU3hGUVVGVkxFdEJSbFk3UzBGRVJqdEpRVTFCTEVsQlFVTXNRMEZCUVN4VlFVRkVMRWRCUVdNc1NVRkJTU3hOUVVGS0xFTkJRVmNzUjBGQlFTeEhRVUZOTEV0QlFVc3NRMEZCUXl4WlFVRk9MRU5CUVcxQ0xFbEJRVU1zUTBGQlFTeFBRVUZQTEVOQlFVTXNTVUZCTlVJc1EwRkJUaXhIUVVFd1F5eE5RVUZ5UkR0SlFVVmtMRWxCUVVNc1EwRkJRU3hqUVVGRUxFTkJRV2RDTEdWQlFXaENMRVZCUVdsRExFbEJRVU1zUTBGQlFTeGhRVUZzUXp0SlFVTkJMRWxCUVVNc1EwRkJRU3hqUVVGRUxFTkJRV2RDTEhGQ1FVRm9RaXhGUVVGMVF5eEpRVUZETEVOQlFVRXNZVUZCZUVNN1NVRkRRU3hKUVVGRExFTkJRVUVzWTBGQlJDeERRVUZuUWl4dFFrRkJhRUlzUlVGQmNVTXNTVUZCUXl4RFFVRkJMR2RDUVVGMFF6dEpRVVZCTEVsQlFVTXNRMEZCUVN4alFVRkVMRU5CUVdkQ0xIRkNRVUZvUWl4RlFVRjFReXhKUVVGRExFTkJRVUVzVTBGQmVFTTdTVUZGUVN4UlFVRlJMRU5CUVVNc1ZVRkJWQ3hEUVVGdlFpeGpRVUZ3UWl4RlFVRnZReXhKUVVGRExFTkJRVUVzUzBGQmNrTXNSVUZCTkVNc1NVRkJOVU03U1VGRFFTeFJRVUZSTEVOQlFVTXNWVUZCVkN4RFFVRnZRaXhuUWtGQmNFSXNSVUZCYzBNc1NVRkJReXhEUVVGQkxFOUJRWFpETEVWQlFXZEVMRWxCUVdoRU8wbEJSVUVzU1VGQlF5eERRVUZCTEdGQlFVUXNRMEZCUVR0RlFYSkNWenM3YlVKQmRVSmlMR0ZCUVVFc1IwRkJaU3hUUVVGQk8wRkJRMklzVlVGQlRTeEpRVUZKTEV0QlFVb3NRMEZCVlN3eVJrRkJWanRGUVVSUE96dHRRa0ZKWml4blFrRkJRU3hIUVVGclFpeFRRVUZCTzBGQlEyaENMRlZCUVUwc1NVRkJTU3hMUVVGS0xFTkJRVlVzYzBOQlFWWTdSVUZFVlRzN2JVSkJTV3hDTEdGQlFVRXNSMEZCWlN4VFFVRkJPMWRCUTJJc1VVRkJVU3hEUVVGRExFOUJRVlFzUjBGQmJVSXNTVUZCU1N4UFFVRktMRU5CUVVFN1JVRkVUanM3YlVKQlIyWXNXVUZCUVN4SFFVRmpMRk5CUVVFN1YwRkhXaXhSUVVGUkxFTkJRVU1zVDBGQlR5eERRVUZETEV0QlFXcENMRU5CUVhWQ0xFbEJRVU1zUTBGQlFTeFBRVUY0UWp0RlFVaFpPenR0UWtGTlpDeFhRVUZCTEVkQlFXRXNVMEZCUVR0SlFVTllMRWxCUVRKQ0xGRkJRVkVzUTBGQlF5eFBRVUZQTEVOQlFVTXNUMEZCTlVNN1lVRkJRU3hSUVVGUkxFTkJRVU1zVDBGQlR5eERRVUZETEVsQlFXcENMRU5CUVVFc1JVRkJRVHM3UlVGRVZ6czdiVUpCU1dJc1YwRkJRU3hIUVVGaExGTkJRVU1zVTBGQlJEdEJRVU5ZTEZGQlFVRTdRVUZCUVR0QlFVRkJMRk5CUVVFc2NVTkJRVUU3TzFWQlFUaERMRk5CUVVFc1EwRkJWU3hQUVVGV08wRkJRelZETEdWQlFVODdPMEZCUkZRN1JVRkVWenM3YlVKQlRXSXNTMEZCUVN4SFFVRlBMRk5CUVVNc1QwRkJSQ3hGUVVGVkxFMUJRVllzUlVGQmEwSXNUMEZCYkVJN1FVRkRUQ3hSUVVGQk96dE5RVVIxUWl4VlFVRlZPenRKUVVOcVF5eEpRVUZITEZOQlFWTXNRMEZCUXl4TlFVRldMRXRCUVc5Q0xFTkJRWEJDTEVsQlFUQkNMRTFCUVRGQ0xFbEJRWEZETEU5QlFVOHNUVUZCVUN4TFFVRnBRaXhSUVVGNlJEdE5RVVZGTEUxQlFYVkNMRTlCUVVFc1IwRkJWU3hOUVVGcVF5eEZRVUZETERKQ1FVRkVMRVZCUVdFN1RVRkRZaXhKUVVGQkxFTkJRVUVzUTBGQlR5eFZRVUZCTEVsQlFXVXNUVUZCZEVJc1EwRkJRVHRCUVVORkxHTkJRVTBzU1VGQlNTeExRVUZLTEVOQlFWVXNOa05CUVVFc1IwRkRaQ3h4UTBGRVNTeEZRVVJTTzA5QlNFWTdTMEZCUVN4TlFVRkJPMDFCVVVjc0swSkJRVVFzUlVGQllUdE5RVU5pTEVsQlFVY3NWVUZCUVN4SlFVRmpMRTFCUVdwQ08wRkJRMFVzWTBGQlRTeEpRVUZKTEV0QlFVb3NRMEZCVlN3d1EwRkJRU3hIUVVOa0xIRkRRVVJKTEVWQlJGSTdPMDFCU1VFc1QwRkJkVUlzVFVGQlRTeERRVUZETEV0QlFWQXNRMEZCWVN4SFFVRmlMRU5CUVhaQ0xFVkJRVU1zYjBKQlFVUXNSVUZCWVN4cFFrRmlaanM3U1VGcFFrRXNRMEZCUXl4RFFVRkRMRkZCUVVZc1EwRkJWeXhQUVVGWUxFVkJRVzlDTzAxQlFVRXNVVUZCUVN4RlFVRlZMRWxCUVVNc1EwRkJRU3hQUVVGUExFTkJRVU1zVVVGQmJrSTdTMEZCY0VJN1NVRkhRU3hMUVVGQkxFZEJRVkVzU1VGQlNTeExRVUZLTEVOQlFWVXNUMEZCVml4RlFVRnRRaXhWUVVGdVFpeEZRVUVyUWl4TlFVRXZRaXhGUVVGMVF5eFBRVUYyUXp0SlFVMVNMRkZCUVZFc1EwRkJReXhQUVVGUExFTkJRVU1zVVVGQlVTeERRVUZETEVsQlFURkNMRU5CUVN0Q08wMUJRVU1zVDBGQlFTeExRVUZFTzAxQlFWRXNVVUZCUVN4RlFVRlZMRXRCUVVzc1EwRkJReXhQUVVGNFFqdExRVUV2UWp0WFFVTkJPMFZCTlVKTE96dHRRa0ZyUTFBc1MwRkJRU3hIUVVGUExGTkJRVU1zVVVGQlJDeEZRVUZYTEUxQlFWZ3NSVUZCYlVJc1QwRkJia0k3UVVGRlRDeFJRVUZCTzBsQlFVRXNTVUZCUnl4UlFVRkJMRWxCUVdFc1QwRkJUeXhSUVVGUUxFdEJRVzFDTEZGQlFXNURPMDFCUTBVc1NVRkJRU3hIUVVGUExGRkJRVkVzUTBGQlF6dE5RVU5vUWl4SlFVRTBRaXhEUVVGSkxFMUJRVW9zU1VGQlpTeFJRVUZSTEVOQlFVTXNUVUZCY0VRN1VVRkJRU3hOUVVGQkxFZEJRVk1zVVVGQlVTeERRVUZETEU5QlFXeENPMDlCUmtZN08wbEJTVUVzVFVGQlFTeEhRVUZaTEV0QlFVc3NRMEZCUXl4UFFVRk9MRU5CUVdNc1RVRkJaQ3hEUVVGSUxFZEJRMUFzVFVGQlRTeERRVUZETEV0QlFWQXNRMEZCUVN4RFFVUlBMRWRCUjFBc1EwRkJReXhEUVVGRExFMUJRVVlzUTBGQlV5eEZRVUZVTEVWQlFXRXNUVUZCWWp0SlFVbEdMRWxCUVVjc1dVRkJTRHROUVVWRkxFbEJRVUVzUjBGQlR5eEpRVUZKTEVOQlFVTXNUMEZCVEN4RFFVRmhMRWxCUVVNc1EwRkJRU3hWUVVGa0xFVkJRVEJDTEVWQlFURkNPMDFCUjFBc1QwRkJRU3hIUVVGVkxFbEJRVU1zUTBGQlFTeFhRVUZFTEVOQlFXRXNVMEZCUXl4UFFVRkVPMlZCUVdFc1QwRkJUeXhEUVVGRExFdEJRVXNzUTBGQlF5eEpRVUZrTEVOQlFXMUNMRWxCUVc1Q08wMUJRV0lzUTBGQllqdE5RVWRXTEU5QlFVRXNSMEZCVlR0TlFVTldMRTFCUVVFc1IwRkJVeXhMUVZSWU8wdEJRVUVzVFVGQlFUdE5RVmRGTEU5QlFVRXNSMEZCVlN4RFFVRkRMRU5CUVVNc1RVRkJSaXhEUVVGVExFVkJRVlFzUlVGQllTeFBRVUZpTzAxQlIxWXNUMEZCUVN4SFFVRlZMRWxCUVVNc1EwRkJRU3hYUVVGRUxFTkJRV0VzVTBGQlF5eFBRVUZFTzFGQlEzSkNMRWxCUVVjc1QwRkJUeXhEUVVGRExFdEJRVXNzUTBGQlF5eFBRVUZrTEVOQlFYTkNMRkZCUVhSQ0xFTkJRVWc3VlVGRFJTeE5RVUZCTEVkQlFWTXNUMEZCVHl4RFFVRkRMRXRCUVVzc1EwRkJReXhsUVVGa0xFTkJRVGhDTEUxQlFUbENPMVZCUTFRc1NVRkJaU3hOUVVGbU8wRkJRVUVzYlVKQlFVOHNTMEZCVUR0WFFVWkdPenRsUVVkQk8wMUJTbkZDTEVOQlFXSXNSVUZrV2pzN1NVRnZRa0VzU1VGQlJ5eFBRVUZJTzAxQlJVVXNRMEZCUXl4RFFVRkRMRkZCUVVZc1EwRkJWeXhQUVVGWUxFVkJRVzlDTzFGQlFVRXNVMEZCUVN4RlFVRlhMRWxCUVZnN1QwRkJjRUk3VFVGRlFTeFZRVUZCTEVkQlFXZENMRmxCUVVnc1IwRkJZeXhKUVVGa0xFZEJRWGRDTzAxQlEzSkRMRTlCUVU4c1EwRkJReXhSUVVGU0xFTkJRV2xDTEZWQlFXcENMRVZCUVRaQ0xFOUJRVGRDTzJGQlEwRXNTMEZPUmp0TFFVRkJMRTFCUVVFN1FVRlJSU3haUVVGTkxFbEJRVWtzUzBGQlNpeERRVUZWTEhORFFVRldMRVZCVWxJN08wVkJha05MT3p0dFFrRm5SRkFzVDBGQlFTeEhRVUZUTEZOQlFVTXNVVUZCUkN4RlFVRlhMRTFCUVZnc1JVRkJiVUlzUzBGQmJrSTdRVUZEVUN4UlFVRkJPMGxCUVVFc1NVRkJRU3hIUVVGUExFbEJRVU1zUTBGQlFTeFBRVUZQTEVOQlFVTTdTVUZGYUVJc1NVRkJSeXhuUWtGQlFTeEpRVUZaTEU5QlFVOHNUVUZCVUN4TFFVRnRRaXhSUVVGc1F6dEJRVU5GTEZsQlFVMHNTVUZCU1N4VFFVRktMRU5CUVdNc1owUkJRVUVzUjBGRGJFSXNVVUZFU1N4RlFVUlNPenRKUVV0QkxGRkJRVUVzUjBGQlZ5eFJRVUZSTEVOQlFVTXNUMEZCVHl4RFFVRkRPMEZCUXpWQ0xGTkJRVUVzTUVOQlFVRTdPMWxCUVRaQ0xFOUJRVThzUTBGQlF5eExRVUZMTEVOQlFVTXNUMEZCWkN4RFFVRnpRaXhSUVVGMFFqczdPMDFCUlROQ0xGRkJRVUVzUjBGQlZ5eFBRVUZQTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTlCUVdRc1EwRkJjMElzVFVGQmRFSXNSVUZCT0VJc1MwRkJPVUk3VFVGSFdDeEpRVUZITEZGQlFVRXNTMEZCWXl4TFFVRnFRanRSUVVORkxFZEJRVUVzUjBGQlV5eEpRVUZJTEVkQlFXRXNTVUZCUVN4SFFVRlBMRkZCUVhCQ0xFZEJRV3RETzBGQlEzaERMR1ZCUVU4c1NVRkdWRHM3UVVGTVJqdEJRVlZCTEZWQlFVMHNTVUZCU1N4TFFVRktMRU5CUVZVc2IwUkJRVUVzUjBGRFpDeERRVUZCTEVWQlFVRXNSMEZCUlN4RFFVRkRMRWxCUVVrc1EwRkJReXhUUVVGTUxFTkJRV1VzVVVGQlppeERRVUZFTEVOQlFVWXNRMEZFU1R0RlFXNUNRenM3YlVKQmRVSlVMRk5CUVVFc1IwRkJWeXhUUVVGRExGVkJRVVFzUlVGQllTeE5RVUZpTEVWQlFYRkNMRXRCUVhKQ0xFVkJRVFJDTEU5QlFUVkNPMEZCUTFRc1VVRkJRVHRKUVVGQkxFbEJRVUVzUTBGQlFTeERRVUZqTEc5Q1FVRkJMSFZDUVVGblFpeFBRVUZQTEVOQlFVVXNiVUpCUVhaRExFTkJRVUU3UVVGQlFTeGhRVUZCT3p0SlFVVkJMRWRCUVVFc1IwRkJUU3hMUVVGTExFTkJRVU1zU1VGQlRpeEhRVUZoTEVOQlFVY3NTMEZCU3l4RFFVRkRMRXRCUVZRc1IwRkJiMElzUjBGQlFTeEhRVUZKTEV0QlFVc3NRMEZCUXl4TFFVRTVRaXhIUVVFeVF5eEZRVUV6UXp0SlFVVnVRaXhsUVVGQkxFZEJSVVU3VFVGQlFTeFBRVUZCTEVWQlFWTXNUMEZCVHl4RFFVRkRMRTlCUVZJc1MwRkJiVUlzU1VGQk5VSTdUVUZEUVN4UFFVRkJMRVZCUVZNc1QwRkJUeXhEUVVGRExFOUJRVklzUzBGQmJVSXNTVUZFTlVJN08xZEJTVVlzVVVGQlVTeERRVUZETEU5QlFVOHNRMEZCUXl4UlFVRnFRaXhEUVVFd1FpeEhRVUV4UWl4RlFVRXJRaXhsUVVFdlFqdEZRVmhUT3p0dFFrRm5RbGdzVVVGQlFTeEhRVUZWT3p0dFFrRkZWaXhQUVVGQkxFZEJRVk1zVTBGQlFUdEpRVU5RTEVsQlFWVXNTVUZCUXl4RFFVRkJMRkZCUVZnN1FVRkJRU3hoUVVGQk96dEpRVWRCTEVsQlFVTXNRMEZCUVN4WFFVRkVMRU5CUVVFN1NVRkRRU3hQUVVGUExGRkJRVkVzUTBGQlF6dEpRVVZvUWl4SlFVRkRMRU5CUVVFc2IwSkJRVVFzUTBGQlFUdEpRVVZCTEZGQlFWRXNRMEZCUXl4alFVRlVMRU5CUVhkQ0xFbEJRWGhDTzBsQlIwRXNTVUZCUXl4RFFVRkJMRkZCUVVRc1IwRkJXVHRYUVVkYUxFMUJRVTBzUTBGQlF5eE5RVUZRTEVOQlFXTXNTVUZCWkR0RlFXWlBJbjA9XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcHJvcGVydHlEZXNjcmlwdG9yczogdHJ1ZVxufTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2ljM1Z3Y0c5eWRDNXFjeUlzSW5OdmRYSmpaVkp2YjNRaU9pSWlMQ0p6YjNWeVkyVnpJanBiSW5OMWNIQnZjblF1WTI5bVptVmxJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTzBGQlMwRXNUVUZCVFN4RFFVRkRMRTlCUVZBc1IwRkRSVHRGUVVGQkxHMUNRVUZCTEVWQlFYRkNMRWxCUVhKQ0luMD1cbiIsIid1c2Ugc3RyaWN0JztcbnZhciBTVEFURV9DSEFOR0UsIFNZTkNFRCwgU1lOQ0lORywgU3luY01hY2hpbmUsIFVOU1lOQ0VELCBldmVudCwgZm4sIGksIGxlbiwgcmVmO1xuXG5VTlNZTkNFRCA9ICd1bnN5bmNlZCc7XG5cblNZTkNJTkcgPSAnc3luY2luZyc7XG5cblNZTkNFRCA9ICdzeW5jZWQnO1xuXG5TVEFURV9DSEFOR0UgPSAnc3luY1N0YXRlQ2hhbmdlJztcblxuU3luY01hY2hpbmUgPSB7XG4gIF9zeW5jU3RhdGU6IFVOU1lOQ0VELFxuICBfcHJldmlvdXNTeW5jU3RhdGU6IG51bGwsXG4gIHN5bmNTdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N5bmNTdGF0ZTtcbiAgfSxcbiAgaXNVbnN5bmNlZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N5bmNTdGF0ZSA9PT0gVU5TWU5DRUQ7XG4gIH0sXG4gIGlzU3luY2VkOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc3luY1N0YXRlID09PSBTWU5DRUQ7XG4gIH0sXG4gIGlzU3luY2luZzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N5bmNTdGF0ZSA9PT0gU1lOQ0lORztcbiAgfSxcbiAgdW5zeW5jOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVmO1xuICAgIGlmICgocmVmID0gdGhpcy5fc3luY1N0YXRlKSA9PT0gU1lOQ0lORyB8fCByZWYgPT09IFNZTkNFRCkge1xuICAgICAgdGhpcy5fcHJldmlvdXNTeW5jID0gdGhpcy5fc3luY1N0YXRlO1xuICAgICAgdGhpcy5fc3luY1N0YXRlID0gVU5TWU5DRUQ7XG4gICAgICB0aGlzLnRyaWdnZXIodGhpcy5fc3luY1N0YXRlLCB0aGlzLCB0aGlzLl9zeW5jU3RhdGUpO1xuICAgICAgdGhpcy50cmlnZ2VyKFNUQVRFX0NIQU5HRSwgdGhpcywgdGhpcy5fc3luY1N0YXRlKTtcbiAgICB9XG4gIH0sXG4gIGJlZ2luU3luYzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlZjtcbiAgICBpZiAoKHJlZiA9IHRoaXMuX3N5bmNTdGF0ZSkgPT09IFVOU1lOQ0VEIHx8IHJlZiA9PT0gU1lOQ0VEKSB7XG4gICAgICB0aGlzLl9wcmV2aW91c1N5bmMgPSB0aGlzLl9zeW5jU3RhdGU7XG4gICAgICB0aGlzLl9zeW5jU3RhdGUgPSBTWU5DSU5HO1xuICAgICAgdGhpcy50cmlnZ2VyKHRoaXMuX3N5bmNTdGF0ZSwgdGhpcywgdGhpcy5fc3luY1N0YXRlKTtcbiAgICAgIHRoaXMudHJpZ2dlcihTVEFURV9DSEFOR0UsIHRoaXMsIHRoaXMuX3N5bmNTdGF0ZSk7XG4gICAgfVxuICB9LFxuICBmaW5pc2hTeW5jOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fc3luY1N0YXRlID09PSBTWU5DSU5HKSB7XG4gICAgICB0aGlzLl9wcmV2aW91c1N5bmMgPSB0aGlzLl9zeW5jU3RhdGU7XG4gICAgICB0aGlzLl9zeW5jU3RhdGUgPSBTWU5DRUQ7XG4gICAgICB0aGlzLnRyaWdnZXIodGhpcy5fc3luY1N0YXRlLCB0aGlzLCB0aGlzLl9zeW5jU3RhdGUpO1xuICAgICAgdGhpcy50cmlnZ2VyKFNUQVRFX0NIQU5HRSwgdGhpcywgdGhpcy5fc3luY1N0YXRlKTtcbiAgICB9XG4gIH0sXG4gIGFib3J0U3luYzogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3N5bmNTdGF0ZSA9PT0gU1lOQ0lORykge1xuICAgICAgdGhpcy5fc3luY1N0YXRlID0gdGhpcy5fcHJldmlvdXNTeW5jO1xuICAgICAgdGhpcy5fcHJldmlvdXNTeW5jID0gdGhpcy5fc3luY1N0YXRlO1xuICAgICAgdGhpcy50cmlnZ2VyKHRoaXMuX3N5bmNTdGF0ZSwgdGhpcywgdGhpcy5fc3luY1N0YXRlKTtcbiAgICAgIHRoaXMudHJpZ2dlcihTVEFURV9DSEFOR0UsIHRoaXMsIHRoaXMuX3N5bmNTdGF0ZSk7XG4gICAgfVxuICB9XG59O1xuXG5yZWYgPSBbVU5TWU5DRUQsIFNZTkNJTkcsIFNZTkNFRCwgU1RBVEVfQ0hBTkdFXTtcbmZuID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmV0dXJuIFN5bmNNYWNoaW5lW2V2ZW50XSA9IGZ1bmN0aW9uKGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgaWYgKGNvbnRleHQgPT0gbnVsbCkge1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgfVxuICAgIHRoaXMub24oZXZlbnQsIGNhbGxiYWNrLCBjb250ZXh0KTtcbiAgICBpZiAodGhpcy5fc3luY1N0YXRlID09PSBldmVudCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwoY29udGV4dCk7XG4gICAgfVxuICB9O1xufTtcbmZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICBldmVudCA9IHJlZltpXTtcbiAgZm4oZXZlbnQpO1xufVxuXG5PYmplY3QuZnJlZXplKFN5bmNNYWNoaW5lKTtcblxubW9kdWxlLmV4cG9ydHMgPSBTeW5jTWFjaGluZTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2ljM2x1WTE5dFlXTm9hVzVsTG1weklpd2ljMjkxY21ObFVtOXZkQ0k2SWlJc0luTnZkWEpqWlhNaU9sc2ljM2x1WTE5dFlXTm9hVzVsTG1OdlptWmxaU0pkTENKdVlXMWxjeUk2VzEwc0ltMWhjSEJwYm1keklqb2lRVUZCUVR0QlFVRkJMRWxCUVVFN08wRkJWVUVzVVVGQlFTeEhRVUZYT3p0QlFVTllMRTlCUVVFc1IwRkJWenM3UVVGRFdDeE5RVUZCTEVkQlFWYzdPMEZCUlZnc1dVRkJRU3hIUVVGbE96dEJRVVZtTEZkQlFVRXNSMEZEUlR0RlFVRkJMRlZCUVVFc1JVRkJXU3hSUVVGYU8wVkJRMEVzYTBKQlFVRXNSVUZCYjBJc1NVRkVjRUk3UlVGTlFTeFRRVUZCTEVWQlFWY3NVMEZCUVR0WFFVTlVMRWxCUVVNc1EwRkJRVHRGUVVSUkxFTkJUbGc3UlVGVFFTeFZRVUZCTEVWQlFWa3NVMEZCUVR0WFFVTldMRWxCUVVNc1EwRkJRU3hWUVVGRUxFdEJRV1U3UlVGRVRDeERRVlJhTzBWQldVRXNVVUZCUVN4RlFVRlZMRk5CUVVFN1YwRkRVaXhKUVVGRExFTkJRVUVzVlVGQlJDeExRVUZsTzBWQlJGQXNRMEZhVmp0RlFXVkJMRk5CUVVFc1JVRkJWeXhUUVVGQk8xZEJRMVFzU1VGQlF5eERRVUZCTEZWQlFVUXNTMEZCWlR0RlFVUk9MRU5CWmxnN1JVRnhRa0VzVFVGQlFTeEZRVUZSTEZOQlFVRTdRVUZEVGl4UlFVRkJPMGxCUVVFc1YwRkJSeXhKUVVGRExFTkJRVUVzVjBGQlJDeExRVUZuUWl4UFFVRm9RaXhKUVVGQkxFZEJRVUVzUzBGQmVVSXNUVUZCTlVJN1RVRkRSU3hKUVVGRExFTkJRVUVzWVVGQlJDeEhRVUZwUWl4SlFVRkRMRU5CUVVFN1RVRkRiRUlzU1VGQlF5eERRVUZCTEZWQlFVUXNSMEZCWXp0TlFVTmtMRWxCUVVNc1EwRkJRU3hQUVVGRUxFTkJRVk1zU1VGQlF5eERRVUZCTEZWQlFWWXNSVUZCYzBJc1NVRkJkRUlzUlVGQk5FSXNTVUZCUXl4RFFVRkJMRlZCUVRkQ08wMUJRMEVzU1VGQlF5eERRVUZCTEU5QlFVUXNRMEZCVXl4WlFVRlVMRVZCUVhWQ0xFbEJRWFpDTEVWQlFUWkNMRWxCUVVNc1EwRkJRU3hWUVVFNVFpeEZRVXBHT3p0RlFVUk5MRU5CY2tKU08wVkJPRUpCTEZOQlFVRXNSVUZCVnl4VFFVRkJPMEZCUTFRc1VVRkJRVHRKUVVGQkxGZEJRVWNzU1VGQlF5eERRVUZCTEZkQlFVUXNTMEZCWjBJc1VVRkJhRUlzU1VGQlFTeEhRVUZCTEV0QlFUQkNMRTFCUVRkQ08wMUJRMFVzU1VGQlF5eERRVUZCTEdGQlFVUXNSMEZCYVVJc1NVRkJReXhEUVVGQk8wMUJRMnhDTEVsQlFVTXNRMEZCUVN4VlFVRkVMRWRCUVdNN1RVRkRaQ3hKUVVGRExFTkJRVUVzVDBGQlJDeERRVUZUTEVsQlFVTXNRMEZCUVN4VlFVRldMRVZCUVhOQ0xFbEJRWFJDTEVWQlFUUkNMRWxCUVVNc1EwRkJRU3hWUVVFM1FqdE5RVU5CTEVsQlFVTXNRMEZCUVN4UFFVRkVMRU5CUVZNc1dVRkJWQ3hGUVVGMVFpeEpRVUYyUWl4RlFVRTJRaXhKUVVGRExFTkJRVUVzVlVGQk9VSXNSVUZLUmpzN1JVRkVVeXhEUVRsQ1dEdEZRWFZEUVN4VlFVRkJMRVZCUVZrc1UwRkJRVHRKUVVOV0xFbEJRVWNzU1VGQlF5eERRVUZCTEZWQlFVUXNTMEZCWlN4UFFVRnNRanROUVVORkxFbEJRVU1zUTBGQlFTeGhRVUZFTEVkQlFXbENMRWxCUVVNc1EwRkJRVHROUVVOc1FpeEpRVUZETEVOQlFVRXNWVUZCUkN4SFFVRmpPMDFCUTJRc1NVRkJReXhEUVVGQkxFOUJRVVFzUTBGQlV5eEpRVUZETEVOQlFVRXNWVUZCVml4RlFVRnpRaXhKUVVGMFFpeEZRVUUwUWl4SlFVRkRMRU5CUVVFc1ZVRkJOMEk3VFVGRFFTeEpRVUZETEVOQlFVRXNUMEZCUkN4RFFVRlRMRmxCUVZRc1JVRkJkVUlzU1VGQmRrSXNSVUZCTmtJc1NVRkJReXhEUVVGQkxGVkJRVGxDTEVWQlNrWTdPMFZCUkZVc1EwRjJRMW83UlVGblJFRXNVMEZCUVN4RlFVRlhMRk5CUVVFN1NVRkRWQ3hKUVVGSExFbEJRVU1zUTBGQlFTeFZRVUZFTEV0QlFXVXNUMEZCYkVJN1RVRkRSU3hKUVVGRExFTkJRVUVzVlVGQlJDeEhRVUZqTEVsQlFVTXNRMEZCUVR0TlFVTm1MRWxCUVVNc1EwRkJRU3hoUVVGRUxFZEJRV2xDTEVsQlFVTXNRMEZCUVR0TlFVTnNRaXhKUVVGRExFTkJRVUVzVDBGQlJDeERRVUZUTEVsQlFVTXNRMEZCUVN4VlFVRldMRVZCUVhOQ0xFbEJRWFJDTEVWQlFUUkNMRWxCUVVNc1EwRkJRU3hWUVVFM1FqdE5RVU5CTEVsQlFVTXNRMEZCUVN4UFFVRkVMRU5CUVZNc1dVRkJWQ3hGUVVGMVFpeEpRVUYyUWl4RlFVRTJRaXhKUVVGRExFTkJRVUVzVlVGQk9VSXNSVUZLUmpzN1JVRkVVeXhEUVdoRVdEczdPMEZCTkVSR08wdEJRMHNzVTBGQlF5eExRVUZFTzFOQlEwUXNWMEZCV1N4RFFVRkJMRXRCUVVFc1EwRkJXaXhIUVVGeFFpeFRRVUZETEZGQlFVUXNSVUZCVnl4UFFVRllPenROUVVGWExGVkJRVlU3TzBsQlEzaERMRWxCUVVNc1EwRkJRU3hGUVVGRUxFTkJRVWtzUzBGQlNpeEZRVUZYTEZGQlFWZ3NSVUZCY1VJc1QwRkJja0k3U1VGRFFTeEpRVUV3UWl4SlFVRkRMRU5CUVVFc1ZVRkJSQ3hMUVVGbExFdEJRWHBETzJGQlFVRXNVVUZCVVN4RFFVRkRMRWxCUVZRc1EwRkJZeXhQUVVGa0xFVkJRVUU3TzBWQlJtMUNPMEZCUkhCQ08wRkJSRXdzUzBGQlFTeHhRMEZCUVRzN1MwRkRUVHRCUVVST096dEJRVTlCTEUxQlFVMHNRMEZCUXl4TlFVRlFMRU5CUVdNc1YwRkJaRHM3UVVGSFFTeE5RVUZOTEVOQlFVTXNUMEZCVUN4SFFVRnBRaUo5XG4iLCIndXNlIHN0cmljdCc7XG52YXIgdXRpbHMsXG4gIHNsaWNlID0gW10uc2xpY2UsXG4gIGluZGV4T2YgPSBbXS5pbmRleE9mIHx8IGZ1bmN0aW9uKGl0ZW0pIHsgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmxlbmd0aDsgaSA8IGw7IGkrKykgeyBpZiAoaSBpbiB0aGlzICYmIHRoaXNbaV0gPT09IGl0ZW0pIHJldHVybiBpOyB9IHJldHVybiAtMTsgfTtcblxudXRpbHMgPSB7XG4gIGlzRW1wdHk6IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHJldHVybiAhT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KS5sZW5ndGg7XG4gIH0sXG4gIHNlcmlhbGl6ZTogZnVuY3Rpb24oZGF0YSkge1xuICAgIGlmICh0eXBlb2YgZGF0YS5zZXJpYWxpemUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBkYXRhLnNlcmlhbGl6ZSgpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRhdGEudG9KU09OID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gZGF0YS50b0pTT04oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndXRpbHMuc2VyaWFsaXplOiBVbmtub3duIGRhdGEgd2FzIHBhc3NlZCcpO1xuICAgIH1cbiAgfSxcbiAgcmVhZG9ubHk6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpLCBrZXksIGtleXMsIGxlbiwgb2JqZWN0O1xuICAgIG9iamVjdCA9IGFyZ3VtZW50c1swXSwga2V5cyA9IDIgPD0gYXJndW1lbnRzLmxlbmd0aCA/IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSA6IFtdO1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IGtleXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGtleSA9IGtleXNbaV07XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBrZXksIHtcbiAgICAgICAgdmFsdWU6IG9iamVjdFtrZXldLFxuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2VcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbiAgZ2V0UHJvdG90eXBlQ2hhaW46IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHZhciBjaGFpbjtcbiAgICBjaGFpbiA9IFtdO1xuICAgIHdoaWxlIChvYmplY3QgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KSkge1xuICAgICAgY2hhaW4udW5zaGlmdChvYmplY3QpO1xuICAgIH1cbiAgICByZXR1cm4gY2hhaW47XG4gIH0sXG4gIGdldEFsbFByb3BlcnR5VmVyc2lvbnM6IGZ1bmN0aW9uKG9iamVjdCwga2V5KSB7XG4gICAgdmFyIGksIGxlbiwgcHJvdG8sIHJlZiwgcmVzdWx0LCB2YWx1ZTtcbiAgICByZXN1bHQgPSBbXTtcbiAgICByZWYgPSB1dGlscy5nZXRQcm90b3R5cGVDaGFpbihvYmplY3QpO1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgcHJvdG8gPSByZWZbaV07XG4gICAgICB2YWx1ZSA9IHByb3RvW2tleV07XG4gICAgICBpZiAodmFsdWUgJiYgaW5kZXhPZi5jYWxsKHJlc3VsdCwgdmFsdWUpIDwgMCkge1xuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG4gIHVwY2FzZTogZnVuY3Rpb24oc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKTtcbiAgfSxcbiAgZXNjYXBlUmVnRXhwOiBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gU3RyaW5nKHN0ciB8fCAnJykucmVwbGFjZSgvKFsuKis/Xj0hOiR7fSgpfFtcXF1cXC9cXFxcXSkvZywgJ1xcXFwkMScpO1xuICB9LFxuICBtb2RpZmllcktleVByZXNzZWQ6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgcmV0dXJuIGV2ZW50LnNoaWZ0S2V5IHx8IGV2ZW50LmFsdEtleSB8fCBldmVudC5jdHJsS2V5IHx8IGV2ZW50Lm1ldGFLZXk7XG4gIH0sXG4gIHJldmVyc2U6IGZ1bmN0aW9uKGNyaXRlcmlhLCBwYXJhbXMsIHF1ZXJ5KSB7XG4gICAgcmV0dXJuIHJlcXVpcmUoJy4uL21lZGlhdG9yJykuZXhlY3V0ZSgncm91dGVyOnJldmVyc2UnLCBjcml0ZXJpYSwgcGFyYW1zLCBxdWVyeSk7XG4gIH0sXG4gIHJlZGlyZWN0VG86IGZ1bmN0aW9uKHBhdGhEZXNjLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gcmVxdWlyZSgnLi4vbWVkaWF0b3InKS5leGVjdXRlKCdyb3V0ZXI6cm91dGUnLCBwYXRoRGVzYywgcGFyYW1zLCBvcHRpb25zKTtcbiAgfSxcbiAgbG9hZE1vZHVsZTogKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmdW5jdGlvbihtb2R1bGVOYW1lLCBoYW5kbGVyKSB7XG4gICAgICByZXR1cm4gcmVxdWlyZS5lbnN1cmUoW21vZHVsZU5hbWVdLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXIocmVxdWlyZShtb2R1bGVOYW1lKSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KSgpLFxuICBtYXRjaGVzU2VsZWN0b3I6IChmdW5jdGlvbigpIHtcbiAgICB2YXIgZWwsIG1hdGNoZXM7XG4gICAgZWwgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgbWF0Y2hlcyA9IGVsLm1hdGNoZXMgfHwgZWwubXNNYXRjaGVzU2VsZWN0b3IgfHwgZWwubW96TWF0Y2hlc1NlbGVjdG9yIHx8IGVsLndlYmtpdE1hdGNoZXNTZWxlY3RvcjtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbWF0Y2hlcy5jYWxsLmFwcGx5KG1hdGNoZXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfSkoKSxcbiAgcXVlcnlzdHJpbmc6IHtcbiAgICBzdHJpbmdpZnk6IGZ1bmN0aW9uKHBhcmFtcywgcmVwbGFjZXIpIHtcbiAgICAgIGlmIChwYXJhbXMgPT0gbnVsbCkge1xuICAgICAgICBwYXJhbXMgPSB7fTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcmVwbGFjZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmVwbGFjZXIgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUubWFwKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhcmFtcykucmVkdWNlKGZ1bmN0aW9uKHBhaXJzLCBrZXkpIHtcbiAgICAgICAgdmFyIHBhaXI7XG4gICAgICAgIHBhaXIgPSByZXBsYWNlcihrZXksIHBhcmFtc1trZXldKTtcbiAgICAgICAgcmV0dXJuIHBhaXJzLmNvbmNhdChwYWlyIHx8IFtdKTtcbiAgICAgIH0sIFtdKS5tYXAoZnVuY3Rpb24oYXJnKSB7XG4gICAgICAgIHZhciBrZXksIHZhbHVlO1xuICAgICAgICBrZXkgPSBhcmcua2V5LCB2YWx1ZSA9IGFyZy52YWx1ZTtcbiAgICAgICAgcmV0dXJuIFtrZXksIHZhbHVlXS5tYXAoZW5jb2RlVVJJQ29tcG9uZW50KS5qb2luKCc9Jyk7XG4gICAgICB9KS5qb2luKCcmJyk7XG4gICAgfSxcbiAgICBwYXJzZTogZnVuY3Rpb24oc3RyaW5nLCByZXZpdmVyKSB7XG4gICAgICBpZiAoc3RyaW5nID09IG51bGwpIHtcbiAgICAgICAgc3RyaW5nID0gJyc7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHJldml2ZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV2aXZlciA9IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgc3RyaW5nID0gc3RyaW5nLnNsaWNlKDEgKyBzdHJpbmcuaW5kZXhPZignPycpKTtcbiAgICAgIHJldHVybiBzdHJpbmcuc3BsaXQoJyYnKS5yZWR1Y2UoZnVuY3Rpb24ocGFyYW1zLCBwYWlyKSB7XG4gICAgICAgIHZhciBrZXksIHBhcnRzLCByZWYsIHZhbHVlO1xuICAgICAgICBwYXJ0cyA9IHBhaXIuc3BsaXQoJz0nKS5tYXAoZGVjb2RlVVJJQ29tcG9uZW50KTtcbiAgICAgICAgcmVmID0gcmV2aXZlci5hcHBseShudWxsLCBwYXJ0cykgfHwge30sIGtleSA9IHJlZi5rZXksIHZhbHVlID0gcmVmLnZhbHVlO1xuICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgIHBhcmFtc1trZXldID0gcGFyYW1zLmhhc093blByb3BlcnR5KGtleSkgPyBbXS5jb25jYXQocGFyYW1zW2tleV0sIHZhbHVlKSA6IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgICB9LCB7fSk7XG4gICAgfVxuICB9XG59O1xuXG51dGlscy5iZWdldCA9IE9iamVjdC5jcmVhdGU7XG5cbnV0aWxzLmluZGV4T2YgPSBmdW5jdGlvbihhcnJheSwgaXRlbSkge1xuICByZXR1cm4gYXJyYXkuaW5kZXhPZihpdGVtKTtcbn07XG5cbnV0aWxzLmlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG51dGlscy5xdWVyeVBhcmFtcyA9IHV0aWxzLnF1ZXJ5c3RyaW5nO1xuXG5PYmplY3Quc2VhbCh1dGlscyk7XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pZFhScGJITXVhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjeUk2V3lKMWRHbHNjeTVqYjJabVpXVWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUU3UVVGQlFTeEpRVUZCTEV0QlFVRTdSVUZCUVRzN08wRkJTMEVzUzBGQlFTeEhRVU5GTzBWQlFVRXNUMEZCUVN4RlFVRlRMRk5CUVVNc1RVRkJSRHRYUVVOUUxFTkJRVWtzVFVGQlRTeERRVUZETEcxQ1FVRlFMRU5CUVRKQ0xFMUJRVE5DTEVOQlFXdERMRU5CUVVNN1JVRkVhRU1zUTBGQlZEdEZRVWxCTEZOQlFVRXNSVUZCVnl4VFFVRkRMRWxCUVVRN1NVRkRWQ3hKUVVGSExFOUJRVThzU1VGQlNTeERRVUZETEZOQlFWb3NTMEZCZVVJc1ZVRkJOVUk3WVVGRFJTeEpRVUZKTEVOQlFVTXNVMEZCVEN4RFFVRkJMRVZCUkVZN1MwRkJRU3hOUVVWTExFbEJRVWNzVDBGQlR5eEpRVUZKTEVOQlFVTXNUVUZCV2l4TFFVRnpRaXhWUVVGNlFqdGhRVU5JTEVsQlFVa3NRMEZCUXl4TlFVRk1MRU5CUVVFc1JVRkVSenRMUVVGQkxFMUJRVUU3UVVGSFNDeFpRVUZOTEVsQlFVa3NVMEZCU2l4RFFVRmpMREJEUVVGa0xFVkJTRWc3TzBWQlNFa3NRMEZLV0R0RlFXTkJMRkZCUVVFc1JVRkJWU3hUUVVGQk8wRkJRMUlzVVVGQlFUdEpRVVJUTEhWQ1FVRlJPMEZCUTJwQ0xGTkJRVUVzYzBOQlFVRTdPMDFCUTBVc1RVRkJUU3hEUVVGRExHTkJRVkFzUTBGQmMwSXNUVUZCZEVJc1JVRkJPRUlzUjBGQk9VSXNSVUZEUlR0UlFVRkJMRXRCUVVFc1JVRkJUeXhOUVVGUExFTkJRVUVzUjBGQlFTeERRVUZrTzFGQlEwRXNVVUZCUVN4RlFVRlZMRXRCUkZZN1VVRkZRU3haUVVGQkxFVkJRV01zUzBGR1pEdFBRVVJHTzBGQlJFWTdWMEZOUVR0RlFWQlJMRU5CWkZZN1JVRjNRa0VzYVVKQlFVRXNSVUZCYlVJc1UwRkJReXhOUVVGRU8wRkJRMnBDTEZGQlFVRTdTVUZCUVN4TFFVRkJMRWRCUVZFN1FVRkRVaXhYUVVGTkxFMUJRVUVzUjBGQlV5eE5RVUZOTEVOQlFVTXNZMEZCVUN4RFFVRnpRaXhOUVVGMFFpeERRVUZtTzAxQlEwVXNTMEZCU3l4RFFVRkRMRTlCUVU0c1EwRkJZeXhOUVVGa08wbEJSRVk3VjBGRlFUdEZRVXBwUWl4RFFYaENia0k3UlVGcFEwRXNjMEpCUVVFc1JVRkJkMElzVTBGQlF5eE5RVUZFTEVWQlFWTXNSMEZCVkR0QlFVTjBRaXhSUVVGQk8wbEJRVUVzVFVGQlFTeEhRVUZUTzBGQlExUTdRVUZCUVN4VFFVRkJMSEZEUVVGQk96dE5RVU5GTEV0QlFVRXNSMEZCVVN4TFFVRk5MRU5CUVVFc1IwRkJRVHROUVVOa0xFbEJRVWNzUzBGQlFTeEpRVUZWTEdGQlFXRXNUVUZCWWl4RlFVRkJMRXRCUVVFc1MwRkJZanRSUVVORkxFMUJRVTBzUTBGQlF5eEpRVUZRTEVOQlFWa3NTMEZCV2l4RlFVUkdPenRCUVVaR08xZEJTVUU3UlVGT2MwSXNRMEZxUTNoQ08wVkJOa05CTEUxQlFVRXNSVUZCVVN4VFFVRkRMRWRCUVVRN1YwRkRUaXhIUVVGSExFTkJRVU1zVFVGQlNpeERRVUZYTEVOQlFWZ3NRMEZCWVN4RFFVRkRMRmRCUVdRc1EwRkJRU3hEUVVGQkxFZEJRVGhDTEVkQlFVY3NRMEZCUXl4TFFVRktMRU5CUVZVc1EwRkJWanRGUVVSNFFpeERRVGREVWp0RlFXbEVRU3haUVVGQkxFVkJRV01zVTBGQlF5eEhRVUZFTzBGQlExb3NWMEZCVHl4TlFVRkJMRU5CUVU4c1IwRkJRU3hKUVVGUExFVkJRV1FzUTBGQmFVSXNRMEZCUXl4UFFVRnNRaXhEUVVFd1FpdzBRa0ZCTVVJc1JVRkJkMFFzVFVGQmVFUTdSVUZFU3l4RFFXcEVaRHRGUVhsRVFTeHJRa0ZCUVN4RlFVRnZRaXhUUVVGRExFdEJRVVE3VjBGRGJFSXNTMEZCU3l4RFFVRkRMRkZCUVU0c1NVRkJhMElzUzBGQlN5eERRVUZETEUxQlFYaENMRWxCUVd0RExFdEJRVXNzUTBGQlF5eFBRVUY0UXl4SlFVRnRSQ3hMUVVGTExFTkJRVU03UlVGRWRrTXNRMEY2UkhCQ08wVkJaMFZCTEU5QlFVRXNSVUZCVXl4VFFVRkRMRkZCUVVRc1JVRkJWeXhOUVVGWUxFVkJRVzFDTEV0QlFXNUNPMWRCUTFBc1QwRkJRU3hEUVVGUkxHRkJRVklzUTBGQmMwSXNRMEZCUXl4UFFVRjJRaXhEUVVFclFpeG5Ra0ZCTDBJc1JVRkRSU3hSUVVSR0xFVkJRMWtzVFVGRVdpeEZRVU52UWl4TFFVUndRanRGUVVSUExFTkJhRVZVTzBWQmNVVkJMRlZCUVVFc1JVRkJXU3hUUVVGRExGRkJRVVFzUlVGQlZ5eE5RVUZZTEVWQlFXMUNMRTlCUVc1Q08xZEJRMVlzVDBGQlFTeERRVUZSTEdGQlFWSXNRMEZCYzBJc1EwRkJReXhQUVVGMlFpeERRVUVyUWl4alFVRXZRaXhGUVVORkxGRkJSRVlzUlVGRFdTeE5RVVJhTEVWQlEyOUNMRTlCUkhCQ08wVkJSRlVzUTBGeVJWbzdSVUY1UlVFc1ZVRkJRU3hGUVVGbExFTkJRVUVzVTBGQlFUdFhRVU5pTEZOQlFVTXNWVUZCUkN4RlFVRmhMRTlCUVdJN1lVRkRSU3hQUVVGUExFTkJRVU1zVFVGQlVpeERRVUZsTEVOQlFVTXNWVUZCUkN4RFFVRm1MRVZCUVRaQ0xGTkJRVUU3WlVGRE0wSXNUMEZCUVN4RFFVRlJMRTlCUVVFc1EwRkJVU3hWUVVGU0xFTkJRVkk3VFVGRU1rSXNRMEZCTjBJN1NVRkVSanRGUVVSaExFTkJRVUVzUTBGQlNDeERRVUZCTEVOQmVrVmFPMFZCYVVaQkxHVkJRVUVzUlVGQmIwSXNRMEZCUVN4VFFVRkJPMEZCUTJ4Q0xGRkJRVUU3U1VGQlFTeEZRVUZCTEVkQlFVc3NVVUZCVVN4RFFVRkRPMGxCUTJRc1QwRkJRU3hIUVVGVkxFVkJRVVVzUTBGQlF5eFBRVUZJTEVsQlExWXNSVUZCUlN4RFFVRkRMR2xDUVVSUExFbEJSVllzUlVGQlJTeERRVUZETEd0Q1FVWlBMRWxCUjFZc1JVRkJSU3hEUVVGRE8xZEJSVWdzVTBGQlFUdGhRVUZITEU5QlFVOHNRMEZCUXl4SlFVRlNMR2RDUVVGaExGTkJRV0k3U1VGQlNEdEZRVkJyUWl4RFFVRkJMRU5CUVVnc1EwRkJRU3hEUVdwR2FrSTdSVUUyUmtFc1YwRkJRU3hGUVVkRk8wbEJRVUVzVTBGQlFTeEZRVUZYTEZOQlFVTXNUVUZCUkN4RlFVRmpMRkZCUVdRN08xRkJRVU1zVTBGQlV6czdUVUZEYmtJc1NVRkJSeXhQUVVGUExGRkJRVkFzUzBGQmNVSXNWVUZCZUVJN1VVRkRSU3hSUVVGQkxFZEJRVmNzVTBGQlF5eEhRVUZFTEVWQlFVMHNTMEZCVGp0VlFVTlVMRWxCUVVjc1MwRkJTeXhEUVVGRExFOUJRVTRzUTBGQll5eExRVUZrTEVOQlFVZzdiVUpCUTBVc1MwRkJTeXhEUVVGRExFZEJRVTRzUTBGQlZTeFRRVUZETEV0QlFVUTdjVUpCUVZjN1owSkJRVU1zUzBGQlFTeEhRVUZFTzJkQ1FVRk5MRTlCUVVFc1MwRkJUanM3V1VGQldDeERRVUZXTEVWQlJFWTdWMEZCUVN4TlFVVkxMRWxCUVVjc1lVRkJTRHR0UWtGRFNEdGpRVUZETEV0QlFVRXNSMEZCUkR0alFVRk5MRTlCUVVFc1MwRkJUanRqUVVSSE96dFJRVWhKTEVWQlJHSTdPMkZCVDBFc1RVRkJUU3hEUVVGRExFbEJRVkFzUTBGQldTeE5RVUZhTEVOQlFXMUNMRU5CUVVNc1RVRkJjRUlzUTBGQk1rSXNVMEZCUXl4TFFVRkVMRVZCUVZFc1IwRkJVanRCUVVONlFpeFpRVUZCTzFGQlFVRXNTVUZCUVN4SFFVRlBMRkZCUVVFc1EwRkJVeXhIUVVGVUxFVkJRV01zVFVGQlR5eERRVUZCTEVkQlFVRXNRMEZCY2tJN1pVRkRVQ3hMUVVGTExFTkJRVU1zVFVGQlRpeERRVUZoTEVsQlFVRXNTVUZCVVN4RlFVRnlRanROUVVaNVFpeERRVUV6UWl4RlFVZEZMRVZCU0VZc1EwRkpRU3hEUVVGRExFZEJTa1FzUTBGSlN5eFRRVUZETEVkQlFVUTdRVUZEU0N4WlFVRkJPMUZCUkVzc1pVRkJTenRsUVVOV0xFTkJRVU1zUjBGQlJDeEZRVUZOTEV0QlFVNHNRMEZCV1N4RFFVRkRMRWRCUVdJc1EwRkJhVUlzYTBKQlFXcENMRU5CUVc5RExFTkJRVU1zU1VGQmNrTXNRMEZCTUVNc1IwRkJNVU03VFVGRVJ5eERRVXBNTEVOQlRVRXNRMEZCUXl4SlFVNUVMRU5CVFUwc1IwRk9UanRKUVZKVExFTkJRVmc3U1VGcFFrRXNTMEZCUVN4RlFVRlBMRk5CUVVNc1RVRkJSQ3hGUVVGakxFOUJRV1E3TzFGQlFVTXNVMEZCVXpzN1RVRkRaaXhKUVVGSExFOUJRVThzVDBGQlVDeExRVUZ2UWl4VlFVRjJRanRSUVVORkxFOUJRVUVzUjBGQlZTeFRRVUZETEVkQlFVUXNSVUZCVFN4TFFVRk9PMmxDUVVGblFqdFpRVUZETEV0QlFVRXNSMEZCUkR0WlFVRk5MRTlCUVVFc1MwRkJUanM3VVVGQmFFSXNSVUZFV2pzN1RVRkhRU3hOUVVGQkxFZEJRVk1zVFVGQlRTeERRVUZETEV0QlFWQXNRMEZCWVN4RFFVRkJMRWRCUVVrc1RVRkJUU3hEUVVGRExFOUJRVkFzUTBGQlpTeEhRVUZtTEVOQlFXcENPMkZCUTFRc1RVRkJUU3hEUVVGRExFdEJRVkFzUTBGQllTeEhRVUZpTEVOQlFXbENMRU5CUVVNc1RVRkJiRUlzUTBGQmVVSXNVMEZCUXl4TlFVRkVMRVZCUVZNc1NVRkJWRHRCUVVOMlFpeFpRVUZCTzFGQlFVRXNTMEZCUVN4SFFVRlJMRWxCUVVrc1EwRkJReXhMUVVGTUxFTkJRVmNzUjBGQldDeERRVUZsTEVOQlFVTXNSMEZCYUVJc1EwRkJiMElzYTBKQlFYQkNPMUZCUTFJc1RVRkJaU3hQUVVGQkxHRkJRVkVzUzBGQlVpeERRVUZCTEVsQlFYRkNMRVZCUVhCRExFVkJRVU1zWVVGQlJDeEZRVUZOTzFGQlJVNHNTVUZCUnl4aFFVRklPMVZCUVdVc1RVRkJUeXhEUVVGQkxFZEJRVUVzUTBGQlVDeEhRVU5XTEUxQlFVMHNRMEZCUXl4alFVRlFMRU5CUVhOQ0xFZEJRWFJDTEVOQlFVZ3NSMEZEUlN4RlFVRkZMRU5CUVVNc1RVRkJTQ3hEUVVGVkxFMUJRVThzUTBGQlFTeEhRVUZCTEVOQlFXcENMRVZCUVhWQ0xFdEJRWFpDTEVOQlJFWXNSMEZIUlN4TlFVcEtPenRsUVUxQk8wMUJWblZDTEVOQlFYcENMRVZCVjBVc1JVRllSanRKUVV4TExFTkJha0pRTzBkQmFFZEdPenM3UVVGMVNVWXNTMEZCU3l4RFFVRkRMRXRCUVU0c1IwRkJZeXhOUVVGTkxFTkJRVU03TzBGQlEzSkNMRXRCUVVzc1EwRkJReXhQUVVGT0xFZEJRV2RDTEZOQlFVTXNTMEZCUkN4RlFVRlJMRWxCUVZJN1UwRkJhVUlzUzBGQlN5eERRVUZETEU5QlFVNHNRMEZCWXl4SlFVRmtPMEZCUVdwQ096dEJRVU5vUWl4TFFVRkxMRU5CUVVNc1QwRkJUaXhIUVVGblFpeExRVUZMTEVOQlFVTTdPMEZCUTNSQ0xFdEJRVXNzUTBGQlF5eFhRVUZPTEVkQlFXOUNMRXRCUVVzc1EwRkJRenM3UVVGTk1VSXNUVUZCVFN4RFFVRkRMRWxCUVZBc1EwRkJXU3hMUVVGYU96dEJRVWRCTEUxQlFVMHNRMEZCUXl4UFFVRlFMRWRCUVdsQ0luMD1cbiIsIid1c2Ugc3RyaWN0JztcbnZhciBCYWNrYm9uZSwgaGFuZGxlcnMsIG1lZGlhdG9yLCB1dGlscyxcbiAgc2xpY2UgPSBbXS5zbGljZTtcblxuQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG51dGlscyA9IHJlcXVpcmUoJy4vbGliL3V0aWxzJyk7XG5cbm1lZGlhdG9yID0ge307XG5cbm1lZGlhdG9yLnN1YnNjcmliZSA9IG1lZGlhdG9yLm9uID0gQmFja2JvbmUuRXZlbnRzLm9uO1xuXG5tZWRpYXRvci5zdWJzY3JpYmVPbmNlID0gbWVkaWF0b3Iub25jZSA9IEJhY2tib25lLkV2ZW50cy5vbmNlO1xuXG5tZWRpYXRvci51bnN1YnNjcmliZSA9IG1lZGlhdG9yLm9mZiA9IEJhY2tib25lLkV2ZW50cy5vZmY7XG5cbm1lZGlhdG9yLnB1Ymxpc2ggPSBtZWRpYXRvci50cmlnZ2VyID0gQmFja2JvbmUuRXZlbnRzLnRyaWdnZXI7XG5cbm1lZGlhdG9yLl9jYWxsYmFja3MgPSBudWxsO1xuXG5oYW5kbGVycyA9IG1lZGlhdG9yLl9oYW5kbGVycyA9IHt9O1xuXG5tZWRpYXRvci5zZXRIYW5kbGVyID0gZnVuY3Rpb24obmFtZSwgbWV0aG9kLCBpbnN0YW5jZSkge1xuICByZXR1cm4gaGFuZGxlcnNbbmFtZV0gPSB7XG4gICAgaW5zdGFuY2U6IGluc3RhbmNlLFxuICAgIG1ldGhvZDogbWV0aG9kXG4gIH07XG59O1xuXG5tZWRpYXRvci5leGVjdXRlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhcmdzLCBoYW5kbGVyLCBuYW1lLCBvcHRpb25zLCBzaWxlbnQ7XG4gIG9wdGlvbnMgPSBhcmd1bWVudHNbMF0sIGFyZ3MgPSAyIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgOiBbXTtcbiAgaWYgKG9wdGlvbnMgJiYgdHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG4gICAgbmFtZSA9IG9wdGlvbnMubmFtZSwgc2lsZW50ID0gb3B0aW9ucy5zaWxlbnQ7XG4gIH0gZWxzZSB7XG4gICAgbmFtZSA9IG9wdGlvbnM7XG4gIH1cbiAgaGFuZGxlciA9IGhhbmRsZXJzW25hbWVdO1xuICBpZiAoaGFuZGxlcikge1xuICAgIHJldHVybiBoYW5kbGVyLm1ldGhvZC5hcHBseShoYW5kbGVyLmluc3RhbmNlLCBhcmdzKTtcbiAgfSBlbHNlIGlmICghc2lsZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwibWVkaWF0b3IuZXhlY3V0ZTogXCIgKyBuYW1lICsgXCIgaGFuZGxlciBpcyBub3QgZGVmaW5lZFwiKTtcbiAgfVxufTtcblxubWVkaWF0b3IucmVtb3ZlSGFuZGxlcnMgPSBmdW5jdGlvbihpbnN0YW5jZU9yTmFtZXMpIHtcbiAgdmFyIGhhbmRsZXIsIGksIGxlbiwgbmFtZTtcbiAgaWYgKCFpbnN0YW5jZU9yTmFtZXMpIHtcbiAgICBtZWRpYXRvci5faGFuZGxlcnMgPSB7fTtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheShpbnN0YW5jZU9yTmFtZXMpKSB7XG4gICAgZm9yIChpID0gMCwgbGVuID0gaW5zdGFuY2VPck5hbWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBuYW1lID0gaW5zdGFuY2VPck5hbWVzW2ldO1xuICAgICAgZGVsZXRlIGhhbmRsZXJzW25hbWVdO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKG5hbWUgaW4gaGFuZGxlcnMpIHtcbiAgICAgIGhhbmRsZXIgPSBoYW5kbGVyc1tuYW1lXTtcbiAgICAgIGlmIChoYW5kbGVyLmluc3RhbmNlID09PSBpbnN0YW5jZU9yTmFtZXMpIHtcbiAgICAgICAgZGVsZXRlIGhhbmRsZXJzW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxubWVkaWF0b3Iuc2VhbCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gT2JqZWN0LnNlYWwobWVkaWF0b3IpO1xufTtcblxudXRpbHMucmVhZG9ubHkobWVkaWF0b3IsICdzdWJzY3JpYmUnLCAnc3Vic2NyaWJlT25jZScsICd1bnN1YnNjcmliZScsICdwdWJsaXNoJywgJ3NldEhhbmRsZXInLCAnZXhlY3V0ZScsICdyZW1vdmVIYW5kbGVycycsICdzZWFsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gbWVkaWF0b3I7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pYldWa2FXRjBiM0l1YW5NaUxDSnpiM1Z5WTJWU2IyOTBJam9pSWl3aWMyOTFjbU5sY3lJNld5SnRaV1JwWVhSdmNpNWpiMlptWldVaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRTdRVUZCUVN4SlFVRkJMRzFEUVVGQk8wVkJRVUU3TzBGQlJVRXNVVUZCUVN4SFFVRlhMRTlCUVVFc1EwRkJVU3hWUVVGU096dEJRVU5ZTEV0QlFVRXNSMEZCVVN4UFFVRkJMRU5CUVZFc1lVRkJVanM3UVVGcFFsSXNVVUZCUVN4SFFVRlhPenRCUVU5WUxGRkJRVkVzUTBGQlF5eFRRVUZVTEVkQlFYbENMRkZCUVZFc1EwRkJReXhGUVVGVUxFZEJRVzFDTEZGQlFWRXNRMEZCUXl4TlFVRk5MRU5CUVVNN08wRkJRelZFTEZGQlFWRXNRMEZCUXl4aFFVRlVMRWRCUVhsQ0xGRkJRVkVzUTBGQlF5eEpRVUZVTEVkQlFXMUNMRkZCUVZFc1EwRkJReXhOUVVGTkxFTkJRVU03TzBGQlF6VkVMRkZCUVZFc1EwRkJReXhYUVVGVUxFZEJRWGxDTEZGQlFWRXNRMEZCUXl4SFFVRlVMRWRCUVcxQ0xGRkJRVkVzUTBGQlF5eE5RVUZOTEVOQlFVTTdPMEZCUXpWRUxGRkJRVkVzUTBGQlF5eFBRVUZVTEVkQlFYbENMRkZCUVZFc1EwRkJReXhQUVVGVUxFZEJRVzFDTEZGQlFWRXNRMEZCUXl4TlFVRk5MRU5CUVVNN08wRkJSelZFTEZGQlFWRXNRMEZCUXl4VlFVRlVMRWRCUVhOQ096dEJRVTkwUWl4UlFVRkJMRWRCUVZjc1VVRkJVU3hEUVVGRExGTkJRVlFzUjBGQmNVSTdPMEZCUjJoRExGRkJRVkVzUTBGQlF5eFZRVUZVTEVkQlFYTkNMRk5CUVVNc1NVRkJSQ3hGUVVGUExFMUJRVkFzUlVGQlpTeFJRVUZtTzFOQlEzQkNMRkZCUVZNc1EwRkJRU3hKUVVGQkxFTkJRVlFzUjBGQmFVSTdTVUZCUXl4VlFVRkJMRkZCUVVRN1NVRkJWeXhSUVVGQkxFMUJRVmc3TzBGQlJFYzdPMEZCU1hSQ0xGRkJRVkVzUTBGQlF5eFBRVUZVTEVkQlFXMUNMRk5CUVVFN1FVRkRha0lzVFVGQlFUdEZRVVJyUWl4M1FrRkJVenRGUVVNelFpeEpRVUZITEU5QlFVRXNTVUZCV1N4UFFVRlBMRTlCUVZBc1MwRkJhMElzVVVGQmFrTTdTVUZEUnl4dFFrRkJSQ3hGUVVGUExIZENRVVJVTzBkQlFVRXNUVUZCUVR0SlFVZEZMRWxCUVVFc1IwRkJUeXhSUVVoVU96dEZRVWxCTEU5QlFVRXNSMEZCVlN4UlFVRlRMRU5CUVVFc1NVRkJRVHRGUVVOdVFpeEpRVUZITEU5QlFVZzdWMEZEUlN4UFFVRlBMRU5CUVVNc1RVRkJUU3hEUVVGRExFdEJRV1lzUTBGQmNVSXNUMEZCVHl4RFFVRkRMRkZCUVRkQ0xFVkJRWFZETEVsQlFYWkRMRVZCUkVZN1IwRkJRU3hOUVVWTExFbEJRVWNzUTBGQlNTeE5RVUZRTzBGQlEwZ3NWVUZCVFN4SlFVRkpMRXRCUVVvc1EwRkJWU3h2UWtGQlFTeEhRVUZ4UWl4SlFVRnlRaXhIUVVFd1FpeDVRa0ZCY0VNc1JVRkVTRHM3UVVGU1dUczdRVUZoYmtJc1VVRkJVU3hEUVVGRExHTkJRVlFzUjBGQk1FSXNVMEZCUXl4bFFVRkVPMEZCUTNoQ0xFMUJRVUU3UlVGQlFTeEpRVUZCTEVOQlFVOHNaVUZCVUR0SlFVTkZMRkZCUVZFc1EwRkJReXhUUVVGVUxFZEJRWEZDTEVkQlJIWkNPenRGUVVkQkxFbEJRVWNzUzBGQlN5eERRVUZETEU5QlFVNHNRMEZCWXl4bFFVRmtMRU5CUVVnN1FVRkRSU3hUUVVGQkxHbEVRVUZCT3p0TlFVTkZMRTlCUVU4c1VVRkJVeXhEUVVGQkxFbEJRVUU3UVVGRWJFSXNTMEZFUmp0SFFVRkJMRTFCUVVFN1FVRkpSU3hUUVVGQkxHZENRVUZCT3p0VlFVRnRReXhQUVVGUExFTkJRVU1zVVVGQlVpeExRVUZ2UWp0UlFVTnlSQ3hQUVVGUExGRkJRVk1zUTBGQlFTeEpRVUZCT3p0QlFVUnNRaXhMUVVwR096dEJRVXAzUWpzN1FVRnBRakZDTEZGQlFWRXNRMEZCUXl4SlFVRlVMRWRCUVdkQ0xGTkJRVUU3VTBGRlpDeE5RVUZOTEVOQlFVTXNTVUZCVUN4RFFVRlpMRkZCUVZvN1FVRkdZenM3UVVGTGFFSXNTMEZCU3l4RFFVRkRMRkZCUVU0c1EwRkJaU3hSUVVGbUxFVkJRMFVzVjBGRVJpeEZRVU5sTEdWQlJHWXNSVUZEWjBNc1lVRkVhRU1zUlVGREswTXNVMEZFTDBNc1JVRkZSU3haUVVaR0xFVkJSV2RDTEZOQlJtaENMRVZCUlRKQ0xHZENRVVl6UWl4RlFVVTJReXhOUVVZM1F6czdRVUZMUVN4TlFVRk5MRU5CUVVNc1QwRkJVQ3hIUVVGcFFpSjlcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBCYWNrYm9uZSwgQ29sbGVjdGlvbiwgRXZlbnRCcm9rZXIsIE1vZGVsLCBfLCB1dGlscyxcbiAgZXh0ZW5kID0gZnVuY3Rpb24oY2hpbGQsIHBhcmVudCkgeyBmb3IgKHZhciBrZXkgaW4gcGFyZW50KSB7IGlmIChoYXNQcm9wLmNhbGwocGFyZW50LCBrZXkpKSBjaGlsZFtrZXldID0gcGFyZW50W2tleV07IH0gZnVuY3Rpb24gY3RvcigpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9IGN0b3IucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTsgY2hpbGQucHJvdG90eXBlID0gbmV3IGN0b3IoKTsgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTsgcmV0dXJuIGNoaWxkOyB9LFxuICBoYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHk7XG5cbl8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbkJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuTW9kZWwgPSByZXF1aXJlKCcuL21vZGVsJyk7XG5cbkV2ZW50QnJva2VyID0gcmVxdWlyZSgnLi4vbGliL2V2ZW50X2Jyb2tlcicpO1xuXG51dGlscyA9IHJlcXVpcmUoJy4uL2xpYi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb24gPSAoZnVuY3Rpb24oc3VwZXJDbGFzcykge1xuICBleHRlbmQoQ29sbGVjdGlvbiwgc3VwZXJDbGFzcyk7XG5cbiAgZnVuY3Rpb24gQ29sbGVjdGlvbigpIHtcbiAgICByZXR1cm4gQ29sbGVjdGlvbi5fX3N1cGVyX18uY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIF8uZXh0ZW5kKENvbGxlY3Rpb24ucHJvdG90eXBlLCBFdmVudEJyb2tlcik7XG5cbiAgQ29sbGVjdGlvbi5wcm90b3R5cGUubW9kZWwgPSBNb2RlbDtcblxuICBDb2xsZWN0aW9uLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAodXRpbHMuc2VyaWFsaXplKTtcbiAgfTtcblxuICBDb2xsZWN0aW9uLnByb3RvdHlwZS5kaXNwb3NlZCA9IGZhbHNlO1xuXG4gIENvbGxlY3Rpb24ucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaSwgbGVuLCBwcm9wLCByZWY7XG4gICAgaWYgKHRoaXMuZGlzcG9zZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyKCdkaXNwb3NlJywgdGhpcyk7XG4gICAgdGhpcy5yZXNldChbXSwge1xuICAgICAgc2lsZW50OiB0cnVlXG4gICAgfSk7XG4gICAgdGhpcy51bnN1YnNjcmliZUFsbEV2ZW50cygpO1xuICAgIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIHRoaXMub2ZmKCk7XG4gICAgcmVmID0gWydtb2RlbCcsICdtb2RlbHMnLCAnX2J5Q2lkJywgJ19jYWxsYmFja3MnXTtcbiAgICBmb3IgKGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHByb3AgPSByZWZbaV07XG4gICAgICBkZWxldGUgdGhpc1twcm9wXTtcbiAgICB9XG4gICAgdGhpcy5fYnlJZCA9IHt9O1xuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICAgIHJldHVybiBPYmplY3QuZnJlZXplKHRoaXMpO1xuICB9O1xuXG4gIHJldHVybiBDb2xsZWN0aW9uO1xuXG59KShCYWNrYm9uZS5Db2xsZWN0aW9uKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lZMjlzYkdWamRHbHZiaTVxY3lJc0luTnZkWEpqWlZKdmIzUWlPaUlpTENKemIzVnlZMlZ6SWpwYkltTnZiR3hsWTNScGIyNHVZMjltWm1WbElsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lKQlFVRkJPMEZCUVVFc1NVRkJRU3hyUkVGQlFUdEZRVUZCT3pzN1FVRkZRU3hEUVVGQkxFZEJRVWtzVDBGQlFTeERRVUZSTEZsQlFWSTdPMEZCUTBvc1VVRkJRU3hIUVVGWExFOUJRVUVzUTBGQlVTeFZRVUZTT3p0QlFVVllMRXRCUVVFc1IwRkJVU3hQUVVGQkxFTkJRVkVzVTBGQlVqczdRVUZEVWl4WFFVRkJMRWRCUVdNc1QwRkJRU3hEUVVGUkxIRkNRVUZTT3p0QlFVTmtMRXRCUVVFc1IwRkJVU3hQUVVGQkxFTkJRVkVzWTBGQlVqczdRVUZKVWl4TlFVRk5MRU5CUVVNc1QwRkJVQ3hIUVVGMVFqczdPenM3T3p0RlFVVnlRaXhEUVVGRExFTkJRVU1zVFVGQlJpeERRVUZUTEZWQlFVTXNRMEZCUVN4VFFVRldMRVZCUVhGQ0xGZEJRWEpDT3p0MVFrRkhRU3hMUVVGQkxFZEJRVTg3TzNWQ1FVZFFMRk5CUVVFc1IwRkJWeXhUUVVGQk8xZEJRMVFzU1VGQlF5eERRVUZCTEVkQlFVUXNRMEZCU3l4TFFVRkxMRU5CUVVNc1UwRkJXRHRGUVVSVE96dDFRa0ZOV0N4UlFVRkJMRWRCUVZVN08zVkNRVVZXTEU5QlFVRXNSMEZCVXl4VFFVRkJPMEZCUTFBc1VVRkJRVHRKUVVGQkxFbEJRVlVzU1VGQlF5eERRVUZCTEZGQlFWZzdRVUZCUVN4aFFVRkJPenRKUVVkQkxFbEJRVU1zUTBGQlFTeFBRVUZFTEVOQlFWTXNVMEZCVkN4RlFVRnZRaXhKUVVGd1FqdEpRVWxCTEVsQlFVTXNRMEZCUVN4TFFVRkVMRU5CUVU4c1JVRkJVQ3hGUVVGWE8wMUJRVUVzVFVGQlFTeEZRVUZSTEVsQlFWSTdTMEZCV0R0SlFVZEJMRWxCUVVNc1EwRkJRU3h2UWtGQlJDeERRVUZCTzBsQlIwRXNTVUZCUXl4RFFVRkJMR0ZCUVVRc1EwRkJRVHRKUVVkQkxFbEJRVU1zUTBGQlFTeEhRVUZFTEVOQlFVRTdRVUZKUVR0QlFVRkJMRk5CUVVFc2NVTkJRVUU3TzAxQlFVRXNUMEZCVHl4SlFVRkxMRU5CUVVFc1NVRkJRVHRCUVVGYU8wbEJUVUVzU1VGQlF5eERRVUZCTEV0QlFVUXNSMEZCVXp0SlFVZFVMRWxCUVVNc1EwRkJRU3hSUVVGRUxFZEJRVms3VjBGSFdpeE5RVUZOTEVOQlFVTXNUVUZCVUN4RFFVRmpMRWxCUVdRN1JVRnFRMDg3T3pzN1IwRm9RaXRDTEZGQlFWRXNRMEZCUXlKOVxuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIEJhY2tib25lLCBFdmVudEJyb2tlciwgTW9kZWwsIF8sIHNlcmlhbGl6ZUF0dHJpYnV0ZXMsIHNlcmlhbGl6ZU1vZGVsQXR0cmlidXRlcyxcbiAgZXh0ZW5kID0gZnVuY3Rpb24oY2hpbGQsIHBhcmVudCkgeyBmb3IgKHZhciBrZXkgaW4gcGFyZW50KSB7IGlmIChoYXNQcm9wLmNhbGwocGFyZW50LCBrZXkpKSBjaGlsZFtrZXldID0gcGFyZW50W2tleV07IH0gZnVuY3Rpb24gY3RvcigpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9IGN0b3IucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTsgY2hpbGQucHJvdG90eXBlID0gbmV3IGN0b3IoKTsgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTsgcmV0dXJuIGNoaWxkOyB9LFxuICBoYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHk7XG5cbl8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbkJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuRXZlbnRCcm9rZXIgPSByZXF1aXJlKCcuLi9saWIvZXZlbnRfYnJva2VyJyk7XG5cbnNlcmlhbGl6ZUF0dHJpYnV0ZXMgPSBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlcywgbW9kZWxTdGFjaykge1xuICB2YXIgZGVsZWdhdG9yLCBpLCBrZXksIGxlbiwgb3RoZXJNb2RlbCwgcmVmLCBzZXJpYWxpemVkTW9kZWxzLCB2YWx1ZTtcbiAgZGVsZWdhdG9yID0gT2JqZWN0LmNyZWF0ZShhdHRyaWJ1dGVzKTtcbiAgaWYgKG1vZGVsU3RhY2sgPT0gbnVsbCkge1xuICAgIG1vZGVsU3RhY2sgPSB7fTtcbiAgfVxuICBtb2RlbFN0YWNrW21vZGVsLmNpZF0gPSB0cnVlO1xuICBmb3IgKGtleSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgdmFsdWUgPSBhdHRyaWJ1dGVzW2tleV07XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgQmFja2JvbmUuTW9kZWwpIHtcbiAgICAgIGRlbGVnYXRvcltrZXldID0gc2VyaWFsaXplTW9kZWxBdHRyaWJ1dGVzKHZhbHVlLCBtb2RlbCwgbW9kZWxTdGFjayk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEJhY2tib25lLkNvbGxlY3Rpb24pIHtcbiAgICAgIHNlcmlhbGl6ZWRNb2RlbHMgPSBbXTtcbiAgICAgIHJlZiA9IHZhbHVlLm1vZGVscztcbiAgICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBvdGhlck1vZGVsID0gcmVmW2ldO1xuICAgICAgICBzZXJpYWxpemVkTW9kZWxzLnB1c2goc2VyaWFsaXplTW9kZWxBdHRyaWJ1dGVzKG90aGVyTW9kZWwsIG1vZGVsLCBtb2RlbFN0YWNrKSk7XG4gICAgICB9XG4gICAgICBkZWxlZ2F0b3Jba2V5XSA9IHNlcmlhbGl6ZWRNb2RlbHM7XG4gICAgfVxuICB9XG4gIGRlbGV0ZSBtb2RlbFN0YWNrW21vZGVsLmNpZF07XG4gIHJldHVybiBkZWxlZ2F0b3I7XG59O1xuXG5zZXJpYWxpemVNb2RlbEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihtb2RlbCwgY3VycmVudE1vZGVsLCBtb2RlbFN0YWNrKSB7XG4gIHZhciBhdHRyaWJ1dGVzO1xuICBpZiAobW9kZWwgPT09IGN1cnJlbnRNb2RlbCB8fCBtb2RlbC5jaWQgaW4gbW9kZWxTdGFjaykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGF0dHJpYnV0ZXMgPSB0eXBlb2YgbW9kZWwuZ2V0QXR0cmlidXRlcyA9PT0gJ2Z1bmN0aW9uJyA/IG1vZGVsLmdldEF0dHJpYnV0ZXMoKSA6IG1vZGVsLmF0dHJpYnV0ZXM7XG4gIHJldHVybiBzZXJpYWxpemVBdHRyaWJ1dGVzKG1vZGVsLCBhdHRyaWJ1dGVzLCBtb2RlbFN0YWNrKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW9kZWwgPSAoZnVuY3Rpb24oc3VwZXJDbGFzcykge1xuICBleHRlbmQoTW9kZWwsIHN1cGVyQ2xhc3MpO1xuXG4gIGZ1bmN0aW9uIE1vZGVsKCkge1xuICAgIHJldHVybiBNb2RlbC5fX3N1cGVyX18uY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIF8uZXh0ZW5kKE1vZGVsLnByb3RvdHlwZSwgRXZlbnRCcm9rZXIpO1xuXG4gIE1vZGVsLnByb3RvdHlwZS5nZXRBdHRyaWJ1dGVzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuYXR0cmlidXRlcztcbiAgfTtcblxuICBNb2RlbC5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZUF0dHJpYnV0ZXModGhpcywgdGhpcy5nZXRBdHRyaWJ1dGVzKCkpO1xuICB9O1xuXG4gIE1vZGVsLnByb3RvdHlwZS5kaXNwb3NlZCA9IGZhbHNlO1xuXG4gIE1vZGVsLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGksIGxlbiwgcHJvcCwgcmVmLCByZWYxO1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcignZGlzcG9zZScsIHRoaXMpO1xuICAgIGlmICgocmVmID0gdGhpcy5jb2xsZWN0aW9uKSAhPSBudWxsKSB7XG4gICAgICBpZiAodHlwZW9mIHJlZi5yZW1vdmUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZWYucmVtb3ZlKHRoaXMsIHtcbiAgICAgICAgICBzaWxlbnQ6IHRydWVcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMudW5zdWJzY3JpYmVBbGxFdmVudHMoKTtcbiAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICB0aGlzLm9mZigpO1xuICAgIHJlZjEgPSBbJ2NvbGxlY3Rpb24nLCAnYXR0cmlidXRlcycsICdjaGFuZ2VkJywgJ2RlZmF1bHRzJywgJ19lc2NhcGVkQXR0cmlidXRlcycsICdfcHJldmlvdXNBdHRyaWJ1dGVzJywgJ19zaWxlbnQnLCAnX3BlbmRpbmcnLCAnX2NhbGxiYWNrcyddO1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZjEubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHByb3AgPSByZWYxW2ldO1xuICAgICAgZGVsZXRlIHRoaXNbcHJvcF07XG4gICAgfVxuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICAgIHJldHVybiBPYmplY3QuZnJlZXplKHRoaXMpO1xuICB9O1xuXG4gIHJldHVybiBNb2RlbDtcblxufSkoQmFja2JvbmUuTW9kZWwpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaWJXOWtaV3d1YW5NaUxDSnpiM1Z5WTJWU2IyOTBJam9pSWl3aWMyOTFjbU5sY3lJNld5SnRiMlJsYkM1amIyWm1aV1VpWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJa0ZCUVVFN1FVRkJRU3hKUVVGQkxEaEZRVUZCTzBWQlFVRTdPenRCUVVWQkxFTkJRVUVzUjBGQlNTeFBRVUZCTEVOQlFWRXNXVUZCVWpzN1FVRkRTaXhSUVVGQkxFZEJRVmNzVDBGQlFTeERRVUZSTEZWQlFWSTdPMEZCUTFnc1YwRkJRU3hIUVVGakxFOUJRVUVzUTBGQlVTeHhRa0ZCVWpzN1FVRkxaQ3h0UWtGQlFTeEhRVUZ6UWl4VFFVRkRMRXRCUVVRc1JVRkJVU3hWUVVGU0xFVkJRVzlDTEZWQlFYQkNPMEZCUlhCQ0xFMUJRVUU3UlVGQlFTeFRRVUZCTEVkQlFWa3NUVUZCVFN4RFFVRkRMRTFCUVZBc1EwRkJZeXhWUVVGa096dEpRVWRhTEdGQlFXTTdPMFZCUTJRc1ZVRkJWeXhEUVVGQkxFdEJRVXNzUTBGQlF5eEhRVUZPTEVOQlFWZ3NSMEZCZDBJN1FVRkplRUlzVDBGQlFTeHBRa0ZCUVRzN1NVRkhSU3hKUVVGSExFdEJRVUVzV1VGQmFVSXNVVUZCVVN4RFFVRkRMRXRCUVRkQ08wMUJRMFVzVTBGQlZTeERRVUZCTEVkQlFVRXNRMEZCVml4SFFVRnBRaXgzUWtGQlFTeERRVUY1UWl4TFFVRjZRaXhGUVVGblF5eExRVUZvUXl4RlFVRjFReXhWUVVGMlF5eEZRVVJ1UWp0TFFVRkJMRTFCU1Vzc1NVRkJSeXhMUVVGQkxGbEJRV2xDTEZGQlFWRXNRMEZCUXl4VlFVRTNRanROUVVOSUxHZENRVUZCTEVkQlFXMUNPMEZCUTI1Q08wRkJRVUVzVjBGQlFTeHhRMEZCUVRzN1VVRkRSU3huUWtGQlowSXNRMEZCUXl4SlFVRnFRaXhEUVVORkxIZENRVUZCTEVOQlFYbENMRlZCUVhwQ0xFVkJRWEZETEV0QlFYSkRMRVZCUVRSRExGVkJRVFZETEVOQlJFWTdRVUZFUmp0TlFVbEJMRk5CUVZVc1EwRkJRU3hIUVVGQkxFTkJRVllzUjBGQmFVSXNhVUpCVG1RN08wRkJVRkE3UlVGblFrRXNUMEZCVHl4VlFVRlhMRU5CUVVFc1MwRkJTeXhEUVVGRExFZEJRVTQ3VTBGSGJFSTdRVUUzUW05Q096dEJRV2xEZEVJc2QwSkJRVUVzUjBGQk1rSXNVMEZCUXl4TFFVRkVMRVZCUVZFc1dVRkJVaXhGUVVGelFpeFZRVUYwUWp0QlFVVjZRaXhOUVVGQk8wVkJRVUVzU1VGQlpTeExRVUZCTEV0QlFWTXNXVUZCVkN4SlFVRjVRaXhMUVVGTExFTkJRVU1zUjBGQlRpeEpRVUZoTEZWQlFYSkVPMEZCUVVFc1YwRkJUeXhMUVVGUU96dEZRVVZCTEZWQlFVRXNSMEZCWjBJc1QwRkJUeXhMUVVGTExFTkJRVU1zWVVGQllpeExRVUU0UWl4VlFVRnFReXhIUVVWWUxFdEJRVXNzUTBGQlF5eGhRVUZPTEVOQlFVRXNRMEZHVnl4SFFVdFlMRXRCUVVzc1EwRkJRenRUUVVOU0xHMUNRVUZCTEVOQlFXOUNMRXRCUVhCQ0xFVkJRVEpDTEZWQlFUTkNMRVZCUVhWRExGVkJRWFpETzBGQlZubENPenRCUVdNelFpeE5RVUZOTEVOQlFVTXNUMEZCVUN4SFFVRjFRanM3T3pzN096dEZRVVZ5UWl4RFFVRkRMRU5CUVVNc1RVRkJSaXhEUVVGVExFdEJRVU1zUTBGQlFTeFRRVUZXTEVWQlFYRkNMRmRCUVhKQ096dHJRa0ZMUVN4aFFVRkJMRWRCUVdVc1UwRkJRVHRYUVVOaUxFbEJRVU1zUTBGQlFUdEZRVVJaT3p0clFrRlBaaXhUUVVGQkxFZEJRVmNzVTBGQlFUdFhRVU5VTEcxQ1FVRkJMRU5CUVc5Q0xFbEJRWEJDTEVWQlFUQkNMRWxCUVVNc1EwRkJRU3hoUVVGRUxFTkJRVUVzUTBGQk1VSTdSVUZFVXpzN2EwSkJUVmdzVVVGQlFTeEhRVUZWT3p0clFrRkZWaXhQUVVGQkxFZEJRVk1zVTBGQlFUdEJRVU5RTEZGQlFVRTdTVUZCUVN4SlFVRlZMRWxCUVVNc1EwRkJRU3hSUVVGWU8wRkJRVUVzWVVGQlFUczdTVUZIUVN4SlFVRkRMRU5CUVVFc1QwRkJSQ3hEUVVGVExGTkJRVlFzUlVGQmIwSXNTVUZCY0VJN096dFhRVVZYTEVOQlFVVXNUMEZCVVN4TlFVRk5PMVZCUVVFc1RVRkJRU3hGUVVGUkxFbEJRVkk3T3pzN1NVRkhNMElzU1VGQlF5eERRVUZCTEc5Q1FVRkVMRU5CUVVFN1NVRkhRU3hKUVVGRExFTkJRVUVzWVVGQlJDeERRVUZCTzBsQlIwRXNTVUZCUXl4RFFVRkJMRWRCUVVRc1EwRkJRVHRCUVVsQk8wRkJRVUVzVTBGQlFTeHpRMEZCUVRzN1RVRkJRU3hQUVVGUExFbEJRVXNzUTBGQlFTeEpRVUZCTzBGQlFWbzdTVUZUUVN4SlFVRkRMRU5CUVVFc1VVRkJSQ3hIUVVGWk8xZEJSMW9zVFVGQlRTeERRVUZETEUxQlFWQXNRMEZCWXl4SlFVRmtPMFZCTDBKUE96czdPMGRCZEVJd1FpeFJRVUZSTEVOQlFVTWlmUT09XG4iLCIndXNlIHN0cmljdCc7XG52YXIgJCwgQmFja2JvbmUsIENvbGxlY3Rpb25WaWV3LCBWaWV3LCBhZGRDbGFzcywgZW5kQW5pbWF0aW9uLCBmaWx0ZXJDaGlsZHJlbiwgaW5zZXJ0Vmlldywgc3RhcnRBbmltYXRpb24sIHRvZ2dsZUVsZW1lbnQsIHV0aWxzLFxuICBiaW5kID0gZnVuY3Rpb24oZm4sIG1lKXsgcmV0dXJuIGZ1bmN0aW9uKCl7IHJldHVybiBmbi5hcHBseShtZSwgYXJndW1lbnRzKTsgfTsgfSxcbiAgZXh0ZW5kID0gZnVuY3Rpb24oY2hpbGQsIHBhcmVudCkgeyBmb3IgKHZhciBrZXkgaW4gcGFyZW50KSB7IGlmIChoYXNQcm9wLmNhbGwocGFyZW50LCBrZXkpKSBjaGlsZFtrZXldID0gcGFyZW50W2tleV07IH0gZnVuY3Rpb24gY3RvcigpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9IGN0b3IucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTsgY2hpbGQucHJvdG90eXBlID0gbmV3IGN0b3IoKTsgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTsgcmV0dXJuIGNoaWxkOyB9LFxuICBoYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHk7XG5cbkJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcblxuVmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xuXG51dGlscyA9IHJlcXVpcmUoJy4uL2xpYi91dGlscycpO1xuXG4kID0gQmFja2JvbmUuJDtcblxuZmlsdGVyQ2hpbGRyZW4gPSBmdW5jdGlvbihub2RlTGlzdCwgc2VsZWN0b3IpIHtcbiAgdmFyIGksIGxlbiwgbm9kZSwgcmVzdWx0cztcbiAgaWYgKCFzZWxlY3Rvcikge1xuICAgIHJldHVybiBub2RlTGlzdDtcbiAgfVxuICByZXN1bHRzID0gW107XG4gIGZvciAoaSA9IDAsIGxlbiA9IG5vZGVMaXN0Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgbm9kZSA9IG5vZGVMaXN0W2ldO1xuICAgIGlmICh1dGlscy5tYXRjaGVzU2VsZWN0b3Iobm9kZSwgc2VsZWN0b3IpKSB7XG4gICAgICByZXN1bHRzLnB1c2gobm9kZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHRzO1xufTtcblxudG9nZ2xlRWxlbWVudCA9IChmdW5jdGlvbigpIHtcbiAgaWYgKCQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZWxlbSwgdmlzaWJsZSkge1xuICAgICAgcmV0dXJuIGVsZW0udG9nZ2xlKHZpc2libGUpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGVsZW0sIHZpc2libGUpIHtcbiAgICAgIHJldHVybiBlbGVtLnN0eWxlLmRpc3BsYXkgPSAodmlzaWJsZSA/ICcnIDogJ25vbmUnKTtcbiAgICB9O1xuICB9XG59KSgpO1xuXG5hZGRDbGFzcyA9IChmdW5jdGlvbigpIHtcbiAgaWYgKCQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZWxlbSwgY2xzKSB7XG4gICAgICByZXR1cm4gZWxlbS5hZGRDbGFzcyhjbHMpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGVsZW0sIGNscykge1xuICAgICAgcmV0dXJuIGVsZW0uY2xhc3NMaXN0LmFkZChjbHMpO1xuICAgIH07XG4gIH1cbn0pKCk7XG5cbnN0YXJ0QW5pbWF0aW9uID0gKGZ1bmN0aW9uKCkge1xuICBpZiAoJCkge1xuICAgIHJldHVybiBmdW5jdGlvbihlbGVtLCB1c2VDc3NBbmltYXRpb24sIGNscykge1xuICAgICAgaWYgKHVzZUNzc0FuaW1hdGlvbikge1xuICAgICAgICByZXR1cm4gYWRkQ2xhc3MoZWxlbSwgY2xzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBlbGVtLmNzcygnb3BhY2l0eScsIDApO1xuICAgICAgfVxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGVsZW0sIHVzZUNzc0FuaW1hdGlvbiwgY2xzKSB7XG4gICAgICBpZiAodXNlQ3NzQW5pbWF0aW9uKSB7XG4gICAgICAgIHJldHVybiBhZGRDbGFzcyhlbGVtLCBjbHMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGVsZW0uc3R5bGUub3BhY2l0eSA9IDA7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufSkoKTtcblxuZW5kQW5pbWF0aW9uID0gKGZ1bmN0aW9uKCkge1xuICBpZiAoJCkge1xuICAgIHJldHVybiBmdW5jdGlvbihlbGVtLCBkdXJhdGlvbikge1xuICAgICAgcmV0dXJuIGVsZW0uYW5pbWF0ZSh7XG4gICAgICAgIG9wYWNpdHk6IDFcbiAgICAgIH0sIGR1cmF0aW9uKTtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmdW5jdGlvbihlbGVtLCBkdXJhdGlvbikge1xuICAgICAgZWxlbS5zdHlsZS50cmFuc2l0aW9uID0gXCJvcGFjaXR5IFwiICsgZHVyYXRpb24gKyBcIm1zXCI7XG4gICAgICByZXR1cm4gZWxlbS5zdHlsZS5vcGFjaXR5ID0gMTtcbiAgICB9O1xuICB9XG59KSgpO1xuXG5pbnNlcnRWaWV3ID0gKGZ1bmN0aW9uKCkge1xuICBpZiAoJCkge1xuICAgIHJldHVybiBmdW5jdGlvbihsaXN0LCB2aWV3RWwsIHBvc2l0aW9uLCBsZW5ndGgsIGl0ZW1TZWxlY3Rvcikge1xuICAgICAgdmFyIGNoaWxkcmVuLCBjaGlsZHJlbkxlbmd0aCwgaW5zZXJ0SW5NaWRkbGUsIGlzRW5kLCBtZXRob2Q7XG4gICAgICBpbnNlcnRJbk1pZGRsZSA9ICgwIDwgcG9zaXRpb24gJiYgcG9zaXRpb24gPCBsZW5ndGgpO1xuICAgICAgaXNFbmQgPSBmdW5jdGlvbihsZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGxlbmd0aCA9PT0gMCB8fCBwb3NpdGlvbiA+PSBsZW5ndGg7XG4gICAgICB9O1xuICAgICAgaWYgKGluc2VydEluTWlkZGxlIHx8IGl0ZW1TZWxlY3Rvcikge1xuICAgICAgICBjaGlsZHJlbiA9IGxpc3QuY2hpbGRyZW4oaXRlbVNlbGVjdG9yKTtcbiAgICAgICAgY2hpbGRyZW5MZW5ndGggPSBjaGlsZHJlbi5sZW5ndGg7XG4gICAgICAgIGlmIChjaGlsZHJlbltwb3NpdGlvbl0gIT09IHZpZXdFbCkge1xuICAgICAgICAgIGlmIChpc0VuZChjaGlsZHJlbkxlbmd0aCkpIHtcbiAgICAgICAgICAgIHJldHVybiBsaXN0LmFwcGVuZCh2aWV3RWwpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAocG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkcmVuLmVxKHBvc2l0aW9uKS5iZWZvcmUodmlld0VsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBjaGlsZHJlbi5lcShwb3NpdGlvbiAtIDEpLmFmdGVyKHZpZXdFbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZXRob2QgPSBpc0VuZChsZW5ndGgpID8gJ2FwcGVuZCcgOiAncHJlcGVuZCc7XG4gICAgICAgIHJldHVybiBsaXN0W21ldGhvZF0odmlld0VsKTtcbiAgICAgIH1cbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmdW5jdGlvbihsaXN0LCB2aWV3RWwsIHBvc2l0aW9uLCBsZW5ndGgsIGl0ZW1TZWxlY3Rvcikge1xuICAgICAgdmFyIGNoaWxkcmVuLCBjaGlsZHJlbkxlbmd0aCwgaW5zZXJ0SW5NaWRkbGUsIGlzRW5kLCBsYXN0O1xuICAgICAgaW5zZXJ0SW5NaWRkbGUgPSAoMCA8IHBvc2l0aW9uICYmIHBvc2l0aW9uIDwgbGVuZ3RoKTtcbiAgICAgIGlzRW5kID0gZnVuY3Rpb24obGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBsZW5ndGggPT09IDAgfHwgcG9zaXRpb24gPT09IGxlbmd0aDtcbiAgICAgIH07XG4gICAgICBpZiAoaW5zZXJ0SW5NaWRkbGUgfHwgaXRlbVNlbGVjdG9yKSB7XG4gICAgICAgIGNoaWxkcmVuID0gZmlsdGVyQ2hpbGRyZW4obGlzdC5jaGlsZHJlbiwgaXRlbVNlbGVjdG9yKTtcbiAgICAgICAgY2hpbGRyZW5MZW5ndGggPSBjaGlsZHJlbi5sZW5ndGg7XG4gICAgICAgIGlmIChjaGlsZHJlbltwb3NpdGlvbl0gIT09IHZpZXdFbCkge1xuICAgICAgICAgIGlmIChpc0VuZChjaGlsZHJlbkxlbmd0aCkpIHtcbiAgICAgICAgICAgIHJldHVybiBsaXN0LmFwcGVuZENoaWxkKHZpZXdFbCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGxpc3QuaW5zZXJ0QmVmb3JlKHZpZXdFbCwgY2hpbGRyZW5bcG9zaXRpb25dKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGFzdCA9IGNoaWxkcmVuW3Bvc2l0aW9uIC0gMV07XG4gICAgICAgICAgICBpZiAobGlzdC5sYXN0Q2hpbGQgPT09IGxhc3QpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGxpc3QuYXBwZW5kQ2hpbGQodmlld0VsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBsaXN0Lmluc2VydEJlZm9yZSh2aWV3RWwsIGxhc3QubmV4dEVsZW1lbnRTaWJsaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaXNFbmQobGVuZ3RoKSkge1xuICAgICAgICByZXR1cm4gbGlzdC5hcHBlbmRDaGlsZCh2aWV3RWwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGxpc3QuaW5zZXJ0QmVmb3JlKHZpZXdFbCwgbGlzdC5maXJzdENoaWxkKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3Rpb25WaWV3ID0gKGZ1bmN0aW9uKHN1cGVyQ2xhc3MpIHtcbiAgZXh0ZW5kKENvbGxlY3Rpb25WaWV3LCBzdXBlckNsYXNzKTtcblxuICBDb2xsZWN0aW9uVmlldy5wcm90b3R5cGUuaXRlbVZpZXcgPSBudWxsO1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS5hdXRvUmVuZGVyID0gdHJ1ZTtcblxuICBDb2xsZWN0aW9uVmlldy5wcm90b3R5cGUucmVuZGVySXRlbXMgPSB0cnVlO1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS5hbmltYXRpb25EdXJhdGlvbiA9IDUwMDtcblxuICBDb2xsZWN0aW9uVmlldy5wcm90b3R5cGUudXNlQ3NzQW5pbWF0aW9uID0gZmFsc2U7XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLmFuaW1hdGlvblN0YXJ0Q2xhc3MgPSAnYW5pbWF0ZWQtaXRlbS12aWV3JztcblxuICBDb2xsZWN0aW9uVmlldy5wcm90b3R5cGUuYW5pbWF0aW9uRW5kQ2xhc3MgPSAnYW5pbWF0ZWQtaXRlbS12aWV3LWVuZCc7XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLmxpc3RTZWxlY3RvciA9IG51bGw7XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLiRsaXN0ID0gbnVsbDtcblxuICBDb2xsZWN0aW9uVmlldy5wcm90b3R5cGUuZmFsbGJhY2tTZWxlY3RvciA9IG51bGw7XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLiRmYWxsYmFjayA9IG51bGw7XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLmxvYWRpbmdTZWxlY3RvciA9IG51bGw7XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLiRsb2FkaW5nID0gbnVsbDtcblxuICBDb2xsZWN0aW9uVmlldy5wcm90b3R5cGUuaXRlbVNlbGVjdG9yID0gbnVsbDtcblxuICBDb2xsZWN0aW9uVmlldy5wcm90b3R5cGUuZmlsdGVyZXIgPSBudWxsO1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS5maWx0ZXJDYWxsYmFjayA9IGZ1bmN0aW9uKHZpZXcsIGluY2x1ZGVkKSB7XG4gICAgaWYgKCQpIHtcbiAgICAgIHZpZXcuJGVsLnN0b3AodHJ1ZSwgdHJ1ZSk7XG4gICAgfVxuICAgIHJldHVybiB0b2dnbGVFbGVtZW50KCgkID8gdmlldy4kZWwgOiB2aWV3LmVsKSwgaW5jbHVkZWQpO1xuICB9O1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS52aXNpYmxlSXRlbXMgPSBudWxsO1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS5vcHRpb25OYW1lcyA9IFZpZXcucHJvdG90eXBlLm9wdGlvbk5hbWVzLmNvbmNhdChbJ3JlbmRlckl0ZW1zJywgJ2l0ZW1WaWV3J10pO1xuXG4gIGZ1bmN0aW9uIENvbGxlY3Rpb25WaWV3KG9wdGlvbnMpIHtcbiAgICB0aGlzLnJlbmRlckFsbEl0ZW1zID0gYmluZCh0aGlzLnJlbmRlckFsbEl0ZW1zLCB0aGlzKTtcbiAgICB0aGlzLnRvZ2dsZUZhbGxiYWNrID0gYmluZCh0aGlzLnRvZ2dsZUZhbGxiYWNrLCB0aGlzKTtcbiAgICB0aGlzLml0ZW1zUmVzZXQgPSBiaW5kKHRoaXMuaXRlbXNSZXNldCwgdGhpcyk7XG4gICAgdGhpcy5pdGVtUmVtb3ZlZCA9IGJpbmQodGhpcy5pdGVtUmVtb3ZlZCwgdGhpcyk7XG4gICAgdGhpcy5pdGVtQWRkZWQgPSBiaW5kKHRoaXMuaXRlbUFkZGVkLCB0aGlzKTtcbiAgICB0aGlzLnZpc2libGVJdGVtcyA9IFtdO1xuICAgIENvbGxlY3Rpb25WaWV3Ll9fc3VwZXJfXy5jb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgPT0gbnVsbCkge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICB0aGlzLmFkZENvbGxlY3Rpb25MaXN0ZW5lcnMoKTtcbiAgICBpZiAob3B0aW9ucy5maWx0ZXJlciAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5maWx0ZXIob3B0aW9ucy5maWx0ZXJlcik7XG4gICAgfVxuICB9O1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS5hZGRDb2xsZWN0aW9uTGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdhZGQnLCB0aGlzLml0ZW1BZGRlZCk7XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdyZW1vdmUnLCB0aGlzLml0ZW1SZW1vdmVkKTtcbiAgICByZXR1cm4gdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdyZXNldCBzb3J0JywgdGhpcy5pdGVtc1Jlc2V0KTtcbiAgfTtcblxuICBDb2xsZWN0aW9uVmlldy5wcm90b3R5cGUuZ2V0VGVtcGxhdGVEYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRlbXBsYXRlRGF0YTtcbiAgICB0ZW1wbGF0ZURhdGEgPSB7XG4gICAgICBsZW5ndGg6IHRoaXMuY29sbGVjdGlvbi5sZW5ndGhcbiAgICB9O1xuICAgIGlmICh0eXBlb2YgdGhpcy5jb2xsZWN0aW9uLmlzU3luY2VkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0ZW1wbGF0ZURhdGEuc3luY2VkID0gdGhpcy5jb2xsZWN0aW9uLmlzU3luY2VkKCk7XG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGF0ZURhdGE7XG4gIH07XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLmdldFRlbXBsYXRlRnVuY3Rpb24gPSBmdW5jdGlvbigpIHt9O1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGlzdFNlbGVjdG9yO1xuICAgIENvbGxlY3Rpb25WaWV3Ll9fc3VwZXJfXy5yZW5kZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBsaXN0U2VsZWN0b3IgPSB0eXBlb2YgdGhpcy5saXN0U2VsZWN0b3IgPT09ICdmdW5jdGlvbicgPyB0aGlzLmxpc3RTZWxlY3RvcigpIDogdGhpcy5saXN0U2VsZWN0b3I7XG4gICAgaWYgKCQpIHtcbiAgICAgIHRoaXMuJGxpc3QgPSBsaXN0U2VsZWN0b3IgPyB0aGlzLmZpbmQobGlzdFNlbGVjdG9yKSA6IHRoaXMuJGVsO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxpc3QgPSBsaXN0U2VsZWN0b3IgPyB0aGlzLmZpbmQodGhpcy5saXN0U2VsZWN0b3IpIDogdGhpcy5lbDtcbiAgICB9XG4gICAgdGhpcy5pbml0RmFsbGJhY2soKTtcbiAgICB0aGlzLmluaXRMb2FkaW5nSW5kaWNhdG9yKCk7XG4gICAgaWYgKHRoaXMucmVuZGVySXRlbXMpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlbmRlckFsbEl0ZW1zKCk7XG4gICAgfVxuICB9O1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS5pdGVtQWRkZWQgPSBmdW5jdGlvbihpdGVtLCBjb2xsZWN0aW9uLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5zZXJ0VmlldyhpdGVtLCB0aGlzLnJlbmRlckl0ZW0oaXRlbSksIG9wdGlvbnMuYXQpO1xuICB9O1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS5pdGVtUmVtb3ZlZCA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gdGhpcy5yZW1vdmVWaWV3Rm9ySXRlbShpdGVtKTtcbiAgfTtcblxuICBDb2xsZWN0aW9uVmlldy5wcm90b3R5cGUuaXRlbXNSZXNldCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnJlbmRlckFsbEl0ZW1zKCk7XG4gIH07XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLmluaXRGYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5mYWxsYmFja1NlbGVjdG9yKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICgkKSB7XG4gICAgICB0aGlzLiRmYWxsYmFjayA9IHRoaXMuZmluZCh0aGlzLmZhbGxiYWNrU2VsZWN0b3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZhbGxiYWNrID0gdGhpcy5maW5kKHRoaXMuZmFsbGJhY2tTZWxlY3Rvcik7XG4gICAgfVxuICAgIHRoaXMub24oJ3Zpc2liaWxpdHlDaGFuZ2UnLCB0aGlzLnRvZ2dsZUZhbGxiYWNrKTtcbiAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgJ3N5bmNTdGF0ZUNoYW5nZScsIHRoaXMudG9nZ2xlRmFsbGJhY2spO1xuICAgIHJldHVybiB0aGlzLnRvZ2dsZUZhbGxiYWNrKCk7XG4gIH07XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLnRvZ2dsZUZhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZpc2libGU7XG4gICAgdmlzaWJsZSA9IHRoaXMudmlzaWJsZUl0ZW1zLmxlbmd0aCA9PT0gMCAmJiAodHlwZW9mIHRoaXMuY29sbGVjdGlvbi5pc1N5bmNlZCA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuY29sbGVjdGlvbi5pc1N5bmNlZCgpIDogdHJ1ZSk7XG4gICAgcmV0dXJuIHRvZ2dsZUVsZW1lbnQoKCQgPyB0aGlzLiRmYWxsYmFjayA6IHRoaXMuZmFsbGJhY2spLCB2aXNpYmxlKTtcbiAgfTtcblxuICBDb2xsZWN0aW9uVmlldy5wcm90b3R5cGUuaW5pdExvYWRpbmdJbmRpY2F0b3IgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoISh0aGlzLmxvYWRpbmdTZWxlY3RvciAmJiB0eXBlb2YgdGhpcy5jb2xsZWN0aW9uLmlzU3luY2luZyA9PT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCQpIHtcbiAgICAgIHRoaXMuJGxvYWRpbmcgPSB0aGlzLmZpbmQodGhpcy5sb2FkaW5nU2VsZWN0b3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvYWRpbmcgPSB0aGlzLmZpbmQodGhpcy5sb2FkaW5nU2VsZWN0b3IpO1xuICAgIH1cbiAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgJ3N5bmNTdGF0ZUNoYW5nZScsIHRoaXMudG9nZ2xlTG9hZGluZ0luZGljYXRvcik7XG4gICAgcmV0dXJuIHRoaXMudG9nZ2xlTG9hZGluZ0luZGljYXRvcigpO1xuICB9O1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS50b2dnbGVMb2FkaW5nSW5kaWNhdG9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZpc2libGU7XG4gICAgdmlzaWJsZSA9IHRoaXMuY29sbGVjdGlvbi5sZW5ndGggPT09IDAgJiYgdGhpcy5jb2xsZWN0aW9uLmlzU3luY2luZygpO1xuICAgIHJldHVybiB0b2dnbGVFbGVtZW50KCgkID8gdGhpcy4kbG9hZGluZyA6IHRoaXMubG9hZGluZyksIHZpc2libGUpO1xuICB9O1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS5nZXRJdGVtVmlld3MgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaSwgaXRlbVZpZXdzLCBrZXksIGxlbiwgcmVmO1xuICAgIGl0ZW1WaWV3cyA9IHt9O1xuICAgIHJlZiA9IE9iamVjdC5rZXlzKHRoaXMuc3Vidmlld3NCeU5hbWUpO1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAga2V5ID0gcmVmW2ldO1xuICAgICAgaWYgKCFrZXkuaW5kZXhPZignaXRlbVZpZXc6JykpIHtcbiAgICAgICAgaXRlbVZpZXdzW2tleS5zbGljZSg5KV0gPSB0aGlzLnN1YnZpZXdzQnlOYW1lW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpdGVtVmlld3M7XG4gIH07XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlcmVyLCBmaWx0ZXJDYWxsYmFjaykge1xuICAgIHZhciBoYXNJdGVtVmlld3MsIGksIGluY2x1ZGVkLCBpbmRleCwgaXRlbSwgbGVuLCByZWYsIHZpZXc7XG4gICAgaWYgKHR5cGVvZiBmaWx0ZXJlciA9PT0gJ2Z1bmN0aW9uJyB8fCBmaWx0ZXJlciA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5maWx0ZXJlciA9IGZpbHRlcmVyO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGZpbHRlckNhbGxiYWNrID09PSAnZnVuY3Rpb24nIHx8IGZpbHRlckNhbGxiYWNrID09PSBudWxsKSB7XG4gICAgICB0aGlzLmZpbHRlckNhbGxiYWNrID0gZmlsdGVyQ2FsbGJhY2s7XG4gICAgfVxuICAgIGhhc0l0ZW1WaWV3cyA9IE9iamVjdC5rZXlzKHRoaXMuc3Vidmlld3NCeU5hbWUpLnNvbWUoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gMCA9PT0ga2V5LmluZGV4T2YoJ2l0ZW1WaWV3OicpO1xuICAgIH0pO1xuICAgIGlmIChoYXNJdGVtVmlld3MpIHtcbiAgICAgIHJlZiA9IHRoaXMuY29sbGVjdGlvbi5tb2RlbHM7XG4gICAgICBmb3IgKGluZGV4ID0gaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGluZGV4ID0gKytpKSB7XG4gICAgICAgIGl0ZW0gPSByZWZbaW5kZXhdO1xuICAgICAgICBpbmNsdWRlZCA9IHR5cGVvZiB0aGlzLmZpbHRlcmVyID09PSAnZnVuY3Rpb24nID8gdGhpcy5maWx0ZXJlcihpdGVtLCBpbmRleCkgOiB0cnVlO1xuICAgICAgICB2aWV3ID0gdGhpcy5zdWJ2aWV3KFwiaXRlbVZpZXc6XCIgKyBpdGVtLmNpZCk7XG4gICAgICAgIGlmICghdmlldykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29sbGVjdGlvblZpZXcjZmlsdGVyOiAnICsgKFwibm8gdmlldyBmb3VuZCBmb3IgXCIgKyBpdGVtLmNpZCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlsdGVyQ2FsbGJhY2sodmlldywgaW5jbHVkZWQpO1xuICAgICAgICB0aGlzLnVwZGF0ZVZpc2libGVJdGVtcyh2aWV3Lm1vZGVsLCBpbmNsdWRlZCwgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy50cmlnZ2VyKCd2aXNpYmlsaXR5Q2hhbmdlJywgdGhpcy52aXNpYmxlSXRlbXMpO1xuICB9O1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS5yZW5kZXJBbGxJdGVtcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjaWQsIGksIGluZGV4LCBpdGVtLCBpdGVtcywgaiwgaywgbGVuLCBsZW4xLCBsZW4yLCByZWYsIHJlbWFpbmluZ1ZpZXdzQnlDaWQsIHZpZXc7XG4gICAgaXRlbXMgPSB0aGlzLmNvbGxlY3Rpb24ubW9kZWxzO1xuICAgIHRoaXMudmlzaWJsZUl0ZW1zLmxlbmd0aCA9IDA7XG4gICAgcmVtYWluaW5nVmlld3NCeUNpZCA9IHt9O1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IGl0ZW1zLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpdGVtID0gaXRlbXNbaV07XG4gICAgICB2aWV3ID0gdGhpcy5zdWJ2aWV3KFwiaXRlbVZpZXc6XCIgKyBpdGVtLmNpZCk7XG4gICAgICBpZiAodmlldykge1xuICAgICAgICByZW1haW5pbmdWaWV3c0J5Q2lkW2l0ZW0uY2lkXSA9IHZpZXc7XG4gICAgICB9XG4gICAgfVxuICAgIHJlZiA9IE9iamVjdC5rZXlzKHRoaXMuZ2V0SXRlbVZpZXdzKCkpO1xuICAgIGZvciAoaiA9IDAsIGxlbjEgPSByZWYubGVuZ3RoOyBqIDwgbGVuMTsgaisrKSB7XG4gICAgICBjaWQgPSByZWZbal07XG4gICAgICBpZiAoIShjaWQgaW4gcmVtYWluaW5nVmlld3NCeUNpZCkpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVTdWJ2aWV3KFwiaXRlbVZpZXc6XCIgKyBjaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGluZGV4ID0gayA9IDAsIGxlbjIgPSBpdGVtcy5sZW5ndGg7IGsgPCBsZW4yOyBpbmRleCA9ICsraykge1xuICAgICAgaXRlbSA9IGl0ZW1zW2luZGV4XTtcbiAgICAgIHZpZXcgPSB0aGlzLnN1YnZpZXcoXCJpdGVtVmlldzpcIiArIGl0ZW0uY2lkKTtcbiAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgIHRoaXMuaW5zZXJ0VmlldyhpdGVtLCB2aWV3LCBpbmRleCwgZmFsc2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pbnNlcnRWaWV3KGl0ZW0sIHRoaXMucmVuZGVySXRlbShpdGVtKSwgaW5kZXgpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcy50cmlnZ2VyKCd2aXNpYmlsaXR5Q2hhbmdlJywgdGhpcy52aXNpYmxlSXRlbXMpO1xuICAgIH1cbiAgfTtcblxuICBDb2xsZWN0aW9uVmlldy5wcm90b3R5cGUucmVuZGVySXRlbSA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICB2YXIgdmlldztcbiAgICB2aWV3ID0gdGhpcy5zdWJ2aWV3KFwiaXRlbVZpZXc6XCIgKyBpdGVtLmNpZCk7XG4gICAgaWYgKCF2aWV3KSB7XG4gICAgICB2aWV3ID0gdGhpcy5pbml0SXRlbVZpZXcoaXRlbSk7XG4gICAgICB0aGlzLnN1YnZpZXcoXCJpdGVtVmlldzpcIiArIGl0ZW0uY2lkLCB2aWV3KTtcbiAgICB9XG4gICAgdmlldy5yZW5kZXIoKTtcbiAgICByZXR1cm4gdmlldztcbiAgfTtcblxuICBDb2xsZWN0aW9uVmlldy5wcm90b3R5cGUuaW5pdEl0ZW1WaWV3ID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgICBpZiAodGhpcy5pdGVtVmlldykge1xuICAgICAgcmV0dXJuIG5ldyB0aGlzLml0ZW1WaWV3KHtcbiAgICAgICAgYXV0b1JlbmRlcjogZmFsc2UsXG4gICAgICAgIG1vZGVsOiBtb2RlbFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIENvbGxlY3Rpb25WaWV3I2l0ZW1WaWV3IHByb3BlcnR5ICcgKyAnbXVzdCBiZSBkZWZpbmVkIG9yIHRoZSBpbml0SXRlbVZpZXcoKSBtdXN0IGJlIG92ZXJyaWRkZW4uJyk7XG4gICAgfVxuICB9O1xuXG4gIENvbGxlY3Rpb25WaWV3LnByb3RvdHlwZS5pbnNlcnRWaWV3ID0gZnVuY3Rpb24oaXRlbSwgdmlldywgcG9zaXRpb24sIGVuYWJsZUFuaW1hdGlvbikge1xuICAgIHZhciBlbGVtLCBpbmNsdWRlZCwgbGVuZ3RoLCBsaXN0O1xuICAgIGlmIChlbmFibGVBbmltYXRpb24gPT0gbnVsbCkge1xuICAgICAgZW5hYmxlQW5pbWF0aW9uID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuYW5pbWF0aW9uRHVyYXRpb24gPT09IDApIHtcbiAgICAgIGVuYWJsZUFuaW1hdGlvbiA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHBvc2l0aW9uICE9PSAnbnVtYmVyJykge1xuICAgICAgcG9zaXRpb24gPSB0aGlzLmNvbGxlY3Rpb24uaW5kZXhPZihpdGVtKTtcbiAgICB9XG4gICAgaW5jbHVkZWQgPSB0eXBlb2YgdGhpcy5maWx0ZXJlciA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuZmlsdGVyZXIoaXRlbSwgcG9zaXRpb24pIDogdHJ1ZTtcbiAgICBlbGVtID0gJCA/IHZpZXcuJGVsIDogdmlldy5lbDtcbiAgICBpZiAoaW5jbHVkZWQgJiYgZW5hYmxlQW5pbWF0aW9uKSB7XG4gICAgICBzdGFydEFuaW1hdGlvbihlbGVtLCB0aGlzLnVzZUNzc0FuaW1hdGlvbiwgdGhpcy5hbmltYXRpb25TdGFydENsYXNzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmlsdGVyZXIpIHtcbiAgICAgIHRoaXMuZmlsdGVyQ2FsbGJhY2sodmlldywgaW5jbHVkZWQpO1xuICAgIH1cbiAgICBsZW5ndGggPSB0aGlzLmNvbGxlY3Rpb24ubGVuZ3RoO1xuICAgIGxpc3QgPSAkID8gdGhpcy4kbGlzdCA6IHRoaXMubGlzdDtcbiAgICBpZiAoaW5jbHVkZWQpIHtcbiAgICAgIGluc2VydFZpZXcobGlzdCwgZWxlbSwgcG9zaXRpb24sIGxlbmd0aCwgdGhpcy5pdGVtU2VsZWN0b3IpO1xuICAgICAgdmlldy50cmlnZ2VyKCdhZGRlZFRvUGFyZW50Jyk7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlVmlzaWJsZUl0ZW1zKGl0ZW0sIGluY2x1ZGVkKTtcbiAgICBpZiAoaW5jbHVkZWQgJiYgZW5hYmxlQW5pbWF0aW9uKSB7XG4gICAgICBpZiAodGhpcy51c2VDc3NBbmltYXRpb24pIHtcbiAgICAgICAgc2V0VGltZW91dCgoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gYWRkQ2xhc3MoZWxlbSwgX3RoaXMuYW5pbWF0aW9uRW5kQ2xhc3MpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0pKHRoaXMpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVuZEFuaW1hdGlvbihlbGVtLCB0aGlzLmFuaW1hdGlvbkR1cmF0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZpZXc7XG4gIH07XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLnJlbW92ZVZpZXdGb3JJdGVtID0gZnVuY3Rpb24oaXRlbSkge1xuICAgIHRoaXMudXBkYXRlVmlzaWJsZUl0ZW1zKGl0ZW0sIGZhbHNlKTtcbiAgICByZXR1cm4gdGhpcy5yZW1vdmVTdWJ2aWV3KFwiaXRlbVZpZXc6XCIgKyBpdGVtLmNpZCk7XG4gIH07XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLnVwZGF0ZVZpc2libGVJdGVtcyA9IGZ1bmN0aW9uKGl0ZW0sIGluY2x1ZGVkSW5GaWx0ZXIsIHRyaWdnZXJFdmVudCkge1xuICAgIHZhciBpbmNsdWRlZEluVmlzaWJsZUl0ZW1zLCB2aXNpYmlsaXR5Q2hhbmdlZCwgdmlzaWJsZUl0ZW1zSW5kZXg7XG4gICAgaWYgKHRyaWdnZXJFdmVudCA9PSBudWxsKSB7XG4gICAgICB0cmlnZ2VyRXZlbnQgPSB0cnVlO1xuICAgIH1cbiAgICB2aXNpYmlsaXR5Q2hhbmdlZCA9IGZhbHNlO1xuICAgIHZpc2libGVJdGVtc0luZGV4ID0gdGhpcy52aXNpYmxlSXRlbXMuaW5kZXhPZihpdGVtKTtcbiAgICBpbmNsdWRlZEluVmlzaWJsZUl0ZW1zID0gdmlzaWJsZUl0ZW1zSW5kZXggIT09IC0xO1xuICAgIGlmIChpbmNsdWRlZEluRmlsdGVyICYmICFpbmNsdWRlZEluVmlzaWJsZUl0ZW1zKSB7XG4gICAgICB0aGlzLnZpc2libGVJdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgdmlzaWJpbGl0eUNoYW5nZWQgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoIWluY2x1ZGVkSW5GaWx0ZXIgJiYgaW5jbHVkZWRJblZpc2libGVJdGVtcykge1xuICAgICAgdGhpcy52aXNpYmxlSXRlbXMuc3BsaWNlKHZpc2libGVJdGVtc0luZGV4LCAxKTtcbiAgICAgIHZpc2liaWxpdHlDaGFuZ2VkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHZpc2liaWxpdHlDaGFuZ2VkICYmIHRyaWdnZXJFdmVudCkge1xuICAgICAgdGhpcy50cmlnZ2VyKCd2aXNpYmlsaXR5Q2hhbmdlJywgdGhpcy52aXNpYmxlSXRlbXMpO1xuICAgIH1cbiAgICByZXR1cm4gdmlzaWJpbGl0eUNoYW5nZWQ7XG4gIH07XG5cbiAgQ29sbGVjdGlvblZpZXcucHJvdG90eXBlLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaSwgbGVuLCBwcm9wLCByZWY7XG4gICAgaWYgKHRoaXMuZGlzcG9zZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVmID0gWyckbGlzdCcsICckZmFsbGJhY2snLCAnJGxvYWRpbmcnLCAndmlzaWJsZUl0ZW1zJ107XG4gICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBwcm9wID0gcmVmW2ldO1xuICAgICAgZGVsZXRlIHRoaXNbcHJvcF07XG4gICAgfVxuICAgIHJldHVybiBDb2xsZWN0aW9uVmlldy5fX3N1cGVyX18uZGlzcG9zZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xuXG4gIHJldHVybiBDb2xsZWN0aW9uVmlldztcblxufSkoVmlldyk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pWTI5c2JHVmpkR2x2Ymw5MmFXVjNMbXB6SWl3aWMyOTFjbU5sVW05dmRDSTZJaUlzSW5OdmRYSmpaWE1pT2xzaVkyOXNiR1ZqZEdsdmJsOTJhV1YzTG1OdlptWmxaU0pkTENKdVlXMWxjeUk2VzEwc0ltMWhjSEJwYm1keklqb2lRVUZCUVR0QlFVRkJMRWxCUVVFc01raEJRVUU3UlVGQlFUczdPenRCUVVWQkxGRkJRVUVzUjBGQlZ5eFBRVUZCTEVOQlFWRXNWVUZCVWpzN1FVRkZXQ3hKUVVGQkxFZEJRVThzVDBGQlFTeERRVUZSTEZGQlFWSTdPMEZCUTFBc1MwRkJRU3hIUVVGUkxFOUJRVUVzUTBGQlVTeGpRVUZTT3p0QlFVZFFMRWxCUVVzN08wRkJSVTRzWTBGQlFTeEhRVUZwUWl4VFFVRkRMRkZCUVVRc1JVRkJWeXhSUVVGWU8wRkJRMllzVFVGQlFUdEZRVUZCTEVsQlFVRXNRMEZCZFVJc1VVRkJka0k3UVVGQlFTeFhRVUZQTEZOQlFWQTdPMEZCUTBFN1QwRkJRU3d3UTBGQlFUczdVVUZCTUVJc1MwRkJTeXhEUVVGRExHVkJRVTRzUTBGQmMwSXNTVUZCZEVJc1JVRkJORUlzVVVGQk5VSTdiVUpCUTNoQ096dEJRVVJHT3p0QlFVWmxPenRCUVV0cVFpeGhRVUZCTEVkQlFXMUNMRU5CUVVFc1UwRkJRVHRGUVVOcVFpeEpRVUZITEVOQlFVZzdWMEZEUlN4VFFVRkRMRWxCUVVRc1JVRkJUeXhQUVVGUU8yRkJRVzFDTEVsQlFVa3NRMEZCUXl4TlFVRk1MRU5CUVZrc1QwRkJXanRKUVVGdVFpeEZRVVJHTzBkQlFVRXNUVUZCUVR0WFFVZEZMRk5CUVVNc1NVRkJSQ3hGUVVGUExFOUJRVkE3WVVGRFJTeEpRVUZKTEVOQlFVTXNTMEZCU3l4RFFVRkRMRTlCUVZnc1IwRkJjVUlzUTBGQlNTeFBRVUZJTEVkQlFXZENMRVZCUVdoQ0xFZEJRWGRDTEUxQlFYcENPMGxCUkhaQ0xFVkJTRVk3TzBGQlJHbENMRU5CUVVFc1EwRkJTQ3hEUVVGQk96dEJRVTlvUWl4UlFVRkJMRWRCUVdNc1EwRkJRU3hUUVVGQk8wVkJRMW9zU1VGQlJ5eERRVUZJTzFkQlEwVXNVMEZCUXl4SlFVRkVMRVZCUVU4c1IwRkJVRHRoUVVGbExFbEJRVWtzUTBGQlF5eFJRVUZNTEVOQlFXTXNSMEZCWkR0SlFVRm1MRVZCUkVZN1IwRkJRU3hOUVVGQk8xZEJSMFVzVTBGQlF5eEpRVUZFTEVWQlFVOHNSMEZCVUR0aFFVRmxMRWxCUVVrc1EwRkJReXhUUVVGVExFTkJRVU1zUjBGQlppeERRVUZ0UWl4SFFVRnVRanRKUVVGbUxFVkJTRVk3TzBGQlJGa3NRMEZCUVN4RFFVRklMRU5CUVVFN08wRkJUVmdzWTBGQlFTeEhRVUZ2UWl4RFFVRkJMRk5CUVVFN1JVRkRiRUlzU1VGQlJ5eERRVUZJTzFkQlEwVXNVMEZCUXl4SlFVRkVMRVZCUVU4c1pVRkJVQ3hGUVVGM1FpeEhRVUY0UWp0TlFVTkZMRWxCUVVjc1pVRkJTRHRsUVVORkxGRkJRVUVzUTBGQlV5eEpRVUZVTEVWQlFXVXNSMEZCWml4RlFVUkdPMDlCUVVFc1RVRkJRVHRsUVVkRkxFbEJRVWtzUTBGQlF5eEhRVUZNTEVOQlFWTXNVMEZCVkN4RlFVRnZRaXhEUVVGd1FpeEZRVWhHT3p0SlFVUkdMRVZCUkVZN1IwRkJRU3hOUVVGQk8xZEJUMFVzVTBGQlF5eEpRVUZFTEVWQlFVOHNaVUZCVUN4RlFVRjNRaXhIUVVGNFFqdE5RVU5GTEVsQlFVY3NaVUZCU0R0bFFVTkZMRkZCUVVFc1EwRkJVeXhKUVVGVUxFVkJRV1VzUjBGQlppeEZRVVJHTzA5QlFVRXNUVUZCUVR0bFFVZEZMRWxCUVVrc1EwRkJReXhMUVVGTExFTkJRVU1zVDBGQldDeEhRVUZ4UWl4RlFVaDJRanM3U1VGRVJpeEZRVkJHT3p0QlFVUnJRaXhEUVVGQkxFTkJRVWdzUTBGQlFUczdRVUZqYWtJc1dVRkJRU3hIUVVGclFpeERRVUZCTEZOQlFVRTdSVUZEYUVJc1NVRkJSeXhEUVVGSU8xZEJRMFVzVTBGQlF5eEpRVUZFTEVWQlFVOHNVVUZCVUR0aFFVRnZRaXhKUVVGSkxFTkJRVU1zVDBGQlRDeERRVUZoTzFGQlFVTXNUMEZCUVN4RlFVRlRMRU5CUVZZN1QwRkJZaXhGUVVFeVFpeFJRVUV6UWp0SlFVRndRaXhGUVVSR08wZEJRVUVzVFVGQlFUdFhRVWRGTEZOQlFVTXNTVUZCUkN4RlFVRlBMRkZCUVZBN1RVRkRSU3hKUVVGSkxFTkJRVU1zUzBGQlN5eERRVUZETEZWQlFWZ3NSMEZCZDBJc1ZVRkJRU3hIUVVGWExGRkJRVmdzUjBGQmIwSTdZVUZETlVNc1NVRkJTU3hEUVVGRExFdEJRVXNzUTBGQlF5eFBRVUZZTEVkQlFYRkNPMGxCUm5aQ0xFVkJTRVk3TzBGQlJHZENMRU5CUVVFc1EwRkJTQ3hEUVVGQk96dEJRVkZtTEZWQlFVRXNSMEZCWjBJc1EwRkJRU3hUUVVGQk8wVkJRMlFzU1VGQlJ5eERRVUZJTzFkQlEwVXNVMEZCUXl4SlFVRkVMRVZCUVU4c1RVRkJVQ3hGUVVGbExGRkJRV1lzUlVGQmVVSXNUVUZCZWtJc1JVRkJhVU1zV1VGQmFrTTdRVUZEUlN4VlFVRkJPMDFCUVVFc1kwRkJRU3hIUVVGclFpeERRVUZCTEVOQlFVRXNSMEZCU1N4UlFVRktMRWxCUVVrc1VVRkJTaXhIUVVGbExFMUJRV1k3VFVGRGJFSXNTMEZCUVN4SFFVRlJMRk5CUVVNc1RVRkJSRHRsUVVGWkxFMUJRVUVzUzBGQlZTeERRVUZXTEVsQlFXVXNVVUZCUVN4SlFVRlpPMDFCUVhaRE8wMUJSVklzU1VGQlJ5eGpRVUZCTEVsQlFXdENMRmxCUVhKQ08xRkJSVVVzVVVGQlFTeEhRVUZYTEVsQlFVa3NRMEZCUXl4UlFVRk1MRU5CUVdNc1dVRkJaRHRSUVVOWUxHTkJRVUVzUjBGQmFVSXNVVUZCVVN4RFFVRkRPMUZCUnpGQ0xFbEJRVThzVVVGQlV5eERRVUZCTEZGQlFVRXNRMEZCVkN4TFFVRnpRaXhOUVVFM1FqdFZRVU5GTEVsQlFVY3NTMEZCUVN4RFFVRk5MR05CUVU0c1EwRkJTRHR0UWtGRlJTeEpRVUZKTEVOQlFVTXNUVUZCVEN4RFFVRlpMRTFCUVZvc1JVRkdSanRYUVVGQkxFMUJRVUU3V1VGTFJTeEpRVUZITEZGQlFVRXNTMEZCV1N4RFFVRm1PM0ZDUVVORkxGRkJRVkVzUTBGQlF5eEZRVUZVTEVOQlFWa3NVVUZCV2l4RFFVRnhRaXhEUVVGRExFMUJRWFJDTEVOQlFUWkNMRTFCUVRkQ0xFVkJSRVk3WVVGQlFTeE5RVUZCTzNGQ1FVZEZMRkZCUVZFc1EwRkJReXhGUVVGVUxFTkJRVmtzVVVGQlFTeEhRVUZYTEVOQlFYWkNMRU5CUVhsQ0xFTkJRVU1zUzBGQk1VSXNRMEZCWjBNc1RVRkJhRU1zUlVGSVJqdGhRVXhHTzFkQlJFWTdVMEZPUmp0UFFVRkJMRTFCUVVFN1VVRnBRa1VzVFVGQlFTeEhRVUZaTEV0QlFVRXNRMEZCVFN4TlFVRk9MRU5CUVVnc1IwRkJjVUlzVVVGQmNrSXNSMEZCYlVNN1pVRkROVU1zU1VGQlN5eERRVUZCTEUxQlFVRXNRMEZCVEN4RFFVRmhMRTFCUVdJc1JVRnNRa1k3TzBsQlNrWXNSVUZFUmp0SFFVRkJMRTFCUVVFN1YwRjVRa1VzVTBGQlF5eEpRVUZFTEVWQlFVOHNUVUZCVUN4RlFVRmxMRkZCUVdZc1JVRkJlVUlzVFVGQmVrSXNSVUZCYVVNc1dVRkJha003UVVGRFJTeFZRVUZCTzAxQlFVRXNZMEZCUVN4SFFVRnJRaXhEUVVGQkxFTkJRVUVzUjBGQlNTeFJRVUZLTEVsQlFVa3NVVUZCU2l4SFFVRmxMRTFCUVdZN1RVRkRiRUlzUzBGQlFTeEhRVUZSTEZOQlFVTXNUVUZCUkR0bFFVRlpMRTFCUVVFc1MwRkJWU3hEUVVGV0xFbEJRV1VzVVVGQlFTeExRVUZaTzAxQlFYWkRPMDFCUlZJc1NVRkJSeXhqUVVGQkxFbEJRV3RDTEZsQlFYSkNPMUZCUlVVc1VVRkJRU3hIUVVGWExHTkJRVUVzUTBGQlpTeEpRVUZKTEVOQlFVTXNVVUZCY0VJc1JVRkJPRUlzV1VGQk9VSTdVVUZEV0N4alFVRkJMRWRCUVdsQ0xGRkJRVkVzUTBGQlF6dFJRVWN4UWl4SlFVRlBMRkZCUVZNc1EwRkJRU3hSUVVGQkxFTkJRVlFzUzBGQmMwSXNUVUZCTjBJN1ZVRkRSU3hKUVVGSExFdEJRVUVzUTBGQlRTeGpRVUZPTEVOQlFVZzdiVUpCUlVVc1NVRkJTU3hEUVVGRExGZEJRVXdzUTBGQmFVSXNUVUZCYWtJc1JVRkdSanRYUVVGQkxFMUJSMHNzU1VGQlJ5eFJRVUZCTEV0QlFWa3NRMEZCWmp0dFFrRkZTQ3hKUVVGSkxFTkJRVU1zV1VGQlRDeERRVUZyUWl4TlFVRnNRaXhGUVVFd1FpeFJRVUZUTEVOQlFVRXNVVUZCUVN4RFFVRnVReXhGUVVaSE8xZEJRVUVzVFVGQlFUdFpRVWxJTEVsQlFVRXNSMEZCVHl4UlFVRlRMRU5CUVVFc1VVRkJRU3hIUVVGWExFTkJRVmc3V1VGRGFFSXNTVUZCUnl4SlFVRkpMRU5CUVVNc1UwRkJUQ3hMUVVGclFpeEpRVUZ5UWp0eFFrRkRSU3hKUVVGSkxFTkJRVU1zVjBGQlRDeERRVUZwUWl4TlFVRnFRaXhGUVVSR08yRkJRVUVzVFVGQlFUdHhRa0ZIUlN4SlFVRkpMRU5CUVVNc1dVRkJUQ3hEUVVGclFpeE5RVUZzUWl4RlFVRXdRaXhKUVVGSkxFTkJRVU1zYTBKQlFTOUNMRVZCU0VZN1lVRk1SenRYUVVwUU8xTkJUa1k3VDBGQlFTeE5RVzFDU3l4SlFVRkhMRXRCUVVFc1EwRkJUU3hOUVVGT0xFTkJRVWc3WlVGRFNDeEpRVUZKTEVOQlFVTXNWMEZCVEN4RFFVRnBRaXhOUVVGcVFpeEZRVVJITzA5QlFVRXNUVUZCUVR0bFFVZElMRWxCUVVrc1EwRkJReXhaUVVGTUxFTkJRV3RDTEUxQlFXeENMRVZCUVRCQ0xFbEJRVWtzUTBGQlF5eFZRVUV2UWl4RlFVaEhPenRKUVhaQ1VDeEZRWHBDUmpzN1FVRkVZeXhEUVVGQkxFTkJRVWdzUTBGQlFUczdRVUV3UkdJc1RVRkJUU3hEUVVGRExFOUJRVkFzUjBGQmRVSTdPenN5UWtGUmNrSXNVVUZCUVN4SFFVRlZPenN5UWtGTlZpeFZRVUZCTEVkQlFWazdPekpDUVVOYUxGZEJRVUVzUjBGQllUczdNa0pCVDJJc2FVSkJRVUVzUjBGQmJVSTdPekpDUVV0dVFpeGxRVUZCTEVkQlFXbENPenN5UWtGSGFrSXNiVUpCUVVFc1IwRkJjVUk3T3pKQ1FVTnlRaXhwUWtGQlFTeEhRVUZ0UWpzN01rSkJVVzVDTEZsQlFVRXNSMEZCWXpzN01rSkJSMlFzUzBGQlFTeEhRVUZQT3pzeVFrRkhVQ3huUWtGQlFTeEhRVUZyUWpzN01rSkJSMnhDTEZOQlFVRXNSMEZCVnpzN01rSkJTVmdzWlVGQlFTeEhRVUZwUWpzN01rSkJSMnBDTEZGQlFVRXNSMEZCVlRzN01rSkJTVllzV1VGQlFTeEhRVUZqT3pzeVFrRk5aQ3hSUVVGQkxFZEJRVlU3T3pKQ1FVbFdMR05CUVVFc1IwRkJaMElzVTBGQlF5eEpRVUZFTEVWQlFVOHNVVUZCVUR0SlFVTmtMRWxCUVRSQ0xFTkJRVFZDTzAxQlFVRXNTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJReXhKUVVGVUxFTkJRV01zU1VGQlpDeEZRVUZ2UWl4SlFVRndRaXhGUVVGQk96dFhRVU5CTEdGQlFVRXNRMEZCWXl4RFFVRkpMRU5CUVVnc1IwRkJWU3hKUVVGSkxFTkJRVU1zUjBGQlppeEhRVUYzUWl4SlFVRkpMRU5CUVVNc1JVRkJPVUlzUTBGQlpDeEZRVUZwUkN4UlFVRnFSRHRGUVVaak96c3lRa0ZSYUVJc1dVRkJRU3hIUVVGak96c3lRa0ZMWkN4WFFVRkJMRWRCUVdFc1NVRkJTU3hEUVVGQkxGTkJRVVVzUTBGQlFTeFhRVUZYTEVOQlFVTXNUVUZCYkVJc1EwRkJlVUlzUTBGQlF5eGhRVUZFTEVWQlFXZENMRlZCUVdoQ0xFTkJRWHBDT3p0RlFVVkJMSGRDUVVGRExFOUJRVVE3T3pzN096dEpRVVZZTEVsQlFVTXNRMEZCUVN4WlFVRkVMRWRCUVdkQ08wbEJSV2hDTEdsRVFVRkJMRk5CUVVFN1JVRktWenM3TWtKQlUySXNWVUZCUVN4SFFVRlpMRk5CUVVNc1QwRkJSRHM3VFVGQlF5eFZRVUZWT3p0SlFVbHlRaXhKUVVGRExFTkJRVUVzYzBKQlFVUXNRMEZCUVR0SlFVZEJMRWxCUVRSQ0xIZENRVUUxUWp0aFFVRkJMRWxCUVVNc1EwRkJRU3hOUVVGRUxFTkJRVkVzVDBGQlR5eERRVUZETEZGQlFXaENMRVZCUVVFN08wVkJVRlU3T3pKQ1FWVmFMSE5DUVVGQkxFZEJRWGRDTEZOQlFVRTdTVUZEZEVJc1NVRkJReXhEUVVGQkxGRkJRVVFzUTBGQlZTeEpRVUZETEVOQlFVRXNWVUZCV0N4RlFVRjFRaXhMUVVGMlFpeEZRVUU0UWl4SlFVRkRMRU5CUVVFc1UwRkJMMEk3U1VGRFFTeEpRVUZETEVOQlFVRXNVVUZCUkN4RFFVRlZMRWxCUVVNc1EwRkJRU3hWUVVGWUxFVkJRWFZDTEZGQlFYWkNMRVZCUVdsRExFbEJRVU1zUTBGQlFTeFhRVUZzUXp0WFFVTkJMRWxCUVVNc1EwRkJRU3hSUVVGRUxFTkJRVlVzU1VGQlF5eERRVUZCTEZWQlFWZ3NSVUZCZFVJc1dVRkJka0lzUlVGQmNVTXNTVUZCUXl4RFFVRkJMRlZCUVhSRE8wVkJTSE5DT3pzeVFrRlRlRUlzWlVGQlFTeEhRVUZwUWl4VFFVRkJPMEZCUTJZc1VVRkJRVHRKUVVGQkxGbEJRVUVzUjBGQlpUdE5RVUZETEUxQlFVRXNSVUZCVVN4SlFVRkRMRU5CUVVFc1ZVRkJWU3hEUVVGRExFMUJRWEpDT3p0SlFVZG1MRWxCUVVjc1QwRkJUeXhKUVVGRExFTkJRVUVzVlVGQlZTeERRVUZETEZGQlFXNUNMRXRCUVN0Q0xGVkJRV3hETzAxQlEwVXNXVUZCV1N4RFFVRkRMRTFCUVdJc1IwRkJjMElzU1VGQlF5eERRVUZCTEZWQlFWVXNRMEZCUXl4UlFVRmFMRU5CUVVFc1JVRkVlRUk3TzFkQlIwRTdSVUZRWlRzN01rSkJWMnBDTEcxQ1FVRkJMRWRCUVhGQ0xGTkJRVUVzUjBGQlFUczdNa0pCUjNKQ0xFMUJRVUVzUjBGQlVTeFRRVUZCTzBGQlEwNHNVVUZCUVR0SlFVRkJMRFJEUVVGQkxGTkJRVUU3U1VGSFFTeFpRVUZCTEVkQlFXdENMRTlCUVU4c1NVRkJReXhEUVVGQkxGbEJRVklzUzBGQmQwSXNWVUZCTTBJc1IwRkRZaXhKUVVGRExFTkJRVUVzV1VGQlJDeERRVUZCTEVOQlJHRXNSMEZIWWl4SlFVRkRMRU5CUVVFN1NVRkZTQ3hKUVVGSExFTkJRVWc3VFVGRFJTeEpRVUZETEVOQlFVRXNTMEZCUkN4SFFVRlpMRmxCUVVnc1IwRkJjVUlzU1VGQlF5eERRVUZCTEVsQlFVUXNRMEZCVFN4WlFVRk9MRU5CUVhKQ0xFZEJRVFpETEVsQlFVTXNRMEZCUVN4SlFVUjZSRHRMUVVGQkxFMUJRVUU3VFVGSFJTeEpRVUZETEVOQlFVRXNTVUZCUkN4SFFVRlhMRmxCUVVnc1IwRkJjVUlzU1VGQlF5eERRVUZCTEVsQlFVUXNRMEZCVFN4SlFVRkRMRU5CUVVFc1dVRkJVQ3hEUVVGeVFpeEhRVUU0UXl4SlFVRkRMRU5CUVVFc1IwRklla1E3TzBsQlMwRXNTVUZCUXl4RFFVRkJMRmxCUVVRc1EwRkJRVHRKUVVOQkxFbEJRVU1zUTBGQlFTeHZRa0ZCUkN4RFFVRkJPMGxCUjBFc1NVRkJjVUlzU1VGQlF5eERRVUZCTEZkQlFYUkNPMkZCUVVFc1NVRkJReXhEUVVGQkxHTkJRVVFzUTBGQlFTeEZRVUZCT3p0RlFXeENUVHM3TWtKQmQwSlNMRk5CUVVFc1IwRkJWeXhUUVVGRExFbEJRVVFzUlVGQlR5eFZRVUZRTEVWQlFXMUNMRTlCUVc1Q08xZEJRMVFzU1VGQlF5eERRVUZCTEZWQlFVUXNRMEZCV1N4SlFVRmFMRVZCUVd0Q0xFbEJRVU1zUTBGQlFTeFZRVUZFTEVOQlFWa3NTVUZCV2l4RFFVRnNRaXhGUVVGeFF5eFBRVUZQTEVOQlFVTXNSVUZCTjBNN1JVRkVVenM3TWtKQlNWZ3NWMEZCUVN4SFFVRmhMRk5CUVVNc1NVRkJSRHRYUVVOWUxFbEJRVU1zUTBGQlFTeHBRa0ZCUkN4RFFVRnRRaXhKUVVGdVFqdEZRVVJYT3pzeVFrRkpZaXhWUVVGQkxFZEJRVmtzVTBGQlFUdFhRVU5XTEVsQlFVTXNRMEZCUVN4alFVRkVMRU5CUVVFN1JVRkVWVHM3TWtKQlRWb3NXVUZCUVN4SFFVRmpMRk5CUVVFN1NVRkRXaXhKUVVGQkxFTkJRV01zU1VGQlF5eERRVUZCTEdkQ1FVRm1PMEZCUVVFc1lVRkJRVHM3U1VGSFFTeEpRVUZITEVOQlFVZzdUVUZEUlN4SlFVRkRMRU5CUVVFc1UwRkJSQ3hIUVVGaExFbEJRVU1zUTBGQlFTeEpRVUZFTEVOQlFVMHNTVUZCUXl4RFFVRkJMR2RDUVVGUUxFVkJSR1k3UzBGQlFTeE5RVUZCTzAxQlIwVXNTVUZCUXl4RFFVRkJMRkZCUVVRc1IwRkJXU3hKUVVGRExFTkJRVUVzU1VGQlJDeERRVUZOTEVsQlFVTXNRMEZCUVN4blFrRkJVQ3hGUVVoa096dEpRVTFCTEVsQlFVTXNRMEZCUVN4RlFVRkVMRU5CUVVrc2EwSkJRVW9zUlVGQmQwSXNTVUZCUXl4RFFVRkJMR05CUVhwQ08wbEJSMEVzU1VGQlF5eERRVUZCTEZGQlFVUXNRMEZCVlN4SlFVRkRMRU5CUVVFc1ZVRkJXQ3hGUVVGMVFpeHBRa0ZCZGtJc1JVRkJNRU1zU1VGQlF5eERRVUZCTEdOQlFUTkRPMWRCUjBFc1NVRkJReXhEUVVGQkxHTkJRVVFzUTBGQlFUdEZRV2hDV1RzN01rSkJiVUprTEdOQlFVRXNSMEZCWjBJc1UwRkJRVHRCUVVOa0xGRkJRVUU3U1VGQlFTeFBRVUZCTEVkQlFWVXNTVUZCUXl4RFFVRkJMRmxCUVZrc1EwRkJReXhOUVVGa0xFdEJRWGRDTEVOQlFYaENMRWxCUVRoQ0xFTkJRMjVETEU5QlFVOHNTVUZCUXl4RFFVRkJMRlZCUVZVc1EwRkJReXhSUVVGdVFpeExRVUVyUWl4VlFVRnNReXhIUVVWRkxFbEJRVU1zUTBGQlFTeFZRVUZWTEVOQlFVTXNVVUZCV2l4RFFVRkJMRU5CUmtZc1IwRkxSU3hKUVU1dlF6dFhRVkY0UXl4aFFVRkJMRU5CUVdNc1EwRkJTU3hEUVVGSUxFZEJRVlVzU1VGQlF5eERRVUZCTEZOQlFWZ3NSMEZCTUVJc1NVRkJReXhEUVVGQkxGRkJRVFZDTEVOQlFXUXNSVUZCY1VRc1QwRkJja1E3UlVGVVl6czdNa0pCWTJoQ0xHOUNRVUZCTEVkQlFYTkNMRk5CUVVFN1NVRkhjRUlzU1VGQlFTeERRVUZCTEVOQlFXTXNTVUZCUXl4RFFVRkJMR1ZCUVVRc1NVRkRXaXhQUVVGUExFbEJRVU1zUTBGQlFTeFZRVUZWTEVOQlFVTXNVMEZCYmtJc1MwRkJaME1zVlVGRWJFTXNRMEZCUVR0QlFVRkJMR0ZCUVVFN08wbEJTVUVzU1VGQlJ5eERRVUZJTzAxQlEwVXNTVUZCUXl4RFFVRkJMRkZCUVVRc1IwRkJXU3hKUVVGRExFTkJRVUVzU1VGQlJDeERRVUZOTEVsQlFVTXNRMEZCUVN4bFFVRlFMRVZCUkdRN1MwRkJRU3hOUVVGQk8wMUJSMFVzU1VGQlF5eERRVUZCTEU5QlFVUXNSMEZCVnl4SlFVRkRMRU5CUVVFc1NVRkJSQ3hEUVVGTkxFbEJRVU1zUTBGQlFTeGxRVUZRTEVWQlNHSTdPMGxCVFVFc1NVRkJReXhEUVVGQkxGRkJRVVFzUTBGQlZTeEpRVUZETEVOQlFVRXNWVUZCV0N4RlFVRjFRaXhwUWtGQmRrSXNSVUZCTUVNc1NVRkJReXhEUVVGQkxITkNRVUV6UXp0WFFVZEJMRWxCUVVNc1EwRkJRU3h6UWtGQlJDeERRVUZCTzBWQmFFSnZRanM3TWtKQmEwSjBRaXh6UWtGQlFTeEhRVUYzUWl4VFFVRkJPMEZCVFhSQ0xGRkJRVUU3U1VGQlFTeFBRVUZCTEVkQlFWVXNTVUZCUXl4RFFVRkJMRlZCUVZVc1EwRkJReXhOUVVGYUxFdEJRWE5DTEVOQlFYUkNMRWxCUVRSQ0xFbEJRVU1zUTBGQlFTeFZRVUZWTEVOQlFVTXNVMEZCV2l4RFFVRkJPMWRCUTNSRExHRkJRVUVzUTBGQll5eERRVUZKTEVOQlFVZ3NSMEZCVlN4SlFVRkRMRU5CUVVFc1VVRkJXQ3hIUVVGNVFpeEpRVUZETEVOQlFVRXNUMEZCTTBJc1EwRkJaQ3hGUVVGdFJDeFBRVUZ1UkR0RlFWQnpRanM3TWtKQllYaENMRmxCUVVFc1IwRkJZeXhUUVVGQk8wRkJRMW9zVVVGQlFUdEpRVUZCTEZOQlFVRXNSMEZCV1R0QlFVTmFPMEZCUVVFc1UwRkJRU3h4UTBGQlFUczdUVUZEUlN4SlFVRkJMRU5CUVU4c1IwRkJSeXhEUVVGRExFOUJRVW9zUTBGQldTeFhRVUZhTEVOQlFWQTdVVUZEUlN4VFFVRlZMRU5CUVVFc1IwRkJSeXhEUVVGRExFdEJRVW9zUTBGQlZTeERRVUZXTEVOQlFVRXNRMEZCVml4SFFVRjVRaXhKUVVGRExFTkJRVUVzWTBGQlpTeERRVUZCTEVkQlFVRXNSVUZFTTBNN08wRkJSRVk3VjBGSFFUdEZRVXhaT3pzeVFrRlpaQ3hOUVVGQkxFZEJRVkVzVTBGQlF5eFJRVUZFTEVWQlFWY3NZMEZCV0R0QlFVVk9MRkZCUVVFN1NVRkJRU3hKUVVGSExFOUJRVThzVVVGQlVDeExRVUZ0UWl4VlFVRnVRaXhKUVVGcFF5eFJRVUZCTEV0QlFWa3NTVUZCYUVRN1RVRkRSU3hKUVVGRExFTkJRVUVzVVVGQlJDeEhRVUZaTEZOQlJHUTdPMGxCUlVFc1NVRkJSeXhQUVVGUExHTkJRVkFzUzBGQmVVSXNWVUZCZWtJc1NVRkJkVU1zWTBGQlFTeExRVUZyUWl4SlFVRTFSRHROUVVORkxFbEJRVU1zUTBGQlFTeGpRVUZFTEVkQlFXdENMR1ZCUkhCQ096dEpRVWRCTEZsQlFVRXNSMEZCWlN4TlFVTmlMRU5CUVVNc1NVRkVXU3hEUVVOUUxFbEJRVU1zUTBGQlFTeGpRVVJOTEVOQlJXSXNRMEZCUXl4SlFVWlpMRU5CUlZBc1UwRkJReXhIUVVGRU8yRkJRVk1zUTBGQlFTeExRVUZMTEVkQlFVY3NRMEZCUXl4UFFVRktMRU5CUVZrc1YwRkJXanRKUVVGa0xFTkJSazg3U1VGTFppeEpRVUZITEZsQlFVZzdRVUZEUlR0QlFVRkJMRmRCUVVFc2NVUkJRVUU3TzFGQlIwVXNVVUZCUVN4SFFVRmpMRTlCUVU4c1NVRkJReXhEUVVGQkxGRkJRVklzUzBGQmIwSXNWVUZCZGtJc1IwRkRWQ3hKUVVGRExFTkJRVUVzVVVGQlJDeERRVUZWTEVsQlFWWXNSVUZCWjBJc1MwRkJhRUlzUTBGRVV5eEhRVWRVTzFGQlIwWXNTVUZCUVN4SFFVRlBMRWxCUVVNc1EwRkJRU3hQUVVGRUxFTkJRVk1zVjBGQlFTeEhRVUZaTEVsQlFVa3NRMEZCUXl4SFFVRXhRanRSUVVWUUxFbEJRVUVzUTBGQlR5eEpRVUZRTzBGQlEwVXNaMEpCUVUwc1NVRkJTU3hMUVVGS0xFTkJRVlVzZVVKQlFVRXNSMEZEWkN4RFFVRkJMRzlDUVVGQkxFZEJRWEZDTEVsQlFVa3NRMEZCUXl4SFFVRXhRaXhEUVVSSkxFVkJSRkk3TzFGQlMwRXNTVUZCUXl4RFFVRkJMR05CUVVRc1EwRkJaMElzU1VGQmFFSXNSVUZCYzBJc1VVRkJkRUk3VVVGSFFTeEpRVUZETEVOQlFVRXNhMEpCUVVRc1EwRkJiMElzU1VGQlNTeERRVUZETEV0QlFYcENMRVZCUVdkRExGRkJRV2hETEVWQlFUQkRMRXRCUVRGRE8wRkJia0pHTEU5QlJFWTdPMWRCZFVKQkxFbEJRVU1zUTBGQlFTeFBRVUZFTEVOQlFWTXNhMEpCUVZRc1JVRkJOa0lzU1VGQlF5eERRVUZCTEZsQlFUbENPMFZCYmtOTk96c3lRa0Y1UTFJc1kwRkJRU3hIUVVGblFpeFRRVUZCTzBGQlEyUXNVVUZCUVR0SlFVRkJMRXRCUVVFc1IwRkJVU3hKUVVGRExFTkJRVUVzVlVGQlZTeERRVUZETzBsQlIzQkNMRWxCUVVNc1EwRkJRU3haUVVGWkxFTkJRVU1zVFVGQlpDeEhRVUYxUWp0SlFVZDJRaXh0UWtGQlFTeEhRVUZ6UWp0QlFVTjBRaXhUUVVGQkxIVkRRVUZCT3p0TlFVTkZMRWxCUVVFc1IwRkJUeXhKUVVGRExFTkJRVUVzVDBGQlJDeERRVUZUTEZkQlFVRXNSMEZCV1N4SlFVRkpMRU5CUVVNc1IwRkJNVUk3VFVGRFVDeEpRVUZITEVsQlFVZzdVVUZGUlN4dFFrRkJiMElzUTBGQlFTeEpRVUZKTEVOQlFVTXNSMEZCVEN4RFFVRndRaXhIUVVGblF5eExRVVpzUXpzN1FVRkdSanRCUVU5Qk8wRkJRVUVzVTBGQlFTeDFRMEZCUVRzN1RVRkRSU3hKUVVGQkxFTkJRVUVzUTBGQlR5eEhRVUZCTEVsQlFVOHNiVUpCUVdRc1EwRkJRVHRSUVVWRkxFbEJRVU1zUTBGQlFTeGhRVUZFTEVOQlFXVXNWMEZCUVN4SFFVRlpMRWRCUVROQ0xFVkJSa1k3TzBGQlJFWTdRVUZOUVN4VFFVRkJMSGxFUVVGQk96dE5RVVZGTEVsQlFVRXNSMEZCVHl4SlFVRkRMRU5CUVVFc1QwRkJSQ3hEUVVGVExGZEJRVUVzUjBGQldTeEpRVUZKTEVOQlFVTXNSMEZCTVVJN1RVRkRVQ3hKUVVGSExFbEJRVWc3VVVGRlJTeEpRVUZETEVOQlFVRXNWVUZCUkN4RFFVRlpMRWxCUVZvc1JVRkJhMElzU1VGQmJFSXNSVUZCZDBJc1MwRkJlRUlzUlVGQkswSXNTMEZCTDBJc1JVRkdSanRQUVVGQkxFMUJRVUU3VVVGTFJTeEpRVUZETEVOQlFVRXNWVUZCUkN4RFFVRlpMRWxCUVZvc1JVRkJhMElzU1VGQlF5eERRVUZCTEZWQlFVUXNRMEZCV1N4SlFVRmFMRU5CUVd4Q0xFVkJRWEZETEV0QlFYSkRMRVZCVEVZN08wRkJTRVk3U1VGWFFTeEpRVUU0UXl4TFFVRkxMRU5CUVVNc1RVRkJUaXhMUVVGblFpeERRVUU1UkR0aFFVRkJMRWxCUVVNc1EwRkJRU3hQUVVGRUxFTkJRVk1zYTBKQlFWUXNSVUZCTmtJc1NVRkJReXhEUVVGQkxGbEJRVGxDTEVWQlFVRTdPMFZCYUVOak96c3lRa0Z0UTJoQ0xGVkJRVUVzUjBGQldTeFRRVUZETEVsQlFVUTdRVUZGVml4UlFVRkJPMGxCUVVFc1NVRkJRU3hIUVVGUExFbEJRVU1zUTBGQlFTeFBRVUZFTEVOQlFWTXNWMEZCUVN4SFFVRlpMRWxCUVVrc1EwRkJReXhIUVVFeFFqdEpRVWRRTEVsQlFVRXNRMEZCVHl4SlFVRlFPMDFCUTBVc1NVRkJRU3hIUVVGUExFbEJRVU1zUTBGQlFTeFpRVUZFTEVOQlFXTXNTVUZCWkR0TlFVVlFMRWxCUVVNc1EwRkJRU3hQUVVGRUxFTkJRVk1zVjBGQlFTeEhRVUZaTEVsQlFVa3NRMEZCUXl4SFFVRXhRaXhGUVVGcFF5eEpRVUZxUXl4RlFVaEdPenRKUVUxQkxFbEJRVWtzUTBGQlF5eE5RVUZNTEVOQlFVRTdWMEZGUVR0RlFXSlZPenN5UWtGclFsb3NXVUZCUVN4SFFVRmpMRk5CUVVNc1MwRkJSRHRKUVVOYUxFbEJRVWNzU1VGQlF5eERRVUZCTEZGQlFVbzdZVUZEUlN4SlFVRkpMRWxCUVVNc1EwRkJRU3hSUVVGTUxFTkJRV003VVVGQlF5eFZRVUZCTEVWQlFWa3NTMEZCWWp0UlFVRnZRaXhQUVVGQkxFdEJRWEJDTzA5QlFXUXNSVUZFUmp0TFFVRkJMRTFCUVVFN1FVRkhSU3haUVVGTkxFbEJRVWtzUzBGQlNpeERRVUZWTEhWRFFVRkJMRWRCUTJRc01rUkJSRWtzUlVGSVVqczdSVUZFV1RzN01rSkJVV1FzVlVGQlFTeEhRVUZaTEZOQlFVTXNTVUZCUkN4RlFVRlBMRWxCUVZBc1JVRkJZU3hSUVVGaUxFVkJRWFZDTEdWQlFYWkNPMEZCUTFZc1VVRkJRVHM3VFVGRWFVTXNhMEpCUVd0Q096dEpRVU51UkN4SlFVRXlRaXhKUVVGRExFTkJRVUVzYVVKQlFVUXNTMEZCYzBJc1EwRkJha1E3VFVGQlFTeGxRVUZCTEVkQlFXdENMRTFCUVd4Q096dEpRVWRCTEVsQlFVOHNUMEZCVHl4UlFVRlFMRXRCUVcxQ0xGRkJRVEZDTzAxQlEwVXNVVUZCUVN4SFFVRlhMRWxCUVVNc1EwRkJRU3hWUVVGVkxFTkJRVU1zVDBGQldpeERRVUZ2UWl4SlFVRndRaXhGUVVSaU96dEpRVWxCTEZGQlFVRXNSMEZCWXl4UFFVRlBMRWxCUVVNc1EwRkJRU3hSUVVGU0xFdEJRVzlDTEZWQlFYWkNMRWRCUTFRc1NVRkJReXhEUVVGQkxGRkJRVVFzUTBGQlZTeEpRVUZXTEVWQlFXZENMRkZCUVdoQ0xFTkJSRk1zUjBGSFZEdEpRVWRHTEVsQlFVRXNSMEZCVlN4RFFVRklMRWRCUVZVc1NVRkJTU3hEUVVGRExFZEJRV1lzUjBGQmQwSXNTVUZCU1N4RFFVRkRPMGxCUjNCRExFbEJRVWNzVVVGQlFTeEpRVUZoTEdWQlFXaENPMDFCUTBVc1kwRkJRU3hEUVVGbExFbEJRV1lzUlVGQmNVSXNTVUZCUXl4RFFVRkJMR1ZCUVhSQ0xFVkJRWFZETEVsQlFVTXNRMEZCUVN4dFFrRkJlRU1zUlVGRVJqczdTVUZKUVN4SlFVRnJReXhKUVVGRExFTkJRVUVzVVVGQmJrTTdUVUZCUVN4SlFVRkRMRU5CUVVFc1kwRkJSQ3hEUVVGblFpeEpRVUZvUWl4RlFVRnpRaXhSUVVGMFFpeEZRVUZCT3p0SlFVVkJMRTFCUVVFc1IwRkJVeXhKUVVGRExFTkJRVUVzVlVGQlZTeERRVUZETzBsQlIzSkNMRWxCUVVFc1IwRkJWU3hEUVVGSUxFZEJRVlVzU1VGQlF5eERRVUZCTEV0QlFWZ3NSMEZCYzBJc1NVRkJReXhEUVVGQk8wbEJSVGxDTEVsQlFVY3NVVUZCU0R0TlFVTkZMRlZCUVVFc1EwRkJWeXhKUVVGWUxFVkJRV2xDTEVsQlFXcENMRVZCUVhWQ0xGRkJRWFpDTEVWQlFXbERMRTFCUVdwRExFVkJRWGxETEVsQlFVTXNRMEZCUVN4WlFVRXhRenROUVVkQkxFbEJRVWtzUTBGQlF5eFBRVUZNTEVOQlFXRXNaVUZCWWl4RlFVcEdPenRKUVU5QkxFbEJRVU1zUTBGQlFTeHJRa0ZCUkN4RFFVRnZRaXhKUVVGd1FpeEZRVUV3UWl4UlFVRXhRanRKUVVkQkxFbEJRVWNzVVVGQlFTeEpRVUZoTEdWQlFXaENPMDFCUTBVc1NVRkJSeXhKUVVGRExFTkJRVUVzWlVGQlNqdFJRVVZGTEZWQlFVRXNRMEZCVnl4RFFVRkJMRk5CUVVFc1MwRkJRVHRwUWtGQlFTeFRRVUZCTzIxQ1FVRkhMRkZCUVVFc1EwRkJVeXhKUVVGVUxFVkJRV1VzUzBGQlF5eERRVUZCTEdsQ1FVRm9RanRWUVVGSU8xRkJRVUVzUTBGQlFTeERRVUZCTEVOQlFVRXNTVUZCUVN4RFFVRllMRVZCUmtZN1QwRkJRU3hOUVVGQk8xRkJTMFVzV1VGQlFTeERRVUZoTEVsQlFXSXNSVUZCYlVJc1NVRkJReXhEUVVGQkxHbENRVUZ3UWl4RlFVeEdPMDlCUkVZN08xZEJVVUU3UlVFNVExVTdPekpDUVdsRVdpeHBRa0ZCUVN4SFFVRnRRaXhUUVVGRExFbEJRVVE3U1VGRmFrSXNTVUZCUXl4RFFVRkJMR3RDUVVGRUxFTkJRVzlDTEVsQlFYQkNMRVZCUVRCQ0xFdEJRVEZDTzFkQlEwRXNTVUZCUXl4RFFVRkJMR0ZCUVVRc1EwRkJaU3hYUVVGQkxFZEJRVmtzU1VGQlNTeERRVUZETEVkQlFXaERPMFZCU0dsQ096c3lRa0ZWYmtJc2EwSkJRVUVzUjBGQmIwSXNVMEZCUXl4SlFVRkVMRVZCUVU4c1owSkJRVkFzUlVGQmVVSXNXVUZCZWtJN1FVRkRiRUlzVVVGQlFUczdUVUZFTWtNc1pVRkJaVHM3U1VGRE1VUXNhVUpCUVVFc1IwRkJiMEk3U1VGRmNFSXNhVUpCUVVFc1IwRkJiMElzU1VGQlF5eERRVUZCTEZsQlFWa3NRMEZCUXl4UFFVRmtMRU5CUVhOQ0xFbEJRWFJDTzBsQlEzQkNMSE5DUVVGQkxFZEJRWGxDTEdsQ1FVRkJMRXRCUVhWQ0xFTkJRVU03U1VGRmFrUXNTVUZCUnl4blFrRkJRU3hKUVVGeFFpeERRVUZKTEhOQ1FVRTFRanROUVVWRkxFbEJRVU1zUTBGQlFTeFpRVUZaTEVOQlFVTXNTVUZCWkN4RFFVRnRRaXhKUVVGdVFqdE5RVU5CTEdsQ1FVRkJMRWRCUVc5Q0xFdEJTSFJDTzB0QlFVRXNUVUZKU3l4SlFVRkhMRU5CUVVrc1owSkJRVW9zU1VGQmVVSXNjMEpCUVRWQ08wMUJSVWdzU1VGQlF5eERRVUZCTEZsQlFWa3NRMEZCUXl4TlFVRmtMRU5CUVhGQ0xHbENRVUZ5UWl4RlFVRjNReXhEUVVGNFF6dE5RVU5CTEdsQ1FVRkJMRWRCUVc5Q0xFdEJTR3BDT3p0SlFVMU1MRWxCUVVjc2FVSkJRVUVzU1VGQmMwSXNXVUZCZWtJN1RVRkRSU3hKUVVGRExFTkJRVUVzVDBGQlJDeERRVUZUTEd0Q1FVRlVMRVZCUVRaQ0xFbEJRVU1zUTBGQlFTeFpRVUU1UWl4RlFVUkdPenRYUVVkQk8wVkJia0pyUWpzN01rSkJkMEp3UWl4UFFVRkJMRWRCUVZNc1UwRkJRVHRCUVVOUUxGRkJRVUU3U1VGQlFTeEpRVUZWTEVsQlFVTXNRMEZCUVN4UlFVRllPMEZCUVVFc1lVRkJRVHM3UVVGSFFUdEJRVUZCTEZOQlFVRXNjVU5CUVVFN08wMUJRVUVzVDBGQlR5eEpRVUZMTEVOQlFVRXNTVUZCUVR0QlFVRmFPMWRCVFVFc05rTkJRVUVzVTBGQlFUdEZRVlpQT3pzN08wZEJlbUZ0UXlKOVxuIiwiJ3VzZSBzdHJpY3QnO1xudmFyICQsIEJhY2tib25lLCBFdmVudEJyb2tlciwgTGF5b3V0LCBWaWV3LCBfLCBtZWRpYXRvciwgdXRpbHMsXG4gIGJpbmQgPSBmdW5jdGlvbihmbiwgbWUpeyByZXR1cm4gZnVuY3Rpb24oKXsgcmV0dXJuIGZuLmFwcGx5KG1lLCBhcmd1bWVudHMpOyB9OyB9LFxuICBleHRlbmQgPSBmdW5jdGlvbihjaGlsZCwgcGFyZW50KSB7IGZvciAodmFyIGtleSBpbiBwYXJlbnQpIHsgaWYgKGhhc1Byb3AuY2FsbChwYXJlbnQsIGtleSkpIGNoaWxkW2tleV0gPSBwYXJlbnRba2V5XTsgfSBmdW5jdGlvbiBjdG9yKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7IH0gY3Rvci5wcm90b3R5cGUgPSBwYXJlbnQucHJvdG90eXBlOyBjaGlsZC5wcm90b3R5cGUgPSBuZXcgY3RvcigpOyBjaGlsZC5fX3N1cGVyX18gPSBwYXJlbnQucHJvdG90eXBlOyByZXR1cm4gY2hpbGQ7IH0sXG4gIGhhc1Byb3AgPSB7fS5oYXNPd25Qcm9wZXJ0eTtcblxuXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG5WaWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG5cbkV2ZW50QnJva2VyID0gcmVxdWlyZSgnLi4vbGliL2V2ZW50X2Jyb2tlcicpO1xuXG51dGlscyA9IHJlcXVpcmUoJy4uL2xpYi91dGlscycpO1xuXG5tZWRpYXRvciA9IHJlcXVpcmUoJy4uL21lZGlhdG9yJyk7XG5cbiQgPSBCYWNrYm9uZS4kO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dCA9IChmdW5jdGlvbihzdXBlckNsYXNzKSB7XG4gIGV4dGVuZChMYXlvdXQsIHN1cGVyQ2xhc3MpO1xuXG4gIExheW91dC5wcm90b3R5cGUuZWwgPSAnYm9keSc7XG5cbiAgTGF5b3V0LnByb3RvdHlwZS5rZWVwRWxlbWVudCA9IHRydWU7XG5cbiAgTGF5b3V0LnByb3RvdHlwZS50aXRsZSA9ICcnO1xuXG4gIExheW91dC5wcm90b3R5cGUuZ2xvYmFsUmVnaW9ucyA9IG51bGw7XG5cbiAgTGF5b3V0LnByb3RvdHlwZS5saXN0ZW4gPSB7XG4gICAgJ2JlZm9yZUNvbnRyb2xsZXJEaXNwb3NlIG1lZGlhdG9yJzogJ3Njcm9sbCdcbiAgfTtcblxuICBmdW5jdGlvbiBMYXlvdXQob3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zID09IG51bGwpIHtcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgdGhpcy5vcGVuTGluayA9IGJpbmQodGhpcy5vcGVuTGluaywgdGhpcyk7XG4gICAgdGhpcy5nbG9iYWxSZWdpb25zID0gW107XG4gICAgdGhpcy50aXRsZSA9IG9wdGlvbnMudGl0bGU7XG4gICAgaWYgKG9wdGlvbnMucmVnaW9ucykge1xuICAgICAgdGhpcy5yZWdpb25zID0gb3B0aW9ucy5yZWdpb25zO1xuICAgIH1cbiAgICB0aGlzLnNldHRpbmdzID0gXy5kZWZhdWx0cyhvcHRpb25zLCB7XG4gICAgICB0aXRsZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHZhciBzdDtcbiAgICAgICAgc3QgPSBkYXRhLnN1YnRpdGxlID8gZGF0YS5zdWJ0aXRsZSArIFwiIFxcdTIwMTMgXCIgOiAnJztcbiAgICAgICAgcmV0dXJuIHN0ICsgZGF0YS50aXRsZTtcbiAgICAgIH0sXG4gICAgICBvcGVuRXh0ZXJuYWxUb0JsYW5rOiBmYWxzZSxcbiAgICAgIHJvdXRlTGlua3M6ICdhLCAuZ28tdG8nLFxuICAgICAgc2tpcFJvdXRpbmc6ICcubm9zY3JpcHQnLFxuICAgICAgc2Nyb2xsVG86IFswLCAwXVxuICAgIH0pO1xuICAgIG1lZGlhdG9yLnNldEhhbmRsZXIoJ3JlZ2lvbjpzaG93JywgdGhpcy5zaG93UmVnaW9uLCB0aGlzKTtcbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyKCdyZWdpb246cmVnaXN0ZXInLCB0aGlzLnJlZ2lzdGVyUmVnaW9uSGFuZGxlciwgdGhpcyk7XG4gICAgbWVkaWF0b3Iuc2V0SGFuZGxlcigncmVnaW9uOnVucmVnaXN0ZXInLCB0aGlzLnVucmVnaXN0ZXJSZWdpb25IYW5kbGVyLCB0aGlzKTtcbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyKCdyZWdpb246ZmluZCcsIHRoaXMucmVnaW9uQnlOYW1lLCB0aGlzKTtcbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyKCdhZGp1c3RUaXRsZScsIHRoaXMuYWRqdXN0VGl0bGUsIHRoaXMpO1xuICAgIExheW91dC5fX3N1cGVyX18uY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5yb3V0ZUxpbmtzKSB7XG4gICAgICB0aGlzLnN0YXJ0TGlua1JvdXRpbmcoKTtcbiAgICB9XG4gIH1cblxuICBMYXlvdXQucHJvdG90eXBlLnNjcm9sbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0bywgeCwgeTtcbiAgICB0byA9IHRoaXMuc2V0dGluZ3Muc2Nyb2xsVG87XG4gICAgaWYgKHRvICYmIHR5cGVvZiB0byA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHggPSB0b1swXSwgeSA9IHRvWzFdO1xuICAgICAgcmV0dXJuIHdpbmRvdy5zY3JvbGxUbyh4LCB5KTtcbiAgICB9XG4gIH07XG5cbiAgTGF5b3V0LnByb3RvdHlwZS5hZGp1c3RUaXRsZSA9IGZ1bmN0aW9uKHN1YnRpdGxlKSB7XG4gICAgdmFyIHRpdGxlO1xuICAgIGlmIChzdWJ0aXRsZSA9PSBudWxsKSB7XG4gICAgICBzdWJ0aXRsZSA9ICcnO1xuICAgIH1cbiAgICB0aXRsZSA9IHRoaXMuc2V0dGluZ3MudGl0bGVUZW1wbGF0ZSh7XG4gICAgICB0aXRsZTogdGhpcy50aXRsZSxcbiAgICAgIHN1YnRpdGxlOiBzdWJ0aXRsZVxuICAgIH0pO1xuICAgIGRvY3VtZW50LnRpdGxlID0gdGl0bGU7XG4gICAgdGhpcy5wdWJsaXNoRXZlbnQoJ2FkanVzdFRpdGxlJywgc3VidGl0bGUsIHRpdGxlKTtcbiAgICByZXR1cm4gdGl0bGU7XG4gIH07XG5cbiAgTGF5b3V0LnByb3RvdHlwZS5zdGFydExpbmtSb3V0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJvdXRlO1xuICAgIHJvdXRlID0gdGhpcy5zZXR0aW5ncy5yb3V0ZUxpbmtzO1xuICAgIGlmIChyb3V0ZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUoJ2NsaWNrJywgcm91dGUsIHRoaXMub3BlbkxpbmspO1xuICAgIH1cbiAgfTtcblxuICBMYXlvdXQucHJvdG90eXBlLnN0b3BMaW5rUm91dGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByb3V0ZTtcbiAgICByb3V0ZSA9IHRoaXMuc2V0dGluZ3Mucm91dGVMaW5rcztcbiAgICBpZiAocm91dGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnVuZGVsZWdhdGUoJ2NsaWNrJywgcm91dGUpO1xuICAgIH1cbiAgfTtcblxuICBMYXlvdXQucHJvdG90eXBlLmlzRXh0ZXJuYWxMaW5rID0gZnVuY3Rpb24obGluaykge1xuICAgIHZhciBob3N0LCBwcm90b2NvbCwgdGFyZ2V0O1xuICAgIGlmICghdXRpbHMubWF0Y2hlc1NlbGVjdG9yKGxpbmssICdhLCBhcmVhJykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGxpbmsuaGFzQXR0cmlidXRlKCdkb3dubG9hZCcpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCFsaW5rLmhvc3QpIHtcbiAgICAgIGxpbmsuaHJlZiArPSAnJztcbiAgICB9XG4gICAgcHJvdG9jb2wgPSBsb2NhdGlvbi5wcm90b2NvbCwgaG9zdCA9IGxvY2F0aW9uLmhvc3Q7XG4gICAgdGFyZ2V0ID0gbGluay50YXJnZXQ7XG4gICAgcmV0dXJuIHRhcmdldCA9PT0gJ19ibGFuaycgfHwgbGluay5yZWwgPT09ICdleHRlcm5hbCcgfHwgbGluay5wcm90b2NvbCAhPT0gcHJvdG9jb2wgfHwgbGluay5ob3N0ICE9PSBob3N0IHx8ICh0YXJnZXQgPT09ICdfcGFyZW50JyAmJiBwYXJlbnQgIT09IHNlbGYpIHx8ICh0YXJnZXQgPT09ICdfdG9wJyAmJiB0b3AgIT09IHNlbGYpO1xuICB9O1xuXG4gIExheW91dC5wcm90b3R5cGUub3BlbkxpbmsgPSBmdW5jdGlvbihldmVudCkge1xuICAgIHZhciBlbCwgaHJlZiwgc2tpcFJvdXRpbmc7XG4gICAgaWYgKHV0aWxzLm1vZGlmaWVyS2V5UHJlc3NlZChldmVudCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZWwgPSAkID8gZXZlbnQuY3VycmVudFRhcmdldCA6IGV2ZW50LmRlbGVnYXRlVGFyZ2V0O1xuICAgIGhyZWYgPSBlbC5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSB8fCBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaHJlZicpO1xuICAgIGlmICghaHJlZiB8fCBocmVmWzBdID09PSAnIycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2tpcFJvdXRpbmcgPSB0aGlzLnNldHRpbmdzLnNraXBSb3V0aW5nO1xuICAgIHN3aXRjaCAodHlwZW9mIHNraXBSb3V0aW5nKSB7XG4gICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgIGlmICghc2tpcFJvdXRpbmcoaHJlZiwgZWwpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgaWYgKHV0aWxzLm1hdGNoZXNTZWxlY3RvcihlbCwgc2tpcFJvdXRpbmcpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLmlzRXh0ZXJuYWxMaW5rKGVsKSkge1xuICAgICAgaWYgKHRoaXMuc2V0dGluZ3Mub3BlbkV4dGVybmFsVG9CbGFuaykge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLm9wZW5XaW5kb3coaHJlZik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHV0aWxzLnJlZGlyZWN0VG8oe1xuICAgICAgdXJsOiBocmVmXG4gICAgfSk7XG4gICAgcmV0dXJuIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIH07XG5cbiAgTGF5b3V0LnByb3RvdHlwZS5vcGVuV2luZG93ID0gZnVuY3Rpb24oaHJlZikge1xuICAgIHJldHVybiB3aW5kb3cub3BlbihocmVmKTtcbiAgfTtcblxuICBMYXlvdXQucHJvdG90eXBlLnJlZ2lzdGVyUmVnaW9uSGFuZGxlciA9IGZ1bmN0aW9uKGluc3RhbmNlLCBuYW1lLCBzZWxlY3Rvcikge1xuICAgIGlmIChuYW1lICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlZ2lzdGVyR2xvYmFsUmVnaW9uKGluc3RhbmNlLCBuYW1lLCBzZWxlY3Rvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnJlZ2lzdGVyR2xvYmFsUmVnaW9ucyhpbnN0YW5jZSk7XG4gICAgfVxuICB9O1xuXG4gIExheW91dC5wcm90b3R5cGUucmVnaXN0ZXJHbG9iYWxSZWdpb24gPSBmdW5jdGlvbihpbnN0YW5jZSwgbmFtZSwgc2VsZWN0b3IpIHtcbiAgICB0aGlzLnVucmVnaXN0ZXJHbG9iYWxSZWdpb24oaW5zdGFuY2UsIG5hbWUpO1xuICAgIHJldHVybiB0aGlzLmdsb2JhbFJlZ2lvbnMudW5zaGlmdCh7XG4gICAgICBpbnN0YW5jZTogaW5zdGFuY2UsXG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgc2VsZWN0b3I6IHNlbGVjdG9yXG4gICAgfSk7XG4gIH07XG5cbiAgTGF5b3V0LnByb3RvdHlwZS5yZWdpc3Rlckdsb2JhbFJlZ2lvbnMgPSBmdW5jdGlvbihpbnN0YW5jZSkge1xuICAgIHZhciBpLCBsZW4sIG5hbWUsIHJlZiwgc2VsZWN0b3IsIHZlcnNpb247XG4gICAgcmVmID0gdXRpbHMuZ2V0QWxsUHJvcGVydHlWZXJzaW9ucyhpbnN0YW5jZSwgJ3JlZ2lvbnMnKTtcbiAgICBmb3IgKGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZlcnNpb24gPSByZWZbaV07XG4gICAgICBmb3IgKG5hbWUgaW4gdmVyc2lvbikge1xuICAgICAgICBzZWxlY3RvciA9IHZlcnNpb25bbmFtZV07XG4gICAgICAgIHRoaXMucmVnaXN0ZXJHbG9iYWxSZWdpb24oaW5zdGFuY2UsIG5hbWUsIHNlbGVjdG9yKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgTGF5b3V0LnByb3RvdHlwZS51bnJlZ2lzdGVyUmVnaW9uSGFuZGxlciA9IGZ1bmN0aW9uKGluc3RhbmNlLCBuYW1lKSB7XG4gICAgaWYgKG5hbWUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMudW5yZWdpc3Rlckdsb2JhbFJlZ2lvbihpbnN0YW5jZSwgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnVucmVnaXN0ZXJHbG9iYWxSZWdpb25zKGluc3RhbmNlKTtcbiAgICB9XG4gIH07XG5cbiAgTGF5b3V0LnByb3RvdHlwZS51bnJlZ2lzdGVyR2xvYmFsUmVnaW9uID0gZnVuY3Rpb24oaW5zdGFuY2UsIG5hbWUpIHtcbiAgICB2YXIgY2lkLCByZWdpb247XG4gICAgY2lkID0gaW5zdGFuY2UuY2lkO1xuICAgIHJldHVybiB0aGlzLmdsb2JhbFJlZ2lvbnMgPSAoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaSwgbGVuLCByZWYsIHJlc3VsdHM7XG4gICAgICByZWYgPSB0aGlzLmdsb2JhbFJlZ2lvbnM7XG4gICAgICByZXN1bHRzID0gW107XG4gICAgICBmb3IgKGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgcmVnaW9uID0gcmVmW2ldO1xuICAgICAgICBpZiAocmVnaW9uLmluc3RhbmNlLmNpZCAhPT0gY2lkIHx8IHJlZ2lvbi5uYW1lICE9PSBuYW1lKSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHJlZ2lvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH0pLmNhbGwodGhpcyk7XG4gIH07XG5cbiAgTGF5b3V0LnByb3RvdHlwZS51bnJlZ2lzdGVyR2xvYmFsUmVnaW9ucyA9IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gICAgdmFyIHJlZ2lvbjtcbiAgICByZXR1cm4gdGhpcy5nbG9iYWxSZWdpb25zID0gKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGksIGxlbiwgcmVmLCByZXN1bHRzO1xuICAgICAgcmVmID0gdGhpcy5nbG9iYWxSZWdpb25zO1xuICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHJlZ2lvbiA9IHJlZltpXTtcbiAgICAgICAgaWYgKHJlZ2lvbi5pbnN0YW5jZS5jaWQgIT09IGluc3RhbmNlLmNpZCkge1xuICAgICAgICAgIHJlc3VsdHMucHVzaChyZWdpb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9KS5jYWxsKHRoaXMpO1xuICB9O1xuXG4gIExheW91dC5wcm90b3R5cGUucmVnaW9uQnlOYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBpLCBsZW4sIHJlZiwgcmVnO1xuICAgIHJlZiA9IHRoaXMuZ2xvYmFsUmVnaW9ucztcbiAgICBmb3IgKGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHJlZyA9IHJlZltpXTtcbiAgICAgIGlmIChyZWcubmFtZSA9PT0gbmFtZSAmJiAhcmVnLmluc3RhbmNlLnN0YWxlKSB7XG4gICAgICAgIHJldHVybiByZWc7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIExheW91dC5wcm90b3R5cGUuc2hvd1JlZ2lvbiA9IGZ1bmN0aW9uKG5hbWUsIGluc3RhbmNlKSB7XG4gICAgdmFyIHJlZ2lvbjtcbiAgICByZWdpb24gPSB0aGlzLnJlZ2lvbkJ5TmFtZShuYW1lKTtcbiAgICBpZiAoIXJlZ2lvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gcmVnaW9uIHJlZ2lzdGVyZWQgdW5kZXIgXCIgKyBuYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIGluc3RhbmNlLmNvbnRhaW5lciA9IHJlZ2lvbi5zZWxlY3RvciA9PT0gJycgPyAkID8gcmVnaW9uLmluc3RhbmNlLiRlbCA6IHJlZ2lvbi5pbnN0YW5jZS5lbCA6IHJlZ2lvbi5pbnN0YW5jZS5ub1dyYXAgPyByZWdpb24uaW5zdGFuY2UuY29udGFpbmVyLmZpbmQocmVnaW9uLnNlbGVjdG9yKSA6IHJlZ2lvbi5pbnN0YW5jZS5maW5kKHJlZ2lvbi5zZWxlY3Rvcik7XG4gIH07XG5cbiAgTGF5b3V0LnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGksIGxlbiwgcHJvcCwgcmVmO1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc3RvcExpbmtSb3V0aW5nKCk7XG4gICAgcmVmID0gWydnbG9iYWxSZWdpb25zJywgJ3RpdGxlJywgJ3JvdXRlJ107XG4gICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBwcm9wID0gcmVmW2ldO1xuICAgICAgZGVsZXRlIHRoaXNbcHJvcF07XG4gICAgfVxuICAgIG1lZGlhdG9yLnJlbW92ZUhhbmRsZXJzKHRoaXMpO1xuICAgIHJldHVybiBMYXlvdXQuX19zdXBlcl9fLmRpc3Bvc2UuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcblxuICByZXR1cm4gTGF5b3V0O1xuXG59KShWaWV3KTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2liR0Y1YjNWMExtcHpJaXdpYzI5MWNtTmxVbTl2ZENJNklpSXNJbk52ZFhKalpYTWlPbHNpYkdGNWIzVjBMbU52Wm1abFpTSmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaVFVRkJRVHRCUVVGQkxFbEJRVUVzTUVSQlFVRTdSVUZCUVRzN096dEJRVVZCTEVOQlFVRXNSMEZCU1N4UFFVRkJMRU5CUVZFc1dVRkJVanM3UVVGRFNpeFJRVUZCTEVkQlFWY3NUMEZCUVN4RFFVRlJMRlZCUVZJN08wRkJSVmdzU1VGQlFTeEhRVUZQTEU5QlFVRXNRMEZCVVN4UlFVRlNPenRCUVVOUUxGZEJRVUVzUjBGQll5eFBRVUZCTEVOQlFWRXNjVUpCUVZJN08wRkJRMlFzUzBGQlFTeEhRVUZSTEU5QlFVRXNRMEZCVVN4alFVRlNPenRCUVVOU0xGRkJRVUVzUjBGQlZ5eFBRVUZCTEVOQlFWRXNZVUZCVWpzN1FVRkhWaXhKUVVGTE96dEJRVVZPTEUxQlFVMHNRMEZCUXl4UFFVRlFMRWRCUVhWQ096czdiVUpCUlhKQ0xFVkJRVUVzUjBGQlNUczdiVUpCUjBvc1YwRkJRU3hIUVVGaE96dHRRa0ZMWWl4TFFVRkJMRWRCUVU4N08yMUNRVTFRTEdGQlFVRXNSMEZCWlRzN2JVSkJSV1lzVFVGQlFTeEhRVU5GTzBsQlFVRXNhME5CUVVFc1JVRkJiME1zVVVGQmNFTTdPenRGUVVWWExHZENRVUZETEU5QlFVUTdPMDFCUVVNc1ZVRkJWVHM3TzBsQlEzUkNMRWxCUVVNc1EwRkJRU3hoUVVGRUxFZEJRV2xDTzBsQlEycENMRWxCUVVNc1EwRkJRU3hMUVVGRUxFZEJRVk1zVDBGQlR5eERRVUZETzBsQlEycENMRWxCUVRoQ0xFOUJRVThzUTBGQlF5eFBRVUYwUXp0TlFVRkJMRWxCUVVNc1EwRkJRU3hQUVVGRUxFZEJRVmNzVDBGQlR5eERRVUZETEZGQlFXNUNPenRKUVVOQkxFbEJRVU1zUTBGQlFTeFJRVUZFTEVkQlFWa3NRMEZCUXl4RFFVRkRMRkZCUVVZc1EwRkJWeXhQUVVGWUxFVkJRMVk3VFVGQlFTeGhRVUZCTEVWQlFXVXNVMEZCUXl4SlFVRkVPMEZCUTJJc1dVRkJRVHRSUVVGQkxFVkJRVUVzUjBGQlVTeEpRVUZKTEVOQlFVTXNVVUZCVWl4SFFVRjVRaXhKUVVGSkxFTkJRVU1zVVVGQlRpeEhRVUZsTEZWQlFYWkRMRWRCUVhORU8yVkJRek5FTEVWQlFVRXNSMEZCU3l4SlFVRkpMRU5CUVVNN1RVRkdSeXhEUVVGbU8wMUJSMEVzYlVKQlFVRXNSVUZCY1VJc1MwRklja0k3VFVGSlFTeFZRVUZCTEVWQlFWa3NWMEZLV2p0TlFVdEJMRmRCUVVFc1JVRkJZU3hYUVV4aU8wMUJUMEVzVVVGQlFTeEZRVUZWTEVOQlFVTXNRMEZCUkN4RlFVRkpMRU5CUVVvc1EwRlFWanRMUVVSVk8wbEJWVm9zVVVGQlVTeERRVUZETEZWQlFWUXNRMEZCYjBJc1lVRkJjRUlzUlVGQmJVTXNTVUZCUXl4RFFVRkJMRlZCUVhCRExFVkJRV2RFTEVsQlFXaEVPMGxCUTBFc1VVRkJVU3hEUVVGRExGVkJRVlFzUTBGQmIwSXNhVUpCUVhCQ0xFVkJRWFZETEVsQlFVTXNRMEZCUVN4eFFrRkJlRU1zUlVGQkswUXNTVUZCTDBRN1NVRkRRU3hSUVVGUkxFTkJRVU1zVlVGQlZDeERRVUZ2UWl4dFFrRkJjRUlzUlVGQmVVTXNTVUZCUXl4RFFVRkJMSFZDUVVFeFF5eEZRVUZ0UlN4SlFVRnVSVHRKUVVOQkxGRkJRVkVzUTBGQlF5eFZRVUZVTEVOQlFXOUNMR0ZCUVhCQ0xFVkJRVzFETEVsQlFVTXNRMEZCUVN4WlFVRndReXhGUVVGclJDeEpRVUZzUkR0SlFVTkJMRkZCUVZFc1EwRkJReXhWUVVGVUxFTkJRVzlDTEdGQlFYQkNMRVZCUVcxRExFbEJRVU1zUTBGQlFTeFhRVUZ3UXl4RlFVRnBSQ3hKUVVGcVJEdEpRVVZCTEhsRFFVRkJMRk5CUVVFN1NVRkhRU3hKUVVGMVFpeEpRVUZETEVOQlFVRXNVVUZCVVN4RFFVRkRMRlZCUVdwRE8wMUJRVUVzU1VGQlF5eERRVUZCTEdkQ1FVRkVMRU5CUVVFc1JVRkJRVHM3UlVGMlFsYzdPMjFDUVRaQ1lpeE5RVUZCTEVkQlFWRXNVMEZCUVR0QlFVVk9MRkZCUVVFN1NVRkJRU3hGUVVGQkxFZEJRVXNzU1VGQlF5eERRVUZCTEZGQlFWRXNRMEZCUXp0SlFVTm1MRWxCUVVjc1JVRkJRU3hKUVVGUExFOUJRVThzUlVGQlVDeExRVUZoTEZGQlFYWkNPMDFCUTBjc1UwRkJSQ3hGUVVGSk8yRkJRMG9zVFVGQlRTeERRVUZETEZGQlFWQXNRMEZCWjBJc1EwRkJhRUlzUlVGQmJVSXNRMEZCYmtJc1JVRkdSanM3UlVGSVRUczdiVUpCVlZJc1YwRkJRU3hIUVVGaExGTkJRVU1zVVVGQlJEdEJRVU5ZTEZGQlFVRTdPMDFCUkZrc1YwRkJWenM3U1VGRGRrSXNTMEZCUVN4SFFVRlJMRWxCUVVNc1EwRkJRU3hSUVVGUkxFTkJRVU1zWVVGQlZpeERRVUYzUWp0TlFVRkZMRTlCUVVRc1NVRkJReXhEUVVGQkxFdEJRVVk3VFVGQlV5eFZRVUZCTEZGQlFWUTdTMEZCZUVJN1NVRkRVaXhSUVVGUkxFTkJRVU1zUzBGQlZDeEhRVUZwUWp0SlFVTnFRaXhKUVVGRExFTkJRVUVzV1VGQlJDeERRVUZqTEdGQlFXUXNSVUZCTmtJc1VVRkJOMElzUlVGQmRVTXNTMEZCZGtNN1YwRkRRVHRGUVVwWE96dHRRa0ZUWWl4blFrRkJRU3hIUVVGclFpeFRRVUZCTzBGQlEyaENMRkZCUVVFN1NVRkJRU3hMUVVGQkxFZEJRVkVzU1VGQlF5eERRVUZCTEZGQlFWRXNRMEZCUXp0SlFVTnNRaXhKUVVGMVF5eExRVUYyUXp0aFFVRkJMRWxCUVVNc1EwRkJRU3hSUVVGRUxFTkJRVlVzVDBGQlZpeEZRVUZ0UWl4TFFVRnVRaXhGUVVFd1FpeEpRVUZETEVOQlFVRXNVVUZCTTBJc1JVRkJRVHM3UlVGR1owSTdPMjFDUVVsc1FpeGxRVUZCTEVkQlFXbENMRk5CUVVFN1FVRkRaaXhSUVVGQk8wbEJRVUVzUzBGQlFTeEhRVUZSTEVsQlFVTXNRMEZCUVN4UlFVRlJMRU5CUVVNN1NVRkRiRUlzU1VGQk9FSXNTMEZCT1VJN1lVRkJRU3hKUVVGRExFTkJRVUVzVlVGQlJDeERRVUZaTEU5QlFWb3NSVUZCY1VJc1MwRkJja0lzUlVGQlFUczdSVUZHWlRzN2JVSkJTV3BDTEdOQlFVRXNSMEZCWjBJc1UwRkJReXhKUVVGRU8wRkJRMlFzVVVGQlFUdEpRVUZCTEVsQlFVRXNRMEZCYjBJc1MwRkJTeXhEUVVGRExHVkJRVTRzUTBGQmMwSXNTVUZCZEVJc1JVRkJORUlzVTBGQk5VSXNRMEZCY0VJN1FVRkJRU3hoUVVGUExFMUJRVkE3TzBsQlEwRXNTVUZCWlN4SlFVRkpMRU5CUVVNc1dVRkJUQ3hEUVVGclFpeFZRVUZzUWl4RFFVRm1PMEZCUVVFc1lVRkJUeXhMUVVGUU96dEpRVWxCTEVsQlFVRXNRMEZCZFVJc1NVRkJTU3hEUVVGRExFbEJRVFZDTzAxQlFVRXNTVUZCU1N4RFFVRkRMRWxCUVV3c1NVRkJZU3hIUVVGaU96dEpRVVZETERSQ1FVRkVMRVZCUVZjN1NVRkRWaXhUUVVGVk8xZEJSVmdzVFVGQlFTeExRVUZWTEZGQlFWWXNTVUZEUVN4SlFVRkpMRU5CUVVNc1IwRkJUQ3hMUVVGWkxGVkJSRm9zU1VGRlFTeEpRVUZKTEVOQlFVTXNVVUZCVEN4TFFVRnRRaXhSUVVadVFpeEpRVWRCTEVsQlFVa3NRMEZCUXl4SlFVRk1MRXRCUVdVc1NVRklaaXhKUVVsQkxFTkJRVU1zVFVGQlFTeExRVUZWTEZOQlFWWXNTVUZCZDBJc1RVRkJRU3hMUVVGWkxFbEJRWEpETEVOQlNrRXNTVUZMUVN4RFFVRkRMRTFCUVVFc1MwRkJWU3hOUVVGV0xFbEJRWEZDTEVkQlFVRXNTMEZCVXl4SlFVRXZRanRGUVdoQ1l6czdiVUpCYlVKb1FpeFJRVUZCTEVkQlFWVXNVMEZCUXl4TFFVRkVPMEZCUTFJc1VVRkJRVHRKUVVGQkxFbEJRVlVzUzBGQlN5eERRVUZETEd0Q1FVRk9MRU5CUVhsQ0xFdEJRWHBDTEVOQlFWWTdRVUZCUVN4aFFVRkJPenRKUVVWQkxFVkJRVUVzUjBGQlVTeERRVUZJTEVkQlFWVXNTMEZCU3l4RFFVRkRMR0ZCUVdoQ0xFZEJRVzFETEV0QlFVc3NRMEZCUXp0SlFVYzVReXhKUVVGQkxFZEJRVThzUlVGQlJTeERRVUZETEZsQlFVZ3NRMEZCWjBJc1RVRkJhRUlzUTBGQlFTeEpRVUV5UWl4RlFVRkZMRU5CUVVNc1dVRkJTQ3hEUVVGblFpeFhRVUZvUWp0SlFVdHNReXhKUVVGVkxFTkJRVWtzU1VGQlNpeEpRVVZTTEVsQlFVc3NRMEZCUVN4RFFVRkJMRU5CUVV3c1MwRkJWeXhIUVVaaU8wRkJRVUVzWVVGQlFUczdTVUZMUXl4alFVRmxMRWxCUVVNc1EwRkJRVHRCUVVOcVFpeFpRVUZQTEU5QlFVOHNWMEZCWkR0QlFVRkJMRmRCUTA4c1ZVRkVVRHRSUVVWSkxFbEJRVUVzUTBGQll5eFhRVUZCTEVOQlFWa3NTVUZCV2l4RlFVRnJRaXhGUVVGc1FpeERRVUZrTzBGQlFVRXNhVUpCUVVFN08wRkJSRWM3UVVGRVVDeFhRVWRQTEZGQlNGQTdVVUZKU1N4SlFVRlZMRXRCUVVzc1EwRkJReXhsUVVGT0xFTkJRWE5DTEVWQlFYUkNMRVZCUVRCQ0xGZEJRVEZDTEVOQlFWWTdRVUZCUVN4cFFrRkJRVHM3UVVGS1NqdEpRVTlCTEVsQlFVY3NTVUZCUXl4RFFVRkJMR05CUVVRc1EwRkJaMElzUlVGQmFFSXNRMEZCU0R0TlFVTkZMRWxCUVVjc1NVRkJReXhEUVVGQkxGRkJRVkVzUTBGQlF5eHRRa0ZCWWp0UlFVVkZMRXRCUVVzc1EwRkJReXhqUVVGT0xFTkJRVUU3VVVGRFFTeEpRVUZETEVOQlFVRXNWVUZCUkN4RFFVRlpMRWxCUVZvc1JVRklSanM3UVVGSlFTeGhRVXhHT3p0SlFWRkJMRXRCUVVzc1EwRkJReXhWUVVGT0xFTkJRV2xDTzAxQlFVRXNSMEZCUVN4RlFVRkxMRWxCUVV3N1MwRkJha0k3VjBGSFFTeExRVUZMTEVOQlFVTXNZMEZCVGl4RFFVRkJPMFZCYmtOUk96dHRRa0Z6UTFZc1ZVRkJRU3hIUVVGWkxGTkJRVU1zU1VGQlJEdFhRVU5XTEUxQlFVMHNRMEZCUXl4SlFVRlFMRU5CUVZrc1NVRkJXanRGUVVSVk96dHRRa0ZSV2l4eFFrRkJRU3hIUVVGMVFpeFRRVUZETEZGQlFVUXNSVUZCVnl4SlFVRllMRVZCUVdsQ0xGRkJRV3BDTzBsQlEzSkNMRWxCUVVjc1dVRkJTRHRoUVVORkxFbEJRVU1zUTBGQlFTeHZRa0ZCUkN4RFFVRnpRaXhSUVVGMFFpeEZRVUZuUXl4SlFVRm9ReXhGUVVGelF5eFJRVUYwUXl4RlFVUkdPMHRCUVVFc1RVRkJRVHRoUVVkRkxFbEJRVU1zUTBGQlFTeHhRa0ZCUkN4RFFVRjFRaXhSUVVGMlFpeEZRVWhHT3p0RlFVUnhRanM3YlVKQlQzWkNMRzlDUVVGQkxFZEJRWE5DTEZOQlFVTXNVVUZCUkN4RlFVRlhMRWxCUVZnc1JVRkJhVUlzVVVGQmFrSTdTVUZIY0VJc1NVRkJReXhEUVVGQkxITkNRVUZFTEVOQlFYZENMRkZCUVhoQ0xFVkJRV3RETEVsQlFXeERPMWRCUjBFc1NVRkJReXhEUVVGQkxHRkJRV0VzUTBGQlF5eFBRVUZtTEVOQlFYVkNPMDFCUVVNc1ZVRkJRU3hSUVVGRU8wMUJRVmNzVFVGQlFTeEpRVUZZTzAxQlFXbENMRlZCUVVFc1VVRkJha0k3UzBGQmRrSTdSVUZPYjBJN08yMUNRVlYwUWl4eFFrRkJRU3hIUVVGMVFpeFRRVUZETEZGQlFVUTdRVUZMY2tJc1VVRkJRVHRCUVVGQk8wRkJRVUVzVTBGQlFTeHhRMEZCUVRzN1FVRkRSU3hYUVVGQkxHVkJRVUU3TzFGQlEwVXNTVUZCUXl4RFFVRkJMRzlDUVVGRUxFTkJRWE5DTEZGQlFYUkNMRVZCUVdkRExFbEJRV2hETEVWQlFYTkRMRkZCUVhSRE8wRkJSRVk3UVVGRVJqdEZRVXh4UWpzN2JVSkJZWFpDTEhWQ1FVRkJMRWRCUVhsQ0xGTkJRVU1zVVVGQlJDeEZRVUZYTEVsQlFWZzdTVUZEZGtJc1NVRkJSeXhaUVVGSU8yRkJRMFVzU1VGQlF5eERRVUZCTEhOQ1FVRkVMRU5CUVhkQ0xGRkJRWGhDTEVWQlFXdERMRWxCUVd4RExFVkJSRVk3UzBGQlFTeE5RVUZCTzJGQlIwVXNTVUZCUXl4RFFVRkJMSFZDUVVGRUxFTkJRWGxDTEZGQlFYcENMRVZCU0VZN08wVkJSSFZDT3p0dFFrRlBla0lzYzBKQlFVRXNSMEZCZDBJc1UwRkJReXhSUVVGRUxFVkJRVmNzU1VGQldEdEJRVU4wUWl4UlFVRkJPMGxCUVVFc1IwRkJRU3hIUVVGTkxGRkJRVkVzUTBGQlF6dFhRVU5tTEVsQlFVTXNRMEZCUVN4aFFVRkVPenRCUVVGclFqdEJRVUZCTzFkQlFVRXNjVU5CUVVFN08xbEJRMmhDTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1IwRkJhRUlzUzBGQmVVSXNSMEZCZWtJc1NVRkJaME1zVFVGQlRTeERRVUZETEVsQlFWQXNTMEZCYVVJN2RVSkJSR3BET3p0QlFVRkJPenM3UlVGR1NUczdiVUpCVDNoQ0xIVkNRVUZCTEVkQlFYbENMRk5CUVVNc1VVRkJSRHRCUVVOMlFpeFJRVUZCTzFkQlFVRXNTVUZCUXl4RFFVRkJMR0ZCUVVRN08wRkJRV3RDTzBGQlFVRTdWMEZCUVN4eFEwRkJRVHM3V1VGRGFFSXNUVUZCVFN4RFFVRkRMRkZCUVZFc1EwRkJReXhIUVVGb1FpeExRVUY1UWl4UlFVRlJMRU5CUVVNN2RVSkJSR3hDT3p0QlFVRkJPenM3UlVGRVN6czdiVUpCVFhwQ0xGbEJRVUVzUjBGQll5eFRRVUZETEVsQlFVUTdRVUZEV2l4UlFVRkJPMEZCUVVFN1FVRkJRU3hUUVVGQkxIRkRRVUZCT3p0VlFVRXJRaXhIUVVGSExFTkJRVU1zU1VGQlNpeExRVUZaTEVsQlFWb3NTVUZCY1VJc1EwRkJTU3hIUVVGSExFTkJRVU1zVVVGQlVTeERRVUZETzBGQlEyNUZMR1ZCUVU4N08wRkJSRlE3UlVGRVdUczdiVUpCVFdRc1ZVRkJRU3hIUVVGWkxGTkJRVU1zU1VGQlJDeEZRVUZQTEZGQlFWQTdRVUZGVml4UlFVRkJPMGxCUVVFc1RVRkJRU3hIUVVGVExFbEJRVU1zUTBGQlFTeFpRVUZFTEVOQlFXTXNTVUZCWkR0SlFVZFVMRWxCUVVFc1EwRkJORVFzVFVGQk5VUTdRVUZCUVN4WlFVRk5MRWxCUVVrc1MwRkJTaXhEUVVGVkxEWkNRVUZCTEVkQlFUaENMRWxCUVhoRExFVkJRVTQ3TzFkQlIwRXNVVUZCVVN4RFFVRkRMRk5CUVZRc1IwRkJkMElzVFVGQlRTeERRVUZETEZGQlFWQXNTMEZCYlVJc1JVRkJkRUlzUjBGRGFFSXNRMEZCU0N4SFFVTkZMRTFCUVUwc1EwRkJReXhSUVVGUkxFTkJRVU1zUjBGRWJFSXNSMEZIUlN4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExFVkJTa01zUjBGTmFFSXNUVUZCVFN4RFFVRkRMRkZCUVZFc1EwRkJReXhOUVVGdVFpeEhRVU5GTEUxQlFVMHNRMEZCUXl4UlFVRlJMRU5CUVVNc1UwRkJVeXhEUVVGRExFbEJRVEZDTEVOQlFTdENMRTFCUVUwc1EwRkJReXhSUVVGMFF5eERRVVJHTEVkQlIwVXNUVUZCVFN4RFFVRkRMRkZCUVZFc1EwRkJReXhKUVVGb1FpeERRVUZ4UWl4TlFVRk5MRU5CUVVNc1VVRkJOVUk3UlVGcVFrMDdPMjFDUVhOQ1dpeFBRVUZCTEVkQlFWTXNVMEZCUVR0QlFVTlFMRkZCUVVFN1NVRkJRU3hKUVVGVkxFbEJRVU1zUTBGQlFTeFJRVUZZTzBGQlFVRXNZVUZCUVRzN1NVRkhRU3hKUVVGRExFTkJRVUVzWlVGQlJDeERRVUZCTzBGQlIwRTdRVUZCUVN4VFFVRkJMSEZEUVVGQk96dE5RVUZCTEU5QlFVOHNTVUZCU3l4RFFVRkJMRWxCUVVFN1FVRkJXanRKUVVWQkxGRkJRVkVzUTBGQlF5eGpRVUZVTEVOQlFYZENMRWxCUVhoQ08xZEJSVUVzY1VOQlFVRXNVMEZCUVR0RlFWaFBPenM3TzBkQk5VNHlRaUo5XG4iLCIndXNlIHN0cmljdCc7XG52YXIgJCwgQmFja2JvbmUsIEV2ZW50QnJva2VyLCBWaWV3LCBfLCBhdHRhY2gsIG1lZGlhdG9yLCBzZXRIVE1MLCB1dGlscyxcbiAgZXh0ZW5kID0gZnVuY3Rpb24oY2hpbGQsIHBhcmVudCkgeyBmb3IgKHZhciBrZXkgaW4gcGFyZW50KSB7IGlmIChoYXNQcm9wLmNhbGwocGFyZW50LCBrZXkpKSBjaGlsZFtrZXldID0gcGFyZW50W2tleV07IH0gZnVuY3Rpb24gY3RvcigpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9IGN0b3IucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTsgY2hpbGQucHJvdG90eXBlID0gbmV3IGN0b3IoKTsgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTsgcmV0dXJuIGNoaWxkOyB9LFxuICBoYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHksXG4gIGluZGV4T2YgPSBbXS5pbmRleE9mIHx8IGZ1bmN0aW9uKGl0ZW0pIHsgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmxlbmd0aDsgaSA8IGw7IGkrKykgeyBpZiAoaSBpbiB0aGlzICYmIHRoaXNbaV0gPT09IGl0ZW0pIHJldHVybiBpOyB9IHJldHVybiAtMTsgfTtcblxuXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxuQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuXG5FdmVudEJyb2tlciA9IHJlcXVpcmUoJy4uL2xpYi9ldmVudF9icm9rZXInKTtcblxudXRpbHMgPSByZXF1aXJlKCcuLi9saWIvdXRpbHMnKTtcblxubWVkaWF0b3IgPSByZXF1aXJlKCcuLi9tZWRpYXRvcicpO1xuXG4kID0gQmFja2JvbmUuJDtcblxuc2V0SFRNTCA9IChmdW5jdGlvbigpIHtcbiAgaWYgKCQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24odmlldywgaHRtbCkge1xuICAgICAgdmlldy4kZWwuaHRtbChodG1sKTtcbiAgICAgIHJldHVybiBodG1sO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHZpZXcsIGh0bWwpIHtcbiAgICAgIHJldHVybiB2aWV3LmVsLmlubmVySFRNTCA9IGh0bWw7XG4gICAgfTtcbiAgfVxufSkoKTtcblxuYXR0YWNoID0gKGZ1bmN0aW9uKCkge1xuICBpZiAoJCkge1xuICAgIHJldHVybiBmdW5jdGlvbih2aWV3KSB7XG4gICAgICB2YXIgYWN0dWFsO1xuICAgICAgYWN0dWFsID0gJCh2aWV3LmNvbnRhaW5lcik7XG4gICAgICBpZiAodHlwZW9mIHZpZXcuY29udGFpbmVyTWV0aG9kID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiB2aWV3LmNvbnRhaW5lck1ldGhvZChhY3R1YWwsIHZpZXcuZWwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGFjdHVhbFt2aWV3LmNvbnRhaW5lck1ldGhvZF0odmlldy5lbCk7XG4gICAgICB9XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZnVuY3Rpb24odmlldykge1xuICAgICAgdmFyIGFjdHVhbDtcbiAgICAgIGFjdHVhbCA9IHR5cGVvZiB2aWV3LmNvbnRhaW5lciA9PT0gJ3N0cmluZycgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHZpZXcuY29udGFpbmVyKSA6IHZpZXcuY29udGFpbmVyO1xuICAgICAgaWYgKHR5cGVvZiB2aWV3LmNvbnRhaW5lck1ldGhvZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gdmlldy5jb250YWluZXJNZXRob2QoYWN0dWFsLCB2aWV3LmVsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBhY3R1YWxbdmlldy5jb250YWluZXJNZXRob2RdKHZpZXcuZWwpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldyA9IChmdW5jdGlvbihzdXBlckNsYXNzKSB7XG4gIGV4dGVuZChWaWV3LCBzdXBlckNsYXNzKTtcblxuICBfLmV4dGVuZChWaWV3LnByb3RvdHlwZSwgRXZlbnRCcm9rZXIpO1xuXG4gIFZpZXcucHJvdG90eXBlLmF1dG9SZW5kZXIgPSBmYWxzZTtcblxuICBWaWV3LnByb3RvdHlwZS5hdXRvQXR0YWNoID0gdHJ1ZTtcblxuICBWaWV3LnByb3RvdHlwZS5jb250YWluZXIgPSBudWxsO1xuXG4gIFZpZXcucHJvdG90eXBlLmNvbnRhaW5lck1ldGhvZCA9ICQgPyAnYXBwZW5kJyA6ICdhcHBlbmRDaGlsZCc7XG5cbiAgVmlldy5wcm90b3R5cGUucmVnaW9ucyA9IG51bGw7XG5cbiAgVmlldy5wcm90b3R5cGUucmVnaW9uID0gbnVsbDtcblxuICBWaWV3LnByb3RvdHlwZS5zdGFsZSA9IGZhbHNlO1xuXG4gIFZpZXcucHJvdG90eXBlLm5vV3JhcCA9IGZhbHNlO1xuXG4gIFZpZXcucHJvdG90eXBlLmtlZXBFbGVtZW50ID0gZmFsc2U7XG5cbiAgVmlldy5wcm90b3R5cGUuc3Vidmlld3MgPSBudWxsO1xuXG4gIFZpZXcucHJvdG90eXBlLnN1YnZpZXdzQnlOYW1lID0gbnVsbDtcblxuICBWaWV3LnByb3RvdHlwZS5vcHRpb25OYW1lcyA9IFsnYXV0b0F0dGFjaCcsICdhdXRvUmVuZGVyJywgJ2NvbnRhaW5lcicsICdjb250YWluZXJNZXRob2QnLCAncmVnaW9uJywgJ3JlZ2lvbnMnLCAnbm9XcmFwJ107XG5cbiAgZnVuY3Rpb24gVmlldyhvcHRpb25zKSB7XG4gICAgdmFyIGksIGtleSwgbGVuLCByZWYsIHJlZ2lvbiwgcmVuZGVyO1xuICAgIGlmIChvcHRpb25zID09IG51bGwpIHtcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgcmVmID0gT2JqZWN0LmtleXMob3B0aW9ucyk7XG4gICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBrZXkgPSByZWZbaV07XG4gICAgICBpZiAoaW5kZXhPZi5jYWxsKHRoaXMub3B0aW9uTmFtZXMsIGtleSkgPj0gMCkge1xuICAgICAgICB0aGlzW2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJlbmRlciA9IHRoaXMucmVuZGVyO1xuICAgIHRoaXMucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmV0dXJuVmFsdWU7XG4gICAgICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm5WYWx1ZSA9IHJlbmRlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKHRoaXMuYXV0b0F0dGFjaCkge1xuICAgICAgICB0aGlzLmF0dGFjaC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJldHVyblZhbHVlO1xuICAgIH07XG4gICAgdGhpcy5zdWJ2aWV3cyA9IFtdO1xuICAgIHRoaXMuc3Vidmlld3NCeU5hbWUgPSB7fTtcbiAgICBpZiAodGhpcy5ub1dyYXApIHtcbiAgICAgIGlmICh0aGlzLnJlZ2lvbikge1xuICAgICAgICByZWdpb24gPSBtZWRpYXRvci5leGVjdXRlKCdyZWdpb246ZmluZCcsIHRoaXMucmVnaW9uKTtcbiAgICAgICAgaWYgKHJlZ2lvbiAhPSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5lbCA9IHJlZ2lvbi5pbnN0YW5jZS5jb250YWluZXIgIT0gbnVsbCA/IHJlZ2lvbi5pbnN0YW5jZS5yZWdpb24gIT0gbnVsbCA/ICQocmVnaW9uLmluc3RhbmNlLmNvbnRhaW5lcikuZmluZChyZWdpb24uc2VsZWN0b3IpIDogcmVnaW9uLmluc3RhbmNlLmNvbnRhaW5lciA6IHJlZ2lvbi5pbnN0YW5jZS4kKHJlZ2lvbi5zZWxlY3Rvcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmNvbnRhaW5lcikge1xuICAgICAgICB0aGlzLmVsID0gdGhpcy5jb250YWluZXI7XG4gICAgICB9XG4gICAgfVxuICAgIFZpZXcuX19zdXBlcl9fLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy5kZWxlZ2F0ZUxpc3RlbmVycygpO1xuICAgIGlmICh0aGlzLm1vZGVsKSB7XG4gICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsICdkaXNwb3NlJywgdGhpcy5kaXNwb3NlKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY29sbGVjdGlvbikge1xuICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdkaXNwb3NlJywgKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihzdWJqZWN0KSB7XG4gICAgICAgICAgaWYgKCFzdWJqZWN0IHx8IHN1YmplY3QgPT09IF90aGlzLmNvbGxlY3Rpb24pIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpcy5kaXNwb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSkodGhpcykpO1xuICAgIH1cbiAgICBpZiAodGhpcy5yZWdpb25zICE9IG51bGwpIHtcbiAgICAgIG1lZGlhdG9yLmV4ZWN1dGUoJ3JlZ2lvbjpyZWdpc3RlcicsIHRoaXMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5hdXRvUmVuZGVyKSB7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cbiAgfVxuXG4gIFZpZXcucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgIGlmICgkKSB7XG4gICAgICByZXR1cm4gdGhpcy4kZWwuZmluZChzZWxlY3Rvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIH1cbiAgfTtcblxuICBWaWV3LnByb3RvdHlwZS5kZWxlZ2F0ZSA9IGZ1bmN0aW9uKGV2ZW50TmFtZSwgc2Vjb25kLCB0aGlyZCkge1xuICAgIHZhciBib3VuZCwgZXZlbnQsIGV2ZW50cywgaGFuZGxlciwgaSwgbGVuLCByZWYsIHNlbGVjdG9yO1xuICAgIGlmICh0eXBlb2YgZXZlbnROYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVmlldyNkZWxlZ2F0ZTogZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgIH1cbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlciA9IHNlY29uZDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHNlbGVjdG9yID0gc2Vjb25kO1xuICAgICAgICBoYW5kbGVyID0gdGhpcmQ7XG4gICAgICAgIGlmICh0eXBlb2Ygc2VsZWN0b3IgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVmlldyNkZWxlZ2F0ZTogJyArICdzZWNvbmQgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVmlldyNkZWxlZ2F0ZTogJyArICdvbmx5IHR3byBvciB0aHJlZSBhcmd1bWVudHMgYXJlIGFsbG93ZWQnKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdWaWV3I2RlbGVnYXRlOiAnICsgJ2hhbmRsZXIgYXJndW1lbnQgbXVzdCBiZSBmdW5jdGlvbicpO1xuICAgIH1cbiAgICBib3VuZCA9IGhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICBpZiAoJCkge1xuICAgICAgZXZlbnRzID0gZXZlbnROYW1lLnNwbGl0KCcgJykubWFwKChmdW5jdGlvbihfdGhpcykge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgIHJldHVybiBuYW1lICsgXCIuZGVsZWdhdGVFdmVudHNcIiArIF90aGlzLmNpZDtcbiAgICAgICAgfTtcbiAgICAgIH0pKHRoaXMpKS5qb2luKCcgJyk7XG4gICAgICB0aGlzLiRlbC5vbihldmVudHMsIHNlbGVjdG9yLCBib3VuZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlZiA9IGV2ZW50TmFtZS5zcGxpdCgnICcpO1xuICAgICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGV2ZW50ID0gcmVmW2ldO1xuICAgICAgICBWaWV3Ll9fc3VwZXJfXy5kZWxlZ2F0ZS5jYWxsKHRoaXMsIGV2ZW50LCBzZWxlY3RvciwgYm91bmQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYm91bmQ7XG4gIH07XG5cbiAgVmlldy5wcm90b3R5cGUuX2RlbGVnYXRlRXZlbnRzID0gZnVuY3Rpb24oZXZlbnRzKSB7XG4gICAgdmFyIGhhbmRsZXIsIGksIGtleSwgbGVuLCBtYXRjaCwgcmVmLCB2YWx1ZTtcbiAgICByZWYgPSBPYmplY3Qua2V5cyhldmVudHMpO1xuICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAga2V5ID0gcmVmW2ldO1xuICAgICAgdmFsdWUgPSBldmVudHNba2V5XTtcbiAgICAgIGhhbmRsZXIgPSB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgPyB2YWx1ZSA6IHRoaXNbdmFsdWVdO1xuICAgICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBgXCIgKyB2YWx1ZSArIFwiYCBkb2VzIG5vdCBleGlzdFwiKTtcbiAgICAgIH1cbiAgICAgIG1hdGNoID0gL14oXFxTKylcXHMqKC4qKSQvLmV4ZWMoa2V5KTtcbiAgICAgIHRoaXMuZGVsZWdhdGUobWF0Y2hbMV0sIG1hdGNoWzJdLCBoYW5kbGVyKTtcbiAgICB9XG4gIH07XG5cbiAgVmlldy5wcm90b3R5cGUuZGVsZWdhdGVFdmVudHMgPSBmdW5jdGlvbihldmVudHMsIGtlZXBPbGQpIHtcbiAgICB2YXIgY2xhc3NFdmVudHMsIGksIGxlbiwgcmVmO1xuICAgIGlmICgha2VlcE9sZCkge1xuICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgfVxuICAgIGlmIChldmVudHMpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kZWxlZ2F0ZUV2ZW50cyhldmVudHMpO1xuICAgIH1cbiAgICByZWYgPSB1dGlscy5nZXRBbGxQcm9wZXJ0eVZlcnNpb25zKHRoaXMsICdldmVudHMnKTtcbiAgICBmb3IgKGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGNsYXNzRXZlbnRzID0gcmVmW2ldO1xuICAgICAgaWYgKHR5cGVvZiBjbGFzc0V2ZW50cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjbGFzc0V2ZW50cyA9IGNsYXNzRXZlbnRzLmNhbGwodGhpcyk7XG4gICAgICB9XG4gICAgICB0aGlzLl9kZWxlZ2F0ZUV2ZW50cyhjbGFzc0V2ZW50cyk7XG4gICAgfVxuICB9O1xuXG4gIFZpZXcucHJvdG90eXBlLnVuZGVsZWdhdGUgPSBmdW5jdGlvbihldmVudE5hbWUsIHNlY29uZCkge1xuICAgIHZhciBldmVudHMsIHNlbGVjdG9yO1xuICAgIGlmIChldmVudE5hbWUgPT0gbnVsbCkge1xuICAgICAgZXZlbnROYW1lID0gJyc7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZXZlbnROYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVmlldyN1bmRlbGVnYXRlOiBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgfVxuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgY2FzZSAyOlxuICAgICAgICBpZiAodHlwZW9mIHNlY29uZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBzZWxlY3RvciA9IHNlY29uZDtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgc2VsZWN0b3IgPSBzZWNvbmQ7XG4gICAgICAgIGlmICh0eXBlb2Ygc2VsZWN0b3IgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVmlldyN1bmRlbGVnYXRlOiAnICsgJ3NlY29uZCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKCQpIHtcbiAgICAgIGV2ZW50cyA9IGV2ZW50TmFtZS5zcGxpdCgnICcpLm1hcCgoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICByZXR1cm4gbmFtZSArIFwiLmRlbGVnYXRlRXZlbnRzXCIgKyBfdGhpcy5jaWQ7XG4gICAgICAgIH07XG4gICAgICB9KSh0aGlzKSkuam9pbignICcpO1xuICAgICAgcmV0dXJuIHRoaXMuJGVsLm9mZihldmVudHMsIHNlbGVjdG9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGV2ZW50TmFtZSkge1xuICAgICAgICByZXR1cm4gVmlldy5fX3N1cGVyX18udW5kZWxlZ2F0ZS5jYWxsKHRoaXMsIGV2ZW50TmFtZSwgc2VsZWN0b3IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBWaWV3LnByb3RvdHlwZS5kZWxlZ2F0ZUxpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBldmVudE5hbWUsIGksIGosIGtleSwgbGVuLCBsZW4xLCBtZXRob2QsIHJlZiwgcmVmMSwgcmVmMiwgdGFyZ2V0LCB2ZXJzaW9uO1xuICAgIGlmICghdGhpcy5saXN0ZW4pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVmID0gdXRpbHMuZ2V0QWxsUHJvcGVydHlWZXJzaW9ucyh0aGlzLCAnbGlzdGVuJyk7XG4gICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2ZXJzaW9uID0gcmVmW2ldO1xuICAgICAgaWYgKHR5cGVvZiB2ZXJzaW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLmNhbGwodGhpcyk7XG4gICAgICB9XG4gICAgICByZWYxID0gT2JqZWN0LmtleXModmVyc2lvbik7XG4gICAgICBmb3IgKGogPSAwLCBsZW4xID0gcmVmMS5sZW5ndGg7IGogPCBsZW4xOyBqKyspIHtcbiAgICAgICAga2V5ID0gcmVmMVtqXTtcbiAgICAgICAgbWV0aG9kID0gdmVyc2lvbltrZXldO1xuICAgICAgICBpZiAodHlwZW9mIG1ldGhvZCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIG1ldGhvZCA9IHRoaXNbbWV0aG9kXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG1ldGhvZCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVmlldyNkZWxlZ2F0ZUxpc3RlbmVyczogJyArIChcImxpc3RlbmVyIGZvciBgXCIgKyBrZXkgKyBcImAgbXVzdCBiZSBmdW5jdGlvblwiKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVmMiA9IGtleS5zcGxpdCgnICcpLCBldmVudE5hbWUgPSByZWYyWzBdLCB0YXJnZXQgPSByZWYyWzFdO1xuICAgICAgICB0aGlzLmRlbGVnYXRlTGlzdGVuZXIoZXZlbnROYW1lLCB0YXJnZXQsIG1ldGhvZCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIFZpZXcucHJvdG90eXBlLmRlbGVnYXRlTGlzdGVuZXIgPSBmdW5jdGlvbihldmVudE5hbWUsIHRhcmdldCwgY2FsbGJhY2spIHtcbiAgICB2YXIgcHJvcDtcbiAgICBpZiAodGFyZ2V0ID09PSAnbW9kZWwnIHx8IHRhcmdldCA9PT0gJ2NvbGxlY3Rpb24nKSB7XG4gICAgICBwcm9wID0gdGhpc1t0YXJnZXRdO1xuICAgICAgaWYgKHByb3ApIHtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyhwcm9wLCBldmVudE5hbWUsIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRhcmdldCA9PT0gJ21lZGlhdG9yJykge1xuICAgICAgdGhpcy5zdWJzY3JpYmVFdmVudChldmVudE5hbWUsIGNhbGxiYWNrKTtcbiAgICB9IGVsc2UgaWYgKCF0YXJnZXQpIHtcbiAgICAgIHRoaXMub24oZXZlbnROYW1lLCBjYWxsYmFjaywgdGhpcyk7XG4gICAgfVxuICB9O1xuXG4gIFZpZXcucHJvdG90eXBlLnJlZ2lzdGVyUmVnaW9uID0gZnVuY3Rpb24obmFtZSwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gbWVkaWF0b3IuZXhlY3V0ZSgncmVnaW9uOnJlZ2lzdGVyJywgdGhpcywgbmFtZSwgc2VsZWN0b3IpO1xuICB9O1xuXG4gIFZpZXcucHJvdG90eXBlLnVucmVnaXN0ZXJSZWdpb24gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIG1lZGlhdG9yLmV4ZWN1dGUoJ3JlZ2lvbjp1bnJlZ2lzdGVyJywgdGhpcywgbmFtZSk7XG4gIH07XG5cbiAgVmlldy5wcm90b3R5cGUudW5yZWdpc3RlckFsbFJlZ2lvbnMgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbWVkaWF0b3IuZXhlY3V0ZSh7XG4gICAgICBuYW1lOiAncmVnaW9uOnVucmVnaXN0ZXInLFxuICAgICAgc2lsZW50OiB0cnVlXG4gICAgfSwgdGhpcyk7XG4gIH07XG5cbiAgVmlldy5wcm90b3R5cGUuc3VidmlldyA9IGZ1bmN0aW9uKG5hbWUsIHZpZXcpIHtcbiAgICB2YXIgYnlOYW1lLCBzdWJ2aWV3cztcbiAgICBzdWJ2aWV3cyA9IHRoaXMuc3Vidmlld3M7XG4gICAgYnlOYW1lID0gdGhpcy5zdWJ2aWV3c0J5TmFtZTtcbiAgICBpZiAobmFtZSAmJiB2aWV3KSB7XG4gICAgICB0aGlzLnJlbW92ZVN1YnZpZXcobmFtZSk7XG4gICAgICBzdWJ2aWV3cy5wdXNoKHZpZXcpO1xuICAgICAgYnlOYW1lW25hbWVdID0gdmlldztcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0gZWxzZSBpZiAobmFtZSkge1xuICAgICAgcmV0dXJuIGJ5TmFtZVtuYW1lXTtcbiAgICB9XG4gIH07XG5cbiAgVmlldy5wcm90b3R5cGUucmVtb3ZlU3VidmlldyA9IGZ1bmN0aW9uKG5hbWVPclZpZXcpIHtcbiAgICB2YXIgYnlOYW1lLCBpbmRleCwgbmFtZSwgc3Vidmlld3MsIHZpZXc7XG4gICAgaWYgKCFuYW1lT3JWaWV3KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHN1YnZpZXdzID0gdGhpcy5zdWJ2aWV3cztcbiAgICBieU5hbWUgPSB0aGlzLnN1YnZpZXdzQnlOYW1lO1xuICAgIGlmICh0eXBlb2YgbmFtZU9yVmlldyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBuYW1lT3JWaWV3O1xuICAgICAgdmlldyA9IGJ5TmFtZVtuYW1lXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmlldyA9IG5hbWVPclZpZXc7XG4gICAgICBPYmplY3Qua2V5cyhieU5hbWUpLnNvbWUoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmIChieU5hbWVba2V5XSA9PT0gdmlldykge1xuICAgICAgICAgIHJldHVybiBuYW1lID0ga2V5O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKCEobmFtZSAmJiAodmlldyAhPSBudWxsID8gdmlldy5kaXNwb3NlIDogdm9pZCAwKSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmlldy5kaXNwb3NlKCk7XG4gICAgaW5kZXggPSBzdWJ2aWV3cy5pbmRleE9mKHZpZXcpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIHN1YnZpZXdzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICAgIHJldHVybiBkZWxldGUgYnlOYW1lW25hbWVdO1xuICB9O1xuXG4gIFZpZXcucHJvdG90eXBlLmdldFRlbXBsYXRlRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBkYXRhLCBzb3VyY2U7XG4gICAgZGF0YSA9IHRoaXMubW9kZWwgPyB1dGlscy5zZXJpYWxpemUodGhpcy5tb2RlbCkgOiB0aGlzLmNvbGxlY3Rpb24gPyB7XG4gICAgICBpdGVtczogdXRpbHMuc2VyaWFsaXplKHRoaXMuY29sbGVjdGlvbiksXG4gICAgICBsZW5ndGg6IHRoaXMuY29sbGVjdGlvbi5sZW5ndGhcbiAgICB9IDoge307XG4gICAgc291cmNlID0gdGhpcy5tb2RlbCB8fCB0aGlzLmNvbGxlY3Rpb247XG4gICAgaWYgKHNvdXJjZSkge1xuICAgICAgaWYgKHR5cGVvZiBzb3VyY2UuaXNTeW5jZWQgPT09ICdmdW5jdGlvbicgJiYgISgnc3luY2VkJyBpbiBkYXRhKSkge1xuICAgICAgICBkYXRhLnN5bmNlZCA9IHNvdXJjZS5pc1N5bmNlZCgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfTtcblxuICBWaWV3LnByb3RvdHlwZS5nZXRUZW1wbGF0ZUZ1bmN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdWaWV3I2dldFRlbXBsYXRlRnVuY3Rpb24gbXVzdCBiZSBvdmVycmlkZGVuJyk7XG4gIH07XG5cbiAgVmlldy5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsLCBodG1sLCB0ZW1wbGF0ZUZ1bmM7XG4gICAgaWYgKHRoaXMuZGlzcG9zZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGVtcGxhdGVGdW5jID0gdGhpcy5nZXRUZW1wbGF0ZUZ1bmN0aW9uKCk7XG4gICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZUZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGh0bWwgPSB0ZW1wbGF0ZUZ1bmModGhpcy5nZXRUZW1wbGF0ZURhdGEoKSk7XG4gICAgICBpZiAodGhpcy5ub1dyYXApIHtcbiAgICAgICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZWwuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgaWYgKGVsLmNoaWxkcmVuLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIG11c3QgYmUgYSBzaW5nbGUgdG9wLWxldmVsIGVsZW1lbnQgJyArICd3aGVuIHVzaW5nIGBub1dyYXBgJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgICAgIHRoaXMuc2V0RWxlbWVudChlbC5maXJzdENoaWxkLCB0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNldEhUTUwodGhpcywgaHRtbCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIFZpZXcucHJvdG90eXBlLmF0dGFjaCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnJlZ2lvbiAhPSBudWxsKSB7XG4gICAgICBtZWRpYXRvci5leGVjdXRlKCdyZWdpb246c2hvdycsIHRoaXMucmVnaW9uLCB0aGlzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY29udGFpbmVyICYmICFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHRoaXMuZWwpKSB7XG4gICAgICBhdHRhY2godGhpcyk7XG4gICAgICByZXR1cm4gdGhpcy50cmlnZ2VyKCdhZGRlZFRvRE9NJyk7XG4gICAgfVxuICB9O1xuXG4gIFZpZXcucHJvdG90eXBlLmRpc3Bvc2VkID0gZmFsc2U7XG5cbiAgVmlldy5wcm90b3R5cGUuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpLCBqLCBsZW4sIGxlbjEsIHByb3AsIHJlZiwgcmVmMSwgc3VidmlldztcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnVucmVnaXN0ZXJBbGxSZWdpb25zKCk7XG4gICAgcmVmID0gdGhpcy5zdWJ2aWV3cztcbiAgICBmb3IgKGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHN1YnZpZXcgPSByZWZbaV07XG4gICAgICBzdWJ2aWV3LmRpc3Bvc2UoKTtcbiAgICB9XG4gICAgdGhpcy51bnN1YnNjcmliZUFsbEV2ZW50cygpO1xuICAgIHRoaXMub2ZmKCk7XG4gICAgaWYgKHRoaXMua2VlcEVsZW1lbnQpIHtcbiAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgICAgdGhpcy51bmRlbGVnYXRlKCk7XG4gICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICB9XG4gICAgcmVmMSA9IFsnZWwnLCAnJGVsJywgJ29wdGlvbnMnLCAnbW9kZWwnLCAnY29sbGVjdGlvbicsICdzdWJ2aWV3cycsICdzdWJ2aWV3c0J5TmFtZScsICdfY2FsbGJhY2tzJ107XG4gICAgZm9yIChqID0gMCwgbGVuMSA9IHJlZjEubGVuZ3RoOyBqIDwgbGVuMTsgaisrKSB7XG4gICAgICBwcm9wID0gcmVmMVtqXTtcbiAgICAgIGRlbGV0ZSB0aGlzW3Byb3BdO1xuICAgIH1cbiAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgfTtcblxuICByZXR1cm4gVmlldztcblxufSkoQmFja2JvbmUuTmF0aXZlVmlldyB8fCBCYWNrYm9uZS5WaWV3KTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0ptYVd4bElqb2lkbWxsZHk1cWN5SXNJbk52ZFhKalpWSnZiM1FpT2lJaUxDSnpiM1Z5WTJWeklqcGJJblpwWlhjdVkyOW1abVZsSWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk8wRkJRVUVzU1VGQlFTeHRSVUZCUVR0RlFVRkJPenM3TzBGQlJVRXNRMEZCUVN4SFFVRkpMRTlCUVVFc1EwRkJVU3haUVVGU096dEJRVU5LTEZGQlFVRXNSMEZCVnl4UFFVRkJMRU5CUVZFc1ZVRkJVanM3UVVGRldDeFhRVUZCTEVkQlFXTXNUMEZCUVN4RFFVRlJMSEZDUVVGU096dEJRVU5rTEV0QlFVRXNSMEZCVVN4UFFVRkJMRU5CUVZFc1kwRkJVanM3UVVGRFVpeFJRVUZCTEVkQlFWY3NUMEZCUVN4RFFVRlJMR0ZCUVZJN08wRkJSMVlzU1VGQlN6czdRVUZGVGl4UFFVRkJMRWRCUVdFc1EwRkJRU3hUUVVGQk8wVkJRMWdzU1VGQlJ5eERRVUZJTzFkQlEwVXNVMEZCUXl4SlFVRkVMRVZCUVU4c1NVRkJVRHROUVVORkxFbEJRVWtzUTBGQlF5eEhRVUZITEVOQlFVTXNTVUZCVkN4RFFVRmpMRWxCUVdRN1lVRkRRVHRKUVVaR0xFVkJSRVk3UjBGQlFTeE5RVUZCTzFkQlMwVXNVMEZCUXl4SlFVRkVMRVZCUVU4c1NVRkJVRHRoUVVORkxFbEJRVWtzUTBGQlF5eEZRVUZGTEVOQlFVTXNVMEZCVWl4SFFVRnZRanRKUVVSMFFpeEZRVXhHT3p0QlFVUlhMRU5CUVVFc1EwRkJTQ3hEUVVGQk96dEJRVk5XTEUxQlFVRXNSMEZCV1N4RFFVRkJMRk5CUVVFN1JVRkRWaXhKUVVGSExFTkJRVWc3VjBGRFJTeFRRVUZETEVsQlFVUTdRVUZEUlN4VlFVRkJPMDFCUVVFc1RVRkJRU3hIUVVGVExFTkJRVUVzUTBGQlJTeEpRVUZKTEVOQlFVTXNVMEZCVUR0TlFVTlVMRWxCUVVjc1QwRkJUeXhKUVVGSkxFTkJRVU1zWlVGQldpeExRVUVyUWl4VlFVRnNRenRsUVVORkxFbEJRVWtzUTBGQlF5eGxRVUZNTEVOQlFYRkNMRTFCUVhKQ0xFVkJRVFpDTEVsQlFVa3NRMEZCUXl4RlFVRnNReXhGUVVSR08wOUJRVUVzVFVGQlFUdGxRVWRGTEUxQlFVOHNRMEZCUVN4SlFVRkpMRU5CUVVNc1pVRkJUQ3hEUVVGUUxFTkJRVFpDTEVsQlFVa3NRMEZCUXl4RlFVRnNReXhGUVVoR096dEpRVVpHTEVWQlJFWTdSMEZCUVN4TlFVRkJPMWRCVVVVc1UwRkJReXhKUVVGRU8wRkJRMFVzVlVGQlFUdE5RVUZCTEUxQlFVRXNSMEZCV1N4UFFVRlBMRWxCUVVrc1EwRkJReXhUUVVGYUxFdEJRWGxDTEZGQlFUVkNMRWRCUTFBc1VVRkJVU3hEUVVGRExHRkJRVlFzUTBGQmRVSXNTVUZCU1N4RFFVRkRMRk5CUVRWQ0xFTkJSRThzUjBGSFVDeEpRVUZKTEVOQlFVTTdUVUZGVUN4SlFVRkhMRTlCUVU4c1NVRkJTU3hEUVVGRExHVkJRVm9zUzBGQkswSXNWVUZCYkVNN1pVRkRSU3hKUVVGSkxFTkJRVU1zWlVGQlRDeERRVUZ4UWl4TlFVRnlRaXhGUVVFMlFpeEpRVUZKTEVOQlFVTXNSVUZCYkVNc1JVRkVSanRQUVVGQkxFMUJRVUU3WlVGSFJTeE5RVUZQTEVOQlFVRXNTVUZCU1N4RFFVRkRMR1ZCUVV3c1EwRkJVQ3hEUVVFMlFpeEpRVUZKTEVOQlFVTXNSVUZCYkVNc1JVRklSanM3U1VGT1JpeEZRVkpHT3p0QlFVUlZMRU5CUVVFc1EwRkJTQ3hEUVVGQk96dEJRVzlDVkN4TlFVRk5MRU5CUVVNc1QwRkJVQ3hIUVVGMVFqczdPMFZCUlhKQ0xFTkJRVU1zUTBGQlF5eE5RVUZHTEVOQlFWTXNTVUZCUXl4RFFVRkJMRk5CUVZZc1JVRkJjVUlzVjBGQmNrSTdPMmxDUVU5QkxGVkJRVUVzUjBGQldUczdhVUpCUjFvc1ZVRkJRU3hIUVVGWk96dHBRa0ZYV2l4VFFVRkJMRWRCUVZjN08ybENRVWxZTEdWQlFVRXNSMEZCYjBJc1EwRkJTQ3hIUVVGVkxGRkJRVllzUjBGQmQwSTdPMmxDUVZsNlF5eFBRVUZCTEVkQlFWTTdPMmxDUVU5VUxFMUJRVUVzUjBGQlVUczdhVUpCU1ZJc1MwRkJRU3hIUVVGUE96dHBRa0ZKVUN4TlFVRkJMRWRCUVZFN08ybENRVWRTTEZkQlFVRXNSMEZCWVRzN2FVSkJUV0lzVVVGQlFTeEhRVUZWT3p0cFFrRkRWaXhqUVVGQkxFZEJRV2RDT3p0cFFrRlBhRUlzVjBGQlFTeEhRVUZoTEVOQlExZ3NXVUZFVnl4RlFVTkhMRmxCUkVnc1JVRkZXQ3hYUVVaWExFVkJSVVVzYVVKQlJrWXNSVUZIV0N4UlFVaFhMRVZCUjBRc1UwRklReXhGUVVsWUxGRkJTbGM3TzBWQlQwRXNZMEZCUXl4UFFVRkVPMEZCUlZnc1VVRkJRVHM3VFVGR1dTeFZRVUZWT3p0QlFVVjBRanRCUVVGQkxGTkJRVUVzY1VOQlFVRTdPMDFCUTBVc1NVRkJSeXhoUVVGUExFbEJRVU1zUTBGQlFTeFhRVUZTTEVWQlFVRXNSMEZCUVN4TlFVRklPMUZCUTBVc1NVRkJSU3hEUVVGQkxFZEJRVUVzUTBGQlJpeEhRVUZUTEU5QlFWRXNRMEZCUVN4SFFVRkJMRVZCUkc1Q096dEJRVVJHTzBsQlRVRXNUVUZCUVN4SFFVRlRMRWxCUVVNc1EwRkJRVHRKUVVWV0xFbEJRVU1zUTBGQlFTeE5RVUZFTEVkQlFWVXNVMEZCUVR0QlFVVlNMRlZCUVVFN1RVRkJRU3hKUVVGblFpeEpRVUZETEVOQlFVRXNVVUZCYWtJN1FVRkJRU3hsUVVGUExFMUJRVkE3TzAxQlJVRXNWMEZCUVN4SFFVRmpMRTFCUVUwc1EwRkJReXhMUVVGUUxFTkJRV0VzU1VGQllpeEZRVUZ0UWl4VFFVRnVRanROUVVWa0xFbEJRWGRDTEVsQlFVTXNRMEZCUVN4VlFVRjZRanRSUVVGQkxFbEJRVU1zUTBGQlFTeE5RVUZFTEdGQlFWRXNVMEZCVWl4RlFVRkJPenRoUVVWQk8wbEJVbEU3U1VGWFZpeEpRVUZETEVOQlFVRXNVVUZCUkN4SFFVRlpPMGxCUTFvc1NVRkJReXhEUVVGQkxHTkJRVVFzUjBGQmEwSTdTVUZGYkVJc1NVRkJSeXhKUVVGRExFTkJRVUVzVFVGQlNqdE5RVU5GTEVsQlFVY3NTVUZCUXl4RFFVRkJMRTFCUVVvN1VVRkRSU3hOUVVGQkxFZEJRVk1zVVVGQlVTeERRVUZETEU5QlFWUXNRMEZCYVVJc1lVRkJha0lzUlVGQlowTXNTVUZCUXl4RFFVRkJMRTFCUVdwRE8xRkJSVlFzU1VGQlJ5eGpRVUZJTzFWQlEwVXNTVUZCUXl4RFFVRkJMRVZCUVVRc1IwRkRTeXhwUTBGQlNDeEhRVU5MTERoQ1FVRklMRWRCUTBVc1EwRkJRU3hEUVVGRkxFMUJRVTBzUTBGQlF5eFJRVUZSTEVOQlFVTXNVMEZCYkVJc1EwRkJORUlzUTBGQlF5eEpRVUUzUWl4RFFVRnJReXhOUVVGTkxFTkJRVU1zVVVGQmVrTXNRMEZFUml4SFFVZEZMRTFCUVUwc1EwRkJReXhSUVVGUkxFTkJRVU1zVTBGS2NFSXNSMEZOUlN4TlFVRk5MRU5CUVVNc1VVRkJVU3hEUVVGRExFTkJRV2hDTEVOQlFXdENMRTFCUVUwc1EwRkJReXhSUVVGNlFpeEZRVkpPTzFOQlNFWTdPMDFCWVVFc1NVRkJiMElzU1VGQlF5eERRVUZCTEZOQlFYSkNPMUZCUVVFc1NVRkJReXhEUVVGQkxFVkJRVVFzUjBGQlRTeEpRVUZETEVOQlFVRXNWVUZCVUR0UFFXUkdPenRKUVdsQ1FTeDFRMEZCUVN4VFFVRkJPMGxCU1VFc1NVRkJReXhEUVVGQkxHbENRVUZFTEVOQlFVRTdTVUZKUVN4SlFVRjVReXhKUVVGRExFTkJRVUVzUzBGQk1VTTdUVUZCUVN4SlFVRkRMRU5CUVVFc1VVRkJSQ3hEUVVGVkxFbEJRVU1zUTBGQlFTeExRVUZZTEVWQlFXdENMRk5CUVd4Q0xFVkJRVFpDTEVsQlFVTXNRMEZCUVN4UFFVRTVRaXhGUVVGQk96dEpRVU5CTEVsQlFVY3NTVUZCUXl4RFFVRkJMRlZCUVVvN1RVRkRSU3hKUVVGRExFTkJRVUVzVVVGQlJDeERRVUZWTEVsQlFVTXNRMEZCUVN4VlFVRllMRVZCUVhWQ0xGTkJRWFpDTEVWQlFXdERMRU5CUVVFc1UwRkJRU3hMUVVGQk8yVkJRVUVzVTBGQlF5eFBRVUZFTzFWQlEyaERMRWxCUVdNc1EwRkJTU3hQUVVGS0xFbEJRV1VzVDBGQlFTeExRVUZYTEV0QlFVTXNRMEZCUVN4VlFVRjZRenR0UWtGQlFTeExRVUZETEVOQlFVRXNUMEZCUkN4RFFVRkJMRVZCUVVFN08xRkJSR2RETzAxQlFVRXNRMEZCUVN4RFFVRkJMRU5CUVVFc1NVRkJRU3hEUVVGc1F5eEZRVVJHT3p0SlFVdEJMRWxCUVRSRExHOUNRVUUxUXp0TlFVRkJMRkZCUVZFc1EwRkJReXhQUVVGVUxFTkJRV2xDTEdsQ1FVRnFRaXhGUVVGdlF5eEpRVUZ3UXl4RlFVRkJPenRKUVVkQkxFbEJRV0VzU1VGQlF5eERRVUZCTEZWQlFXUTdUVUZCUVN4SlFVRkRMRU5CUVVFc1RVRkJSQ3hEUVVGQkxFVkJRVUU3TzBWQk1VUlhPenRwUWtFMFJHSXNTVUZCUVN4SFFVRk5MRk5CUVVNc1VVRkJSRHRKUVVOS0xFbEJRVWNzUTBGQlNEdGhRVU5GTEVsQlFVTXNRMEZCUVN4SFFVRkhMRU5CUVVNc1NVRkJUQ3hEUVVGVkxGRkJRVllzUlVGRVJqdExRVUZCTEUxQlFVRTdZVUZIUlN4SlFVRkRMRU5CUVVFc1JVRkJSU3hEUVVGRExHRkJRVW9zUTBGQmEwSXNVVUZCYkVJc1JVRklSanM3UlVGRVNUczdhVUpCYlVKT0xGRkJRVUVzUjBGQlZTeFRRVUZETEZOQlFVUXNSVUZCV1N4TlFVRmFMRVZCUVc5Q0xFdEJRWEJDTzBGQlExSXNVVUZCUVR0SlFVRkJMRWxCUVVjc1QwRkJUeXhUUVVGUUxFdEJRWE5DTEZGQlFYcENPMEZCUTBVc1dVRkJUU3hKUVVGSkxGTkJRVW9zUTBGQll5eG5SRUZCWkN4RlFVUlNPenRCUVVkQkxGbEJRVThzVTBGQlV5eERRVUZETEUxQlFXcENPMEZCUVVFc1YwRkRUeXhEUVVSUU8xRkJSVWtzVDBGQlFTeEhRVUZWTzBGQlJGQTdRVUZFVUN4WFFVZFBMRU5CU0ZBN1VVRkpTU3hSUVVGQkxFZEJRVmM3VVVGRFdDeFBRVUZCTEVkQlFWVTdVVUZEVml4SlFVRkhMRTlCUVU4c1VVRkJVQ3hMUVVGeFFpeFJRVUY0UWp0QlFVTkZMR2RDUVVGTkxFbEJRVWtzVTBGQlNpeERRVUZqTEdsQ1FVRkJMRWRCUTJ4Q0xHdERRVVJKTEVWQlJGSTdPMEZCU0VjN1FVRklVRHRCUVZWSkxHTkJRVTBzU1VGQlNTeFRRVUZLTEVOQlFXTXNhVUpCUVVFc1IwRkRiRUlzZVVOQlJFazdRVUZXVmp0SlFXRkJMRWxCUVVjc1QwRkJUeXhQUVVGUUxFdEJRVzlDTEZWQlFYWkNPMEZCUTBVc1dVRkJUU3hKUVVGSkxGTkJRVW9zUTBGQll5eHBRa0ZCUVN4SFFVTnNRaXh0UTBGRVNTeEZRVVJTT3p0SlFVMUJMRXRCUVVFc1IwRkJVU3hQUVVGUExFTkJRVU1zU1VGQlVpeERRVUZoTEVsQlFXSTdTVUZGVWl4SlFVRkhMRU5CUVVnN1RVRkRSU3hOUVVGQkxFZEJRVk1zVTBGRFVDeERRVUZETEV0QlJFMHNRMEZEUVN4SFFVUkJMRU5CUlZBc1EwRkJReXhIUVVaTkxFTkJSVVlzUTBGQlFTeFRRVUZCTEV0QlFVRTdaVUZCUVN4VFFVRkRMRWxCUVVRN2FVSkJRV0VzU1VGQlJDeEhRVUZOTEdsQ1FVRk9MRWRCUVhWQ0xFdEJRVU1zUTBGQlFUdFJRVUZ3UXp0TlFVRkJMRU5CUVVFc1EwRkJRU3hEUVVGQkxFbEJRVUVzUTBGR1JTeERRVWRRTEVOQlFVTXNTVUZJVFN4RFFVZEVMRWRCU0VNN1RVRkxWQ3hKUVVGRExFTkJRVUVzUjBGQlJ5eERRVUZETEVWQlFVd3NRMEZCVVN4TlFVRlNMRVZCUVdkQ0xGRkJRV2hDTEVWQlFUQkNMRXRCUVRGQ0xFVkJUa1k3UzBGQlFTeE5RVUZCTzBGQlVVVTdRVUZCUVN4WFFVRkJMSEZEUVVGQk96dFJRVU5GTEcxRFFVRk5MRXRCUVU0c1JVRkJZU3hSUVVGaUxFVkJRWFZDTEV0QlFYWkNPMEZCUkVZc1QwRlNSanM3VjBGWlFUdEZRWEpEVVRzN2FVSkJkME5XTEdWQlFVRXNSMEZCYVVJc1UwRkJReXhOUVVGRU8wRkJRMllzVVVGQlFUdEJRVUZCTzBGQlFVRXNVMEZCUVN4eFEwRkJRVHM3VFVGRFJTeExRVUZCTEVkQlFWRXNUVUZCVHl4RFFVRkJMRWRCUVVFN1RVRkRaaXhQUVVGQkxFZEJRV0VzVDBGQlR5eExRVUZRTEV0QlFXZENMRlZCUVc1Q0xFZEJRVzFETEV0QlFXNURMRWRCUVRoRExFbEJRVVVzUTBGQlFTeExRVUZCTzAxQlF6RkVMRWxCUVVFc1EwRkJNRVFzVDBGQk1VUTdRVUZCUVN4alFVRk5MRWxCUVVrc1MwRkJTaXhEUVVGVkxGVkJRVUVzUjBGQlZ5eExRVUZZTEVkQlFXbENMR3RDUVVFelFpeEZRVUZPT3p0TlFVVkJMRXRCUVVFc1IwRkJVU3huUWtGQlowSXNRMEZCUXl4SlFVRnFRaXhEUVVGelFpeEhRVUYwUWp0TlFVTlNMRWxCUVVNc1EwRkJRU3hSUVVGRUxFTkJRVlVzUzBGQlRTeERRVUZCTEVOQlFVRXNRMEZCYUVJc1JVRkJiMElzUzBGQlRTeERRVUZCTEVOQlFVRXNRMEZCTVVJc1JVRkJPRUlzVDBGQk9VSTdRVUZPUmp0RlFVUmxPenRwUWtGaGFrSXNZMEZCUVN4SFFVRm5RaXhUUVVGRExFMUJRVVFzUlVGQlV5eFBRVUZVTzBGQlEyUXNVVUZCUVR0SlFVRkJMRWxCUVVFc1EwRkJNa0lzVDBGQk0wSTdUVUZCUVN4SlFVRkRMRU5CUVVFc1owSkJRVVFzUTBGQlFTeEZRVUZCT3p0SlFVTkJMRWxCUVd0RExFMUJRV3hETzBGQlFVRXNZVUZCVHl4SlFVRkRMRU5CUVVFc1pVRkJSQ3hEUVVGcFFpeE5RVUZxUWl4RlFVRlFPenRCUVVWQk8wRkJRVUVzVTBGQlFTeHhRMEZCUVRzN1RVRkRSU3hKUVVGMVF5eFBRVUZQTEZkQlFWQXNTMEZCYzBJc1ZVRkJOMFE3VVVGQlFTeFhRVUZCTEVkQlFXTXNWMEZCVnl4RFFVRkRMRWxCUVZvc1EwRkJhVUlzU1VGQmFrSXNSVUZCWkRzN1RVRkRRU3hKUVVGRExFTkJRVUVzWlVGQlJDeERRVUZwUWl4WFFVRnFRanRCUVVaR08wVkJTbU03TzJsQ1FWZG9RaXhWUVVGQkxFZEJRVmtzVTBGQlF5eFRRVUZFTEVWQlFXbENMRTFCUVdwQ08wRkJRMVlzVVVGQlFUczdUVUZFVnl4WlFVRlpPenRKUVVOMlFpeEpRVUZITEU5QlFVOHNVMEZCVUN4TFFVRnpRaXhSUVVGNlFqdEJRVU5GTEZsQlFVMHNTVUZCU1N4VFFVRktMRU5CUVdNc2EwUkJRV1FzUlVGRVVqczdRVUZIUVN4WlFVRlBMRk5CUVZNc1EwRkJReXhOUVVGcVFqdEJRVUZCTEZkQlEwOHNRMEZFVUR0UlFVVkpMRWxCUVhGQ0xFOUJRVThzVFVGQlVDeExRVUZwUWl4UlFVRjBRenRWUVVGQkxGRkJRVUVzUjBGQlZ5eFBRVUZZT3p0QlFVUkhPMEZCUkZBc1YwRkhUeXhEUVVoUU8xRkJTVWtzVVVGQlFTeEhRVUZYTzFGQlExZ3NTVUZCUnl4UFFVRlBMRkZCUVZBc1MwRkJjVUlzVVVGQmVFSTdRVUZEUlN4blFrRkJUU3hKUVVGSkxGTkJRVW9zUTBGQll5eHRRa0ZCUVN4SFFVTnNRaXhyUTBGRVNTeEZRVVJTT3p0QlFVeEtPMGxCVTBFc1NVRkJSeXhEUVVGSU8wMUJRMFVzVFVGQlFTeEhRVUZUTEZOQlExQXNRMEZCUXl4TFFVUk5MRU5CUTBFc1IwRkVRU3hEUVVWUUxFTkJRVU1zUjBGR1RTeERRVVZHTEVOQlFVRXNVMEZCUVN4TFFVRkJPMlZCUVVFc1UwRkJReXhKUVVGRU8ybENRVUZoTEVsQlFVUXNSMEZCVFN4cFFrRkJUaXhIUVVGMVFpeExRVUZETEVOQlFVRTdVVUZCY0VNN1RVRkJRU3hEUVVGQkxFTkJRVUVzUTBGQlFTeEpRVUZCTEVOQlJrVXNRMEZIVUN4RFFVRkRMRWxCU0Uwc1EwRkhSQ3hIUVVoRE8yRkJTMVFzU1VGQlF5eERRVUZCTEVkQlFVY3NRMEZCUXl4SFFVRk1MRU5CUVZNc1RVRkJWQ3hGUVVGcFFpeFJRVUZxUWl4RlFVNUdPMHRCUVVFc1RVRkJRVHROUVZGRkxFbEJRVWNzVTBGQlNEdGxRVU5GTEhGRFFVRk5MRk5CUVU0c1JVRkJhVUlzVVVGQmFrSXNSVUZFUmp0UFFVRkJMRTFCUVVFN1pVRkhSU3hKUVVGRExFTkJRVUVzWjBKQlFVUXNRMEZCUVN4RlFVaEdPMDlCVWtZN08wVkJZbFU3TzJsQ1FUSkNXaXhwUWtGQlFTeEhRVUZ0UWl4VFFVRkJPMEZCUTJwQ0xGRkJRVUU3U1VGQlFTeEpRVUZCTEVOQlFXTXNTVUZCUXl4RFFVRkJMRTFCUVdZN1FVRkJRU3hoUVVGQk96dEJRVWRCTzBGQlFVRXNVMEZCUVN4eFEwRkJRVHM3VFVGRFJTeEpRVUVyUWl4UFFVRlBMRTlCUVZBc1MwRkJhMElzVlVGQmFrUTdVVUZCUVN4UFFVRkJMRWRCUVZVc1QwRkJUeXhEUVVGRExFbEJRVklzUTBGQllTeEpRVUZpTEVWQlFWWTdPMEZCUTBFN1FVRkJRU3hYUVVGQkxIZERRVUZCT3p0UlFVVkZMRTFCUVVFc1IwRkJVeXhQUVVGUkxFTkJRVUVzUjBGQlFUdFJRVU5xUWl4SlFVRkhMRTlCUVU4c1RVRkJVQ3hMUVVGdFFpeFZRVUYwUWp0VlFVTkZMRTFCUVVFc1IwRkJVeXhKUVVGRkxFTkJRVUVzVFVGQlFTeEZRVVJpT3p0UlFVVkJMRWxCUVVjc1QwRkJUeXhOUVVGUUxFdEJRVzFDTEZWQlFYUkNPMEZCUTBVc1owSkJRVTBzU1VGQlNTeExRVUZLTEVOQlFWVXNNRUpCUVVFc1IwRkRaQ3hEUVVGQkxHZENRVUZCTEVkQlFXbENMRWRCUVdwQ0xFZEJRWEZDTEc5Q1FVRnlRaXhEUVVSSkxFVkJSRkk3TzFGQlMwRXNUMEZCYzBJc1IwRkJSeXhEUVVGRExFdEJRVW9zUTBGQlZTeEhRVUZXTEVOQlFYUkNMRVZCUVVNc2JVSkJRVVFzUlVGQldUdFJRVU5hTEVsQlFVTXNRMEZCUVN4blFrRkJSQ3hEUVVGclFpeFRRVUZzUWl4RlFVRTJRaXhOUVVFM1FpeEZRVUZ4UXl4TlFVRnlRenRCUVZoR08wRkJSa1k3UlVGS2FVSTdPMmxDUVhGQ2JrSXNaMEpCUVVFc1IwRkJhMElzVTBGQlF5eFRRVUZFTEVWQlFWa3NUVUZCV2l4RlFVRnZRaXhSUVVGd1FqdEJRVU5vUWl4UlFVRkJPMGxCUVVFc1NVRkJSeXhOUVVGQkxFdEJRVmNzVDBGQldDeEpRVUZCTEUxQlFVRXNTMEZCYjBJc1dVRkJka0k3VFVGRFJTeEpRVUZCTEVkQlFVOHNTVUZCUlN4RFFVRkJMRTFCUVVFN1RVRkRWQ3hKUVVGMVF5eEpRVUYyUXp0UlFVRkJMRWxCUVVNc1EwRkJRU3hSUVVGRUxFTkJRVlVzU1VGQlZpeEZRVUZuUWl4VFFVRm9RaXhGUVVFeVFpeFJRVUV6UWl4RlFVRkJPMDlCUmtZN1MwRkJRU3hOUVVkTExFbEJRVWNzVFVGQlFTeExRVUZWTEZWQlFXSTdUVUZEU0N4SlFVRkRMRU5CUVVFc1kwRkJSQ3hEUVVGblFpeFRRVUZvUWl4RlFVRXlRaXhSUVVFelFpeEZRVVJITzB0QlFVRXNUVUZGUVN4SlFVRkhMRU5CUVVrc1RVRkJVRHROUVVOSUxFbEJRVU1zUTBGQlFTeEZRVUZFTEVOQlFVa3NVMEZCU2l4RlFVRmxMRkZCUVdZc1JVRkJlVUlzU1VGQmVrSXNSVUZFUnpzN1JVRk9WenM3YVVKQlpXeENMR05CUVVFc1IwRkJaMElzVTBGQlF5eEpRVUZFTEVWQlFVOHNVVUZCVUR0WFFVTmtMRkZCUVZFc1EwRkJReXhQUVVGVUxFTkJRV2xDTEdsQ1FVRnFRaXhGUVVGdlF5eEpRVUZ3UXl4RlFVRXdReXhKUVVFeFF5eEZRVUZuUkN4UlFVRm9SRHRGUVVSak96dHBRa0ZKYUVJc1owSkJRVUVzUjBGQmEwSXNVMEZCUXl4SlFVRkVPMWRCUTJoQ0xGRkJRVkVzUTBGQlF5eFBRVUZVTEVOQlFXbENMRzFDUVVGcVFpeEZRVUZ6UXl4SlFVRjBReXhGUVVFMFF5eEpRVUUxUXp0RlFVUm5RanM3YVVKQlNXeENMRzlDUVVGQkxFZEJRWE5DTEZOQlFVRTdWMEZEY0VJc1VVRkJVU3hEUVVGRExFOUJRVlFzUTBGQmFVSTdUVUZCUVN4SlFVRkJMRVZCUVUwc2JVSkJRVTQ3VFVGQk1rSXNUVUZCUVN4RlFVRlJMRWxCUVc1RE8wdEJRV3BDTEVWQlFUQkVMRWxCUVRGRU8wVkJSRzlDT3p0cFFrRlBkRUlzVDBGQlFTeEhRVUZUTEZOQlFVTXNTVUZCUkN4RlFVRlBMRWxCUVZBN1FVRkZVQ3hSUVVGQk8wbEJRVUVzVVVGQlFTeEhRVUZYTEVsQlFVTXNRMEZCUVR0SlFVTmFMRTFCUVVFc1IwRkJVeXhKUVVGRExFTkJRVUU3U1VGRlZpeEpRVUZITEVsQlFVRXNTVUZCVXl4SlFVRmFPMDFCUlVVc1NVRkJReXhEUVVGQkxHRkJRVVFzUTBGQlpTeEpRVUZtTzAxQlEwRXNVVUZCVVN4RFFVRkRMRWxCUVZRc1EwRkJZeXhKUVVGa08wMUJRMEVzVFVGQlR5eERRVUZCTEVsQlFVRXNRMEZCVUN4SFFVRmxPMkZCUTJZc1MwRk1SanRMUVVGQkxFMUJUVXNzU1VGQlJ5eEpRVUZJTzJGQlJVZ3NUVUZCVHl4RFFVRkJMRWxCUVVFc1JVRkdTanM3UlVGWVJUczdhVUpCWjBKVUxHRkJRVUVzUjBGQlpTeFRRVUZETEZWQlFVUTdRVUZEWWl4UlFVRkJPMGxCUVVFc1NVRkJRU3hEUVVGakxGVkJRV1E3UVVGQlFTeGhRVUZCT3p0SlFVTkJMRkZCUVVFc1IwRkJWeXhKUVVGRExFTkJRVUU3U1VGRFdpeE5RVUZCTEVkQlFWTXNTVUZCUXl4RFFVRkJPMGxCUlZZc1NVRkJSeXhQUVVGUExGVkJRVkFzUzBGQmNVSXNVVUZCZUVJN1RVRkZSU3hKUVVGQkxFZEJRVTg3VFVGRFVDeEpRVUZCTEVkQlFVOHNUVUZCVHl4RFFVRkJMRWxCUVVFc1JVRklhRUk3UzBGQlFTeE5RVUZCTzAxQlRVVXNTVUZCUVN4SFFVRlBPMDFCUTFBc1RVRkJUU3hEUVVGRExFbEJRVkFzUTBGQldTeE5RVUZhTEVOQlFXMUNMRU5CUVVNc1NVRkJjRUlzUTBGQmVVSXNVMEZCUXl4SFFVRkVPMUZCUTNaQ0xFbEJRV01zVFVGQlR5eERRVUZCTEVkQlFVRXNRMEZCVUN4TFFVRmxMRWxCUVRkQ08ybENRVUZCTEVsQlFVRXNSMEZCVHl4SlFVRlFPenROUVVSMVFpeERRVUY2UWl4RlFWQkdPenRKUVZkQkxFbEJRVUVzUTBGQlFTeERRVUZqTEVsQlFVRXNiMEpCUVZNc1NVRkJTU3hEUVVGRkxHbENRVUUzUWl4RFFVRkJPMEZCUVVFc1lVRkJRVHM3U1VGSFFTeEpRVUZKTEVOQlFVTXNUMEZCVEN4RFFVRkJPMGxCUjBFc1MwRkJRU3hIUVVGUkxGRkJRVkVzUTBGQlF5eFBRVUZVTEVOQlFXbENMRWxCUVdwQ08wbEJRMUlzU1VGQk5FSXNTMEZCUVN4TFFVRlhMRU5CUVVNc1EwRkJlRU03VFVGQlFTeFJRVUZSTEVOQlFVTXNUVUZCVkN4RFFVRm5RaXhMUVVGb1FpeEZRVUYxUWl4RFFVRjJRaXhGUVVGQk96dFhRVU5CTEU5QlFVOHNUVUZCVHl4RFFVRkJMRWxCUVVFN1JVRjRRa1E3TzJsQ1FTdENaaXhsUVVGQkxFZEJRV2xDTEZOQlFVRTdRVUZEWml4UlFVRkJPMGxCUVVFc1NVRkJRU3hIUVVGVkxFbEJRVU1zUTBGQlFTeExRVUZLTEVkQlEwd3NTMEZCU3l4RFFVRkRMRk5CUVU0c1EwRkJaMElzU1VGQlF5eERRVUZCTEV0QlFXcENMRU5CUkVzc1IwRkZReXhKUVVGRExFTkJRVUVzVlVGQlNpeEhRVU5JTzAxQlFVTXNTMEZCUVN4RlFVRlBMRXRCUVVzc1EwRkJReXhUUVVGT0xFTkJRV2RDTEVsQlFVTXNRMEZCUVN4VlFVRnFRaXhEUVVGU08wMUJRWE5ETEUxQlFVRXNSVUZCVVN4SlFVRkRMRU5CUVVFc1ZVRkJWU3hEUVVGRExFMUJRVEZFTzB0QlJFY3NSMEZIU0R0SlFVVkdMRTFCUVVFc1IwRkJVeXhKUVVGRExFTkJRVUVzUzBGQlJDeEpRVUZWTEVsQlFVTXNRMEZCUVR0SlFVTndRaXhKUVVGSExFMUJRVWc3VFVGSFJTeEpRVUZITEU5QlFVOHNUVUZCVFN4RFFVRkRMRkZCUVdRc1MwRkJNRUlzVlVGQk1VSXNTVUZCZVVNc1EwRkJTU3hEUVVGRExGRkJRVUVzU1VGQldTeEpRVUZpTEVOQlFXaEVPMUZCUTBVc1NVRkJTU3hEUVVGRExFMUJRVXdzUjBGQll5eE5RVUZOTEVOQlFVTXNVVUZCVUN4RFFVRkJMRVZCUkdoQ08wOUJTRVk3TzFkQlRVRTdSVUZtWlRzN2FVSkJhMEpxUWl4dFFrRkJRU3hIUVVGeFFpeFRRVUZCTzBGQldXNUNMRlZCUVUwc1NVRkJTU3hMUVVGS0xFTkJRVlVzTmtOQlFWWTdSVUZhWVRzN2FVSkJaMEp5UWl4TlFVRkJMRWRCUVZFc1UwRkJRVHRCUVVsT0xGRkJRVUU3U1VGQlFTeEpRVUZuUWl4SlFVRkRMRU5CUVVFc1VVRkJha0k3UVVGQlFTeGhRVUZQTEUxQlFWQTdPMGxCUlVFc1dVRkJRU3hIUVVGbExFbEJRVU1zUTBGQlFTeHRRa0ZCUkN4RFFVRkJPMGxCUldZc1NVRkJSeXhQUVVGUExGbEJRVkFzUzBGQmRVSXNWVUZCTVVJN1RVRkZSU3hKUVVGQkxFZEJRVThzV1VGQlFTeERRVUZoTEVsQlFVTXNRMEZCUVN4bFFVRkVMRU5CUVVFc1EwRkJZanROUVVkUUxFbEJRVWNzU1VGQlF5eERRVUZCTEUxQlFVbzdVVUZEUlN4RlFVRkJMRWRCUVVzc1VVRkJVU3hEUVVGRExHRkJRVlFzUTBGQmRVSXNTMEZCZGtJN1VVRkRUQ3hGUVVGRkxFTkJRVU1zVTBGQlNDeEhRVUZsTzFGQlJXWXNTVUZCUnl4RlFVRkZMRU5CUVVNc1VVRkJVU3hEUVVGRExFMUJRVm9zUjBGQmNVSXNRMEZCZUVJN1FVRkRSU3huUWtGQlRTeEpRVUZKTEV0QlFVb3NRMEZCVlN3eVEwRkJRU3hIUVVOa0xIRkNRVVJKTEVWQlJGSTdPMUZCUzBFc1NVRkJReXhEUVVGQkxHZENRVUZFTEVOQlFVRTdVVUZGUVN4SlFVRkRMRU5CUVVFc1ZVRkJSQ3hEUVVGWkxFVkJRVVVzUTBGQlF5eFZRVUZtTEVWQlFUSkNMRWxCUVROQ0xFVkJXRVk3VDBGQlFTeE5RVUZCTzFGQllVVXNUMEZCUVN4RFFVRlJMRWxCUVZJc1JVRkJZeXhKUVVGa0xFVkJZa1k3VDBGTVJqczdWMEZ4UWtFN1JVRTNRazA3TzJsQ1FXZERVaXhOUVVGQkxFZEJRVkVzVTBGQlFUdEpRVVZPTEVsQlFXbEVMRzFDUVVGcVJEdE5RVUZCTEZGQlFWRXNRMEZCUXl4UFFVRlVMRU5CUVdsQ0xHRkJRV3BDTEVWQlFXZERMRWxCUVVNc1EwRkJRU3hOUVVGcVF5eEZRVUY1UXl4SlFVRjZReXhGUVVGQk96dEpRVWRCTEVsQlFVY3NTVUZCUXl4RFFVRkJMRk5CUVVRc1NVRkJaU3hEUVVGSkxGRkJRVkVzUTBGQlF5eEpRVUZKTEVOQlFVTXNVVUZCWkN4RFFVRjFRaXhKUVVGRExFTkJRVUVzUlVGQmVFSXNRMEZCZEVJN1RVRkRSU3hOUVVGQkxFTkJRVThzU1VGQlVEdGhRVVZCTEVsQlFVTXNRMEZCUVN4UFFVRkVMRU5CUVZNc1dVRkJWQ3hGUVVoR096dEZRVXhOT3p0cFFrRmhVaXhSUVVGQkxFZEJRVlU3TzJsQ1FVVldMRTlCUVVFc1IwRkJVeXhUUVVGQk8wRkJRMUFzVVVGQlFUdEpRVUZCTEVsQlFWVXNTVUZCUXl4RFFVRkJMRkZCUVZnN1FVRkJRU3hoUVVGQk96dEpRVWRCTEVsQlFVTXNRMEZCUVN4dlFrRkJSQ3hEUVVGQk8wRkJSMEU3UVVGQlFTeFRRVUZCTEhGRFFVRkJPenROUVVGQkxFOUJRVThzUTBGQlF5eFBRVUZTTEVOQlFVRTdRVUZCUVR0SlFVZEJMRWxCUVVNc1EwRkJRU3h2UWtGQlJDeERRVUZCTzBsQlIwRXNTVUZCUXl4RFFVRkJMRWRCUVVRc1EwRkJRVHRKUVVkQkxFbEJRVWNzU1VGQlF5eERRVUZCTEZkQlFVbzdUVUZGUlN4SlFVRkRMRU5CUVVFc1owSkJRVVFzUTBGQlFUdE5RVU5CTEVsQlFVTXNRMEZCUVN4VlFVRkVMRU5CUVVFN1RVRkZRU3hKUVVGRExFTkJRVUVzWVVGQlJDeERRVUZCTEVWQlRFWTdTMEZCUVN4TlFVRkJPMDFCVTBVc1NVRkJReXhEUVVGQkxFMUJRVVFzUTBGQlFTeEZRVlJHT3p0QlFXRkJPMEZCUVVFc1UwRkJRU3gzUTBGQlFUczdUVUZCUVN4UFFVRlBMRWxCUVVzc1EwRkJRU3hKUVVGQk8wRkJRVm83U1VGUlFTeEpRVUZETEVOQlFVRXNVVUZCUkN4SFFVRlpPMWRCUjFvc1RVRkJUU3hEUVVGRExFMUJRVkFzUTBGQll5eEpRVUZrTzBWQmVFTlBPenM3TzBkQk0yRjVRaXhSUVVGUkxFTkJRVU1zVlVGQlZDeEpRVUYxUWl4UlFVRlJMRU5CUVVNaWZRPT1cbiJdfQ==
return require(1);
}))