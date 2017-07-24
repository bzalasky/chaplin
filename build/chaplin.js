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
    var item, name;
    if (value == null) {
      return this._stale;
    }
    this._stale = value;
    for (name in this) {
      item = this[name];
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
    var define, enqueue, require;
    define = window.define, require = window.require;
    if (typeof define === 'function' && define.amd) {
      return function(moduleName, handler) {
        return require([moduleName], handler);
      };
    } else {
      enqueue = typeof setImmediate !== "undefined" && setImmediate !== null ? setImmediate : setTimeout;
      return function(moduleName, handler) {
        return enqueue(function() {
          return handler(require(moduleName));
        });
      };
    }
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2hhcGxpbi5jb2ZmZWUiLCJzcmMvY2hhcGxpbi9hcHBsaWNhdGlvbi5jb2ZmZWUiLCJzcmMvY2hhcGxpbi9jb21wb3Nlci5jb2ZmZWUiLCJzcmMvY2hhcGxpbi9jb250cm9sbGVycy9jb250cm9sbGVyLmNvZmZlZSIsInNyYy9jaGFwbGluL2Rpc3BhdGNoZXIuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL2NvbXBvc2l0aW9uLmNvZmZlZSIsInNyYy9jaGFwbGluL2xpYi9ldmVudF9icm9rZXIuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL2hpc3RvcnkuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL3JvdXRlLmNvZmZlZSIsInNyYy9jaGFwbGluL2xpYi9yb3V0ZXIuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL3N1cHBvcnQuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL3N5bmNfbWFjaGluZS5jb2ZmZWUiLCJzcmMvY2hhcGxpbi9saWIvdXRpbHMuY29mZmVlIiwic3JjL2NoYXBsaW4vbWVkaWF0b3IuY29mZmVlIiwic3JjL2NoYXBsaW4vbW9kZWxzL2NvbGxlY3Rpb24uY29mZmVlIiwic3JjL2NoYXBsaW4vbW9kZWxzL21vZGVsLmNvZmZlZSIsInNyYy9jaGFwbGluL3ZpZXdzL2NvbGxlY3Rpb25fdmlldy5jb2ZmZWUiLCJzcmMvY2hhcGxpbi92aWV3cy9sYXlvdXQuY29mZmVlIiwic3JjL2NoYXBsaW4vdmlld3Mvdmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUlBLE1BQU0sQ0FBQyxPQUFQLEdBQ0U7RUFBQSxXQUFBLEVBQWdCLE9BQUEsQ0FBUSx1QkFBUixDQUFoQjtFQUNBLFFBQUEsRUFBZ0IsT0FBQSxDQUFRLG9CQUFSLENBRGhCO0VBRUEsVUFBQSxFQUFnQixPQUFBLENBQVEsa0NBQVIsQ0FGaEI7RUFHQSxVQUFBLEVBQWdCLE9B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O0lBR0EsSUFBQyxDQUFBLG9CQUFELENBQUE7QUFHQTtBQUFBLFNBQUEscUNBQUE7O01BQUEsT0FBTyxDQUFDLE9BQVIsQ0FBQTtBQUFBO0lBR0EsSUFBQyxDQUFBLG9CQUFELENBQUE7SUFHQSxJQUFDLENBQUEsR0FBRCxDQUFBO0lBR0EsSUFBRyxJQUFDLENBQUEsV0FBSjtNQUVFLElBQUMsQ0FBQSxnQkFBRCxDQUFBO01BQ0EsSUFBQyxDQUFBLFVBQUQsQ0FBQTtNQUVBLElBQUMsQ0FBQSxhQUFELENBQUEsRUFMRjtLQUFBLE1BQUE7TUFTRSxJQUFDLENBQUEsTUFBRCxDQUFBLEVBVEY7O0FBYUE7QUFBQSxTQUFBLHdDQUFBOztNQUFBLE9BQU8sSUFBSyxDQUFBLElBQUE7QUFBWjtJQVFBLElBQUMsQ0FBQSxRQUFELEdBQVk7V0FHWixNQUFNLENBQUMsTUFBUCxDQUFjLElBQWQ7RUF4Q087Ozs7R0EzYXlCLFFBQVEsQ0FBQyxVQUFULElBQXVCLFFBQVEsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCdcblxuIyBNYWluIGVudHJ5IHBvaW50IGludG8gQ2hhcGxpbiBtb2R1bGUuXG4jIExvYWQgYWxsIGNvbXBvbmVudHMgYW5kIGV4cG9zZSB0aGVtLlxubW9kdWxlLmV4cG9ydHMgPVxuICBBcHBsaWNhdGlvbjogICAgcmVxdWlyZSAnLi9jaGFwbGluL2FwcGxpY2F0aW9uJ1xuICBDb21wb3NlcjogICAgICAgcmVxdWlyZSAnLi9jaGFwbGluL2NvbXBvc2VyJ1xuICBDb250cm9sbGVyOiAgICAgcmVxdWlyZSAnLi9jaGFwbGluL2NvbnRyb2xsZXJzL2NvbnRyb2xsZXInXG4gIERpc3BhdGNoZXI6ICAgICByZXF1aXJlICcuL2NoYXBsaW4vZGlzcGF0Y2hlcidcbiAgQ29tcG9zaXRpb246ICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9saWIvY29tcG9zaXRpb24nXG4gIEV2ZW50QnJva2VyOiAgICByZXF1aXJlICcuL2NoYXBsaW4vbGliL2V2ZW50X2Jyb2tlcidcbiAgSGlzdG9yeTogICAgICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9saWIvaGlzdG9yeSdcbiAgUm91dGU6ICAgICAgICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9saWIvcm91dGUnXG4gIFJvdXRlcjogICAgICAgICByZXF1aXJlICcuL2NoYXBsaW4vbGliL3JvdXRlcidcbiAgc3VwcG9ydDogICAgICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9saWIvc3VwcG9ydCdcbiAgU3luY01hY2hpbmU6ICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9saWIvc3luY19tYWNoaW5lJ1xuICB1dGlsczogICAgICAgICAgcmVxdWlyZSAnLi9jaGFwbGluL2xpYi91dGlscydcbiAgbWVkaWF0b3I6ICAgICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9tZWRpYXRvcidcbiAgQ29sbGVjdGlvbjogICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9tb2RlbHMvY29sbGVjdGlvbidcbiAgTW9kZWw6ICAgICAgICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9tb2RlbHMvbW9kZWwnXG4gIENvbGxlY3Rpb25WaWV3OiByZXF1aXJlICcuL2NoYXBsaW4vdmlld3MvY29sbGVjdGlvbl92aWV3J1xuICBMYXlvdXQ6ICAgICAgICAgcmVxdWlyZSAnLi9jaGFwbGluL3ZpZXdzL2xheW91dCdcbiAgVmlldzogICAgICAgICAgIHJlcXVpcmUgJy4vY2hhcGxpbi92aWV3cy92aWV3J1xuIiwiJ3VzZSBzdHJpY3QnXG5cbiMgVGhpcmQtcGFydHkgbGlicmFyaWVzLlxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuXG4jIENvZmZlZVNjcmlwdCBjbGFzc2VzIHdoaWNoIGFyZSBpbnN0YW50aWF0ZWQgd2l0aCBgbmV3YFxuQ29tcG9zZXIgPSByZXF1aXJlICcuL2NvbXBvc2VyJ1xuRGlzcGF0Y2hlciA9IHJlcXVpcmUgJy4vZGlzcGF0Y2hlcidcblJvdXRlciA9IHJlcXVpcmUgJy4vbGliL3JvdXRlcidcbkxheW91dCA9IHJlcXVpcmUgJy4vdmlld3MvbGF5b3V0J1xuXG4jIEEgbWl4LWluIHRoYXQgc2hvdWxkIGJlIG1peGVkIHRvIGNsYXNzLlxuRXZlbnRCcm9rZXIgPSByZXF1aXJlICcuL2xpYi9ldmVudF9icm9rZXInXG5cbiMgSW5kZXBlbmRlbnQgZ2xvYmFsIGV2ZW50IGJ1cyB0aGF0IGlzIHVzZWQgYnkgaXRzZWxmLCBzbyBsb3dlcmNhc2VkLlxubWVkaWF0b3IgPSByZXF1aXJlICcuL21lZGlhdG9yJ1xuXG4jIFRoZSBib290c3RyYXBwZXIgaXMgdGhlIGVudHJ5IHBvaW50IGZvciBDaGFwbGluIGFwcHMuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEFwcGxpY2F0aW9uXG4gICMgQm9ycm93IHRoZSBgZXh0ZW5kYCBtZXRob2QgZnJvbSBhIGRlYXIgZnJpZW5kLlxuICBAZXh0ZW5kID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kXG5cbiAgIyBNaXhpbiBhbiBgRXZlbnRCcm9rZXJgIGZvciAqKnB1Ymxpc2gvc3Vic2NyaWJlKiogZnVuY3Rpb25hbGl0eS5cbiAgXy5leHRlbmQgQHByb3RvdHlwZSwgRXZlbnRCcm9rZXJcblxuICAjIFNpdGUtd2lkZSB0aXRsZSB0aGF0IGlzIG1hcHBlZCB0byBIVE1MIGB0aXRsZWAgdGFnLlxuICB0aXRsZTogJydcblxuICAjIENvcmUgT2JqZWN0IEluc3RhbnRpYXRpb25cbiAgIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgIyBUaGUgYXBwbGljYXRpb24gaW5zdGFudGlhdGVzIHRocmVlICoqY29yZSBtb2R1bGVzKio6XG4gIGRpc3BhdGNoZXI6IG51bGxcbiAgbGF5b3V0OiBudWxsXG4gIHJvdXRlcjogbnVsbFxuICBjb21wb3NlcjogbnVsbFxuICBzdGFydGVkOiBmYWxzZVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgIEBpbml0aWFsaXplIG9wdGlvbnNcblxuICBpbml0aWFsaXplOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICMgQ2hlY2sgaWYgYXBwIGlzIGFscmVhZHkgc3RhcnRlZC5cbiAgICBpZiBAc3RhcnRlZFxuICAgICAgdGhyb3cgbmV3IEVycm9yICdBcHBsaWNhdGlvbiNpbml0aWFsaXplOiBBcHAgd2FzIGFscmVhZHkgc3RhcnRlZCdcblxuICAgICMgSW5pdGlhbGl6ZSBjb3JlIGNvbXBvbmVudHMuXG4gICAgIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgICMgUmVnaXN0ZXIgYWxsIHJvdXRlcy5cbiAgICAjIFlvdSBtaWdodCBwYXNzIFJvdXRlci9IaXN0b3J5IG9wdGlvbnMgYXMgdGhlIHNlY29uZCBwYXJhbWV0ZXIuXG4gICAgIyBDaGFwbGluIGVuYWJsZXMgcHVzaFN0YXRlIHBlciBkZWZhdWx0IGFuZCBCYWNrYm9uZSB1c2VzIC8gYXNcbiAgICAjIHRoZSByb290IHBlciBkZWZhdWx0LiBZb3UgbWlnaHQgY2hhbmdlIHRoYXQgaW4gdGhlIG9wdGlvbnNcbiAgICAjIGlmIG5lY2Vzc2FyeTpcbiAgICAjIEBpbml0Um91dGVyIHJvdXRlcywgcHVzaFN0YXRlOiBmYWxzZSwgcm9vdDogJy9zdWJkaXIvJ1xuICAgIEBpbml0Um91dGVyIG9wdGlvbnMucm91dGVzLCBvcHRpb25zXG5cbiAgICAjIERpc3BhdGNoZXIgbGlzdGVucyBmb3Igcm91dGluZyBldmVudHMgYW5kIGluaXRpYWxpc2VzIGNvbnRyb2xsZXJzLlxuICAgIEBpbml0RGlzcGF0Y2hlciBvcHRpb25zXG5cbiAgICAjIExheW91dCBsaXN0ZW5zIGZvciBjbGljayBldmVudHMgJiBkZWxlZ2F0ZXMgaW50ZXJuYWwgbGlua3MgdG8gcm91dGVyLlxuICAgIEBpbml0TGF5b3V0IG9wdGlvbnNcblxuICAgICMgQ29tcG9zZXIgZ3JhbnRzIHRoZSBhYmlsaXR5IGZvciB2aWV3cyBhbmQgc3R1ZmYgdG8gYmUgcGVyc2lzdGVkLlxuICAgIEBpbml0Q29tcG9zZXIgb3B0aW9uc1xuXG4gICAgIyBNZWRpYXRvciBpcyBhIGdsb2JhbCBtZXNzYWdlIGJyb2tlciB3aGljaCBpbXBsZW1lbnRzIHB1YiAvIHN1YiBwYXR0ZXJuLlxuICAgIEBpbml0TWVkaWF0b3IoKVxuXG4gICAgIyBTdGFydCB0aGUgYXBwbGljYXRpb24uXG4gICAgQHN0YXJ0KClcblxuICAjICoqQ2hhcGxpbi5EaXNwYXRjaGVyKiogc2l0cyBiZXR3ZWVuIHRoZSByb3V0ZXIgYW5kIGNvbnRyb2xsZXJzIHRvIGxpc3RlblxuICAjIGZvciByb3V0aW5nIGV2ZW50cy4gV2hlbiB0aGV5IG9jY3VyLCBDaGFwbGluLkRpc3BhdGNoZXIgbG9hZHMgdGhlIHRhcmdldFxuICAjIGNvbnRyb2xsZXIgbW9kdWxlIGFuZCBpbnN0YW50aWF0ZXMgaXQgYmVmb3JlIGludm9raW5nIHRoZSB0YXJnZXQgYWN0aW9uLlxuICAjIEFueSBwcmV2aW91c2x5IGFjdGl2ZSBjb250cm9sbGVyIGlzIGF1dG9tYXRpY2FsbHkgZGlzcG9zZWQuXG5cbiAgaW5pdERpc3BhdGNoZXI6IChvcHRpb25zKSAtPlxuICAgIEBkaXNwYXRjaGVyID0gbmV3IERpc3BhdGNoZXIgb3B0aW9uc1xuXG4gICMgKipDaGFwbGluLkxheW91dCoqIGlzIHRoZSB0b3AtbGV2ZWwgYXBwbGljYXRpb24gdmlldy4gSXQgKmRvZXMgbm90XG4gICMgaW5oZXJpdCogZnJvbSBDaGFwbGluLlZpZXcgYnV0IGJvcnJvd3Mgc29tZSBvZiBpdHMgZnVuY3Rpb25hbGl0aWVzLiBJdFxuICAjIGlzIHRpZWQgdG8gdGhlIGRvY3VtZW50IGRvbSBlbGVtZW50IGFuZCByZWdpc3RlcnMgYXBwbGljYXRpb24td2lkZVxuICAjIGV2ZW50cywgc3VjaCBhcyBpbnRlcm5hbCBsaW5rcy4gQW5kIG1haW5seSwgd2hlbiBhIG5ldyBjb250cm9sbGVyIGlzXG4gICMgYWN0aXZhdGVkLCBDaGFwbGluLkxheW91dCBpcyByZXNwb25zaWJsZSBmb3IgY2hhbmdpbmcgdGhlIG1haW4gdmlldyB0b1xuICAjIHRoZSB2aWV3IG9mIHRoZSBuZXcgY29udHJvbGxlci5cblxuICBpbml0TGF5b3V0OiAob3B0aW9ucyA9IHt9KSAtPlxuICAgIG9wdGlvbnMudGl0bGUgPz0gQHRpdGxlXG4gICAgQGxheW91dCA9IG5ldyBMYXlvdXQgb3B0aW9uc1xuXG4gIGluaXRDb21wb3NlcjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICBAY29tcG9zZXIgPSBuZXcgQ29tcG9zZXIgb3B0aW9uc1xuXG4gICMgKipDaGFwbGluLm1lZGlhdG9yKiogaXMgYSBzaW5nbGV0b24gdGhhdCBzZXJ2ZXMgYXMgdGhlIHNvbGUgY29tbXVuaWNhdGlvblxuICAjIGNoYW5uZWwgZm9yIGFsbCBwYXJ0cyBvZiB0aGUgYXBwbGljYXRpb24uIEl0IHNob3VsZCBiZSBzZWFsZWQgc28gdGhhdCBpdHNcbiAgIyBtaXN1c2UgYXMgYSBraXRjaGVuIHNpbmsgaXMgcHJvaGliaXRlZC4gSWYgeW91IGRvIHdhbnQgdG8gZ2l2ZSBtb2R1bGVzXG4gICMgYWNjZXNzIHRvIHNvbWUgc2hhcmVkIHJlc291cmNlLCBob3dldmVyLCBhZGQgaXQgaGVyZSBiZWZvcmUgc2VhbGluZyB0aGVcbiAgIyBtZWRpYXRvci5cblxuICBpbml0TWVkaWF0b3I6IC0+XG4gICAgT2JqZWN0LnNlYWwgbWVkaWF0b3JcblxuICAjICoqQ2hhcGxpbi5Sb3V0ZXIqKiBpcyByZXNwb25zaWJsZSBmb3Igb2JzZXJ2aW5nIFVSTCBjaGFuZ2VzLiBUaGUgcm91dGVyXG4gICMgaXMgYSByZXBsYWNlbWVudCBmb3IgQmFja2JvbmUuUm91dGVyIGFuZCAqZG9lcyBub3QgaW5oZXJpdCBmcm9tIGl0KlxuICAjIGRpcmVjdGx5LiBJdCdzIGEgZGlmZmVyZW50IGltcGxlbWVudGF0aW9uIHdpdGggc2V2ZXJhbCBhZHZhbnRhZ2VzIG92ZXJcbiAgIyB0aGUgc3RhbmRhcmQgcm91dGVyIHByb3ZpZGVkIGJ5IEJhY2tib25lLiBUaGUgcm91dGVyIGlzIHR5cGljYWxseVxuICAjIGluaXRpYWxpemVkIGJ5IHBhc3NpbmcgdGhlIGZ1bmN0aW9uIHJldHVybmVkIGJ5ICoqcm91dGVzLmNvZmZlZSoqLlxuXG4gIGluaXRSb3V0ZXI6IChyb3V0ZXMsIG9wdGlvbnMpIC0+XG4gICAgIyBTYXZlIHRoZSByZWZlcmVuY2UgZm9yIHRlc3RpbmcgaW50cm9zcGVjdGlvbiBvbmx5LlxuICAgICMgTW9kdWxlcyBzaG91bGQgY29tbXVuaWNhdGUgd2l0aCBlYWNoIG90aGVyIHZpYSAqKnB1Ymxpc2gvc3Vic2NyaWJlKiouXG4gICAgQHJvdXRlciA9IG5ldyBSb3V0ZXIgb3B0aW9uc1xuXG4gICAgIyBSZWdpc3RlciBhbnkgcHJvdmlkZWQgcm91dGVzLlxuICAgIHJvdXRlcz8gQHJvdXRlci5tYXRjaFxuXG4gICMgQ2FuIGJlIGN1c3RvbWl6ZWQgd2hlbiBvdmVycmlkZGVuLlxuICBzdGFydDogLT5cbiAgICAjIEFmdGVyIHJlZ2lzdGVyaW5nIHRoZSByb3V0ZXMsIHN0YXJ0ICoqQmFja2JvbmUuaGlzdG9yeSoqLlxuICAgIEByb3V0ZXIuc3RhcnRIaXN0b3J5KClcblxuICAgICMgTWFyayBhcHAgYXMgaW5pdGlhbGl6ZWQuXG4gICAgQHN0YXJ0ZWQgPSB0cnVlXG5cbiAgICAjIERpc3Bvc2FsIHNob3VsZCBiZSBvd24gcHJvcGVydHkgYmVjYXVzZSBvZiBgT2JqZWN0LnNlYWxgXG4gICAgQGRpc3Bvc2VkID0gZmFsc2VcblxuICAgICMgU2VhbCB0aGUgYXBwbGljYXRpb24gaW5zdGFuY2UgdG8gcHJldmVudCBmdXJ0aGVyIGNoYW5nZXMuXG4gICAgT2JqZWN0LnNlYWwgdGhpc1xuXG4gIGRpc3Bvc2U6IC0+XG4gICAgIyBBbSBJIGFscmVhZHkgZGlzcG9zZWQ/XG4gICAgcmV0dXJuIGlmIEBkaXNwb3NlZFxuXG4gICAgcHJvcGVydGllcyA9IFsnZGlzcGF0Y2hlcicsICdsYXlvdXQnLCAncm91dGVyJywgJ2NvbXBvc2VyJ11cbiAgICBmb3IgcHJvcCBpbiBwcm9wZXJ0aWVzIHdoZW4gdGhpc1twcm9wXT9cbiAgICAgIHRoaXNbcHJvcF0uZGlzcG9zZSgpXG5cbiAgICBAZGlzcG9zZWQgPSB0cnVlXG5cbiAgICAjIFlvdSdyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ0J3Mgbm90IG9wZW4uXG4gICAgT2JqZWN0LmZyZWV6ZSB0aGlzXG4iLCIndXNlIHN0cmljdCdcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuXG5Db21wb3NpdGlvbiA9IHJlcXVpcmUgJy4vbGliL2NvbXBvc2l0aW9uJ1xuRXZlbnRCcm9rZXIgPSByZXF1aXJlICcuL2xpYi9ldmVudF9icm9rZXInXG5tZWRpYXRvciA9IHJlcXVpcmUgJy4vbWVkaWF0b3InXG5cbiMgQ29tcG9zZXJcbiMgLS0tLS0tLS1cblxuIyBUaGUgc29sZSBqb2Igb2YgdGhlIGNvbXBvc2VyIGlzIHRvIGFsbG93IHZpZXdzIHRvIGJlICdjb21wb3NlZCcuXG4jXG4jIElmIHRoZSB2aWV3IGhhcyBhbHJlYWR5IGJlZW4gY29tcG9zZWQgYnkgYSBwcmV2aW91cyBhY3Rpb24gdGhlbiBub3RoaW5nXG4jIGFwYXJ0IGZyb20gcmVnaXN0ZXJpbmcgdGhlIHZpZXcgYXMgaW4gdXNlIGhhcHBlbnMuIEVsc2UsIHRoZSB2aWV3XG4jIGlzIGluc3RhbnRpYXRlZCBhbmQgcGFzc2VkIHRoZSBvcHRpb25zIHRoYXQgd2VyZSBwYXNzZWQgaW4uIElmIGFuIGFjdGlvblxuIyBpcyByb3V0ZWQgdG8gd2hlcmUgYSB2aWV3IHRoYXQgd2FzIGNvbXBvc2VkIGlzIG5vdCByZS1jb21wb3NlZCwgdGhlXG4jIGNvbXBvc2VkIHZpZXcgaXMgZGlzcG9zZWQuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgQ29tcG9zZXJcbiAgIyBCb3Jyb3cgdGhlIHN0YXRpYyBleHRlbmQgbWV0aG9kIGZyb20gQmFja2JvbmVcbiAgQGV4dGVuZCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZFxuXG4gICMgTWl4aW4gYW4gRXZlbnRCcm9rZXJcbiAgXy5leHRlbmQgQHByb3RvdHlwZSwgRXZlbnRCcm9rZXJcblxuICAjIFRoZSBjb2xsZWN0aW9uIG9mIGNvbXBvc2VkIGNvbXBvc2l0aW9uc1xuICBjb21wb3NpdGlvbnM6IG51bGxcblxuICBjb25zdHJ1Y3RvcjogLT5cbiAgICBAaW5pdGlhbGl6ZSBhcmd1bWVudHMuLi5cblxuICBpbml0aWFsaXplOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICMgSW5pdGlhbGl6ZSBjb2xsZWN0aW9ucy5cbiAgICBAY29tcG9zaXRpb25zID0ge31cblxuICAgICMgU3Vic2NyaWJlIHRvIGV2ZW50cy5cbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyICdjb21wb3Nlcjpjb21wb3NlJywgQGNvbXBvc2UsIHRoaXNcbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyICdjb21wb3NlcjpyZXRyaWV2ZScsIEByZXRyaWV2ZSwgdGhpc1xuICAgIEBzdWJzY3JpYmVFdmVudCAnZGlzcGF0Y2hlcjpkaXNwYXRjaCcsIEBjbGVhbnVwXG5cbiAgIyBDb25zdHJ1Y3RzIGEgY29tcG9zaXRpb24gYW5kIGNvbXBvc2VzIGludG8gdGhlIGFjdGl2ZSBjb21wb3NpdGlvbnMuXG4gICMgVGhpcyBmdW5jdGlvbiBoYXMgc2V2ZXJhbCBmb3JtcyBhcyBkZXNjcmliZWQgYmVsb3c6XG4gICNcbiAgIyAxLiBjb21wb3NlKCduYW1lJywgQ2xhc3NbLCBvcHRpb25zXSlcbiAgIyAgICBDb21wb3NlcyBhIGNsYXNzIG9iamVjdC4gVGhlIG9wdGlvbnMgYXJlIHBhc3NlZCB0byB0aGUgY2xhc3Mgd2hlblxuICAjICAgIGFuIGluc3RhbmNlIGlzIGNvbnRydWN0ZWQgYW5kIGFyZSBmdXJ0aGVyIHVzZWQgdG8gdGVzdCBpZiB0aGVcbiAgIyAgICBjb21wb3NpdGlvbiBzaG91bGQgYmUgcmUtY29tcG9zZWQuXG4gICNcbiAgIyAyLiBjb21wb3NlKCduYW1lJywgZnVuY3Rpb24pXG4gICMgICAgQ29tcG9zZXMgYSBmdW5jdGlvbiB0aGF0IGV4ZWN1dGVzIGluIHRoZSBjb250ZXh0IG9mIHRoZSBjb250cm9sbGVyO1xuICAjICAgIGRvIE5PVCBiaW5kIHRoZSBmdW5jdGlvbiBjb250ZXh0LlxuICAjXG4gICMgMy4gY29tcG9zZSgnbmFtZScsIG9wdGlvbnMsIGZ1bmN0aW9uKVxuICAjICAgIENvbXBvc2VzIGEgZnVuY3Rpb24gdGhhdCBleGVjdXRlcyBpbiB0aGUgY29udGV4dCBvZiB0aGUgY29udHJvbGxlcjtcbiAgIyAgICBkbyBOT1QgYmluZCB0aGUgZnVuY3Rpb24gY29udGV4dCBhbmQgaXMgcGFzc2VkIHRoZSBvcHRpb25zIGFzIGFcbiAgIyAgICBwYXJhbWV0ZXIuIFRoZSBvcHRpb25zIGFyZSBmdXJ0aGVyIHVzZWQgdG8gdGVzdCBpZiB0aGUgY29tcG9zaXRpb25cbiAgIyAgICBzaG91bGQgYmUgcmVjb21wb3NlZC5cbiAgI1xuICAjIDQuIGNvbXBvc2UoJ25hbWUnLCBvcHRpb25zKVxuICAjICAgIEdpdmVzIGNvbnRyb2wgb3ZlciB0aGUgY29tcG9zaXRpb24gcHJvY2VzczsgdGhlIGNvbXBvc2UgbWV0aG9kIG9mXG4gICMgICAgdGhlIG9wdGlvbnMgaGFzaCBpcyBleGVjdXRlZCBpbiBwbGFjZSBvZiB0aGUgZnVuY3Rpb24gb2YgZm9ybSAoMykgYW5kXG4gICMgICAgdGhlIGNoZWNrIG1ldGhvZCBpcyBjYWxsZWQgKGlmIHByZXNlbnQpIHRvIGRldGVybWluZSByZS1jb21wb3NpdGlvbiAoXG4gICMgICAgb3RoZXJ3aXNlIHRoaXMgaXMgdGhlIHNhbWUgYXMgZm9ybSBbM10pLlxuICAjXG4gICMgNS4gY29tcG9zZSgnbmFtZScsIENvbXBvc2l0aW9uQ2xhc3NbLCBvcHRpb25zXSlcbiAgIyAgICBHaXZlcyBjb21wbGV0ZSBjb250cm9sIG92ZXIgdGhlIGNvbXBvc2l0aW9uIHByb2Nlc3MuXG4gICNcbiAgY29tcG9zZTogKG5hbWUsIHNlY29uZCwgdGhpcmQpIC0+XG4gICAgIyBOb3JtYWxpemUgdGhlIGFyZ3VtZW50c1xuICAgICMgSWYgdGhlIHNlY29uZCBwYXJhbWV0ZXIgaXMgYSBmdW5jdGlvbiB3ZSBrbm93IGl0IGlzICgxKSBvciAoMikuXG4gICAgaWYgdHlwZW9mIHNlY29uZCBpcyAnZnVuY3Rpb24nXG4gICAgICAjIFRoaXMgaXMgZm9ybSAoMSkgb3IgKDUpIHdpdGggdGhlIG9wdGlvbmFsIG9wdGlvbnMgaGFzaCBpZiB0aGUgdGhpcmRcbiAgICAgICMgaXMgYW4gb2JqIG9yIHRoZSBzZWNvbmQgcGFyYW1ldGVyJ3MgcHJvdG90eXBlIGhhcyBhIGRpc3Bvc2UgbWV0aG9kXG4gICAgICBpZiB0aGlyZCBvciBzZWNvbmQ6OmRpc3Bvc2VcbiAgICAgICAgIyBJZiB0aGUgY2xhc3MgaXMgYSBDb21wb3NpdGlvbiBjbGFzcyB0aGVuIGl0IGlzIGZvcm0gKDUpLlxuICAgICAgICBpZiBzZWNvbmQucHJvdG90eXBlIGluc3RhbmNlb2YgQ29tcG9zaXRpb25cbiAgICAgICAgICByZXR1cm4gQF9jb21wb3NlIG5hbWUsIGNvbXBvc2l0aW9uOiBzZWNvbmQsIG9wdGlvbnM6IHRoaXJkXG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gQF9jb21wb3NlIG5hbWUsIG9wdGlvbnM6IHRoaXJkLCBjb21wb3NlOiAtPlxuICAgICAgICAgICAgIyBUaGUgY29tcG9zZSBtZXRob2QgaGVyZSBqdXN0IGNvbnN0cnVjdHMgdGhlIGNsYXNzLlxuICAgICAgICAgICAgIyBNb2RlbCBhbmQgQ29sbGVjdGlvbiBib3RoIHRha2UgYG9wdGlvbnNgIGFzIHRoZSBzZWNvbmQgYXJndW1lbnQuXG4gICAgICAgICAgICBpZiBzZWNvbmQucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuTW9kZWwgb3JcbiAgICAgICAgICAgIHNlY29uZC5wcm90b3R5cGUgaW5zdGFuY2VvZiBCYWNrYm9uZS5Db2xsZWN0aW9uXG4gICAgICAgICAgICAgIEBpdGVtID0gbmV3IHNlY29uZCBudWxsLCBAb3B0aW9uc1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBAaXRlbSA9IG5ldyBzZWNvbmQgQG9wdGlvbnNcblxuICAgICAgICAgICAgIyBSZW5kZXIgdGhpcyBpdGVtIGlmIGl0IGhhcyBhIHJlbmRlciBtZXRob2QgYW5kIGl0IGVpdGhlclxuICAgICAgICAgICAgIyBkb2Vzbid0IGhhdmUgYW4gYXV0b1JlbmRlciBwcm9wZXJ0eSBvciB0aGF0IGF1dG9SZW5kZXJcbiAgICAgICAgICAgICMgcHJvcGVydHkgaXMgZmFsc2VcbiAgICAgICAgICAgIGF1dG9SZW5kZXIgPSBAaXRlbS5hdXRvUmVuZGVyXG4gICAgICAgICAgICBkaXNhYmxlZEF1dG9SZW5kZXIgPSBhdXRvUmVuZGVyIGlzIHVuZGVmaW5lZCBvciBub3QgYXV0b1JlbmRlclxuICAgICAgICAgICAgaWYgZGlzYWJsZWRBdXRvUmVuZGVyIGFuZCB0eXBlb2YgQGl0ZW0ucmVuZGVyIGlzICdmdW5jdGlvbidcbiAgICAgICAgICAgICAgQGl0ZW0ucmVuZGVyKClcblxuICAgICAgIyBUaGlzIGlzIGZvcm0gKDIpLlxuICAgICAgcmV0dXJuIEBfY29tcG9zZSBuYW1lLCBjb21wb3NlOiBzZWNvbmRcblxuICAgICMgSWYgdGhlIHRoaXJkIHBhcmFtZXRlciBleGlzdHMgYW5kIGlzIGEgZnVuY3Rpb24gdGhpcyBpcyAoMykuXG4gICAgaWYgdHlwZW9mIHRoaXJkIGlzICdmdW5jdGlvbidcbiAgICAgIHJldHVybiBAX2NvbXBvc2UgbmFtZSwgY29tcG9zZTogdGhpcmQsIG9wdGlvbnM6IHNlY29uZFxuXG4gICAgIyBUaGlzIG11c3QgYmUgZm9ybSAoNCkuXG4gICAgcmV0dXJuIEBfY29tcG9zZSBuYW1lLCBzZWNvbmRcblxuICBfY29tcG9zZTogKG5hbWUsIG9wdGlvbnMpIC0+XG4gICAgIyBBc3NlcnQgZm9yIHByb2dyYW1tZXIgZXJyb3JzXG4gICAgaWYgdHlwZW9mIG9wdGlvbnMuY29tcG9zZSBpc250ICdmdW5jdGlvbicgYW5kIG5vdCBvcHRpb25zLmNvbXBvc2l0aW9uP1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdDb21wb3NlciNjb21wb3NlIHdhcyB1c2VkIGluY29ycmVjdGx5J1xuXG4gICAgaWYgb3B0aW9ucy5jb21wb3NpdGlvbj9cbiAgICAgICMgVXNlIHRoZSBwYXNzZWQgY29tcG9zaXRpb24gZGlyZWN0bHlcbiAgICAgIGNvbXBvc2l0aW9uID0gbmV3IG9wdGlvbnMuY29tcG9zaXRpb24gb3B0aW9ucy5vcHRpb25zXG4gICAgZWxzZVxuICAgICAgIyBDcmVhdGUgdGhlIGNvbXBvc2l0aW9uIGFuZCBhcHBseSB0aGUgbWV0aG9kcyAoaWYgYXZhaWxhYmxlKVxuICAgICAgY29tcG9zaXRpb24gPSBuZXcgQ29tcG9zaXRpb24gb3B0aW9ucy5vcHRpb25zXG4gICAgICBjb21wb3NpdGlvbi5jb21wb3NlID0gb3B0aW9ucy5jb21wb3NlXG4gICAgICBjb21wb3NpdGlvbi5jaGVjayA9IG9wdGlvbnMuY2hlY2sgaWYgb3B0aW9ucy5jaGVja1xuXG4gICAgIyBDaGVjayBmb3IgYW4gZXhpc3RpbmcgY29tcG9zaXRpb25cbiAgICBjdXJyZW50ID0gQGNvbXBvc2l0aW9uc1tuYW1lXVxuXG4gICAgIyBBcHBseSB0aGUgY2hlY2sgbWV0aG9kXG4gICAgaWYgY3VycmVudCBhbmQgY3VycmVudC5jaGVjayBjb21wb3NpdGlvbi5vcHRpb25zXG4gICAgICAjIE1hcmsgdGhlIGN1cnJlbnQgY29tcG9zaXRpb24gYXMgbm90IHN0YWxlXG4gICAgICBjdXJyZW50LnN0YWxlIGZhbHNlXG4gICAgZWxzZVxuICAgICAgIyBSZW1vdmUgdGhlIGN1cnJlbnQgY29tcG9zaXRpb24gYW5kIGFwcGx5IHRoaXMgb25lXG4gICAgICBjdXJyZW50LmRpc3Bvc2UoKSBpZiBjdXJyZW50XG4gICAgICByZXR1cm5lZCA9IGNvbXBvc2l0aW9uLmNvbXBvc2UgY29tcG9zaXRpb24ub3B0aW9uc1xuICAgICAgaXNQcm9taXNlID0gdHlwZW9mIHJldHVybmVkPy50aGVuIGlzICdmdW5jdGlvbidcbiAgICAgIGNvbXBvc2l0aW9uLnN0YWxlIGZhbHNlXG4gICAgICBAY29tcG9zaXRpb25zW25hbWVdID0gY29tcG9zaXRpb25cblxuICAgICMgUmV0dXJuIHRoZSBhY3RpdmUgY29tcG9zaXRpb25cbiAgICBpZiBpc1Byb21pc2VcbiAgICAgIHJldHVybmVkXG4gICAgZWxzZVxuICAgICAgQGNvbXBvc2l0aW9uc1tuYW1lXS5pdGVtXG5cbiAgIyBSZXRyaWV2ZXMgYW4gYWN0aXZlIGNvbXBvc2l0aW9uIHVzaW5nIHRoZSBjb21wb3NlIG1ldGhvZC5cbiAgcmV0cmlldmU6IChuYW1lKSAtPlxuICAgIGFjdGl2ZSA9IEBjb21wb3NpdGlvbnNbbmFtZV1cbiAgICBpZiBhY3RpdmUgYW5kIG5vdCBhY3RpdmUuc3RhbGUoKSB0aGVuIGFjdGl2ZS5pdGVtXG5cbiAgIyBEZWNsYXJlIGFsbCBjb21wb3NpdGlvbnMgYXMgc3RhbGUgYW5kIHJlbW92ZSBhbGwgdGhhdCB3ZXJlIHByZXZpb3VzbHlcbiAgIyBtYXJrZWQgc3RhbGUgd2l0aG91dCBiZWluZyByZS1jb21wb3NlZC5cbiAgY2xlYW51cDogLT5cbiAgICAjIEFjdGlvbiBtZXRob2QgaXMgZG9uZTsgcGVyZm9ybSBwb3N0LWFjdGlvbiBjbGVhbiB1cFxuICAgICMgRGlzcG9zZSBhbmQgZGVsZXRlIGFsbCBuby1sb25nZXItYWN0aXZlIGNvbXBvc2l0aW9ucy5cbiAgICAjIERlY2xhcmUgYWxsIGFjdGl2ZSBjb21wb3NpdGlvbnMgYXMgZGUtYWN0aXZhdGVkIChlZy4gdG8gYmUgcmVtb3ZlZFxuICAgICMgb24gdGhlIG5leHQgY29udHJvbGxlciBzdGFydHVwIHVubGVzcyB0aGV5IGFyZSByZS1jb21wb3NlZCkuXG4gICAgZm9yIGtleSBpbiBPYmplY3Qua2V5cyBAY29tcG9zaXRpb25zXG4gICAgICBjb21wb3NpdGlvbiA9IEBjb21wb3NpdGlvbnNba2V5XVxuICAgICAgaWYgY29tcG9zaXRpb24uc3RhbGUoKVxuICAgICAgICBjb21wb3NpdGlvbi5kaXNwb3NlKClcbiAgICAgICAgZGVsZXRlIEBjb21wb3NpdGlvbnNba2V5XVxuICAgICAgZWxzZVxuICAgICAgICBjb21wb3NpdGlvbi5zdGFsZSB0cnVlXG5cbiAgICAjIFJldHVybiBub3RoaW5nLlxuICAgIHJldHVyblxuXG4gIGRpc3Bvc2VkOiBmYWxzZVxuXG4gIGRpc3Bvc2U6IC0+XG4gICAgcmV0dXJuIGlmIEBkaXNwb3NlZFxuXG4gICAgIyBVbmJpbmQgaGFuZGxlcnMgb2YgZ2xvYmFsIGV2ZW50c1xuICAgIEB1bnN1YnNjcmliZUFsbEV2ZW50cygpXG5cbiAgICBtZWRpYXRvci5yZW1vdmVIYW5kbGVycyB0aGlzXG5cbiAgICAjIERpc3Bvc2Ugb2YgYWxsIGNvbXBvc2l0aW9ucyBhbmQgdGhlaXIgaXRlbXMgKHRoYXQgY2FuIGJlKVxuICAgIGZvciBrZXkgaW4gT2JqZWN0LmtleXMgQGNvbXBvc2l0aW9uc1xuICAgICAgQGNvbXBvc2l0aW9uc1trZXldLmRpc3Bvc2UoKVxuXG4gICAgIyBSZW1vdmUgcHJvcGVydGllc1xuICAgIGRlbGV0ZSBAY29tcG9zaXRpb25zXG5cbiAgICAjIEZpbmlzaGVkXG4gICAgQGRpc3Bvc2VkID0gdHJ1ZVxuXG4gICAgIyBZb3XigJlyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ04oCZcyBub3Qgb3BlblxuICAgIE9iamVjdC5mcmVlemUgdGhpc1xuIiwiJ3VzZSBzdHJpY3QnXG5cbl8gPSByZXF1aXJlICd1bmRlcnNjb3JlJ1xuQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZSdcblxubWVkaWF0b3IgPSByZXF1aXJlICcuLi9tZWRpYXRvcidcbkV2ZW50QnJva2VyID0gcmVxdWlyZSAnLi4vbGliL2V2ZW50X2Jyb2tlcidcbnV0aWxzID0gcmVxdWlyZSAnLi4vbGliL3V0aWxzJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIENvbnRyb2xsZXJcbiAgIyBCb3Jyb3cgdGhlIHN0YXRpYyBleHRlbmQgbWV0aG9kIGZyb20gQmFja2JvbmUuXG4gIEBleHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmRcblxuICAjIE1peGluIEJhY2tib25lIGV2ZW50cyBhbmQgRXZlbnRCcm9rZXIuXG4gIF8uZXh0ZW5kIEBwcm90b3R5cGUsIEJhY2tib25lLkV2ZW50c1xuICBfLmV4dGVuZCBAcHJvdG90eXBlLCBFdmVudEJyb2tlclxuXG4gIHZpZXc6IG51bGxcblxuICAjIEludGVybmFsIGZsYWcgd2hpY2ggc3RvcmVzIHdoZXRoZXIgYHJlZGlyZWN0VG9gXG4gICMgd2FzIGNhbGxlZCBpbiB0aGUgY3VycmVudCBhY3Rpb24uXG4gIHJlZGlyZWN0ZWQ6IGZhbHNlXG5cbiAgY29uc3RydWN0b3I6IC0+XG4gICAgQGluaXRpYWxpemUgYXJndW1lbnRzLi4uXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICAjIEVtcHR5IHBlciBkZWZhdWx0LlxuXG4gIGJlZm9yZUFjdGlvbjogLT5cbiAgICAjIEVtcHR5IHBlciBkZWZhdWx0LlxuXG4gICMgQ2hhbmdlIGRvY3VtZW50IHRpdGxlLlxuICBhZGp1c3RUaXRsZTogKHN1YnRpdGxlKSAtPlxuICAgIG1lZGlhdG9yLmV4ZWN1dGUgJ2FkanVzdFRpdGxlJywgc3VidGl0bGVcblxuICAjIENvbXBvc2VyXG4gICMgLS0tLS0tLS1cblxuICAjIENvbnZlbmllbmNlIG1ldGhvZCB0byBwdWJsaXNoIHRoZSBgIWNvbXBvc2VyOmNvbXBvc2VgIGV2ZW50LiBTZWUgdGhlXG4gICMgY29tcG9zZXIgZm9yIGluZm9ybWF0aW9uIG9uIHBhcmFtZXRlcnMsIGV0Yy5cbiAgcmV1c2U6IC0+XG4gICAgbWV0aG9kID0gaWYgYXJndW1lbnRzLmxlbmd0aCBpcyAxIHRoZW4gJ3JldHJpZXZlJyBlbHNlICdjb21wb3NlJ1xuICAgIG1lZGlhdG9yLmV4ZWN1dGUgXCJjb21wb3Nlcjoje21ldGhvZH1cIiwgYXJndW1lbnRzLi4uXG5cbiAgIyBEZXByZWNhdGVkIG1ldGhvZC5cbiAgY29tcG9zZTogLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJ0NvbnRyb2xsZXIjY29tcG9zZSB3YXMgbW92ZWQgdG8gQ29udHJvbGxlciNyZXVzZSdcblxuICAjIFJlZGlyZWN0aW9uXG4gICMgLS0tLS0tLS0tLS1cblxuICAjIFJlZGlyZWN0IHRvIFVSTC5cbiAgcmVkaXJlY3RUbzogLT5cbiAgICBAcmVkaXJlY3RlZCA9IHRydWVcbiAgICB1dGlscy5yZWRpcmVjdFRvIGFyZ3VtZW50cy4uLlxuXG4gICMgRGlzcG9zYWxcbiAgIyAtLS0tLS0tLVxuXG4gIGRpc3Bvc2VkOiBmYWxzZVxuXG4gIGRpc3Bvc2U6IC0+XG4gICAgcmV0dXJuIGlmIEBkaXNwb3NlZFxuXG4gICAgIyBEaXNwb3NlIGFuZCBkZWxldGUgYWxsIG1lbWJlcnMgd2hpY2ggYXJlIGRpc3Bvc2FibGUuXG4gICAgZm9yIGtleSBpbiBPYmplY3Qua2V5cyB0aGlzXG4gICAgICBtZW1iZXIgPSBAW2tleV1cbiAgICAgIGlmIHR5cGVvZiBtZW1iZXI/LmRpc3Bvc2UgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICBtZW1iZXIuZGlzcG9zZSgpXG4gICAgICAgIGRlbGV0ZSBAW2tleV1cblxuICAgICMgVW5iaW5kIGhhbmRsZXJzIG9mIGdsb2JhbCBldmVudHMuXG4gICAgQHVuc3Vic2NyaWJlQWxsRXZlbnRzKClcblxuICAgICMgVW5iaW5kIGFsbCByZWZlcmVuY2VkIGhhbmRsZXJzLlxuICAgIEBzdG9wTGlzdGVuaW5nKClcblxuICAgICMgRmluaXNoZWQuXG4gICAgQGRpc3Bvc2VkID0gdHJ1ZVxuXG4gICAgIyBZb3UncmUgZnJvemVuIHdoZW4geW91ciBoZWFydOKAmXMgbm90IG9wZW4uXG4gICAgT2JqZWN0LmZyZWV6ZSB0aGlzXG4iLCIndXNlIHN0cmljdCdcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuXG5FdmVudEJyb2tlciA9IHJlcXVpcmUgJy4vbGliL2V2ZW50X2Jyb2tlcidcbnV0aWxzID0gcmVxdWlyZSAnLi9saWIvdXRpbHMnXG5tZWRpYXRvciA9IHJlcXVpcmUgJy4vbWVkaWF0b3InXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgRGlzcGF0Y2hlclxuICAjIEJvcnJvdyB0aGUgc3RhdGljIGV4dGVuZCBtZXRob2QgZnJvbSBCYWNrYm9uZS5cbiAgQGV4dGVuZCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZFxuXG4gICMgTWl4aW4gYW4gRXZlbnRCcm9rZXIuXG4gIF8uZXh0ZW5kIEBwcm90b3R5cGUsIEV2ZW50QnJva2VyXG5cbiAgIyBUaGUgcHJldmlvdXMgcm91dGUgaW5mb3JtYXRpb24uXG4gICMgVGhpcyBvYmplY3QgY29udGFpbnMgdGhlIGNvbnRyb2xsZXIgbmFtZSwgYWN0aW9uLCBwYXRoLCBhbmQgbmFtZSAoaWYgYW55KS5cbiAgcHJldmlvdXNSb3V0ZTogbnVsbFxuXG4gICMgVGhlIGN1cnJlbnQgY29udHJvbGxlciwgcm91dGUgaW5mb3JtYXRpb24sIGFuZCBwYXJhbWV0ZXJzLlxuICAjIFRoZSBjdXJyZW50IHJvdXRlIG9iamVjdCBjb250YWlucyB0aGUgc2FtZSBpbmZvcm1hdGlvbiBhcyBwcmV2aW91cy5cbiAgY3VycmVudENvbnRyb2xsZXI6IG51bGxcbiAgY3VycmVudFJvdXRlOiBudWxsXG4gIGN1cnJlbnRQYXJhbXM6IG51bGxcbiAgY3VycmVudFF1ZXJ5OiBudWxsXG5cbiAgY29uc3RydWN0b3I6IC0+XG4gICAgQGluaXRpYWxpemUgYXJndW1lbnRzLi4uXG5cbiAgaW5pdGlhbGl6ZTogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICAjIE1lcmdlIHRoZSBvcHRpb25zLlxuICAgIEBzZXR0aW5ncyA9IF8uZGVmYXVsdHMgb3B0aW9ucyxcbiAgICAgIGNvbnRyb2xsZXJQYXRoOiAnY29udHJvbGxlcnMvJ1xuICAgICAgY29udHJvbGxlclN1ZmZpeDogJ19jb250cm9sbGVyJ1xuXG4gICAgIyBMaXN0ZW4gdG8gZ2xvYmFsIGV2ZW50cy5cbiAgICBAc3Vic2NyaWJlRXZlbnQgJ3JvdXRlcjptYXRjaCcsIEBkaXNwYXRjaFxuXG4gICMgQ29udHJvbGxlciBtYW5hZ2VtZW50LlxuICAjIFN0YXJ0aW5nIGFuZCBkaXNwb3NpbmcgY29udHJvbGxlcnMuXG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICMgVGhlIHN0YW5kYXJkIGZsb3cgaXM6XG4gICNcbiAgIyAgIDEuIFRlc3QgaWYgaXTigJlzIGEgbmV3IGNvbnRyb2xsZXIvYWN0aW9uIHdpdGggbmV3IHBhcmFtc1xuICAjICAgMS4gSGlkZSB0aGUgcHJldmlvdXMgdmlld1xuICAjICAgMi4gRGlzcG9zZSB0aGUgcHJldmlvdXMgY29udHJvbGxlclxuICAjICAgMy4gSW5zdGFudGlhdGUgdGhlIG5ldyBjb250cm9sbGVyLCBjYWxsIHRoZSBjb250cm9sbGVyIGFjdGlvblxuICAjICAgNC4gU2hvdyB0aGUgbmV3IHZpZXdcbiAgI1xuICBkaXNwYXRjaDogKHJvdXRlLCBwYXJhbXMsIG9wdGlvbnMpIC0+XG4gICAgIyBDbG9uZSBwYXJhbXMgYW5kIG9wdGlvbnMgc28gdGhlIG9yaWdpbmFsIG9iamVjdHMgcmVtYWluIHVudG91Y2hlZC5cbiAgICBwYXJhbXMgPSBfLmV4dGVuZCB7fSwgcGFyYW1zXG4gICAgb3B0aW9ucyA9IF8uZXh0ZW5kIHt9LCBvcHRpb25zXG5cbiAgICAjIG51bGwgb3IgdW5kZWZpbmVkIHF1ZXJ5IHBhcmFtZXRlcnMgYXJlIGVxdWl2YWxlbnQgdG8gYW4gZW1wdHkgaGFzaFxuICAgIG9wdGlvbnMucXVlcnkgPSB7fSBpZiBub3Qgb3B0aW9ucy5xdWVyeT9cblxuICAgICMgV2hldGhlciB0byBmb3JjZSB0aGUgY29udHJvbGxlciBzdGFydHVwIGV2ZW5cbiAgICAjIGlmIGN1cnJlbnQgYW5kIG5ldyBjb250cm9sbGVycyBhbmQgcGFyYW1zIG1hdGNoXG4gICAgIyBEZWZhdWx0IHRvIGZhbHNlIHVubGVzcyBleHBsaWNpdGx5IHNldCB0byB0cnVlLlxuICAgIG9wdGlvbnMuZm9yY2VTdGFydHVwID0gZmFsc2UgdW5sZXNzIG9wdGlvbnMuZm9yY2VTdGFydHVwIGlzIHRydWVcblxuICAgICMgU3RvcCBpZiB0aGUgZGVzaXJlZCBjb250cm9sbGVyL2FjdGlvbiBpcyBhbHJlYWR5IGFjdGl2ZVxuICAgICMgd2l0aCB0aGUgc2FtZSBwYXJhbXMuXG4gICAgcmV0dXJuIGlmIG5vdCBvcHRpb25zLmZvcmNlU3RhcnR1cCBhbmRcbiAgICAgIEBjdXJyZW50Um91dGU/LmNvbnRyb2xsZXIgaXMgcm91dGUuY29udHJvbGxlciBhbmRcbiAgICAgIEBjdXJyZW50Um91dGU/LmFjdGlvbiBpcyByb3V0ZS5hY3Rpb24gYW5kXG4gICAgICBfLmlzRXF1YWwoQGN1cnJlbnRQYXJhbXMsIHBhcmFtcykgYW5kXG4gICAgICBfLmlzRXF1YWwoQGN1cnJlbnRRdWVyeSwgb3B0aW9ucy5xdWVyeSlcblxuICAgICMgRmV0Y2ggdGhlIG5ldyBjb250cm9sbGVyLCB0aGVuIGdvIG9uLlxuICAgIEBsb2FkQ29udHJvbGxlciByb3V0ZS5jb250cm9sbGVyLCAoQ29udHJvbGxlcikgPT5cbiAgICAgIEBjb250cm9sbGVyTG9hZGVkIHJvdXRlLCBwYXJhbXMsIG9wdGlvbnMsIENvbnRyb2xsZXJcblxuICAjIExvYWQgdGhlIGNvbnN0cnVjdG9yIGZvciBhIGdpdmVuIGNvbnRyb2xsZXIgbmFtZS5cbiAgIyBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiB1c2VzIHJlcXVpcmUoKSBmcm9tIGEgQU1EIG1vZHVsZSBsb2FkZXJcbiAgIyBsaWtlIFJlcXVpcmVKUyB0byBmZXRjaCB0aGUgY29uc3RydWN0b3IuXG4gIGxvYWRDb250cm9sbGVyOiAobmFtZSwgaGFuZGxlcikgLT5cbiAgICByZXR1cm4gaGFuZGxlciBuYW1lIGlmIG5hbWUgaXMgT2JqZWN0IG5hbWVcblxuICAgIGZpbGVOYW1lID0gbmFtZSArIEBzZXR0aW5ncy5jb250cm9sbGVyU3VmZml4XG4gICAgbW9kdWxlTmFtZSA9IEBzZXR0aW5ncy5jb250cm9sbGVyUGF0aCArIGZpbGVOYW1lXG4gICAgdXRpbHMubG9hZE1vZHVsZSBtb2R1bGVOYW1lLCBoYW5kbGVyXG5cbiAgIyBIYW5kbGVyIGZvciB0aGUgY29udHJvbGxlciBsYXp5LWxvYWRpbmcuXG4gIGNvbnRyb2xsZXJMb2FkZWQ6IChyb3V0ZSwgcGFyYW1zLCBvcHRpb25zLCBDb250cm9sbGVyKSAtPlxuICAgIGlmIEBuZXh0UHJldmlvdXNSb3V0ZSA9IEBjdXJyZW50Um91dGVcbiAgICAgIHByZXZpb3VzID0gXy5leHRlbmQge30sIEBuZXh0UHJldmlvdXNSb3V0ZVxuICAgICAgcHJldmlvdXMucGFyYW1zID0gQGN1cnJlbnRQYXJhbXMgaWYgQGN1cnJlbnRQYXJhbXM/XG4gICAgICBkZWxldGUgcHJldmlvdXMucHJldmlvdXMgaWYgcHJldmlvdXMucHJldmlvdXNcbiAgICAgIHByZXYgPSB7cHJldmlvdXN9XG4gICAgQG5leHRDdXJyZW50Um91dGUgPSBfLmV4dGVuZCB7fSwgcm91dGUsIHByZXZcblxuICAgIGNvbnRyb2xsZXIgPSBuZXcgQ29udHJvbGxlciBwYXJhbXMsIEBuZXh0Q3VycmVudFJvdXRlLCBvcHRpb25zXG4gICAgQGV4ZWN1dGVCZWZvcmVBY3Rpb24gY29udHJvbGxlciwgQG5leHRDdXJyZW50Um91dGUsIHBhcmFtcywgb3B0aW9uc1xuXG4gICMgRXhlY3V0ZXMgY29udHJvbGxlciBhY3Rpb24uXG4gIGV4ZWN1dGVBY3Rpb246IChjb250cm9sbGVyLCByb3V0ZSwgcGFyYW1zLCBvcHRpb25zKSAtPlxuICAgICMgRGlzcG9zZSB0aGUgcHJldmlvdXMgY29udHJvbGxlci5cbiAgICBpZiBAY3VycmVudENvbnRyb2xsZXJcbiAgICAgICMgTm90aWZ5IHRoZSByZXN0IG9mIHRoZSB3b3JsZCBiZWZvcmVoYW5kLlxuICAgICAgQHB1Ymxpc2hFdmVudCAnYmVmb3JlQ29udHJvbGxlckRpc3Bvc2UnLCBAY3VycmVudENvbnRyb2xsZXJcblxuICAgICAgIyBQYXNzaW5nIG5ldyBwYXJhbWV0ZXJzIHRoYXQgdGhlIGFjdGlvbiBtZXRob2Qgd2lsbCByZWNlaXZlLlxuICAgICAgQGN1cnJlbnRDb250cm9sbGVyLmRpc3Bvc2UgcGFyYW1zLCByb3V0ZSwgb3B0aW9uc1xuXG4gICAgIyBTYXZlIHRoZSBuZXcgY29udHJvbGxlciBhbmQgaXRzIHBhcmFtZXRlcnMuXG4gICAgQGN1cnJlbnRDb250cm9sbGVyID0gY29udHJvbGxlclxuICAgIEBjdXJyZW50UGFyYW1zID0gXy5leHRlbmQge30sIHBhcmFtc1xuICAgIEBjdXJyZW50UXVlcnkgPSBfLmV4dGVuZCB7fSwgb3B0aW9ucy5xdWVyeVxuXG4gICAgIyBDYWxsIHRoZSBjb250cm9sbGVyIGFjdGlvbiB3aXRoIHBhcmFtcyBhbmQgb3B0aW9ucy5cbiAgICBjb250cm9sbGVyW3JvdXRlLmFjdGlvbl0gcGFyYW1zLCByb3V0ZSwgb3B0aW9uc1xuXG4gICAgIyBTdG9wIGlmIHRoZSBhY3Rpb24gdHJpZ2dlcmVkIGEgcmVkaXJlY3QuXG4gICAgcmV0dXJuIGlmIGNvbnRyb2xsZXIucmVkaXJlY3RlZFxuXG4gICAgIyBXZSdyZSBkb25lISBTcHJlYWQgdGhlIHdvcmQhXG4gICAgQHB1Ymxpc2hFdmVudCAnZGlzcGF0Y2hlcjpkaXNwYXRjaCcsIEBjdXJyZW50Q29udHJvbGxlcixcbiAgICAgIHBhcmFtcywgcm91dGUsIG9wdGlvbnNcblxuICAjIEV4ZWN1dGVzIGJlZm9yZSBhY3Rpb24gZmlsdGVyZXIuXG4gIGV4ZWN1dGVCZWZvcmVBY3Rpb246IChjb250cm9sbGVyLCByb3V0ZSwgcGFyYW1zLCBvcHRpb25zKSAtPlxuICAgIGJlZm9yZSA9IGNvbnRyb2xsZXIuYmVmb3JlQWN0aW9uXG5cbiAgICBleGVjdXRlQWN0aW9uID0gPT5cbiAgICAgIGlmIGNvbnRyb2xsZXIucmVkaXJlY3RlZCBvciBAY3VycmVudFJvdXRlIGFuZCByb3V0ZSBpcyBAY3VycmVudFJvdXRlXG4gICAgICAgIEBuZXh0UHJldmlvdXNSb3V0ZSA9IEBuZXh0Q3VycmVudFJvdXRlID0gbnVsbFxuICAgICAgICBjb250cm9sbGVyLmRpc3Bvc2UoKVxuICAgICAgICByZXR1cm5cbiAgICAgIEBwcmV2aW91c1JvdXRlID0gQG5leHRQcmV2aW91c1JvdXRlXG4gICAgICBAY3VycmVudFJvdXRlID0gQG5leHRDdXJyZW50Um91dGVcbiAgICAgIEBuZXh0UHJldmlvdXNSb3V0ZSA9IEBuZXh0Q3VycmVudFJvdXRlID0gbnVsbFxuICAgICAgQGV4ZWN1dGVBY3Rpb24gY29udHJvbGxlciwgcm91dGUsIHBhcmFtcywgb3B0aW9uc1xuXG4gICAgdW5sZXNzIGJlZm9yZVxuICAgICAgZXhlY3V0ZUFjdGlvbigpXG4gICAgICByZXR1cm5cblxuICAgICMgVGhyb3cgZGVwcmVjYXRpb24gd2FybmluZy5cbiAgICBpZiB0eXBlb2YgYmVmb3JlIGlzbnQgJ2Z1bmN0aW9uJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnQ29udHJvbGxlciNiZWZvcmVBY3Rpb246IGZ1bmN0aW9uIGV4cGVjdGVkLiAnICtcbiAgICAgICAgJ09sZCBvYmplY3QtbGlrZSBmb3JtIGlzIG5vdCBzdXBwb3J0ZWQuJ1xuXG4gICAgIyBFeGVjdXRlIGFjdGlvbiBpbiBjb250cm9sbGVyIGNvbnRleHQuXG4gICAgcHJvbWlzZSA9IGNvbnRyb2xsZXIuYmVmb3JlQWN0aW9uIHBhcmFtcywgcm91dGUsIG9wdGlvbnNcbiAgICBpZiB0eXBlb2YgcHJvbWlzZT8udGhlbiBpcyAnZnVuY3Rpb24nXG4gICAgICBwcm9taXNlLnRoZW4gZXhlY3V0ZUFjdGlvblxuICAgIGVsc2VcbiAgICAgIGV4ZWN1dGVBY3Rpb24oKVxuXG4gICMgRGlzcG9zYWxcbiAgIyAtLS0tLS0tLVxuXG4gIGRpc3Bvc2VkOiBmYWxzZVxuXG4gIGRpc3Bvc2U6IC0+XG4gICAgcmV0dXJuIGlmIEBkaXNwb3NlZFxuXG4gICAgQHVuc3Vic2NyaWJlQWxsRXZlbnRzKClcblxuICAgIEBkaXNwb3NlZCA9IHRydWVcblxuICAgICMgWW914oCZcmUgZnJvemVuIHdoZW4geW91ciBoZWFydOKAmXMgbm90IG9wZW4uXG4gICAgT2JqZWN0LmZyZWV6ZSB0aGlzXG4iLCIndXNlIHN0cmljdCdcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuRXZlbnRCcm9rZXIgPSByZXF1aXJlICcuL2V2ZW50X2Jyb2tlcidcblxuIyBDb21wb3NpdGlvblxuIyAtLS0tLS0tLS0tLVxuXG4jIEEgdXRpbGl0eSBjbGFzcyB0aGF0IGlzIG1lYW50IGFzIGEgc2ltcGxlIHByb3hpZWQgdmVyc2lvbiBvZiBhXG4jIGNvbnRyb2xsZXIgdGhhdCBpcyB1c2VkIGludGVybmFsbHkgdG8gaW5mbGF0ZSBzaW1wbGVcbiMgY2FsbHMgdG8gIWNvbXBvc2VyOmNvbXBvc2UgYW5kIG1heSBiZSBleHRlbmRlZCBhbmQgdXNlZCB0byBoYXZlIGNvbXBsZXRlXG4jIGNvbnRyb2wgb3ZlciB0aGUgY29tcG9zaXRpb24gcHJvY2Vzcy5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgQ29tcG9zaXRpb25cbiAgIyBCb3Jyb3cgdGhlIHN0YXRpYyBleHRlbmQgbWV0aG9kIGZyb20gQmFja2JvbmUuXG4gIEBleHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmRcblxuICAjIE1peGluIEJhY2tib25lIGV2ZW50cyBhbmQgRXZlbnRCcm9rZXIuXG4gIF8uZXh0ZW5kIEBwcm90b3R5cGUsIEJhY2tib25lLkV2ZW50c1xuICBfLmV4dGVuZCBAcHJvdG90eXBlLCBFdmVudEJyb2tlclxuXG4gICMgVGhlIGl0ZW0gdGhhdCBpcyBjb21wb3NlZDsgdGhpcyBpcyBieSBkZWZhdWx0IGEgcmVmZXJlbmNlIHRvIHRoaXMuXG4gIGl0ZW06IG51bGxcblxuICAjIFRoZSBvcHRpb25zIHRoYXQgdGhpcyBjb21wb3NpdGlvbiB3YXMgY29uc3RydWN0ZWQgd2l0aC5cbiAgb3B0aW9uczogbnVsbFxuXG4gICMgV2hldGhlciB0aGlzIGNvbXBvc2l0aW9uIGlzIGN1cnJlbnRseSBzdGFsZS5cbiAgX3N0YWxlOiBmYWxzZVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICBAb3B0aW9ucyA9IF8uZXh0ZW5kIHt9LCBvcHRpb25zXG4gICAgQGl0ZW0gPSB0aGlzXG4gICAgQGluaXRpYWxpemUgQG9wdGlvbnNcblxuICBpbml0aWFsaXplOiAtPlxuICAgICMgRW1wdHkgcGVyIGRlZmF1bHQuXG5cbiAgIyBUaGUgY29tcG9zZSBtZXRob2QgaXMgY2FsbGVkIHdoZW4gdGhpcyBjb21wb3NpdGlvbiBpcyB0byBiZSBjb21wb3NlZC5cbiAgY29tcG9zZTogLT5cbiAgICAjIEVtcHR5IHBlciBkZWZhdWx0LlxuXG4gICMgVGhlIGNoZWNrIG1ldGhvZCBpcyBjYWxsZWQgd2hlbiB0aGlzIGNvbXBvc2l0aW9uIGlzIGFza2VkIHRvIGJlXG4gICMgY29tcG9zZWQgYWdhaW4uIFRoZSBwYXNzZWQgb3B0aW9ucyBhcmUgdGhlIG5ld2x5IHBhc3NlZCBvcHRpb25zLlxuICAjIElmIHRoaXMgcmV0dXJucyBmYWxzZSB0aGVuIHRoZSBjb21wb3NpdGlvbiBpcyByZS1jb21wb3NlZC5cbiAgY2hlY2s6IChvcHRpb25zKSAtPlxuICAgIF8uaXNFcXVhbCBAb3B0aW9ucywgb3B0aW9uc1xuXG4gICMgTWFya3MgYWxsIGFwcGxpY2FibGUgaXRlbXMgYXMgc3RhbGUuXG4gIHN0YWxlOiAodmFsdWUpIC0+XG4gICAgIyBSZXR1cm4gdGhlIGN1cnJlbnQgcHJvcGVydHkgaWYgbm90IHJlcXVlc3RpbmcgYSBjaGFuZ2UuXG4gICAgcmV0dXJuIEBfc3RhbGUgdW5sZXNzIHZhbHVlP1xuXG4gICAgIyBTZXRzIHRoZSBzdGFsZSBwcm9wZXJ0eSBmb3IgZXZlcnkgaXRlbSBpbiB0aGUgY29tcG9zaXRpb24gdGhhdCBoYXMgaXQuXG4gICAgQF9zdGFsZSA9IHZhbHVlXG4gICAgZm9yIG5hbWUsIGl0ZW0gb2YgdGhpcyB3aGVuIChcbiAgICAgIGl0ZW0gYW5kIGl0ZW0gaXNudCB0aGlzIGFuZFxuICAgICAgdHlwZW9mIGl0ZW0gaXMgJ29iamVjdCcgYW5kIGl0ZW0uaGFzT3duUHJvcGVydHkgJ3N0YWxlJ1xuICAgIClcbiAgICAgIGl0ZW0uc3RhbGUgPSB2YWx1ZVxuXG4gICAgIyBSZXR1cm4gbm90aGluZy5cbiAgICByZXR1cm5cblxuICAjIERpc3Bvc2FsXG4gICMgLS0tLS0tLS1cblxuICBkaXNwb3NlZDogZmFsc2VcblxuICBkaXNwb3NlOiAtPlxuICAgIHJldHVybiBpZiBAZGlzcG9zZWRcblxuICAgICMgRGlzcG9zZSBhbmQgZGVsZXRlIGFsbCBtZW1iZXJzIHdoaWNoIGFyZSBkaXNwb3NhYmxlLlxuICAgIGZvciBrZXkgaW4gT2JqZWN0LmtleXMgdGhpc1xuICAgICAgbWVtYmVyID0gQFtrZXldXG4gICAgICBpZiBtZW1iZXIgYW5kIG1lbWJlciBpc250IHRoaXMgYW5kXG4gICAgICB0eXBlb2YgbWVtYmVyLmRpc3Bvc2UgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICBtZW1iZXIuZGlzcG9zZSgpXG4gICAgICAgIGRlbGV0ZSBAW2tleV1cblxuICAgICMgVW5iaW5kIGhhbmRsZXJzIG9mIGdsb2JhbCBldmVudHMuXG4gICAgQHVuc3Vic2NyaWJlQWxsRXZlbnRzKClcblxuICAgICMgVW5iaW5kIGFsbCByZWZlcmVuY2VkIGhhbmRsZXJzLlxuICAgIEBzdG9wTGlzdGVuaW5nKClcblxuICAgICMgUmVtb3ZlIHByb3BlcnRpZXMgd2hpY2ggYXJlIG5vdCBkaXNwb3NhYmxlLlxuICAgIGRlbGV0ZSB0aGlzLnJlZGlyZWN0ZWRcblxuICAgICMgRmluaXNoZWQuXG4gICAgQGRpc3Bvc2VkID0gdHJ1ZVxuXG4gICAgIyBZb3UncmUgZnJvemVuIHdoZW4geW91ciBoZWFydOKAmXMgbm90IG9wZW4uXG4gICAgT2JqZWN0LmZyZWV6ZSB0aGlzXG4iLCIndXNlIHN0cmljdCdcblxubWVkaWF0b3IgPSByZXF1aXJlICcuLi9tZWRpYXRvcidcblxuIyBBZGQgZnVuY3Rpb25hbGl0eSB0byBzdWJzY3JpYmUgYW5kIHB1Ymxpc2ggdG8gZ2xvYmFsXG4jIFB1Ymxpc2gvU3Vic2NyaWJlIGV2ZW50cyBzbyB0aGV5IGNhbiBiZSByZW1vdmVkIGFmdGVyd2FyZHNcbiMgd2hlbiBkaXNwb3NpbmcgdGhlIG9iamVjdC5cbiNcbiMgTWl4aW4gdGhpcyBvYmplY3QgdG8gYWRkIHRoZSBzdWJzY3JpYmVyIGNhcGFiaWxpdHkgdG8gYW55IG9iamVjdDpcbiMgXy5leHRlbmQgb2JqZWN0LCBFdmVudEJyb2tlclxuIyBPciB0byBhIHByb3RvdHlwZSBvZiBhIGNsYXNzOlxuIyBfLmV4dGVuZCBAcHJvdG90eXBlLCBFdmVudEJyb2tlclxuI1xuIyBTaW5jZSBCYWNrYm9uZSAwLjkuMiB0aGlzIGFic3RyYWN0aW9uIGp1c3Qgc2VydmVzIHRoZSBwdXJwb3NlXG4jIHRoYXQgYSBoYW5kbGVyIGNhbm5vdCBiZSByZWdpc3RlcmVkIHR3aWNlIGZvciB0aGUgc2FtZSBldmVudC5cblxuRXZlbnRCcm9rZXIgPVxuICBzdWJzY3JpYmVFdmVudDogKHR5cGUsIGhhbmRsZXIpIC0+XG4gICAgaWYgdHlwZW9mIHR5cGUgaXNudCAnc3RyaW5nJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnRXZlbnRCcm9rZXIjc3Vic2NyaWJlRXZlbnQ6ICcgK1xuICAgICAgICAndHlwZSBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgIGlmIHR5cGVvZiBoYW5kbGVyIGlzbnQgJ2Z1bmN0aW9uJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnRXZlbnRCcm9rZXIjc3Vic2NyaWJlRXZlbnQ6ICcgK1xuICAgICAgICAnaGFuZGxlciBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nXG5cbiAgICAjIEVuc3VyZSB0aGF0IGEgaGFuZGxlciBpc27igJl0IHJlZ2lzdGVyZWQgdHdpY2UuXG4gICAgbWVkaWF0b3IudW5zdWJzY3JpYmUgdHlwZSwgaGFuZGxlciwgdGhpc1xuXG4gICAgIyBSZWdpc3RlciBnbG9iYWwgaGFuZGxlciwgZm9yY2UgY29udGV4dCB0byB0aGUgc3Vic2NyaWJlci5cbiAgICBtZWRpYXRvci5zdWJzY3JpYmUgdHlwZSwgaGFuZGxlciwgdGhpc1xuXG4gIHN1YnNjcmliZUV2ZW50T25jZTogKHR5cGUsIGhhbmRsZXIpIC0+XG4gICAgaWYgdHlwZW9mIHR5cGUgaXNudCAnc3RyaW5nJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnRXZlbnRCcm9rZXIjc3Vic2NyaWJlRXZlbnRPbmNlOiAnICtcbiAgICAgICAgJ3R5cGUgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZydcbiAgICBpZiB0eXBlb2YgaGFuZGxlciBpc250ICdmdW5jdGlvbidcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgJ0V2ZW50QnJva2VyI3N1YnNjcmliZUV2ZW50T25jZTogJyArXG4gICAgICAgICdoYW5kbGVyIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbidcblxuICAgICMgRW5zdXJlIHRoYXQgYSBoYW5kbGVyIGlzbuKAmXQgcmVnaXN0ZXJlZCB0d2ljZS5cbiAgICBtZWRpYXRvci51bnN1YnNjcmliZSB0eXBlLCBoYW5kbGVyLCB0aGlzXG5cbiAgICAjIFJlZ2lzdGVyIGdsb2JhbCBoYW5kbGVyLCBmb3JjZSBjb250ZXh0IHRvIHRoZSBzdWJzY3JpYmVyLlxuICAgIG1lZGlhdG9yLnN1YnNjcmliZU9uY2UgdHlwZSwgaGFuZGxlciwgdGhpc1xuXG4gIHVuc3Vic2NyaWJlRXZlbnQ6ICh0eXBlLCBoYW5kbGVyKSAtPlxuICAgIGlmIHR5cGVvZiB0eXBlIGlzbnQgJ3N0cmluZydcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgJ0V2ZW50QnJva2VyI3Vuc3Vic2NyaWJlRXZlbnQ6ICcgK1xuICAgICAgICAndHlwZSBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgIGlmIHR5cGVvZiBoYW5kbGVyIGlzbnQgJ2Z1bmN0aW9uJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnRXZlbnRCcm9rZXIjdW5zdWJzY3JpYmVFdmVudDogJyArXG4gICAgICAgICdoYW5kbGVyIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbidcblxuICAgICMgUmVtb3ZlIGdsb2JhbCBoYW5kbGVyLlxuICAgIG1lZGlhdG9yLnVuc3Vic2NyaWJlIHR5cGUsIGhhbmRsZXJcblxuICAjIFVuYmluZCBhbGwgZ2xvYmFsIGhhbmRsZXJzLlxuICB1bnN1YnNjcmliZUFsbEV2ZW50czogLT5cbiAgICAjIFJlbW92ZSBhbGwgaGFuZGxlcnMgd2l0aCBhIGNvbnRleHQgb2YgdGhpcyBzdWJzY3JpYmVyLlxuICAgIG1lZGlhdG9yLnVuc3Vic2NyaWJlIG51bGwsIG51bGwsIHRoaXNcblxuICBwdWJsaXNoRXZlbnQ6ICh0eXBlLCBhcmdzLi4uKSAtPlxuICAgIGlmIHR5cGVvZiB0eXBlIGlzbnQgJ3N0cmluZydcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgJ0V2ZW50QnJva2VyI3B1Ymxpc2hFdmVudDogJyArXG4gICAgICAgICd0eXBlIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcnXG5cbiAgICAjIFB1Ymxpc2ggZ2xvYmFsIGhhbmRsZXIuXG4gICAgbWVkaWF0b3IucHVibGlzaCB0eXBlLCBhcmdzLi4uXG5cbiMgWW914oCZcmUgZnJvemVuIHdoZW4geW91ciBoZWFydOKAmXMgbm90IG9wZW4uXG5PYmplY3QuZnJlZXplIEV2ZW50QnJva2VyXG5cbiMgUmV0dXJuIG91ciBjcmVhdGlvbi5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRCcm9rZXJcbiIsIid1c2Ugc3RyaWN0J1xuXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZSdcbkJhY2tib25lID0gcmVxdWlyZSAnYmFja2JvbmUnXG5cbiMgQ2FjaGVkIHJlZ2V4IGZvciBzdHJpcHBpbmcgYSBsZWFkaW5nIGhhc2gvc2xhc2ggYW5kIHRyYWlsaW5nIHNwYWNlLlxucm91dGVTdHJpcHBlciA9IC9eWyNcXC9dfFxccyskL2dcblxuIyBDYWNoZWQgcmVnZXggZm9yIHN0cmlwcGluZyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzLlxucm9vdFN0cmlwcGVyID0gL15cXC8rfFxcLyskL2dcblxuIyBQYXRjaGVkIEJhY2tib25lLkhpc3Rvcnkgd2l0aCBhIGJhc2ljIHF1ZXJ5IHN0cmluZ3Mgc3VwcG9ydFxuY2xhc3MgSGlzdG9yeSBleHRlbmRzIEJhY2tib25lLkhpc3RvcnlcblxuICAjIEdldCB0aGUgY3Jvc3MtYnJvd3NlciBub3JtYWxpemVkIFVSTCBmcmFnbWVudCwgZWl0aGVyIGZyb20gdGhlIFVSTCxcbiAgIyB0aGUgaGFzaCwgb3IgdGhlIG92ZXJyaWRlLlxuICBnZXRGcmFnbWVudDogKGZyYWdtZW50LCBmb3JjZVB1c2hTdGF0ZSkgLT5cbiAgICBpZiBub3QgZnJhZ21lbnQ/XG4gICAgICBpZiBAX2hhc1B1c2hTdGF0ZSBvciBub3QgQF93YW50c0hhc2hDaGFuZ2Ugb3IgZm9yY2VQdXNoU3RhdGVcbiAgICAgICAgIyBDSEFOR0VEOiBNYWtlIGZyYWdtZW50IGluY2x1ZGUgcXVlcnkgc3RyaW5nLlxuICAgICAgICBmcmFnbWVudCA9IEBsb2NhdGlvbi5wYXRobmFtZSArIEBsb2NhdGlvbi5zZWFyY2hcbiAgICAgICAgIyBSZW1vdmUgdHJhaWxpbmcgc2xhc2guXG4gICAgICAgIHJvb3QgPSBAcm9vdC5yZXBsYWNlIC9cXC8kLywgJydcbiAgICAgICAgZnJhZ21lbnQgPSBmcmFnbWVudC5zbGljZSByb290Lmxlbmd0aCB1bmxlc3MgZnJhZ21lbnQuaW5kZXhPZiByb290XG4gICAgICBlbHNlXG4gICAgICAgIGZyYWdtZW50ID0gQGdldEhhc2goKVxuXG4gICAgZnJhZ21lbnQucmVwbGFjZSByb3V0ZVN0cmlwcGVyLCAnJ1xuXG4gICMgU3RhcnQgdGhlIGhhc2ggY2hhbmdlIGhhbmRsaW5nLCByZXR1cm5pbmcgYHRydWVgIGlmIHRoZSBjdXJyZW50IFVSTCBtYXRjaGVzXG4gICMgYW4gZXhpc3Rpbmcgcm91dGUsIGFuZCBgZmFsc2VgIG90aGVyd2lzZS5cbiAgc3RhcnQ6IChvcHRpb25zKSAtPlxuICAgIGlmIEJhY2tib25lLkhpc3Rvcnkuc3RhcnRlZFxuICAgICAgdGhyb3cgbmV3IEVycm9yICdCYWNrYm9uZS5oaXN0b3J5IGhhcyBhbHJlYWR5IGJlZW4gc3RhcnRlZCdcbiAgICBCYWNrYm9uZS5IaXN0b3J5LnN0YXJ0ZWQgPSB0cnVlXG5cbiAgICAjIEZpZ3VyZSBvdXQgdGhlIGluaXRpYWwgY29uZmlndXJhdGlvbi4gSXMgcHVzaFN0YXRlIGRlc2lyZWQ/XG4gICAgIyBJcyBpdCBhdmFpbGFibGU/IEFyZSBjdXN0b20gc3RyaXBwZXJzIHByb3ZpZGVkP1xuICAgIEBvcHRpb25zICAgICAgICAgID0gXy5leHRlbmQge30sIHtyb290OiAnLyd9LCBAb3B0aW9ucywgb3B0aW9uc1xuICAgIEByb290ICAgICAgICAgICAgID0gQG9wdGlvbnMucm9vdFxuICAgIEBfd2FudHNIYXNoQ2hhbmdlID0gQG9wdGlvbnMuaGFzaENoYW5nZSBpc250IGZhbHNlXG4gICAgQF93YW50c1B1c2hTdGF0ZSAgPSBCb29sZWFuIEBvcHRpb25zLnB1c2hTdGF0ZVxuICAgIEBfaGFzUHVzaFN0YXRlICAgID0gQm9vbGVhbiBAb3B0aW9ucy5wdXNoU3RhdGUgYW5kIEBoaXN0b3J5Py5wdXNoU3RhdGVcbiAgICBmcmFnbWVudCAgICAgICAgICA9IEBnZXRGcmFnbWVudCgpXG4gICAgcm91dGVTdHJpcHBlciAgICAgPSBAb3B0aW9ucy5yb3V0ZVN0cmlwcGVyID8gcm91dGVTdHJpcHBlclxuICAgIHJvb3RTdHJpcHBlciAgICAgID0gQG9wdGlvbnMucm9vdFN0cmlwcGVyID8gcm9vdFN0cmlwcGVyXG5cbiAgICAjIE5vcm1hbGl6ZSByb290IHRvIGFsd2F5cyBpbmNsdWRlIGEgbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2guXG4gICAgQHJvb3QgPSAoJy8nICsgQHJvb3QgKyAnLycpLnJlcGxhY2Ugcm9vdFN0cmlwcGVyLCAnLydcblxuICAgICMgRGVwZW5kaW5nIG9uIHdoZXRoZXIgd2UncmUgdXNpbmcgcHVzaFN0YXRlIG9yIGhhc2hlcyxcbiAgICAjIGRldGVybWluZSBob3cgd2UgY2hlY2sgdGhlIFVSTCBzdGF0ZS5cbiAgICBpZiBAX2hhc1B1c2hTdGF0ZVxuICAgICAgQmFja2JvbmUuJCh3aW5kb3cpLm9uICdwb3BzdGF0ZScsIEBjaGVja1VybFxuICAgIGVsc2UgaWYgQF93YW50c0hhc2hDaGFuZ2VcbiAgICAgIEJhY2tib25lLiQod2luZG93KS5vbiAnaGFzaGNoYW5nZScsIEBjaGVja1VybFxuXG4gICAgIyBEZXRlcm1pbmUgaWYgd2UgbmVlZCB0byBjaGFuZ2UgdGhlIGJhc2UgdXJsLCBmb3IgYSBwdXNoU3RhdGUgbGlua1xuICAgICMgb3BlbmVkIGJ5IGEgbm9uLXB1c2hTdGF0ZSBicm93c2VyLlxuICAgIEBmcmFnbWVudCA9IGZyYWdtZW50XG4gICAgbG9jID0gQGxvY2F0aW9uXG4gICAgYXRSb290ID0gbG9jLnBhdGhuYW1lLnJlcGxhY2UoL1teXFwvXSQvLCAnJCYvJykgaXMgQHJvb3RcblxuICAgICMgSWYgd2UndmUgc3RhcnRlZCBvZmYgd2l0aCBhIHJvdXRlIGZyb20gYSBgcHVzaFN0YXRlYC1lbmFibGVkIGJyb3dzZXIsXG4gICAgIyBidXQgd2UncmUgY3VycmVudGx5IGluIGEgYnJvd3NlciB0aGF0IGRvZXNuJ3Qgc3VwcG9ydCBpdC4uLlxuICAgIGlmIEBfd2FudHNIYXNoQ2hhbmdlIGFuZCBAX3dhbnRzUHVzaFN0YXRlIGFuZFxuICAgIG5vdCBAX2hhc1B1c2hTdGF0ZSBhbmQgbm90IGF0Um9vdFxuICAgICAgIyBDSEFOR0VEOiBQcmV2ZW50IHF1ZXJ5IHN0cmluZyBmcm9tIGJlaW5nIGFkZGVkIGJlZm9yZSBoYXNoLlxuICAgICAgIyBTbywgaXQgd2lsbCBhcHBlYXIgb25seSBhZnRlciAjLCBhcyBpdCBoYXMgYmVlbiBhbHJlYWR5IGluY2x1ZGVkXG4gICAgICAjIGludG8gQGZyYWdtZW50XG4gICAgICBAZnJhZ21lbnQgPSBAZ2V0RnJhZ21lbnQgbnVsbCwgdHJ1ZVxuICAgICAgQGxvY2F0aW9uLnJlcGxhY2UgQHJvb3QgKyAnIycgKyBAZnJhZ21lbnRcbiAgICAgICMgUmV0dXJuIGltbWVkaWF0ZWx5IGFzIGJyb3dzZXIgd2lsbCBkbyByZWRpcmVjdCB0byBuZXcgdXJsXG4gICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgIyBPciBpZiB3ZSd2ZSBzdGFydGVkIG91dCB3aXRoIGEgaGFzaC1iYXNlZCByb3V0ZSwgYnV0IHdlJ3JlIGN1cnJlbnRseVxuICAgICMgaW4gYSBicm93c2VyIHdoZXJlIGl0IGNvdWxkIGJlIGBwdXNoU3RhdGVgLWJhc2VkIGluc3RlYWQuLi5cbiAgICBlbHNlIGlmIEBfd2FudHNQdXNoU3RhdGUgYW5kIEBfaGFzUHVzaFN0YXRlIGFuZCBhdFJvb3QgYW5kIGxvYy5oYXNoXG4gICAgICBAZnJhZ21lbnQgPSBAZ2V0SGFzaCgpLnJlcGxhY2Ugcm91dGVTdHJpcHBlciwgJydcbiAgICAgICMgQ0hBTkdFRDogSXQncyBubyBsb25nZXIgbmVlZGVkIHRvIGFkZCBsb2Muc2VhcmNoIGF0IHRoZSBlbmQsXG4gICAgICAjIGFzIHF1ZXJ5IHBhcmFtcyBoYXZlIGJlZW4gYWxyZWFkeSBpbmNsdWRlZCBpbnRvIEBmcmFnbWVudFxuICAgICAgQGhpc3RvcnkucmVwbGFjZVN0YXRlIHt9LCBkb2N1bWVudC50aXRsZSwgQHJvb3QgKyBAZnJhZ21lbnRcblxuICAgIEBsb2FkVXJsKCkgaWYgbm90IEBvcHRpb25zLnNpbGVudFxuXG4gIG5hdmlnYXRlOiAoZnJhZ21lbnQgPSAnJywgb3B0aW9ucykgLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIEJhY2tib25lLkhpc3Rvcnkuc3RhcnRlZFxuXG4gICAgb3B0aW9ucyA9IHt0cmlnZ2VyOiBvcHRpb25zfSBpZiBub3Qgb3B0aW9ucyBvciBvcHRpb25zIGlzIHRydWVcblxuICAgIGZyYWdtZW50ID0gQGdldEZyYWdtZW50IGZyYWdtZW50XG4gICAgdXJsID0gQHJvb3QgKyBmcmFnbWVudFxuXG4gICAgIyBSZW1vdmUgZnJhZ21lbnQgcmVwbGFjZSwgY296IHF1ZXJ5IHN0cmluZyBkaWZmZXJlbnQgbWVhbiBkaWZmZXJlbmNlIHBhZ2VcbiAgICAjIFN0cmlwIHRoZSBmcmFnbWVudCBvZiB0aGUgcXVlcnkgYW5kIGhhc2ggZm9yIG1hdGNoaW5nLlxuICAgICMgZnJhZ21lbnQgPSBmcmFnbWVudC5yZXBsYWNlKHBhdGhTdHJpcHBlciwgJycpXG5cbiAgICByZXR1cm4gZmFsc2UgaWYgQGZyYWdtZW50IGlzIGZyYWdtZW50XG4gICAgQGZyYWdtZW50ID0gZnJhZ21lbnRcblxuICAgICMgRG9uJ3QgaW5jbHVkZSBhIHRyYWlsaW5nIHNsYXNoIG9uIHRoZSByb290LlxuICAgIGlmIGZyYWdtZW50Lmxlbmd0aCBpcyAwIGFuZCB1cmwgaXNudCBAcm9vdFxuICAgICAgdXJsID0gdXJsLnNsaWNlIDAsIC0xXG5cbiAgICAjIElmIHB1c2hTdGF0ZSBpcyBhdmFpbGFibGUsIHdlIHVzZSBpdCB0byBzZXQgdGhlIGZyYWdtZW50IGFzIGEgcmVhbCBVUkwuXG4gICAgaWYgQF9oYXNQdXNoU3RhdGVcbiAgICAgIGhpc3RvcnlNZXRob2QgPSBpZiBvcHRpb25zLnJlcGxhY2UgdGhlbiAncmVwbGFjZVN0YXRlJyBlbHNlICdwdXNoU3RhdGUnXG4gICAgICBAaGlzdG9yeVtoaXN0b3J5TWV0aG9kXSB7fSwgZG9jdW1lbnQudGl0bGUsIHVybFxuXG4gICAgIyBJZiBoYXNoIGNoYW5nZXMgaGF2ZW4ndCBiZWVuIGV4cGxpY2l0bHkgZGlzYWJsZWQsIHVwZGF0ZSB0aGUgaGFzaFxuICAgICMgZnJhZ21lbnQgdG8gc3RvcmUgaGlzdG9yeS5cbiAgICBlbHNlIGlmIEBfd2FudHNIYXNoQ2hhbmdlXG4gICAgICBAX3VwZGF0ZUhhc2ggQGxvY2F0aW9uLCBmcmFnbWVudCwgb3B0aW9ucy5yZXBsYWNlXG5cbiAgICAjIElmIHlvdSd2ZSB0b2xkIHVzIHRoYXQgeW91IGV4cGxpY2l0bHkgZG9uJ3Qgd2FudCBmYWxsYmFjayBoYXNoY2hhbmdlLVxuICAgICMgYmFzZWQgaGlzdG9yeSwgdGhlbiBgbmF2aWdhdGVgIGJlY29tZXMgYSBwYWdlIHJlZnJlc2guXG4gICAgZWxzZVxuICAgICAgcmV0dXJuIEBsb2NhdGlvbi5hc3NpZ24gdXJsXG5cbiAgICBpZiBvcHRpb25zLnRyaWdnZXJcbiAgICAgIEBsb2FkVXJsIGZyYWdtZW50XG5cbm1vZHVsZS5leHBvcnRzID0gaWYgQmFja2JvbmUuJCB0aGVuIEhpc3RvcnkgZWxzZSBCYWNrYm9uZS5IaXN0b3J5XG4iLCIndXNlIHN0cmljdCdcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuXG5FdmVudEJyb2tlciA9IHJlcXVpcmUgJy4vZXZlbnRfYnJva2VyJ1xudXRpbHMgPSByZXF1aXJlICcuL3V0aWxzJ1xuQ29udHJvbGxlciA9IHJlcXVpcmUgJy4uL2NvbnRyb2xsZXJzL2NvbnRyb2xsZXInXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUm91dGVcbiAgIyBCb3Jyb3cgdGhlIHN0YXRpYyBleHRlbmQgbWV0aG9kIGZyb20gQmFja2JvbmUuXG4gIEBleHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmRcblxuICAjIE1peGluIGFuIEV2ZW50QnJva2VyLlxuICBfLmV4dGVuZCBAcHJvdG90eXBlLCBFdmVudEJyb2tlclxuXG4gICMgVGFrZW4gZnJvbSBCYWNrYm9uZS5Sb3V0ZXIuXG4gIGVzY2FwZVJlZ0V4cCA9IC9bXFwte31cXFtcXF0rPy4sXFxcXFxcXiR8I1xcc10vZ1xuICBvcHRpb25hbFJlZ0V4cCA9IC9cXCgoLio/KVxcKS9nXG4gIHBhcmFtUmVnRXhwID0gLyg/Ojp8XFwqKShcXHcrKS9nXG5cbiAgIyBBZGQgb3IgcmVtb3ZlIHRyYWlsaW5nIHNsYXNoIGZyb20gcGF0aCBhY2NvcmRpbmcgdG8gdHJhaWxpbmcgb3B0aW9uLlxuICBwcm9jZXNzVHJhaWxpbmdTbGFzaCA9IChwYXRoLCB0cmFpbGluZykgLT5cbiAgICBzd2l0Y2ggdHJhaWxpbmdcbiAgICAgIHdoZW4geWVzXG4gICAgICAgIHBhdGggKz0gJy8nIHVubGVzcyBwYXRoWy0xLi5dIGlzICcvJ1xuICAgICAgd2hlbiBub1xuICAgICAgICBwYXRoID0gcGF0aFsuLi4tMV0gaWYgcGF0aFstMS4uXSBpcyAnLydcbiAgICBwYXRoXG5cbiAgIyBDcmVhdGUgYSByb3V0ZSBmb3IgYSBVUkwgcGF0dGVybiBhbmQgYSBjb250cm9sbGVyIGFjdGlvblxuICAjIGUuZy4gbmV3IFJvdXRlICcvdXNlcnMvOmlkJywgJ3VzZXJzJywgJ3Nob3cnLCB7IHNvbWU6ICdvcHRpb25zJyB9XG4gIGNvbnN0cnVjdG9yOiAoQHBhdHRlcm4sIEBjb250cm9sbGVyLCBAYWN0aW9uLCBvcHRpb25zKSAtPlxuICAgICMgRGlzYWxsb3cgcmVnZXhwIHJvdXRlcy5cbiAgICBpZiB0eXBlb2YgQHBhdHRlcm4gaXNudCAnc3RyaW5nJ1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdSb3V0ZTogUmVnRXhwcyBhcmUgbm90IHN1cHBvcnRlZC5cbiAgICAgICAgVXNlIHN0cmluZ3Mgd2l0aCA6bmFtZXMgYW5kIGBjb25zdHJhaW50c2Agb3B0aW9uIG9mIHJvdXRlJ1xuXG4gICAgIyBDbG9uZSBvcHRpb25zLlxuICAgIEBvcHRpb25zID0gXy5leHRlbmQge30sIG9wdGlvbnNcbiAgICBAb3B0aW9ucy5wYXJhbXNJblFTID0gdHJ1ZSBpZiBAb3B0aW9ucy5wYXJhbXNJblFTIGlzbnQgZmFsc2VcblxuICAgICMgU3RvcmUgdGhlIG5hbWUgb24gdGhlIHJvdXRlIGlmIGdpdmVuXG4gICAgQG5hbWUgPSBAb3B0aW9ucy5uYW1lIGlmIEBvcHRpb25zLm5hbWU/XG5cbiAgICAjIERvbuKAmXQgYWxsb3cgYW1iaWd1aXR5IHdpdGggY29udHJvbGxlciNhY3Rpb24uXG4gICAgaWYgQG5hbWUgYW5kIEBuYW1lLmluZGV4T2YoJyMnKSBpc250IC0xXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ1JvdXRlOiBcIiNcIiBjYW5ub3QgYmUgdXNlZCBpbiBuYW1lJ1xuXG4gICAgIyBTZXQgZGVmYXVsdCByb3V0ZSBuYW1lLlxuICAgIEBuYW1lID89IEBjb250cm9sbGVyICsgJyMnICsgQGFjdGlvblxuXG4gICAgIyBJbml0aWFsaXplIGxpc3Qgb2YgOnBhcmFtcyB3aGljaCB0aGUgcm91dGUgd2lsbCB1c2UuXG4gICAgQGFsbFBhcmFtcyA9IFtdXG4gICAgQHJlcXVpcmVkUGFyYW1zID0gW11cbiAgICBAb3B0aW9uYWxQYXJhbXMgPSBbXVxuXG4gICAgIyBDaGVjayBpZiB0aGUgYWN0aW9uIGlzIGEgcmVzZXJ2ZWQgbmFtZVxuICAgIGlmIEBhY3Rpb24gb2YgQ29udHJvbGxlci5wcm90b3R5cGVcbiAgICAgIHRocm93IG5ldyBFcnJvciAnUm91dGU6IFlvdSBzaG91bGQgbm90IHVzZSBleGlzdGluZyBjb250cm9sbGVyICcgK1xuICAgICAgICAncHJvcGVydGllcyBhcyBhY3Rpb24gbmFtZXMnXG5cbiAgICBAY3JlYXRlUmVnRXhwKClcblxuICAgICMgWW914oCZcmUgZnJvemVuIHdoZW4geW91ciBoZWFydOKAmXMgbm90IG9wZW4uXG4gICAgT2JqZWN0LmZyZWV6ZSB0aGlzXG5cbiAgIyBUZXN0cyBpZiByb3V0ZSBwYXJhbXMgYXJlIGVxdWFsIHRvIGNyaXRlcmlhLlxuICBtYXRjaGVzOiAoY3JpdGVyaWEpIC0+XG4gICAgaWYgdHlwZW9mIGNyaXRlcmlhIGlzICdzdHJpbmcnXG4gICAgICBjcml0ZXJpYSBpcyBAbmFtZVxuICAgIGVsc2VcbiAgICAgIHByb3BlcnRpZXNDb3VudCA9IDBcbiAgICAgIGZvciBuYW1lIGluIFsnbmFtZScsICdhY3Rpb24nLCAnY29udHJvbGxlciddXG4gICAgICAgIHByb3BlcnRpZXNDb3VudCsrXG4gICAgICAgIHByb3BlcnR5ID0gY3JpdGVyaWFbbmFtZV1cbiAgICAgICAgcmV0dXJuIGZhbHNlIGlmIHByb3BlcnR5IGFuZCBwcm9wZXJ0eSBpc250IHRoaXNbbmFtZV1cbiAgICAgIGludmFsaWRQYXJhbXNDb3VudCA9IHByb3BlcnRpZXNDb3VudCBpcyAxIGFuZCBuYW1lIGluXG4gICAgICAgIFsnYWN0aW9uJywgJ2NvbnRyb2xsZXInXVxuICAgICAgbm90IGludmFsaWRQYXJhbXNDb3VudFxuXG4gICMgR2VuZXJhdGVzIHJvdXRlIFVSTCBmcm9tIHBhcmFtcy5cbiAgcmV2ZXJzZTogKHBhcmFtcywgcXVlcnkpIC0+XG4gICAgcGFyYW1zID0gQG5vcm1hbGl6ZVBhcmFtcyBwYXJhbXNcbiAgICByZW1haW5pbmdQYXJhbXMgPSBfLmV4dGVuZCB7fSwgcGFyYW1zXG4gICAgcmV0dXJuIGZhbHNlIGlmIHBhcmFtcyBpcyBmYWxzZVxuXG4gICAgdXJsID0gQHBhdHRlcm5cblxuICAgICMgRnJvbSBhIHBhcmFtcyBoYXNoOyB3ZSBuZWVkIHRvIGJlIGFibGUgdG8gcmV0dXJuXG4gICAgIyB0aGUgYWN0dWFsIFVSTCB0aGlzIHJvdXRlIHJlcHJlc2VudHMuXG4gICAgIyBJdGVyYXRlIGFuZCByZXBsYWNlIHBhcmFtcyBpbiBwYXR0ZXJuLlxuICAgIGZvciBuYW1lIGluIEByZXF1aXJlZFBhcmFtc1xuICAgICAgdmFsdWUgPSBwYXJhbXNbbmFtZV1cbiAgICAgIHVybCA9IHVybC5yZXBsYWNlIC8vL1s6Kl0je25hbWV9Ly8vZywgdmFsdWVcbiAgICAgIGRlbGV0ZSByZW1haW5pbmdQYXJhbXNbbmFtZV1cblxuICAgICMgUmVwbGFjZSBvcHRpb25hbCBwYXJhbXMuXG4gICAgZm9yIG5hbWUgaW4gQG9wdGlvbmFsUGFyYW1zXG4gICAgICBpZiB2YWx1ZSA9IHBhcmFtc1tuYW1lXVxuICAgICAgICB1cmwgPSB1cmwucmVwbGFjZSAvLy9bOipdI3tuYW1lfS8vL2csIHZhbHVlXG4gICAgICAgIGRlbGV0ZSByZW1haW5pbmdQYXJhbXNbbmFtZV1cblxuICAgICMgS2lsbCB1bmZ1bGZpbGxlZCBvcHRpb25hbCBwb3J0aW9ucy5cbiAgICByYXcgPSB1cmwucmVwbGFjZSBvcHRpb25hbFJlZ0V4cCwgKG1hdGNoLCBwb3J0aW9uKSAtPlxuICAgICAgaWYgcG9ydGlvbi5tYXRjaCAvWzoqXS9nXG4gICAgICAgIFwiXCJcbiAgICAgIGVsc2VcbiAgICAgICAgcG9ydGlvblxuXG4gICAgIyBBZGQgb3IgcmVtb3ZlIHRyYWlsaW5nIHNsYXNoIGFjY29yZGluZyB0byB0aGUgUm91dGUgb3B0aW9ucy5cbiAgICB1cmwgPSBwcm9jZXNzVHJhaWxpbmdTbGFzaCByYXcsIEBvcHRpb25zLnRyYWlsaW5nXG5cbiAgICBxdWVyeSA9IHV0aWxzLnF1ZXJ5UGFyYW1zLnBhcnNlIHF1ZXJ5IGlmIHR5cGVvZiBxdWVyeSBpc250ICdvYmplY3QnXG4gICAgXy5leHRlbmQgcXVlcnksIHJlbWFpbmluZ1BhcmFtcyB1bmxlc3MgQG9wdGlvbnMucGFyYW1zSW5RUyBpcyBmYWxzZVxuICAgIHVybCArPSAnPycgKyB1dGlscy5xdWVyeVBhcmFtcy5zdHJpbmdpZnkgcXVlcnkgdW5sZXNzIHV0aWxzLmlzRW1wdHkgcXVlcnlcbiAgICB1cmxcblxuICAjIFZhbGlkYXRlcyBpbmNvbWluZyBwYXJhbXMgYW5kIHJldHVybnMgdGhlbSBpbiBhIHVuaWZpZWQgZm9ybSAtIGhhc2hcbiAgbm9ybWFsaXplUGFyYW1zOiAocGFyYW1zKSAtPlxuICAgIGlmIEFycmF5LmlzQXJyYXkgcGFyYW1zXG4gICAgICAjIEVuc3VyZSB3ZSBoYXZlIGVub3VnaCBwYXJhbWV0ZXJzLlxuICAgICAgcmV0dXJuIGZhbHNlIGlmIHBhcmFtcy5sZW5ndGggPCBAcmVxdWlyZWRQYXJhbXMubGVuZ3RoXG5cbiAgICAgICMgQ29udmVydCBwYXJhbXMgZnJvbSBhcnJheSBpbnRvIG9iamVjdC5cbiAgICAgIHBhcmFtc0hhc2ggPSB7fVxuICAgICAgcm91dGVQYXJhbXMgPSBAcmVxdWlyZWRQYXJhbXMuY29uY2F0IEBvcHRpb25hbFBhcmFtc1xuICAgICAgZm9yIHBhcmFtSW5kZXggaW4gWzAuLnBhcmFtcy5sZW5ndGggLSAxXSBieSAxXG4gICAgICAgIHBhcmFtTmFtZSA9IHJvdXRlUGFyYW1zW3BhcmFtSW5kZXhdXG4gICAgICAgIHBhcmFtc0hhc2hbcGFyYW1OYW1lXSA9IHBhcmFtc1twYXJhbUluZGV4XVxuXG4gICAgICByZXR1cm4gZmFsc2UgdW5sZXNzIEB0ZXN0Q29uc3RyYWludHMgcGFyYW1zSGFzaFxuXG4gICAgICBwYXJhbXMgPSBwYXJhbXNIYXNoXG4gICAgZWxzZVxuICAgICAgIyBudWxsIG9yIHVuZGVmaW5lZCBwYXJhbXMgYXJlIGVxdWl2YWxlbnQgdG8gYW4gZW1wdHkgaGFzaFxuICAgICAgcGFyYW1zID89IHt9XG5cbiAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgQHRlc3RQYXJhbXMgcGFyYW1zXG5cbiAgICBwYXJhbXNcblxuICAjIFRlc3QgaWYgcGFzc2VkIHBhcmFtcyBoYXNoIG1hdGNoZXMgY3VycmVudCBjb25zdHJhaW50cy5cbiAgdGVzdENvbnN0cmFpbnRzOiAocGFyYW1zKSAtPlxuICAgICMgQXBwbHkgdGhlIHBhcmFtZXRlciBjb25zdHJhaW50cy5cbiAgICBjb25zdHJhaW50cyA9IEBvcHRpb25zLmNvbnN0cmFpbnRzXG4gICAgT2JqZWN0LmtleXMoY29uc3RyYWludHMgb3Ige30pLmV2ZXJ5IChrZXkpIC0+XG4gICAgICBjb25zdHJhaW50c1trZXldLnRlc3QgcGFyYW1zW2tleV1cblxuICAjIFRlc3QgaWYgcGFzc2VkIHBhcmFtcyBoYXNoIG1hdGNoZXMgY3VycmVudCByb3V0ZS5cbiAgdGVzdFBhcmFtczogKHBhcmFtcykgLT5cbiAgICAjIEVuc3VyZSB0aGF0IHBhcmFtcyBjb250YWlucyBhbGwgdGhlIHBhcmFtZXRlcnMgbmVlZGVkLlxuICAgIGZvciBwYXJhbU5hbWUgaW4gQHJlcXVpcmVkUGFyYW1zXG4gICAgICByZXR1cm4gZmFsc2UgaWYgcGFyYW1zW3BhcmFtTmFtZV0gaXMgdW5kZWZpbmVkXG5cbiAgICBAdGVzdENvbnN0cmFpbnRzIHBhcmFtc1xuXG4gICMgQ3JlYXRlcyB0aGUgYWN0dWFsIHJlZ3VsYXIgZXhwcmVzc2lvbiB0aGF0IEJhY2tib25lLkhpc3RvcnkjbG9hZFVybFxuICAjIHVzZXMgdG8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IHVybCBpcyBhIG1hdGNoLlxuICBjcmVhdGVSZWdFeHA6IC0+XG4gICAgcGF0dGVybiA9IEBwYXR0ZXJuXG5cbiAgICAjIEVzY2FwZSBtYWdpYyBjaGFyYWN0ZXJzLlxuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnJlcGxhY2UoZXNjYXBlUmVnRXhwLCAnXFxcXCQmJylcblxuICAgICMgS2VlcCBhY2N1cmF0ZSBiYWNrLXJlZmVyZW5jZSBpbmRpY2VzIGluIGFsbFBhcmFtcy5cbiAgICAjIEVnLiBNYXRjaGluZyB0aGUgcmVnZXggcmV0dXJucyBhcnJheXMgbGlrZSBbYSwgdW5kZWZpbmVkLCBjXVxuICAgICMgIGFuZCBlYWNoIGl0ZW0gbmVlZHMgdG8gYmUgbWF0Y2hlZCB0byB0aGUgY29ycmVjdFxuICAgICMgIG5hbWVkIHBhcmFtZXRlciB2aWEgaXRzIHBvc2l0aW9uIGluIHRoZSBhcnJheS5cbiAgICBAcmVwbGFjZVBhcmFtcyBwYXR0ZXJuLCAobWF0Y2gsIHBhcmFtKSA9PlxuICAgICAgQGFsbFBhcmFtcy5wdXNoIHBhcmFtXG5cbiAgICAjIFByb2Nlc3Mgb3B0aW9uYWwgcm91dGUgcG9ydGlvbnMuXG4gICAgcGF0dGVybiA9IHBhdHRlcm4ucmVwbGFjZSBvcHRpb25hbFJlZ0V4cCwgQHBhcnNlT3B0aW9uYWxQb3J0aW9uXG5cbiAgICAjIFByb2Nlc3MgcmVtYWluaW5nIHJlcXVpcmVkIHBhcmFtcy5cbiAgICBwYXR0ZXJuID0gQHJlcGxhY2VQYXJhbXMgcGF0dGVybiwgKG1hdGNoLCBwYXJhbSkgPT5cbiAgICAgIEByZXF1aXJlZFBhcmFtcy5wdXNoIHBhcmFtXG4gICAgICBAcGFyYW1DYXB0dXJlUGF0dGVybiBtYXRjaFxuXG4gICAgIyBDcmVhdGUgdGhlIGFjdHVhbCByZWd1bGFyIGV4cHJlc3Npb24sIG1hdGNoIHVudGlsIHRoZSBlbmQgb2YgdGhlIFVSTCxcbiAgICAjIHRyYWlsaW5nIHNsYXNoIG9yIHRoZSBiZWdpbiBvZiBxdWVyeSBzdHJpbmcuXG4gICAgQHJlZ0V4cCA9IC8vL14je3BhdHRlcm59KD89XFwvKig/PVxcP3wkKSkvLy9cblxuICBwYXJzZU9wdGlvbmFsUG9ydGlvbjogKG1hdGNoLCBvcHRpb25hbFBvcnRpb24pID0+XG4gICAgIyBFeHRyYWN0IGFuZCByZXBsYWNlIHBhcmFtcy5cbiAgICBwb3J0aW9uID0gQHJlcGxhY2VQYXJhbXMgb3B0aW9uYWxQb3J0aW9uLCAobWF0Y2gsIHBhcmFtKSA9PlxuICAgICAgQG9wdGlvbmFsUGFyYW1zLnB1c2ggcGFyYW1cbiAgICAgICMgUmVwbGFjZSB0aGUgbWF0Y2ggKGVnLiA6Zm9vKSB3aXRoIGNhcHR1cmluZyBncm91cHMuXG4gICAgICBAcGFyYW1DYXB0dXJlUGF0dGVybiBtYXRjaFxuXG4gICAgIyBSZXBsYWNlIHRoZSBvcHRpb25hbCBwb3J0aW9uIHdpdGggYSBub24tY2FwdHVyaW5nIGFuZCBvcHRpb25hbCBncm91cC5cbiAgICBcIig/OiN7cG9ydGlvbn0pP1wiXG5cbiAgcmVwbGFjZVBhcmFtczogKHMsIGNhbGxiYWNrKSAtPlxuICAgICMgUGFyc2UgOmZvbyBhbmQgKmJhciwgcmVwbGFjaW5nIHZpYSBjYWxsYmFjay5cbiAgICBzLnJlcGxhY2UgcGFyYW1SZWdFeHAsIGNhbGxiYWNrXG5cbiAgcGFyYW1DYXB0dXJlUGF0dGVybjogKHBhcmFtKSAtPlxuICAgIGlmIHBhcmFtWzBdIGlzICc6J1xuICAgICAgIyBSZWdleHAgZm9yIDpmb28uXG4gICAgICAnKFteXFwvXFw/XSspJ1xuICAgIGVsc2VcbiAgICAgICMgUmVnZXhwIGZvciAqZm9vLlxuICAgICAgJyguKj8pJ1xuXG4gICMgVGVzdCBpZiB0aGUgcm91dGUgbWF0Y2hlcyB0byBhIHBhdGggKGNhbGxlZCBieSBCYWNrYm9uZS5IaXN0b3J5I2xvYWRVcmwpLlxuICB0ZXN0OiAocGF0aCkgLT5cbiAgICAjIFRlc3QgdGhlIG1haW4gUmVnRXhwLlxuICAgIG1hdGNoZWQgPSBAcmVnRXhwLnRlc3QgcGF0aFxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgbWF0Y2hlZFxuXG4gICAgIyBBcHBseSB0aGUgcGFyYW1ldGVyIGNvbnN0cmFpbnRzLlxuICAgIGNvbnN0cmFpbnRzID0gQG9wdGlvbnMuY29uc3RyYWludHNcbiAgICBpZiBjb25zdHJhaW50c1xuICAgICAgcmV0dXJuIEB0ZXN0Q29uc3RyYWludHMgQGV4dHJhY3RQYXJhbXMgcGF0aFxuXG4gICAgdHJ1ZVxuXG4gICMgVGhlIGhhbmRsZXIgY2FsbGVkIGJ5IEJhY2tib25lLkhpc3Rvcnkgd2hlbiB0aGUgcm91dGUgbWF0Y2hlcy5cbiAgIyBJdCBpcyBhbHNvIGNhbGxlZCBieSBSb3V0ZXIjcm91dGUgd2hpY2ggbWlnaHQgcGFzcyBvcHRpb25zLlxuICBoYW5kbGVyOiAocGF0aFBhcmFtcywgb3B0aW9ucykgPT5cbiAgICBvcHRpb25zID0gXy5leHRlbmQge30sIG9wdGlvbnNcblxuICAgICMgcGF0aFBhcmFtcyBtYXkgYmUgZWl0aGVyIGFuIG9iamVjdCB3aXRoIHBhcmFtcyBmb3IgcmV2ZXJzaW5nXG4gICAgIyBvciBhIHNpbXBsZSBVUkwuXG4gICAgaWYgcGF0aFBhcmFtcyBhbmQgdHlwZW9mIHBhdGhQYXJhbXMgaXMgJ29iamVjdCdcbiAgICAgIHF1ZXJ5ID0gdXRpbHMucXVlcnlQYXJhbXMuc3RyaW5naWZ5IG9wdGlvbnMucXVlcnlcbiAgICAgIHBhcmFtcyA9IHBhdGhQYXJhbXNcbiAgICAgIHBhdGggPSBAcmV2ZXJzZSBwYXJhbXNcbiAgICBlbHNlXG4gICAgICBbcGF0aCwgcXVlcnldID0gcGF0aFBhcmFtcy5zcGxpdCAnPydcbiAgICAgIGlmIG5vdCBxdWVyeT9cbiAgICAgICAgcXVlcnkgPSAnJ1xuICAgICAgZWxzZVxuICAgICAgICBvcHRpb25zLnF1ZXJ5ID0gdXRpbHMucXVlcnlQYXJhbXMucGFyc2UgcXVlcnlcbiAgICAgIHBhcmFtcyA9IEBleHRyYWN0UGFyYW1zIHBhdGhcbiAgICAgIHBhdGggPSBwcm9jZXNzVHJhaWxpbmdTbGFzaCBwYXRoLCBAb3B0aW9ucy50cmFpbGluZ1xuXG4gICAgYWN0aW9uUGFyYW1zID0gXy5leHRlbmQge30sIHBhcmFtcywgQG9wdGlvbnMucGFyYW1zXG5cbiAgICAjIENvbnN0cnVjdCBhIHJvdXRlIG9iamVjdCB0byBmb3J3YXJkIHRvIHRoZSBtYXRjaCBldmVudC5cbiAgICByb3V0ZSA9IHtwYXRoLCBAYWN0aW9uLCBAY29udHJvbGxlciwgQG5hbWUsIHF1ZXJ5fVxuXG4gICAgIyBQdWJsaXNoIGEgZ2xvYmFsIGV2ZW50IHBhc3NpbmcgdGhlIHJvdXRlIGFuZCB0aGUgcGFyYW1zLlxuICAgICMgT3JpZ2luYWwgb3B0aW9ucyBoYXNoIGZvcndhcmRlZCB0byBhbGxvdyBmdXJ0aGVyIGZvcndhcmRpbmcgdG8gYmFja2JvbmUuXG4gICAgQHB1Ymxpc2hFdmVudCAncm91dGVyOm1hdGNoJywgcm91dGUsIGFjdGlvblBhcmFtcywgb3B0aW9uc1xuXG4gICMgRXh0cmFjdCBuYW1lZCBwYXJhbWV0ZXJzIGZyb20gdGhlIFVSTCBwYXRoLlxuICBleHRyYWN0UGFyYW1zOiAocGF0aCkgLT5cbiAgICBwYXJhbXMgPSB7fVxuXG4gICAgIyBBcHBseSB0aGUgcmVndWxhciBleHByZXNzaW9uLlxuICAgIG1hdGNoZXMgPSBAcmVnRXhwLmV4ZWMgcGF0aFxuXG4gICAgIyBGaWxsIHRoZSBoYXNoIHVzaW5nIHBhcmFtIG5hbWVzIGFuZCB0aGUgbWF0Y2hlcy5cbiAgICBmb3IgbWF0Y2gsIGluZGV4IGluIG1hdGNoZXMuc2xpY2UgMVxuICAgICAgcGFyYW1OYW1lID0gaWYgQGFsbFBhcmFtcy5sZW5ndGggdGhlbiBAYWxsUGFyYW1zW2luZGV4XSBlbHNlIGluZGV4XG4gICAgICBwYXJhbXNbcGFyYW1OYW1lXSA9IG1hdGNoXG5cbiAgICBwYXJhbXNcbiIsIid1c2Ugc3RyaWN0J1xuXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZSdcbkJhY2tib25lID0gcmVxdWlyZSAnYmFja2JvbmUnXG5cbkV2ZW50QnJva2VyID0gcmVxdWlyZSAnLi9ldmVudF9icm9rZXInXG5IaXN0b3J5ID0gcmVxdWlyZSAnLi9oaXN0b3J5J1xuUm91dGUgPSByZXF1aXJlICcuL3JvdXRlJ1xudXRpbHMgPSByZXF1aXJlICcuL3V0aWxzJ1xubWVkaWF0b3IgPSByZXF1aXJlICcuLi9tZWRpYXRvcidcblxuIyBUaGUgcm91dGVyIHdoaWNoIGlzIGEgcmVwbGFjZW1lbnQgZm9yIEJhY2tib25lLlJvdXRlci5cbiMgTGlrZSB0aGUgc3RhbmRhcmQgcm91dGVyLCBpdCBjcmVhdGVzIGEgQmFja2JvbmUuSGlzdG9yeVxuIyBpbnN0YW5jZSBhbmQgcmVnaXN0ZXJzIHJvdXRlcyBvbiBpdC5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUm91dGVyICMgVGhpcyBjbGFzcyBkb2VzIG5vdCBleHRlbmQgQmFja2JvbmUuUm91dGVyLlxuICAjIEJvcnJvdyB0aGUgc3RhdGljIGV4dGVuZCBtZXRob2QgZnJvbSBCYWNrYm9uZS5cbiAgQGV4dGVuZCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZFxuXG4gICMgTWl4aW4gYW4gRXZlbnRCcm9rZXIuXG4gIF8uZXh0ZW5kIEBwcm90b3R5cGUsIEV2ZW50QnJva2VyXG5cbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxuICAgICMgRW5hYmxlIHB1c2hTdGF0ZSBieSBkZWZhdWx0IGZvciBIVFRQKHMpLlxuICAgICMgRGlzYWJsZSBpdCBmb3IgZmlsZTovLyBzY2hlbWEuXG4gICAgaXNXZWJGaWxlID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sIGlzbnQgJ2ZpbGU6J1xuICAgIF8uZGVmYXVsdHMgQG9wdGlvbnMsXG4gICAgICBwdXNoU3RhdGU6IGlzV2ViRmlsZVxuICAgICAgcm9vdDogJy8nXG4gICAgICB0cmFpbGluZzogbm9cblxuICAgICMgQ2FjaGVkIHJlZ2V4IGZvciBzdHJpcHBpbmcgYSBsZWFkaW5nIHN1YmRpciBhbmQgaGFzaC9zbGFzaC5cbiAgICBAcmVtb3ZlUm9vdCA9IG5ldyBSZWdFeHAgJ14nICsgdXRpbHMuZXNjYXBlUmVnRXhwKEBvcHRpb25zLnJvb3QpICsgJygjKT8nXG5cbiAgICBAc3Vic2NyaWJlRXZlbnQgJyFyb3V0ZXI6cm91dGUnLCBAb2xkRXZlbnRFcnJvclxuICAgIEBzdWJzY3JpYmVFdmVudCAnIXJvdXRlcjpyb3V0ZUJ5TmFtZScsIEBvbGRFdmVudEVycm9yXG4gICAgQHN1YnNjcmliZUV2ZW50ICchcm91dGVyOmNoYW5nZVVSTCcsIEBvbGRVUkxFdmVudEVycm9yXG5cbiAgICBAc3Vic2NyaWJlRXZlbnQgJ2Rpc3BhdGNoZXI6ZGlzcGF0Y2gnLCBAY2hhbmdlVVJMXG5cbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyICdyb3V0ZXI6cm91dGUnLCBAcm91dGUsIHRoaXNcbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyICdyb3V0ZXI6cmV2ZXJzZScsIEByZXZlcnNlLCB0aGlzXG5cbiAgICBAY3JlYXRlSGlzdG9yeSgpXG5cbiAgb2xkRXZlbnRFcnJvcjogLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJyFyb3V0ZXI6cm91dGUgYW5kICFyb3V0ZXI6cm91dGVCeU5hbWUgZXZlbnRzIHdlcmUgcmVtb3ZlZC5cbiAgVXNlIGBDaGFwbGluLnV0aWxzLnJlZGlyZWN0VG9gJ1xuXG4gIG9sZFVSTEV2ZW50RXJyb3I6IC0+XG4gICAgdGhyb3cgbmV3IEVycm9yICchcm91dGVyOmNoYW5nZVVSTCBldmVudCB3YXMgcmVtb3ZlZC4nXG5cbiAgIyBDcmVhdGUgYSBCYWNrYm9uZS5IaXN0b3J5IGluc3RhbmNlLlxuICBjcmVhdGVIaXN0b3J5OiAtPlxuICAgIEJhY2tib25lLmhpc3RvcnkgPSBuZXcgSGlzdG9yeSgpXG5cbiAgc3RhcnRIaXN0b3J5OiAtPlxuICAgICMgU3RhcnQgdGhlIEJhY2tib25lLkhpc3RvcnkgaW5zdGFuY2UgdG8gc3RhcnQgcm91dGluZy5cbiAgICAjIFRoaXMgc2hvdWxkIGJlIGNhbGxlZCBhZnRlciBhbGwgcm91dGVzIGhhdmUgYmVlbiByZWdpc3RlcmVkLlxuICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQgQG9wdGlvbnNcblxuICAjIFN0b3AgdGhlIGN1cnJlbnQgQmFja2JvbmUuSGlzdG9yeSBpbnN0YW5jZSBmcm9tIG9ic2VydmluZyBVUkwgY2hhbmdlcy5cbiAgc3RvcEhpc3Rvcnk6IC0+XG4gICAgQmFja2JvbmUuaGlzdG9yeS5zdG9wKCkgaWYgQmFja2JvbmUuSGlzdG9yeS5zdGFydGVkXG5cbiAgIyBTZWFyY2ggdGhyb3VnaCBiYWNrYm9uZSBoaXN0b3J5IGhhbmRsZXJzLlxuICBmaW5kSGFuZGxlcjogKHByZWRpY2F0ZSkgLT5cbiAgICBmb3IgaGFuZGxlciBpbiBCYWNrYm9uZS5oaXN0b3J5LmhhbmRsZXJzIHdoZW4gcHJlZGljYXRlIGhhbmRsZXJcbiAgICAgIHJldHVybiBoYW5kbGVyXG5cbiAgIyBDb25uZWN0IGFuIGFkZHJlc3Mgd2l0aCBhIGNvbnRyb2xsZXIgYWN0aW9uLlxuICAjIENyZWF0ZXMgYSByb3V0ZSBvbiB0aGUgQmFja2JvbmUuSGlzdG9yeSBpbnN0YW5jZS5cbiAgbWF0Y2g6IChwYXR0ZXJuLCB0YXJnZXQsIG9wdGlvbnMgPSB7fSkgPT5cbiAgICBpZiBhcmd1bWVudHMubGVuZ3RoIGlzIDIgYW5kIHRhcmdldCBhbmQgdHlwZW9mIHRhcmdldCBpcyAnb2JqZWN0J1xuICAgICAgIyBIYW5kbGVzIGNhc2VzIGxpa2UgYG1hdGNoICd1cmwnLCBjb250cm9sbGVyOiAnYycsIGFjdGlvbjogJ2EnYC5cbiAgICAgIHtjb250cm9sbGVyLCBhY3Rpb259ID0gb3B0aW9ucyA9IHRhcmdldFxuICAgICAgdW5sZXNzIGNvbnRyb2xsZXIgYW5kIGFjdGlvblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IgJ1JvdXRlciNtYXRjaCBtdXN0IHJlY2VpdmUgZWl0aGVyIHRhcmdldCBvciAnICtcbiAgICAgICAgICAnb3B0aW9ucy5jb250cm9sbGVyICYgb3B0aW9ucy5hY3Rpb24nXG4gICAgZWxzZVxuICAgICAgIyBIYW5kbGVzIGBtYXRjaCAndXJsJywgJ2MjYSdgLlxuICAgICAge2NvbnRyb2xsZXIsIGFjdGlvbn0gPSBvcHRpb25zXG4gICAgICBpZiBjb250cm9sbGVyIG9yIGFjdGlvblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IgJ1JvdXRlciNtYXRjaCBjYW5ub3QgdXNlIGJvdGggdGFyZ2V0IGFuZCAnICtcbiAgICAgICAgICAnb3B0aW9ucy5jb250cm9sbGVyIC8gb3B0aW9ucy5hY3Rpb24nXG4gICAgICAjIFNlcGFyYXRlIHRhcmdldCBpbnRvIGNvbnRyb2xsZXIgYW5kIGNvbnRyb2xsZXIgYWN0aW9uLlxuICAgICAgW2NvbnRyb2xsZXIsIGFjdGlvbl0gPSB0YXJnZXQuc3BsaXQgJyMnXG5cbiAgICAjIExldCBlYWNoIG1hdGNoIGNhbGwgcHJvdmlkZSBpdHMgb3duIHRyYWlsaW5nIG9wdGlvbiB0byBhcHByb3ByaWF0ZSBSb3V0ZS5cbiAgICAjIFBhc3MgdHJhaWxpbmcgdmFsdWUgZnJvbSB0aGUgUm91dGVyIGJ5IGRlZmF1bHQuXG4gICAgXy5kZWZhdWx0cyBvcHRpb25zLCB0cmFpbGluZzogQG9wdGlvbnMudHJhaWxpbmdcblxuICAgICMgQ3JlYXRlIHRoZSByb3V0ZS5cbiAgICByb3V0ZSA9IG5ldyBSb3V0ZSBwYXR0ZXJuLCBjb250cm9sbGVyLCBhY3Rpb24sIG9wdGlvbnNcbiAgICAjIFJlZ2lzdGVyIHRoZSByb3V0ZSBhdCB0aGUgQmFja2JvbmUuSGlzdG9yeSBpbnN0YW5jZS5cbiAgICAjIERvbuKAmXQgdXNlIEJhY2tib25lLmhpc3Rvcnkucm91dGUgaGVyZSBiZWNhdXNlIGl0IGNhbGxzXG4gICAgIyBoYW5kbGVycy51bnNoaWZ0LCBpbnNlcnRpbmcgdGhlIGhhbmRsZXIgYXQgdGhlIHRvcCBvZiB0aGUgbGlzdC5cbiAgICAjIFNpbmNlIHdlIHdhbnQgcm91dGVzIHRvIG1hdGNoIGluIHRoZSBvcmRlciB0aGV5IHdlcmUgc3BlY2lmaWVkLFxuICAgICMgd2XigJlyZSBhcHBlbmRpbmcgdGhlIHJvdXRlIGF0IHRoZSBlbmQuXG4gICAgQmFja2JvbmUuaGlzdG9yeS5oYW5kbGVycy5wdXNoIHtyb3V0ZSwgY2FsbGJhY2s6IHJvdXRlLmhhbmRsZXJ9XG4gICAgcm91dGVcblxuICAjIFJvdXRlIGEgZ2l2ZW4gVVJMIHBhdGggbWFudWFsbHkuIFJldHVybnMgd2hldGhlciBhIHJvdXRlIG1hdGNoZWQuXG4gICMgVGhpcyBsb29rcyBxdWl0ZSBsaWtlIEJhY2tib25lLkhpc3Rvcnk6OmxvYWRVcmwgYnV0IGl0XG4gICMgYWNjZXB0cyBhbiBhYnNvbHV0ZSBVUkwgd2l0aCBhIGxlYWRpbmcgc2xhc2ggKGUuZy4gL2ZvbylcbiAgIyBhbmQgcGFzc2VzIHRoZSByb3V0aW5nIG9wdGlvbnMgdG8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICByb3V0ZTogKHBhdGhEZXNjLCBwYXJhbXMsIG9wdGlvbnMpIC0+XG4gICAgIyBUcnkgdG8gZXh0cmFjdCBhbiBVUkwgZnJvbSB0aGUgcGF0aERlc2MgaWYgaXQncyBhIGhhc2guXG4gICAgaWYgcGF0aERlc2MgYW5kIHR5cGVvZiBwYXRoRGVzYyBpcyAnb2JqZWN0J1xuICAgICAgcGF0aCA9IHBhdGhEZXNjLnVybFxuICAgICAgcGFyYW1zID0gcGF0aERlc2MucGFyYW1zIGlmIG5vdCBwYXJhbXMgYW5kIHBhdGhEZXNjLnBhcmFtc1xuXG4gICAgcGFyYW1zID0gaWYgQXJyYXkuaXNBcnJheSBwYXJhbXNcbiAgICAgIHBhcmFtcy5zbGljZSgpXG4gICAgZWxzZVxuICAgICAgXy5leHRlbmQge30sIHBhcmFtc1xuXG4gICAgIyBBY2NlcHQgcGF0aCB0byBiZSBnaXZlbiB2aWEgVVJMIHdyYXBwZWQgaW4gb2JqZWN0LFxuICAgICMgb3IgaW1wbGljaXRseSB2aWEgcm91dGUgbmFtZSwgb3IgZXhwbGljaXRseSB2aWEgb2JqZWN0LlxuICAgIGlmIHBhdGg/XG4gICAgICAjIFJlbW92ZSBsZWFkaW5nIHN1YmRpciBhbmQgaGFzaCBvciBzbGFzaC5cbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UgQHJlbW92ZVJvb3QsICcnXG5cbiAgICAgICMgRmluZCBhIG1hdGNoaW5nIHJvdXRlLlxuICAgICAgaGFuZGxlciA9IEBmaW5kSGFuZGxlciAoaGFuZGxlcikgLT4gaGFuZGxlci5yb3V0ZS50ZXN0IHBhdGhcblxuICAgICAgIyBPcHRpb25zIGlzIHRoZSBzZWNvbmQgYXJndW1lbnQgaW4gdGhpcyBjYXNlLlxuICAgICAgb3B0aW9ucyA9IHBhcmFtc1xuICAgICAgcGFyYW1zID0gbnVsbFxuICAgIGVsc2VcbiAgICAgIG9wdGlvbnMgPSBfLmV4dGVuZCB7fSwgb3B0aW9uc1xuXG4gICAgICAjIEZpbmQgYSByb3V0ZSB1c2luZyBhIHBhc3NlZCB2aWEgcGF0aERlc2Mgc3RyaW5nIHJvdXRlIG5hbWUuXG4gICAgICBoYW5kbGVyID0gQGZpbmRIYW5kbGVyIChoYW5kbGVyKSAtPlxuICAgICAgICBpZiBoYW5kbGVyLnJvdXRlLm1hdGNoZXMgcGF0aERlc2NcbiAgICAgICAgICBwYXJhbXMgPSBoYW5kbGVyLnJvdXRlLm5vcm1hbGl6ZVBhcmFtcyBwYXJhbXNcbiAgICAgICAgICByZXR1cm4gdHJ1ZSBpZiBwYXJhbXNcbiAgICAgICAgZmFsc2VcblxuICAgIGlmIGhhbmRsZXJcbiAgICAgICMgVXBkYXRlIHRoZSBVUkwgcHJvZ3JhbW1hdGljYWxseSBhZnRlciByb3V0aW5nLlxuICAgICAgXy5kZWZhdWx0cyBvcHRpb25zLCBjaGFuZ2VVUkw6IHRydWVcblxuICAgICAgcGF0aFBhcmFtcyA9IGlmIHBhdGg/IHRoZW4gcGF0aCBlbHNlIHBhcmFtc1xuICAgICAgaGFuZGxlci5jYWxsYmFjayBwYXRoUGFyYW1zLCBvcHRpb25zXG4gICAgICB0cnVlXG4gICAgZWxzZVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdSb3V0ZXIjcm91dGU6IHJlcXVlc3Qgd2FzIG5vdCByb3V0ZWQnXG5cbiAgIyBGaW5kIHRoZSBVUkwgZm9yIGdpdmVuIGNyaXRlcmlhIHVzaW5nIHRoZSByZWdpc3RlcmVkIHJvdXRlcyBhbmRcbiAgIyBwcm92aWRlZCBwYXJhbWV0ZXJzLiBUaGUgY3JpdGVyaWEgbWF5IGJlIGp1c3QgdGhlIG5hbWUgb2YgYSByb3V0ZVxuICAjIG9yIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBuYW1lLCBjb250cm9sbGVyLCBhbmQvb3IgYWN0aW9uLlxuICAjIFdhcm5pbmc6IHRoaXMgaXMgdXN1YWxseSAqKmhvdCoqIGNvZGUgaW4gdGVybXMgb2YgcGVyZm9ybWFuY2UuXG4gICMgUmV0dXJucyB0aGUgVVJMIHN0cmluZyBvciBmYWxzZS5cbiAgcmV2ZXJzZTogKGNyaXRlcmlhLCBwYXJhbXMsIHF1ZXJ5KSAtPlxuICAgIHJvb3QgPSBAb3B0aW9ucy5yb290XG5cbiAgICBpZiBwYXJhbXM/IGFuZCB0eXBlb2YgcGFyYW1zIGlzbnQgJ29iamVjdCdcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgJ1JvdXRlciNyZXZlcnNlOiBwYXJhbXMgbXVzdCBiZSBhbiBhcnJheSBvciBhbiAnICtcbiAgICAgICAgJ29iamVjdCdcblxuICAgICMgRmlyc3QgZmlsdGVyIHRoZSByb3V0ZSBoYW5kbGVycyB0byB0aG9zZSB0aGF0IGFyZSBvZiB0aGUgc2FtZSBuYW1lLlxuICAgIGhhbmRsZXJzID0gQmFja2JvbmUuaGlzdG9yeS5oYW5kbGVyc1xuICAgIGZvciBoYW5kbGVyIGluIGhhbmRsZXJzIHdoZW4gaGFuZGxlci5yb3V0ZS5tYXRjaGVzIGNyaXRlcmlhXG4gICAgICAjIEF0dGVtcHQgdG8gcmV2ZXJzZSB1c2luZyB0aGUgcHJvdmlkZWQgcGFyYW1ldGVyIGhhc2guXG4gICAgICByZXZlcnNlZCA9IGhhbmRsZXIucm91dGUucmV2ZXJzZSBwYXJhbXMsIHF1ZXJ5XG5cbiAgICAgICMgUmV0dXJuIHRoZSB1cmwgaWYgd2UgZ290IGEgdmFsaWQgb25lOyBlbHNlIHdlIGNvbnRpbnVlIG9uLlxuICAgICAgaWYgcmV2ZXJzZWQgaXNudCBmYWxzZVxuICAgICAgICB1cmwgPSBpZiByb290IHRoZW4gcm9vdCArIHJldmVyc2VkIGVsc2UgcmV2ZXJzZWRcbiAgICAgICAgcmV0dXJuIHVybFxuXG4gICAgIyBXZSBkaWRuJ3QgZ2V0IGFueXRoaW5nLlxuICAgIHRocm93IG5ldyBFcnJvciAnUm91dGVyI3JldmVyc2U6IGludmFsaWQgcm91dGUgY3JpdGVyaWEgc3BlY2lmaWVkOiAnICtcbiAgICAgIFwiI3tKU09OLnN0cmluZ2lmeSBjcml0ZXJpYX1cIlxuXG4gICMgQ2hhbmdlIHRoZSBjdXJyZW50IFVSTCwgYWRkIGEgaGlzdG9yeSBlbnRyeS5cbiAgY2hhbmdlVVJMOiAoY29udHJvbGxlciwgcGFyYW1zLCByb3V0ZSwgb3B0aW9ucykgLT5cbiAgICByZXR1cm4gdW5sZXNzIHJvdXRlLnBhdGg/IGFuZCBvcHRpb25zPy5jaGFuZ2VVUkxcblxuICAgIHVybCA9IHJvdXRlLnBhdGggKyBpZiByb3V0ZS5xdWVyeSB0aGVuIFwiPyN7cm91dGUucXVlcnl9XCIgZWxzZSAnJ1xuXG4gICAgbmF2aWdhdGVPcHRpb25zID1cbiAgICAgICMgRG8gbm90IHRyaWdnZXIgb3IgcmVwbGFjZSBwZXIgZGVmYXVsdC5cbiAgICAgIHRyaWdnZXI6IG9wdGlvbnMudHJpZ2dlciBpcyB0cnVlXG4gICAgICByZXBsYWNlOiBvcHRpb25zLnJlcGxhY2UgaXMgdHJ1ZVxuXG4gICAgIyBOYXZpZ2F0ZSB0byB0aGUgcGFzc2VkIFVSTCBhbmQgZm9yd2FyZCBvcHRpb25zIHRvIEJhY2tib25lLlxuICAgIEJhY2tib25lLmhpc3RvcnkubmF2aWdhdGUgdXJsLCBuYXZpZ2F0ZU9wdGlvbnNcblxuICAjIERpc3Bvc2FsXG4gICMgLS0tLS0tLS1cblxuICBkaXNwb3NlZDogZmFsc2VcblxuICBkaXNwb3NlOiAtPlxuICAgIHJldHVybiBpZiBAZGlzcG9zZWRcblxuICAgICMgU3RvcCBCYWNrYm9uZS5IaXN0b3J5IGluc3RhbmNlIGFuZCByZW1vdmUgaXQuXG4gICAgQHN0b3BIaXN0b3J5KClcbiAgICBkZWxldGUgQmFja2JvbmUuaGlzdG9yeVxuXG4gICAgQHVuc3Vic2NyaWJlQWxsRXZlbnRzKClcblxuICAgIG1lZGlhdG9yLnJlbW92ZUhhbmRsZXJzIHRoaXNcblxuICAgICMgRmluaXNoZWQuXG4gICAgQGRpc3Bvc2VkID0gdHJ1ZVxuXG4gICAgIyBZb3XigJlyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ04oCZcyBub3Qgb3Blbi5cbiAgICBPYmplY3QuZnJlZXplIHRoaXNcbiIsIid1c2Ugc3RyaWN0J1xuXG4jIEJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IG1vZHVsZVxuIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxubW9kdWxlLmV4cG9ydHMgPVxuICBwcm9wZXJ0eURlc2NyaXB0b3JzOiB5ZXMiLCIndXNlIHN0cmljdCdcblxuIyBTaW1wbGUgZmluaXRlIHN0YXRlIG1hY2hpbmUgZm9yIHN5bmNocm9uaXphdGlvbiBvZiBtb2RlbHMvY29sbGVjdGlvbnNcbiMgVGhyZWUgc3RhdGVzOiB1bnN5bmNlZCwgc3luY2luZyBhbmQgc3luY2VkXG4jIFNldmVyYWwgdHJhbnNpdGlvbnMgYmV0d2VlbiB0aGVtXG4jIEZpcmVzIEJhY2tib25lIGV2ZW50cyBvbiBldmVyeSB0cmFuc2l0aW9uXG4jICh1bnN5bmNlZCwgc3luY2luZywgc3luY2VkOyBzeW5jU3RhdGVDaGFuZ2UpXG4jIFByb3ZpZGVzIHNob3J0Y3V0IG1ldGhvZHMgdG8gY2FsbCBoYW5kbGVycyB3aGVuIGEgZ2l2ZW4gc3RhdGUgaXMgcmVhY2hlZFxuIyAobmFtZWQgYWZ0ZXIgdGhlIGV2ZW50cyBhYm92ZSlcblxuVU5TWU5DRUQgPSAndW5zeW5jZWQnXG5TWU5DSU5HICA9ICdzeW5jaW5nJ1xuU1lOQ0VEICAgPSAnc3luY2VkJ1xuXG5TVEFURV9DSEFOR0UgPSAnc3luY1N0YXRlQ2hhbmdlJ1xuXG5TeW5jTWFjaGluZSA9XG4gIF9zeW5jU3RhdGU6IFVOU1lOQ0VEXG4gIF9wcmV2aW91c1N5bmNTdGF0ZTogbnVsbFxuXG4gICMgR2V0IHRoZSBjdXJyZW50IHN0YXRlXG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgc3luY1N0YXRlOiAtPlxuICAgIEBfc3luY1N0YXRlXG5cbiAgaXNVbnN5bmNlZDogLT5cbiAgICBAX3N5bmNTdGF0ZSBpcyBVTlNZTkNFRFxuXG4gIGlzU3luY2VkOiAtPlxuICAgIEBfc3luY1N0YXRlIGlzIFNZTkNFRFxuXG4gIGlzU3luY2luZzogLT5cbiAgICBAX3N5bmNTdGF0ZSBpcyBTWU5DSU5HXG5cbiAgIyBUcmFuc2l0aW9uc1xuICAjIC0tLS0tLS0tLS0tXG5cbiAgdW5zeW5jOiAtPlxuICAgIGlmIEBfc3luY1N0YXRlIGluIFtTWU5DSU5HLCBTWU5DRURdXG4gICAgICBAX3ByZXZpb3VzU3luYyA9IEBfc3luY1N0YXRlXG4gICAgICBAX3N5bmNTdGF0ZSA9IFVOU1lOQ0VEXG4gICAgICBAdHJpZ2dlciBAX3N5bmNTdGF0ZSwgdGhpcywgQF9zeW5jU3RhdGVcbiAgICAgIEB0cmlnZ2VyIFNUQVRFX0NIQU5HRSwgdGhpcywgQF9zeW5jU3RhdGVcbiAgICAjIHdoZW4gVU5TWU5DRUQgZG8gbm90aGluZ1xuICAgIHJldHVyblxuXG4gIGJlZ2luU3luYzogLT5cbiAgICBpZiBAX3N5bmNTdGF0ZSBpbiBbVU5TWU5DRUQsIFNZTkNFRF1cbiAgICAgIEBfcHJldmlvdXNTeW5jID0gQF9zeW5jU3RhdGVcbiAgICAgIEBfc3luY1N0YXRlID0gU1lOQ0lOR1xuICAgICAgQHRyaWdnZXIgQF9zeW5jU3RhdGUsIHRoaXMsIEBfc3luY1N0YXRlXG4gICAgICBAdHJpZ2dlciBTVEFURV9DSEFOR0UsIHRoaXMsIEBfc3luY1N0YXRlXG4gICAgIyB3aGVuIFNZTkNJTkcgZG8gbm90aGluZ1xuICAgIHJldHVyblxuXG4gIGZpbmlzaFN5bmM6IC0+XG4gICAgaWYgQF9zeW5jU3RhdGUgaXMgU1lOQ0lOR1xuICAgICAgQF9wcmV2aW91c1N5bmMgPSBAX3N5bmNTdGF0ZVxuICAgICAgQF9zeW5jU3RhdGUgPSBTWU5DRURcbiAgICAgIEB0cmlnZ2VyIEBfc3luY1N0YXRlLCB0aGlzLCBAX3N5bmNTdGF0ZVxuICAgICAgQHRyaWdnZXIgU1RBVEVfQ0hBTkdFLCB0aGlzLCBAX3N5bmNTdGF0ZVxuICAgICMgd2hlbiBTWU5DRUQsIFVOU1lOQ0VEIGRvIG5vdGhpbmdcbiAgICByZXR1cm5cblxuICBhYm9ydFN5bmM6IC0+XG4gICAgaWYgQF9zeW5jU3RhdGUgaXMgU1lOQ0lOR1xuICAgICAgQF9zeW5jU3RhdGUgPSBAX3ByZXZpb3VzU3luY1xuICAgICAgQF9wcmV2aW91c1N5bmMgPSBAX3N5bmNTdGF0ZVxuICAgICAgQHRyaWdnZXIgQF9zeW5jU3RhdGUsIHRoaXMsIEBfc3luY1N0YXRlXG4gICAgICBAdHJpZ2dlciBTVEFURV9DSEFOR0UsIHRoaXMsIEBfc3luY1N0YXRlXG4gICAgIyB3aGVuIFVOU1lOQ0VELCBTWU5DRUQgZG8gbm90aGluZ1xuICAgIHJldHVyblxuXG4jIENyZWF0ZSBzaG9ydGN1dCBtZXRob2RzIHRvIGJpbmQgYSBoYW5kbGVyIHRvIGEgc3RhdGUgY2hhbmdlXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZvciBldmVudCBpbiBbVU5TWU5DRUQsIFNZTkNJTkcsIFNZTkNFRCwgU1RBVEVfQ0hBTkdFXVxuICBkbyAoZXZlbnQpIC0+XG4gICAgU3luY01hY2hpbmVbZXZlbnRdID0gKGNhbGxiYWNrLCBjb250ZXh0ID0gdGhpcykgLT5cbiAgICAgIEBvbiBldmVudCwgY2FsbGJhY2ssIGNvbnRleHRcbiAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCkgaWYgQF9zeW5jU3RhdGUgaXMgZXZlbnRcblxuIyBZb3XigJlyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ04oCZcyBub3Qgb3Blbi5cbk9iamVjdC5mcmVlemUgU3luY01hY2hpbmVcblxuIyBSZXR1cm4gb3VyIGNyZWF0aW9uLlxubW9kdWxlLmV4cG9ydHMgPSBTeW5jTWFjaGluZVxuIiwiJ3VzZSBzdHJpY3QnXG5cbiMgVXRpbGl0aWVzXG4jIC0tLS0tLS0tLVxuXG51dGlscyA9XG4gIGlzRW1wdHk6IChvYmplY3QpIC0+XG4gICAgbm90IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCkubGVuZ3RoXG5cbiAgIyBTaW1wbGUgZHVjay10eXBpbmcgc2VyaWFsaXplciBmb3IgbW9kZWxzIGFuZCBjb2xsZWN0aW9ucy5cbiAgc2VyaWFsaXplOiAoZGF0YSkgLT5cbiAgICBpZiB0eXBlb2YgZGF0YS5zZXJpYWxpemUgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgZGF0YS5zZXJpYWxpemUoKVxuICAgIGVsc2UgaWYgdHlwZW9mIGRhdGEudG9KU09OIGlzICdmdW5jdGlvbidcbiAgICAgIGRhdGEudG9KU09OKClcbiAgICBlbHNlXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yICd1dGlscy5zZXJpYWxpemU6IFVua25vd24gZGF0YSB3YXMgcGFzc2VkJ1xuXG4gICMgTWFrZSBwcm9wZXJ0aWVzIHJlYWRvbmx5IGFuZCBub3QgY29uZmlndXJhYmxlXG4gICMgdXNpbmcgRUNNQVNjcmlwdCA1IHByb3BlcnR5IGRlc2NyaXB0b3JzLlxuICByZWFkb25seTogKG9iamVjdCwga2V5cy4uLikgLT5cbiAgICBmb3Iga2V5IGluIGtleXNcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBvYmplY3QsIGtleSxcbiAgICAgICAgdmFsdWU6IG9iamVjdFtrZXldXG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZVxuICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlXG4gICAgIyBBbHdheXMgcmV0dXJuIGB0cnVlYCBmb3IgY29tcGF0aWJpbGl0eSByZWFzb25zLlxuICAgIHRydWVcblxuICAjIEdldCB0aGUgd2hvbGUgY2hhaW4gb2Ygb2JqZWN0IHByb3RvdHlwZXMuXG4gIGdldFByb3RvdHlwZUNoYWluOiAob2JqZWN0KSAtPlxuICAgIGNoYWluID0gW11cbiAgICB3aGlsZSBvYmplY3QgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Ygb2JqZWN0XG4gICAgICBjaGFpbi51bnNoaWZ0IG9iamVjdFxuICAgIGNoYWluXG5cbiAgIyBHZXQgYWxsIHByb3BlcnR5IHZlcnNpb25zIGZyb20gb2JqZWN04oCZcyBwcm90b3R5cGUgY2hhaW4uXG4gICMgRS5nLiBpZiBvYmplY3QxICYgb2JqZWN0MiBoYXZlIGBrZXlgIGFuZCBvYmplY3QyIGluaGVyaXRzIGZyb21cbiAgIyBvYmplY3QxLCBpdCB3aWxsIGdldCBbb2JqZWN0MXByb3AsIG9iamVjdDJwcm9wXS5cbiAgZ2V0QWxsUHJvcGVydHlWZXJzaW9uczogKG9iamVjdCwga2V5KSAtPlxuICAgIHJlc3VsdCA9IFtdXG4gICAgZm9yIHByb3RvIGluIHV0aWxzLmdldFByb3RvdHlwZUNoYWluIG9iamVjdFxuICAgICAgdmFsdWUgPSBwcm90b1trZXldXG4gICAgICBpZiB2YWx1ZSBhbmQgdmFsdWUgbm90IGluIHJlc3VsdFxuICAgICAgICByZXN1bHQucHVzaCB2YWx1ZVxuICAgIHJlc3VsdFxuXG4gICMgU3RyaW5nIEhlbHBlcnNcbiAgIyAtLS0tLS0tLS0tLS0tLVxuXG4gICMgVXBjYXNlIHRoZSBmaXJzdCBjaGFyYWN0ZXIuXG4gIHVwY2FzZTogKHN0cikgLT5cbiAgICBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UgMVxuXG4gICMgRXNjYXBlcyBhIHN0cmluZyB0byB1c2UgaW4gYSByZWdleC5cbiAgZXNjYXBlUmVnRXhwOiAoc3RyKSAtPlxuICAgIHJldHVybiBTdHJpbmcoc3RyIG9yICcnKS5yZXBsYWNlIC8oWy4qKz9ePSE6JHt9KCl8W1xcXVxcL1xcXFxdKS9nLCAnXFxcXCQxJ1xuXG5cbiAgIyBFdmVudCBoYW5kbGluZyBoZWxwZXJzXG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICMgUmV0dXJucyB3aGV0aGVyIGEgbW9kaWZpZXIga2V5IGlzIHByZXNzZWQgZHVyaW5nIGEga2V5cHJlc3Mgb3IgbW91c2UgY2xpY2suXG4gIG1vZGlmaWVyS2V5UHJlc3NlZDogKGV2ZW50KSAtPlxuICAgIGV2ZW50LnNoaWZ0S2V5IG9yIGV2ZW50LmFsdEtleSBvciBldmVudC5jdHJsS2V5IG9yIGV2ZW50Lm1ldGFLZXlcblxuICAjIFJvdXRpbmcgSGVscGVyc1xuICAjIC0tLS0tLS0tLS0tLS0tLVxuXG4gICMgUmV0dXJucyB0aGUgdXJsIGZvciBhIG5hbWVkIHJvdXRlIGFuZCBhbnkgcGFyYW1zLlxuICByZXZlcnNlOiAoY3JpdGVyaWEsIHBhcmFtcywgcXVlcnkpIC0+XG4gICAgcmVxdWlyZSgnLi4vbWVkaWF0b3InKS5leGVjdXRlICdyb3V0ZXI6cmV2ZXJzZScsXG4gICAgICBjcml0ZXJpYSwgcGFyYW1zLCBxdWVyeVxuXG4gICMgUmVkaXJlY3RzIHRvIFVSTCwgcm91dGUgbmFtZSBvciBjb250cm9sbGVyIGFuZCBhY3Rpb24gcGFpci5cbiAgcmVkaXJlY3RUbzogKHBhdGhEZXNjLCBwYXJhbXMsIG9wdGlvbnMpIC0+XG4gICAgcmVxdWlyZSgnLi4vbWVkaWF0b3InKS5leGVjdXRlICdyb3V0ZXI6cm91dGUnLFxuICAgICAgcGF0aERlc2MsIHBhcmFtcywgb3B0aW9uc1xuXG4gICMgRGV0ZXJtaW5lcyBtb2R1bGUgc3lzdGVtIGFuZCByZXR1cm5zIG1vZHVsZSBsb2FkZXIgZnVuY3Rpb24uXG4gIGxvYWRNb2R1bGU6IGRvIC0+XG4gICAge2RlZmluZSwgcmVxdWlyZX0gPSB3aW5kb3dcblxuICAgIGlmIHR5cGVvZiBkZWZpbmUgaXMgJ2Z1bmN0aW9uJyBhbmQgZGVmaW5lLmFtZFxuICAgICAgKG1vZHVsZU5hbWUsIGhhbmRsZXIpIC0+XG4gICAgICAgIHJlcXVpcmUgW21vZHVsZU5hbWVdLCBoYW5kbGVyXG4gICAgZWxzZVxuICAgICAgZW5xdWV1ZSA9IHNldEltbWVkaWF0ZSA/IHNldFRpbWVvdXRcblxuICAgICAgKG1vZHVsZU5hbWUsIGhhbmRsZXIpIC0+XG4gICAgICAgIGVucXVldWUgLT4gaGFuZGxlciByZXF1aXJlIG1vZHVsZU5hbWVcblxuICAjIERPTSBoZWxwZXJzXG4gICMgLS0tLS0tLS0tLS1cblxuICBtYXRjaGVzU2VsZWN0b3I6IGRvIC0+XG4gICAgZWwgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcbiAgICBtYXRjaGVzID0gZWwubWF0Y2hlcyBvclxuICAgIGVsLm1zTWF0Y2hlc1NlbGVjdG9yIG9yXG4gICAgZWwubW96TWF0Y2hlc1NlbGVjdG9yIG9yXG4gICAgZWwud2Via2l0TWF0Y2hlc1NlbGVjdG9yXG5cbiAgICAtPiBtYXRjaGVzLmNhbGwgYXJndW1lbnRzLi4uXG5cbiAgIyBRdWVyeSBwYXJhbWV0ZXJzIEhlbHBlcnNcbiAgIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBxdWVyeXN0cmluZzpcblxuICAgICMgUmV0dXJucyBhIHF1ZXJ5IHN0cmluZyBmcm9tIGEgaGFzaC5cbiAgICBzdHJpbmdpZnk6IChwYXJhbXMgPSB7fSwgcmVwbGFjZXIpIC0+XG4gICAgICBpZiB0eXBlb2YgcmVwbGFjZXIgaXNudCAnZnVuY3Rpb24nXG4gICAgICAgIHJlcGxhY2VyID0gKGtleSwgdmFsdWUpIC0+XG4gICAgICAgICAgaWYgQXJyYXkuaXNBcnJheSB2YWx1ZVxuICAgICAgICAgICAgdmFsdWUubWFwICh2YWx1ZSkgLT4ge2tleSwgdmFsdWV9XG4gICAgICAgICAgZWxzZSBpZiB2YWx1ZT9cbiAgICAgICAgICAgIHtrZXksIHZhbHVlfVxuXG4gICAgICBPYmplY3Qua2V5cyhwYXJhbXMpLnJlZHVjZSAocGFpcnMsIGtleSkgLT5cbiAgICAgICAgcGFpciA9IHJlcGxhY2VyIGtleSwgcGFyYW1zW2tleV1cbiAgICAgICAgcGFpcnMuY29uY2F0IHBhaXIgb3IgW11cbiAgICAgICwgW11cbiAgICAgIC5tYXAgKHtrZXksIHZhbHVlfSkgLT5cbiAgICAgICAgW2tleSwgdmFsdWVdLm1hcChlbmNvZGVVUklDb21wb25lbnQpLmpvaW4gJz0nXG4gICAgICAuam9pbiAnJidcblxuICAgICMgUmV0dXJucyBhIGhhc2ggd2l0aCBxdWVyeSBwYXJhbWV0ZXJzIGZyb20gYSBxdWVyeSBzdHJpbmcuXG4gICAgcGFyc2U6IChzdHJpbmcgPSAnJywgcmV2aXZlcikgLT5cbiAgICAgIGlmIHR5cGVvZiByZXZpdmVyIGlzbnQgJ2Z1bmN0aW9uJ1xuICAgICAgICByZXZpdmVyID0gKGtleSwgdmFsdWUpIC0+IHtrZXksIHZhbHVlfVxuXG4gICAgICBzdHJpbmcgPSBzdHJpbmcuc2xpY2UgMSArIHN0cmluZy5pbmRleE9mICc/J1xuICAgICAgc3RyaW5nLnNwbGl0KCcmJykucmVkdWNlIChwYXJhbXMsIHBhaXIpIC0+XG4gICAgICAgIHBhcnRzID0gcGFpci5zcGxpdCgnPScpLm1hcCBkZWNvZGVVUklDb21wb25lbnRcbiAgICAgICAge2tleSwgdmFsdWV9ID0gcmV2aXZlcihwYXJ0cy4uLikgb3Ige31cblxuICAgICAgICBpZiB2YWx1ZT8gdGhlbiBwYXJhbXNba2V5XSA9XG4gICAgICAgICAgaWYgcGFyYW1zLmhhc093blByb3BlcnR5IGtleVxuICAgICAgICAgICAgW10uY29uY2F0IHBhcmFtc1trZXldLCB2YWx1ZVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHZhbHVlXG5cbiAgICAgICAgcGFyYW1zXG4gICAgICAsIHt9XG5cblxuIyBCYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBtZXRob2RzXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxudXRpbHMuYmVnZXQgPSBPYmplY3QuY3JlYXRlXG51dGlscy5pbmRleE9mID0gKGFycmF5LCBpdGVtKSAtPiBhcnJheS5pbmRleE9mIGl0ZW1cbnV0aWxzLmlzQXJyYXkgPSBBcnJheS5pc0FycmF5XG51dGlscy5xdWVyeVBhcmFtcyA9IHV0aWxzLnF1ZXJ5c3RyaW5nXG5cbiMgRmluaXNoXG4jIC0tLS0tLVxuXG4jIFNlYWwgdGhlIHV0aWxzIG9iamVjdC5cbk9iamVjdC5zZWFsIHV0aWxzXG5cbiMgUmV0dXJuIG91ciBjcmVhdGlvbi5cbm1vZHVsZS5leHBvcnRzID0gdXRpbHNcbiIsIid1c2Ugc3RyaWN0J1xuXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xudXRpbHMgPSByZXF1aXJlICcuL2xpYi91dGlscydcblxuIyBNZWRpYXRvclxuIyAtLS0tLS0tLVxuXG4jIFRoZSBtZWRpYXRvciBpcyBhIHNpbXBsZSBvYmplY3QgYWxsIG90aGVyIG1vZHVsZXMgdXNlIHRvIGNvbW11bmljYXRlXG4jIHdpdGggZWFjaCBvdGhlci4gSXQgaW1wbGVtZW50cyB0aGUgUHVibGlzaC9TdWJzY3JpYmUgcGF0dGVybi5cbiNcbiMgQWRkaXRpb25hbGx5LCBpdCBob2xkcyBvYmplY3RzIHdoaWNoIG5lZWQgdG8gYmUgc2hhcmVkIGJldHdlZW4gbW9kdWxlcy5cbiMgSW4gdGhpcyBjYXNlLCBhIGB1c2VyYCBwcm9wZXJ0eSBpcyBjcmVhdGVkIGZvciBnZXR0aW5nIHRoZSB1c2VyIG9iamVjdFxuIyBhbmQgYSBgc2V0VXNlcmAgbWV0aG9kIGZvciBzZXR0aW5nIHRoZSB1c2VyLlxuI1xuIyBUaGlzIG1vZHVsZSByZXR1cm5zIHRoZSBzaW5nbGV0b24gb2JqZWN0LiBUaGlzIGlzIHRoZVxuIyBhcHBsaWNhdGlvbi13aWRlIG1lZGlhdG9yIHlvdSBtaWdodCBsb2FkIGludG8gbW9kdWxlc1xuIyB3aGljaCBuZWVkIHRvIHRhbGsgdG8gb3RoZXIgbW9kdWxlcyB1c2luZyBQdWJsaXNoL1N1YnNjcmliZS5cblxuIyBTdGFydCB3aXRoIGEgc2ltcGxlIG9iamVjdFxubWVkaWF0b3IgPSB7fVxuXG4jIFB1Ymxpc2ggLyBTdWJzY3JpYmVcbiMgLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jIE1peGluIGV2ZW50IG1ldGhvZHMgZnJvbSBCYWNrYm9uZS5FdmVudHMsXG4jIGNyZWF0ZSBQdWJsaXNoL1N1YnNjcmliZSBhbGlhc2VzLlxubWVkaWF0b3Iuc3Vic2NyaWJlICAgICA9IG1lZGlhdG9yLm9uICAgICAgPSBCYWNrYm9uZS5FdmVudHMub25cbm1lZGlhdG9yLnN1YnNjcmliZU9uY2UgPSBtZWRpYXRvci5vbmNlICAgID0gQmFja2JvbmUuRXZlbnRzLm9uY2Vcbm1lZGlhdG9yLnVuc3Vic2NyaWJlICAgPSBtZWRpYXRvci5vZmYgICAgID0gQmFja2JvbmUuRXZlbnRzLm9mZlxubWVkaWF0b3IucHVibGlzaCAgICAgICA9IG1lZGlhdG9yLnRyaWdnZXIgPSBCYWNrYm9uZS5FdmVudHMudHJpZ2dlclxuXG4jIEluaXRpYWxpemUgYW4gZW1wdHkgY2FsbGJhY2sgbGlzdCBzbyB3ZSBtaWdodCBzZWFsIHRoZSBtZWRpYXRvciBsYXRlci5cbm1lZGlhdG9yLl9jYWxsYmFja3MgPSBudWxsXG5cbiMgUmVxdWVzdCAvIFJlc3BvbnNlXG4jIC0t4oCTLS0tLS0tLS0tLS0tLS0tXG5cbiMgTGlrZSBwdWIgLyBzdWIsIGJ1dCB3aXRoIG9uZSBoYW5kbGVyLiBTaW1pbGFyIHRvIE9PUCBtZXNzYWdlIHBhc3NpbmcuXG5cbmhhbmRsZXJzID0gbWVkaWF0b3IuX2hhbmRsZXJzID0ge31cblxuIyBTZXRzIGEgaGFuZGxlciBmdW5jdGlvbiBmb3IgcmVxdWVzdHMuXG5tZWRpYXRvci5zZXRIYW5kbGVyID0gKG5hbWUsIG1ldGhvZCwgaW5zdGFuY2UpIC0+XG4gIGhhbmRsZXJzW25hbWVdID0ge2luc3RhbmNlLCBtZXRob2R9XG5cbiMgUmV0cmlldmVzIGEgaGFuZGxlciBmdW5jdGlvbiBhbmQgZXhlY3V0ZXMgaXQuXG5tZWRpYXRvci5leGVjdXRlID0gKG9wdGlvbnMsIGFyZ3MuLi4pIC0+XG4gIGlmIG9wdGlvbnMgYW5kIHR5cGVvZiBvcHRpb25zIGlzICdvYmplY3QnXG4gICAge25hbWUsIHNpbGVudH0gPSBvcHRpb25zXG4gIGVsc2VcbiAgICBuYW1lID0gb3B0aW9uc1xuICBoYW5kbGVyID0gaGFuZGxlcnNbbmFtZV1cbiAgaWYgaGFuZGxlclxuICAgIGhhbmRsZXIubWV0aG9kLmFwcGx5IGhhbmRsZXIuaW5zdGFuY2UsIGFyZ3NcbiAgZWxzZSBpZiBub3Qgc2lsZW50XG4gICAgdGhyb3cgbmV3IEVycm9yIFwibWVkaWF0b3IuZXhlY3V0ZTogI3tuYW1lfSBoYW5kbGVyIGlzIG5vdCBkZWZpbmVkXCJcblxuIyBSZW1vdmVzIGhhbmRsZXJzIGZyb20gc3RvcmFnZS5cbiMgQ2FuIHRha2Ugbm8gYXJncywgbGlzdCBvZiBoYW5kbGVyIG5hbWVzIG9yIGluc3RhbmNlIHdoaWNoIGhhZCBib3VuZCBoYW5kbGVycy5cbm1lZGlhdG9yLnJlbW92ZUhhbmRsZXJzID0gKGluc3RhbmNlT3JOYW1lcykgLT5cbiAgdW5sZXNzIGluc3RhbmNlT3JOYW1lc1xuICAgIG1lZGlhdG9yLl9oYW5kbGVycyA9IHt9XG5cbiAgaWYgQXJyYXkuaXNBcnJheSBpbnN0YW5jZU9yTmFtZXNcbiAgICBmb3IgbmFtZSBpbiBpbnN0YW5jZU9yTmFtZXNcbiAgICAgIGRlbGV0ZSBoYW5kbGVyc1tuYW1lXVxuICBlbHNlXG4gICAgZm9yIG5hbWUsIGhhbmRsZXIgb2YgaGFuZGxlcnMgd2hlbiBoYW5kbGVyLmluc3RhbmNlIGlzIGluc3RhbmNlT3JOYW1lc1xuICAgICAgZGVsZXRlIGhhbmRsZXJzW25hbWVdXG4gIHJldHVyblxuXG4jIFNlYWxpbmcgdGhlIG1lZGlhdG9yXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMgQWZ0ZXIgYWRkaW5nIGFsbCBuZWVkZWQgcHJvcGVydGllcywgeW91IHNob3VsZCBzZWFsIHRoZSBtZWRpYXRvclxuIyB1c2luZyB0aGlzIG1ldGhvZC5cbm1lZGlhdG9yLnNlYWwgPSAtPlxuICAjIFByZXZlbnQgZXh0ZW5zaW9ucyBhbmQgbWFrZSBhbGwgcHJvcGVydGllcyBub24tY29uZmlndXJhYmxlLlxuICBPYmplY3Quc2VhbCBtZWRpYXRvclxuXG4jIE1ha2UgcHJvcGVydGllcyByZWFkb25seS5cbnV0aWxzLnJlYWRvbmx5IG1lZGlhdG9yLFxuICAnc3Vic2NyaWJlJywgJ3N1YnNjcmliZU9uY2UnLCAndW5zdWJzY3JpYmUnLCAncHVibGlzaCcsXG4gICdzZXRIYW5kbGVyJywgJ2V4ZWN1dGUnLCAncmVtb3ZlSGFuZGxlcnMnLCAnc2VhbCdcblxuIyBSZXR1cm4gb3VyIGNyZWF0aW9uLlxubW9kdWxlLmV4cG9ydHMgPSBtZWRpYXRvclxuIiwiJ3VzZSBzdHJpY3QnXG5cbl8gPSByZXF1aXJlICd1bmRlcnNjb3JlJ1xuQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZSdcblxuTW9kZWwgPSByZXF1aXJlICcuL21vZGVsJ1xuRXZlbnRCcm9rZXIgPSByZXF1aXJlICcuLi9saWIvZXZlbnRfYnJva2VyJ1xudXRpbHMgPSByZXF1aXJlICcuLi9saWIvdXRpbHMnXG5cbiMgQWJzdHJhY3QgY2xhc3Mgd2hpY2ggZXh0ZW5kcyB0aGUgc3RhbmRhcmQgQmFja2JvbmUgY29sbGVjdGlvblxuIyBpbiBvcmRlciB0byBhZGQgc29tZSBmdW5jdGlvbmFsaXR5LlxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBDb2xsZWN0aW9uIGV4dGVuZHMgQmFja2JvbmUuQ29sbGVjdGlvblxuICAjIE1peGluIGFuIEV2ZW50QnJva2VyLlxuICBfLmV4dGVuZCBAcHJvdG90eXBlLCBFdmVudEJyb2tlclxuXG4gICMgVXNlIHRoZSBDaGFwbGluIG1vZGVsIHBlciBkZWZhdWx0LCBub3QgQmFja2JvbmUuTW9kZWwuXG4gIG1vZGVsOiBNb2RlbFxuXG4gICMgU2VyaWFsaXplcyBjb2xsZWN0aW9uLlxuICBzZXJpYWxpemU6IC0+XG4gICAgQG1hcCB1dGlscy5zZXJpYWxpemVcblxuICAjIERpc3Bvc2FsXG4gICMgLS0tLS0tLS1cblxuICBkaXNwb3NlZDogZmFsc2VcblxuICBkaXNwb3NlOiAtPlxuICAgIHJldHVybiBpZiBAZGlzcG9zZWRcblxuICAgICMgRmlyZSBhbiBldmVudCB0byBub3RpZnkgYXNzb2NpYXRlZCB2aWV3cy5cbiAgICBAdHJpZ2dlciAnZGlzcG9zZScsIHRoaXNcblxuICAgICMgRW1wdHkgdGhlIGxpc3Qgc2lsZW50bHksIGJ1dCBkbyBub3QgZGlzcG9zZSBhbGwgbW9kZWxzIHNpbmNlXG4gICAgIyB0aGV5IG1pZ2h0IGJlIHJlZmVyZW5jZWQgZWxzZXdoZXJlLlxuICAgIEByZXNldCBbXSwgc2lsZW50OiB0cnVlXG5cbiAgICAjIFVuYmluZCBhbGwgZ2xvYmFsIGV2ZW50IGhhbmRsZXJzLlxuICAgIEB1bnN1YnNjcmliZUFsbEV2ZW50cygpXG5cbiAgICAjIFVuYmluZCBhbGwgcmVmZXJlbmNlZCBoYW5kbGVycy5cbiAgICBAc3RvcExpc3RlbmluZygpXG5cbiAgICAjIFJlbW92ZSBhbGwgZXZlbnQgaGFuZGxlcnMgb24gdGhpcyBtb2R1bGUuXG4gICAgQG9mZigpXG5cbiAgICAjIFJlbW92ZSBtb2RlbCBjb25zdHJ1Y3RvciByZWZlcmVuY2UsIGludGVybmFsIG1vZGVsIGxpc3RzXG4gICAgIyBhbmQgZXZlbnQgaGFuZGxlcnMuXG4gICAgZGVsZXRlIHRoaXNbcHJvcF0gZm9yIHByb3AgaW4gW1xuICAgICAgJ21vZGVsJyxcbiAgICAgICdtb2RlbHMnLCAnX2J5Q2lkJyxcbiAgICAgICdfY2FsbGJhY2tzJ1xuICAgIF1cblxuICAgIEBfYnlJZCA9IHt9XG5cbiAgICAjIEZpbmlzaGVkLlxuICAgIEBkaXNwb3NlZCA9IHRydWVcblxuICAgICMgWW914oCZcmUgZnJvemVuIHdoZW4geW91ciBoZWFydOKAmXMgbm90IG9wZW4uXG4gICAgT2JqZWN0LmZyZWV6ZSB0aGlzXG4iLCIndXNlIHN0cmljdCdcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuRXZlbnRCcm9rZXIgPSByZXF1aXJlICcuLi9saWIvZXZlbnRfYnJva2VyJ1xuXG4jIFByaXZhdGUgaGVscGVyIGZ1bmN0aW9uIGZvciBzZXJpYWxpemluZyBhdHRyaWJ1dGVzIHJlY3Vyc2l2ZWx5LFxuIyBjcmVhdGluZyBvYmplY3RzIHdoaWNoIGRlbGVnYXRlIHRvIHRoZSBvcmlnaW5hbCBhdHRyaWJ1dGVzXG4jIGluIG9yZGVyIHRvIHByb3RlY3QgdGhlbSBmcm9tIGNoYW5nZXMuXG5zZXJpYWxpemVBdHRyaWJ1dGVzID0gKG1vZGVsLCBhdHRyaWJ1dGVzLCBtb2RlbFN0YWNrKSAtPlxuICAjIENyZWF0ZSBhIGRlbGVnYXRvciBvYmplY3QuXG4gIGRlbGVnYXRvciA9IE9iamVjdC5jcmVhdGUgYXR0cmlidXRlc1xuXG4gICMgQWRkIG1vZGVsIHRvIHN0YWNrLlxuICBtb2RlbFN0YWNrID89IHt9XG4gIG1vZGVsU3RhY2tbbW9kZWwuY2lkXSA9IHRydWVcblxuICAjIE1hcCBtb2RlbC9jb2xsZWN0aW9uIHRvIHRoZWlyIGF0dHJpYnV0ZXMuIENyZWF0ZSBhIHByb3BlcnR5XG4gICMgb24gdGhlIGRlbGVnYXRvciB0aGF0IHNoYWRvd3MgdGhlIG9yaWdpbmFsIGF0dHJpYnV0ZS5cbiAgZm9yIGtleSwgdmFsdWUgb2YgYXR0cmlidXRlc1xuXG4gICAgIyBIYW5kbGUgbW9kZWxzLlxuICAgIGlmIHZhbHVlIGluc3RhbmNlb2YgQmFja2JvbmUuTW9kZWxcbiAgICAgIGRlbGVnYXRvcltrZXldID0gc2VyaWFsaXplTW9kZWxBdHRyaWJ1dGVzIHZhbHVlLCBtb2RlbCwgbW9kZWxTdGFja1xuXG4gICAgIyBIYW5kbGUgY29sbGVjdGlvbnMuXG4gICAgZWxzZSBpZiB2YWx1ZSBpbnN0YW5jZW9mIEJhY2tib25lLkNvbGxlY3Rpb25cbiAgICAgIHNlcmlhbGl6ZWRNb2RlbHMgPSBbXVxuICAgICAgZm9yIG90aGVyTW9kZWwgaW4gdmFsdWUubW9kZWxzXG4gICAgICAgIHNlcmlhbGl6ZWRNb2RlbHMucHVzaChcbiAgICAgICAgICBzZXJpYWxpemVNb2RlbEF0dHJpYnV0ZXMob3RoZXJNb2RlbCwgbW9kZWwsIG1vZGVsU3RhY2spXG4gICAgICAgIClcbiAgICAgIGRlbGVnYXRvcltrZXldID0gc2VyaWFsaXplZE1vZGVsc1xuXG4gICMgUmVtb3ZlIG1vZGVsIGZyb20gc3RhY2suXG4gIGRlbGV0ZSBtb2RlbFN0YWNrW21vZGVsLmNpZF1cblxuICAjIFJldHVybiB0aGUgZGVsZWdhdG9yLlxuICBkZWxlZ2F0b3JcblxuIyBTZXJpYWxpemUgdGhlIGF0dHJpYnV0ZXMgb2YgYSBnaXZlbiBtb2RlbFxuIyBpbiB0aGUgY29udGV4dCBvZiBhIGdpdmVuIHRyZWUuXG5zZXJpYWxpemVNb2RlbEF0dHJpYnV0ZXMgPSAobW9kZWwsIGN1cnJlbnRNb2RlbCwgbW9kZWxTdGFjaykgLT5cbiAgIyBOdWxsaWZ5IGNpcmN1bGFyIHJlZmVyZW5jZXMuXG4gIHJldHVybiBudWxsIGlmIG1vZGVsIGlzIGN1cnJlbnRNb2RlbCBvciBtb2RlbC5jaWQgb2YgbW9kZWxTdGFja1xuICAjIFNlcmlhbGl6ZSByZWN1cnNpdmVseS5cbiAgYXR0cmlidXRlcyA9IGlmIHR5cGVvZiBtb2RlbC5nZXRBdHRyaWJ1dGVzIGlzICdmdW5jdGlvbidcbiAgICAjIENoYXBsaW4gbW9kZWxzLlxuICAgIG1vZGVsLmdldEF0dHJpYnV0ZXMoKVxuICBlbHNlXG4gICAgIyBCYWNrYm9uZSBtb2RlbHMuXG4gICAgbW9kZWwuYXR0cmlidXRlc1xuICBzZXJpYWxpemVBdHRyaWJ1dGVzIG1vZGVsLCBhdHRyaWJ1dGVzLCBtb2RlbFN0YWNrXG5cblxuIyBBYnN0cmFjdGlvbiB0aGF0IGFkZHMgc29tZSB1c2VmdWwgZnVuY3Rpb25hbGl0eSB0byBiYWNrYm9uZSBtb2RlbC5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbFxuICAjIE1peGluIGFuIEV2ZW50QnJva2VyLlxuICBfLmV4dGVuZCBAcHJvdG90eXBlLCBFdmVudEJyb2tlclxuXG4gICMgVGhpcyBtZXRob2QgaXMgdXNlZCB0byBnZXQgdGhlIGF0dHJpYnV0ZXMgZm9yIHRoZSB2aWV3IHRlbXBsYXRlXG4gICMgYW5kIG1pZ2h0IGJlIG92ZXJ3cml0dGVuIGJ5IGRlY29yYXRvcnMgd2hpY2ggY2Fubm90IGNyZWF0ZSBhXG4gICMgcHJvcGVyIGBhdHRyaWJ1dGVzYCBnZXR0ZXIgZHVlIHRvIEVDTUFTY3JpcHQgMyBsaW1pdHMuXG4gIGdldEF0dHJpYnV0ZXM6IC0+XG4gICAgQGF0dHJpYnV0ZXNcblxuICAjIFJldHVybiBhbiBvYmplY3Qgd2hpY2ggZGVsZWdhdGVzIHRvIHRoZSBhdHRyaWJ1dGVzXG4gICMgKGkuZS4gYW4gb2JqZWN0IHdoaWNoIGhhcyB0aGUgYXR0cmlidXRlcyBhcyBwcm90b3R5cGUpXG4gICMgc28gcHJpbWl0aXZlIHZhbHVlcyBtaWdodCBiZSBhZGRlZCBhbmQgYWx0ZXJlZCBzYWZlbHkuXG4gICMgTWFwIG1vZGVscyB0byB0aGVpciBhdHRyaWJ1dGVzLCByZWN1cnNpdmVseS5cbiAgc2VyaWFsaXplOiAtPlxuICAgIHNlcmlhbGl6ZUF0dHJpYnV0ZXMgdGhpcywgQGdldEF0dHJpYnV0ZXMoKVxuXG4gICMgRGlzcG9zYWxcbiAgIyAtLS0tLS0tLVxuXG4gIGRpc3Bvc2VkOiBmYWxzZVxuXG4gIGRpc3Bvc2U6IC0+XG4gICAgcmV0dXJuIGlmIEBkaXNwb3NlZFxuXG4gICAgIyBGaXJlIGFuIGV2ZW50IHRvIG5vdGlmeSBhc3NvY2lhdGVkIGNvbGxlY3Rpb25zIGFuZCB2aWV3cy5cbiAgICBAdHJpZ2dlciAnZGlzcG9zZScsIHRoaXNcblxuICAgIEBjb2xsZWN0aW9uPy5yZW1vdmU/IHRoaXMsIHNpbGVudDogdHJ1ZVxuXG4gICAgIyBVbmJpbmQgYWxsIGdsb2JhbCBldmVudCBoYW5kbGVycy5cbiAgICBAdW5zdWJzY3JpYmVBbGxFdmVudHMoKVxuXG4gICAgIyBVbmJpbmQgYWxsIHJlZmVyZW5jZWQgaGFuZGxlcnMuXG4gICAgQHN0b3BMaXN0ZW5pbmcoKVxuXG4gICAgIyBSZW1vdmUgYWxsIGV2ZW50IGhhbmRsZXJzIG9uIHRoaXMgbW9kdWxlLlxuICAgIEBvZmYoKVxuXG4gICAgIyBSZW1vdmUgdGhlIGNvbGxlY3Rpb24gcmVmZXJlbmNlLCBpbnRlcm5hbCBhdHRyaWJ1dGUgaGFzaGVzXG4gICAgIyBhbmQgZXZlbnQgaGFuZGxlcnMuXG4gICAgZGVsZXRlIHRoaXNbcHJvcF0gZm9yIHByb3AgaW4gW1xuICAgICAgJ2NvbGxlY3Rpb24nLFxuICAgICAgJ2F0dHJpYnV0ZXMnLCAnY2hhbmdlZCcsICdkZWZhdWx0cycsXG4gICAgICAnX2VzY2FwZWRBdHRyaWJ1dGVzJywgJ19wcmV2aW91c0F0dHJpYnV0ZXMnLFxuICAgICAgJ19zaWxlbnQnLCAnX3BlbmRpbmcnLFxuICAgICAgJ19jYWxsYmFja3MnXG4gICAgXVxuXG4gICAgIyBGaW5pc2hlZC5cbiAgICBAZGlzcG9zZWQgPSB0cnVlXG5cbiAgICAjIFlvdeKAmXJlIGZyb3plbiB3aGVuIHlvdXIgaGVhcnTigJlzIG5vdCBvcGVuLlxuICAgIE9iamVjdC5mcmVlemUgdGhpc1xuIiwiJ3VzZSBzdHJpY3QnXG5cbkJhY2tib25lID0gcmVxdWlyZSAnYmFja2JvbmUnXG5cblZpZXcgPSByZXF1aXJlICcuL3ZpZXcnXG51dGlscyA9IHJlcXVpcmUgJy4uL2xpYi91dGlscydcblxuIyBTaG9ydGN1dCB0byBhY2Nlc3MgdGhlIERPTSBtYW5pcHVsYXRpb24gbGlicmFyeS5cbnskfSA9IEJhY2tib25lXG5cbmZpbHRlckNoaWxkcmVuID0gKG5vZGVMaXN0LCBzZWxlY3RvcikgLT5cbiAgcmV0dXJuIG5vZGVMaXN0IHVubGVzcyBzZWxlY3RvclxuICBmb3Igbm9kZSBpbiBub2RlTGlzdCB3aGVuIHV0aWxzLm1hdGNoZXNTZWxlY3RvciBub2RlLCBzZWxlY3RvclxuICAgIG5vZGVcblxudG9nZ2xlRWxlbWVudCA9IGRvIC0+XG4gIGlmICRcbiAgICAoZWxlbSwgdmlzaWJsZSkgLT4gZWxlbS50b2dnbGUgdmlzaWJsZVxuICBlbHNlXG4gICAgKGVsZW0sIHZpc2libGUpIC0+XG4gICAgICBlbGVtLnN0eWxlLmRpc3BsYXkgPSAoaWYgdmlzaWJsZSB0aGVuICcnIGVsc2UgJ25vbmUnKVxuXG5hZGRDbGFzcyA9IGRvIC0+XG4gIGlmICRcbiAgICAoZWxlbSwgY2xzKSAtPiBlbGVtLmFkZENsYXNzIGNsc1xuICBlbHNlXG4gICAgKGVsZW0sIGNscykgLT4gZWxlbS5jbGFzc0xpc3QuYWRkIGNsc1xuXG5zdGFydEFuaW1hdGlvbiA9IGRvIC0+XG4gIGlmICRcbiAgICAoZWxlbSwgdXNlQ3NzQW5pbWF0aW9uLCBjbHMpIC0+XG4gICAgICBpZiB1c2VDc3NBbmltYXRpb25cbiAgICAgICAgYWRkQ2xhc3MgZWxlbSwgY2xzXG4gICAgICBlbHNlXG4gICAgICAgIGVsZW0uY3NzICdvcGFjaXR5JywgMFxuICBlbHNlXG4gICAgKGVsZW0sIHVzZUNzc0FuaW1hdGlvbiwgY2xzKSAtPlxuICAgICAgaWYgdXNlQ3NzQW5pbWF0aW9uXG4gICAgICAgIGFkZENsYXNzIGVsZW0sIGNsc1xuICAgICAgZWxzZVxuICAgICAgICBlbGVtLnN0eWxlLm9wYWNpdHkgPSAwXG5cbmVuZEFuaW1hdGlvbiA9IGRvIC0+XG4gIGlmICRcbiAgICAoZWxlbSwgZHVyYXRpb24pIC0+IGVsZW0uYW5pbWF0ZSB7b3BhY2l0eTogMX0sIGR1cmF0aW9uXG4gIGVsc2VcbiAgICAoZWxlbSwgZHVyYXRpb24pIC0+XG4gICAgICBlbGVtLnN0eWxlLnRyYW5zaXRpb24gPSBcIm9wYWNpdHkgI3tkdXJhdGlvbn1tc1wiXG4gICAgICBlbGVtLnN0eWxlLm9wYWNpdHkgPSAxXG5cbmluc2VydFZpZXcgPSBkbyAtPlxuICBpZiAkXG4gICAgKGxpc3QsIHZpZXdFbCwgcG9zaXRpb24sIGxlbmd0aCwgaXRlbVNlbGVjdG9yKSAtPlxuICAgICAgaW5zZXJ0SW5NaWRkbGUgPSAoMCA8IHBvc2l0aW9uIDwgbGVuZ3RoKVxuICAgICAgaXNFbmQgPSAobGVuZ3RoKSAtPiBsZW5ndGggaXMgMCBvciBwb3NpdGlvbiA+PSBsZW5ndGhcblxuICAgICAgaWYgaW5zZXJ0SW5NaWRkbGUgb3IgaXRlbVNlbGVjdG9yXG4gICAgICAgICMgR2V0IHRoZSBjaGlsZHJlbiB3aGljaCBvcmlnaW5hdGUgZnJvbSBpdGVtIHZpZXdzLlxuICAgICAgICBjaGlsZHJlbiA9IGxpc3QuY2hpbGRyZW4gaXRlbVNlbGVjdG9yXG4gICAgICAgIGNoaWxkcmVuTGVuZ3RoID0gY2hpbGRyZW4ubGVuZ3RoXG5cbiAgICAgICAgIyBDaGVjayBpZiBpdCBuZWVkcyB0byBiZSBpbnNlcnRlZC5cbiAgICAgICAgdW5sZXNzIGNoaWxkcmVuW3Bvc2l0aW9uXSBpcyB2aWV3RWxcbiAgICAgICAgICBpZiBpc0VuZCBjaGlsZHJlbkxlbmd0aFxuICAgICAgICAgICAgIyBJbnNlcnQgYXQgdGhlIGVuZC5cbiAgICAgICAgICAgIGxpc3QuYXBwZW5kIHZpZXdFbFxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICMgSW5zZXJ0IGF0IHRoZSByaWdodCBwb3NpdGlvbi5cbiAgICAgICAgICAgIGlmIHBvc2l0aW9uIGlzIDBcbiAgICAgICAgICAgICAgY2hpbGRyZW4uZXEocG9zaXRpb24pLmJlZm9yZSB2aWV3RWxcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgY2hpbGRyZW4uZXEocG9zaXRpb24gLSAxKS5hZnRlciB2aWV3RWxcbiAgICAgIGVsc2VcbiAgICAgICAgbWV0aG9kID0gaWYgaXNFbmQgbGVuZ3RoIHRoZW4gJ2FwcGVuZCcgZWxzZSAncHJlcGVuZCdcbiAgICAgICAgbGlzdFttZXRob2RdIHZpZXdFbFxuICBlbHNlXG4gICAgKGxpc3QsIHZpZXdFbCwgcG9zaXRpb24sIGxlbmd0aCwgaXRlbVNlbGVjdG9yKSAtPlxuICAgICAgaW5zZXJ0SW5NaWRkbGUgPSAoMCA8IHBvc2l0aW9uIDwgbGVuZ3RoKVxuICAgICAgaXNFbmQgPSAobGVuZ3RoKSAtPiBsZW5ndGggaXMgMCBvciBwb3NpdGlvbiBpcyBsZW5ndGhcblxuICAgICAgaWYgaW5zZXJ0SW5NaWRkbGUgb3IgaXRlbVNlbGVjdG9yXG4gICAgICAgICMgR2V0IHRoZSBjaGlsZHJlbiB3aGljaCBvcmlnaW5hdGUgZnJvbSBpdGVtIHZpZXdzLlxuICAgICAgICBjaGlsZHJlbiA9IGZpbHRlckNoaWxkcmVuIGxpc3QuY2hpbGRyZW4sIGl0ZW1TZWxlY3RvclxuICAgICAgICBjaGlsZHJlbkxlbmd0aCA9IGNoaWxkcmVuLmxlbmd0aFxuXG4gICAgICAgICMgQ2hlY2sgaWYgaXQgbmVlZHMgdG8gYmUgaW5zZXJ0ZWQuXG4gICAgICAgIHVubGVzcyBjaGlsZHJlbltwb3NpdGlvbl0gaXMgdmlld0VsXG4gICAgICAgICAgaWYgaXNFbmQgY2hpbGRyZW5MZW5ndGhcbiAgICAgICAgICAgICMgSW5zZXJ0IGF0IHRoZSBlbmQuXG4gICAgICAgICAgICBsaXN0LmFwcGVuZENoaWxkIHZpZXdFbFxuICAgICAgICAgIGVsc2UgaWYgcG9zaXRpb24gaXMgMFxuICAgICAgICAgICAgIyBJbnNlcnQgYXQgdGhlIHJpZ2h0IHBvc2l0aW9uLlxuICAgICAgICAgICAgbGlzdC5pbnNlcnRCZWZvcmUgdmlld0VsLCBjaGlsZHJlbltwb3NpdGlvbl1cbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBsYXN0ID0gY2hpbGRyZW5bcG9zaXRpb24gLSAxXVxuICAgICAgICAgICAgaWYgbGlzdC5sYXN0Q2hpbGQgaXMgbGFzdFxuICAgICAgICAgICAgICBsaXN0LmFwcGVuZENoaWxkIHZpZXdFbFxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBsaXN0Lmluc2VydEJlZm9yZSB2aWV3RWwsIGxhc3QubmV4dEVsZW1lbnRTaWJsaW5nXG4gICAgICBlbHNlIGlmIGlzRW5kIGxlbmd0aFxuICAgICAgICBsaXN0LmFwcGVuZENoaWxkIHZpZXdFbFxuICAgICAgZWxzZVxuICAgICAgICBsaXN0Lmluc2VydEJlZm9yZSB2aWV3RWwsIGxpc3QuZmlyc3RDaGlsZFxuXG4jIEdlbmVyYWwgY2xhc3MgZm9yIHJlbmRlcmluZyBDb2xsZWN0aW9ucy5cbiMgRGVyaXZlIHRoaXMgY2xhc3MgYW5kIGRlY2xhcmUgYXQgbGVhc3QgYGl0ZW1WaWV3YCBvciBvdmVycmlkZVxuIyBgaW5pdEl0ZW1WaWV3YC4gYGluaXRJdGVtVmlld2AgZ2V0cyBhbiBpdGVtIG1vZGVsIGFuZCBzaG91bGQgaW5zdGFudGlhdGVcbiMgYW5kIHJldHVybiBhIGNvcnJlc3BvbmRpbmcgaXRlbSB2aWV3LlxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBDb2xsZWN0aW9uVmlldyBleHRlbmRzIFZpZXdcbiAgIyBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgIyA9PT09PT09PT09PT09PT09PT09PT1cblxuICAjIFRoZXNlIG9wdGlvbnMgbWF5IGJlIG92ZXJ3cml0dGVuIGluIGRlcml2ZWQgY2xhc3Nlcy5cblxuICAjIEEgY2xhc3Mgb2YgaXRlbSBpbiBjb2xsZWN0aW9uLlxuICAjIFRoaXMgcHJvcGVydHkgaGFzIHRvIGJlIG92ZXJyaWRkZW4gYnkgYSBkZXJpdmVkIGNsYXNzLlxuICBpdGVtVmlldzogbnVsbFxuXG4gICMgQXV0b21hdGljIHJlbmRlcmluZ1xuICAjIC0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAjIFBlciBkZWZhdWx0LCByZW5kZXIgdGhlIHZpZXcgaXRzZWxmIGFuZCBhbGwgaXRlbXMgb24gY3JlYXRpb24uXG4gIGF1dG9SZW5kZXI6IHRydWVcbiAgcmVuZGVySXRlbXM6IHRydWVcblxuICAjIEFuaW1hdGlvblxuICAjIC0tLS0tLS0tLVxuXG4gICMgV2hlbiBuZXcgaXRlbXMgYXJlIGFkZGVkLCB0aGVpciB2aWV3cyBhcmUgZmFkZWQgaW4uXG4gICMgQW5pbWF0aW9uIGR1cmF0aW9uIGluIG1pbGxpc2Vjb25kcyAoc2V0IHRvIDAgdG8gZGlzYWJsZSBmYWRlIGluKVxuICBhbmltYXRpb25EdXJhdGlvbjogNTAwXG5cbiAgIyBCeSBkZWZhdWx0LCBmYWRpbmcgaW4gaXMgZG9uZSBieSBqYXZhc2NyaXB0IGZ1bmN0aW9uIHdoaWNoIGNhbiBiZVxuICAjIHNsb3cgb24gbW9iaWxlIGRldmljZXMuIENTUyBhbmltYXRpb25zIGFyZSBmYXN0ZXIsXG4gICMgYnV0IHJlcXVpcmUgdXNlcuKAmXMgbWFudWFsIGRlZmluaXRpb25zLlxuICB1c2VDc3NBbmltYXRpb246IGZhbHNlXG5cbiAgIyBDU1MgY2xhc3NlcyB0aGF0IHdpbGwgYmUgdXNlZCB3aGVuIGhpZGluZyAvIHNob3dpbmcgY2hpbGQgdmlld3MuXG4gIGFuaW1hdGlvblN0YXJ0Q2xhc3M6ICdhbmltYXRlZC1pdGVtLXZpZXcnXG4gIGFuaW1hdGlvbkVuZENsYXNzOiAnYW5pbWF0ZWQtaXRlbS12aWV3LWVuZCdcblxuICAjIFNlbGVjdG9ycyBhbmQgZWxlbWVudHNcbiAgIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgIyBBIGNvbGxlY3Rpb24gdmlldyBtYXkgaGF2ZSBhIHRlbXBsYXRlIGFuZCB1c2Ugb25lIG9mIGl0cyBjaGlsZCBlbGVtZW50c1xuICAjIGFzIHRoZSBjb250YWluZXIgb2YgdGhlIGl0ZW0gdmlld3MuIElmIHlvdSBzcGVjaWZ5IGBsaXN0U2VsZWN0b3JgLCB0aGVcbiAgIyBpdGVtIHZpZXdzIHdpbGwgYmUgYXBwZW5kZWQgdG8gdGhpcyBlbGVtZW50LiBJZiBlbXB0eSwgJGVsIGlzIHVzZWQuXG4gIGxpc3RTZWxlY3RvcjogbnVsbFxuXG4gICMgVGhlIGFjdHVhbCBlbGVtZW50IHdoaWNoIGlzIGZldGNoZWQgdXNpbmcgYGxpc3RTZWxlY3RvcmBcbiAgJGxpc3Q6IG51bGxcblxuICAjIFNlbGVjdG9yIGZvciBhIGZhbGxiYWNrIGVsZW1lbnQgd2hpY2ggaXMgc2hvd24gaWYgdGhlIGNvbGxlY3Rpb24gaXMgZW1wdHkuXG4gIGZhbGxiYWNrU2VsZWN0b3I6IG51bGxcblxuICAjIFRoZSBhY3R1YWwgZWxlbWVudCB3aGljaCBpcyBmZXRjaGVkIHVzaW5nIGBmYWxsYmFja1NlbGVjdG9yYFxuICAkZmFsbGJhY2s6IG51bGxcblxuICAjIFNlbGVjdG9yIGZvciBhIGxvYWRpbmcgaW5kaWNhdG9yIGVsZW1lbnQgd2hpY2ggaXMgc2hvd25cbiAgIyB3aGlsZSB0aGUgY29sbGVjdGlvbiBpcyBzeW5jaW5nLlxuICBsb2FkaW5nU2VsZWN0b3I6IG51bGxcblxuICAjIFRoZSBhY3R1YWwgZWxlbWVudCB3aGljaCBpcyBmZXRjaGVkIHVzaW5nIGBsb2FkaW5nU2VsZWN0b3JgXG4gICRsb2FkaW5nOiBudWxsXG5cbiAgIyBTZWxlY3RvciB3aGljaCBpZGVudGlmaWVzIGNoaWxkIGVsZW1lbnRzIGJlbG9uZ2luZyB0byBjb2xsZWN0aW9uXG4gICMgSWYgZW1wdHksIGFsbCBjaGlsZHJlbiBvZiAkbGlzdCBhcmUgY29uc2lkZXJlZC5cbiAgaXRlbVNlbGVjdG9yOiBudWxsXG5cbiAgIyBGaWx0ZXJpbmdcbiAgIyAtLS0tLS0tLS1cblxuICAjIFRoZSBmaWx0ZXIgZnVuY3Rpb24sIGlmIGFueS5cbiAgZmlsdGVyZXI6IG51bGxcblxuICAjIEEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIGFmdGVyIGVhY2ggZmlsdGVyLlxuICAjIEhpZGVzIGV4Y2x1ZGVkIGl0ZW1zIGJ5IGRlZmF1bHQuXG4gIGZpbHRlckNhbGxiYWNrOiAodmlldywgaW5jbHVkZWQpIC0+XG4gICAgdmlldy4kZWwuc3RvcCB0cnVlLCB0cnVlIGlmICRcbiAgICB0b2dnbGVFbGVtZW50IChpZiAkIHRoZW4gdmlldy4kZWwgZWxzZSB2aWV3LmVsKSwgaW5jbHVkZWRcblxuICAjIFZpZXcgbGlzdHNcbiAgIyAtLS0tLS0tLS0tXG5cbiAgIyBUcmFjayBhIGxpc3Qgb2YgdGhlIHZpc2libGUgdmlld3MuXG4gIHZpc2libGVJdGVtczogbnVsbFxuXG4gICMgQ29uc3RydWN0b3JcbiAgIyAtLS0tLS0tLS0tLVxuXG4gIG9wdGlvbk5hbWVzOiBWaWV3OjpvcHRpb25OYW1lcy5jb25jYXQgWydyZW5kZXJJdGVtcycsICdpdGVtVmlldyddXG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgICMgSW5pdGlhbGl6ZSBsaXN0IGZvciB2aXNpYmxlIGl0ZW1zLlxuICAgIEB2aXNpYmxlSXRlbXMgPSBbXVxuXG4gICAgc3VwZXJcblxuICAjIEluaXRpYWxpemF0aW9uXG4gICMgLS0tLS0tLS0tLS0tLS1cblxuICBpbml0aWFsaXplOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICMgRG9uJ3QgY2FsbCBzdXBlcjsgdGhlIGJhc2UgdmlldydzIGluaXRpYWxpemUgaXMgYSBuby1vcC5cblxuICAgICMgU3RhcnQgb2JzZXJ2aW5nIHRoZSBjb2xsZWN0aW9uLlxuICAgIEBhZGRDb2xsZWN0aW9uTGlzdGVuZXJzKClcblxuICAgICMgQXBwbHkgYSBmaWx0ZXIgaWYgb25lIHByb3ZpZGVkLlxuICAgIEBmaWx0ZXIgb3B0aW9ucy5maWx0ZXJlciBpZiBvcHRpb25zLmZpbHRlcmVyP1xuXG4gICMgQmluZGluZyBvZiBjb2xsZWN0aW9uIGxpc3RlbmVycy5cbiAgYWRkQ29sbGVjdGlvbkxpc3RlbmVyczogLT5cbiAgICBAbGlzdGVuVG8gQGNvbGxlY3Rpb24sICdhZGQnLCBAaXRlbUFkZGVkXG4gICAgQGxpc3RlblRvIEBjb2xsZWN0aW9uLCAncmVtb3ZlJywgQGl0ZW1SZW1vdmVkXG4gICAgQGxpc3RlblRvIEBjb2xsZWN0aW9uLCAncmVzZXQgc29ydCcsIEBpdGVtc1Jlc2V0XG5cbiAgIyBSZW5kZXJpbmdcbiAgIyAtLS0tLS0tLS1cblxuICAjIE92ZXJyaWRlIFZpZXcjZ2V0VGVtcGxhdGVEYXRhLCBkb27igJl0IHNlcmlhbGl6ZSBjb2xsZWN0aW9uIGl0ZW1zIGhlcmUuXG4gIGdldFRlbXBsYXRlRGF0YTogLT5cbiAgICB0ZW1wbGF0ZURhdGEgPSB7bGVuZ3RoOiBAY29sbGVjdGlvbi5sZW5ndGh9XG5cbiAgICAjIElmIHRoZSBjb2xsZWN0aW9uIGlzIGEgU3luY01hY2hpbmUsIGFkZCBhIGBzeW5jZWRgIGZsYWcuXG4gICAgaWYgdHlwZW9mIEBjb2xsZWN0aW9uLmlzU3luY2VkIGlzICdmdW5jdGlvbidcbiAgICAgIHRlbXBsYXRlRGF0YS5zeW5jZWQgPSBAY29sbGVjdGlvbi5pc1N5bmNlZCgpXG5cbiAgICB0ZW1wbGF0ZURhdGFcblxuICAjIEluIGNvbnRyYXN0IHRvIG5vcm1hbCB2aWV3cywgYSB0ZW1wbGF0ZSBpcyBub3QgbWFuZGF0b3J5XG4gICMgZm9yIENvbGxlY3Rpb25WaWV3cy4gUHJvdmlkZSBhbiBlbXB0eSBgZ2V0VGVtcGxhdGVGdW5jdGlvbmAuXG4gIGdldFRlbXBsYXRlRnVuY3Rpb246IC0+XG5cbiAgIyBNYWluIHJlbmRlciBtZXRob2QgKHNob3VsZCBiZSBjYWxsZWQgb25seSBvbmNlKVxuICByZW5kZXI6IC0+XG4gICAgc3VwZXJcblxuICAgICMgU2V0IHRoZSAkbGlzdCBwcm9wZXJ0eSB3aXRoIHRoZSBhY3R1YWwgbGlzdCBjb250YWluZXIuXG4gICAgbGlzdFNlbGVjdG9yID0gaWYgdHlwZW9mIEBsaXN0U2VsZWN0b3IgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgQGxpc3RTZWxlY3RvcigpXG4gICAgZWxzZVxuICAgICAgQGxpc3RTZWxlY3RvclxuXG4gICAgaWYgJFxuICAgICAgQCRsaXN0ID0gaWYgbGlzdFNlbGVjdG9yIHRoZW4gQGZpbmQgbGlzdFNlbGVjdG9yIGVsc2UgQCRlbFxuICAgIGVsc2VcbiAgICAgIEBsaXN0ID0gaWYgbGlzdFNlbGVjdG9yIHRoZW4gQGZpbmQgQGxpc3RTZWxlY3RvciBlbHNlIEBlbFxuXG4gICAgQGluaXRGYWxsYmFjaygpXG4gICAgQGluaXRMb2FkaW5nSW5kaWNhdG9yKClcblxuICAgICMgUmVuZGVyIGFsbCBpdGVtcy5cbiAgICBAcmVuZGVyQWxsSXRlbXMoKSBpZiBAcmVuZGVySXRlbXNcblxuICAjIEFkZGluZyAvIFJlbW92aW5nXG4gICMgLS0tLS0tLS0tLS0tLS0tLS1cblxuICAjIFdoZW4gYW4gaXRlbSBpcyBhZGRlZCwgY3JlYXRlIGEgbmV3IHZpZXcgYW5kIGluc2VydCBpdC5cbiAgaXRlbUFkZGVkOiAoaXRlbSwgY29sbGVjdGlvbiwgb3B0aW9ucykgPT5cbiAgICBAaW5zZXJ0VmlldyBpdGVtLCBAcmVuZGVySXRlbShpdGVtKSwgb3B0aW9ucy5hdFxuXG4gICMgV2hlbiBhbiBpdGVtIGlzIHJlbW92ZWQsIHJlbW92ZSB0aGUgY29ycmVzcG9uZGluZyB2aWV3IGZyb20gRE9NIGFuZCBjYWNoZXMuXG4gIGl0ZW1SZW1vdmVkOiAoaXRlbSkgPT5cbiAgICBAcmVtb3ZlVmlld0Zvckl0ZW0gaXRlbVxuXG4gICMgV2hlbiBhbGwgaXRlbXMgYXJlIHJlc2V0dGVkLCByZW5kZXIgYWxsIGFuZXcuXG4gIGl0ZW1zUmVzZXQ6ID0+XG4gICAgQHJlbmRlckFsbEl0ZW1zKClcblxuICAjIEZhbGxiYWNrIG1lc3NhZ2Ugd2hlbiB0aGUgY29sbGVjdGlvbiBpcyBlbXB0eVxuICAjIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGluaXRGYWxsYmFjazogLT5cbiAgICByZXR1cm4gdW5sZXNzIEBmYWxsYmFja1NlbGVjdG9yXG5cbiAgICAjIFNldCB0aGUgJGZhbGxiYWNrIHByb3BlcnR5LlxuICAgIGlmICRcbiAgICAgIEAkZmFsbGJhY2sgPSBAZmluZCBAZmFsbGJhY2tTZWxlY3RvclxuICAgIGVsc2VcbiAgICAgIEBmYWxsYmFjayA9IEBmaW5kIEBmYWxsYmFja1NlbGVjdG9yXG5cbiAgICAjIExpc3RlbiBmb3IgdmlzaWJsZSBpdGVtcyBjaGFuZ2VzLlxuICAgIEBvbiAndmlzaWJpbGl0eUNoYW5nZScsIEB0b2dnbGVGYWxsYmFja1xuXG4gICAgIyBMaXN0ZW4gZm9yIHN5bmMgZXZlbnRzIG9uIHRoZSBjb2xsZWN0aW9uLlxuICAgIEBsaXN0ZW5UbyBAY29sbGVjdGlvbiwgJ3N5bmNTdGF0ZUNoYW5nZScsIEB0b2dnbGVGYWxsYmFja1xuXG4gICAgIyBTZXQgdmlzaWJpbGl0eSBpbml0aWFsbHkuXG4gICAgQHRvZ2dsZUZhbGxiYWNrKClcblxuICAjIFNob3cgZmFsbGJhY2sgaWYgbm8gaXRlbSBpcyB2aXNpYmxlIGFuZCB0aGUgY29sbGVjdGlvbiBpcyBzeW5jZWQuXG4gIHRvZ2dsZUZhbGxiYWNrOiA9PlxuICAgIHZpc2libGUgPSBAdmlzaWJsZUl0ZW1zLmxlbmd0aCBpcyAwIGFuZCAoXG4gICAgICBpZiB0eXBlb2YgQGNvbGxlY3Rpb24uaXNTeW5jZWQgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICAjIENvbGxlY3Rpb24gaXMgYSBTeW5jTWFjaGluZS5cbiAgICAgICAgQGNvbGxlY3Rpb24uaXNTeW5jZWQoKVxuICAgICAgZWxzZVxuICAgICAgICAjIEFzc3VtZSBpdCBpcyBzeW5jZWQuXG4gICAgICAgIHRydWVcbiAgICApXG4gICAgdG9nZ2xlRWxlbWVudCAoaWYgJCB0aGVuIEAkZmFsbGJhY2sgZWxzZSBAZmFsbGJhY2spLCB2aXNpYmxlXG5cbiAgIyBMb2FkaW5nIGluZGljYXRvclxuICAjIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgaW5pdExvYWRpbmdJbmRpY2F0b3I6IC0+XG4gICAgIyBUaGUgbG9hZGluZyBpbmRpY2F0b3Igb25seSB3b3JrcyBmb3IgQ29sbGVjdGlvbnNcbiAgICAjIHdoaWNoIGFyZSBTeW5jTWFjaGluZXMuXG4gICAgcmV0dXJuIHVubGVzcyBAbG9hZGluZ1NlbGVjdG9yIGFuZFxuICAgICAgdHlwZW9mIEBjb2xsZWN0aW9uLmlzU3luY2luZyBpcyAnZnVuY3Rpb24nXG5cbiAgICAjIFNldCB0aGUgJGxvYWRpbmcgcHJvcGVydHkuXG4gICAgaWYgJFxuICAgICAgQCRsb2FkaW5nID0gQGZpbmQgQGxvYWRpbmdTZWxlY3RvclxuICAgIGVsc2VcbiAgICAgIEBsb2FkaW5nID0gQGZpbmQgQGxvYWRpbmdTZWxlY3RvclxuXG4gICAgIyBMaXN0ZW4gZm9yIHN5bmMgZXZlbnRzIG9uIHRoZSBjb2xsZWN0aW9uLlxuICAgIEBsaXN0ZW5UbyBAY29sbGVjdGlvbiwgJ3N5bmNTdGF0ZUNoYW5nZScsIEB0b2dnbGVMb2FkaW5nSW5kaWNhdG9yXG5cbiAgICAjIFNldCB2aXNpYmlsaXR5IGluaXRpYWxseS5cbiAgICBAdG9nZ2xlTG9hZGluZ0luZGljYXRvcigpXG5cbiAgdG9nZ2xlTG9hZGluZ0luZGljYXRvcjogLT5cbiAgICAjIE9ubHkgc2hvdyB0aGUgbG9hZGluZyBpbmRpY2F0b3IgaWYgdGhlIGNvbGxlY3Rpb24gaXMgZW1wdHkuXG4gICAgIyBPdGhlcndpc2UgbG9hZGluZyBtb3JlIGl0ZW1zIGluIG9yZGVyIHRvIGFwcGVuZCB0aGVtIHdvdWxkXG4gICAgIyBzaG93IHRoZSBsb2FkaW5nIGluZGljYXRvci4gSWYgeW91IHdhbnQgdGhlIGluZGljYXRvciB0b1xuICAgICMgc2hvdyB1cCBpbiB0aGlzIGNhc2UsIHlvdSBuZWVkIHRvIG92ZXJ3cml0ZSB0aGlzIG1ldGhvZCB0b1xuICAgICMgZGlzYWJsZSB0aGUgY2hlY2suXG4gICAgdmlzaWJsZSA9IEBjb2xsZWN0aW9uLmxlbmd0aCBpcyAwIGFuZCBAY29sbGVjdGlvbi5pc1N5bmNpbmcoKVxuICAgIHRvZ2dsZUVsZW1lbnQgKGlmICQgdGhlbiBAJGxvYWRpbmcgZWxzZSBAbG9hZGluZyksIHZpc2libGVcblxuICAjIEZpbHRlcmluZ1xuICAjIC0tLS0tLS0tLVxuXG4gICMgRmlsdGVycyBvbmx5IGNoaWxkIGl0ZW0gdmlld3MgZnJvbSBhbGwgY3VycmVudCBzdWJ2aWV3cy5cbiAgZ2V0SXRlbVZpZXdzOiAtPlxuICAgIGl0ZW1WaWV3cyA9IHt9XG4gICAgZm9yIGtleSBpbiBPYmplY3Qua2V5cyBAc3Vidmlld3NCeU5hbWVcbiAgICAgIHVubGVzcyBrZXkuaW5kZXhPZiAnaXRlbVZpZXc6J1xuICAgICAgICBpdGVtVmlld3Nba2V5LnNsaWNlIDldID0gQHN1YnZpZXdzQnlOYW1lW2tleV1cbiAgICBpdGVtVmlld3NcblxuICAjIEFwcGxpZXMgYSBmaWx0ZXIgdG8gdGhlIGNvbGxlY3Rpb24gdmlldy5cbiAgIyBFeHBlY3RzIGFuIGl0ZXJhdG9yIGZ1bmN0aW9uIGFzIGZpcnN0IHBhcmFtZXRlclxuICAjIHdoaWNoIG5lZWQgdG8gcmV0dXJuIHRydWUgb3IgZmFsc2UuXG4gICMgT3B0aW9uYWwgZmlsdGVyIGNhbGxiYWNrIHdoaWNoIGlzIGNhbGxlZCB0b1xuICAjIHNob3cvaGlkZSB0aGUgdmlldyBvciBtYXJrIGl0IG90aGVyd2lzZSBhcyBmaWx0ZXJlZC5cbiAgZmlsdGVyOiAoZmlsdGVyZXIsIGZpbHRlckNhbGxiYWNrKSAtPlxuICAgICMgU2F2ZSB0aGUgZmlsdGVyZXIgYW5kIGZpbHRlckNhbGxiYWNrIGZ1bmN0aW9ucy5cbiAgICBpZiB0eXBlb2YgZmlsdGVyZXIgaXMgJ2Z1bmN0aW9uJyBvciBmaWx0ZXJlciBpcyBudWxsXG4gICAgICBAZmlsdGVyZXIgPSBmaWx0ZXJlclxuICAgIGlmIHR5cGVvZiBmaWx0ZXJDYWxsYmFjayBpcyAnZnVuY3Rpb24nIG9yIGZpbHRlckNhbGxiYWNrIGlzIG51bGxcbiAgICAgIEBmaWx0ZXJDYWxsYmFjayA9IGZpbHRlckNhbGxiYWNrXG5cbiAgICBoYXNJdGVtVmlld3MgPSBPYmplY3RcbiAgICAgIC5rZXlzIEBzdWJ2aWV3c0J5TmFtZVxuICAgICAgLnNvbWUgKGtleSkgLT4gMCBpcyBrZXkuaW5kZXhPZiAnaXRlbVZpZXc6J1xuXG4gICAgIyBTaG93L2hpZGUgZXhpc3Rpbmcgdmlld3MuXG4gICAgaWYgaGFzSXRlbVZpZXdzXG4gICAgICBmb3IgaXRlbSwgaW5kZXggaW4gQGNvbGxlY3Rpb24ubW9kZWxzXG5cbiAgICAgICAgIyBBcHBseSBmaWx0ZXIgdG8gdGhlIGl0ZW0uXG4gICAgICAgIGluY2x1ZGVkID0gaWYgdHlwZW9mIEBmaWx0ZXJlciBpcyAnZnVuY3Rpb24nXG4gICAgICAgICAgQGZpbHRlcmVyIGl0ZW0sIGluZGV4XG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0cnVlXG5cbiAgICAgICAgIyBTaG93L2hpZGUgdGhlIHZpZXcgYWNjb3JkaW5nbHkuXG4gICAgICAgIHZpZXcgPSBAc3VidmlldyBcIml0ZW1WaWV3OiN7aXRlbS5jaWR9XCJcbiAgICAgICAgIyBBIHZpZXcgaGFzIG5vdCBiZWVuIGNyZWF0ZWQgZm9yIHRoaXMgaXRlbSB5ZXQuXG4gICAgICAgIHVubGVzcyB2aWV3XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yICdDb2xsZWN0aW9uVmlldyNmaWx0ZXI6ICcgK1xuICAgICAgICAgICAgXCJubyB2aWV3IGZvdW5kIGZvciAje2l0ZW0uY2lkfVwiXG5cbiAgICAgICAgIyBTaG93L2hpZGUgb3IgbWFyayB0aGUgdmlldyBhY2NvcmRpbmdseS5cbiAgICAgICAgQGZpbHRlckNhbGxiYWNrIHZpZXcsIGluY2x1ZGVkXG5cbiAgICAgICAgIyBVcGRhdGUgdmlzaWJsZUl0ZW1zIGxpc3QsIGJ1dCBkbyBub3QgdHJpZ2dlciBhbiBldmVudCBpbW1lZGlhdGVseS5cbiAgICAgICAgQHVwZGF0ZVZpc2libGVJdGVtcyB2aWV3Lm1vZGVsLCBpbmNsdWRlZCwgZmFsc2VcblxuICAgICMgVHJpZ2dlciBhIGNvbWJpbmVkIGB2aXNpYmlsaXR5Q2hhbmdlYCBldmVudC5cbiAgICBAdHJpZ2dlciAndmlzaWJpbGl0eUNoYW5nZScsIEB2aXNpYmxlSXRlbXNcblxuICAjIEl0ZW0gdmlldyByZW5kZXJpbmdcbiAgIyAtLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgIyBSZW5kZXIgYW5kIGluc2VydCBhbGwgaXRlbXMuXG4gIHJlbmRlckFsbEl0ZW1zOiA9PlxuICAgIGl0ZW1zID0gQGNvbGxlY3Rpb24ubW9kZWxzXG5cbiAgICAjIFJlc2V0IHZpc2libGUgaXRlbXMuXG4gICAgQHZpc2libGVJdGVtcy5sZW5ndGggPSAwXG5cbiAgICAjIENvbGxlY3QgcmVtYWluaW5nIHZpZXdzLlxuICAgIHJlbWFpbmluZ1ZpZXdzQnlDaWQgPSB7fVxuICAgIGZvciBpdGVtIGluIGl0ZW1zXG4gICAgICB2aWV3ID0gQHN1YnZpZXcgXCJpdGVtVmlldzoje2l0ZW0uY2lkfVwiXG4gICAgICBpZiB2aWV3XG4gICAgICAgICMgVmlldyByZW1haW5zLlxuICAgICAgICByZW1haW5pbmdWaWV3c0J5Q2lkW2l0ZW0uY2lkXSA9IHZpZXdcblxuICAgICMgUmVtb3ZlIG9sZCB2aWV3cyBvZiBpdGVtcyBub3QgbG9uZ2VyIGluIHRoZSBsaXN0LlxuICAgIGZvciBjaWQgaW4gT2JqZWN0LmtleXMgQGdldEl0ZW1WaWV3cygpXG4gICAgICB1bmxlc3MgY2lkIG9mIHJlbWFpbmluZ1ZpZXdzQnlDaWRcbiAgICAgICAgIyBSZW1vdmUgdGhlIHZpZXcuXG4gICAgICAgIEByZW1vdmVTdWJ2aWV3IFwiaXRlbVZpZXc6I3tjaWR9XCJcblxuICAgICMgUmUtaW5zZXJ0IHJlbWFpbmluZyBpdGVtczsgcmVuZGVyIGFuZCBpbnNlcnQgbmV3IGl0ZW1zLlxuICAgIGZvciBpdGVtLCBpbmRleCBpbiBpdGVtc1xuICAgICAgIyBDaGVjayBpZiB2aWV3IHdhcyBhbHJlYWR5IGNyZWF0ZWQuXG4gICAgICB2aWV3ID0gQHN1YnZpZXcgXCJpdGVtVmlldzoje2l0ZW0uY2lkfVwiXG4gICAgICBpZiB2aWV3XG4gICAgICAgICMgUmUtaW5zZXJ0IHRoZSB2aWV3LlxuICAgICAgICBAaW5zZXJ0VmlldyBpdGVtLCB2aWV3LCBpbmRleCwgZmFsc2VcbiAgICAgIGVsc2VcbiAgICAgICAgIyBDcmVhdGUgYSBuZXcgdmlldywgcmVuZGVyIGFuZCBpbnNlcnQgaXQuXG4gICAgICAgIEBpbnNlcnRWaWV3IGl0ZW0sIEByZW5kZXJJdGVtKGl0ZW0pLCBpbmRleFxuXG4gICAgIyBJZiBubyB2aWV3IHdhcyBjcmVhdGVkLCB0cmlnZ2VyIGB2aXNpYmlsaXR5Q2hhbmdlYCBldmVudCBtYW51YWxseS5cbiAgICBAdHJpZ2dlciAndmlzaWJpbGl0eUNoYW5nZScsIEB2aXNpYmxlSXRlbXMgaWYgaXRlbXMubGVuZ3RoIGlzIDBcblxuICAjIEluc3RhbnRpYXRlIGFuZCByZW5kZXIgYW4gaXRlbSB1c2luZyB0aGUgYHZpZXdzQnlDaWRgIGhhc2ggYXMgYSBjYWNoZS5cbiAgcmVuZGVySXRlbTogKGl0ZW0pIC0+XG4gICAgIyBHZXQgdGhlIGV4aXN0aW5nIHZpZXcuXG4gICAgdmlldyA9IEBzdWJ2aWV3IFwiaXRlbVZpZXc6I3tpdGVtLmNpZH1cIlxuXG4gICAgIyBJbnN0YW50aWF0ZSBhIG5ldyB2aWV3IGlmIG5lY2Vzc2FyeS5cbiAgICB1bmxlc3Mgdmlld1xuICAgICAgdmlldyA9IEBpbml0SXRlbVZpZXcgaXRlbVxuICAgICAgIyBTYXZlIHRoZSB2aWV3IGluIHRoZSBzdWJ2aWV3cy5cbiAgICAgIEBzdWJ2aWV3IFwiaXRlbVZpZXc6I3tpdGVtLmNpZH1cIiwgdmlld1xuXG4gICAgIyBSZW5kZXIgaW4gYW55IGNhc2UuXG4gICAgdmlldy5yZW5kZXIoKVxuXG4gICAgdmlld1xuXG4gICMgUmV0dXJucyBhbiBpbnN0YW5jZSBvZiB0aGUgdmlldyBjbGFzcy4gT3ZlcnJpZGUgdGhpc1xuICAjIG1ldGhvZCB0byB1c2Ugc2V2ZXJhbCBpdGVtIHZpZXcgY29uc3RydWN0b3JzIGRlcGVuZGluZ1xuICAjIG9uIHRoZSBtb2RlbCB0eXBlIG9yIGRhdGEuXG4gIGluaXRJdGVtVmlldzogKG1vZGVsKSAtPlxuICAgIGlmIEBpdGVtVmlld1xuICAgICAgbmV3IEBpdGVtVmlldyB7YXV0b1JlbmRlcjogZmFsc2UsIG1vZGVsfVxuICAgIGVsc2VcbiAgICAgIHRocm93IG5ldyBFcnJvciAnVGhlIENvbGxlY3Rpb25WaWV3I2l0ZW1WaWV3IHByb3BlcnR5ICcgK1xuICAgICAgICAnbXVzdCBiZSBkZWZpbmVkIG9yIHRoZSBpbml0SXRlbVZpZXcoKSBtdXN0IGJlIG92ZXJyaWRkZW4uJ1xuXG4gICMgSW5zZXJ0cyBhIHZpZXcgaW50byB0aGUgbGlzdCBhdCB0aGUgcHJvcGVyIHBvc2l0aW9uLlxuICBpbnNlcnRWaWV3OiAoaXRlbSwgdmlldywgcG9zaXRpb24sIGVuYWJsZUFuaW1hdGlvbiA9IHRydWUpIC0+XG4gICAgZW5hYmxlQW5pbWF0aW9uID0gZmFsc2UgaWYgQGFuaW1hdGlvbkR1cmF0aW9uIGlzIDBcblxuICAgICMgR2V0IHRoZSBpbnNlcnRpb24gb2Zmc2V0IGlmIG5vdCBnaXZlbi5cbiAgICB1bmxlc3MgdHlwZW9mIHBvc2l0aW9uIGlzICdudW1iZXInXG4gICAgICBwb3NpdGlvbiA9IEBjb2xsZWN0aW9uLmluZGV4T2YgaXRlbVxuXG4gICAgIyBJcyB0aGUgaXRlbSBpbmNsdWRlZCBpbiB0aGUgZmlsdGVyP1xuICAgIGluY2x1ZGVkID0gaWYgdHlwZW9mIEBmaWx0ZXJlciBpcyAnZnVuY3Rpb24nXG4gICAgICBAZmlsdGVyZXIgaXRlbSwgcG9zaXRpb25cbiAgICBlbHNlXG4gICAgICB0cnVlXG5cbiAgICAjIEdldCB0aGUgdmlld+KAmXMgdG9wIGVsZW1lbnQuXG4gICAgZWxlbSA9IGlmICQgdGhlbiB2aWV3LiRlbCBlbHNlIHZpZXcuZWxcblxuICAgICMgU3RhcnQgYW5pbWF0aW9uLlxuICAgIGlmIGluY2x1ZGVkIGFuZCBlbmFibGVBbmltYXRpb25cbiAgICAgIHN0YXJ0QW5pbWF0aW9uIGVsZW0sIEB1c2VDc3NBbmltYXRpb24sIEBhbmltYXRpb25TdGFydENsYXNzXG5cbiAgICAjIEhpZGUgb3IgbWFyayB0aGUgdmlldyBpZiBpdOKAmXMgZmlsdGVyZWQuXG4gICAgQGZpbHRlckNhbGxiYWNrIHZpZXcsIGluY2x1ZGVkIGlmIEBmaWx0ZXJlclxuXG4gICAgbGVuZ3RoID0gQGNvbGxlY3Rpb24ubGVuZ3RoXG5cbiAgICAjIEluc2VydCB0aGUgdmlldyBpbnRvIHRoZSBsaXN0LlxuICAgIGxpc3QgPSBpZiAkIHRoZW4gQCRsaXN0IGVsc2UgQGxpc3RcblxuICAgIGlmIGluY2x1ZGVkXG4gICAgICBpbnNlcnRWaWV3IGxpc3QsIGVsZW0sIHBvc2l0aW9uLCBsZW5ndGgsIEBpdGVtU2VsZWN0b3JcblxuICAgICAgIyBUZWxsIHRoZSB2aWV3IHRoYXQgaXQgd2FzIGFkZGVkIHRvIGl0cyBwYXJlbnQuXG4gICAgICB2aWV3LnRyaWdnZXIgJ2FkZGVkVG9QYXJlbnQnXG5cbiAgICAjIFVwZGF0ZSB0aGUgbGlzdCBvZiB2aXNpYmxlIGl0ZW1zLCB0cmlnZ2VyIGEgYHZpc2liaWxpdHlDaGFuZ2VgIGV2ZW50LlxuICAgIEB1cGRhdGVWaXNpYmxlSXRlbXMgaXRlbSwgaW5jbHVkZWRcblxuICAgICMgRW5kIGFuaW1hdGlvbi5cbiAgICBpZiBpbmNsdWRlZCBhbmQgZW5hYmxlQW5pbWF0aW9uXG4gICAgICBpZiBAdXNlQ3NzQW5pbWF0aW9uXG4gICAgICAgICMgV2FpdCBmb3IgRE9NIHN0YXRlIGNoYW5nZS5cbiAgICAgICAgc2V0VGltZW91dCA9PiBhZGRDbGFzcyBlbGVtLCBAYW5pbWF0aW9uRW5kQ2xhc3NcbiAgICAgIGVsc2VcbiAgICAgICAgIyBGYWRlIHRoZSB2aWV3IGluIGlmIGl0IHdhcyBtYWRlIHRyYW5zcGFyZW50IGJlZm9yZS5cbiAgICAgICAgZW5kQW5pbWF0aW9uIGVsZW0sIEBhbmltYXRpb25EdXJhdGlvblxuXG4gICAgdmlld1xuXG4gICMgUmVtb3ZlIHRoZSB2aWV3IGZvciBhbiBpdGVtLlxuICByZW1vdmVWaWV3Rm9ySXRlbTogKGl0ZW0pIC0+XG4gICAgIyBSZW1vdmUgaXRlbSBmcm9tIHZpc2libGVJdGVtcyBsaXN0LCB0cmlnZ2VyIGEgYHZpc2liaWxpdHlDaGFuZ2VgIGV2ZW50LlxuICAgIEB1cGRhdGVWaXNpYmxlSXRlbXMgaXRlbSwgZmFsc2VcbiAgICBAcmVtb3ZlU3VidmlldyBcIml0ZW1WaWV3OiN7aXRlbS5jaWR9XCJcblxuICAjIExpc3Qgb2YgdmlzaWJsZSBpdGVtc1xuICAjIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICMgVXBkYXRlIHZpc2libGVJdGVtcyBsaXN0IGFuZCB0cmlnZ2VyIGEgYHZpc2liaWxpdHlDaGFuZ2VkYCBldmVudFxuICAjIGlmIGFuIGl0ZW0gY2hhbmdlZCBpdHMgdmlzaWJpbGl0eS5cbiAgdXBkYXRlVmlzaWJsZUl0ZW1zOiAoaXRlbSwgaW5jbHVkZWRJbkZpbHRlciwgdHJpZ2dlckV2ZW50ID0gdHJ1ZSkgLT5cbiAgICB2aXNpYmlsaXR5Q2hhbmdlZCA9IGZhbHNlXG5cbiAgICB2aXNpYmxlSXRlbXNJbmRleCA9IEB2aXNpYmxlSXRlbXMuaW5kZXhPZiBpdGVtXG4gICAgaW5jbHVkZWRJblZpc2libGVJdGVtcyA9IHZpc2libGVJdGVtc0luZGV4IGlzbnQgLTFcblxuICAgIGlmIGluY2x1ZGVkSW5GaWx0ZXIgYW5kIG5vdCBpbmNsdWRlZEluVmlzaWJsZUl0ZW1zXG4gICAgICAjIEFkZCBpdGVtIHRvIHRoZSB2aXNpYmxlIGl0ZW1zIGxpc3QuXG4gICAgICBAdmlzaWJsZUl0ZW1zLnB1c2ggaXRlbVxuICAgICAgdmlzaWJpbGl0eUNoYW5nZWQgPSB0cnVlXG4gICAgZWxzZSBpZiBub3QgaW5jbHVkZWRJbkZpbHRlciBhbmQgaW5jbHVkZWRJblZpc2libGVJdGVtc1xuICAgICAgIyBSZW1vdmUgaXRlbSBmcm9tIHRoZSB2aXNpYmxlIGl0ZW1zIGxpc3QuXG4gICAgICBAdmlzaWJsZUl0ZW1zLnNwbGljZSB2aXNpYmxlSXRlbXNJbmRleCwgMVxuICAgICAgdmlzaWJpbGl0eUNoYW5nZWQgPSB0cnVlXG5cbiAgICAjIFRyaWdnZXIgYSBgdmlzaWJpbGl0eUNoYW5nZWAgZXZlbnQgaWYgdGhlIHZpc2libGUgaXRlbXMgY2hhbmdlZC5cbiAgICBpZiB2aXNpYmlsaXR5Q2hhbmdlZCBhbmQgdHJpZ2dlckV2ZW50XG4gICAgICBAdHJpZ2dlciAndmlzaWJpbGl0eUNoYW5nZScsIEB2aXNpYmxlSXRlbXNcblxuICAgIHZpc2liaWxpdHlDaGFuZ2VkXG5cbiAgIyBEaXNwb3NhbFxuICAjIC0tLS0tLS0tXG5cbiAgZGlzcG9zZTogLT5cbiAgICByZXR1cm4gaWYgQGRpc3Bvc2VkXG5cbiAgICAjIFJlbW92ZSBqUXVlcnkgb2JqZWN0cywgaXRlbSB2aWV3IGNhY2hlIGFuZCB2aXNpYmxlIGl0ZW1zIGxpc3QuXG4gICAgZGVsZXRlIHRoaXNbcHJvcF0gZm9yIHByb3AgaW4gW1xuICAgICAgJyRsaXN0JywgJyRmYWxsYmFjaycsXG4gICAgICAnJGxvYWRpbmcnLCAndmlzaWJsZUl0ZW1zJ1xuICAgIF1cblxuICAgICMgU2VsZi1kaXNwb3NhbC5cbiAgICBzdXBlclxuIiwiJ3VzZSBzdHJpY3QnXG5cbl8gPSByZXF1aXJlICd1bmRlcnNjb3JlJ1xuQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZSdcblxuVmlldyA9IHJlcXVpcmUgJy4vdmlldydcbkV2ZW50QnJva2VyID0gcmVxdWlyZSAnLi4vbGliL2V2ZW50X2Jyb2tlcidcbnV0aWxzID0gcmVxdWlyZSAnLi4vbGliL3V0aWxzJ1xubWVkaWF0b3IgPSByZXF1aXJlICcuLi9tZWRpYXRvcidcblxuIyBTaG9ydGN1dCB0byBhY2Nlc3MgdGhlIERPTSBtYW5pcHVsYXRpb24gbGlicmFyeS5cbnskfSA9IEJhY2tib25lXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTGF5b3V0IGV4dGVuZHMgVmlld1xuICAjIEJpbmQgdG8gZG9jdW1lbnQgYm9keSBieSBkZWZhdWx0LlxuICBlbDogJ2JvZHknXG5cbiAgIyBPdmVycmlkZSBkZWZhdWx0IHZpZXcgYmVoYXZpb3IsIHdlIGRvbuKAmXQgd2FudCBkb2N1bWVudC5ib2R5IHRvIGJlIHJlbW92ZWQuXG4gIGtlZXBFbGVtZW50OiB0cnVlXG5cbiAgIyBUaGUgc2l0ZSB0aXRsZSB1c2VkIGluIHRoZSBkb2N1bWVudCB0aXRsZS5cbiAgIyBUaGlzIHNob3VsZCBiZSBzZXQgaW4geW91ciBhcHAtc3BlY2lmaWMgQXBwbGljYXRpb24gY2xhc3NcbiAgIyBhbmQgcGFzc2VkIGFzIGFuIG9wdGlvbi5cbiAgdGl0bGU6ICcnXG5cbiAgIyBSZWdpb25zXG4gICMgLS0tLS0tLVxuXG4gICMgQ29sbGVjdGlvbiBvZiByZWdpc3RlcmVkIHJlZ2lvbnM7IGFsbCB2aWV3IHJlZ2lvbnMgYXJlIGNvbGxlY3RlZCBoZXJlLlxuICBnbG9iYWxSZWdpb25zOiBudWxsXG5cbiAgbGlzdGVuOlxuICAgICdiZWZvcmVDb250cm9sbGVyRGlzcG9zZSBtZWRpYXRvcic6ICdzY3JvbGwnXG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zID0ge30pIC0+XG4gICAgQGdsb2JhbFJlZ2lvbnMgPSBbXVxuICAgIEB0aXRsZSA9IG9wdGlvbnMudGl0bGVcbiAgICBAcmVnaW9ucyA9IG9wdGlvbnMucmVnaW9ucyBpZiBvcHRpb25zLnJlZ2lvbnNcbiAgICBAc2V0dGluZ3MgPSBfLmRlZmF1bHRzIG9wdGlvbnMsXG4gICAgICB0aXRsZVRlbXBsYXRlOiAoZGF0YSkgLT5cbiAgICAgICAgc3QgPSBpZiBkYXRhLnN1YnRpdGxlIHRoZW4gXCIje2RhdGEuc3VidGl0bGV9IFxcdTIwMTMgXCIgZWxzZSAnJ1xuICAgICAgICBzdCArIGRhdGEudGl0bGVcbiAgICAgIG9wZW5FeHRlcm5hbFRvQmxhbms6IGZhbHNlXG4gICAgICByb3V0ZUxpbmtzOiAnYSwgLmdvLXRvJ1xuICAgICAgc2tpcFJvdXRpbmc6ICcubm9zY3JpcHQnXG4gICAgICAjIFBlciBkZWZhdWx0LCBqdW1wIHRvIHRoZSB0b3Agb2YgdGhlIHBhZ2UuXG4gICAgICBzY3JvbGxUbzogWzAsIDBdXG5cbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyICdyZWdpb246c2hvdycsIEBzaG93UmVnaW9uLCB0aGlzXG4gICAgbWVkaWF0b3Iuc2V0SGFuZGxlciAncmVnaW9uOnJlZ2lzdGVyJywgQHJlZ2lzdGVyUmVnaW9uSGFuZGxlciwgdGhpc1xuICAgIG1lZGlhdG9yLnNldEhhbmRsZXIgJ3JlZ2lvbjp1bnJlZ2lzdGVyJywgQHVucmVnaXN0ZXJSZWdpb25IYW5kbGVyLCB0aGlzXG4gICAgbWVkaWF0b3Iuc2V0SGFuZGxlciAncmVnaW9uOmZpbmQnLCBAcmVnaW9uQnlOYW1lLCB0aGlzXG4gICAgbWVkaWF0b3Iuc2V0SGFuZGxlciAnYWRqdXN0VGl0bGUnLCBAYWRqdXN0VGl0bGUsIHRoaXNcblxuICAgIHN1cGVyXG5cbiAgICAjIFNldCB0aGUgYXBwIGxpbmsgcm91dGluZy5cbiAgICBAc3RhcnRMaW5rUm91dGluZygpIGlmIEBzZXR0aW5ncy5yb3V0ZUxpbmtzXG5cbiAgIyBDb250cm9sbGVyIHN0YXJ0dXAgYW5kIGRpc3Bvc2FsXG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICMgSGFuZGxlciBmb3IgdGhlIGdsb2JhbCBiZWZvcmVDb250cm9sbGVyRGlzcG9zZSBldmVudC5cbiAgc2Nyb2xsOiAtPlxuICAgICMgUmVzZXQgdGhlIHNjcm9sbCBwb3NpdGlvbi5cbiAgICB0byA9IEBzZXR0aW5ncy5zY3JvbGxUb1xuICAgIGlmIHRvIGFuZCB0eXBlb2YgdG8gaXMgJ29iamVjdCdcbiAgICAgIFt4LCB5XSA9IHRvXG4gICAgICB3aW5kb3cuc2Nyb2xsVG8geCwgeVxuXG4gICMgSGFuZGxlciBmb3IgdGhlIGdsb2JhbCBkaXNwYXRjaGVyOmRpc3BhdGNoIGV2ZW50LlxuICAjIENoYW5nZSB0aGUgZG9jdW1lbnQgdGl0bGUgdG8gbWF0Y2ggdGhlIG5ldyBjb250cm9sbGVyLlxuICAjIEdldCB0aGUgdGl0bGUgZnJvbSB0aGUgdGl0bGUgcHJvcGVydHkgb2YgdGhlIGN1cnJlbnQgY29udHJvbGxlci5cbiAgYWRqdXN0VGl0bGU6IChzdWJ0aXRsZSA9ICcnKSAtPlxuICAgIHRpdGxlID0gQHNldHRpbmdzLnRpdGxlVGVtcGxhdGUge0B0aXRsZSwgc3VidGl0bGV9XG4gICAgZG9jdW1lbnQudGl0bGUgPSB0aXRsZVxuICAgIEBwdWJsaXNoRXZlbnQgJ2FkanVzdFRpdGxlJywgc3VidGl0bGUsIHRpdGxlXG4gICAgdGl0bGVcblxuICAjIEF1dG9tYXRpYyByb3V0aW5nIG9mIGludGVybmFsIGxpbmtzXG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBzdGFydExpbmtSb3V0aW5nOiAtPlxuICAgIHJvdXRlID0gQHNldHRpbmdzLnJvdXRlTGlua3NcbiAgICBAZGVsZWdhdGUgJ2NsaWNrJywgcm91dGUsIEBvcGVuTGluayBpZiByb3V0ZVxuXG4gIHN0b3BMaW5rUm91dGluZzogLT5cbiAgICByb3V0ZSA9IEBzZXR0aW5ncy5yb3V0ZUxpbmtzXG4gICAgQHVuZGVsZWdhdGUgJ2NsaWNrJywgcm91dGUgaWYgcm91dGVcblxuICBpc0V4dGVybmFsTGluazogKGxpbmspIC0+XG4gICAgcmV0dXJuIGZhbHNlIHVubGVzcyB1dGlscy5tYXRjaGVzU2VsZWN0b3IgbGluaywgJ2EsIGFyZWEnXG4gICAgcmV0dXJuIHRydWUgaWYgbGluay5oYXNBdHRyaWJ1dGUgJ2Rvd25sb2FkJ1xuXG4gICAgIyBJRSA5LTExIHJlc29sdmUgaHJlZiBidXQgZG8gbm90IHBvcHVsYXRlIHByb3RvY29sLCBob3N0IGV0Yy5cbiAgICAjIFJlYXNzaWduaW5nIGhyZWYgaGVscHMuIFNlZSAjODc4IGlzc3VlIGZvciBkZXRhaWxzLlxuICAgIGxpbmsuaHJlZiArPSAnJyB1bmxlc3MgbGluay5ob3N0XG5cbiAgICB7cHJvdG9jb2wsIGhvc3R9ID0gbG9jYXRpb25cbiAgICB7dGFyZ2V0fSA9IGxpbmtcblxuICAgIHRhcmdldCBpcyAnX2JsYW5rJyBvclxuICAgIGxpbmsucmVsIGlzICdleHRlcm5hbCcgb3JcbiAgICBsaW5rLnByb3RvY29sIGlzbnQgcHJvdG9jb2wgb3JcbiAgICBsaW5rLmhvc3QgaXNudCBob3N0IG9yXG4gICAgKHRhcmdldCBpcyAnX3BhcmVudCcgYW5kIHBhcmVudCBpc250IHNlbGYpIG9yXG4gICAgKHRhcmdldCBpcyAnX3RvcCcgYW5kIHRvcCBpc250IHNlbGYpXG5cbiAgIyBIYW5kbGUgYWxsIGNsaWNrcyBvbiBBIGVsZW1lbnRzIGFuZCB0cnkgdG8gcm91dGUgdGhlbSBpbnRlcm5hbGx5LlxuICBvcGVuTGluazogKGV2ZW50KSA9PlxuICAgIHJldHVybiBpZiB1dGlscy5tb2RpZmllcktleVByZXNzZWQgZXZlbnRcblxuICAgIGVsID0gaWYgJCB0aGVuIGV2ZW50LmN1cnJlbnRUYXJnZXQgZWxzZSBldmVudC5kZWxlZ2F0ZVRhcmdldFxuXG4gICAgIyBHZXQgdGhlIGhyZWYgYW5kIHBlcmZvcm0gY2hlY2tzIG9uIGl0LlxuICAgIGhyZWYgPSBlbC5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSBvciBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaHJlZicpXG5cbiAgICAjIEJhc2ljIGhyZWYgY2hlY2tzLlxuICAgICMgVGVjaG5pY2FsbHkgYW4gZW1wdHkgc3RyaW5nIGlzIGEgdmFsaWQgcmVsYXRpdmUgVVJMXG4gICAgIyBidXQgaXQgZG9lc27igJl0IG1ha2Ugc2Vuc2UgdG8gcm91dGUgaXQuXG4gICAgcmV0dXJuIGlmIG5vdCBocmVmIG9yXG4gICAgICAjIEV4Y2x1ZGUgZnJhZ21lbnQgbGlua3MuXG4gICAgICBocmVmWzBdIGlzICcjJ1xuXG4gICAgIyBBcHBseSBza2lwUm91dGluZyBvcHRpb24uXG4gICAge3NraXBSb3V0aW5nfSA9IEBzZXR0aW5nc1xuICAgIHN3aXRjaCB0eXBlb2Ygc2tpcFJvdXRpbmdcbiAgICAgIHdoZW4gJ2Z1bmN0aW9uJ1xuICAgICAgICByZXR1cm4gdW5sZXNzIHNraXBSb3V0aW5nIGhyZWYsIGVsXG4gICAgICB3aGVuICdzdHJpbmcnXG4gICAgICAgIHJldHVybiBpZiB1dGlscy5tYXRjaGVzU2VsZWN0b3IgZWwsIHNraXBSb3V0aW5nXG5cbiAgICAjIEhhbmRsZSBleHRlcm5hbCBsaW5rcy5cbiAgICBpZiBAaXNFeHRlcm5hbExpbmsgZWxcbiAgICAgIGlmIEBzZXR0aW5ncy5vcGVuRXh0ZXJuYWxUb0JsYW5rXG4gICAgICAgICMgT3BlbiBleHRlcm5hbCBsaW5rcyBub3JtYWxseSBpbiBhIG5ldyB0YWIuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgQG9wZW5XaW5kb3cgaHJlZlxuICAgICAgcmV0dXJuXG5cbiAgICAjIFBhc3MgdG8gdGhlIHJvdXRlciwgdHJ5IHRvIHJvdXRlIHRoZSBwYXRoIGludGVybmFsbHkuXG4gICAgdXRpbHMucmVkaXJlY3RUbyB1cmw6IGhyZWZcblxuICAgICMgUHJldmVudCBkZWZhdWx0IGhhbmRsaW5nIGlmIHRoZSBVUkwgY291bGQgYmUgcm91dGVkLlxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcblxuICAjIEhhbmRsZSBhbGwgYnJvd3NpbmcgY29udGV4dCByZXNvdXJjZXNcbiAgb3BlbldpbmRvdzogKGhyZWYpIC0+XG4gICAgd2luZG93Lm9wZW4gaHJlZlxuXG4gICMgUmVnaW9uIG1hbmFnZW1lbnRcbiAgIyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gICMgSGFuZGxlciBmb3IgYCFyZWdpb246cmVnaXN0ZXJgLlxuICAjIFJlZ2lzdGVyIGEgc2luZ2xlIHZpZXcgcmVnaW9uIG9yIGFsbCByZWdpb25zIGV4cG9zZWQuXG4gIHJlZ2lzdGVyUmVnaW9uSGFuZGxlcjogKGluc3RhbmNlLCBuYW1lLCBzZWxlY3RvcikgLT5cbiAgICBpZiBuYW1lP1xuICAgICAgQHJlZ2lzdGVyR2xvYmFsUmVnaW9uIGluc3RhbmNlLCBuYW1lLCBzZWxlY3RvclxuICAgIGVsc2VcbiAgICAgIEByZWdpc3Rlckdsb2JhbFJlZ2lvbnMgaW5zdGFuY2VcblxuICAjIFJlZ2lzdGVyaW5nIG9uZSByZWdpb24gYm91bmQgdG8gYSB2aWV3LlxuICByZWdpc3Rlckdsb2JhbFJlZ2lvbjogKGluc3RhbmNlLCBuYW1lLCBzZWxlY3RvcikgLT5cbiAgICAjIFJlbW92ZSB0aGUgcmVnaW9uIGlmIHRoZXJlIHdhcyBhbHJlYWR5IG9uZSByZWdpc3RlcmVkIHBlcmhhcHMgYnlcbiAgICAjIGEgYmFzZSBjbGFzcy5cbiAgICBAdW5yZWdpc3Rlckdsb2JhbFJlZ2lvbiBpbnN0YW5jZSwgbmFtZVxuXG4gICAgIyBQbGFjZSB0aGlzIHJlZ2lvbiByZWdpc3RyYXRpb24gaW50byB0aGUgcmVnaW9ucyBhcnJheS5cbiAgICBAZ2xvYmFsUmVnaW9ucy51bnNoaWZ0IHtpbnN0YW5jZSwgbmFtZSwgc2VsZWN0b3J9XG5cbiAgIyBUcmlnZ2VyZWQgYnkgdmlldzsgcGFzc2VkIGluIHRoZSByZWdpb25zIGhhc2guXG4gICMgU2ltcGx5IHJlZ2lzdGVyIGFsbCByZWdpb25zIGV4cG9zZWQgYnkgaXQuXG4gIHJlZ2lzdGVyR2xvYmFsUmVnaW9uczogKGluc3RhbmNlKSAtPlxuICAgICMgUmVnaW9ucyBjYW4gYmUgYmUgZXh0ZW5kZWQgYnkgc3ViY2xhc3Nlcywgc28gd2UgbmVlZCB0byBjaGVjayB0aGVcbiAgICAjIHdob2xlIHByb3RvdHlwZSBjaGFpbiBmb3IgbWF0Y2hpbmcgcmVnaW9ucy4gUmVnaW9ucyByZWdpc3RlcmVkIGJ5IHRoZVxuICAgICMgbW9yZS1kZXJpdmVkIGNsYXNzIG92ZXJ3cml0ZXMgdGhlIHJlZ2lvbiByZWdpc3RlcmVkIGJ5IHRoZSBsZXNzLWRlcml2ZWRcbiAgICAjIGNsYXNzLlxuICAgIGZvciB2ZXJzaW9uIGluIHV0aWxzLmdldEFsbFByb3BlcnR5VmVyc2lvbnMgaW5zdGFuY2UsICdyZWdpb25zJ1xuICAgICAgZm9yIG5hbWUsIHNlbGVjdG9yIG9mIHZlcnNpb25cbiAgICAgICAgQHJlZ2lzdGVyR2xvYmFsUmVnaW9uIGluc3RhbmNlLCBuYW1lLCBzZWxlY3RvclxuICAgICMgUmV0dXJuIG5vdGhpbmcuXG4gICAgcmV0dXJuXG5cbiAgIyBIYW5kbGVyIGZvciBgIXJlZ2lvbjp1bnJlZ2lzdGVyYC5cbiAgIyBVbnJlZ2lzdGVycyBzaW5nbGUgbmFtZWQgcmVnaW9uIG9yIGFsbCB2aWV3IHJlZ2lvbnMuXG4gIHVucmVnaXN0ZXJSZWdpb25IYW5kbGVyOiAoaW5zdGFuY2UsIG5hbWUpIC0+XG4gICAgaWYgbmFtZT9cbiAgICAgIEB1bnJlZ2lzdGVyR2xvYmFsUmVnaW9uIGluc3RhbmNlLCBuYW1lXG4gICAgZWxzZVxuICAgICAgQHVucmVnaXN0ZXJHbG9iYWxSZWdpb25zIGluc3RhbmNlXG5cbiAgIyBVbnJlZ2lzdGVycyBhIHNwZWNpZmljIG5hbWVkIHJlZ2lvbiBmcm9tIGEgdmlldy5cbiAgdW5yZWdpc3Rlckdsb2JhbFJlZ2lvbjogKGluc3RhbmNlLCBuYW1lKSAtPlxuICAgIGNpZCA9IGluc3RhbmNlLmNpZFxuICAgIEBnbG9iYWxSZWdpb25zID0gKHJlZ2lvbiBmb3IgcmVnaW9uIGluIEBnbG9iYWxSZWdpb25zIHdoZW4gKFxuICAgICAgcmVnaW9uLmluc3RhbmNlLmNpZCBpc250IGNpZCBvciByZWdpb24ubmFtZSBpc250IG5hbWVcbiAgICApKVxuXG4gICMgV2hlbiB2aWV3cyBhcmUgZGlzcG9zZWQ7IHJlbW92ZSBhbGwgdGhlaXIgcmVnaXN0ZXJlZCByZWdpb25zLlxuICB1bnJlZ2lzdGVyR2xvYmFsUmVnaW9uczogKGluc3RhbmNlKSAtPlxuICAgIEBnbG9iYWxSZWdpb25zID0gKHJlZ2lvbiBmb3IgcmVnaW9uIGluIEBnbG9iYWxSZWdpb25zIHdoZW4gKFxuICAgICAgcmVnaW9uLmluc3RhbmNlLmNpZCBpc250IGluc3RhbmNlLmNpZFxuICAgICkpXG5cbiAgIyBSZXR1cm5zIHRoZSByZWdpb24gYnkgaXRzIG5hbWUsIGlmIGZvdW5kLlxuICByZWdpb25CeU5hbWU6IChuYW1lKSAtPlxuICAgIGZvciByZWcgaW4gQGdsb2JhbFJlZ2lvbnMgd2hlbiByZWcubmFtZSBpcyBuYW1lIGFuZCBub3QgcmVnLmluc3RhbmNlLnN0YWxlXG4gICAgICByZXR1cm4gcmVnXG5cbiAgIyBXaGVuIHZpZXdzIGFyZSBpbnN0YW50aWF0ZWQgYW5kIHJlcXVlc3QgZm9yIGEgcmVnaW9uIGFzc2lnbm1lbnQ7XG4gICMgYXR0ZW1wdCB0byBmdWxmaWxsIGl0LlxuICBzaG93UmVnaW9uOiAobmFtZSwgaW5zdGFuY2UpIC0+XG4gICAgIyBGaW5kIGFuIGFwcHJvcHJpYXRlIHJlZ2lvbi5cbiAgICByZWdpb24gPSBAcmVnaW9uQnlOYW1lIG5hbWVcblxuICAgICMgQXNzZXJ0IHRoYXQgd2UgZ290IGEgdmFsaWQgcmVnaW9uLlxuICAgIHRocm93IG5ldyBFcnJvciBcIk5vIHJlZ2lvbiByZWdpc3RlcmVkIHVuZGVyICN7bmFtZX1cIiB1bmxlc3MgcmVnaW9uXG5cbiAgICAjIEFwcGx5IHRoZSByZWdpb24gc2VsZWN0b3IuXG4gICAgaW5zdGFuY2UuY29udGFpbmVyID0gaWYgcmVnaW9uLnNlbGVjdG9yIGlzICcnXG4gICAgICBpZiAkXG4gICAgICAgIHJlZ2lvbi5pbnN0YW5jZS4kZWxcbiAgICAgIGVsc2VcbiAgICAgICAgcmVnaW9uLmluc3RhbmNlLmVsXG4gICAgZWxzZVxuICAgICAgaWYgcmVnaW9uLmluc3RhbmNlLm5vV3JhcFxuICAgICAgICByZWdpb24uaW5zdGFuY2UuY29udGFpbmVyLmZpbmQgcmVnaW9uLnNlbGVjdG9yXG4gICAgICBlbHNlXG4gICAgICAgIHJlZ2lvbi5pbnN0YW5jZS5maW5kIHJlZ2lvbi5zZWxlY3RvclxuXG4gICMgRGlzcG9zYWxcbiAgIyAtLS0tLS0tLVxuXG4gIGRpc3Bvc2U6IC0+XG4gICAgcmV0dXJuIGlmIEBkaXNwb3NlZFxuXG4gICAgIyBTdG9wIHJvdXRpbmcgbGlua3MuXG4gICAgQHN0b3BMaW5rUm91dGluZygpXG5cbiAgICAjIFJlbW92ZSBhbGwgcmVnaW9ucyBhbmQgZG9jdW1lbnQgdGl0bGUgc2V0dGluZy5cbiAgICBkZWxldGUgdGhpc1twcm9wXSBmb3IgcHJvcCBpbiBbJ2dsb2JhbFJlZ2lvbnMnLCAndGl0bGUnLCAncm91dGUnXVxuXG4gICAgbWVkaWF0b3IucmVtb3ZlSGFuZGxlcnMgdGhpc1xuXG4gICAgc3VwZXJcbiIsIid1c2Ugc3RyaWN0J1xuXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZSdcbkJhY2tib25lID0gcmVxdWlyZSAnYmFja2JvbmUnXG5cbkV2ZW50QnJva2VyID0gcmVxdWlyZSAnLi4vbGliL2V2ZW50X2Jyb2tlcidcbnV0aWxzID0gcmVxdWlyZSAnLi4vbGliL3V0aWxzJ1xubWVkaWF0b3IgPSByZXF1aXJlICcuLi9tZWRpYXRvcidcblxuIyBTaG9ydGN1dCB0byBhY2Nlc3MgdGhlIERPTSBtYW5pcHVsYXRpb24gbGlicmFyeS5cbnskfSA9IEJhY2tib25lXG5cbnNldEhUTUwgPSBkbyAtPlxuICBpZiAkXG4gICAgKHZpZXcsIGh0bWwpIC0+XG4gICAgICB2aWV3LiRlbC5odG1sIGh0bWxcbiAgICAgIGh0bWxcbiAgZWxzZVxuICAgICh2aWV3LCBodG1sKSAtPlxuICAgICAgdmlldy5lbC5pbm5lckhUTUwgPSBodG1sXG5cbmF0dGFjaCA9IGRvIC0+XG4gIGlmICRcbiAgICAodmlldykgLT5cbiAgICAgIGFjdHVhbCA9ICQgdmlldy5jb250YWluZXJcbiAgICAgIGlmIHR5cGVvZiB2aWV3LmNvbnRhaW5lck1ldGhvZCBpcyAnZnVuY3Rpb24nXG4gICAgICAgIHZpZXcuY29udGFpbmVyTWV0aG9kIGFjdHVhbCwgdmlldy5lbFxuICAgICAgZWxzZVxuICAgICAgICBhY3R1YWxbdmlldy5jb250YWluZXJNZXRob2RdIHZpZXcuZWxcbiAgZWxzZVxuICAgICh2aWV3KSAtPlxuICAgICAgYWN0dWFsID0gaWYgdHlwZW9mIHZpZXcuY29udGFpbmVyIGlzICdzdHJpbmcnXG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Igdmlldy5jb250YWluZXJcbiAgICAgIGVsc2VcbiAgICAgICAgdmlldy5jb250YWluZXJcblxuICAgICAgaWYgdHlwZW9mIHZpZXcuY29udGFpbmVyTWV0aG9kIGlzICdmdW5jdGlvbidcbiAgICAgICAgdmlldy5jb250YWluZXJNZXRob2QgYWN0dWFsLCB2aWV3LmVsXG4gICAgICBlbHNlXG4gICAgICAgIGFjdHVhbFt2aWV3LmNvbnRhaW5lck1ldGhvZF0gdmlldy5lbFxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5OYXRpdmVWaWV3IG9yIEJhY2tib25lLlZpZXdcbiAgIyBNaXhpbiBhbiBFdmVudEJyb2tlci5cbiAgXy5leHRlbmQgQHByb3RvdHlwZSwgRXZlbnRCcm9rZXJcblxuICAjIEF1dG9tYXRpYyByZW5kZXJpbmdcbiAgIyAtLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgIyBGbGFnIHdoZXRoZXIgdG8gcmVuZGVyIHRoZSB2aWV3IGF1dG9tYXRpY2FsbHkgb24gaW5pdGlhbGl6YXRpb24uXG4gICMgQXMgYW4gYWx0ZXJuYXRpdmUgeW91IG1pZ2h0IHBhc3MgYSBgcmVuZGVyYCBvcHRpb24gdG8gdGhlIGNvbnN0cnVjdG9yLlxuICBhdXRvUmVuZGVyOiBmYWxzZVxuXG4gICMgRmxhZyB3aGV0aGVyIHRvIGF0dGFjaCB0aGUgdmlldyBhdXRvbWF0aWNhbGx5IG9uIHJlbmRlci5cbiAgYXV0b0F0dGFjaDogdHJ1ZVxuXG4gICMgQXV0b21hdGljIGluc2VydGluZyBpbnRvIERPTVxuICAjIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAjIFZpZXcgY29udGFpbmVyIGVsZW1lbnQuXG4gICMgU2V0IHRoaXMgcHJvcGVydHkgaW4gYSBkZXJpdmVkIGNsYXNzIHRvIHNwZWNpZnkgdGhlIGNvbnRhaW5lciBlbGVtZW50LlxuICAjIE5vcm1hbGx5IHRoaXMgaXMgYSBzZWxlY3RvciBzdHJpbmcgYnV0IGl0IG1pZ2h0IGFsc28gYmUgYW4gZWxlbWVudCBvclxuICAjIGpRdWVyeSBvYmplY3QuXG4gICMgVGhlIHZpZXcgaXMgYXV0b21hdGljYWxseSBpbnNlcnRlZCBpbnRvIHRoZSBjb250YWluZXIgd2hlbiBpdOKAmXMgcmVuZGVyZWQuXG4gICMgQXMgYW4gYWx0ZXJuYXRpdmUgeW91IG1pZ2h0IHBhc3MgYSBgY29udGFpbmVyYCBvcHRpb24gdG8gdGhlIGNvbnN0cnVjdG9yLlxuICBjb250YWluZXI6IG51bGxcblxuICAjIE1ldGhvZCB3aGljaCBpcyB1c2VkIGZvciBhZGRpbmcgdGhlIHZpZXcgdG8gdGhlIERPTVxuICAjIExpa2UgalF1ZXJ54oCZcyBgaHRtbGAsIGBwcmVwZW5kYCwgYGFwcGVuZGAsIGBhZnRlcmAsIGBiZWZvcmVgIGV0Yy5cbiAgY29udGFpbmVyTWV0aG9kOiBpZiAkIHRoZW4gJ2FwcGVuZCcgZWxzZSAnYXBwZW5kQ2hpbGQnXG5cbiAgIyBSZWdpb25zXG4gICMgLS0tLS0tLVxuXG4gICMgUmVnaW9uIHJlZ2lzdHJhdGlvbjsgcmVnaW9ucyBhcmUgaW4gZXNzZW5jZSBuYW1lZCBzZWxlY3RvcnMgdGhhdCBhaW1cbiAgIyB0byBkZWNvdXBsZSB0aGUgdmlldyBmcm9tIGl0cyBwYXJlbnQuXG4gICNcbiAgIyBUaGlzIGZ1bmN0aW9ucyBjbG9zZSB0byB0aGUgZGVjbGFyYXRpdmUgZXZlbnRzIGhhc2g7IHVzZSBhcyBmb2xsb3dzOlxuICAjIHJlZ2lvbnM6XG4gICMgICAncmVnaW9uMSc6ICcuY2xhc3MnXG4gICMgICAncmVnaW9uMic6ICcjaWQnXG4gIHJlZ2lvbnM6IG51bGxcblxuICAjIFJlZ2lvbiBhcHBsaWNhdGlvbiBpcyB0aGUgcmV2ZXJzZTsgeW91J3JlIHNwZWNpZnlpbmcgdGhhdCB0aGlzIHZpZXdcbiAgIyB3aWxsIGJlIGluc2VydGVkIGludG8gdGhlIERPTSBhdCB0aGUgbmFtZWQgcmVnaW9uLiBFcnJvciB0aHJvd24gaWZcbiAgIyB0aGUgcmVnaW9uIGlzIHVucmVnaXN0ZXJlZCBhdCB0aGUgdGltZSBvZiBpbml0aWFsaXphdGlvbi5cbiAgIyBTZXQgdGhlIHJlZ2lvbiBuYW1lIG9uIHlvdXIgZGVyaXZlZCBjbGFzcyBvciBwYXNzIGl0IGludG8gdGhlXG4gICMgY29uc3RydWN0b3IgaW4gY29udHJvbGxlciBhY3Rpb24uXG4gIHJlZ2lvbjogbnVsbFxuXG4gICMgQSB2aWV3IGlzIGBzdGFsZWAgd2hlbiBpdCBoYXMgYmVlbiBwcmV2aW91c2x5IGNvbXBvc2VkIGJ5IHRoZSBsYXN0XG4gICMgcm91dGUgYnV0IGhhcyBub3QgeWV0IGJlZW4gY29tcG9zZWQgYnkgdGhlIGN1cnJlbnQgcm91dGUuXG4gIHN0YWxlOiBmYWxzZVxuXG4gICMgRmxhZyB3aGV0aGVyIHRvIHdyYXAgYSB2aWV3IHdpdGggdGhlIGB0YWdOYW1lYCBlbGVtZW50IHdoZW5cbiAgIyByZW5kZXJpbmcgaW50byBhIHJlZ2lvbi5cbiAgbm9XcmFwOiBmYWxzZVxuXG4gICMgU3BlY2lmaWVzIGlmIGN1cnJlbnQgZWxlbWVudCBzaG91bGQgYmUga2VwdCBpbiBET00gYWZ0ZXIgZGlzcG9zYWwuXG4gIGtlZXBFbGVtZW50OiBmYWxzZVxuXG4gICMgU3Vidmlld3NcbiAgIyAtLS0tLS0tLVxuXG4gICMgTGlzdCBvZiBzdWJ2aWV3cy5cbiAgc3Vidmlld3M6IG51bGxcbiAgc3Vidmlld3NCeU5hbWU6IG51bGxcblxuICAjIEluaXRpYWxpemF0aW9uXG4gICMgLS0tLS0tLS0tLS0tLS1cblxuICAjIExpc3Qgb2Ygb3B0aW9ucyB0aGF0IHdpbGwgYmUgcGlja2VkIGZyb20gY29uc3RydWN0b3IuXG4gICMgRWFzeSB0byBleHRlbmQ6IGBvcHRpb25OYW1lczogVmlldzo6b3B0aW9uTmFtZXMuY29uY2F0IFsndGVtcGxhdGUnXWBcbiAgb3B0aW9uTmFtZXM6IFtcbiAgICAnYXV0b0F0dGFjaCcsICdhdXRvUmVuZGVyJyxcbiAgICAnY29udGFpbmVyJywgJ2NvbnRhaW5lck1ldGhvZCcsXG4gICAgJ3JlZ2lvbicsICdyZWdpb25zJ1xuICAgICdub1dyYXAnXG4gIF1cblxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICAjIENvcHkgc29tZSBvcHRpb25zIHRvIGluc3RhbmNlIHByb3BlcnRpZXMuXG4gICAgZm9yIGtleSBpbiBPYmplY3Qua2V5cyBvcHRpb25zXG4gICAgICBpZiBrZXkgaW4gQG9wdGlvbk5hbWVzXG4gICAgICAgIEBba2V5XSA9IG9wdGlvbnNba2V5XVxuXG4gICAgIyBXcmFwIGByZW5kZXJgIHNvIGBhdHRhY2hgIGlzIGNhbGxlZCBhZnRlcndhcmRzLlxuICAgICMgRW5jbG9zZSB0aGUgb3JpZ2luYWwgZnVuY3Rpb24uXG4gICAgcmVuZGVyID0gQHJlbmRlclxuICAgICMgQ3JlYXRlIHRoZSB3cmFwcGVyIG1ldGhvZC5cbiAgICBAcmVuZGVyID0gLT5cbiAgICAgICMgU3RvcCBpZiB0aGUgaW5zdGFuY2Ugd2FzIGFscmVhZHkgZGlzcG9zZWQuXG4gICAgICByZXR1cm4gZmFsc2UgaWYgQGRpc3Bvc2VkXG4gICAgICAjIENhbGwgdGhlIG9yaWdpbmFsIG1ldGhvZC5cbiAgICAgIHJldHVyblZhbHVlID0gcmVuZGVyLmFwcGx5IHRoaXMsIGFyZ3VtZW50c1xuICAgICAgIyBBdHRhY2ggdG8gRE9NLlxuICAgICAgQGF0dGFjaCBhcmd1bWVudHMuLi4gaWYgQGF1dG9BdHRhY2hcbiAgICAgICMgUmV0dXJuIHZhbHVlIGZyb20gb3JpZ2luIG1ldGhvZC5cbiAgICAgIHJldHVyblZhbHVlXG5cbiAgICAjIEluaXRpYWxpemUgc3Vidmlld3MgY29sbGVjdGlvbnMuXG4gICAgQHN1YnZpZXdzID0gW11cbiAgICBAc3Vidmlld3NCeU5hbWUgPSB7fVxuXG4gICAgaWYgQG5vV3JhcFxuICAgICAgaWYgQHJlZ2lvblxuICAgICAgICByZWdpb24gPSBtZWRpYXRvci5leGVjdXRlICdyZWdpb246ZmluZCcsIEByZWdpb25cbiAgICAgICAgIyBTZXQgdGhlIGB0aGlzLmVsYCB0byBiZSB0aGUgY2xvc2VzdCByZWxldmFudCBjb250YWluZXIuXG4gICAgICAgIGlmIHJlZ2lvbj9cbiAgICAgICAgICBAZWwgPVxuICAgICAgICAgICAgaWYgcmVnaW9uLmluc3RhbmNlLmNvbnRhaW5lcj9cbiAgICAgICAgICAgICAgaWYgcmVnaW9uLmluc3RhbmNlLnJlZ2lvbj9cbiAgICAgICAgICAgICAgICAkKHJlZ2lvbi5pbnN0YW5jZS5jb250YWluZXIpLmZpbmQgcmVnaW9uLnNlbGVjdG9yXG4gICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICByZWdpb24uaW5zdGFuY2UuY29udGFpbmVyXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIHJlZ2lvbi5pbnN0YW5jZS4kIHJlZ2lvbi5zZWxlY3RvclxuXG4gICAgICBAZWwgPSBAY29udGFpbmVyIGlmIEBjb250YWluZXJcblxuICAgICMgQ2FsbCBCYWNrYm9uZeKAmXMgY29uc3RydWN0b3IuXG4gICAgc3VwZXJcblxuICAgICMgU2V0IHVwIGRlY2xhcmF0aXZlIGJpbmRpbmdzIGFmdGVyIGBpbml0aWFsaXplYCBoYXMgYmVlbiBjYWxsZWRcbiAgICAjIHNvIGluaXRpYWxpemUgbWF5IHNldCBtb2RlbC9jb2xsZWN0aW9uIGFuZCBjcmVhdGUgb3IgYmluZCBtZXRob2RzLlxuICAgIEBkZWxlZ2F0ZUxpc3RlbmVycygpXG5cbiAgICAjIExpc3RlbiBmb3IgZGlzcG9zYWwgb2YgdGhlIG1vZGVsIG9yIGNvbGxlY3Rpb24uXG4gICAgIyBJZiB0aGUgbW9kZWwgaXMgZGlzcG9zZWQsIGF1dG9tYXRpY2FsbHkgZGlzcG9zZSB0aGUgYXNzb2NpYXRlZCB2aWV3LlxuICAgIEBsaXN0ZW5UbyBAbW9kZWwsICdkaXNwb3NlJywgQGRpc3Bvc2UgaWYgQG1vZGVsXG4gICAgaWYgQGNvbGxlY3Rpb25cbiAgICAgIEBsaXN0ZW5UbyBAY29sbGVjdGlvbiwgJ2Rpc3Bvc2UnLCAoc3ViamVjdCkgPT5cbiAgICAgICAgQGRpc3Bvc2UoKSBpZiBub3Qgc3ViamVjdCBvciBzdWJqZWN0IGlzIEBjb2xsZWN0aW9uXG5cbiAgICAjIFJlZ2lzdGVyIGFsbCBleHBvc2VkIHJlZ2lvbnMuXG4gICAgbWVkaWF0b3IuZXhlY3V0ZSAncmVnaW9uOnJlZ2lzdGVyJywgdGhpcyBpZiBAcmVnaW9ucz9cblxuICAgICMgUmVuZGVyIGF1dG9tYXRpY2FsbHkgaWYgc2V0IGJ5IG9wdGlvbnMgb3IgaW5zdGFuY2UgcHJvcGVydHkuXG4gICAgQHJlbmRlcigpIGlmIEBhdXRvUmVuZGVyXG5cbiAgZmluZDogKHNlbGVjdG9yKSAtPlxuICAgIGlmICRcbiAgICAgIEAkZWwuZmluZCBzZWxlY3RvclxuICAgIGVsc2VcbiAgICAgIEBlbC5xdWVyeVNlbGVjdG9yIHNlbGVjdG9yXG5cbiAgIyBVc2VyIGlucHV0IGV2ZW50IGhhbmRsaW5nXG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICMgRXZlbnQgaGFuZGxpbmcgdXNpbmcgZXZlbnQgZGVsZWdhdGlvblxuICAjIFJlZ2lzdGVyIGEgaGFuZGxlciBmb3IgYSBzcGVjaWZpYyBldmVudCB0eXBlXG4gICMgRm9yIHRoZSB3aG9sZSB2aWV3OlxuICAjICAgZGVsZWdhdGUoZXZlbnROYW1lLCBoYW5kbGVyKVxuICAjICAgZS5nLlxuICAjICAgQGRlbGVnYXRlKCdjbGljaycsIEBjbGlja2VkKVxuICAjIEZvciBhbiBlbGVtZW50IGluIHRoZSBwYXNzaW5nIGEgc2VsZWN0b3I6XG4gICMgICBkZWxlZ2F0ZShldmVudE5hbWUsIHNlbGVjdG9yLCBoYW5kbGVyKVxuICAjICAgZS5nLlxuICAjICAgQGRlbGVnYXRlKCdjbGljaycsICdidXR0b24uY29uZmlybScsIEBjb25maXJtKVxuICBkZWxlZ2F0ZTogKGV2ZW50TmFtZSwgc2Vjb25kLCB0aGlyZCkgLT5cbiAgICBpZiB0eXBlb2YgZXZlbnROYW1lIGlzbnQgJ3N0cmluZydcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgJ1ZpZXcjZGVsZWdhdGU6IGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcnXG5cbiAgICBzd2l0Y2ggYXJndW1lbnRzLmxlbmd0aFxuICAgICAgd2hlbiAyXG4gICAgICAgIGhhbmRsZXIgPSBzZWNvbmRcbiAgICAgIHdoZW4gM1xuICAgICAgICBzZWxlY3RvciA9IHNlY29uZFxuICAgICAgICBoYW5kbGVyID0gdGhpcmRcbiAgICAgICAgaWYgdHlwZW9mIHNlbGVjdG9yIGlzbnQgJ3N0cmluZydcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yICdWaWV3I2RlbGVnYXRlOiAnICtcbiAgICAgICAgICAgICdzZWNvbmQgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZydcbiAgICAgIGVsc2VcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnVmlldyNkZWxlZ2F0ZTogJyArXG4gICAgICAgICAgJ29ubHkgdHdvIG9yIHRocmVlIGFyZ3VtZW50cyBhcmUgYWxsb3dlZCdcblxuICAgIGlmIHR5cGVvZiBoYW5kbGVyIGlzbnQgJ2Z1bmN0aW9uJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnVmlldyNkZWxlZ2F0ZTogJyArXG4gICAgICAgICdoYW5kbGVyIGFyZ3VtZW50IG11c3QgYmUgZnVuY3Rpb24nXG5cbiAgICAjIEFkZCBhbiBldmVudCBuYW1lc3BhY2UsIGJpbmQgaGFuZGxlciBpdCB0byB2aWV3LlxuICAgICMgQmluZCBoYW5kbGVyIHRvIHZpZXcuXG4gICAgYm91bmQgPSBoYW5kbGVyLmJpbmQgdGhpc1xuXG4gICAgaWYgJFxuICAgICAgZXZlbnRzID0gZXZlbnROYW1lXG4gICAgICAgIC5zcGxpdCAnICdcbiAgICAgICAgLm1hcCAobmFtZSkgPT4gXCIje25hbWV9LmRlbGVnYXRlRXZlbnRzI3tAY2lkfVwiXG4gICAgICAgIC5qb2luICcgJ1xuXG4gICAgICBAJGVsLm9uIGV2ZW50cywgc2VsZWN0b3IsIGJvdW5kXG4gICAgZWxzZVxuICAgICAgZm9yIGV2ZW50IGluIGV2ZW50TmFtZS5zcGxpdCAnICdcbiAgICAgICAgc3VwZXIgZXZlbnQsIHNlbGVjdG9yLCBib3VuZFxuXG4gICAgIyBSZXR1cm4gdGhlIGJvdW5kIGhhbmRsZXIuXG4gICAgYm91bmRcblxuICAjIENvcHkgb2Ygb3JpZ2luYWwgQmFja2JvbmUgbWV0aG9kIHdpdGhvdXQgYHVuZGVsZWdhdGVFdmVudHNgIGNhbGwuXG4gIF9kZWxlZ2F0ZUV2ZW50czogKGV2ZW50cykgLT5cbiAgICBmb3Iga2V5IGluIE9iamVjdC5rZXlzIGV2ZW50c1xuICAgICAgdmFsdWUgPSBldmVudHNba2V5XVxuICAgICAgaGFuZGxlciA9IGlmIHR5cGVvZiB2YWx1ZSBpcyAnZnVuY3Rpb24nIHRoZW4gdmFsdWUgZWxzZSBAW3ZhbHVlXVxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiTWV0aG9kIGAje3ZhbHVlfWAgZG9lcyBub3QgZXhpc3RcIiB1bmxlc3MgaGFuZGxlclxuXG4gICAgICBtYXRjaCA9IC9eKFxcUyspXFxzKiguKikkLy5leGVjIGtleVxuICAgICAgQGRlbGVnYXRlIG1hdGNoWzFdLCBtYXRjaFsyXSwgaGFuZGxlclxuXG4gICAgcmV0dXJuXG5cbiAgIyBPdmVycmlkZSBCYWNrYm9uZXMgbWV0aG9kIHRvIGNvbWJpbmUgdGhlIGV2ZW50c1xuICAjIG9mIHRoZSBwYXJlbnQgdmlldyBpZiBpdCBleGlzdHMuXG4gIGRlbGVnYXRlRXZlbnRzOiAoZXZlbnRzLCBrZWVwT2xkKSAtPlxuICAgIEB1bmRlbGVnYXRlRXZlbnRzKCkgdW5sZXNzIGtlZXBPbGRcbiAgICByZXR1cm4gQF9kZWxlZ2F0ZUV2ZW50cyBldmVudHMgaWYgZXZlbnRzXG4gICAgIyBDYWxsIF9kZWxlZ2F0ZUV2ZW50cyBmb3IgYWxsIHN1cGVyY2xhc3Nlc+KAmSBgZXZlbnRzYC5cbiAgICBmb3IgY2xhc3NFdmVudHMgaW4gdXRpbHMuZ2V0QWxsUHJvcGVydHlWZXJzaW9ucyB0aGlzLCAnZXZlbnRzJ1xuICAgICAgY2xhc3NFdmVudHMgPSBjbGFzc0V2ZW50cy5jYWxsIHRoaXMgaWYgdHlwZW9mIGNsYXNzRXZlbnRzIGlzICdmdW5jdGlvbidcbiAgICAgIEBfZGVsZWdhdGVFdmVudHMgY2xhc3NFdmVudHNcblxuICAgIHJldHVyblxuXG4gICMgUmVtb3ZlIGFsbCBoYW5kbGVycyByZWdpc3RlcmVkIHdpdGggQGRlbGVnYXRlLlxuICB1bmRlbGVnYXRlOiAoZXZlbnROYW1lID0gJycsIHNlY29uZCkgLT5cbiAgICBpZiB0eXBlb2YgZXZlbnROYW1lIGlzbnQgJ3N0cmluZydcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgJ1ZpZXcjdW5kZWxlZ2F0ZTogZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZydcblxuICAgIHN3aXRjaCBhcmd1bWVudHMubGVuZ3RoXG4gICAgICB3aGVuIDJcbiAgICAgICAgc2VsZWN0b3IgPSBzZWNvbmQgaWYgdHlwZW9mIHNlY29uZCBpcyAnc3RyaW5nJ1xuICAgICAgd2hlbiAzXG4gICAgICAgIHNlbGVjdG9yID0gc2Vjb25kXG4gICAgICAgIGlmIHR5cGVvZiBzZWxlY3RvciBpc250ICdzdHJpbmcnXG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnVmlldyN1bmRlbGVnYXRlOiAnICtcbiAgICAgICAgICAgICdzZWNvbmQgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZydcblxuICAgIGlmICRcbiAgICAgIGV2ZW50cyA9IGV2ZW50TmFtZVxuICAgICAgICAuc3BsaXQgJyAnXG4gICAgICAgIC5tYXAgKG5hbWUpID0+IFwiI3tuYW1lfS5kZWxlZ2F0ZUV2ZW50cyN7QGNpZH1cIlxuICAgICAgICAuam9pbiAnICdcblxuICAgICAgQCRlbC5vZmYgZXZlbnRzLCBzZWxlY3RvclxuICAgIGVsc2VcbiAgICAgIGlmIGV2ZW50TmFtZVxuICAgICAgICBzdXBlciBldmVudE5hbWUsIHNlbGVjdG9yXG4gICAgICBlbHNlXG4gICAgICAgIEB1bmRlbGVnYXRlRXZlbnRzKClcblxuICAjIEhhbmRsZSBkZWNsYXJhdGl2ZSBldmVudCBiaW5kaW5ncyBmcm9tIGBsaXN0ZW5gXG4gIGRlbGVnYXRlTGlzdGVuZXJzOiAtPlxuICAgIHJldHVybiB1bmxlc3MgQGxpc3RlblxuXG4gICAgIyBXYWxrIGFsbCBgbGlzdGVuYCBoYXNoZXMgaW4gdGhlIHByb3RvdHlwZSBjaGFpbi5cbiAgICBmb3IgdmVyc2lvbiBpbiB1dGlscy5nZXRBbGxQcm9wZXJ0eVZlcnNpb25zIHRoaXMsICdsaXN0ZW4nXG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi5jYWxsIHRoaXMgaWYgdHlwZW9mIHZlcnNpb24gaXMgJ2Z1bmN0aW9uJ1xuICAgICAgZm9yIGtleSBpbiBPYmplY3Qua2V5cyB2ZXJzaW9uXG4gICAgICAgICMgR2V0IHRoZSBtZXRob2QsIGVuc3VyZSBpdCBpcyBhIGZ1bmN0aW9uLlxuICAgICAgICBtZXRob2QgPSB2ZXJzaW9uW2tleV1cbiAgICAgICAgaWYgdHlwZW9mIG1ldGhvZCBpc250ICdmdW5jdGlvbidcbiAgICAgICAgICBtZXRob2QgPSBAW21ldGhvZF1cbiAgICAgICAgaWYgdHlwZW9mIG1ldGhvZCBpc250ICdmdW5jdGlvbidcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgJ1ZpZXcjZGVsZWdhdGVMaXN0ZW5lcnM6ICcgK1xuICAgICAgICAgICAgXCJsaXN0ZW5lciBmb3IgYCN7a2V5fWAgbXVzdCBiZSBmdW5jdGlvblwiXG5cbiAgICAgICAgIyBTcGxpdCBldmVudCBuYW1lIGFuZCB0YXJnZXQuXG4gICAgICAgIFtldmVudE5hbWUsIHRhcmdldF0gPSBrZXkuc3BsaXQgJyAnXG4gICAgICAgIEBkZWxlZ2F0ZUxpc3RlbmVyIGV2ZW50TmFtZSwgdGFyZ2V0LCBtZXRob2RcblxuICAgIHJldHVyblxuXG4gIGRlbGVnYXRlTGlzdGVuZXI6IChldmVudE5hbWUsIHRhcmdldCwgY2FsbGJhY2spIC0+XG4gICAgaWYgdGFyZ2V0IGluIFsnbW9kZWwnLCAnY29sbGVjdGlvbiddXG4gICAgICBwcm9wID0gQFt0YXJnZXRdXG4gICAgICBAbGlzdGVuVG8gcHJvcCwgZXZlbnROYW1lLCBjYWxsYmFjayBpZiBwcm9wXG4gICAgZWxzZSBpZiB0YXJnZXQgaXMgJ21lZGlhdG9yJ1xuICAgICAgQHN1YnNjcmliZUV2ZW50IGV2ZW50TmFtZSwgY2FsbGJhY2tcbiAgICBlbHNlIGlmIG5vdCB0YXJnZXRcbiAgICAgIEBvbiBldmVudE5hbWUsIGNhbGxiYWNrLCB0aGlzXG5cbiAgICByZXR1cm5cblxuICAjIFJlZ2lvbiBtYW5hZ2VtZW50XG4gICMgLS0tLS0tLS0tLS0tLS0tLS1cblxuICAjIEZ1bmN0aW9uYWxseSByZWdpc3RlciBhIHNpbmdsZSByZWdpb24uXG4gIHJlZ2lzdGVyUmVnaW9uOiAobmFtZSwgc2VsZWN0b3IpIC0+XG4gICAgbWVkaWF0b3IuZXhlY3V0ZSAncmVnaW9uOnJlZ2lzdGVyJywgdGhpcywgbmFtZSwgc2VsZWN0b3JcblxuICAjIEZ1bmN0aW9uYWxseSB1bnJlZ2lzdGVyIGEgc2luZ2xlIHJlZ2lvbiBieSBuYW1lLlxuICB1bnJlZ2lzdGVyUmVnaW9uOiAobmFtZSkgLT5cbiAgICBtZWRpYXRvci5leGVjdXRlICdyZWdpb246dW5yZWdpc3RlcicsIHRoaXMsIG5hbWVcblxuICAjIFVucmVnaXN0ZXIgYWxsIHJlZ2lvbnM7IGNhbGxlZCB1cG9uIHZpZXcgZGlzcG9zYWwuXG4gIHVucmVnaXN0ZXJBbGxSZWdpb25zOiAtPlxuICAgIG1lZGlhdG9yLmV4ZWN1dGUgbmFtZTogJ3JlZ2lvbjp1bnJlZ2lzdGVyJywgc2lsZW50OiB0cnVlLCB0aGlzXG5cbiAgIyBTdWJ2aWV3c1xuICAjIC0tLS0tLS0tXG5cbiAgIyBHZXR0aW5nIG9yIGFkZGluZyBhIHN1YnZpZXcuXG4gIHN1YnZpZXc6IChuYW1lLCB2aWV3KSAtPlxuICAgICMgSW5pdGlhbGl6ZSBzdWJ2aWV3cyBjb2xsZWN0aW9ucyBpZiB0aGV5IGRvbuKAmXQgZXhpc3QgeWV0LlxuICAgIHN1YnZpZXdzID0gQHN1YnZpZXdzXG4gICAgYnlOYW1lID0gQHN1YnZpZXdzQnlOYW1lXG5cbiAgICBpZiBuYW1lIGFuZCB2aWV3XG4gICAgICAjIEFkZCB0aGUgc3VidmlldywgZW5zdXJlIGl04oCZcyB1bmlxdWUuXG4gICAgICBAcmVtb3ZlU3VidmlldyBuYW1lXG4gICAgICBzdWJ2aWV3cy5wdXNoIHZpZXdcbiAgICAgIGJ5TmFtZVtuYW1lXSA9IHZpZXdcbiAgICAgIHZpZXdcbiAgICBlbHNlIGlmIG5hbWVcbiAgICAgICMgR2V0IGFuZCByZXR1cm4gdGhlIHN1YnZpZXcgYnkgdGhlIGdpdmVuIG5hbWUuXG4gICAgICBieU5hbWVbbmFtZV1cblxuICAjIFJlbW92aW5nIGEgc3Vidmlldy5cbiAgcmVtb3ZlU3VidmlldzogKG5hbWVPclZpZXcpIC0+XG4gICAgcmV0dXJuIHVubGVzcyBuYW1lT3JWaWV3XG4gICAgc3Vidmlld3MgPSBAc3Vidmlld3NcbiAgICBieU5hbWUgPSBAc3Vidmlld3NCeU5hbWVcblxuICAgIGlmIHR5cGVvZiBuYW1lT3JWaWV3IGlzICdzdHJpbmcnXG4gICAgICAjIE5hbWUgZ2l2ZW4sIHNlYXJjaCBmb3IgYSBzdWJ2aWV3IGJ5IG5hbWUuXG4gICAgICBuYW1lID0gbmFtZU9yVmlld1xuICAgICAgdmlldyA9IGJ5TmFtZVtuYW1lXVxuICAgIGVsc2VcbiAgICAgICMgVmlldyBpbnN0YW5jZSBnaXZlbiwgc2VhcmNoIGZvciB0aGUgY29ycmVzcG9uZGluZyBuYW1lLlxuICAgICAgdmlldyA9IG5hbWVPclZpZXdcbiAgICAgIE9iamVjdC5rZXlzKGJ5TmFtZSkuc29tZSAoa2V5KSAtPlxuICAgICAgICBuYW1lID0ga2V5IGlmIGJ5TmFtZVtrZXldIGlzIHZpZXdcblxuICAgICMgQnJlYWsgaWYgbm8gdmlldyBhbmQgbmFtZSB3ZXJlIGZvdW5kLlxuICAgIHJldHVybiB1bmxlc3MgbmFtZSBhbmQgdmlldz8uZGlzcG9zZVxuXG4gICAgIyBEaXNwb3NlIHRoZSB2aWV3LlxuICAgIHZpZXcuZGlzcG9zZSgpXG5cbiAgICAjIFJlbW92ZSB0aGUgc3VidmlldyBmcm9tIHRoZSBsaXN0cy5cbiAgICBpbmRleCA9IHN1YnZpZXdzLmluZGV4T2Ygdmlld1xuICAgIHN1YnZpZXdzLnNwbGljZSBpbmRleCwgMSBpZiBpbmRleCBpc250IC0xXG4gICAgZGVsZXRlIGJ5TmFtZVtuYW1lXVxuXG4gICMgUmVuZGVyaW5nXG4gICMgLS0tLS0tLS0tXG5cbiAgIyBHZXQgdGhlIG1vZGVsL2NvbGxlY3Rpb24gZGF0YSBmb3IgdGhlIHRlbXBsYXRpbmcgZnVuY3Rpb25cbiAgIyBVc2VzIG9wdGltaXplZCBDaGFwbGluIHNlcmlhbGl6YXRpb24gaWYgYXZhaWxhYmxlLlxuICBnZXRUZW1wbGF0ZURhdGE6IC0+XG4gICAgZGF0YSA9IGlmIEBtb2RlbFxuICAgICAgdXRpbHMuc2VyaWFsaXplIEBtb2RlbFxuICAgIGVsc2UgaWYgQGNvbGxlY3Rpb25cbiAgICAgIHtpdGVtczogdXRpbHMuc2VyaWFsaXplKEBjb2xsZWN0aW9uKSwgbGVuZ3RoOiBAY29sbGVjdGlvbi5sZW5ndGh9XG4gICAgZWxzZVxuICAgICAge31cblxuICAgIHNvdXJjZSA9IEBtb2RlbCBvciBAY29sbGVjdGlvblxuICAgIGlmIHNvdXJjZVxuICAgICAgIyBJZiB0aGUgbW9kZWwvY29sbGVjdGlvbiBpcyBhIFN5bmNNYWNoaW5lLCBhZGQgYSBgc3luY2VkYCBmbGFnLFxuICAgICAgIyBidXQgb25seSBpZiBpdOKAmXMgbm90IHByZXNlbnQgeWV0LlxuICAgICAgaWYgdHlwZW9mIHNvdXJjZS5pc1N5bmNlZCBpcyAnZnVuY3Rpb24nIGFuZCBub3QgKCdzeW5jZWQnIG9mIGRhdGEpXG4gICAgICAgIGRhdGEuc3luY2VkID0gc291cmNlLmlzU3luY2VkKClcblxuICAgIGRhdGFcblxuICAjIFJldHVybnMgdGhlIGNvbXBpbGVkIHRlbXBsYXRlIGZ1bmN0aW9uLlxuICBnZXRUZW1wbGF0ZUZ1bmN0aW9uOiAtPlxuICAgICMgQ2hhcGxpbiBkb2VzbuKAmXQgZGVmaW5lIGhvdyB5b3UgbG9hZCBhbmQgY29tcGlsZSB0ZW1wbGF0ZXMgaW4gb3JkZXIgdG9cbiAgICAjIHJlbmRlciB2aWV3cy4gVGhlIGV4YW1wbGUgYXBwbGljYXRpb24gdXNlcyBIYW5kbGViYXJzIGFuZCBSZXF1aXJlSlNcbiAgICAjIHRvIGxvYWQgYW5kIGNvbXBpbGUgdGVtcGxhdGVzIG9uIHRoZSBjbGllbnQgc2lkZS4gU2VlIHRoZSBkZXJpdmVkXG4gICAgIyBWaWV3IGNsYXNzIGluIHRoZVxuICAgICMgW2V4YW1wbGUgYXBwbGljYXRpb25dKGh0dHBzOi8vZ2l0aHViLmNvbS9jaGFwbGluanMvZmFjZWJvb2stZXhhbXBsZSkuXG4gICAgI1xuICAgICMgSWYgeW91IHByZWNvbXBpbGUgdGVtcGxhdGVzIHRvIEphdmFTY3JpcHQgZnVuY3Rpb25zIG9uIHRoZSBzZXJ2ZXIsXG4gICAgIyB5b3UgbWlnaHQganVzdCByZXR1cm4gYSByZWZlcmVuY2UgdG8gdGhhdCBmdW5jdGlvbi5cbiAgICAjIFNldmVyYWwgcHJlY29tcGlsZXJzIGNyZWF0ZSBhIGdsb2JhbCBgSlNUYCBoYXNoIHdoaWNoIHN0b3JlcyB0aGVcbiAgICAjIHRlbXBsYXRlIGZ1bmN0aW9ucy4gWW91IGNhbiBnZXQgdGhlIGZ1bmN0aW9uIGJ5IHRoZSB0ZW1wbGF0ZSBuYW1lOlxuICAgICMgSlNUW0B0ZW1wbGF0ZU5hbWVdXG4gICAgdGhyb3cgbmV3IEVycm9yICdWaWV3I2dldFRlbXBsYXRlRnVuY3Rpb24gbXVzdCBiZSBvdmVycmlkZGVuJ1xuXG4gICMgTWFpbiByZW5kZXIgZnVuY3Rpb24uXG4gICMgVGhpcyBtZXRob2QgaXMgYm91bmQgdG8gdGhlIGluc3RhbmNlIGluIHRoZSBjb25zdHJ1Y3RvciAoc2VlIGFib3ZlKVxuICByZW5kZXI6IC0+XG4gICAgIyBEbyBub3QgcmVuZGVyIGlmIHRoZSBvYmplY3Qgd2FzIGRpc3Bvc2VkXG4gICAgIyAocmVuZGVyIG1pZ2h0IGJlIGNhbGxlZCBhcyBhbiBldmVudCBoYW5kbGVyIHdoaWNoIHdhc27igJl0XG4gICAgIyByZW1vdmVkIGNvcnJlY3RseSkuXG4gICAgcmV0dXJuIGZhbHNlIGlmIEBkaXNwb3NlZFxuXG4gICAgdGVtcGxhdGVGdW5jID0gQGdldFRlbXBsYXRlRnVuY3Rpb24oKVxuXG4gICAgaWYgdHlwZW9mIHRlbXBsYXRlRnVuYyBpcyAnZnVuY3Rpb24nXG4gICAgICAjIENhbGwgdGhlIHRlbXBsYXRlIGZ1bmN0aW9uIHBhc3NpbmcgdGhlIHRlbXBsYXRlIGRhdGEuXG4gICAgICBodG1sID0gdGVtcGxhdGVGdW5jIEBnZXRUZW1wbGF0ZURhdGEoKVxuXG4gICAgICAjIFJlcGxhY2UgSFRNTFxuICAgICAgaWYgQG5vV3JhcFxuICAgICAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQgJ2RpdidcbiAgICAgICAgZWwuaW5uZXJIVE1MID0gaHRtbFxuXG4gICAgICAgIGlmIGVsLmNoaWxkcmVuLmxlbmd0aCA+IDFcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgJ1RoZXJlIG11c3QgYmUgYSBzaW5nbGUgdG9wLWxldmVsIGVsZW1lbnQgJyArXG4gICAgICAgICAgICAnd2hlbiB1c2luZyBgbm9XcmFwYCdcblxuICAgICAgICAjIFVuZGVsZWdhdGUgdGhlIGNvbnRhaW5lciBldmVudHMgdGhhdCB3ZXJlIHNldHVwLlxuICAgICAgICBAdW5kZWxlZ2F0ZUV2ZW50cygpXG4gICAgICAgICMgRGVsZWdhdGUgZXZlbnRzIHRvIHRoZSB0b3AtbGV2ZWwgY29udGFpbmVyIGluIHRoZSB0ZW1wbGF0ZS5cbiAgICAgICAgQHNldEVsZW1lbnQgZWwuZmlyc3RDaGlsZCwgdHJ1ZVxuICAgICAgZWxzZVxuICAgICAgICBzZXRIVE1MIHRoaXMsIGh0bWxcblxuICAgICMgUmV0dXJuIHRoZSB2aWV3LlxuICAgIHRoaXNcblxuICAjIFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBhZnRlciBhIHNwZWNpZmljIGByZW5kZXJgIG9mIGEgZGVyaXZlZCBjbGFzcy5cbiAgYXR0YWNoOiAtPlxuICAgICMgQXR0ZW1wdCB0byBiaW5kIHRoaXMgdmlldyB0byBpdHMgbmFtZWQgcmVnaW9uLlxuICAgIG1lZGlhdG9yLmV4ZWN1dGUgJ3JlZ2lvbjpzaG93JywgQHJlZ2lvbiwgdGhpcyBpZiBAcmVnaW9uP1xuXG4gICAgIyBBdXRvbWF0aWNhbGx5IGFwcGVuZCB0byBET00gaWYgdGhlIGNvbnRhaW5lciBlbGVtZW50IGlzIHNldC5cbiAgICBpZiBAY29udGFpbmVyIGFuZCBub3QgZG9jdW1lbnQuYm9keS5jb250YWlucyBAZWxcbiAgICAgIGF0dGFjaCB0aGlzXG4gICAgICAjIFRyaWdnZXIgYW4gZXZlbnQuXG4gICAgICBAdHJpZ2dlciAnYWRkZWRUb0RPTSdcblxuICAjIERpc3Bvc2FsXG4gICMgLS0tLS0tLS1cblxuICBkaXNwb3NlZDogZmFsc2VcblxuICBkaXNwb3NlOiAtPlxuICAgIHJldHVybiBpZiBAZGlzcG9zZWRcblxuICAgICMgVW5yZWdpc3RlciBhbGwgcmVnaW9ucy5cbiAgICBAdW5yZWdpc3RlckFsbFJlZ2lvbnMoKVxuXG4gICAgIyBEaXNwb3NlIHN1YnZpZXdzLlxuICAgIHN1YnZpZXcuZGlzcG9zZSgpIGZvciBzdWJ2aWV3IGluIEBzdWJ2aWV3c1xuXG4gICAgIyBVbmJpbmQgaGFuZGxlcnMgb2YgZ2xvYmFsIGV2ZW50cy5cbiAgICBAdW5zdWJzY3JpYmVBbGxFdmVudHMoKVxuXG4gICAgIyBSZW1vdmUgYWxsIGV2ZW50IGhhbmRsZXJzIG9uIHRoaXMgbW9kdWxlLlxuICAgIEBvZmYoKVxuXG4gICAgIyBDaGVjayBpZiB2aWV3IHNob3VsZCBiZSByZW1vdmVkIGZyb20gRE9NLlxuICAgIGlmIEBrZWVwRWxlbWVudFxuICAgICAgIyBVbnN1YnNjcmliZSBmcm9tIGFsbCBET00gZXZlbnRzLlxuICAgICAgQHVuZGVsZWdhdGVFdmVudHMoKVxuICAgICAgQHVuZGVsZWdhdGUoKVxuICAgICAgIyBVbmJpbmQgYWxsIHJlZmVyZW5jZWQgaGFuZGxlcnMuXG4gICAgICBAc3RvcExpc3RlbmluZygpXG4gICAgZWxzZVxuICAgICAgIyBSZW1vdmUgdGhlIHRvcG1vc3QgZWxlbWVudCBmcm9tIERPTS4gVGhpcyBhbHNvIHJlbW92ZXMgYWxsIGV2ZW50XG4gICAgICAjIGhhbmRsZXJzIGZyb20gdGhlIGVsZW1lbnQgYW5kIGFsbCBpdHMgY2hpbGRyZW4uXG4gICAgICBAcmVtb3ZlKClcblxuICAgICMgUmVtb3ZlIGVsZW1lbnQgcmVmZXJlbmNlcywgb3B0aW9ucyxcbiAgICAjIG1vZGVsL2NvbGxlY3Rpb24gcmVmZXJlbmNlcyBhbmQgc3VidmlldyBsaXN0cy5cbiAgICBkZWxldGUgdGhpc1twcm9wXSBmb3IgcHJvcCBpbiBbXG4gICAgICAnZWwnLCAnJGVsJyxcbiAgICAgICdvcHRpb25zJywgJ21vZGVsJywgJ2NvbGxlY3Rpb24nLFxuICAgICAgJ3N1YnZpZXdzJywgJ3N1YnZpZXdzQnlOYW1lJyxcbiAgICAgICdfY2FsbGJhY2tzJ1xuICAgIF1cblxuICAgICMgRmluaXNoZWQuXG4gICAgQGRpc3Bvc2VkID0gdHJ1ZVxuXG4gICAgIyBZb3XigJlyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ04oCZcyBub3Qgb3Blbi5cbiAgICBPYmplY3QuZnJlZXplIHRoaXNcbiJdfQ==
return require(1);
}))