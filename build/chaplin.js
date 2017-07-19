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
    var enqueue;
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2hhcGxpbi5jb2ZmZWUiLCJzcmMvY2hhcGxpbi9hcHBsaWNhdGlvbi5jb2ZmZWUiLCJzcmMvY2hhcGxpbi9jb21wb3Nlci5jb2ZmZWUiLCJzcmMvY2hhcGxpbi9jb250cm9sbGVycy9jb250cm9sbGVyLmNvZmZlZSIsInNyYy9jaGFwbGluL2Rpc3BhdGNoZXIuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL2NvbXBvc2l0aW9uLmNvZmZlZSIsInNyYy9jaGFwbGluL2xpYi9ldmVudF9icm9rZXIuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL2hpc3RvcnkuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL3JvdXRlLmNvZmZlZSIsInNyYy9jaGFwbGluL2xpYi9yb3V0ZXIuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL3N1cHBvcnQuY29mZmVlIiwic3JjL2NoYXBsaW4vbGliL3N5bmNfbWFjaGluZS5jb2ZmZWUiLCJzcmMvY2hhcGxpbi9saWIvdXRpbHMuY29mZmVlIiwic3JjL2NoYXBsaW4vbWVkaWF0b3IuY29mZmVlIiwic3JjL2NoYXBsaW4vbW9kZWxzL2NvbGxlY3Rpb24uY29mZmVlIiwic3JjL2NoYXBsaW4vbW9kZWxzL21vZGVsLmNvZmZlZSIsInNyYy9jaGFwbGluL3ZpZXdzL2NvbGxlY3Rpb25fdmlldy5jb2ZmZWUiLCJzcmMvY2hhcGxpbi92aWV3cy9sYXlvdXQuY29mZmVlIiwic3JjL2NoYXBsaW4vdmlld3Mvdmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUlBLE1BQU0sQ0FBQyxPQUFQLEdBQ0U7RUFBQSxXQUFBLEVBQWdCLE9BQUEsQ0FBUSx1QkFBUixDQUFoQjtFQUNBLFFBQUEsRUFBZ0IsT0FBQSxDQUFRLG9CQUFSLENBRGhCO0VBRUEsVUFBQSxFQUFnQixPQUFBLENBQVEsa0NBQVIsQ0FGaEI7RUFHQSxVQUFBLEVBQWdCLE9B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QUFHQTtBQUFBLFNBQUEscUNBQUE7O01BQUEsT0FBTyxDQUFDLE9BQVIsQ0FBQTtBQUFBO0lBR0EsSUFBQyxDQUFBLG9CQUFELENBQUE7SUFHQSxJQUFDLENBQUEsR0FBRCxDQUFBO0lBR0EsSUFBRyxJQUFDLENBQUEsV0FBSjtNQUVFLElBQUMsQ0FBQSxnQkFBRCxDQUFBO01BQ0EsSUFBQyxDQUFBLFVBQUQsQ0FBQTtNQUVBLElBQUMsQ0FBQSxhQUFELENBQUEsRUFMRjtLQUFBLE1BQUE7TUFTRSxJQUFDLENBQUEsTUFBRCxDQUFBLEVBVEY7O0FBYUE7QUFBQSxTQUFBLHdDQUFBOztNQUFBLE9BQU8sSUFBSyxDQUFBLElBQUE7QUFBWjtJQVFBLElBQUMsQ0FBQSxRQUFELEdBQVk7V0FHWixNQUFNLENBQUMsTUFBUCxDQUFjLElBQWQ7RUF4Q087Ozs7R0EzYXlCLFFBQVEsQ0FBQyxVQUFULElBQXVCLFFBQVEsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCdcblxuIyBNYWluIGVudHJ5IHBvaW50IGludG8gQ2hhcGxpbiBtb2R1bGUuXG4jIExvYWQgYWxsIGNvbXBvbmVudHMgYW5kIGV4cG9zZSB0aGVtLlxubW9kdWxlLmV4cG9ydHMgPVxuICBBcHBsaWNhdGlvbjogICAgcmVxdWlyZSAnLi9jaGFwbGluL2FwcGxpY2F0aW9uJ1xuICBDb21wb3NlcjogICAgICAgcmVxdWlyZSAnLi9jaGFwbGluL2NvbXBvc2VyJ1xuICBDb250cm9sbGVyOiAgICAgcmVxdWlyZSAnLi9jaGFwbGluL2NvbnRyb2xsZXJzL2NvbnRyb2xsZXInXG4gIERpc3BhdGNoZXI6ICAgICByZXF1aXJlICcuL2NoYXBsaW4vZGlzcGF0Y2hlcidcbiAgQ29tcG9zaXRpb246ICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9saWIvY29tcG9zaXRpb24nXG4gIEV2ZW50QnJva2VyOiAgICByZXF1aXJlICcuL2NoYXBsaW4vbGliL2V2ZW50X2Jyb2tlcidcbiAgSGlzdG9yeTogICAgICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9saWIvaGlzdG9yeSdcbiAgUm91dGU6ICAgICAgICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9saWIvcm91dGUnXG4gIFJvdXRlcjogICAgICAgICByZXF1aXJlICcuL2NoYXBsaW4vbGliL3JvdXRlcidcbiAgc3VwcG9ydDogICAgICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9saWIvc3VwcG9ydCdcbiAgU3luY01hY2hpbmU6ICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9saWIvc3luY19tYWNoaW5lJ1xuICB1dGlsczogICAgICAgICAgcmVxdWlyZSAnLi9jaGFwbGluL2xpYi91dGlscydcbiAgbWVkaWF0b3I6ICAgICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9tZWRpYXRvcidcbiAgQ29sbGVjdGlvbjogICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9tb2RlbHMvY29sbGVjdGlvbidcbiAgTW9kZWw6ICAgICAgICAgIHJlcXVpcmUgJy4vY2hhcGxpbi9tb2RlbHMvbW9kZWwnXG4gIENvbGxlY3Rpb25WaWV3OiByZXF1aXJlICcuL2NoYXBsaW4vdmlld3MvY29sbGVjdGlvbl92aWV3J1xuICBMYXlvdXQ6ICAgICAgICAgcmVxdWlyZSAnLi9jaGFwbGluL3ZpZXdzL2xheW91dCdcbiAgVmlldzogICAgICAgICAgIHJlcXVpcmUgJy4vY2hhcGxpbi92aWV3cy92aWV3J1xuIiwiJ3VzZSBzdHJpY3QnXG5cbiMgVGhpcmQtcGFydHkgbGlicmFyaWVzLlxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuXG4jIENvZmZlZVNjcmlwdCBjbGFzc2VzIHdoaWNoIGFyZSBpbnN0YW50aWF0ZWQgd2l0aCBgbmV3YFxuQ29tcG9zZXIgPSByZXF1aXJlICcuL2NvbXBvc2VyJ1xuRGlzcGF0Y2hlciA9IHJlcXVpcmUgJy4vZGlzcGF0Y2hlcidcblJvdXRlciA9IHJlcXVpcmUgJy4vbGliL3JvdXRlcidcbkxheW91dCA9IHJlcXVpcmUgJy4vdmlld3MvbGF5b3V0J1xuXG4jIEEgbWl4LWluIHRoYXQgc2hvdWxkIGJlIG1peGVkIHRvIGNsYXNzLlxuRXZlbnRCcm9rZXIgPSByZXF1aXJlICcuL2xpYi9ldmVudF9icm9rZXInXG5cbiMgSW5kZXBlbmRlbnQgZ2xvYmFsIGV2ZW50IGJ1cyB0aGF0IGlzIHVzZWQgYnkgaXRzZWxmLCBzbyBsb3dlcmNhc2VkLlxubWVkaWF0b3IgPSByZXF1aXJlICcuL21lZGlhdG9yJ1xuXG4jIFRoZSBib290c3RyYXBwZXIgaXMgdGhlIGVudHJ5IHBvaW50IGZvciBDaGFwbGluIGFwcHMuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEFwcGxpY2F0aW9uXG4gICMgQm9ycm93IHRoZSBgZXh0ZW5kYCBtZXRob2QgZnJvbSBhIGRlYXIgZnJpZW5kLlxuICBAZXh0ZW5kID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kXG5cbiAgIyBNaXhpbiBhbiBgRXZlbnRCcm9rZXJgIGZvciAqKnB1Ymxpc2gvc3Vic2NyaWJlKiogZnVuY3Rpb25hbGl0eS5cbiAgXy5leHRlbmQgQHByb3RvdHlwZSwgRXZlbnRCcm9rZXJcblxuICAjIFNpdGUtd2lkZSB0aXRsZSB0aGF0IGlzIG1hcHBlZCB0byBIVE1MIGB0aXRsZWAgdGFnLlxuICB0aXRsZTogJydcblxuICAjIENvcmUgT2JqZWN0IEluc3RhbnRpYXRpb25cbiAgIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgIyBUaGUgYXBwbGljYXRpb24gaW5zdGFudGlhdGVzIHRocmVlICoqY29yZSBtb2R1bGVzKio6XG4gIGRpc3BhdGNoZXI6IG51bGxcbiAgbGF5b3V0OiBudWxsXG4gIHJvdXRlcjogbnVsbFxuICBjb21wb3NlcjogbnVsbFxuICBzdGFydGVkOiBmYWxzZVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgIEBpbml0aWFsaXplIG9wdGlvbnNcblxuICBpbml0aWFsaXplOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICMgQ2hlY2sgaWYgYXBwIGlzIGFscmVhZHkgc3RhcnRlZC5cbiAgICBpZiBAc3RhcnRlZFxuICAgICAgdGhyb3cgbmV3IEVycm9yICdBcHBsaWNhdGlvbiNpbml0aWFsaXplOiBBcHAgd2FzIGFscmVhZHkgc3RhcnRlZCdcblxuICAgICMgSW5pdGlhbGl6ZSBjb3JlIGNvbXBvbmVudHMuXG4gICAgIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgICMgUmVnaXN0ZXIgYWxsIHJvdXRlcy5cbiAgICAjIFlvdSBtaWdodCBwYXNzIFJvdXRlci9IaXN0b3J5IG9wdGlvbnMgYXMgdGhlIHNlY29uZCBwYXJhbWV0ZXIuXG4gICAgIyBDaGFwbGluIGVuYWJsZXMgcHVzaFN0YXRlIHBlciBkZWZhdWx0IGFuZCBCYWNrYm9uZSB1c2VzIC8gYXNcbiAgICAjIHRoZSByb290IHBlciBkZWZhdWx0LiBZb3UgbWlnaHQgY2hhbmdlIHRoYXQgaW4gdGhlIG9wdGlvbnNcbiAgICAjIGlmIG5lY2Vzc2FyeTpcbiAgICAjIEBpbml0Um91dGVyIHJvdXRlcywgcHVzaFN0YXRlOiBmYWxzZSwgcm9vdDogJy9zdWJkaXIvJ1xuICAgIEBpbml0Um91dGVyIG9wdGlvbnMucm91dGVzLCBvcHRpb25zXG5cbiAgICAjIERpc3BhdGNoZXIgbGlzdGVucyBmb3Igcm91dGluZyBldmVudHMgYW5kIGluaXRpYWxpc2VzIGNvbnRyb2xsZXJzLlxuICAgIEBpbml0RGlzcGF0Y2hlciBvcHRpb25zXG5cbiAgICAjIExheW91dCBsaXN0ZW5zIGZvciBjbGljayBldmVudHMgJiBkZWxlZ2F0ZXMgaW50ZXJuYWwgbGlua3MgdG8gcm91dGVyLlxuICAgIEBpbml0TGF5b3V0IG9wdGlvbnNcblxuICAgICMgQ29tcG9zZXIgZ3JhbnRzIHRoZSBhYmlsaXR5IGZvciB2aWV3cyBhbmQgc3R1ZmYgdG8gYmUgcGVyc2lzdGVkLlxuICAgIEBpbml0Q29tcG9zZXIgb3B0aW9uc1xuXG4gICAgIyBNZWRpYXRvciBpcyBhIGdsb2JhbCBtZXNzYWdlIGJyb2tlciB3aGljaCBpbXBsZW1lbnRzIHB1YiAvIHN1YiBwYXR0ZXJuLlxuICAgIEBpbml0TWVkaWF0b3IoKVxuXG4gICAgIyBTdGFydCB0aGUgYXBwbGljYXRpb24uXG4gICAgQHN0YXJ0KClcblxuICAjICoqQ2hhcGxpbi5EaXNwYXRjaGVyKiogc2l0cyBiZXR3ZWVuIHRoZSByb3V0ZXIgYW5kIGNvbnRyb2xsZXJzIHRvIGxpc3RlblxuICAjIGZvciByb3V0aW5nIGV2ZW50cy4gV2hlbiB0aGV5IG9jY3VyLCBDaGFwbGluLkRpc3BhdGNoZXIgbG9hZHMgdGhlIHRhcmdldFxuICAjIGNvbnRyb2xsZXIgbW9kdWxlIGFuZCBpbnN0YW50aWF0ZXMgaXQgYmVmb3JlIGludm9raW5nIHRoZSB0YXJnZXQgYWN0aW9uLlxuICAjIEFueSBwcmV2aW91c2x5IGFjdGl2ZSBjb250cm9sbGVyIGlzIGF1dG9tYXRpY2FsbHkgZGlzcG9zZWQuXG5cbiAgaW5pdERpc3BhdGNoZXI6IChvcHRpb25zKSAtPlxuICAgIEBkaXNwYXRjaGVyID0gbmV3IERpc3BhdGNoZXIgb3B0aW9uc1xuXG4gICMgKipDaGFwbGluLkxheW91dCoqIGlzIHRoZSB0b3AtbGV2ZWwgYXBwbGljYXRpb24gdmlldy4gSXQgKmRvZXMgbm90XG4gICMgaW5oZXJpdCogZnJvbSBDaGFwbGluLlZpZXcgYnV0IGJvcnJvd3Mgc29tZSBvZiBpdHMgZnVuY3Rpb25hbGl0aWVzLiBJdFxuICAjIGlzIHRpZWQgdG8gdGhlIGRvY3VtZW50IGRvbSBlbGVtZW50IGFuZCByZWdpc3RlcnMgYXBwbGljYXRpb24td2lkZVxuICAjIGV2ZW50cywgc3VjaCBhcyBpbnRlcm5hbCBsaW5rcy4gQW5kIG1haW5seSwgd2hlbiBhIG5ldyBjb250cm9sbGVyIGlzXG4gICMgYWN0aXZhdGVkLCBDaGFwbGluLkxheW91dCBpcyByZXNwb25zaWJsZSBmb3IgY2hhbmdpbmcgdGhlIG1haW4gdmlldyB0b1xuICAjIHRoZSB2aWV3IG9mIHRoZSBuZXcgY29udHJvbGxlci5cblxuICBpbml0TGF5b3V0OiAob3B0aW9ucyA9IHt9KSAtPlxuICAgIG9wdGlvbnMudGl0bGUgPz0gQHRpdGxlXG4gICAgQGxheW91dCA9IG5ldyBMYXlvdXQgb3B0aW9uc1xuXG4gIGluaXRDb21wb3NlcjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICBAY29tcG9zZXIgPSBuZXcgQ29tcG9zZXIgb3B0aW9uc1xuXG4gICMgKipDaGFwbGluLm1lZGlhdG9yKiogaXMgYSBzaW5nbGV0b24gdGhhdCBzZXJ2ZXMgYXMgdGhlIHNvbGUgY29tbXVuaWNhdGlvblxuICAjIGNoYW5uZWwgZm9yIGFsbCBwYXJ0cyBvZiB0aGUgYXBwbGljYXRpb24uIEl0IHNob3VsZCBiZSBzZWFsZWQgc28gdGhhdCBpdHNcbiAgIyBtaXN1c2UgYXMgYSBraXRjaGVuIHNpbmsgaXMgcHJvaGliaXRlZC4gSWYgeW91IGRvIHdhbnQgdG8gZ2l2ZSBtb2R1bGVzXG4gICMgYWNjZXNzIHRvIHNvbWUgc2hhcmVkIHJlc291cmNlLCBob3dldmVyLCBhZGQgaXQgaGVyZSBiZWZvcmUgc2VhbGluZyB0aGVcbiAgIyBtZWRpYXRvci5cblxuICBpbml0TWVkaWF0b3I6IC0+XG4gICAgT2JqZWN0LnNlYWwgbWVkaWF0b3JcblxuICAjICoqQ2hhcGxpbi5Sb3V0ZXIqKiBpcyByZXNwb25zaWJsZSBmb3Igb2JzZXJ2aW5nIFVSTCBjaGFuZ2VzLiBUaGUgcm91dGVyXG4gICMgaXMgYSByZXBsYWNlbWVudCBmb3IgQmFja2JvbmUuUm91dGVyIGFuZCAqZG9lcyBub3QgaW5oZXJpdCBmcm9tIGl0KlxuICAjIGRpcmVjdGx5LiBJdCdzIGEgZGlmZmVyZW50IGltcGxlbWVudGF0aW9uIHdpdGggc2V2ZXJhbCBhZHZhbnRhZ2VzIG92ZXJcbiAgIyB0aGUgc3RhbmRhcmQgcm91dGVyIHByb3ZpZGVkIGJ5IEJhY2tib25lLiBUaGUgcm91dGVyIGlzIHR5cGljYWxseVxuICAjIGluaXRpYWxpemVkIGJ5IHBhc3NpbmcgdGhlIGZ1bmN0aW9uIHJldHVybmVkIGJ5ICoqcm91dGVzLmNvZmZlZSoqLlxuXG4gIGluaXRSb3V0ZXI6IChyb3V0ZXMsIG9wdGlvbnMpIC0+XG4gICAgIyBTYXZlIHRoZSByZWZlcmVuY2UgZm9yIHRlc3RpbmcgaW50cm9zcGVjdGlvbiBvbmx5LlxuICAgICMgTW9kdWxlcyBzaG91bGQgY29tbXVuaWNhdGUgd2l0aCBlYWNoIG90aGVyIHZpYSAqKnB1Ymxpc2gvc3Vic2NyaWJlKiouXG4gICAgQHJvdXRlciA9IG5ldyBSb3V0ZXIgb3B0aW9uc1xuXG4gICAgIyBSZWdpc3RlciBhbnkgcHJvdmlkZWQgcm91dGVzLlxuICAgIHJvdXRlcz8gQHJvdXRlci5tYXRjaFxuXG4gICMgQ2FuIGJlIGN1c3RvbWl6ZWQgd2hlbiBvdmVycmlkZGVuLlxuICBzdGFydDogLT5cbiAgICAjIEFmdGVyIHJlZ2lzdGVyaW5nIHRoZSByb3V0ZXMsIHN0YXJ0ICoqQmFja2JvbmUuaGlzdG9yeSoqLlxuICAgIEByb3V0ZXIuc3RhcnRIaXN0b3J5KClcblxuICAgICMgTWFyayBhcHAgYXMgaW5pdGlhbGl6ZWQuXG4gICAgQHN0YXJ0ZWQgPSB0cnVlXG5cbiAgICAjIERpc3Bvc2FsIHNob3VsZCBiZSBvd24gcHJvcGVydHkgYmVjYXVzZSBvZiBgT2JqZWN0LnNlYWxgXG4gICAgQGRpc3Bvc2VkID0gZmFsc2VcblxuICAgICMgU2VhbCB0aGUgYXBwbGljYXRpb24gaW5zdGFuY2UgdG8gcHJldmVudCBmdXJ0aGVyIGNoYW5nZXMuXG4gICAgT2JqZWN0LnNlYWwgdGhpc1xuXG4gIGRpc3Bvc2U6IC0+XG4gICAgIyBBbSBJIGFscmVhZHkgZGlzcG9zZWQ/XG4gICAgcmV0dXJuIGlmIEBkaXNwb3NlZFxuXG4gICAgcHJvcGVydGllcyA9IFsnZGlzcGF0Y2hlcicsICdsYXlvdXQnLCAncm91dGVyJywgJ2NvbXBvc2VyJ11cbiAgICBmb3IgcHJvcCBpbiBwcm9wZXJ0aWVzIHdoZW4gdGhpc1twcm9wXT9cbiAgICAgIHRoaXNbcHJvcF0uZGlzcG9zZSgpXG5cbiAgICBAZGlzcG9zZWQgPSB0cnVlXG5cbiAgICAjIFlvdSdyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ0J3Mgbm90IG9wZW4uXG4gICAgT2JqZWN0LmZyZWV6ZSB0aGlzXG4iLCIndXNlIHN0cmljdCdcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuXG5Db21wb3NpdGlvbiA9IHJlcXVpcmUgJy4vbGliL2NvbXBvc2l0aW9uJ1xuRXZlbnRCcm9rZXIgPSByZXF1aXJlICcuL2xpYi9ldmVudF9icm9rZXInXG5tZWRpYXRvciA9IHJlcXVpcmUgJy4vbWVkaWF0b3InXG5cbiMgQ29tcG9zZXJcbiMgLS0tLS0tLS1cblxuIyBUaGUgc29sZSBqb2Igb2YgdGhlIGNvbXBvc2VyIGlzIHRvIGFsbG93IHZpZXdzIHRvIGJlICdjb21wb3NlZCcuXG4jXG4jIElmIHRoZSB2aWV3IGhhcyBhbHJlYWR5IGJlZW4gY29tcG9zZWQgYnkgYSBwcmV2aW91cyBhY3Rpb24gdGhlbiBub3RoaW5nXG4jIGFwYXJ0IGZyb20gcmVnaXN0ZXJpbmcgdGhlIHZpZXcgYXMgaW4gdXNlIGhhcHBlbnMuIEVsc2UsIHRoZSB2aWV3XG4jIGlzIGluc3RhbnRpYXRlZCBhbmQgcGFzc2VkIHRoZSBvcHRpb25zIHRoYXQgd2VyZSBwYXNzZWQgaW4uIElmIGFuIGFjdGlvblxuIyBpcyByb3V0ZWQgdG8gd2hlcmUgYSB2aWV3IHRoYXQgd2FzIGNvbXBvc2VkIGlzIG5vdCByZS1jb21wb3NlZCwgdGhlXG4jIGNvbXBvc2VkIHZpZXcgaXMgZGlzcG9zZWQuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgQ29tcG9zZXJcbiAgIyBCb3Jyb3cgdGhlIHN0YXRpYyBleHRlbmQgbWV0aG9kIGZyb20gQmFja2JvbmVcbiAgQGV4dGVuZCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZFxuXG4gICMgTWl4aW4gYW4gRXZlbnRCcm9rZXJcbiAgXy5leHRlbmQgQHByb3RvdHlwZSwgRXZlbnRCcm9rZXJcblxuICAjIFRoZSBjb2xsZWN0aW9uIG9mIGNvbXBvc2VkIGNvbXBvc2l0aW9uc1xuICBjb21wb3NpdGlvbnM6IG51bGxcblxuICBjb25zdHJ1Y3RvcjogLT5cbiAgICBAaW5pdGlhbGl6ZSBhcmd1bWVudHMuLi5cblxuICBpbml0aWFsaXplOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICMgSW5pdGlhbGl6ZSBjb2xsZWN0aW9ucy5cbiAgICBAY29tcG9zaXRpb25zID0ge31cblxuICAgICMgU3Vic2NyaWJlIHRvIGV2ZW50cy5cbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyICdjb21wb3Nlcjpjb21wb3NlJywgQGNvbXBvc2UsIHRoaXNcbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyICdjb21wb3NlcjpyZXRyaWV2ZScsIEByZXRyaWV2ZSwgdGhpc1xuICAgIEBzdWJzY3JpYmVFdmVudCAnZGlzcGF0Y2hlcjpkaXNwYXRjaCcsIEBjbGVhbnVwXG5cbiAgIyBDb25zdHJ1Y3RzIGEgY29tcG9zaXRpb24gYW5kIGNvbXBvc2VzIGludG8gdGhlIGFjdGl2ZSBjb21wb3NpdGlvbnMuXG4gICMgVGhpcyBmdW5jdGlvbiBoYXMgc2V2ZXJhbCBmb3JtcyBhcyBkZXNjcmliZWQgYmVsb3c6XG4gICNcbiAgIyAxLiBjb21wb3NlKCduYW1lJywgQ2xhc3NbLCBvcHRpb25zXSlcbiAgIyAgICBDb21wb3NlcyBhIGNsYXNzIG9iamVjdC4gVGhlIG9wdGlvbnMgYXJlIHBhc3NlZCB0byB0aGUgY2xhc3Mgd2hlblxuICAjICAgIGFuIGluc3RhbmNlIGlzIGNvbnRydWN0ZWQgYW5kIGFyZSBmdXJ0aGVyIHVzZWQgdG8gdGVzdCBpZiB0aGVcbiAgIyAgICBjb21wb3NpdGlvbiBzaG91bGQgYmUgcmUtY29tcG9zZWQuXG4gICNcbiAgIyAyLiBjb21wb3NlKCduYW1lJywgZnVuY3Rpb24pXG4gICMgICAgQ29tcG9zZXMgYSBmdW5jdGlvbiB0aGF0IGV4ZWN1dGVzIGluIHRoZSBjb250ZXh0IG9mIHRoZSBjb250cm9sbGVyO1xuICAjICAgIGRvIE5PVCBiaW5kIHRoZSBmdW5jdGlvbiBjb250ZXh0LlxuICAjXG4gICMgMy4gY29tcG9zZSgnbmFtZScsIG9wdGlvbnMsIGZ1bmN0aW9uKVxuICAjICAgIENvbXBvc2VzIGEgZnVuY3Rpb24gdGhhdCBleGVjdXRlcyBpbiB0aGUgY29udGV4dCBvZiB0aGUgY29udHJvbGxlcjtcbiAgIyAgICBkbyBOT1QgYmluZCB0aGUgZnVuY3Rpb24gY29udGV4dCBhbmQgaXMgcGFzc2VkIHRoZSBvcHRpb25zIGFzIGFcbiAgIyAgICBwYXJhbWV0ZXIuIFRoZSBvcHRpb25zIGFyZSBmdXJ0aGVyIHVzZWQgdG8gdGVzdCBpZiB0aGUgY29tcG9zaXRpb25cbiAgIyAgICBzaG91bGQgYmUgcmVjb21wb3NlZC5cbiAgI1xuICAjIDQuIGNvbXBvc2UoJ25hbWUnLCBvcHRpb25zKVxuICAjICAgIEdpdmVzIGNvbnRyb2wgb3ZlciB0aGUgY29tcG9zaXRpb24gcHJvY2VzczsgdGhlIGNvbXBvc2UgbWV0aG9kIG9mXG4gICMgICAgdGhlIG9wdGlvbnMgaGFzaCBpcyBleGVjdXRlZCBpbiBwbGFjZSBvZiB0aGUgZnVuY3Rpb24gb2YgZm9ybSAoMykgYW5kXG4gICMgICAgdGhlIGNoZWNrIG1ldGhvZCBpcyBjYWxsZWQgKGlmIHByZXNlbnQpIHRvIGRldGVybWluZSByZS1jb21wb3NpdGlvbiAoXG4gICMgICAgb3RoZXJ3aXNlIHRoaXMgaXMgdGhlIHNhbWUgYXMgZm9ybSBbM10pLlxuICAjXG4gICMgNS4gY29tcG9zZSgnbmFtZScsIENvbXBvc2l0aW9uQ2xhc3NbLCBvcHRpb25zXSlcbiAgIyAgICBHaXZlcyBjb21wbGV0ZSBjb250cm9sIG92ZXIgdGhlIGNvbXBvc2l0aW9uIHByb2Nlc3MuXG4gICNcbiAgY29tcG9zZTogKG5hbWUsIHNlY29uZCwgdGhpcmQpIC0+XG4gICAgIyBOb3JtYWxpemUgdGhlIGFyZ3VtZW50c1xuICAgICMgSWYgdGhlIHNlY29uZCBwYXJhbWV0ZXIgaXMgYSBmdW5jdGlvbiB3ZSBrbm93IGl0IGlzICgxKSBvciAoMikuXG4gICAgaWYgdHlwZW9mIHNlY29uZCBpcyAnZnVuY3Rpb24nXG4gICAgICAjIFRoaXMgaXMgZm9ybSAoMSkgb3IgKDUpIHdpdGggdGhlIG9wdGlvbmFsIG9wdGlvbnMgaGFzaCBpZiB0aGUgdGhpcmRcbiAgICAgICMgaXMgYW4gb2JqIG9yIHRoZSBzZWNvbmQgcGFyYW1ldGVyJ3MgcHJvdG90eXBlIGhhcyBhIGRpc3Bvc2UgbWV0aG9kXG4gICAgICBpZiB0aGlyZCBvciBzZWNvbmQ6OmRpc3Bvc2VcbiAgICAgICAgIyBJZiB0aGUgY2xhc3MgaXMgYSBDb21wb3NpdGlvbiBjbGFzcyB0aGVuIGl0IGlzIGZvcm0gKDUpLlxuICAgICAgICBpZiBzZWNvbmQucHJvdG90eXBlIGluc3RhbmNlb2YgQ29tcG9zaXRpb25cbiAgICAgICAgICByZXR1cm4gQF9jb21wb3NlIG5hbWUsIGNvbXBvc2l0aW9uOiBzZWNvbmQsIG9wdGlvbnM6IHRoaXJkXG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gQF9jb21wb3NlIG5hbWUsIG9wdGlvbnM6IHRoaXJkLCBjb21wb3NlOiAtPlxuICAgICAgICAgICAgIyBUaGUgY29tcG9zZSBtZXRob2QgaGVyZSBqdXN0IGNvbnN0cnVjdHMgdGhlIGNsYXNzLlxuICAgICAgICAgICAgIyBNb2RlbCBhbmQgQ29sbGVjdGlvbiBib3RoIHRha2UgYG9wdGlvbnNgIGFzIHRoZSBzZWNvbmQgYXJndW1lbnQuXG4gICAgICAgICAgICBpZiBzZWNvbmQucHJvdG90eXBlIGluc3RhbmNlb2YgQmFja2JvbmUuTW9kZWwgb3JcbiAgICAgICAgICAgIHNlY29uZC5wcm90b3R5cGUgaW5zdGFuY2VvZiBCYWNrYm9uZS5Db2xsZWN0aW9uXG4gICAgICAgICAgICAgIEBpdGVtID0gbmV3IHNlY29uZCBudWxsLCBAb3B0aW9uc1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBAaXRlbSA9IG5ldyBzZWNvbmQgQG9wdGlvbnNcblxuICAgICAgICAgICAgIyBSZW5kZXIgdGhpcyBpdGVtIGlmIGl0IGhhcyBhIHJlbmRlciBtZXRob2QgYW5kIGl0IGVpdGhlclxuICAgICAgICAgICAgIyBkb2Vzbid0IGhhdmUgYW4gYXV0b1JlbmRlciBwcm9wZXJ0eSBvciB0aGF0IGF1dG9SZW5kZXJcbiAgICAgICAgICAgICMgcHJvcGVydHkgaXMgZmFsc2VcbiAgICAgICAgICAgIGF1dG9SZW5kZXIgPSBAaXRlbS5hdXRvUmVuZGVyXG4gICAgICAgICAgICBkaXNhYmxlZEF1dG9SZW5kZXIgPSBhdXRvUmVuZGVyIGlzIHVuZGVmaW5lZCBvciBub3QgYXV0b1JlbmRlclxuICAgICAgICAgICAgaWYgZGlzYWJsZWRBdXRvUmVuZGVyIGFuZCB0eXBlb2YgQGl0ZW0ucmVuZGVyIGlzICdmdW5jdGlvbidcbiAgICAgICAgICAgICAgQGl0ZW0ucmVuZGVyKClcblxuICAgICAgIyBUaGlzIGlzIGZvcm0gKDIpLlxuICAgICAgcmV0dXJuIEBfY29tcG9zZSBuYW1lLCBjb21wb3NlOiBzZWNvbmRcblxuICAgICMgSWYgdGhlIHRoaXJkIHBhcmFtZXRlciBleGlzdHMgYW5kIGlzIGEgZnVuY3Rpb24gdGhpcyBpcyAoMykuXG4gICAgaWYgdHlwZW9mIHRoaXJkIGlzICdmdW5jdGlvbidcbiAgICAgIHJldHVybiBAX2NvbXBvc2UgbmFtZSwgY29tcG9zZTogdGhpcmQsIG9wdGlvbnM6IHNlY29uZFxuXG4gICAgIyBUaGlzIG11c3QgYmUgZm9ybSAoNCkuXG4gICAgcmV0dXJuIEBfY29tcG9zZSBuYW1lLCBzZWNvbmRcblxuICBfY29tcG9zZTogKG5hbWUsIG9wdGlvbnMpIC0+XG4gICAgIyBBc3NlcnQgZm9yIHByb2dyYW1tZXIgZXJyb3JzXG4gICAgaWYgdHlwZW9mIG9wdGlvbnMuY29tcG9zZSBpc250ICdmdW5jdGlvbicgYW5kIG5vdCBvcHRpb25zLmNvbXBvc2l0aW9uP1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdDb21wb3NlciNjb21wb3NlIHdhcyB1c2VkIGluY29ycmVjdGx5J1xuXG4gICAgaWYgb3B0aW9ucy5jb21wb3NpdGlvbj9cbiAgICAgICMgVXNlIHRoZSBwYXNzZWQgY29tcG9zaXRpb24gZGlyZWN0bHlcbiAgICAgIGNvbXBvc2l0aW9uID0gbmV3IG9wdGlvbnMuY29tcG9zaXRpb24gb3B0aW9ucy5vcHRpb25zXG4gICAgZWxzZVxuICAgICAgIyBDcmVhdGUgdGhlIGNvbXBvc2l0aW9uIGFuZCBhcHBseSB0aGUgbWV0aG9kcyAoaWYgYXZhaWxhYmxlKVxuICAgICAgY29tcG9zaXRpb24gPSBuZXcgQ29tcG9zaXRpb24gb3B0aW9ucy5vcHRpb25zXG4gICAgICBjb21wb3NpdGlvbi5jb21wb3NlID0gb3B0aW9ucy5jb21wb3NlXG4gICAgICBjb21wb3NpdGlvbi5jaGVjayA9IG9wdGlvbnMuY2hlY2sgaWYgb3B0aW9ucy5jaGVja1xuXG4gICAgIyBDaGVjayBmb3IgYW4gZXhpc3RpbmcgY29tcG9zaXRpb25cbiAgICBjdXJyZW50ID0gQGNvbXBvc2l0aW9uc1tuYW1lXVxuXG4gICAgIyBBcHBseSB0aGUgY2hlY2sgbWV0aG9kXG4gICAgaWYgY3VycmVudCBhbmQgY3VycmVudC5jaGVjayBjb21wb3NpdGlvbi5vcHRpb25zXG4gICAgICAjIE1hcmsgdGhlIGN1cnJlbnQgY29tcG9zaXRpb24gYXMgbm90IHN0YWxlXG4gICAgICBjdXJyZW50LnN0YWxlIGZhbHNlXG4gICAgZWxzZVxuICAgICAgIyBSZW1vdmUgdGhlIGN1cnJlbnQgY29tcG9zaXRpb24gYW5kIGFwcGx5IHRoaXMgb25lXG4gICAgICBjdXJyZW50LmRpc3Bvc2UoKSBpZiBjdXJyZW50XG4gICAgICByZXR1cm5lZCA9IGNvbXBvc2l0aW9uLmNvbXBvc2UgY29tcG9zaXRpb24ub3B0aW9uc1xuICAgICAgaXNQcm9taXNlID0gdHlwZW9mIHJldHVybmVkPy50aGVuIGlzICdmdW5jdGlvbidcbiAgICAgIGNvbXBvc2l0aW9uLnN0YWxlIGZhbHNlXG4gICAgICBAY29tcG9zaXRpb25zW25hbWVdID0gY29tcG9zaXRpb25cblxuICAgICMgUmV0dXJuIHRoZSBhY3RpdmUgY29tcG9zaXRpb25cbiAgICBpZiBpc1Byb21pc2VcbiAgICAgIHJldHVybmVkXG4gICAgZWxzZVxuICAgICAgQGNvbXBvc2l0aW9uc1tuYW1lXS5pdGVtXG5cbiAgIyBSZXRyaWV2ZXMgYW4gYWN0aXZlIGNvbXBvc2l0aW9uIHVzaW5nIHRoZSBjb21wb3NlIG1ldGhvZC5cbiAgcmV0cmlldmU6IChuYW1lKSAtPlxuICAgIGFjdGl2ZSA9IEBjb21wb3NpdGlvbnNbbmFtZV1cbiAgICBpZiBhY3RpdmUgYW5kIG5vdCBhY3RpdmUuc3RhbGUoKSB0aGVuIGFjdGl2ZS5pdGVtXG5cbiAgIyBEZWNsYXJlIGFsbCBjb21wb3NpdGlvbnMgYXMgc3RhbGUgYW5kIHJlbW92ZSBhbGwgdGhhdCB3ZXJlIHByZXZpb3VzbHlcbiAgIyBtYXJrZWQgc3RhbGUgd2l0aG91dCBiZWluZyByZS1jb21wb3NlZC5cbiAgY2xlYW51cDogLT5cbiAgICAjIEFjdGlvbiBtZXRob2QgaXMgZG9uZTsgcGVyZm9ybSBwb3N0LWFjdGlvbiBjbGVhbiB1cFxuICAgICMgRGlzcG9zZSBhbmQgZGVsZXRlIGFsbCBuby1sb25nZXItYWN0aXZlIGNvbXBvc2l0aW9ucy5cbiAgICAjIERlY2xhcmUgYWxsIGFjdGl2ZSBjb21wb3NpdGlvbnMgYXMgZGUtYWN0aXZhdGVkIChlZy4gdG8gYmUgcmVtb3ZlZFxuICAgICMgb24gdGhlIG5leHQgY29udHJvbGxlciBzdGFydHVwIHVubGVzcyB0aGV5IGFyZSByZS1jb21wb3NlZCkuXG4gICAgZm9yIGtleSBpbiBPYmplY3Qua2V5cyBAY29tcG9zaXRpb25zXG4gICAgICBjb21wb3NpdGlvbiA9IEBjb21wb3NpdGlvbnNba2V5XVxuICAgICAgaWYgY29tcG9zaXRpb24uc3RhbGUoKVxuICAgICAgICBjb21wb3NpdGlvbi5kaXNwb3NlKClcbiAgICAgICAgZGVsZXRlIEBjb21wb3NpdGlvbnNba2V5XVxuICAgICAgZWxzZVxuICAgICAgICBjb21wb3NpdGlvbi5zdGFsZSB0cnVlXG5cbiAgICAjIFJldHVybiBub3RoaW5nLlxuICAgIHJldHVyblxuXG4gIGRpc3Bvc2VkOiBmYWxzZVxuXG4gIGRpc3Bvc2U6IC0+XG4gICAgcmV0dXJuIGlmIEBkaXNwb3NlZFxuXG4gICAgIyBVbmJpbmQgaGFuZGxlcnMgb2YgZ2xvYmFsIGV2ZW50c1xuICAgIEB1bnN1YnNjcmliZUFsbEV2ZW50cygpXG5cbiAgICBtZWRpYXRvci5yZW1vdmVIYW5kbGVycyB0aGlzXG5cbiAgICAjIERpc3Bvc2Ugb2YgYWxsIGNvbXBvc2l0aW9ucyBhbmQgdGhlaXIgaXRlbXMgKHRoYXQgY2FuIGJlKVxuICAgIGZvciBrZXkgaW4gT2JqZWN0LmtleXMgQGNvbXBvc2l0aW9uc1xuICAgICAgQGNvbXBvc2l0aW9uc1trZXldLmRpc3Bvc2UoKVxuXG4gICAgIyBSZW1vdmUgcHJvcGVydGllc1xuICAgIGRlbGV0ZSBAY29tcG9zaXRpb25zXG5cbiAgICAjIEZpbmlzaGVkXG4gICAgQGRpc3Bvc2VkID0gdHJ1ZVxuXG4gICAgIyBZb3XigJlyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ04oCZcyBub3Qgb3BlblxuICAgIE9iamVjdC5mcmVlemUgdGhpc1xuIiwiJ3VzZSBzdHJpY3QnXG5cbl8gPSByZXF1aXJlICd1bmRlcnNjb3JlJ1xuQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZSdcblxubWVkaWF0b3IgPSByZXF1aXJlICcuLi9tZWRpYXRvcidcbkV2ZW50QnJva2VyID0gcmVxdWlyZSAnLi4vbGliL2V2ZW50X2Jyb2tlcidcbnV0aWxzID0gcmVxdWlyZSAnLi4vbGliL3V0aWxzJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIENvbnRyb2xsZXJcbiAgIyBCb3Jyb3cgdGhlIHN0YXRpYyBleHRlbmQgbWV0aG9kIGZyb20gQmFja2JvbmUuXG4gIEBleHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmRcblxuICAjIE1peGluIEJhY2tib25lIGV2ZW50cyBhbmQgRXZlbnRCcm9rZXIuXG4gIF8uZXh0ZW5kIEBwcm90b3R5cGUsIEJhY2tib25lLkV2ZW50c1xuICBfLmV4dGVuZCBAcHJvdG90eXBlLCBFdmVudEJyb2tlclxuXG4gIHZpZXc6IG51bGxcblxuICAjIEludGVybmFsIGZsYWcgd2hpY2ggc3RvcmVzIHdoZXRoZXIgYHJlZGlyZWN0VG9gXG4gICMgd2FzIGNhbGxlZCBpbiB0aGUgY3VycmVudCBhY3Rpb24uXG4gIHJlZGlyZWN0ZWQ6IGZhbHNlXG5cbiAgY29uc3RydWN0b3I6IC0+XG4gICAgQGluaXRpYWxpemUgYXJndW1lbnRzLi4uXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICAjIEVtcHR5IHBlciBkZWZhdWx0LlxuXG4gIGJlZm9yZUFjdGlvbjogLT5cbiAgICAjIEVtcHR5IHBlciBkZWZhdWx0LlxuXG4gICMgQ2hhbmdlIGRvY3VtZW50IHRpdGxlLlxuICBhZGp1c3RUaXRsZTogKHN1YnRpdGxlKSAtPlxuICAgIG1lZGlhdG9yLmV4ZWN1dGUgJ2FkanVzdFRpdGxlJywgc3VidGl0bGVcblxuICAjIENvbXBvc2VyXG4gICMgLS0tLS0tLS1cblxuICAjIENvbnZlbmllbmNlIG1ldGhvZCB0byBwdWJsaXNoIHRoZSBgIWNvbXBvc2VyOmNvbXBvc2VgIGV2ZW50LiBTZWUgdGhlXG4gICMgY29tcG9zZXIgZm9yIGluZm9ybWF0aW9uIG9uIHBhcmFtZXRlcnMsIGV0Yy5cbiAgcmV1c2U6IC0+XG4gICAgbWV0aG9kID0gaWYgYXJndW1lbnRzLmxlbmd0aCBpcyAxIHRoZW4gJ3JldHJpZXZlJyBlbHNlICdjb21wb3NlJ1xuICAgIG1lZGlhdG9yLmV4ZWN1dGUgXCJjb21wb3Nlcjoje21ldGhvZH1cIiwgYXJndW1lbnRzLi4uXG5cbiAgIyBEZXByZWNhdGVkIG1ldGhvZC5cbiAgY29tcG9zZTogLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJ0NvbnRyb2xsZXIjY29tcG9zZSB3YXMgbW92ZWQgdG8gQ29udHJvbGxlciNyZXVzZSdcblxuICAjIFJlZGlyZWN0aW9uXG4gICMgLS0tLS0tLS0tLS1cblxuICAjIFJlZGlyZWN0IHRvIFVSTC5cbiAgcmVkaXJlY3RUbzogLT5cbiAgICBAcmVkaXJlY3RlZCA9IHRydWVcbiAgICB1dGlscy5yZWRpcmVjdFRvIGFyZ3VtZW50cy4uLlxuXG4gICMgRGlzcG9zYWxcbiAgIyAtLS0tLS0tLVxuXG4gIGRpc3Bvc2VkOiBmYWxzZVxuXG4gIGRpc3Bvc2U6IC0+XG4gICAgcmV0dXJuIGlmIEBkaXNwb3NlZFxuXG4gICAgIyBEaXNwb3NlIGFuZCBkZWxldGUgYWxsIG1lbWJlcnMgd2hpY2ggYXJlIGRpc3Bvc2FibGUuXG4gICAgZm9yIGtleSBpbiBPYmplY3Qua2V5cyB0aGlzXG4gICAgICBtZW1iZXIgPSBAW2tleV1cbiAgICAgIGlmIHR5cGVvZiBtZW1iZXI/LmRpc3Bvc2UgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICBtZW1iZXIuZGlzcG9zZSgpXG4gICAgICAgIGRlbGV0ZSBAW2tleV1cblxuICAgICMgVW5iaW5kIGhhbmRsZXJzIG9mIGdsb2JhbCBldmVudHMuXG4gICAgQHVuc3Vic2NyaWJlQWxsRXZlbnRzKClcblxuICAgICMgVW5iaW5kIGFsbCByZWZlcmVuY2VkIGhhbmRsZXJzLlxuICAgIEBzdG9wTGlzdGVuaW5nKClcblxuICAgICMgRmluaXNoZWQuXG4gICAgQGRpc3Bvc2VkID0gdHJ1ZVxuXG4gICAgIyBZb3UncmUgZnJvemVuIHdoZW4geW91ciBoZWFydOKAmXMgbm90IG9wZW4uXG4gICAgT2JqZWN0LmZyZWV6ZSB0aGlzXG4iLCIndXNlIHN0cmljdCdcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuXG5FdmVudEJyb2tlciA9IHJlcXVpcmUgJy4vbGliL2V2ZW50X2Jyb2tlcidcbnV0aWxzID0gcmVxdWlyZSAnLi9saWIvdXRpbHMnXG5tZWRpYXRvciA9IHJlcXVpcmUgJy4vbWVkaWF0b3InXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgRGlzcGF0Y2hlclxuICAjIEJvcnJvdyB0aGUgc3RhdGljIGV4dGVuZCBtZXRob2QgZnJvbSBCYWNrYm9uZS5cbiAgQGV4dGVuZCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZFxuXG4gICMgTWl4aW4gYW4gRXZlbnRCcm9rZXIuXG4gIF8uZXh0ZW5kIEBwcm90b3R5cGUsIEV2ZW50QnJva2VyXG5cbiAgIyBUaGUgcHJldmlvdXMgcm91dGUgaW5mb3JtYXRpb24uXG4gICMgVGhpcyBvYmplY3QgY29udGFpbnMgdGhlIGNvbnRyb2xsZXIgbmFtZSwgYWN0aW9uLCBwYXRoLCBhbmQgbmFtZSAoaWYgYW55KS5cbiAgcHJldmlvdXNSb3V0ZTogbnVsbFxuXG4gICMgVGhlIGN1cnJlbnQgY29udHJvbGxlciwgcm91dGUgaW5mb3JtYXRpb24sIGFuZCBwYXJhbWV0ZXJzLlxuICAjIFRoZSBjdXJyZW50IHJvdXRlIG9iamVjdCBjb250YWlucyB0aGUgc2FtZSBpbmZvcm1hdGlvbiBhcyBwcmV2aW91cy5cbiAgY3VycmVudENvbnRyb2xsZXI6IG51bGxcbiAgY3VycmVudFJvdXRlOiBudWxsXG4gIGN1cnJlbnRQYXJhbXM6IG51bGxcbiAgY3VycmVudFF1ZXJ5OiBudWxsXG5cbiAgY29uc3RydWN0b3I6IC0+XG4gICAgQGluaXRpYWxpemUgYXJndW1lbnRzLi4uXG5cbiAgaW5pdGlhbGl6ZTogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICAjIE1lcmdlIHRoZSBvcHRpb25zLlxuICAgIEBzZXR0aW5ncyA9IF8uZGVmYXVsdHMgb3B0aW9ucyxcbiAgICAgIGNvbnRyb2xsZXJQYXRoOiAnY29udHJvbGxlcnMvJ1xuICAgICAgY29udHJvbGxlclN1ZmZpeDogJ19jb250cm9sbGVyJ1xuXG4gICAgIyBMaXN0ZW4gdG8gZ2xvYmFsIGV2ZW50cy5cbiAgICBAc3Vic2NyaWJlRXZlbnQgJ3JvdXRlcjptYXRjaCcsIEBkaXNwYXRjaFxuXG4gICMgQ29udHJvbGxlciBtYW5hZ2VtZW50LlxuICAjIFN0YXJ0aW5nIGFuZCBkaXNwb3NpbmcgY29udHJvbGxlcnMuXG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICMgVGhlIHN0YW5kYXJkIGZsb3cgaXM6XG4gICNcbiAgIyAgIDEuIFRlc3QgaWYgaXTigJlzIGEgbmV3IGNvbnRyb2xsZXIvYWN0aW9uIHdpdGggbmV3IHBhcmFtc1xuICAjICAgMS4gSGlkZSB0aGUgcHJldmlvdXMgdmlld1xuICAjICAgMi4gRGlzcG9zZSB0aGUgcHJldmlvdXMgY29udHJvbGxlclxuICAjICAgMy4gSW5zdGFudGlhdGUgdGhlIG5ldyBjb250cm9sbGVyLCBjYWxsIHRoZSBjb250cm9sbGVyIGFjdGlvblxuICAjICAgNC4gU2hvdyB0aGUgbmV3IHZpZXdcbiAgI1xuICBkaXNwYXRjaDogKHJvdXRlLCBwYXJhbXMsIG9wdGlvbnMpIC0+XG4gICAgIyBDbG9uZSBwYXJhbXMgYW5kIG9wdGlvbnMgc28gdGhlIG9yaWdpbmFsIG9iamVjdHMgcmVtYWluIHVudG91Y2hlZC5cbiAgICBwYXJhbXMgPSBfLmV4dGVuZCB7fSwgcGFyYW1zXG4gICAgb3B0aW9ucyA9IF8uZXh0ZW5kIHt9LCBvcHRpb25zXG5cbiAgICAjIG51bGwgb3IgdW5kZWZpbmVkIHF1ZXJ5IHBhcmFtZXRlcnMgYXJlIGVxdWl2YWxlbnQgdG8gYW4gZW1wdHkgaGFzaFxuICAgIG9wdGlvbnMucXVlcnkgPSB7fSBpZiBub3Qgb3B0aW9ucy5xdWVyeT9cblxuICAgICMgV2hldGhlciB0byBmb3JjZSB0aGUgY29udHJvbGxlciBzdGFydHVwIGV2ZW5cbiAgICAjIGlmIGN1cnJlbnQgYW5kIG5ldyBjb250cm9sbGVycyBhbmQgcGFyYW1zIG1hdGNoXG4gICAgIyBEZWZhdWx0IHRvIGZhbHNlIHVubGVzcyBleHBsaWNpdGx5IHNldCB0byB0cnVlLlxuICAgIG9wdGlvbnMuZm9yY2VTdGFydHVwID0gZmFsc2UgdW5sZXNzIG9wdGlvbnMuZm9yY2VTdGFydHVwIGlzIHRydWVcblxuICAgICMgU3RvcCBpZiB0aGUgZGVzaXJlZCBjb250cm9sbGVyL2FjdGlvbiBpcyBhbHJlYWR5IGFjdGl2ZVxuICAgICMgd2l0aCB0aGUgc2FtZSBwYXJhbXMuXG4gICAgcmV0dXJuIGlmIG5vdCBvcHRpb25zLmZvcmNlU3RhcnR1cCBhbmRcbiAgICAgIEBjdXJyZW50Um91dGU/LmNvbnRyb2xsZXIgaXMgcm91dGUuY29udHJvbGxlciBhbmRcbiAgICAgIEBjdXJyZW50Um91dGU/LmFjdGlvbiBpcyByb3V0ZS5hY3Rpb24gYW5kXG4gICAgICBfLmlzRXF1YWwoQGN1cnJlbnRQYXJhbXMsIHBhcmFtcykgYW5kXG4gICAgICBfLmlzRXF1YWwoQGN1cnJlbnRRdWVyeSwgb3B0aW9ucy5xdWVyeSlcblxuICAgICMgRmV0Y2ggdGhlIG5ldyBjb250cm9sbGVyLCB0aGVuIGdvIG9uLlxuICAgIEBsb2FkQ29udHJvbGxlciByb3V0ZS5jb250cm9sbGVyLCAoQ29udHJvbGxlcikgPT5cbiAgICAgIEBjb250cm9sbGVyTG9hZGVkIHJvdXRlLCBwYXJhbXMsIG9wdGlvbnMsIENvbnRyb2xsZXJcblxuICAjIExvYWQgdGhlIGNvbnN0cnVjdG9yIGZvciBhIGdpdmVuIGNvbnRyb2xsZXIgbmFtZS5cbiAgIyBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiB1c2VzIHJlcXVpcmUoKSBmcm9tIGEgQU1EIG1vZHVsZSBsb2FkZXJcbiAgIyBsaWtlIFJlcXVpcmVKUyB0byBmZXRjaCB0aGUgY29uc3RydWN0b3IuXG4gIGxvYWRDb250cm9sbGVyOiAobmFtZSwgaGFuZGxlcikgLT5cbiAgICByZXR1cm4gaGFuZGxlciBuYW1lIGlmIG5hbWUgaXMgT2JqZWN0IG5hbWVcblxuICAgIGZpbGVOYW1lID0gbmFtZSArIEBzZXR0aW5ncy5jb250cm9sbGVyU3VmZml4XG4gICAgbW9kdWxlTmFtZSA9IEBzZXR0aW5ncy5jb250cm9sbGVyUGF0aCArIGZpbGVOYW1lXG4gICAgdXRpbHMubG9hZE1vZHVsZSBtb2R1bGVOYW1lLCBoYW5kbGVyXG5cbiAgIyBIYW5kbGVyIGZvciB0aGUgY29udHJvbGxlciBsYXp5LWxvYWRpbmcuXG4gIGNvbnRyb2xsZXJMb2FkZWQ6IChyb3V0ZSwgcGFyYW1zLCBvcHRpb25zLCBDb250cm9sbGVyKSAtPlxuICAgIGlmIEBuZXh0UHJldmlvdXNSb3V0ZSA9IEBjdXJyZW50Um91dGVcbiAgICAgIHByZXZpb3VzID0gXy5leHRlbmQge30sIEBuZXh0UHJldmlvdXNSb3V0ZVxuICAgICAgcHJldmlvdXMucGFyYW1zID0gQGN1cnJlbnRQYXJhbXMgaWYgQGN1cnJlbnRQYXJhbXM/XG4gICAgICBkZWxldGUgcHJldmlvdXMucHJldmlvdXMgaWYgcHJldmlvdXMucHJldmlvdXNcbiAgICAgIHByZXYgPSB7cHJldmlvdXN9XG4gICAgQG5leHRDdXJyZW50Um91dGUgPSBfLmV4dGVuZCB7fSwgcm91dGUsIHByZXZcblxuICAgIGNvbnRyb2xsZXIgPSBuZXcgQ29udHJvbGxlciBwYXJhbXMsIEBuZXh0Q3VycmVudFJvdXRlLCBvcHRpb25zXG4gICAgQGV4ZWN1dGVCZWZvcmVBY3Rpb24gY29udHJvbGxlciwgQG5leHRDdXJyZW50Um91dGUsIHBhcmFtcywgb3B0aW9uc1xuXG4gICMgRXhlY3V0ZXMgY29udHJvbGxlciBhY3Rpb24uXG4gIGV4ZWN1dGVBY3Rpb246IChjb250cm9sbGVyLCByb3V0ZSwgcGFyYW1zLCBvcHRpb25zKSAtPlxuICAgICMgRGlzcG9zZSB0aGUgcHJldmlvdXMgY29udHJvbGxlci5cbiAgICBpZiBAY3VycmVudENvbnRyb2xsZXJcbiAgICAgICMgTm90aWZ5IHRoZSByZXN0IG9mIHRoZSB3b3JsZCBiZWZvcmVoYW5kLlxuICAgICAgQHB1Ymxpc2hFdmVudCAnYmVmb3JlQ29udHJvbGxlckRpc3Bvc2UnLCBAY3VycmVudENvbnRyb2xsZXJcblxuICAgICAgIyBQYXNzaW5nIG5ldyBwYXJhbWV0ZXJzIHRoYXQgdGhlIGFjdGlvbiBtZXRob2Qgd2lsbCByZWNlaXZlLlxuICAgICAgQGN1cnJlbnRDb250cm9sbGVyLmRpc3Bvc2UgcGFyYW1zLCByb3V0ZSwgb3B0aW9uc1xuXG4gICAgIyBTYXZlIHRoZSBuZXcgY29udHJvbGxlciBhbmQgaXRzIHBhcmFtZXRlcnMuXG4gICAgQGN1cnJlbnRDb250cm9sbGVyID0gY29udHJvbGxlclxuICAgIEBjdXJyZW50UGFyYW1zID0gXy5leHRlbmQge30sIHBhcmFtc1xuICAgIEBjdXJyZW50UXVlcnkgPSBfLmV4dGVuZCB7fSwgb3B0aW9ucy5xdWVyeVxuXG4gICAgIyBDYWxsIHRoZSBjb250cm9sbGVyIGFjdGlvbiB3aXRoIHBhcmFtcyBhbmQgb3B0aW9ucy5cbiAgICBjb250cm9sbGVyW3JvdXRlLmFjdGlvbl0gcGFyYW1zLCByb3V0ZSwgb3B0aW9uc1xuXG4gICAgIyBTdG9wIGlmIHRoZSBhY3Rpb24gdHJpZ2dlcmVkIGEgcmVkaXJlY3QuXG4gICAgcmV0dXJuIGlmIGNvbnRyb2xsZXIucmVkaXJlY3RlZFxuXG4gICAgIyBXZSdyZSBkb25lISBTcHJlYWQgdGhlIHdvcmQhXG4gICAgQHB1Ymxpc2hFdmVudCAnZGlzcGF0Y2hlcjpkaXNwYXRjaCcsIEBjdXJyZW50Q29udHJvbGxlcixcbiAgICAgIHBhcmFtcywgcm91dGUsIG9wdGlvbnNcblxuICAjIEV4ZWN1dGVzIGJlZm9yZSBhY3Rpb24gZmlsdGVyZXIuXG4gIGV4ZWN1dGVCZWZvcmVBY3Rpb246IChjb250cm9sbGVyLCByb3V0ZSwgcGFyYW1zLCBvcHRpb25zKSAtPlxuICAgIGJlZm9yZSA9IGNvbnRyb2xsZXIuYmVmb3JlQWN0aW9uXG5cbiAgICBleGVjdXRlQWN0aW9uID0gPT5cbiAgICAgIGlmIGNvbnRyb2xsZXIucmVkaXJlY3RlZCBvciBAY3VycmVudFJvdXRlIGFuZCByb3V0ZSBpcyBAY3VycmVudFJvdXRlXG4gICAgICAgIEBuZXh0UHJldmlvdXNSb3V0ZSA9IEBuZXh0Q3VycmVudFJvdXRlID0gbnVsbFxuICAgICAgICBjb250cm9sbGVyLmRpc3Bvc2UoKVxuICAgICAgICByZXR1cm5cbiAgICAgIEBwcmV2aW91c1JvdXRlID0gQG5leHRQcmV2aW91c1JvdXRlXG4gICAgICBAY3VycmVudFJvdXRlID0gQG5leHRDdXJyZW50Um91dGVcbiAgICAgIEBuZXh0UHJldmlvdXNSb3V0ZSA9IEBuZXh0Q3VycmVudFJvdXRlID0gbnVsbFxuICAgICAgQGV4ZWN1dGVBY3Rpb24gY29udHJvbGxlciwgcm91dGUsIHBhcmFtcywgb3B0aW9uc1xuXG4gICAgdW5sZXNzIGJlZm9yZVxuICAgICAgZXhlY3V0ZUFjdGlvbigpXG4gICAgICByZXR1cm5cblxuICAgICMgVGhyb3cgZGVwcmVjYXRpb24gd2FybmluZy5cbiAgICBpZiB0eXBlb2YgYmVmb3JlIGlzbnQgJ2Z1bmN0aW9uJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnQ29udHJvbGxlciNiZWZvcmVBY3Rpb246IGZ1bmN0aW9uIGV4cGVjdGVkLiAnICtcbiAgICAgICAgJ09sZCBvYmplY3QtbGlrZSBmb3JtIGlzIG5vdCBzdXBwb3J0ZWQuJ1xuXG4gICAgIyBFeGVjdXRlIGFjdGlvbiBpbiBjb250cm9sbGVyIGNvbnRleHQuXG4gICAgcHJvbWlzZSA9IGNvbnRyb2xsZXIuYmVmb3JlQWN0aW9uIHBhcmFtcywgcm91dGUsIG9wdGlvbnNcbiAgICBpZiB0eXBlb2YgcHJvbWlzZT8udGhlbiBpcyAnZnVuY3Rpb24nXG4gICAgICBwcm9taXNlLnRoZW4gZXhlY3V0ZUFjdGlvblxuICAgIGVsc2VcbiAgICAgIGV4ZWN1dGVBY3Rpb24oKVxuXG4gICMgRGlzcG9zYWxcbiAgIyAtLS0tLS0tLVxuXG4gIGRpc3Bvc2VkOiBmYWxzZVxuXG4gIGRpc3Bvc2U6IC0+XG4gICAgcmV0dXJuIGlmIEBkaXNwb3NlZFxuXG4gICAgQHVuc3Vic2NyaWJlQWxsRXZlbnRzKClcblxuICAgIEBkaXNwb3NlZCA9IHRydWVcblxuICAgICMgWW914oCZcmUgZnJvemVuIHdoZW4geW91ciBoZWFydOKAmXMgbm90IG9wZW4uXG4gICAgT2JqZWN0LmZyZWV6ZSB0aGlzXG4iLCIndXNlIHN0cmljdCdcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuRXZlbnRCcm9rZXIgPSByZXF1aXJlICcuL2V2ZW50X2Jyb2tlcidcblxuIyBDb21wb3NpdGlvblxuIyAtLS0tLS0tLS0tLVxuXG4jIEEgdXRpbGl0eSBjbGFzcyB0aGF0IGlzIG1lYW50IGFzIGEgc2ltcGxlIHByb3hpZWQgdmVyc2lvbiBvZiBhXG4jIGNvbnRyb2xsZXIgdGhhdCBpcyB1c2VkIGludGVybmFsbHkgdG8gaW5mbGF0ZSBzaW1wbGVcbiMgY2FsbHMgdG8gIWNvbXBvc2VyOmNvbXBvc2UgYW5kIG1heSBiZSBleHRlbmRlZCBhbmQgdXNlZCB0byBoYXZlIGNvbXBsZXRlXG4jIGNvbnRyb2wgb3ZlciB0aGUgY29tcG9zaXRpb24gcHJvY2Vzcy5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgQ29tcG9zaXRpb25cbiAgIyBCb3Jyb3cgdGhlIHN0YXRpYyBleHRlbmQgbWV0aG9kIGZyb20gQmFja2JvbmUuXG4gIEBleHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmRcblxuICAjIE1peGluIEJhY2tib25lIGV2ZW50cyBhbmQgRXZlbnRCcm9rZXIuXG4gIF8uZXh0ZW5kIEBwcm90b3R5cGUsIEJhY2tib25lLkV2ZW50c1xuICBfLmV4dGVuZCBAcHJvdG90eXBlLCBFdmVudEJyb2tlclxuXG4gICMgVGhlIGl0ZW0gdGhhdCBpcyBjb21wb3NlZDsgdGhpcyBpcyBieSBkZWZhdWx0IGEgcmVmZXJlbmNlIHRvIHRoaXMuXG4gIGl0ZW06IG51bGxcblxuICAjIFRoZSBvcHRpb25zIHRoYXQgdGhpcyBjb21wb3NpdGlvbiB3YXMgY29uc3RydWN0ZWQgd2l0aC5cbiAgb3B0aW9uczogbnVsbFxuXG4gICMgV2hldGhlciB0aGlzIGNvbXBvc2l0aW9uIGlzIGN1cnJlbnRseSBzdGFsZS5cbiAgX3N0YWxlOiBmYWxzZVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICBAb3B0aW9ucyA9IF8uZXh0ZW5kIHt9LCBvcHRpb25zXG4gICAgQGl0ZW0gPSB0aGlzXG4gICAgQGluaXRpYWxpemUgQG9wdGlvbnNcblxuICBpbml0aWFsaXplOiAtPlxuICAgICMgRW1wdHkgcGVyIGRlZmF1bHQuXG5cbiAgIyBUaGUgY29tcG9zZSBtZXRob2QgaXMgY2FsbGVkIHdoZW4gdGhpcyBjb21wb3NpdGlvbiBpcyB0byBiZSBjb21wb3NlZC5cbiAgY29tcG9zZTogLT5cbiAgICAjIEVtcHR5IHBlciBkZWZhdWx0LlxuXG4gICMgVGhlIGNoZWNrIG1ldGhvZCBpcyBjYWxsZWQgd2hlbiB0aGlzIGNvbXBvc2l0aW9uIGlzIGFza2VkIHRvIGJlXG4gICMgY29tcG9zZWQgYWdhaW4uIFRoZSBwYXNzZWQgb3B0aW9ucyBhcmUgdGhlIG5ld2x5IHBhc3NlZCBvcHRpb25zLlxuICAjIElmIHRoaXMgcmV0dXJucyBmYWxzZSB0aGVuIHRoZSBjb21wb3NpdGlvbiBpcyByZS1jb21wb3NlZC5cbiAgY2hlY2s6IChvcHRpb25zKSAtPlxuICAgIF8uaXNFcXVhbCBAb3B0aW9ucywgb3B0aW9uc1xuXG4gICMgTWFya3MgYWxsIGFwcGxpY2FibGUgaXRlbXMgYXMgc3RhbGUuXG4gIHN0YWxlOiAodmFsdWUpIC0+XG4gICAgIyBSZXR1cm4gdGhlIGN1cnJlbnQgcHJvcGVydHkgaWYgbm90IHJlcXVlc3RpbmcgYSBjaGFuZ2UuXG4gICAgcmV0dXJuIEBfc3RhbGUgdW5sZXNzIHZhbHVlP1xuXG4gICAgIyBTZXRzIHRoZSBzdGFsZSBwcm9wZXJ0eSBmb3IgZXZlcnkgaXRlbSBpbiB0aGUgY29tcG9zaXRpb24gdGhhdCBoYXMgaXQuXG4gICAgQF9zdGFsZSA9IHZhbHVlXG4gICAgZm9yIG5hbWUsIGl0ZW0gb2YgdGhpcyB3aGVuIChcbiAgICAgIGl0ZW0gYW5kIGl0ZW0gaXNudCB0aGlzIGFuZFxuICAgICAgdHlwZW9mIGl0ZW0gaXMgJ29iamVjdCcgYW5kIGl0ZW0uaGFzT3duUHJvcGVydHkgJ3N0YWxlJ1xuICAgIClcbiAgICAgIGl0ZW0uc3RhbGUgPSB2YWx1ZVxuXG4gICAgIyBSZXR1cm4gbm90aGluZy5cbiAgICByZXR1cm5cblxuICAjIERpc3Bvc2FsXG4gICMgLS0tLS0tLS1cblxuICBkaXNwb3NlZDogZmFsc2VcblxuICBkaXNwb3NlOiAtPlxuICAgIHJldHVybiBpZiBAZGlzcG9zZWRcblxuICAgICMgRGlzcG9zZSBhbmQgZGVsZXRlIGFsbCBtZW1iZXJzIHdoaWNoIGFyZSBkaXNwb3NhYmxlLlxuICAgIGZvciBrZXkgaW4gT2JqZWN0LmtleXMgdGhpc1xuICAgICAgbWVtYmVyID0gQFtrZXldXG4gICAgICBpZiBtZW1iZXIgYW5kIG1lbWJlciBpc250IHRoaXMgYW5kXG4gICAgICB0eXBlb2YgbWVtYmVyLmRpc3Bvc2UgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICBtZW1iZXIuZGlzcG9zZSgpXG4gICAgICAgIGRlbGV0ZSBAW2tleV1cblxuICAgICMgVW5iaW5kIGhhbmRsZXJzIG9mIGdsb2JhbCBldmVudHMuXG4gICAgQHVuc3Vic2NyaWJlQWxsRXZlbnRzKClcblxuICAgICMgVW5iaW5kIGFsbCByZWZlcmVuY2VkIGhhbmRsZXJzLlxuICAgIEBzdG9wTGlzdGVuaW5nKClcblxuICAgICMgUmVtb3ZlIHByb3BlcnRpZXMgd2hpY2ggYXJlIG5vdCBkaXNwb3NhYmxlLlxuICAgIGRlbGV0ZSB0aGlzLnJlZGlyZWN0ZWRcblxuICAgICMgRmluaXNoZWQuXG4gICAgQGRpc3Bvc2VkID0gdHJ1ZVxuXG4gICAgIyBZb3UncmUgZnJvemVuIHdoZW4geW91ciBoZWFydOKAmXMgbm90IG9wZW4uXG4gICAgT2JqZWN0LmZyZWV6ZSB0aGlzXG4iLCIndXNlIHN0cmljdCdcblxubWVkaWF0b3IgPSByZXF1aXJlICcuLi9tZWRpYXRvcidcblxuIyBBZGQgZnVuY3Rpb25hbGl0eSB0byBzdWJzY3JpYmUgYW5kIHB1Ymxpc2ggdG8gZ2xvYmFsXG4jIFB1Ymxpc2gvU3Vic2NyaWJlIGV2ZW50cyBzbyB0aGV5IGNhbiBiZSByZW1vdmVkIGFmdGVyd2FyZHNcbiMgd2hlbiBkaXNwb3NpbmcgdGhlIG9iamVjdC5cbiNcbiMgTWl4aW4gdGhpcyBvYmplY3QgdG8gYWRkIHRoZSBzdWJzY3JpYmVyIGNhcGFiaWxpdHkgdG8gYW55IG9iamVjdDpcbiMgXy5leHRlbmQgb2JqZWN0LCBFdmVudEJyb2tlclxuIyBPciB0byBhIHByb3RvdHlwZSBvZiBhIGNsYXNzOlxuIyBfLmV4dGVuZCBAcHJvdG90eXBlLCBFdmVudEJyb2tlclxuI1xuIyBTaW5jZSBCYWNrYm9uZSAwLjkuMiB0aGlzIGFic3RyYWN0aW9uIGp1c3Qgc2VydmVzIHRoZSBwdXJwb3NlXG4jIHRoYXQgYSBoYW5kbGVyIGNhbm5vdCBiZSByZWdpc3RlcmVkIHR3aWNlIGZvciB0aGUgc2FtZSBldmVudC5cblxuRXZlbnRCcm9rZXIgPVxuICBzdWJzY3JpYmVFdmVudDogKHR5cGUsIGhhbmRsZXIpIC0+XG4gICAgaWYgdHlwZW9mIHR5cGUgaXNudCAnc3RyaW5nJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnRXZlbnRCcm9rZXIjc3Vic2NyaWJlRXZlbnQ6ICcgK1xuICAgICAgICAndHlwZSBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgIGlmIHR5cGVvZiBoYW5kbGVyIGlzbnQgJ2Z1bmN0aW9uJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnRXZlbnRCcm9rZXIjc3Vic2NyaWJlRXZlbnQ6ICcgK1xuICAgICAgICAnaGFuZGxlciBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nXG5cbiAgICAjIEVuc3VyZSB0aGF0IGEgaGFuZGxlciBpc27igJl0IHJlZ2lzdGVyZWQgdHdpY2UuXG4gICAgbWVkaWF0b3IudW5zdWJzY3JpYmUgdHlwZSwgaGFuZGxlciwgdGhpc1xuXG4gICAgIyBSZWdpc3RlciBnbG9iYWwgaGFuZGxlciwgZm9yY2UgY29udGV4dCB0byB0aGUgc3Vic2NyaWJlci5cbiAgICBtZWRpYXRvci5zdWJzY3JpYmUgdHlwZSwgaGFuZGxlciwgdGhpc1xuXG4gIHN1YnNjcmliZUV2ZW50T25jZTogKHR5cGUsIGhhbmRsZXIpIC0+XG4gICAgaWYgdHlwZW9mIHR5cGUgaXNudCAnc3RyaW5nJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnRXZlbnRCcm9rZXIjc3Vic2NyaWJlRXZlbnRPbmNlOiAnICtcbiAgICAgICAgJ3R5cGUgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZydcbiAgICBpZiB0eXBlb2YgaGFuZGxlciBpc250ICdmdW5jdGlvbidcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgJ0V2ZW50QnJva2VyI3N1YnNjcmliZUV2ZW50T25jZTogJyArXG4gICAgICAgICdoYW5kbGVyIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbidcblxuICAgICMgRW5zdXJlIHRoYXQgYSBoYW5kbGVyIGlzbuKAmXQgcmVnaXN0ZXJlZCB0d2ljZS5cbiAgICBtZWRpYXRvci51bnN1YnNjcmliZSB0eXBlLCBoYW5kbGVyLCB0aGlzXG5cbiAgICAjIFJlZ2lzdGVyIGdsb2JhbCBoYW5kbGVyLCBmb3JjZSBjb250ZXh0IHRvIHRoZSBzdWJzY3JpYmVyLlxuICAgIG1lZGlhdG9yLnN1YnNjcmliZU9uY2UgdHlwZSwgaGFuZGxlciwgdGhpc1xuXG4gIHVuc3Vic2NyaWJlRXZlbnQ6ICh0eXBlLCBoYW5kbGVyKSAtPlxuICAgIGlmIHR5cGVvZiB0eXBlIGlzbnQgJ3N0cmluZydcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgJ0V2ZW50QnJva2VyI3Vuc3Vic2NyaWJlRXZlbnQ6ICcgK1xuICAgICAgICAndHlwZSBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgIGlmIHR5cGVvZiBoYW5kbGVyIGlzbnQgJ2Z1bmN0aW9uJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnRXZlbnRCcm9rZXIjdW5zdWJzY3JpYmVFdmVudDogJyArXG4gICAgICAgICdoYW5kbGVyIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbidcblxuICAgICMgUmVtb3ZlIGdsb2JhbCBoYW5kbGVyLlxuICAgIG1lZGlhdG9yLnVuc3Vic2NyaWJlIHR5cGUsIGhhbmRsZXJcblxuICAjIFVuYmluZCBhbGwgZ2xvYmFsIGhhbmRsZXJzLlxuICB1bnN1YnNjcmliZUFsbEV2ZW50czogLT5cbiAgICAjIFJlbW92ZSBhbGwgaGFuZGxlcnMgd2l0aCBhIGNvbnRleHQgb2YgdGhpcyBzdWJzY3JpYmVyLlxuICAgIG1lZGlhdG9yLnVuc3Vic2NyaWJlIG51bGwsIG51bGwsIHRoaXNcblxuICBwdWJsaXNoRXZlbnQ6ICh0eXBlLCBhcmdzLi4uKSAtPlxuICAgIGlmIHR5cGVvZiB0eXBlIGlzbnQgJ3N0cmluZydcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgJ0V2ZW50QnJva2VyI3B1Ymxpc2hFdmVudDogJyArXG4gICAgICAgICd0eXBlIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcnXG5cbiAgICAjIFB1Ymxpc2ggZ2xvYmFsIGhhbmRsZXIuXG4gICAgbWVkaWF0b3IucHVibGlzaCB0eXBlLCBhcmdzLi4uXG5cbiMgWW914oCZcmUgZnJvemVuIHdoZW4geW91ciBoZWFydOKAmXMgbm90IG9wZW4uXG5PYmplY3QuZnJlZXplIEV2ZW50QnJva2VyXG5cbiMgUmV0dXJuIG91ciBjcmVhdGlvbi5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRCcm9rZXJcbiIsIid1c2Ugc3RyaWN0J1xuXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZSdcbkJhY2tib25lID0gcmVxdWlyZSAnYmFja2JvbmUnXG5cbiMgQ2FjaGVkIHJlZ2V4IGZvciBzdHJpcHBpbmcgYSBsZWFkaW5nIGhhc2gvc2xhc2ggYW5kIHRyYWlsaW5nIHNwYWNlLlxucm91dGVTdHJpcHBlciA9IC9eWyNcXC9dfFxccyskL2dcblxuIyBDYWNoZWQgcmVnZXggZm9yIHN0cmlwcGluZyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzLlxucm9vdFN0cmlwcGVyID0gL15cXC8rfFxcLyskL2dcblxuIyBQYXRjaGVkIEJhY2tib25lLkhpc3Rvcnkgd2l0aCBhIGJhc2ljIHF1ZXJ5IHN0cmluZ3Mgc3VwcG9ydFxuY2xhc3MgSGlzdG9yeSBleHRlbmRzIEJhY2tib25lLkhpc3RvcnlcblxuICAjIEdldCB0aGUgY3Jvc3MtYnJvd3NlciBub3JtYWxpemVkIFVSTCBmcmFnbWVudCwgZWl0aGVyIGZyb20gdGhlIFVSTCxcbiAgIyB0aGUgaGFzaCwgb3IgdGhlIG92ZXJyaWRlLlxuICBnZXRGcmFnbWVudDogKGZyYWdtZW50LCBmb3JjZVB1c2hTdGF0ZSkgLT5cbiAgICBpZiBub3QgZnJhZ21lbnQ/XG4gICAgICBpZiBAX2hhc1B1c2hTdGF0ZSBvciBub3QgQF93YW50c0hhc2hDaGFuZ2Ugb3IgZm9yY2VQdXNoU3RhdGVcbiAgICAgICAgIyBDSEFOR0VEOiBNYWtlIGZyYWdtZW50IGluY2x1ZGUgcXVlcnkgc3RyaW5nLlxuICAgICAgICBmcmFnbWVudCA9IEBsb2NhdGlvbi5wYXRobmFtZSArIEBsb2NhdGlvbi5zZWFyY2hcbiAgICAgICAgIyBSZW1vdmUgdHJhaWxpbmcgc2xhc2guXG4gICAgICAgIHJvb3QgPSBAcm9vdC5yZXBsYWNlIC9cXC8kLywgJydcbiAgICAgICAgZnJhZ21lbnQgPSBmcmFnbWVudC5zbGljZSByb290Lmxlbmd0aCB1bmxlc3MgZnJhZ21lbnQuaW5kZXhPZiByb290XG4gICAgICBlbHNlXG4gICAgICAgIGZyYWdtZW50ID0gQGdldEhhc2goKVxuXG4gICAgZnJhZ21lbnQucmVwbGFjZSByb3V0ZVN0cmlwcGVyLCAnJ1xuXG4gICMgU3RhcnQgdGhlIGhhc2ggY2hhbmdlIGhhbmRsaW5nLCByZXR1cm5pbmcgYHRydWVgIGlmIHRoZSBjdXJyZW50IFVSTCBtYXRjaGVzXG4gICMgYW4gZXhpc3Rpbmcgcm91dGUsIGFuZCBgZmFsc2VgIG90aGVyd2lzZS5cbiAgc3RhcnQ6IChvcHRpb25zKSAtPlxuICAgIGlmIEJhY2tib25lLkhpc3Rvcnkuc3RhcnRlZFxuICAgICAgdGhyb3cgbmV3IEVycm9yICdCYWNrYm9uZS5oaXN0b3J5IGhhcyBhbHJlYWR5IGJlZW4gc3RhcnRlZCdcbiAgICBCYWNrYm9uZS5IaXN0b3J5LnN0YXJ0ZWQgPSB0cnVlXG5cbiAgICAjIEZpZ3VyZSBvdXQgdGhlIGluaXRpYWwgY29uZmlndXJhdGlvbi4gSXMgcHVzaFN0YXRlIGRlc2lyZWQ/XG4gICAgIyBJcyBpdCBhdmFpbGFibGU/IEFyZSBjdXN0b20gc3RyaXBwZXJzIHByb3ZpZGVkP1xuICAgIEBvcHRpb25zICAgICAgICAgID0gXy5leHRlbmQge30sIHtyb290OiAnLyd9LCBAb3B0aW9ucywgb3B0aW9uc1xuICAgIEByb290ICAgICAgICAgICAgID0gQG9wdGlvbnMucm9vdFxuICAgIEBfd2FudHNIYXNoQ2hhbmdlID0gQG9wdGlvbnMuaGFzaENoYW5nZSBpc250IGZhbHNlXG4gICAgQF93YW50c1B1c2hTdGF0ZSAgPSBCb29sZWFuIEBvcHRpb25zLnB1c2hTdGF0ZVxuICAgIEBfaGFzUHVzaFN0YXRlICAgID0gQm9vbGVhbiBAb3B0aW9ucy5wdXNoU3RhdGUgYW5kIEBoaXN0b3J5Py5wdXNoU3RhdGVcbiAgICBmcmFnbWVudCAgICAgICAgICA9IEBnZXRGcmFnbWVudCgpXG4gICAgcm91dGVTdHJpcHBlciAgICAgPSBAb3B0aW9ucy5yb3V0ZVN0cmlwcGVyID8gcm91dGVTdHJpcHBlclxuICAgIHJvb3RTdHJpcHBlciAgICAgID0gQG9wdGlvbnMucm9vdFN0cmlwcGVyID8gcm9vdFN0cmlwcGVyXG5cbiAgICAjIE5vcm1hbGl6ZSByb290IHRvIGFsd2F5cyBpbmNsdWRlIGEgbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2guXG4gICAgQHJvb3QgPSAoJy8nICsgQHJvb3QgKyAnLycpLnJlcGxhY2Ugcm9vdFN0cmlwcGVyLCAnLydcblxuICAgICMgRGVwZW5kaW5nIG9uIHdoZXRoZXIgd2UncmUgdXNpbmcgcHVzaFN0YXRlIG9yIGhhc2hlcyxcbiAgICAjIGRldGVybWluZSBob3cgd2UgY2hlY2sgdGhlIFVSTCBzdGF0ZS5cbiAgICBpZiBAX2hhc1B1c2hTdGF0ZVxuICAgICAgQmFja2JvbmUuJCh3aW5kb3cpLm9uICdwb3BzdGF0ZScsIEBjaGVja1VybFxuICAgIGVsc2UgaWYgQF93YW50c0hhc2hDaGFuZ2VcbiAgICAgIEJhY2tib25lLiQod2luZG93KS5vbiAnaGFzaGNoYW5nZScsIEBjaGVja1VybFxuXG4gICAgIyBEZXRlcm1pbmUgaWYgd2UgbmVlZCB0byBjaGFuZ2UgdGhlIGJhc2UgdXJsLCBmb3IgYSBwdXNoU3RhdGUgbGlua1xuICAgICMgb3BlbmVkIGJ5IGEgbm9uLXB1c2hTdGF0ZSBicm93c2VyLlxuICAgIEBmcmFnbWVudCA9IGZyYWdtZW50XG4gICAgbG9jID0gQGxvY2F0aW9uXG4gICAgYXRSb290ID0gbG9jLnBhdGhuYW1lLnJlcGxhY2UoL1teXFwvXSQvLCAnJCYvJykgaXMgQHJvb3RcblxuICAgICMgSWYgd2UndmUgc3RhcnRlZCBvZmYgd2l0aCBhIHJvdXRlIGZyb20gYSBgcHVzaFN0YXRlYC1lbmFibGVkIGJyb3dzZXIsXG4gICAgIyBidXQgd2UncmUgY3VycmVudGx5IGluIGEgYnJvd3NlciB0aGF0IGRvZXNuJ3Qgc3VwcG9ydCBpdC4uLlxuICAgIGlmIEBfd2FudHNIYXNoQ2hhbmdlIGFuZCBAX3dhbnRzUHVzaFN0YXRlIGFuZFxuICAgIG5vdCBAX2hhc1B1c2hTdGF0ZSBhbmQgbm90IGF0Um9vdFxuICAgICAgIyBDSEFOR0VEOiBQcmV2ZW50IHF1ZXJ5IHN0cmluZyBmcm9tIGJlaW5nIGFkZGVkIGJlZm9yZSBoYXNoLlxuICAgICAgIyBTbywgaXQgd2lsbCBhcHBlYXIgb25seSBhZnRlciAjLCBhcyBpdCBoYXMgYmVlbiBhbHJlYWR5IGluY2x1ZGVkXG4gICAgICAjIGludG8gQGZyYWdtZW50XG4gICAgICBAZnJhZ21lbnQgPSBAZ2V0RnJhZ21lbnQgbnVsbCwgdHJ1ZVxuICAgICAgQGxvY2F0aW9uLnJlcGxhY2UgQHJvb3QgKyAnIycgKyBAZnJhZ21lbnRcbiAgICAgICMgUmV0dXJuIGltbWVkaWF0ZWx5IGFzIGJyb3dzZXIgd2lsbCBkbyByZWRpcmVjdCB0byBuZXcgdXJsXG4gICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgIyBPciBpZiB3ZSd2ZSBzdGFydGVkIG91dCB3aXRoIGEgaGFzaC1iYXNlZCByb3V0ZSwgYnV0IHdlJ3JlIGN1cnJlbnRseVxuICAgICMgaW4gYSBicm93c2VyIHdoZXJlIGl0IGNvdWxkIGJlIGBwdXNoU3RhdGVgLWJhc2VkIGluc3RlYWQuLi5cbiAgICBlbHNlIGlmIEBfd2FudHNQdXNoU3RhdGUgYW5kIEBfaGFzUHVzaFN0YXRlIGFuZCBhdFJvb3QgYW5kIGxvYy5oYXNoXG4gICAgICBAZnJhZ21lbnQgPSBAZ2V0SGFzaCgpLnJlcGxhY2Ugcm91dGVTdHJpcHBlciwgJydcbiAgICAgICMgQ0hBTkdFRDogSXQncyBubyBsb25nZXIgbmVlZGVkIHRvIGFkZCBsb2Muc2VhcmNoIGF0IHRoZSBlbmQsXG4gICAgICAjIGFzIHF1ZXJ5IHBhcmFtcyBoYXZlIGJlZW4gYWxyZWFkeSBpbmNsdWRlZCBpbnRvIEBmcmFnbWVudFxuICAgICAgQGhpc3RvcnkucmVwbGFjZVN0YXRlIHt9LCBkb2N1bWVudC50aXRsZSwgQHJvb3QgKyBAZnJhZ21lbnRcblxuICAgIEBsb2FkVXJsKCkgaWYgbm90IEBvcHRpb25zLnNpbGVudFxuXG4gIG5hdmlnYXRlOiAoZnJhZ21lbnQgPSAnJywgb3B0aW9ucykgLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIEJhY2tib25lLkhpc3Rvcnkuc3RhcnRlZFxuXG4gICAgb3B0aW9ucyA9IHt0cmlnZ2VyOiBvcHRpb25zfSBpZiBub3Qgb3B0aW9ucyBvciBvcHRpb25zIGlzIHRydWVcblxuICAgIGZyYWdtZW50ID0gQGdldEZyYWdtZW50IGZyYWdtZW50XG4gICAgdXJsID0gQHJvb3QgKyBmcmFnbWVudFxuXG4gICAgIyBSZW1vdmUgZnJhZ21lbnQgcmVwbGFjZSwgY296IHF1ZXJ5IHN0cmluZyBkaWZmZXJlbnQgbWVhbiBkaWZmZXJlbmNlIHBhZ2VcbiAgICAjIFN0cmlwIHRoZSBmcmFnbWVudCBvZiB0aGUgcXVlcnkgYW5kIGhhc2ggZm9yIG1hdGNoaW5nLlxuICAgICMgZnJhZ21lbnQgPSBmcmFnbWVudC5yZXBsYWNlKHBhdGhTdHJpcHBlciwgJycpXG5cbiAgICByZXR1cm4gZmFsc2UgaWYgQGZyYWdtZW50IGlzIGZyYWdtZW50XG4gICAgQGZyYWdtZW50ID0gZnJhZ21lbnRcblxuICAgICMgRG9uJ3QgaW5jbHVkZSBhIHRyYWlsaW5nIHNsYXNoIG9uIHRoZSByb290LlxuICAgIGlmIGZyYWdtZW50Lmxlbmd0aCBpcyAwIGFuZCB1cmwgaXNudCBAcm9vdFxuICAgICAgdXJsID0gdXJsLnNsaWNlIDAsIC0xXG5cbiAgICAjIElmIHB1c2hTdGF0ZSBpcyBhdmFpbGFibGUsIHdlIHVzZSBpdCB0byBzZXQgdGhlIGZyYWdtZW50IGFzIGEgcmVhbCBVUkwuXG4gICAgaWYgQF9oYXNQdXNoU3RhdGVcbiAgICAgIGhpc3RvcnlNZXRob2QgPSBpZiBvcHRpb25zLnJlcGxhY2UgdGhlbiAncmVwbGFjZVN0YXRlJyBlbHNlICdwdXNoU3RhdGUnXG4gICAgICBAaGlzdG9yeVtoaXN0b3J5TWV0aG9kXSB7fSwgZG9jdW1lbnQudGl0bGUsIHVybFxuXG4gICAgIyBJZiBoYXNoIGNoYW5nZXMgaGF2ZW4ndCBiZWVuIGV4cGxpY2l0bHkgZGlzYWJsZWQsIHVwZGF0ZSB0aGUgaGFzaFxuICAgICMgZnJhZ21lbnQgdG8gc3RvcmUgaGlzdG9yeS5cbiAgICBlbHNlIGlmIEBfd2FudHNIYXNoQ2hhbmdlXG4gICAgICBAX3VwZGF0ZUhhc2ggQGxvY2F0aW9uLCBmcmFnbWVudCwgb3B0aW9ucy5yZXBsYWNlXG5cbiAgICAjIElmIHlvdSd2ZSB0b2xkIHVzIHRoYXQgeW91IGV4cGxpY2l0bHkgZG9uJ3Qgd2FudCBmYWxsYmFjayBoYXNoY2hhbmdlLVxuICAgICMgYmFzZWQgaGlzdG9yeSwgdGhlbiBgbmF2aWdhdGVgIGJlY29tZXMgYSBwYWdlIHJlZnJlc2guXG4gICAgZWxzZVxuICAgICAgcmV0dXJuIEBsb2NhdGlvbi5hc3NpZ24gdXJsXG5cbiAgICBpZiBvcHRpb25zLnRyaWdnZXJcbiAgICAgIEBsb2FkVXJsIGZyYWdtZW50XG5cbm1vZHVsZS5leHBvcnRzID0gaWYgQmFja2JvbmUuJCB0aGVuIEhpc3RvcnkgZWxzZSBCYWNrYm9uZS5IaXN0b3J5XG4iLCIndXNlIHN0cmljdCdcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuXG5FdmVudEJyb2tlciA9IHJlcXVpcmUgJy4vZXZlbnRfYnJva2VyJ1xudXRpbHMgPSByZXF1aXJlICcuL3V0aWxzJ1xuQ29udHJvbGxlciA9IHJlcXVpcmUgJy4uL2NvbnRyb2xsZXJzL2NvbnRyb2xsZXInXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUm91dGVcbiAgIyBCb3Jyb3cgdGhlIHN0YXRpYyBleHRlbmQgbWV0aG9kIGZyb20gQmFja2JvbmUuXG4gIEBleHRlbmQgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmRcblxuICAjIE1peGluIGFuIEV2ZW50QnJva2VyLlxuICBfLmV4dGVuZCBAcHJvdG90eXBlLCBFdmVudEJyb2tlclxuXG4gICMgVGFrZW4gZnJvbSBCYWNrYm9uZS5Sb3V0ZXIuXG4gIGVzY2FwZVJlZ0V4cCA9IC9bXFwte31cXFtcXF0rPy4sXFxcXFxcXiR8I1xcc10vZ1xuICBvcHRpb25hbFJlZ0V4cCA9IC9cXCgoLio/KVxcKS9nXG4gIHBhcmFtUmVnRXhwID0gLyg/Ojp8XFwqKShcXHcrKS9nXG5cbiAgIyBBZGQgb3IgcmVtb3ZlIHRyYWlsaW5nIHNsYXNoIGZyb20gcGF0aCBhY2NvcmRpbmcgdG8gdHJhaWxpbmcgb3B0aW9uLlxuICBwcm9jZXNzVHJhaWxpbmdTbGFzaCA9IChwYXRoLCB0cmFpbGluZykgLT5cbiAgICBzd2l0Y2ggdHJhaWxpbmdcbiAgICAgIHdoZW4geWVzXG4gICAgICAgIHBhdGggKz0gJy8nIHVubGVzcyBwYXRoWy0xLi5dIGlzICcvJ1xuICAgICAgd2hlbiBub1xuICAgICAgICBwYXRoID0gcGF0aFsuLi4tMV0gaWYgcGF0aFstMS4uXSBpcyAnLydcbiAgICBwYXRoXG5cbiAgIyBDcmVhdGUgYSByb3V0ZSBmb3IgYSBVUkwgcGF0dGVybiBhbmQgYSBjb250cm9sbGVyIGFjdGlvblxuICAjIGUuZy4gbmV3IFJvdXRlICcvdXNlcnMvOmlkJywgJ3VzZXJzJywgJ3Nob3cnLCB7IHNvbWU6ICdvcHRpb25zJyB9XG4gIGNvbnN0cnVjdG9yOiAoQHBhdHRlcm4sIEBjb250cm9sbGVyLCBAYWN0aW9uLCBvcHRpb25zKSAtPlxuICAgICMgRGlzYWxsb3cgcmVnZXhwIHJvdXRlcy5cbiAgICBpZiB0eXBlb2YgQHBhdHRlcm4gaXNudCAnc3RyaW5nJ1xuICAgICAgdGhyb3cgbmV3IEVycm9yICdSb3V0ZTogUmVnRXhwcyBhcmUgbm90IHN1cHBvcnRlZC5cbiAgICAgICAgVXNlIHN0cmluZ3Mgd2l0aCA6bmFtZXMgYW5kIGBjb25zdHJhaW50c2Agb3B0aW9uIG9mIHJvdXRlJ1xuXG4gICAgIyBDbG9uZSBvcHRpb25zLlxuICAgIEBvcHRpb25zID0gXy5leHRlbmQge30sIG9wdGlvbnNcbiAgICBAb3B0aW9ucy5wYXJhbXNJblFTID0gdHJ1ZSBpZiBAb3B0aW9ucy5wYXJhbXNJblFTIGlzbnQgZmFsc2VcblxuICAgICMgU3RvcmUgdGhlIG5hbWUgb24gdGhlIHJvdXRlIGlmIGdpdmVuXG4gICAgQG5hbWUgPSBAb3B0aW9ucy5uYW1lIGlmIEBvcHRpb25zLm5hbWU/XG5cbiAgICAjIERvbuKAmXQgYWxsb3cgYW1iaWd1aXR5IHdpdGggY29udHJvbGxlciNhY3Rpb24uXG4gICAgaWYgQG5hbWUgYW5kIEBuYW1lLmluZGV4T2YoJyMnKSBpc250IC0xXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ1JvdXRlOiBcIiNcIiBjYW5ub3QgYmUgdXNlZCBpbiBuYW1lJ1xuXG4gICAgIyBTZXQgZGVmYXVsdCByb3V0ZSBuYW1lLlxuICAgIEBuYW1lID89IEBjb250cm9sbGVyICsgJyMnICsgQGFjdGlvblxuXG4gICAgIyBJbml0aWFsaXplIGxpc3Qgb2YgOnBhcmFtcyB3aGljaCB0aGUgcm91dGUgd2lsbCB1c2UuXG4gICAgQGFsbFBhcmFtcyA9IFtdXG4gICAgQHJlcXVpcmVkUGFyYW1zID0gW11cbiAgICBAb3B0aW9uYWxQYXJhbXMgPSBbXVxuXG4gICAgIyBDaGVjayBpZiB0aGUgYWN0aW9uIGlzIGEgcmVzZXJ2ZWQgbmFtZVxuICAgIGlmIEBhY3Rpb24gb2YgQ29udHJvbGxlci5wcm90b3R5cGVcbiAgICAgIHRocm93IG5ldyBFcnJvciAnUm91dGU6IFlvdSBzaG91bGQgbm90IHVzZSBleGlzdGluZyBjb250cm9sbGVyICcgK1xuICAgICAgICAncHJvcGVydGllcyBhcyBhY3Rpb24gbmFtZXMnXG5cbiAgICBAY3JlYXRlUmVnRXhwKClcblxuICAgICMgWW914oCZcmUgZnJvemVuIHdoZW4geW91ciBoZWFydOKAmXMgbm90IG9wZW4uXG4gICAgT2JqZWN0LmZyZWV6ZSB0aGlzXG5cbiAgIyBUZXN0cyBpZiByb3V0ZSBwYXJhbXMgYXJlIGVxdWFsIHRvIGNyaXRlcmlhLlxuICBtYXRjaGVzOiAoY3JpdGVyaWEpIC0+XG4gICAgaWYgdHlwZW9mIGNyaXRlcmlhIGlzICdzdHJpbmcnXG4gICAgICBjcml0ZXJpYSBpcyBAbmFtZVxuICAgIGVsc2VcbiAgICAgIHByb3BlcnRpZXNDb3VudCA9IDBcbiAgICAgIGZvciBuYW1lIGluIFsnbmFtZScsICdhY3Rpb24nLCAnY29udHJvbGxlciddXG4gICAgICAgIHByb3BlcnRpZXNDb3VudCsrXG4gICAgICAgIHByb3BlcnR5ID0gY3JpdGVyaWFbbmFtZV1cbiAgICAgICAgcmV0dXJuIGZhbHNlIGlmIHByb3BlcnR5IGFuZCBwcm9wZXJ0eSBpc250IHRoaXNbbmFtZV1cbiAgICAgIGludmFsaWRQYXJhbXNDb3VudCA9IHByb3BlcnRpZXNDb3VudCBpcyAxIGFuZCBuYW1lIGluXG4gICAgICAgIFsnYWN0aW9uJywgJ2NvbnRyb2xsZXInXVxuICAgICAgbm90IGludmFsaWRQYXJhbXNDb3VudFxuXG4gICMgR2VuZXJhdGVzIHJvdXRlIFVSTCBmcm9tIHBhcmFtcy5cbiAgcmV2ZXJzZTogKHBhcmFtcywgcXVlcnkpIC0+XG4gICAgcGFyYW1zID0gQG5vcm1hbGl6ZVBhcmFtcyBwYXJhbXNcbiAgICByZW1haW5pbmdQYXJhbXMgPSBfLmV4dGVuZCB7fSwgcGFyYW1zXG4gICAgcmV0dXJuIGZhbHNlIGlmIHBhcmFtcyBpcyBmYWxzZVxuXG4gICAgdXJsID0gQHBhdHRlcm5cblxuICAgICMgRnJvbSBhIHBhcmFtcyBoYXNoOyB3ZSBuZWVkIHRvIGJlIGFibGUgdG8gcmV0dXJuXG4gICAgIyB0aGUgYWN0dWFsIFVSTCB0aGlzIHJvdXRlIHJlcHJlc2VudHMuXG4gICAgIyBJdGVyYXRlIGFuZCByZXBsYWNlIHBhcmFtcyBpbiBwYXR0ZXJuLlxuICAgIGZvciBuYW1lIGluIEByZXF1aXJlZFBhcmFtc1xuICAgICAgdmFsdWUgPSBwYXJhbXNbbmFtZV1cbiAgICAgIHVybCA9IHVybC5yZXBsYWNlIC8vL1s6Kl0je25hbWV9Ly8vZywgdmFsdWVcbiAgICAgIGRlbGV0ZSByZW1haW5pbmdQYXJhbXNbbmFtZV1cblxuICAgICMgUmVwbGFjZSBvcHRpb25hbCBwYXJhbXMuXG4gICAgZm9yIG5hbWUgaW4gQG9wdGlvbmFsUGFyYW1zXG4gICAgICBpZiB2YWx1ZSA9IHBhcmFtc1tuYW1lXVxuICAgICAgICB1cmwgPSB1cmwucmVwbGFjZSAvLy9bOipdI3tuYW1lfS8vL2csIHZhbHVlXG4gICAgICAgIGRlbGV0ZSByZW1haW5pbmdQYXJhbXNbbmFtZV1cblxuICAgICMgS2lsbCB1bmZ1bGZpbGxlZCBvcHRpb25hbCBwb3J0aW9ucy5cbiAgICByYXcgPSB1cmwucmVwbGFjZSBvcHRpb25hbFJlZ0V4cCwgKG1hdGNoLCBwb3J0aW9uKSAtPlxuICAgICAgaWYgcG9ydGlvbi5tYXRjaCAvWzoqXS9nXG4gICAgICAgIFwiXCJcbiAgICAgIGVsc2VcbiAgICAgICAgcG9ydGlvblxuXG4gICAgIyBBZGQgb3IgcmVtb3ZlIHRyYWlsaW5nIHNsYXNoIGFjY29yZGluZyB0byB0aGUgUm91dGUgb3B0aW9ucy5cbiAgICB1cmwgPSBwcm9jZXNzVHJhaWxpbmdTbGFzaCByYXcsIEBvcHRpb25zLnRyYWlsaW5nXG5cbiAgICBxdWVyeSA9IHV0aWxzLnF1ZXJ5UGFyYW1zLnBhcnNlIHF1ZXJ5IGlmIHR5cGVvZiBxdWVyeSBpc250ICdvYmplY3QnXG4gICAgXy5leHRlbmQgcXVlcnksIHJlbWFpbmluZ1BhcmFtcyB1bmxlc3MgQG9wdGlvbnMucGFyYW1zSW5RUyBpcyBmYWxzZVxuICAgIHVybCArPSAnPycgKyB1dGlscy5xdWVyeVBhcmFtcy5zdHJpbmdpZnkgcXVlcnkgdW5sZXNzIHV0aWxzLmlzRW1wdHkgcXVlcnlcbiAgICB1cmxcblxuICAjIFZhbGlkYXRlcyBpbmNvbWluZyBwYXJhbXMgYW5kIHJldHVybnMgdGhlbSBpbiBhIHVuaWZpZWQgZm9ybSAtIGhhc2hcbiAgbm9ybWFsaXplUGFyYW1zOiAocGFyYW1zKSAtPlxuICAgIGlmIEFycmF5LmlzQXJyYXkgcGFyYW1zXG4gICAgICAjIEVuc3VyZSB3ZSBoYXZlIGVub3VnaCBwYXJhbWV0ZXJzLlxuICAgICAgcmV0dXJuIGZhbHNlIGlmIHBhcmFtcy5sZW5ndGggPCBAcmVxdWlyZWRQYXJhbXMubGVuZ3RoXG5cbiAgICAgICMgQ29udmVydCBwYXJhbXMgZnJvbSBhcnJheSBpbnRvIG9iamVjdC5cbiAgICAgIHBhcmFtc0hhc2ggPSB7fVxuICAgICAgcm91dGVQYXJhbXMgPSBAcmVxdWlyZWRQYXJhbXMuY29uY2F0IEBvcHRpb25hbFBhcmFtc1xuICAgICAgZm9yIHBhcmFtSW5kZXggaW4gWzAuLnBhcmFtcy5sZW5ndGggLSAxXSBieSAxXG4gICAgICAgIHBhcmFtTmFtZSA9IHJvdXRlUGFyYW1zW3BhcmFtSW5kZXhdXG4gICAgICAgIHBhcmFtc0hhc2hbcGFyYW1OYW1lXSA9IHBhcmFtc1twYXJhbUluZGV4XVxuXG4gICAgICByZXR1cm4gZmFsc2UgdW5sZXNzIEB0ZXN0Q29uc3RyYWludHMgcGFyYW1zSGFzaFxuXG4gICAgICBwYXJhbXMgPSBwYXJhbXNIYXNoXG4gICAgZWxzZVxuICAgICAgIyBudWxsIG9yIHVuZGVmaW5lZCBwYXJhbXMgYXJlIGVxdWl2YWxlbnQgdG8gYW4gZW1wdHkgaGFzaFxuICAgICAgcGFyYW1zID89IHt9XG5cbiAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgQHRlc3RQYXJhbXMgcGFyYW1zXG5cbiAgICBwYXJhbXNcblxuICAjIFRlc3QgaWYgcGFzc2VkIHBhcmFtcyBoYXNoIG1hdGNoZXMgY3VycmVudCBjb25zdHJhaW50cy5cbiAgdGVzdENvbnN0cmFpbnRzOiAocGFyYW1zKSAtPlxuICAgICMgQXBwbHkgdGhlIHBhcmFtZXRlciBjb25zdHJhaW50cy5cbiAgICBjb25zdHJhaW50cyA9IEBvcHRpb25zLmNvbnN0cmFpbnRzXG4gICAgT2JqZWN0LmtleXMoY29uc3RyYWludHMgb3Ige30pLmV2ZXJ5IChrZXkpIC0+XG4gICAgICBjb25zdHJhaW50c1trZXldLnRlc3QgcGFyYW1zW2tleV1cblxuICAjIFRlc3QgaWYgcGFzc2VkIHBhcmFtcyBoYXNoIG1hdGNoZXMgY3VycmVudCByb3V0ZS5cbiAgdGVzdFBhcmFtczogKHBhcmFtcykgLT5cbiAgICAjIEVuc3VyZSB0aGF0IHBhcmFtcyBjb250YWlucyBhbGwgdGhlIHBhcmFtZXRlcnMgbmVlZGVkLlxuICAgIGZvciBwYXJhbU5hbWUgaW4gQHJlcXVpcmVkUGFyYW1zXG4gICAgICByZXR1cm4gZmFsc2UgaWYgcGFyYW1zW3BhcmFtTmFtZV0gaXMgdW5kZWZpbmVkXG5cbiAgICBAdGVzdENvbnN0cmFpbnRzIHBhcmFtc1xuXG4gICMgQ3JlYXRlcyB0aGUgYWN0dWFsIHJlZ3VsYXIgZXhwcmVzc2lvbiB0aGF0IEJhY2tib25lLkhpc3RvcnkjbG9hZFVybFxuICAjIHVzZXMgdG8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IHVybCBpcyBhIG1hdGNoLlxuICBjcmVhdGVSZWdFeHA6IC0+XG4gICAgcGF0dGVybiA9IEBwYXR0ZXJuXG5cbiAgICAjIEVzY2FwZSBtYWdpYyBjaGFyYWN0ZXJzLlxuICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnJlcGxhY2UoZXNjYXBlUmVnRXhwLCAnXFxcXCQmJylcblxuICAgICMgS2VlcCBhY2N1cmF0ZSBiYWNrLXJlZmVyZW5jZSBpbmRpY2VzIGluIGFsbFBhcmFtcy5cbiAgICAjIEVnLiBNYXRjaGluZyB0aGUgcmVnZXggcmV0dXJucyBhcnJheXMgbGlrZSBbYSwgdW5kZWZpbmVkLCBjXVxuICAgICMgIGFuZCBlYWNoIGl0ZW0gbmVlZHMgdG8gYmUgbWF0Y2hlZCB0byB0aGUgY29ycmVjdFxuICAgICMgIG5hbWVkIHBhcmFtZXRlciB2aWEgaXRzIHBvc2l0aW9uIGluIHRoZSBhcnJheS5cbiAgICBAcmVwbGFjZVBhcmFtcyBwYXR0ZXJuLCAobWF0Y2gsIHBhcmFtKSA9PlxuICAgICAgQGFsbFBhcmFtcy5wdXNoIHBhcmFtXG5cbiAgICAjIFByb2Nlc3Mgb3B0aW9uYWwgcm91dGUgcG9ydGlvbnMuXG4gICAgcGF0dGVybiA9IHBhdHRlcm4ucmVwbGFjZSBvcHRpb25hbFJlZ0V4cCwgQHBhcnNlT3B0aW9uYWxQb3J0aW9uXG5cbiAgICAjIFByb2Nlc3MgcmVtYWluaW5nIHJlcXVpcmVkIHBhcmFtcy5cbiAgICBwYXR0ZXJuID0gQHJlcGxhY2VQYXJhbXMgcGF0dGVybiwgKG1hdGNoLCBwYXJhbSkgPT5cbiAgICAgIEByZXF1aXJlZFBhcmFtcy5wdXNoIHBhcmFtXG4gICAgICBAcGFyYW1DYXB0dXJlUGF0dGVybiBtYXRjaFxuXG4gICAgIyBDcmVhdGUgdGhlIGFjdHVhbCByZWd1bGFyIGV4cHJlc3Npb24sIG1hdGNoIHVudGlsIHRoZSBlbmQgb2YgdGhlIFVSTCxcbiAgICAjIHRyYWlsaW5nIHNsYXNoIG9yIHRoZSBiZWdpbiBvZiBxdWVyeSBzdHJpbmcuXG4gICAgQHJlZ0V4cCA9IC8vL14je3BhdHRlcm59KD89XFwvKig/PVxcP3wkKSkvLy9cblxuICBwYXJzZU9wdGlvbmFsUG9ydGlvbjogKG1hdGNoLCBvcHRpb25hbFBvcnRpb24pID0+XG4gICAgIyBFeHRyYWN0IGFuZCByZXBsYWNlIHBhcmFtcy5cbiAgICBwb3J0aW9uID0gQHJlcGxhY2VQYXJhbXMgb3B0aW9uYWxQb3J0aW9uLCAobWF0Y2gsIHBhcmFtKSA9PlxuICAgICAgQG9wdGlvbmFsUGFyYW1zLnB1c2ggcGFyYW1cbiAgICAgICMgUmVwbGFjZSB0aGUgbWF0Y2ggKGVnLiA6Zm9vKSB3aXRoIGNhcHR1cmluZyBncm91cHMuXG4gICAgICBAcGFyYW1DYXB0dXJlUGF0dGVybiBtYXRjaFxuXG4gICAgIyBSZXBsYWNlIHRoZSBvcHRpb25hbCBwb3J0aW9uIHdpdGggYSBub24tY2FwdHVyaW5nIGFuZCBvcHRpb25hbCBncm91cC5cbiAgICBcIig/OiN7cG9ydGlvbn0pP1wiXG5cbiAgcmVwbGFjZVBhcmFtczogKHMsIGNhbGxiYWNrKSAtPlxuICAgICMgUGFyc2UgOmZvbyBhbmQgKmJhciwgcmVwbGFjaW5nIHZpYSBjYWxsYmFjay5cbiAgICBzLnJlcGxhY2UgcGFyYW1SZWdFeHAsIGNhbGxiYWNrXG5cbiAgcGFyYW1DYXB0dXJlUGF0dGVybjogKHBhcmFtKSAtPlxuICAgIGlmIHBhcmFtWzBdIGlzICc6J1xuICAgICAgIyBSZWdleHAgZm9yIDpmb28uXG4gICAgICAnKFteXFwvXFw/XSspJ1xuICAgIGVsc2VcbiAgICAgICMgUmVnZXhwIGZvciAqZm9vLlxuICAgICAgJyguKj8pJ1xuXG4gICMgVGVzdCBpZiB0aGUgcm91dGUgbWF0Y2hlcyB0byBhIHBhdGggKGNhbGxlZCBieSBCYWNrYm9uZS5IaXN0b3J5I2xvYWRVcmwpLlxuICB0ZXN0OiAocGF0aCkgLT5cbiAgICAjIFRlc3QgdGhlIG1haW4gUmVnRXhwLlxuICAgIG1hdGNoZWQgPSBAcmVnRXhwLnRlc3QgcGF0aFxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgbWF0Y2hlZFxuXG4gICAgIyBBcHBseSB0aGUgcGFyYW1ldGVyIGNvbnN0cmFpbnRzLlxuICAgIGNvbnN0cmFpbnRzID0gQG9wdGlvbnMuY29uc3RyYWludHNcbiAgICBpZiBjb25zdHJhaW50c1xuICAgICAgcmV0dXJuIEB0ZXN0Q29uc3RyYWludHMgQGV4dHJhY3RQYXJhbXMgcGF0aFxuXG4gICAgdHJ1ZVxuXG4gICMgVGhlIGhhbmRsZXIgY2FsbGVkIGJ5IEJhY2tib25lLkhpc3Rvcnkgd2hlbiB0aGUgcm91dGUgbWF0Y2hlcy5cbiAgIyBJdCBpcyBhbHNvIGNhbGxlZCBieSBSb3V0ZXIjcm91dGUgd2hpY2ggbWlnaHQgcGFzcyBvcHRpb25zLlxuICBoYW5kbGVyOiAocGF0aFBhcmFtcywgb3B0aW9ucykgPT5cbiAgICBvcHRpb25zID0gXy5leHRlbmQge30sIG9wdGlvbnNcblxuICAgICMgcGF0aFBhcmFtcyBtYXkgYmUgZWl0aGVyIGFuIG9iamVjdCB3aXRoIHBhcmFtcyBmb3IgcmV2ZXJzaW5nXG4gICAgIyBvciBhIHNpbXBsZSBVUkwuXG4gICAgaWYgcGF0aFBhcmFtcyBhbmQgdHlwZW9mIHBhdGhQYXJhbXMgaXMgJ29iamVjdCdcbiAgICAgIHF1ZXJ5ID0gdXRpbHMucXVlcnlQYXJhbXMuc3RyaW5naWZ5IG9wdGlvbnMucXVlcnlcbiAgICAgIHBhcmFtcyA9IHBhdGhQYXJhbXNcbiAgICAgIHBhdGggPSBAcmV2ZXJzZSBwYXJhbXNcbiAgICBlbHNlXG4gICAgICBbcGF0aCwgcXVlcnldID0gcGF0aFBhcmFtcy5zcGxpdCAnPydcbiAgICAgIGlmIG5vdCBxdWVyeT9cbiAgICAgICAgcXVlcnkgPSAnJ1xuICAgICAgZWxzZVxuICAgICAgICBvcHRpb25zLnF1ZXJ5ID0gdXRpbHMucXVlcnlQYXJhbXMucGFyc2UgcXVlcnlcbiAgICAgIHBhcmFtcyA9IEBleHRyYWN0UGFyYW1zIHBhdGhcbiAgICAgIHBhdGggPSBwcm9jZXNzVHJhaWxpbmdTbGFzaCBwYXRoLCBAb3B0aW9ucy50cmFpbGluZ1xuXG4gICAgYWN0aW9uUGFyYW1zID0gXy5leHRlbmQge30sIHBhcmFtcywgQG9wdGlvbnMucGFyYW1zXG5cbiAgICAjIENvbnN0cnVjdCBhIHJvdXRlIG9iamVjdCB0byBmb3J3YXJkIHRvIHRoZSBtYXRjaCBldmVudC5cbiAgICByb3V0ZSA9IHtwYXRoLCBAYWN0aW9uLCBAY29udHJvbGxlciwgQG5hbWUsIHF1ZXJ5fVxuXG4gICAgIyBQdWJsaXNoIGEgZ2xvYmFsIGV2ZW50IHBhc3NpbmcgdGhlIHJvdXRlIGFuZCB0aGUgcGFyYW1zLlxuICAgICMgT3JpZ2luYWwgb3B0aW9ucyBoYXNoIGZvcndhcmRlZCB0byBhbGxvdyBmdXJ0aGVyIGZvcndhcmRpbmcgdG8gYmFja2JvbmUuXG4gICAgQHB1Ymxpc2hFdmVudCAncm91dGVyOm1hdGNoJywgcm91dGUsIGFjdGlvblBhcmFtcywgb3B0aW9uc1xuXG4gICMgRXh0cmFjdCBuYW1lZCBwYXJhbWV0ZXJzIGZyb20gdGhlIFVSTCBwYXRoLlxuICBleHRyYWN0UGFyYW1zOiAocGF0aCkgLT5cbiAgICBwYXJhbXMgPSB7fVxuXG4gICAgIyBBcHBseSB0aGUgcmVndWxhciBleHByZXNzaW9uLlxuICAgIG1hdGNoZXMgPSBAcmVnRXhwLmV4ZWMgcGF0aFxuXG4gICAgIyBGaWxsIHRoZSBoYXNoIHVzaW5nIHBhcmFtIG5hbWVzIGFuZCB0aGUgbWF0Y2hlcy5cbiAgICBmb3IgbWF0Y2gsIGluZGV4IGluIG1hdGNoZXMuc2xpY2UgMVxuICAgICAgcGFyYW1OYW1lID0gaWYgQGFsbFBhcmFtcy5sZW5ndGggdGhlbiBAYWxsUGFyYW1zW2luZGV4XSBlbHNlIGluZGV4XG4gICAgICBwYXJhbXNbcGFyYW1OYW1lXSA9IG1hdGNoXG5cbiAgICBwYXJhbXNcbiIsIid1c2Ugc3RyaWN0J1xuXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZSdcbkJhY2tib25lID0gcmVxdWlyZSAnYmFja2JvbmUnXG5cbkV2ZW50QnJva2VyID0gcmVxdWlyZSAnLi9ldmVudF9icm9rZXInXG5IaXN0b3J5ID0gcmVxdWlyZSAnLi9oaXN0b3J5J1xuUm91dGUgPSByZXF1aXJlICcuL3JvdXRlJ1xudXRpbHMgPSByZXF1aXJlICcuL3V0aWxzJ1xubWVkaWF0b3IgPSByZXF1aXJlICcuLi9tZWRpYXRvcidcblxuIyBUaGUgcm91dGVyIHdoaWNoIGlzIGEgcmVwbGFjZW1lbnQgZm9yIEJhY2tib25lLlJvdXRlci5cbiMgTGlrZSB0aGUgc3RhbmRhcmQgcm91dGVyLCBpdCBjcmVhdGVzIGEgQmFja2JvbmUuSGlzdG9yeVxuIyBpbnN0YW5jZSBhbmQgcmVnaXN0ZXJzIHJvdXRlcyBvbiBpdC5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUm91dGVyICMgVGhpcyBjbGFzcyBkb2VzIG5vdCBleHRlbmQgQmFja2JvbmUuUm91dGVyLlxuICAjIEJvcnJvdyB0aGUgc3RhdGljIGV4dGVuZCBtZXRob2QgZnJvbSBCYWNrYm9uZS5cbiAgQGV4dGVuZCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZFxuXG4gICMgTWl4aW4gYW4gRXZlbnRCcm9rZXIuXG4gIF8uZXh0ZW5kIEBwcm90b3R5cGUsIEV2ZW50QnJva2VyXG5cbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxuICAgICMgRW5hYmxlIHB1c2hTdGF0ZSBieSBkZWZhdWx0IGZvciBIVFRQKHMpLlxuICAgICMgRGlzYWJsZSBpdCBmb3IgZmlsZTovLyBzY2hlbWEuXG4gICAgaXNXZWJGaWxlID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sIGlzbnQgJ2ZpbGU6J1xuICAgIF8uZGVmYXVsdHMgQG9wdGlvbnMsXG4gICAgICBwdXNoU3RhdGU6IGlzV2ViRmlsZVxuICAgICAgcm9vdDogJy8nXG4gICAgICB0cmFpbGluZzogbm9cblxuICAgICMgQ2FjaGVkIHJlZ2V4IGZvciBzdHJpcHBpbmcgYSBsZWFkaW5nIHN1YmRpciBhbmQgaGFzaC9zbGFzaC5cbiAgICBAcmVtb3ZlUm9vdCA9IG5ldyBSZWdFeHAgJ14nICsgdXRpbHMuZXNjYXBlUmVnRXhwKEBvcHRpb25zLnJvb3QpICsgJygjKT8nXG5cbiAgICBAc3Vic2NyaWJlRXZlbnQgJyFyb3V0ZXI6cm91dGUnLCBAb2xkRXZlbnRFcnJvclxuICAgIEBzdWJzY3JpYmVFdmVudCAnIXJvdXRlcjpyb3V0ZUJ5TmFtZScsIEBvbGRFdmVudEVycm9yXG4gICAgQHN1YnNjcmliZUV2ZW50ICchcm91dGVyOmNoYW5nZVVSTCcsIEBvbGRVUkxFdmVudEVycm9yXG5cbiAgICBAc3Vic2NyaWJlRXZlbnQgJ2Rpc3BhdGNoZXI6ZGlzcGF0Y2gnLCBAY2hhbmdlVVJMXG5cbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyICdyb3V0ZXI6cm91dGUnLCBAcm91dGUsIHRoaXNcbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyICdyb3V0ZXI6cmV2ZXJzZScsIEByZXZlcnNlLCB0aGlzXG5cbiAgICBAY3JlYXRlSGlzdG9yeSgpXG5cbiAgb2xkRXZlbnRFcnJvcjogLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IgJyFyb3V0ZXI6cm91dGUgYW5kICFyb3V0ZXI6cm91dGVCeU5hbWUgZXZlbnRzIHdlcmUgcmVtb3ZlZC5cbiAgVXNlIGBDaGFwbGluLnV0aWxzLnJlZGlyZWN0VG9gJ1xuXG4gIG9sZFVSTEV2ZW50RXJyb3I6IC0+XG4gICAgdGhyb3cgbmV3IEVycm9yICchcm91dGVyOmNoYW5nZVVSTCBldmVudCB3YXMgcmVtb3ZlZC4nXG5cbiAgIyBDcmVhdGUgYSBCYWNrYm9uZS5IaXN0b3J5IGluc3RhbmNlLlxuICBjcmVhdGVIaXN0b3J5OiAtPlxuICAgIEJhY2tib25lLmhpc3RvcnkgPSBuZXcgSGlzdG9yeSgpXG5cbiAgc3RhcnRIaXN0b3J5OiAtPlxuICAgICMgU3RhcnQgdGhlIEJhY2tib25lLkhpc3RvcnkgaW5zdGFuY2UgdG8gc3RhcnQgcm91dGluZy5cbiAgICAjIFRoaXMgc2hvdWxkIGJlIGNhbGxlZCBhZnRlciBhbGwgcm91dGVzIGhhdmUgYmVlbiByZWdpc3RlcmVkLlxuICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQgQG9wdGlvbnNcblxuICAjIFN0b3AgdGhlIGN1cnJlbnQgQmFja2JvbmUuSGlzdG9yeSBpbnN0YW5jZSBmcm9tIG9ic2VydmluZyBVUkwgY2hhbmdlcy5cbiAgc3RvcEhpc3Rvcnk6IC0+XG4gICAgQmFja2JvbmUuaGlzdG9yeS5zdG9wKCkgaWYgQmFja2JvbmUuSGlzdG9yeS5zdGFydGVkXG5cbiAgIyBTZWFyY2ggdGhyb3VnaCBiYWNrYm9uZSBoaXN0b3J5IGhhbmRsZXJzLlxuICBmaW5kSGFuZGxlcjogKHByZWRpY2F0ZSkgLT5cbiAgICBmb3IgaGFuZGxlciBpbiBCYWNrYm9uZS5oaXN0b3J5LmhhbmRsZXJzIHdoZW4gcHJlZGljYXRlIGhhbmRsZXJcbiAgICAgIHJldHVybiBoYW5kbGVyXG5cbiAgIyBDb25uZWN0IGFuIGFkZHJlc3Mgd2l0aCBhIGNvbnRyb2xsZXIgYWN0aW9uLlxuICAjIENyZWF0ZXMgYSByb3V0ZSBvbiB0aGUgQmFja2JvbmUuSGlzdG9yeSBpbnN0YW5jZS5cbiAgbWF0Y2g6IChwYXR0ZXJuLCB0YXJnZXQsIG9wdGlvbnMgPSB7fSkgPT5cbiAgICBpZiBhcmd1bWVudHMubGVuZ3RoIGlzIDIgYW5kIHRhcmdldCBhbmQgdHlwZW9mIHRhcmdldCBpcyAnb2JqZWN0J1xuICAgICAgIyBIYW5kbGVzIGNhc2VzIGxpa2UgYG1hdGNoICd1cmwnLCBjb250cm9sbGVyOiAnYycsIGFjdGlvbjogJ2EnYC5cbiAgICAgIHtjb250cm9sbGVyLCBhY3Rpb259ID0gb3B0aW9ucyA9IHRhcmdldFxuICAgICAgdW5sZXNzIGNvbnRyb2xsZXIgYW5kIGFjdGlvblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IgJ1JvdXRlciNtYXRjaCBtdXN0IHJlY2VpdmUgZWl0aGVyIHRhcmdldCBvciAnICtcbiAgICAgICAgICAnb3B0aW9ucy5jb250cm9sbGVyICYgb3B0aW9ucy5hY3Rpb24nXG4gICAgZWxzZVxuICAgICAgIyBIYW5kbGVzIGBtYXRjaCAndXJsJywgJ2MjYSdgLlxuICAgICAge2NvbnRyb2xsZXIsIGFjdGlvbn0gPSBvcHRpb25zXG4gICAgICBpZiBjb250cm9sbGVyIG9yIGFjdGlvblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IgJ1JvdXRlciNtYXRjaCBjYW5ub3QgdXNlIGJvdGggdGFyZ2V0IGFuZCAnICtcbiAgICAgICAgICAnb3B0aW9ucy5jb250cm9sbGVyIC8gb3B0aW9ucy5hY3Rpb24nXG4gICAgICAjIFNlcGFyYXRlIHRhcmdldCBpbnRvIGNvbnRyb2xsZXIgYW5kIGNvbnRyb2xsZXIgYWN0aW9uLlxuICAgICAgW2NvbnRyb2xsZXIsIGFjdGlvbl0gPSB0YXJnZXQuc3BsaXQgJyMnXG5cbiAgICAjIExldCBlYWNoIG1hdGNoIGNhbGwgcHJvdmlkZSBpdHMgb3duIHRyYWlsaW5nIG9wdGlvbiB0byBhcHByb3ByaWF0ZSBSb3V0ZS5cbiAgICAjIFBhc3MgdHJhaWxpbmcgdmFsdWUgZnJvbSB0aGUgUm91dGVyIGJ5IGRlZmF1bHQuXG4gICAgXy5kZWZhdWx0cyBvcHRpb25zLCB0cmFpbGluZzogQG9wdGlvbnMudHJhaWxpbmdcblxuICAgICMgQ3JlYXRlIHRoZSByb3V0ZS5cbiAgICByb3V0ZSA9IG5ldyBSb3V0ZSBwYXR0ZXJuLCBjb250cm9sbGVyLCBhY3Rpb24sIG9wdGlvbnNcbiAgICAjIFJlZ2lzdGVyIHRoZSByb3V0ZSBhdCB0aGUgQmFja2JvbmUuSGlzdG9yeSBpbnN0YW5jZS5cbiAgICAjIERvbuKAmXQgdXNlIEJhY2tib25lLmhpc3Rvcnkucm91dGUgaGVyZSBiZWNhdXNlIGl0IGNhbGxzXG4gICAgIyBoYW5kbGVycy51bnNoaWZ0LCBpbnNlcnRpbmcgdGhlIGhhbmRsZXIgYXQgdGhlIHRvcCBvZiB0aGUgbGlzdC5cbiAgICAjIFNpbmNlIHdlIHdhbnQgcm91dGVzIHRvIG1hdGNoIGluIHRoZSBvcmRlciB0aGV5IHdlcmUgc3BlY2lmaWVkLFxuICAgICMgd2XigJlyZSBhcHBlbmRpbmcgdGhlIHJvdXRlIGF0IHRoZSBlbmQuXG4gICAgQmFja2JvbmUuaGlzdG9yeS5oYW5kbGVycy5wdXNoIHtyb3V0ZSwgY2FsbGJhY2s6IHJvdXRlLmhhbmRsZXJ9XG4gICAgcm91dGVcblxuICAjIFJvdXRlIGEgZ2l2ZW4gVVJMIHBhdGggbWFudWFsbHkuIFJldHVybnMgd2hldGhlciBhIHJvdXRlIG1hdGNoZWQuXG4gICMgVGhpcyBsb29rcyBxdWl0ZSBsaWtlIEJhY2tib25lLkhpc3Rvcnk6OmxvYWRVcmwgYnV0IGl0XG4gICMgYWNjZXB0cyBhbiBhYnNvbHV0ZSBVUkwgd2l0aCBhIGxlYWRpbmcgc2xhc2ggKGUuZy4gL2ZvbylcbiAgIyBhbmQgcGFzc2VzIHRoZSByb3V0aW5nIG9wdGlvbnMgdG8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICByb3V0ZTogKHBhdGhEZXNjLCBwYXJhbXMsIG9wdGlvbnMpIC0+XG4gICAgIyBUcnkgdG8gZXh0cmFjdCBhbiBVUkwgZnJvbSB0aGUgcGF0aERlc2MgaWYgaXQncyBhIGhhc2guXG4gICAgaWYgcGF0aERlc2MgYW5kIHR5cGVvZiBwYXRoRGVzYyBpcyAnb2JqZWN0J1xuICAgICAgcGF0aCA9IHBhdGhEZXNjLnVybFxuICAgICAgcGFyYW1zID0gcGF0aERlc2MucGFyYW1zIGlmIG5vdCBwYXJhbXMgYW5kIHBhdGhEZXNjLnBhcmFtc1xuXG4gICAgcGFyYW1zID0gaWYgQXJyYXkuaXNBcnJheSBwYXJhbXNcbiAgICAgIHBhcmFtcy5zbGljZSgpXG4gICAgZWxzZVxuICAgICAgXy5leHRlbmQge30sIHBhcmFtc1xuXG4gICAgIyBBY2NlcHQgcGF0aCB0byBiZSBnaXZlbiB2aWEgVVJMIHdyYXBwZWQgaW4gb2JqZWN0LFxuICAgICMgb3IgaW1wbGljaXRseSB2aWEgcm91dGUgbmFtZSwgb3IgZXhwbGljaXRseSB2aWEgb2JqZWN0LlxuICAgIGlmIHBhdGg/XG4gICAgICAjIFJlbW92ZSBsZWFkaW5nIHN1YmRpciBhbmQgaGFzaCBvciBzbGFzaC5cbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UgQHJlbW92ZVJvb3QsICcnXG5cbiAgICAgICMgRmluZCBhIG1hdGNoaW5nIHJvdXRlLlxuICAgICAgaGFuZGxlciA9IEBmaW5kSGFuZGxlciAoaGFuZGxlcikgLT4gaGFuZGxlci5yb3V0ZS50ZXN0IHBhdGhcblxuICAgICAgIyBPcHRpb25zIGlzIHRoZSBzZWNvbmQgYXJndW1lbnQgaW4gdGhpcyBjYXNlLlxuICAgICAgb3B0aW9ucyA9IHBhcmFtc1xuICAgICAgcGFyYW1zID0gbnVsbFxuICAgIGVsc2VcbiAgICAgIG9wdGlvbnMgPSBfLmV4dGVuZCB7fSwgb3B0aW9uc1xuXG4gICAgICAjIEZpbmQgYSByb3V0ZSB1c2luZyBhIHBhc3NlZCB2aWEgcGF0aERlc2Mgc3RyaW5nIHJvdXRlIG5hbWUuXG4gICAgICBoYW5kbGVyID0gQGZpbmRIYW5kbGVyIChoYW5kbGVyKSAtPlxuICAgICAgICBpZiBoYW5kbGVyLnJvdXRlLm1hdGNoZXMgcGF0aERlc2NcbiAgICAgICAgICBwYXJhbXMgPSBoYW5kbGVyLnJvdXRlLm5vcm1hbGl6ZVBhcmFtcyBwYXJhbXNcbiAgICAgICAgICByZXR1cm4gdHJ1ZSBpZiBwYXJhbXNcbiAgICAgICAgZmFsc2VcblxuICAgIGlmIGhhbmRsZXJcbiAgICAgICMgVXBkYXRlIHRoZSBVUkwgcHJvZ3JhbW1hdGljYWxseSBhZnRlciByb3V0aW5nLlxuICAgICAgXy5kZWZhdWx0cyBvcHRpb25zLCBjaGFuZ2VVUkw6IHRydWVcblxuICAgICAgcGF0aFBhcmFtcyA9IGlmIHBhdGg/IHRoZW4gcGF0aCBlbHNlIHBhcmFtc1xuICAgICAgaGFuZGxlci5jYWxsYmFjayBwYXRoUGFyYW1zLCBvcHRpb25zXG4gICAgICB0cnVlXG4gICAgZWxzZVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdSb3V0ZXIjcm91dGU6IHJlcXVlc3Qgd2FzIG5vdCByb3V0ZWQnXG5cbiAgIyBGaW5kIHRoZSBVUkwgZm9yIGdpdmVuIGNyaXRlcmlhIHVzaW5nIHRoZSByZWdpc3RlcmVkIHJvdXRlcyBhbmRcbiAgIyBwcm92aWRlZCBwYXJhbWV0ZXJzLiBUaGUgY3JpdGVyaWEgbWF5IGJlIGp1c3QgdGhlIG5hbWUgb2YgYSByb3V0ZVxuICAjIG9yIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBuYW1lLCBjb250cm9sbGVyLCBhbmQvb3IgYWN0aW9uLlxuICAjIFdhcm5pbmc6IHRoaXMgaXMgdXN1YWxseSAqKmhvdCoqIGNvZGUgaW4gdGVybXMgb2YgcGVyZm9ybWFuY2UuXG4gICMgUmV0dXJucyB0aGUgVVJMIHN0cmluZyBvciBmYWxzZS5cbiAgcmV2ZXJzZTogKGNyaXRlcmlhLCBwYXJhbXMsIHF1ZXJ5KSAtPlxuICAgIHJvb3QgPSBAb3B0aW9ucy5yb290XG5cbiAgICBpZiBwYXJhbXM/IGFuZCB0eXBlb2YgcGFyYW1zIGlzbnQgJ29iamVjdCdcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgJ1JvdXRlciNyZXZlcnNlOiBwYXJhbXMgbXVzdCBiZSBhbiBhcnJheSBvciBhbiAnICtcbiAgICAgICAgJ29iamVjdCdcblxuICAgICMgRmlyc3QgZmlsdGVyIHRoZSByb3V0ZSBoYW5kbGVycyB0byB0aG9zZSB0aGF0IGFyZSBvZiB0aGUgc2FtZSBuYW1lLlxuICAgIGhhbmRsZXJzID0gQmFja2JvbmUuaGlzdG9yeS5oYW5kbGVyc1xuICAgIGZvciBoYW5kbGVyIGluIGhhbmRsZXJzIHdoZW4gaGFuZGxlci5yb3V0ZS5tYXRjaGVzIGNyaXRlcmlhXG4gICAgICAjIEF0dGVtcHQgdG8gcmV2ZXJzZSB1c2luZyB0aGUgcHJvdmlkZWQgcGFyYW1ldGVyIGhhc2guXG4gICAgICByZXZlcnNlZCA9IGhhbmRsZXIucm91dGUucmV2ZXJzZSBwYXJhbXMsIHF1ZXJ5XG5cbiAgICAgICMgUmV0dXJuIHRoZSB1cmwgaWYgd2UgZ290IGEgdmFsaWQgb25lOyBlbHNlIHdlIGNvbnRpbnVlIG9uLlxuICAgICAgaWYgcmV2ZXJzZWQgaXNudCBmYWxzZVxuICAgICAgICB1cmwgPSBpZiByb290IHRoZW4gcm9vdCArIHJldmVyc2VkIGVsc2UgcmV2ZXJzZWRcbiAgICAgICAgcmV0dXJuIHVybFxuXG4gICAgIyBXZSBkaWRuJ3QgZ2V0IGFueXRoaW5nLlxuICAgIHRocm93IG5ldyBFcnJvciAnUm91dGVyI3JldmVyc2U6IGludmFsaWQgcm91dGUgY3JpdGVyaWEgc3BlY2lmaWVkOiAnICtcbiAgICAgIFwiI3tKU09OLnN0cmluZ2lmeSBjcml0ZXJpYX1cIlxuXG4gICMgQ2hhbmdlIHRoZSBjdXJyZW50IFVSTCwgYWRkIGEgaGlzdG9yeSBlbnRyeS5cbiAgY2hhbmdlVVJMOiAoY29udHJvbGxlciwgcGFyYW1zLCByb3V0ZSwgb3B0aW9ucykgLT5cbiAgICByZXR1cm4gdW5sZXNzIHJvdXRlLnBhdGg/IGFuZCBvcHRpb25zPy5jaGFuZ2VVUkxcblxuICAgIHVybCA9IHJvdXRlLnBhdGggKyBpZiByb3V0ZS5xdWVyeSB0aGVuIFwiPyN7cm91dGUucXVlcnl9XCIgZWxzZSAnJ1xuXG4gICAgbmF2aWdhdGVPcHRpb25zID1cbiAgICAgICMgRG8gbm90IHRyaWdnZXIgb3IgcmVwbGFjZSBwZXIgZGVmYXVsdC5cbiAgICAgIHRyaWdnZXI6IG9wdGlvbnMudHJpZ2dlciBpcyB0cnVlXG4gICAgICByZXBsYWNlOiBvcHRpb25zLnJlcGxhY2UgaXMgdHJ1ZVxuXG4gICAgIyBOYXZpZ2F0ZSB0byB0aGUgcGFzc2VkIFVSTCBhbmQgZm9yd2FyZCBvcHRpb25zIHRvIEJhY2tib25lLlxuICAgIEJhY2tib25lLmhpc3RvcnkubmF2aWdhdGUgdXJsLCBuYXZpZ2F0ZU9wdGlvbnNcblxuICAjIERpc3Bvc2FsXG4gICMgLS0tLS0tLS1cblxuICBkaXNwb3NlZDogZmFsc2VcblxuICBkaXNwb3NlOiAtPlxuICAgIHJldHVybiBpZiBAZGlzcG9zZWRcblxuICAgICMgU3RvcCBCYWNrYm9uZS5IaXN0b3J5IGluc3RhbmNlIGFuZCByZW1vdmUgaXQuXG4gICAgQHN0b3BIaXN0b3J5KClcbiAgICBkZWxldGUgQmFja2JvbmUuaGlzdG9yeVxuXG4gICAgQHVuc3Vic2NyaWJlQWxsRXZlbnRzKClcblxuICAgIG1lZGlhdG9yLnJlbW92ZUhhbmRsZXJzIHRoaXNcblxuICAgICMgRmluaXNoZWQuXG4gICAgQGRpc3Bvc2VkID0gdHJ1ZVxuXG4gICAgIyBZb3XigJlyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ04oCZcyBub3Qgb3Blbi5cbiAgICBPYmplY3QuZnJlZXplIHRoaXNcbiIsIid1c2Ugc3RyaWN0J1xuXG4jIEJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IG1vZHVsZVxuIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxubW9kdWxlLmV4cG9ydHMgPVxuICBwcm9wZXJ0eURlc2NyaXB0b3JzOiB5ZXMiLCIndXNlIHN0cmljdCdcblxuIyBTaW1wbGUgZmluaXRlIHN0YXRlIG1hY2hpbmUgZm9yIHN5bmNocm9uaXphdGlvbiBvZiBtb2RlbHMvY29sbGVjdGlvbnNcbiMgVGhyZWUgc3RhdGVzOiB1bnN5bmNlZCwgc3luY2luZyBhbmQgc3luY2VkXG4jIFNldmVyYWwgdHJhbnNpdGlvbnMgYmV0d2VlbiB0aGVtXG4jIEZpcmVzIEJhY2tib25lIGV2ZW50cyBvbiBldmVyeSB0cmFuc2l0aW9uXG4jICh1bnN5bmNlZCwgc3luY2luZywgc3luY2VkOyBzeW5jU3RhdGVDaGFuZ2UpXG4jIFByb3ZpZGVzIHNob3J0Y3V0IG1ldGhvZHMgdG8gY2FsbCBoYW5kbGVycyB3aGVuIGEgZ2l2ZW4gc3RhdGUgaXMgcmVhY2hlZFxuIyAobmFtZWQgYWZ0ZXIgdGhlIGV2ZW50cyBhYm92ZSlcblxuVU5TWU5DRUQgPSAndW5zeW5jZWQnXG5TWU5DSU5HICA9ICdzeW5jaW5nJ1xuU1lOQ0VEICAgPSAnc3luY2VkJ1xuXG5TVEFURV9DSEFOR0UgPSAnc3luY1N0YXRlQ2hhbmdlJ1xuXG5TeW5jTWFjaGluZSA9XG4gIF9zeW5jU3RhdGU6IFVOU1lOQ0VEXG4gIF9wcmV2aW91c1N5bmNTdGF0ZTogbnVsbFxuXG4gICMgR2V0IHRoZSBjdXJyZW50IHN0YXRlXG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgc3luY1N0YXRlOiAtPlxuICAgIEBfc3luY1N0YXRlXG5cbiAgaXNVbnN5bmNlZDogLT5cbiAgICBAX3N5bmNTdGF0ZSBpcyBVTlNZTkNFRFxuXG4gIGlzU3luY2VkOiAtPlxuICAgIEBfc3luY1N0YXRlIGlzIFNZTkNFRFxuXG4gIGlzU3luY2luZzogLT5cbiAgICBAX3N5bmNTdGF0ZSBpcyBTWU5DSU5HXG5cbiAgIyBUcmFuc2l0aW9uc1xuICAjIC0tLS0tLS0tLS0tXG5cbiAgdW5zeW5jOiAtPlxuICAgIGlmIEBfc3luY1N0YXRlIGluIFtTWU5DSU5HLCBTWU5DRURdXG4gICAgICBAX3ByZXZpb3VzU3luYyA9IEBfc3luY1N0YXRlXG4gICAgICBAX3N5bmNTdGF0ZSA9IFVOU1lOQ0VEXG4gICAgICBAdHJpZ2dlciBAX3N5bmNTdGF0ZSwgdGhpcywgQF9zeW5jU3RhdGVcbiAgICAgIEB0cmlnZ2VyIFNUQVRFX0NIQU5HRSwgdGhpcywgQF9zeW5jU3RhdGVcbiAgICAjIHdoZW4gVU5TWU5DRUQgZG8gbm90aGluZ1xuICAgIHJldHVyblxuXG4gIGJlZ2luU3luYzogLT5cbiAgICBpZiBAX3N5bmNTdGF0ZSBpbiBbVU5TWU5DRUQsIFNZTkNFRF1cbiAgICAgIEBfcHJldmlvdXNTeW5jID0gQF9zeW5jU3RhdGVcbiAgICAgIEBfc3luY1N0YXRlID0gU1lOQ0lOR1xuICAgICAgQHRyaWdnZXIgQF9zeW5jU3RhdGUsIHRoaXMsIEBfc3luY1N0YXRlXG4gICAgICBAdHJpZ2dlciBTVEFURV9DSEFOR0UsIHRoaXMsIEBfc3luY1N0YXRlXG4gICAgIyB3aGVuIFNZTkNJTkcgZG8gbm90aGluZ1xuICAgIHJldHVyblxuXG4gIGZpbmlzaFN5bmM6IC0+XG4gICAgaWYgQF9zeW5jU3RhdGUgaXMgU1lOQ0lOR1xuICAgICAgQF9wcmV2aW91c1N5bmMgPSBAX3N5bmNTdGF0ZVxuICAgICAgQF9zeW5jU3RhdGUgPSBTWU5DRURcbiAgICAgIEB0cmlnZ2VyIEBfc3luY1N0YXRlLCB0aGlzLCBAX3N5bmNTdGF0ZVxuICAgICAgQHRyaWdnZXIgU1RBVEVfQ0hBTkdFLCB0aGlzLCBAX3N5bmNTdGF0ZVxuICAgICMgd2hlbiBTWU5DRUQsIFVOU1lOQ0VEIGRvIG5vdGhpbmdcbiAgICByZXR1cm5cblxuICBhYm9ydFN5bmM6IC0+XG4gICAgaWYgQF9zeW5jU3RhdGUgaXMgU1lOQ0lOR1xuICAgICAgQF9zeW5jU3RhdGUgPSBAX3ByZXZpb3VzU3luY1xuICAgICAgQF9wcmV2aW91c1N5bmMgPSBAX3N5bmNTdGF0ZVxuICAgICAgQHRyaWdnZXIgQF9zeW5jU3RhdGUsIHRoaXMsIEBfc3luY1N0YXRlXG4gICAgICBAdHJpZ2dlciBTVEFURV9DSEFOR0UsIHRoaXMsIEBfc3luY1N0YXRlXG4gICAgIyB3aGVuIFVOU1lOQ0VELCBTWU5DRUQgZG8gbm90aGluZ1xuICAgIHJldHVyblxuXG4jIENyZWF0ZSBzaG9ydGN1dCBtZXRob2RzIHRvIGJpbmQgYSBoYW5kbGVyIHRvIGEgc3RhdGUgY2hhbmdlXG4jIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZvciBldmVudCBpbiBbVU5TWU5DRUQsIFNZTkNJTkcsIFNZTkNFRCwgU1RBVEVfQ0hBTkdFXVxuICBkbyAoZXZlbnQpIC0+XG4gICAgU3luY01hY2hpbmVbZXZlbnRdID0gKGNhbGxiYWNrLCBjb250ZXh0ID0gdGhpcykgLT5cbiAgICAgIEBvbiBldmVudCwgY2FsbGJhY2ssIGNvbnRleHRcbiAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCkgaWYgQF9zeW5jU3RhdGUgaXMgZXZlbnRcblxuIyBZb3XigJlyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ04oCZcyBub3Qgb3Blbi5cbk9iamVjdC5mcmVlemUgU3luY01hY2hpbmVcblxuIyBSZXR1cm4gb3VyIGNyZWF0aW9uLlxubW9kdWxlLmV4cG9ydHMgPSBTeW5jTWFjaGluZVxuIiwiJ3VzZSBzdHJpY3QnXG5cbiMgVXRpbGl0aWVzXG4jIC0tLS0tLS0tLVxuXG51dGlscyA9XG4gIGlzRW1wdHk6IChvYmplY3QpIC0+XG4gICAgbm90IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCkubGVuZ3RoXG5cbiAgIyBTaW1wbGUgZHVjay10eXBpbmcgc2VyaWFsaXplciBmb3IgbW9kZWxzIGFuZCBjb2xsZWN0aW9ucy5cbiAgc2VyaWFsaXplOiAoZGF0YSkgLT5cbiAgICBpZiB0eXBlb2YgZGF0YS5zZXJpYWxpemUgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgZGF0YS5zZXJpYWxpemUoKVxuICAgIGVsc2UgaWYgdHlwZW9mIGRhdGEudG9KU09OIGlzICdmdW5jdGlvbidcbiAgICAgIGRhdGEudG9KU09OKClcbiAgICBlbHNlXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yICd1dGlscy5zZXJpYWxpemU6IFVua25vd24gZGF0YSB3YXMgcGFzc2VkJ1xuXG4gICMgTWFrZSBwcm9wZXJ0aWVzIHJlYWRvbmx5IGFuZCBub3QgY29uZmlndXJhYmxlXG4gICMgdXNpbmcgRUNNQVNjcmlwdCA1IHByb3BlcnR5IGRlc2NyaXB0b3JzLlxuICByZWFkb25seTogKG9iamVjdCwga2V5cy4uLikgLT5cbiAgICBmb3Iga2V5IGluIGtleXNcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBvYmplY3QsIGtleSxcbiAgICAgICAgdmFsdWU6IG9iamVjdFtrZXldXG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZVxuICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlXG4gICAgIyBBbHdheXMgcmV0dXJuIGB0cnVlYCBmb3IgY29tcGF0aWJpbGl0eSByZWFzb25zLlxuICAgIHRydWVcblxuICAjIEdldCB0aGUgd2hvbGUgY2hhaW4gb2Ygb2JqZWN0IHByb3RvdHlwZXMuXG4gIGdldFByb3RvdHlwZUNoYWluOiAob2JqZWN0KSAtPlxuICAgIGNoYWluID0gW11cbiAgICB3aGlsZSBvYmplY3QgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Ygb2JqZWN0XG4gICAgICBjaGFpbi51bnNoaWZ0IG9iamVjdFxuICAgIGNoYWluXG5cbiAgIyBHZXQgYWxsIHByb3BlcnR5IHZlcnNpb25zIGZyb20gb2JqZWN04oCZcyBwcm90b3R5cGUgY2hhaW4uXG4gICMgRS5nLiBpZiBvYmplY3QxICYgb2JqZWN0MiBoYXZlIGBrZXlgIGFuZCBvYmplY3QyIGluaGVyaXRzIGZyb21cbiAgIyBvYmplY3QxLCBpdCB3aWxsIGdldCBbb2JqZWN0MXByb3AsIG9iamVjdDJwcm9wXS5cbiAgZ2V0QWxsUHJvcGVydHlWZXJzaW9uczogKG9iamVjdCwga2V5KSAtPlxuICAgIHJlc3VsdCA9IFtdXG4gICAgZm9yIHByb3RvIGluIHV0aWxzLmdldFByb3RvdHlwZUNoYWluIG9iamVjdFxuICAgICAgdmFsdWUgPSBwcm90b1trZXldXG4gICAgICBpZiB2YWx1ZSBhbmQgdmFsdWUgbm90IGluIHJlc3VsdFxuICAgICAgICByZXN1bHQucHVzaCB2YWx1ZVxuICAgIHJlc3VsdFxuXG4gICMgU3RyaW5nIEhlbHBlcnNcbiAgIyAtLS0tLS0tLS0tLS0tLVxuXG4gICMgVXBjYXNlIHRoZSBmaXJzdCBjaGFyYWN0ZXIuXG4gIHVwY2FzZTogKHN0cikgLT5cbiAgICBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UgMVxuXG4gICMgRXNjYXBlcyBhIHN0cmluZyB0byB1c2UgaW4gYSByZWdleC5cbiAgZXNjYXBlUmVnRXhwOiAoc3RyKSAtPlxuICAgIHJldHVybiBTdHJpbmcoc3RyIG9yICcnKS5yZXBsYWNlIC8oWy4qKz9ePSE6JHt9KCl8W1xcXVxcL1xcXFxdKS9nLCAnXFxcXCQxJ1xuXG5cbiAgIyBFdmVudCBoYW5kbGluZyBoZWxwZXJzXG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICMgUmV0dXJucyB3aGV0aGVyIGEgbW9kaWZpZXIga2V5IGlzIHByZXNzZWQgZHVyaW5nIGEga2V5cHJlc3Mgb3IgbW91c2UgY2xpY2suXG4gIG1vZGlmaWVyS2V5UHJlc3NlZDogKGV2ZW50KSAtPlxuICAgIGV2ZW50LnNoaWZ0S2V5IG9yIGV2ZW50LmFsdEtleSBvciBldmVudC5jdHJsS2V5IG9yIGV2ZW50Lm1ldGFLZXlcblxuICAjIFJvdXRpbmcgSGVscGVyc1xuICAjIC0tLS0tLS0tLS0tLS0tLVxuXG4gICMgUmV0dXJucyB0aGUgdXJsIGZvciBhIG5hbWVkIHJvdXRlIGFuZCBhbnkgcGFyYW1zLlxuICByZXZlcnNlOiAoY3JpdGVyaWEsIHBhcmFtcywgcXVlcnkpIC0+XG4gICAgcmVxdWlyZSgnLi4vbWVkaWF0b3InKS5leGVjdXRlICdyb3V0ZXI6cmV2ZXJzZScsXG4gICAgICBjcml0ZXJpYSwgcGFyYW1zLCBxdWVyeVxuXG4gICMgUmVkaXJlY3RzIHRvIFVSTCwgcm91dGUgbmFtZSBvciBjb250cm9sbGVyIGFuZCBhY3Rpb24gcGFpci5cbiAgcmVkaXJlY3RUbzogKHBhdGhEZXNjLCBwYXJhbXMsIG9wdGlvbnMpIC0+XG4gICAgcmVxdWlyZSgnLi4vbWVkaWF0b3InKS5leGVjdXRlICdyb3V0ZXI6cm91dGUnLFxuICAgICAgcGF0aERlc2MsIHBhcmFtcywgb3B0aW9uc1xuXG4gICMgRGV0ZXJtaW5lcyBtb2R1bGUgc3lzdGVtIGFuZCByZXR1cm5zIG1vZHVsZSBsb2FkZXIgZnVuY3Rpb24uXG4gIGxvYWRNb2R1bGU6IGRvIC0+XG4gICAgaWYgdHlwZW9mIGRlZmluZSBpcyAnZnVuY3Rpb24nIGFuZCBkZWZpbmUuYW1kXG4gICAgICAobW9kdWxlTmFtZSwgaGFuZGxlcikgLT5cbiAgICAgICAgcmVxdWlyZSBbbW9kdWxlTmFtZV0sIGhhbmRsZXJcbiAgICBlbHNlXG4gICAgICBlbnF1ZXVlID0gc2V0SW1tZWRpYXRlID8gc2V0VGltZW91dFxuXG4gICAgICAobW9kdWxlTmFtZSwgaGFuZGxlcikgLT5cbiAgICAgICAgZW5xdWV1ZSAtPiBoYW5kbGVyIHJlcXVpcmUgbW9kdWxlTmFtZVxuXG4gICMgRE9NIGhlbHBlcnNcbiAgIyAtLS0tLS0tLS0tLVxuXG4gIG1hdGNoZXNTZWxlY3RvcjogZG8gLT5cbiAgICBlbCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuICAgIG1hdGNoZXMgPSBlbC5tYXRjaGVzIG9yXG4gICAgZWwubXNNYXRjaGVzU2VsZWN0b3Igb3JcbiAgICBlbC5tb3pNYXRjaGVzU2VsZWN0b3Igb3JcbiAgICBlbC53ZWJraXRNYXRjaGVzU2VsZWN0b3JcblxuICAgIC0+IG1hdGNoZXMuY2FsbCBhcmd1bWVudHMuLi5cblxuICAjIFF1ZXJ5IHBhcmFtZXRlcnMgSGVscGVyc1xuICAjIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHF1ZXJ5c3RyaW5nOlxuXG4gICAgIyBSZXR1cm5zIGEgcXVlcnkgc3RyaW5nIGZyb20gYSBoYXNoLlxuICAgIHN0cmluZ2lmeTogKHBhcmFtcyA9IHt9LCByZXBsYWNlcikgLT5cbiAgICAgIGlmIHR5cGVvZiByZXBsYWNlciBpc250ICdmdW5jdGlvbidcbiAgICAgICAgcmVwbGFjZXIgPSAoa2V5LCB2YWx1ZSkgLT5cbiAgICAgICAgICBpZiBBcnJheS5pc0FycmF5IHZhbHVlXG4gICAgICAgICAgICB2YWx1ZS5tYXAgKHZhbHVlKSAtPiB7a2V5LCB2YWx1ZX1cbiAgICAgICAgICBlbHNlIGlmIHZhbHVlP1xuICAgICAgICAgICAge2tleSwgdmFsdWV9XG5cbiAgICAgIE9iamVjdC5rZXlzKHBhcmFtcykucmVkdWNlIChwYWlycywga2V5KSAtPlxuICAgICAgICBwYWlyID0gcmVwbGFjZXIga2V5LCBwYXJhbXNba2V5XVxuICAgICAgICBwYWlycy5jb25jYXQgcGFpciBvciBbXVxuICAgICAgLCBbXVxuICAgICAgLm1hcCAoe2tleSwgdmFsdWV9KSAtPlxuICAgICAgICBba2V5LCB2YWx1ZV0ubWFwKGVuY29kZVVSSUNvbXBvbmVudCkuam9pbiAnPSdcbiAgICAgIC5qb2luICcmJ1xuXG4gICAgIyBSZXR1cm5zIGEgaGFzaCB3aXRoIHF1ZXJ5IHBhcmFtZXRlcnMgZnJvbSBhIHF1ZXJ5IHN0cmluZy5cbiAgICBwYXJzZTogKHN0cmluZyA9ICcnLCByZXZpdmVyKSAtPlxuICAgICAgaWYgdHlwZW9mIHJldml2ZXIgaXNudCAnZnVuY3Rpb24nXG4gICAgICAgIHJldml2ZXIgPSAoa2V5LCB2YWx1ZSkgLT4ge2tleSwgdmFsdWV9XG5cbiAgICAgIHN0cmluZyA9IHN0cmluZy5zbGljZSAxICsgc3RyaW5nLmluZGV4T2YgJz8nXG4gICAgICBzdHJpbmcuc3BsaXQoJyYnKS5yZWR1Y2UgKHBhcmFtcywgcGFpcikgLT5cbiAgICAgICAgcGFydHMgPSBwYWlyLnNwbGl0KCc9JykubWFwIGRlY29kZVVSSUNvbXBvbmVudFxuICAgICAgICB7a2V5LCB2YWx1ZX0gPSByZXZpdmVyKHBhcnRzLi4uKSBvciB7fVxuXG4gICAgICAgIGlmIHZhbHVlPyB0aGVuIHBhcmFtc1trZXldID1cbiAgICAgICAgICBpZiBwYXJhbXMuaGFzT3duUHJvcGVydHkga2V5XG4gICAgICAgICAgICBbXS5jb25jYXQgcGFyYW1zW2tleV0sIHZhbHVlXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgdmFsdWVcblxuICAgICAgICBwYXJhbXNcbiAgICAgICwge31cblxuXG4jIEJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IG1ldGhvZHNcbiMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG51dGlscy5iZWdldCA9IE9iamVjdC5jcmVhdGVcbnV0aWxzLmluZGV4T2YgPSAoYXJyYXksIGl0ZW0pIC0+IGFycmF5LmluZGV4T2YgaXRlbVxudXRpbHMuaXNBcnJheSA9IEFycmF5LmlzQXJyYXlcbnV0aWxzLnF1ZXJ5UGFyYW1zID0gdXRpbHMucXVlcnlzdHJpbmdcblxuIyBGaW5pc2hcbiMgLS0tLS0tXG5cbiMgU2VhbCB0aGUgdXRpbHMgb2JqZWN0LlxuT2JqZWN0LnNlYWwgdXRpbHNcblxuIyBSZXR1cm4gb3VyIGNyZWF0aW9uLlxubW9kdWxlLmV4cG9ydHMgPSB1dGlsc1xuIiwiJ3VzZSBzdHJpY3QnXG5cbkJhY2tib25lID0gcmVxdWlyZSAnYmFja2JvbmUnXG51dGlscyA9IHJlcXVpcmUgJy4vbGliL3V0aWxzJ1xuXG4jIE1lZGlhdG9yXG4jIC0tLS0tLS0tXG5cbiMgVGhlIG1lZGlhdG9yIGlzIGEgc2ltcGxlIG9iamVjdCBhbGwgb3RoZXIgbW9kdWxlcyB1c2UgdG8gY29tbXVuaWNhdGVcbiMgd2l0aCBlYWNoIG90aGVyLiBJdCBpbXBsZW1lbnRzIHRoZSBQdWJsaXNoL1N1YnNjcmliZSBwYXR0ZXJuLlxuI1xuIyBBZGRpdGlvbmFsbHksIGl0IGhvbGRzIG9iamVjdHMgd2hpY2ggbmVlZCB0byBiZSBzaGFyZWQgYmV0d2VlbiBtb2R1bGVzLlxuIyBJbiB0aGlzIGNhc2UsIGEgYHVzZXJgIHByb3BlcnR5IGlzIGNyZWF0ZWQgZm9yIGdldHRpbmcgdGhlIHVzZXIgb2JqZWN0XG4jIGFuZCBhIGBzZXRVc2VyYCBtZXRob2QgZm9yIHNldHRpbmcgdGhlIHVzZXIuXG4jXG4jIFRoaXMgbW9kdWxlIHJldHVybnMgdGhlIHNpbmdsZXRvbiBvYmplY3QuIFRoaXMgaXMgdGhlXG4jIGFwcGxpY2F0aW9uLXdpZGUgbWVkaWF0b3IgeW91IG1pZ2h0IGxvYWQgaW50byBtb2R1bGVzXG4jIHdoaWNoIG5lZWQgdG8gdGFsayB0byBvdGhlciBtb2R1bGVzIHVzaW5nIFB1Ymxpc2gvU3Vic2NyaWJlLlxuXG4jIFN0YXJ0IHdpdGggYSBzaW1wbGUgb2JqZWN0XG5tZWRpYXRvciA9IHt9XG5cbiMgUHVibGlzaCAvIFN1YnNjcmliZVxuIyAtLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMgTWl4aW4gZXZlbnQgbWV0aG9kcyBmcm9tIEJhY2tib25lLkV2ZW50cyxcbiMgY3JlYXRlIFB1Ymxpc2gvU3Vic2NyaWJlIGFsaWFzZXMuXG5tZWRpYXRvci5zdWJzY3JpYmUgICAgID0gbWVkaWF0b3Iub24gICAgICA9IEJhY2tib25lLkV2ZW50cy5vblxubWVkaWF0b3Iuc3Vic2NyaWJlT25jZSA9IG1lZGlhdG9yLm9uY2UgICAgPSBCYWNrYm9uZS5FdmVudHMub25jZVxubWVkaWF0b3IudW5zdWJzY3JpYmUgICA9IG1lZGlhdG9yLm9mZiAgICAgPSBCYWNrYm9uZS5FdmVudHMub2ZmXG5tZWRpYXRvci5wdWJsaXNoICAgICAgID0gbWVkaWF0b3IudHJpZ2dlciA9IEJhY2tib25lLkV2ZW50cy50cmlnZ2VyXG5cbiMgSW5pdGlhbGl6ZSBhbiBlbXB0eSBjYWxsYmFjayBsaXN0IHNvIHdlIG1pZ2h0IHNlYWwgdGhlIG1lZGlhdG9yIGxhdGVyLlxubWVkaWF0b3IuX2NhbGxiYWNrcyA9IG51bGxcblxuIyBSZXF1ZXN0IC8gUmVzcG9uc2VcbiMgLS3igJMtLS0tLS0tLS0tLS0tLS1cblxuIyBMaWtlIHB1YiAvIHN1YiwgYnV0IHdpdGggb25lIGhhbmRsZXIuIFNpbWlsYXIgdG8gT09QIG1lc3NhZ2UgcGFzc2luZy5cblxuaGFuZGxlcnMgPSBtZWRpYXRvci5faGFuZGxlcnMgPSB7fVxuXG4jIFNldHMgYSBoYW5kbGVyIGZ1bmN0aW9uIGZvciByZXF1ZXN0cy5cbm1lZGlhdG9yLnNldEhhbmRsZXIgPSAobmFtZSwgbWV0aG9kLCBpbnN0YW5jZSkgLT5cbiAgaGFuZGxlcnNbbmFtZV0gPSB7aW5zdGFuY2UsIG1ldGhvZH1cblxuIyBSZXRyaWV2ZXMgYSBoYW5kbGVyIGZ1bmN0aW9uIGFuZCBleGVjdXRlcyBpdC5cbm1lZGlhdG9yLmV4ZWN1dGUgPSAob3B0aW9ucywgYXJncy4uLikgLT5cbiAgaWYgb3B0aW9ucyBhbmQgdHlwZW9mIG9wdGlvbnMgaXMgJ29iamVjdCdcbiAgICB7bmFtZSwgc2lsZW50fSA9IG9wdGlvbnNcbiAgZWxzZVxuICAgIG5hbWUgPSBvcHRpb25zXG4gIGhhbmRsZXIgPSBoYW5kbGVyc1tuYW1lXVxuICBpZiBoYW5kbGVyXG4gICAgaGFuZGxlci5tZXRob2QuYXBwbHkgaGFuZGxlci5pbnN0YW5jZSwgYXJnc1xuICBlbHNlIGlmIG5vdCBzaWxlbnRcbiAgICB0aHJvdyBuZXcgRXJyb3IgXCJtZWRpYXRvci5leGVjdXRlOiAje25hbWV9IGhhbmRsZXIgaXMgbm90IGRlZmluZWRcIlxuXG4jIFJlbW92ZXMgaGFuZGxlcnMgZnJvbSBzdG9yYWdlLlxuIyBDYW4gdGFrZSBubyBhcmdzLCBsaXN0IG9mIGhhbmRsZXIgbmFtZXMgb3IgaW5zdGFuY2Ugd2hpY2ggaGFkIGJvdW5kIGhhbmRsZXJzLlxubWVkaWF0b3IucmVtb3ZlSGFuZGxlcnMgPSAoaW5zdGFuY2VPck5hbWVzKSAtPlxuICB1bmxlc3MgaW5zdGFuY2VPck5hbWVzXG4gICAgbWVkaWF0b3IuX2hhbmRsZXJzID0ge31cblxuICBpZiBBcnJheS5pc0FycmF5IGluc3RhbmNlT3JOYW1lc1xuICAgIGZvciBuYW1lIGluIGluc3RhbmNlT3JOYW1lc1xuICAgICAgZGVsZXRlIGhhbmRsZXJzW25hbWVdXG4gIGVsc2VcbiAgICBmb3IgbmFtZSwgaGFuZGxlciBvZiBoYW5kbGVycyB3aGVuIGhhbmRsZXIuaW5zdGFuY2UgaXMgaW5zdGFuY2VPck5hbWVzXG4gICAgICBkZWxldGUgaGFuZGxlcnNbbmFtZV1cbiAgcmV0dXJuXG5cbiMgU2VhbGluZyB0aGUgbWVkaWF0b3JcbiMgLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIyBBZnRlciBhZGRpbmcgYWxsIG5lZWRlZCBwcm9wZXJ0aWVzLCB5b3Ugc2hvdWxkIHNlYWwgdGhlIG1lZGlhdG9yXG4jIHVzaW5nIHRoaXMgbWV0aG9kLlxubWVkaWF0b3Iuc2VhbCA9IC0+XG4gICMgUHJldmVudCBleHRlbnNpb25zIGFuZCBtYWtlIGFsbCBwcm9wZXJ0aWVzIG5vbi1jb25maWd1cmFibGUuXG4gIE9iamVjdC5zZWFsIG1lZGlhdG9yXG5cbiMgTWFrZSBwcm9wZXJ0aWVzIHJlYWRvbmx5LlxudXRpbHMucmVhZG9ubHkgbWVkaWF0b3IsXG4gICdzdWJzY3JpYmUnLCAnc3Vic2NyaWJlT25jZScsICd1bnN1YnNjcmliZScsICdwdWJsaXNoJyxcbiAgJ3NldEhhbmRsZXInLCAnZXhlY3V0ZScsICdyZW1vdmVIYW5kbGVycycsICdzZWFsJ1xuXG4jIFJldHVybiBvdXIgY3JlYXRpb24uXG5tb2R1bGUuZXhwb3J0cyA9IG1lZGlhdG9yXG4iLCIndXNlIHN0cmljdCdcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuXG5Nb2RlbCA9IHJlcXVpcmUgJy4vbW9kZWwnXG5FdmVudEJyb2tlciA9IHJlcXVpcmUgJy4uL2xpYi9ldmVudF9icm9rZXInXG51dGlscyA9IHJlcXVpcmUgJy4uL2xpYi91dGlscydcblxuIyBBYnN0cmFjdCBjbGFzcyB3aGljaCBleHRlbmRzIHRoZSBzdGFuZGFyZCBCYWNrYm9uZSBjb2xsZWN0aW9uXG4jIGluIG9yZGVyIHRvIGFkZCBzb21lIGZ1bmN0aW9uYWxpdHkuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uXG4gICMgTWl4aW4gYW4gRXZlbnRCcm9rZXIuXG4gIF8uZXh0ZW5kIEBwcm90b3R5cGUsIEV2ZW50QnJva2VyXG5cbiAgIyBVc2UgdGhlIENoYXBsaW4gbW9kZWwgcGVyIGRlZmF1bHQsIG5vdCBCYWNrYm9uZS5Nb2RlbC5cbiAgbW9kZWw6IE1vZGVsXG5cbiAgIyBTZXJpYWxpemVzIGNvbGxlY3Rpb24uXG4gIHNlcmlhbGl6ZTogLT5cbiAgICBAbWFwIHV0aWxzLnNlcmlhbGl6ZVxuXG4gICMgRGlzcG9zYWxcbiAgIyAtLS0tLS0tLVxuXG4gIGRpc3Bvc2VkOiBmYWxzZVxuXG4gIGRpc3Bvc2U6IC0+XG4gICAgcmV0dXJuIGlmIEBkaXNwb3NlZFxuXG4gICAgIyBGaXJlIGFuIGV2ZW50IHRvIG5vdGlmeSBhc3NvY2lhdGVkIHZpZXdzLlxuICAgIEB0cmlnZ2VyICdkaXNwb3NlJywgdGhpc1xuXG4gICAgIyBFbXB0eSB0aGUgbGlzdCBzaWxlbnRseSwgYnV0IGRvIG5vdCBkaXNwb3NlIGFsbCBtb2RlbHMgc2luY2VcbiAgICAjIHRoZXkgbWlnaHQgYmUgcmVmZXJlbmNlZCBlbHNld2hlcmUuXG4gICAgQHJlc2V0IFtdLCBzaWxlbnQ6IHRydWVcblxuICAgICMgVW5iaW5kIGFsbCBnbG9iYWwgZXZlbnQgaGFuZGxlcnMuXG4gICAgQHVuc3Vic2NyaWJlQWxsRXZlbnRzKClcblxuICAgICMgVW5iaW5kIGFsbCByZWZlcmVuY2VkIGhhbmRsZXJzLlxuICAgIEBzdG9wTGlzdGVuaW5nKClcblxuICAgICMgUmVtb3ZlIGFsbCBldmVudCBoYW5kbGVycyBvbiB0aGlzIG1vZHVsZS5cbiAgICBAb2ZmKClcblxuICAgICMgUmVtb3ZlIG1vZGVsIGNvbnN0cnVjdG9yIHJlZmVyZW5jZSwgaW50ZXJuYWwgbW9kZWwgbGlzdHNcbiAgICAjIGFuZCBldmVudCBoYW5kbGVycy5cbiAgICBkZWxldGUgdGhpc1twcm9wXSBmb3IgcHJvcCBpbiBbXG4gICAgICAnbW9kZWwnLFxuICAgICAgJ21vZGVscycsICdfYnlDaWQnLFxuICAgICAgJ19jYWxsYmFja3MnXG4gICAgXVxuXG4gICAgQF9ieUlkID0ge31cblxuICAgICMgRmluaXNoZWQuXG4gICAgQGRpc3Bvc2VkID0gdHJ1ZVxuXG4gICAgIyBZb3XigJlyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ04oCZcyBub3Qgb3Blbi5cbiAgICBPYmplY3QuZnJlZXplIHRoaXNcbiIsIid1c2Ugc3RyaWN0J1xuXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZSdcbkJhY2tib25lID0gcmVxdWlyZSAnYmFja2JvbmUnXG5FdmVudEJyb2tlciA9IHJlcXVpcmUgJy4uL2xpYi9ldmVudF9icm9rZXInXG5cbiMgUHJpdmF0ZSBoZWxwZXIgZnVuY3Rpb24gZm9yIHNlcmlhbGl6aW5nIGF0dHJpYnV0ZXMgcmVjdXJzaXZlbHksXG4jIGNyZWF0aW5nIG9iamVjdHMgd2hpY2ggZGVsZWdhdGUgdG8gdGhlIG9yaWdpbmFsIGF0dHJpYnV0ZXNcbiMgaW4gb3JkZXIgdG8gcHJvdGVjdCB0aGVtIGZyb20gY2hhbmdlcy5cbnNlcmlhbGl6ZUF0dHJpYnV0ZXMgPSAobW9kZWwsIGF0dHJpYnV0ZXMsIG1vZGVsU3RhY2spIC0+XG4gICMgQ3JlYXRlIGEgZGVsZWdhdG9yIG9iamVjdC5cbiAgZGVsZWdhdG9yID0gT2JqZWN0LmNyZWF0ZSBhdHRyaWJ1dGVzXG5cbiAgIyBBZGQgbW9kZWwgdG8gc3RhY2suXG4gIG1vZGVsU3RhY2sgPz0ge31cbiAgbW9kZWxTdGFja1ttb2RlbC5jaWRdID0gdHJ1ZVxuXG4gICMgTWFwIG1vZGVsL2NvbGxlY3Rpb24gdG8gdGhlaXIgYXR0cmlidXRlcy4gQ3JlYXRlIGEgcHJvcGVydHlcbiAgIyBvbiB0aGUgZGVsZWdhdG9yIHRoYXQgc2hhZG93cyB0aGUgb3JpZ2luYWwgYXR0cmlidXRlLlxuICBmb3Iga2V5LCB2YWx1ZSBvZiBhdHRyaWJ1dGVzXG5cbiAgICAjIEhhbmRsZSBtb2RlbHMuXG4gICAgaWYgdmFsdWUgaW5zdGFuY2VvZiBCYWNrYm9uZS5Nb2RlbFxuICAgICAgZGVsZWdhdG9yW2tleV0gPSBzZXJpYWxpemVNb2RlbEF0dHJpYnV0ZXMgdmFsdWUsIG1vZGVsLCBtb2RlbFN0YWNrXG5cbiAgICAjIEhhbmRsZSBjb2xsZWN0aW9ucy5cbiAgICBlbHNlIGlmIHZhbHVlIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvblxuICAgICAgc2VyaWFsaXplZE1vZGVscyA9IFtdXG4gICAgICBmb3Igb3RoZXJNb2RlbCBpbiB2YWx1ZS5tb2RlbHNcbiAgICAgICAgc2VyaWFsaXplZE1vZGVscy5wdXNoKFxuICAgICAgICAgIHNlcmlhbGl6ZU1vZGVsQXR0cmlidXRlcyhvdGhlck1vZGVsLCBtb2RlbCwgbW9kZWxTdGFjaylcbiAgICAgICAgKVxuICAgICAgZGVsZWdhdG9yW2tleV0gPSBzZXJpYWxpemVkTW9kZWxzXG5cbiAgIyBSZW1vdmUgbW9kZWwgZnJvbSBzdGFjay5cbiAgZGVsZXRlIG1vZGVsU3RhY2tbbW9kZWwuY2lkXVxuXG4gICMgUmV0dXJuIHRoZSBkZWxlZ2F0b3IuXG4gIGRlbGVnYXRvclxuXG4jIFNlcmlhbGl6ZSB0aGUgYXR0cmlidXRlcyBvZiBhIGdpdmVuIG1vZGVsXG4jIGluIHRoZSBjb250ZXh0IG9mIGEgZ2l2ZW4gdHJlZS5cbnNlcmlhbGl6ZU1vZGVsQXR0cmlidXRlcyA9IChtb2RlbCwgY3VycmVudE1vZGVsLCBtb2RlbFN0YWNrKSAtPlxuICAjIE51bGxpZnkgY2lyY3VsYXIgcmVmZXJlbmNlcy5cbiAgcmV0dXJuIG51bGwgaWYgbW9kZWwgaXMgY3VycmVudE1vZGVsIG9yIG1vZGVsLmNpZCBvZiBtb2RlbFN0YWNrXG4gICMgU2VyaWFsaXplIHJlY3Vyc2l2ZWx5LlxuICBhdHRyaWJ1dGVzID0gaWYgdHlwZW9mIG1vZGVsLmdldEF0dHJpYnV0ZXMgaXMgJ2Z1bmN0aW9uJ1xuICAgICMgQ2hhcGxpbiBtb2RlbHMuXG4gICAgbW9kZWwuZ2V0QXR0cmlidXRlcygpXG4gIGVsc2VcbiAgICAjIEJhY2tib25lIG1vZGVscy5cbiAgICBtb2RlbC5hdHRyaWJ1dGVzXG4gIHNlcmlhbGl6ZUF0dHJpYnV0ZXMgbW9kZWwsIGF0dHJpYnV0ZXMsIG1vZGVsU3RhY2tcblxuXG4jIEFic3RyYWN0aW9uIHRoYXQgYWRkcyBzb21lIHVzZWZ1bCBmdW5jdGlvbmFsaXR5IHRvIGJhY2tib25lIG1vZGVsLlxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG4gICMgTWl4aW4gYW4gRXZlbnRCcm9rZXIuXG4gIF8uZXh0ZW5kIEBwcm90b3R5cGUsIEV2ZW50QnJva2VyXG5cbiAgIyBUaGlzIG1ldGhvZCBpcyB1c2VkIHRvIGdldCB0aGUgYXR0cmlidXRlcyBmb3IgdGhlIHZpZXcgdGVtcGxhdGVcbiAgIyBhbmQgbWlnaHQgYmUgb3ZlcndyaXR0ZW4gYnkgZGVjb3JhdG9ycyB3aGljaCBjYW5ub3QgY3JlYXRlIGFcbiAgIyBwcm9wZXIgYGF0dHJpYnV0ZXNgIGdldHRlciBkdWUgdG8gRUNNQVNjcmlwdCAzIGxpbWl0cy5cbiAgZ2V0QXR0cmlidXRlczogLT5cbiAgICBAYXR0cmlidXRlc1xuXG4gICMgUmV0dXJuIGFuIG9iamVjdCB3aGljaCBkZWxlZ2F0ZXMgdG8gdGhlIGF0dHJpYnV0ZXNcbiAgIyAoaS5lLiBhbiBvYmplY3Qgd2hpY2ggaGFzIHRoZSBhdHRyaWJ1dGVzIGFzIHByb3RvdHlwZSlcbiAgIyBzbyBwcmltaXRpdmUgdmFsdWVzIG1pZ2h0IGJlIGFkZGVkIGFuZCBhbHRlcmVkIHNhZmVseS5cbiAgIyBNYXAgbW9kZWxzIHRvIHRoZWlyIGF0dHJpYnV0ZXMsIHJlY3Vyc2l2ZWx5LlxuICBzZXJpYWxpemU6IC0+XG4gICAgc2VyaWFsaXplQXR0cmlidXRlcyB0aGlzLCBAZ2V0QXR0cmlidXRlcygpXG5cbiAgIyBEaXNwb3NhbFxuICAjIC0tLS0tLS0tXG5cbiAgZGlzcG9zZWQ6IGZhbHNlXG5cbiAgZGlzcG9zZTogLT5cbiAgICByZXR1cm4gaWYgQGRpc3Bvc2VkXG5cbiAgICAjIEZpcmUgYW4gZXZlbnQgdG8gbm90aWZ5IGFzc29jaWF0ZWQgY29sbGVjdGlvbnMgYW5kIHZpZXdzLlxuICAgIEB0cmlnZ2VyICdkaXNwb3NlJywgdGhpc1xuXG4gICAgQGNvbGxlY3Rpb24/LnJlbW92ZT8gdGhpcywgc2lsZW50OiB0cnVlXG5cbiAgICAjIFVuYmluZCBhbGwgZ2xvYmFsIGV2ZW50IGhhbmRsZXJzLlxuICAgIEB1bnN1YnNjcmliZUFsbEV2ZW50cygpXG5cbiAgICAjIFVuYmluZCBhbGwgcmVmZXJlbmNlZCBoYW5kbGVycy5cbiAgICBAc3RvcExpc3RlbmluZygpXG5cbiAgICAjIFJlbW92ZSBhbGwgZXZlbnQgaGFuZGxlcnMgb24gdGhpcyBtb2R1bGUuXG4gICAgQG9mZigpXG5cbiAgICAjIFJlbW92ZSB0aGUgY29sbGVjdGlvbiByZWZlcmVuY2UsIGludGVybmFsIGF0dHJpYnV0ZSBoYXNoZXNcbiAgICAjIGFuZCBldmVudCBoYW5kbGVycy5cbiAgICBkZWxldGUgdGhpc1twcm9wXSBmb3IgcHJvcCBpbiBbXG4gICAgICAnY29sbGVjdGlvbicsXG4gICAgICAnYXR0cmlidXRlcycsICdjaGFuZ2VkJywgJ2RlZmF1bHRzJyxcbiAgICAgICdfZXNjYXBlZEF0dHJpYnV0ZXMnLCAnX3ByZXZpb3VzQXR0cmlidXRlcycsXG4gICAgICAnX3NpbGVudCcsICdfcGVuZGluZycsXG4gICAgICAnX2NhbGxiYWNrcydcbiAgICBdXG5cbiAgICAjIEZpbmlzaGVkLlxuICAgIEBkaXNwb3NlZCA9IHRydWVcblxuICAgICMgWW914oCZcmUgZnJvemVuIHdoZW4geW91ciBoZWFydOKAmXMgbm90IG9wZW4uXG4gICAgT2JqZWN0LmZyZWV6ZSB0aGlzXG4iLCIndXNlIHN0cmljdCdcblxuQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZSdcblxuVmlldyA9IHJlcXVpcmUgJy4vdmlldydcbnV0aWxzID0gcmVxdWlyZSAnLi4vbGliL3V0aWxzJ1xuXG4jIFNob3J0Y3V0IHRvIGFjY2VzcyB0aGUgRE9NIG1hbmlwdWxhdGlvbiBsaWJyYXJ5LlxueyR9ID0gQmFja2JvbmVcblxuZmlsdGVyQ2hpbGRyZW4gPSAobm9kZUxpc3QsIHNlbGVjdG9yKSAtPlxuICByZXR1cm4gbm9kZUxpc3QgdW5sZXNzIHNlbGVjdG9yXG4gIGZvciBub2RlIGluIG5vZGVMaXN0IHdoZW4gdXRpbHMubWF0Y2hlc1NlbGVjdG9yIG5vZGUsIHNlbGVjdG9yXG4gICAgbm9kZVxuXG50b2dnbGVFbGVtZW50ID0gZG8gLT5cbiAgaWYgJFxuICAgIChlbGVtLCB2aXNpYmxlKSAtPiBlbGVtLnRvZ2dsZSB2aXNpYmxlXG4gIGVsc2VcbiAgICAoZWxlbSwgdmlzaWJsZSkgLT5cbiAgICAgIGVsZW0uc3R5bGUuZGlzcGxheSA9IChpZiB2aXNpYmxlIHRoZW4gJycgZWxzZSAnbm9uZScpXG5cbmFkZENsYXNzID0gZG8gLT5cbiAgaWYgJFxuICAgIChlbGVtLCBjbHMpIC0+IGVsZW0uYWRkQ2xhc3MgY2xzXG4gIGVsc2VcbiAgICAoZWxlbSwgY2xzKSAtPiBlbGVtLmNsYXNzTGlzdC5hZGQgY2xzXG5cbnN0YXJ0QW5pbWF0aW9uID0gZG8gLT5cbiAgaWYgJFxuICAgIChlbGVtLCB1c2VDc3NBbmltYXRpb24sIGNscykgLT5cbiAgICAgIGlmIHVzZUNzc0FuaW1hdGlvblxuICAgICAgICBhZGRDbGFzcyBlbGVtLCBjbHNcbiAgICAgIGVsc2VcbiAgICAgICAgZWxlbS5jc3MgJ29wYWNpdHknLCAwXG4gIGVsc2VcbiAgICAoZWxlbSwgdXNlQ3NzQW5pbWF0aW9uLCBjbHMpIC0+XG4gICAgICBpZiB1c2VDc3NBbmltYXRpb25cbiAgICAgICAgYWRkQ2xhc3MgZWxlbSwgY2xzXG4gICAgICBlbHNlXG4gICAgICAgIGVsZW0uc3R5bGUub3BhY2l0eSA9IDBcblxuZW5kQW5pbWF0aW9uID0gZG8gLT5cbiAgaWYgJFxuICAgIChlbGVtLCBkdXJhdGlvbikgLT4gZWxlbS5hbmltYXRlIHtvcGFjaXR5OiAxfSwgZHVyYXRpb25cbiAgZWxzZVxuICAgIChlbGVtLCBkdXJhdGlvbikgLT5cbiAgICAgIGVsZW0uc3R5bGUudHJhbnNpdGlvbiA9IFwib3BhY2l0eSAje2R1cmF0aW9ufW1zXCJcbiAgICAgIGVsZW0uc3R5bGUub3BhY2l0eSA9IDFcblxuaW5zZXJ0VmlldyA9IGRvIC0+XG4gIGlmICRcbiAgICAobGlzdCwgdmlld0VsLCBwb3NpdGlvbiwgbGVuZ3RoLCBpdGVtU2VsZWN0b3IpIC0+XG4gICAgICBpbnNlcnRJbk1pZGRsZSA9ICgwIDwgcG9zaXRpb24gPCBsZW5ndGgpXG4gICAgICBpc0VuZCA9IChsZW5ndGgpIC0+IGxlbmd0aCBpcyAwIG9yIHBvc2l0aW9uID49IGxlbmd0aFxuXG4gICAgICBpZiBpbnNlcnRJbk1pZGRsZSBvciBpdGVtU2VsZWN0b3JcbiAgICAgICAgIyBHZXQgdGhlIGNoaWxkcmVuIHdoaWNoIG9yaWdpbmF0ZSBmcm9tIGl0ZW0gdmlld3MuXG4gICAgICAgIGNoaWxkcmVuID0gbGlzdC5jaGlsZHJlbiBpdGVtU2VsZWN0b3JcbiAgICAgICAgY2hpbGRyZW5MZW5ndGggPSBjaGlsZHJlbi5sZW5ndGhcblxuICAgICAgICAjIENoZWNrIGlmIGl0IG5lZWRzIHRvIGJlIGluc2VydGVkLlxuICAgICAgICB1bmxlc3MgY2hpbGRyZW5bcG9zaXRpb25dIGlzIHZpZXdFbFxuICAgICAgICAgIGlmIGlzRW5kIGNoaWxkcmVuTGVuZ3RoXG4gICAgICAgICAgICAjIEluc2VydCBhdCB0aGUgZW5kLlxuICAgICAgICAgICAgbGlzdC5hcHBlbmQgdmlld0VsXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgIyBJbnNlcnQgYXQgdGhlIHJpZ2h0IHBvc2l0aW9uLlxuICAgICAgICAgICAgaWYgcG9zaXRpb24gaXMgMFxuICAgICAgICAgICAgICBjaGlsZHJlbi5lcShwb3NpdGlvbikuYmVmb3JlIHZpZXdFbFxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBjaGlsZHJlbi5lcShwb3NpdGlvbiAtIDEpLmFmdGVyIHZpZXdFbFxuICAgICAgZWxzZVxuICAgICAgICBtZXRob2QgPSBpZiBpc0VuZCBsZW5ndGggdGhlbiAnYXBwZW5kJyBlbHNlICdwcmVwZW5kJ1xuICAgICAgICBsaXN0W21ldGhvZF0gdmlld0VsXG4gIGVsc2VcbiAgICAobGlzdCwgdmlld0VsLCBwb3NpdGlvbiwgbGVuZ3RoLCBpdGVtU2VsZWN0b3IpIC0+XG4gICAgICBpbnNlcnRJbk1pZGRsZSA9ICgwIDwgcG9zaXRpb24gPCBsZW5ndGgpXG4gICAgICBpc0VuZCA9IChsZW5ndGgpIC0+IGxlbmd0aCBpcyAwIG9yIHBvc2l0aW9uIGlzIGxlbmd0aFxuXG4gICAgICBpZiBpbnNlcnRJbk1pZGRsZSBvciBpdGVtU2VsZWN0b3JcbiAgICAgICAgIyBHZXQgdGhlIGNoaWxkcmVuIHdoaWNoIG9yaWdpbmF0ZSBmcm9tIGl0ZW0gdmlld3MuXG4gICAgICAgIGNoaWxkcmVuID0gZmlsdGVyQ2hpbGRyZW4gbGlzdC5jaGlsZHJlbiwgaXRlbVNlbGVjdG9yXG4gICAgICAgIGNoaWxkcmVuTGVuZ3RoID0gY2hpbGRyZW4ubGVuZ3RoXG5cbiAgICAgICAgIyBDaGVjayBpZiBpdCBuZWVkcyB0byBiZSBpbnNlcnRlZC5cbiAgICAgICAgdW5sZXNzIGNoaWxkcmVuW3Bvc2l0aW9uXSBpcyB2aWV3RWxcbiAgICAgICAgICBpZiBpc0VuZCBjaGlsZHJlbkxlbmd0aFxuICAgICAgICAgICAgIyBJbnNlcnQgYXQgdGhlIGVuZC5cbiAgICAgICAgICAgIGxpc3QuYXBwZW5kQ2hpbGQgdmlld0VsXG4gICAgICAgICAgZWxzZSBpZiBwb3NpdGlvbiBpcyAwXG4gICAgICAgICAgICAjIEluc2VydCBhdCB0aGUgcmlnaHQgcG9zaXRpb24uXG4gICAgICAgICAgICBsaXN0Lmluc2VydEJlZm9yZSB2aWV3RWwsIGNoaWxkcmVuW3Bvc2l0aW9uXVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGxhc3QgPSBjaGlsZHJlbltwb3NpdGlvbiAtIDFdXG4gICAgICAgICAgICBpZiBsaXN0Lmxhc3RDaGlsZCBpcyBsYXN0XG4gICAgICAgICAgICAgIGxpc3QuYXBwZW5kQ2hpbGQgdmlld0VsXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIGxpc3QuaW5zZXJ0QmVmb3JlIHZpZXdFbCwgbGFzdC5uZXh0RWxlbWVudFNpYmxpbmdcbiAgICAgIGVsc2UgaWYgaXNFbmQgbGVuZ3RoXG4gICAgICAgIGxpc3QuYXBwZW5kQ2hpbGQgdmlld0VsXG4gICAgICBlbHNlXG4gICAgICAgIGxpc3QuaW5zZXJ0QmVmb3JlIHZpZXdFbCwgbGlzdC5maXJzdENoaWxkXG5cbiMgR2VuZXJhbCBjbGFzcyBmb3IgcmVuZGVyaW5nIENvbGxlY3Rpb25zLlxuIyBEZXJpdmUgdGhpcyBjbGFzcyBhbmQgZGVjbGFyZSBhdCBsZWFzdCBgaXRlbVZpZXdgIG9yIG92ZXJyaWRlXG4jIGBpbml0SXRlbVZpZXdgLiBgaW5pdEl0ZW1WaWV3YCBnZXRzIGFuIGl0ZW0gbW9kZWwgYW5kIHNob3VsZCBpbnN0YW50aWF0ZVxuIyBhbmQgcmV0dXJuIGEgY29ycmVzcG9uZGluZyBpdGVtIHZpZXcuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIENvbGxlY3Rpb25WaWV3IGV4dGVuZHMgVmlld1xuICAjIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAjID09PT09PT09PT09PT09PT09PT09PVxuXG4gICMgVGhlc2Ugb3B0aW9ucyBtYXkgYmUgb3ZlcndyaXR0ZW4gaW4gZGVyaXZlZCBjbGFzc2VzLlxuXG4gICMgQSBjbGFzcyBvZiBpdGVtIGluIGNvbGxlY3Rpb24uXG4gICMgVGhpcyBwcm9wZXJ0eSBoYXMgdG8gYmUgb3ZlcnJpZGRlbiBieSBhIGRlcml2ZWQgY2xhc3MuXG4gIGl0ZW1WaWV3OiBudWxsXG5cbiAgIyBBdXRvbWF0aWMgcmVuZGVyaW5nXG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICMgUGVyIGRlZmF1bHQsIHJlbmRlciB0aGUgdmlldyBpdHNlbGYgYW5kIGFsbCBpdGVtcyBvbiBjcmVhdGlvbi5cbiAgYXV0b1JlbmRlcjogdHJ1ZVxuICByZW5kZXJJdGVtczogdHJ1ZVxuXG4gICMgQW5pbWF0aW9uXG4gICMgLS0tLS0tLS0tXG5cbiAgIyBXaGVuIG5ldyBpdGVtcyBhcmUgYWRkZWQsIHRoZWlyIHZpZXdzIGFyZSBmYWRlZCBpbi5cbiAgIyBBbmltYXRpb24gZHVyYXRpb24gaW4gbWlsbGlzZWNvbmRzIChzZXQgdG8gMCB0byBkaXNhYmxlIGZhZGUgaW4pXG4gIGFuaW1hdGlvbkR1cmF0aW9uOiA1MDBcblxuICAjIEJ5IGRlZmF1bHQsIGZhZGluZyBpbiBpcyBkb25lIGJ5IGphdmFzY3JpcHQgZnVuY3Rpb24gd2hpY2ggY2FuIGJlXG4gICMgc2xvdyBvbiBtb2JpbGUgZGV2aWNlcy4gQ1NTIGFuaW1hdGlvbnMgYXJlIGZhc3RlcixcbiAgIyBidXQgcmVxdWlyZSB1c2Vy4oCZcyBtYW51YWwgZGVmaW5pdGlvbnMuXG4gIHVzZUNzc0FuaW1hdGlvbjogZmFsc2VcblxuICAjIENTUyBjbGFzc2VzIHRoYXQgd2lsbCBiZSB1c2VkIHdoZW4gaGlkaW5nIC8gc2hvd2luZyBjaGlsZCB2aWV3cy5cbiAgYW5pbWF0aW9uU3RhcnRDbGFzczogJ2FuaW1hdGVkLWl0ZW0tdmlldydcbiAgYW5pbWF0aW9uRW5kQ2xhc3M6ICdhbmltYXRlZC1pdGVtLXZpZXctZW5kJ1xuXG4gICMgU2VsZWN0b3JzIGFuZCBlbGVtZW50c1xuICAjIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAjIEEgY29sbGVjdGlvbiB2aWV3IG1heSBoYXZlIGEgdGVtcGxhdGUgYW5kIHVzZSBvbmUgb2YgaXRzIGNoaWxkIGVsZW1lbnRzXG4gICMgYXMgdGhlIGNvbnRhaW5lciBvZiB0aGUgaXRlbSB2aWV3cy4gSWYgeW91IHNwZWNpZnkgYGxpc3RTZWxlY3RvcmAsIHRoZVxuICAjIGl0ZW0gdmlld3Mgd2lsbCBiZSBhcHBlbmRlZCB0byB0aGlzIGVsZW1lbnQuIElmIGVtcHR5LCAkZWwgaXMgdXNlZC5cbiAgbGlzdFNlbGVjdG9yOiBudWxsXG5cbiAgIyBUaGUgYWN0dWFsIGVsZW1lbnQgd2hpY2ggaXMgZmV0Y2hlZCB1c2luZyBgbGlzdFNlbGVjdG9yYFxuICAkbGlzdDogbnVsbFxuXG4gICMgU2VsZWN0b3IgZm9yIGEgZmFsbGJhY2sgZWxlbWVudCB3aGljaCBpcyBzaG93biBpZiB0aGUgY29sbGVjdGlvbiBpcyBlbXB0eS5cbiAgZmFsbGJhY2tTZWxlY3RvcjogbnVsbFxuXG4gICMgVGhlIGFjdHVhbCBlbGVtZW50IHdoaWNoIGlzIGZldGNoZWQgdXNpbmcgYGZhbGxiYWNrU2VsZWN0b3JgXG4gICRmYWxsYmFjazogbnVsbFxuXG4gICMgU2VsZWN0b3IgZm9yIGEgbG9hZGluZyBpbmRpY2F0b3IgZWxlbWVudCB3aGljaCBpcyBzaG93blxuICAjIHdoaWxlIHRoZSBjb2xsZWN0aW9uIGlzIHN5bmNpbmcuXG4gIGxvYWRpbmdTZWxlY3RvcjogbnVsbFxuXG4gICMgVGhlIGFjdHVhbCBlbGVtZW50IHdoaWNoIGlzIGZldGNoZWQgdXNpbmcgYGxvYWRpbmdTZWxlY3RvcmBcbiAgJGxvYWRpbmc6IG51bGxcblxuICAjIFNlbGVjdG9yIHdoaWNoIGlkZW50aWZpZXMgY2hpbGQgZWxlbWVudHMgYmVsb25naW5nIHRvIGNvbGxlY3Rpb25cbiAgIyBJZiBlbXB0eSwgYWxsIGNoaWxkcmVuIG9mICRsaXN0IGFyZSBjb25zaWRlcmVkLlxuICBpdGVtU2VsZWN0b3I6IG51bGxcblxuICAjIEZpbHRlcmluZ1xuICAjIC0tLS0tLS0tLVxuXG4gICMgVGhlIGZpbHRlciBmdW5jdGlvbiwgaWYgYW55LlxuICBmaWx0ZXJlcjogbnVsbFxuXG4gICMgQSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgYWZ0ZXIgZWFjaCBmaWx0ZXIuXG4gICMgSGlkZXMgZXhjbHVkZWQgaXRlbXMgYnkgZGVmYXVsdC5cbiAgZmlsdGVyQ2FsbGJhY2s6ICh2aWV3LCBpbmNsdWRlZCkgLT5cbiAgICB2aWV3LiRlbC5zdG9wIHRydWUsIHRydWUgaWYgJFxuICAgIHRvZ2dsZUVsZW1lbnQgKGlmICQgdGhlbiB2aWV3LiRlbCBlbHNlIHZpZXcuZWwpLCBpbmNsdWRlZFxuXG4gICMgVmlldyBsaXN0c1xuICAjIC0tLS0tLS0tLS1cblxuICAjIFRyYWNrIGEgbGlzdCBvZiB0aGUgdmlzaWJsZSB2aWV3cy5cbiAgdmlzaWJsZUl0ZW1zOiBudWxsXG5cbiAgIyBDb25zdHJ1Y3RvclxuICAjIC0tLS0tLS0tLS0tXG5cbiAgb3B0aW9uTmFtZXM6IFZpZXc6Om9wdGlvbk5hbWVzLmNvbmNhdCBbJ3JlbmRlckl0ZW1zJywgJ2l0ZW1WaWV3J11cblxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XG4gICAgIyBJbml0aWFsaXplIGxpc3QgZm9yIHZpc2libGUgaXRlbXMuXG4gICAgQHZpc2libGVJdGVtcyA9IFtdXG5cbiAgICBzdXBlclxuXG4gICMgSW5pdGlhbGl6YXRpb25cbiAgIyAtLS0tLS0tLS0tLS0tLVxuXG4gIGluaXRpYWxpemU6IChvcHRpb25zID0ge30pIC0+XG4gICAgIyBEb24ndCBjYWxsIHN1cGVyOyB0aGUgYmFzZSB2aWV3J3MgaW5pdGlhbGl6ZSBpcyBhIG5vLW9wLlxuXG4gICAgIyBTdGFydCBvYnNlcnZpbmcgdGhlIGNvbGxlY3Rpb24uXG4gICAgQGFkZENvbGxlY3Rpb25MaXN0ZW5lcnMoKVxuXG4gICAgIyBBcHBseSBhIGZpbHRlciBpZiBvbmUgcHJvdmlkZWQuXG4gICAgQGZpbHRlciBvcHRpb25zLmZpbHRlcmVyIGlmIG9wdGlvbnMuZmlsdGVyZXI/XG5cbiAgIyBCaW5kaW5nIG9mIGNvbGxlY3Rpb24gbGlzdGVuZXJzLlxuICBhZGRDb2xsZWN0aW9uTGlzdGVuZXJzOiAtPlxuICAgIEBsaXN0ZW5UbyBAY29sbGVjdGlvbiwgJ2FkZCcsIEBpdGVtQWRkZWRcbiAgICBAbGlzdGVuVG8gQGNvbGxlY3Rpb24sICdyZW1vdmUnLCBAaXRlbVJlbW92ZWRcbiAgICBAbGlzdGVuVG8gQGNvbGxlY3Rpb24sICdyZXNldCBzb3J0JywgQGl0ZW1zUmVzZXRcblxuICAjIFJlbmRlcmluZ1xuICAjIC0tLS0tLS0tLVxuXG4gICMgT3ZlcnJpZGUgVmlldyNnZXRUZW1wbGF0ZURhdGEsIGRvbuKAmXQgc2VyaWFsaXplIGNvbGxlY3Rpb24gaXRlbXMgaGVyZS5cbiAgZ2V0VGVtcGxhdGVEYXRhOiAtPlxuICAgIHRlbXBsYXRlRGF0YSA9IHtsZW5ndGg6IEBjb2xsZWN0aW9uLmxlbmd0aH1cblxuICAgICMgSWYgdGhlIGNvbGxlY3Rpb24gaXMgYSBTeW5jTWFjaGluZSwgYWRkIGEgYHN5bmNlZGAgZmxhZy5cbiAgICBpZiB0eXBlb2YgQGNvbGxlY3Rpb24uaXNTeW5jZWQgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgdGVtcGxhdGVEYXRhLnN5bmNlZCA9IEBjb2xsZWN0aW9uLmlzU3luY2VkKClcblxuICAgIHRlbXBsYXRlRGF0YVxuXG4gICMgSW4gY29udHJhc3QgdG8gbm9ybWFsIHZpZXdzLCBhIHRlbXBsYXRlIGlzIG5vdCBtYW5kYXRvcnlcbiAgIyBmb3IgQ29sbGVjdGlvblZpZXdzLiBQcm92aWRlIGFuIGVtcHR5IGBnZXRUZW1wbGF0ZUZ1bmN0aW9uYC5cbiAgZ2V0VGVtcGxhdGVGdW5jdGlvbjogLT5cblxuICAjIE1haW4gcmVuZGVyIG1ldGhvZCAoc2hvdWxkIGJlIGNhbGxlZCBvbmx5IG9uY2UpXG4gIHJlbmRlcjogLT5cbiAgICBzdXBlclxuXG4gICAgIyBTZXQgdGhlICRsaXN0IHByb3BlcnR5IHdpdGggdGhlIGFjdHVhbCBsaXN0IGNvbnRhaW5lci5cbiAgICBsaXN0U2VsZWN0b3IgPSBpZiB0eXBlb2YgQGxpc3RTZWxlY3RvciBpcyAnZnVuY3Rpb24nXG4gICAgICBAbGlzdFNlbGVjdG9yKClcbiAgICBlbHNlXG4gICAgICBAbGlzdFNlbGVjdG9yXG5cbiAgICBpZiAkXG4gICAgICBAJGxpc3QgPSBpZiBsaXN0U2VsZWN0b3IgdGhlbiBAZmluZCBsaXN0U2VsZWN0b3IgZWxzZSBAJGVsXG4gICAgZWxzZVxuICAgICAgQGxpc3QgPSBpZiBsaXN0U2VsZWN0b3IgdGhlbiBAZmluZCBAbGlzdFNlbGVjdG9yIGVsc2UgQGVsXG5cbiAgICBAaW5pdEZhbGxiYWNrKClcbiAgICBAaW5pdExvYWRpbmdJbmRpY2F0b3IoKVxuXG4gICAgIyBSZW5kZXIgYWxsIGl0ZW1zLlxuICAgIEByZW5kZXJBbGxJdGVtcygpIGlmIEByZW5kZXJJdGVtc1xuXG4gICMgQWRkaW5nIC8gUmVtb3ZpbmdcbiAgIyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gICMgV2hlbiBhbiBpdGVtIGlzIGFkZGVkLCBjcmVhdGUgYSBuZXcgdmlldyBhbmQgaW5zZXJ0IGl0LlxuICBpdGVtQWRkZWQ6IChpdGVtLCBjb2xsZWN0aW9uLCBvcHRpb25zKSA9PlxuICAgIEBpbnNlcnRWaWV3IGl0ZW0sIEByZW5kZXJJdGVtKGl0ZW0pLCBvcHRpb25zLmF0XG5cbiAgIyBXaGVuIGFuIGl0ZW0gaXMgcmVtb3ZlZCwgcmVtb3ZlIHRoZSBjb3JyZXNwb25kaW5nIHZpZXcgZnJvbSBET00gYW5kIGNhY2hlcy5cbiAgaXRlbVJlbW92ZWQ6IChpdGVtKSA9PlxuICAgIEByZW1vdmVWaWV3Rm9ySXRlbSBpdGVtXG5cbiAgIyBXaGVuIGFsbCBpdGVtcyBhcmUgcmVzZXR0ZWQsIHJlbmRlciBhbGwgYW5ldy5cbiAgaXRlbXNSZXNldDogPT5cbiAgICBAcmVuZGVyQWxsSXRlbXMoKVxuXG4gICMgRmFsbGJhY2sgbWVzc2FnZSB3aGVuIHRoZSBjb2xsZWN0aW9uIGlzIGVtcHR5XG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgaW5pdEZhbGxiYWNrOiAtPlxuICAgIHJldHVybiB1bmxlc3MgQGZhbGxiYWNrU2VsZWN0b3JcblxuICAgICMgU2V0IHRoZSAkZmFsbGJhY2sgcHJvcGVydHkuXG4gICAgaWYgJFxuICAgICAgQCRmYWxsYmFjayA9IEBmaW5kIEBmYWxsYmFja1NlbGVjdG9yXG4gICAgZWxzZVxuICAgICAgQGZhbGxiYWNrID0gQGZpbmQgQGZhbGxiYWNrU2VsZWN0b3JcblxuICAgICMgTGlzdGVuIGZvciB2aXNpYmxlIGl0ZW1zIGNoYW5nZXMuXG4gICAgQG9uICd2aXNpYmlsaXR5Q2hhbmdlJywgQHRvZ2dsZUZhbGxiYWNrXG5cbiAgICAjIExpc3RlbiBmb3Igc3luYyBldmVudHMgb24gdGhlIGNvbGxlY3Rpb24uXG4gICAgQGxpc3RlblRvIEBjb2xsZWN0aW9uLCAnc3luY1N0YXRlQ2hhbmdlJywgQHRvZ2dsZUZhbGxiYWNrXG5cbiAgICAjIFNldCB2aXNpYmlsaXR5IGluaXRpYWxseS5cbiAgICBAdG9nZ2xlRmFsbGJhY2soKVxuXG4gICMgU2hvdyBmYWxsYmFjayBpZiBubyBpdGVtIGlzIHZpc2libGUgYW5kIHRoZSBjb2xsZWN0aW9uIGlzIHN5bmNlZC5cbiAgdG9nZ2xlRmFsbGJhY2s6ID0+XG4gICAgdmlzaWJsZSA9IEB2aXNpYmxlSXRlbXMubGVuZ3RoIGlzIDAgYW5kIChcbiAgICAgIGlmIHR5cGVvZiBAY29sbGVjdGlvbi5pc1N5bmNlZCBpcyAnZnVuY3Rpb24nXG4gICAgICAgICMgQ29sbGVjdGlvbiBpcyBhIFN5bmNNYWNoaW5lLlxuICAgICAgICBAY29sbGVjdGlvbi5pc1N5bmNlZCgpXG4gICAgICBlbHNlXG4gICAgICAgICMgQXNzdW1lIGl0IGlzIHN5bmNlZC5cbiAgICAgICAgdHJ1ZVxuICAgIClcbiAgICB0b2dnbGVFbGVtZW50IChpZiAkIHRoZW4gQCRmYWxsYmFjayBlbHNlIEBmYWxsYmFjayksIHZpc2libGVcblxuICAjIExvYWRpbmcgaW5kaWNhdG9yXG4gICMgLS0tLS0tLS0tLS0tLS0tLS1cblxuICBpbml0TG9hZGluZ0luZGljYXRvcjogLT5cbiAgICAjIFRoZSBsb2FkaW5nIGluZGljYXRvciBvbmx5IHdvcmtzIGZvciBDb2xsZWN0aW9uc1xuICAgICMgd2hpY2ggYXJlIFN5bmNNYWNoaW5lcy5cbiAgICByZXR1cm4gdW5sZXNzIEBsb2FkaW5nU2VsZWN0b3IgYW5kXG4gICAgICB0eXBlb2YgQGNvbGxlY3Rpb24uaXNTeW5jaW5nIGlzICdmdW5jdGlvbidcblxuICAgICMgU2V0IHRoZSAkbG9hZGluZyBwcm9wZXJ0eS5cbiAgICBpZiAkXG4gICAgICBAJGxvYWRpbmcgPSBAZmluZCBAbG9hZGluZ1NlbGVjdG9yXG4gICAgZWxzZVxuICAgICAgQGxvYWRpbmcgPSBAZmluZCBAbG9hZGluZ1NlbGVjdG9yXG5cbiAgICAjIExpc3RlbiBmb3Igc3luYyBldmVudHMgb24gdGhlIGNvbGxlY3Rpb24uXG4gICAgQGxpc3RlblRvIEBjb2xsZWN0aW9uLCAnc3luY1N0YXRlQ2hhbmdlJywgQHRvZ2dsZUxvYWRpbmdJbmRpY2F0b3JcblxuICAgICMgU2V0IHZpc2liaWxpdHkgaW5pdGlhbGx5LlxuICAgIEB0b2dnbGVMb2FkaW5nSW5kaWNhdG9yKClcblxuICB0b2dnbGVMb2FkaW5nSW5kaWNhdG9yOiAtPlxuICAgICMgT25seSBzaG93IHRoZSBsb2FkaW5nIGluZGljYXRvciBpZiB0aGUgY29sbGVjdGlvbiBpcyBlbXB0eS5cbiAgICAjIE90aGVyd2lzZSBsb2FkaW5nIG1vcmUgaXRlbXMgaW4gb3JkZXIgdG8gYXBwZW5kIHRoZW0gd291bGRcbiAgICAjIHNob3cgdGhlIGxvYWRpbmcgaW5kaWNhdG9yLiBJZiB5b3Ugd2FudCB0aGUgaW5kaWNhdG9yIHRvXG4gICAgIyBzaG93IHVwIGluIHRoaXMgY2FzZSwgeW91IG5lZWQgdG8gb3ZlcndyaXRlIHRoaXMgbWV0aG9kIHRvXG4gICAgIyBkaXNhYmxlIHRoZSBjaGVjay5cbiAgICB2aXNpYmxlID0gQGNvbGxlY3Rpb24ubGVuZ3RoIGlzIDAgYW5kIEBjb2xsZWN0aW9uLmlzU3luY2luZygpXG4gICAgdG9nZ2xlRWxlbWVudCAoaWYgJCB0aGVuIEAkbG9hZGluZyBlbHNlIEBsb2FkaW5nKSwgdmlzaWJsZVxuXG4gICMgRmlsdGVyaW5nXG4gICMgLS0tLS0tLS0tXG5cbiAgIyBGaWx0ZXJzIG9ubHkgY2hpbGQgaXRlbSB2aWV3cyBmcm9tIGFsbCBjdXJyZW50IHN1YnZpZXdzLlxuICBnZXRJdGVtVmlld3M6IC0+XG4gICAgaXRlbVZpZXdzID0ge31cbiAgICBmb3Iga2V5IGluIE9iamVjdC5rZXlzIEBzdWJ2aWV3c0J5TmFtZVxuICAgICAgdW5sZXNzIGtleS5pbmRleE9mICdpdGVtVmlldzonXG4gICAgICAgIGl0ZW1WaWV3c1trZXkuc2xpY2UgOV0gPSBAc3Vidmlld3NCeU5hbWVba2V5XVxuICAgIGl0ZW1WaWV3c1xuXG4gICMgQXBwbGllcyBhIGZpbHRlciB0byB0aGUgY29sbGVjdGlvbiB2aWV3LlxuICAjIEV4cGVjdHMgYW4gaXRlcmF0b3IgZnVuY3Rpb24gYXMgZmlyc3QgcGFyYW1ldGVyXG4gICMgd2hpY2ggbmVlZCB0byByZXR1cm4gdHJ1ZSBvciBmYWxzZS5cbiAgIyBPcHRpb25hbCBmaWx0ZXIgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHRvXG4gICMgc2hvdy9oaWRlIHRoZSB2aWV3IG9yIG1hcmsgaXQgb3RoZXJ3aXNlIGFzIGZpbHRlcmVkLlxuICBmaWx0ZXI6IChmaWx0ZXJlciwgZmlsdGVyQ2FsbGJhY2spIC0+XG4gICAgIyBTYXZlIHRoZSBmaWx0ZXJlciBhbmQgZmlsdGVyQ2FsbGJhY2sgZnVuY3Rpb25zLlxuICAgIGlmIHR5cGVvZiBmaWx0ZXJlciBpcyAnZnVuY3Rpb24nIG9yIGZpbHRlcmVyIGlzIG51bGxcbiAgICAgIEBmaWx0ZXJlciA9IGZpbHRlcmVyXG4gICAgaWYgdHlwZW9mIGZpbHRlckNhbGxiYWNrIGlzICdmdW5jdGlvbicgb3IgZmlsdGVyQ2FsbGJhY2sgaXMgbnVsbFxuICAgICAgQGZpbHRlckNhbGxiYWNrID0gZmlsdGVyQ2FsbGJhY2tcblxuICAgIGhhc0l0ZW1WaWV3cyA9IE9iamVjdFxuICAgICAgLmtleXMgQHN1YnZpZXdzQnlOYW1lXG4gICAgICAuc29tZSAoa2V5KSAtPiAwIGlzIGtleS5pbmRleE9mICdpdGVtVmlldzonXG5cbiAgICAjIFNob3cvaGlkZSBleGlzdGluZyB2aWV3cy5cbiAgICBpZiBoYXNJdGVtVmlld3NcbiAgICAgIGZvciBpdGVtLCBpbmRleCBpbiBAY29sbGVjdGlvbi5tb2RlbHNcblxuICAgICAgICAjIEFwcGx5IGZpbHRlciB0byB0aGUgaXRlbS5cbiAgICAgICAgaW5jbHVkZWQgPSBpZiB0eXBlb2YgQGZpbHRlcmVyIGlzICdmdW5jdGlvbidcbiAgICAgICAgICBAZmlsdGVyZXIgaXRlbSwgaW5kZXhcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRydWVcblxuICAgICAgICAjIFNob3cvaGlkZSB0aGUgdmlldyBhY2NvcmRpbmdseS5cbiAgICAgICAgdmlldyA9IEBzdWJ2aWV3IFwiaXRlbVZpZXc6I3tpdGVtLmNpZH1cIlxuICAgICAgICAjIEEgdmlldyBoYXMgbm90IGJlZW4gY3JlYXRlZCBmb3IgdGhpcyBpdGVtIHlldC5cbiAgICAgICAgdW5sZXNzIHZpZXdcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgJ0NvbGxlY3Rpb25WaWV3I2ZpbHRlcjogJyArXG4gICAgICAgICAgICBcIm5vIHZpZXcgZm91bmQgZm9yICN7aXRlbS5jaWR9XCJcblxuICAgICAgICAjIFNob3cvaGlkZSBvciBtYXJrIHRoZSB2aWV3IGFjY29yZGluZ2x5LlxuICAgICAgICBAZmlsdGVyQ2FsbGJhY2sgdmlldywgaW5jbHVkZWRcblxuICAgICAgICAjIFVwZGF0ZSB2aXNpYmxlSXRlbXMgbGlzdCwgYnV0IGRvIG5vdCB0cmlnZ2VyIGFuIGV2ZW50IGltbWVkaWF0ZWx5LlxuICAgICAgICBAdXBkYXRlVmlzaWJsZUl0ZW1zIHZpZXcubW9kZWwsIGluY2x1ZGVkLCBmYWxzZVxuXG4gICAgIyBUcmlnZ2VyIGEgY29tYmluZWQgYHZpc2liaWxpdHlDaGFuZ2VgIGV2ZW50LlxuICAgIEB0cmlnZ2VyICd2aXNpYmlsaXR5Q2hhbmdlJywgQHZpc2libGVJdGVtc1xuXG4gICMgSXRlbSB2aWV3IHJlbmRlcmluZ1xuICAjIC0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAjIFJlbmRlciBhbmQgaW5zZXJ0IGFsbCBpdGVtcy5cbiAgcmVuZGVyQWxsSXRlbXM6ID0+XG4gICAgaXRlbXMgPSBAY29sbGVjdGlvbi5tb2RlbHNcblxuICAgICMgUmVzZXQgdmlzaWJsZSBpdGVtcy5cbiAgICBAdmlzaWJsZUl0ZW1zLmxlbmd0aCA9IDBcblxuICAgICMgQ29sbGVjdCByZW1haW5pbmcgdmlld3MuXG4gICAgcmVtYWluaW5nVmlld3NCeUNpZCA9IHt9XG4gICAgZm9yIGl0ZW0gaW4gaXRlbXNcbiAgICAgIHZpZXcgPSBAc3VidmlldyBcIml0ZW1WaWV3OiN7aXRlbS5jaWR9XCJcbiAgICAgIGlmIHZpZXdcbiAgICAgICAgIyBWaWV3IHJlbWFpbnMuXG4gICAgICAgIHJlbWFpbmluZ1ZpZXdzQnlDaWRbaXRlbS5jaWRdID0gdmlld1xuXG4gICAgIyBSZW1vdmUgb2xkIHZpZXdzIG9mIGl0ZW1zIG5vdCBsb25nZXIgaW4gdGhlIGxpc3QuXG4gICAgZm9yIGNpZCBpbiBPYmplY3Qua2V5cyBAZ2V0SXRlbVZpZXdzKClcbiAgICAgIHVubGVzcyBjaWQgb2YgcmVtYWluaW5nVmlld3NCeUNpZFxuICAgICAgICAjIFJlbW92ZSB0aGUgdmlldy5cbiAgICAgICAgQHJlbW92ZVN1YnZpZXcgXCJpdGVtVmlldzoje2NpZH1cIlxuXG4gICAgIyBSZS1pbnNlcnQgcmVtYWluaW5nIGl0ZW1zOyByZW5kZXIgYW5kIGluc2VydCBuZXcgaXRlbXMuXG4gICAgZm9yIGl0ZW0sIGluZGV4IGluIGl0ZW1zXG4gICAgICAjIENoZWNrIGlmIHZpZXcgd2FzIGFscmVhZHkgY3JlYXRlZC5cbiAgICAgIHZpZXcgPSBAc3VidmlldyBcIml0ZW1WaWV3OiN7aXRlbS5jaWR9XCJcbiAgICAgIGlmIHZpZXdcbiAgICAgICAgIyBSZS1pbnNlcnQgdGhlIHZpZXcuXG4gICAgICAgIEBpbnNlcnRWaWV3IGl0ZW0sIHZpZXcsIGluZGV4LCBmYWxzZVxuICAgICAgZWxzZVxuICAgICAgICAjIENyZWF0ZSBhIG5ldyB2aWV3LCByZW5kZXIgYW5kIGluc2VydCBpdC5cbiAgICAgICAgQGluc2VydFZpZXcgaXRlbSwgQHJlbmRlckl0ZW0oaXRlbSksIGluZGV4XG5cbiAgICAjIElmIG5vIHZpZXcgd2FzIGNyZWF0ZWQsIHRyaWdnZXIgYHZpc2liaWxpdHlDaGFuZ2VgIGV2ZW50IG1hbnVhbGx5LlxuICAgIEB0cmlnZ2VyICd2aXNpYmlsaXR5Q2hhbmdlJywgQHZpc2libGVJdGVtcyBpZiBpdGVtcy5sZW5ndGggaXMgMFxuXG4gICMgSW5zdGFudGlhdGUgYW5kIHJlbmRlciBhbiBpdGVtIHVzaW5nIHRoZSBgdmlld3NCeUNpZGAgaGFzaCBhcyBhIGNhY2hlLlxuICByZW5kZXJJdGVtOiAoaXRlbSkgLT5cbiAgICAjIEdldCB0aGUgZXhpc3Rpbmcgdmlldy5cbiAgICB2aWV3ID0gQHN1YnZpZXcgXCJpdGVtVmlldzoje2l0ZW0uY2lkfVwiXG5cbiAgICAjIEluc3RhbnRpYXRlIGEgbmV3IHZpZXcgaWYgbmVjZXNzYXJ5LlxuICAgIHVubGVzcyB2aWV3XG4gICAgICB2aWV3ID0gQGluaXRJdGVtVmlldyBpdGVtXG4gICAgICAjIFNhdmUgdGhlIHZpZXcgaW4gdGhlIHN1YnZpZXdzLlxuICAgICAgQHN1YnZpZXcgXCJpdGVtVmlldzoje2l0ZW0uY2lkfVwiLCB2aWV3XG5cbiAgICAjIFJlbmRlciBpbiBhbnkgY2FzZS5cbiAgICB2aWV3LnJlbmRlcigpXG5cbiAgICB2aWV3XG5cbiAgIyBSZXR1cm5zIGFuIGluc3RhbmNlIG9mIHRoZSB2aWV3IGNsYXNzLiBPdmVycmlkZSB0aGlzXG4gICMgbWV0aG9kIHRvIHVzZSBzZXZlcmFsIGl0ZW0gdmlldyBjb25zdHJ1Y3RvcnMgZGVwZW5kaW5nXG4gICMgb24gdGhlIG1vZGVsIHR5cGUgb3IgZGF0YS5cbiAgaW5pdEl0ZW1WaWV3OiAobW9kZWwpIC0+XG4gICAgaWYgQGl0ZW1WaWV3XG4gICAgICBuZXcgQGl0ZW1WaWV3IHthdXRvUmVuZGVyOiBmYWxzZSwgbW9kZWx9XG4gICAgZWxzZVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdUaGUgQ29sbGVjdGlvblZpZXcjaXRlbVZpZXcgcHJvcGVydHkgJyArXG4gICAgICAgICdtdXN0IGJlIGRlZmluZWQgb3IgdGhlIGluaXRJdGVtVmlldygpIG11c3QgYmUgb3ZlcnJpZGRlbi4nXG5cbiAgIyBJbnNlcnRzIGEgdmlldyBpbnRvIHRoZSBsaXN0IGF0IHRoZSBwcm9wZXIgcG9zaXRpb24uXG4gIGluc2VydFZpZXc6IChpdGVtLCB2aWV3LCBwb3NpdGlvbiwgZW5hYmxlQW5pbWF0aW9uID0gdHJ1ZSkgLT5cbiAgICBlbmFibGVBbmltYXRpb24gPSBmYWxzZSBpZiBAYW5pbWF0aW9uRHVyYXRpb24gaXMgMFxuXG4gICAgIyBHZXQgdGhlIGluc2VydGlvbiBvZmZzZXQgaWYgbm90IGdpdmVuLlxuICAgIHVubGVzcyB0eXBlb2YgcG9zaXRpb24gaXMgJ251bWJlcidcbiAgICAgIHBvc2l0aW9uID0gQGNvbGxlY3Rpb24uaW5kZXhPZiBpdGVtXG5cbiAgICAjIElzIHRoZSBpdGVtIGluY2x1ZGVkIGluIHRoZSBmaWx0ZXI/XG4gICAgaW5jbHVkZWQgPSBpZiB0eXBlb2YgQGZpbHRlcmVyIGlzICdmdW5jdGlvbidcbiAgICAgIEBmaWx0ZXJlciBpdGVtLCBwb3NpdGlvblxuICAgIGVsc2VcbiAgICAgIHRydWVcblxuICAgICMgR2V0IHRoZSB2aWV34oCZcyB0b3AgZWxlbWVudC5cbiAgICBlbGVtID0gaWYgJCB0aGVuIHZpZXcuJGVsIGVsc2Ugdmlldy5lbFxuXG4gICAgIyBTdGFydCBhbmltYXRpb24uXG4gICAgaWYgaW5jbHVkZWQgYW5kIGVuYWJsZUFuaW1hdGlvblxuICAgICAgc3RhcnRBbmltYXRpb24gZWxlbSwgQHVzZUNzc0FuaW1hdGlvbiwgQGFuaW1hdGlvblN0YXJ0Q2xhc3NcblxuICAgICMgSGlkZSBvciBtYXJrIHRoZSB2aWV3IGlmIGl04oCZcyBmaWx0ZXJlZC5cbiAgICBAZmlsdGVyQ2FsbGJhY2sgdmlldywgaW5jbHVkZWQgaWYgQGZpbHRlcmVyXG5cbiAgICBsZW5ndGggPSBAY29sbGVjdGlvbi5sZW5ndGhcblxuICAgICMgSW5zZXJ0IHRoZSB2aWV3IGludG8gdGhlIGxpc3QuXG4gICAgbGlzdCA9IGlmICQgdGhlbiBAJGxpc3QgZWxzZSBAbGlzdFxuXG4gICAgaWYgaW5jbHVkZWRcbiAgICAgIGluc2VydFZpZXcgbGlzdCwgZWxlbSwgcG9zaXRpb24sIGxlbmd0aCwgQGl0ZW1TZWxlY3RvclxuXG4gICAgICAjIFRlbGwgdGhlIHZpZXcgdGhhdCBpdCB3YXMgYWRkZWQgdG8gaXRzIHBhcmVudC5cbiAgICAgIHZpZXcudHJpZ2dlciAnYWRkZWRUb1BhcmVudCdcblxuICAgICMgVXBkYXRlIHRoZSBsaXN0IG9mIHZpc2libGUgaXRlbXMsIHRyaWdnZXIgYSBgdmlzaWJpbGl0eUNoYW5nZWAgZXZlbnQuXG4gICAgQHVwZGF0ZVZpc2libGVJdGVtcyBpdGVtLCBpbmNsdWRlZFxuXG4gICAgIyBFbmQgYW5pbWF0aW9uLlxuICAgIGlmIGluY2x1ZGVkIGFuZCBlbmFibGVBbmltYXRpb25cbiAgICAgIGlmIEB1c2VDc3NBbmltYXRpb25cbiAgICAgICAgIyBXYWl0IGZvciBET00gc3RhdGUgY2hhbmdlLlxuICAgICAgICBzZXRUaW1lb3V0ID0+IGFkZENsYXNzIGVsZW0sIEBhbmltYXRpb25FbmRDbGFzc1xuICAgICAgZWxzZVxuICAgICAgICAjIEZhZGUgdGhlIHZpZXcgaW4gaWYgaXQgd2FzIG1hZGUgdHJhbnNwYXJlbnQgYmVmb3JlLlxuICAgICAgICBlbmRBbmltYXRpb24gZWxlbSwgQGFuaW1hdGlvbkR1cmF0aW9uXG5cbiAgICB2aWV3XG5cbiAgIyBSZW1vdmUgdGhlIHZpZXcgZm9yIGFuIGl0ZW0uXG4gIHJlbW92ZVZpZXdGb3JJdGVtOiAoaXRlbSkgLT5cbiAgICAjIFJlbW92ZSBpdGVtIGZyb20gdmlzaWJsZUl0ZW1zIGxpc3QsIHRyaWdnZXIgYSBgdmlzaWJpbGl0eUNoYW5nZWAgZXZlbnQuXG4gICAgQHVwZGF0ZVZpc2libGVJdGVtcyBpdGVtLCBmYWxzZVxuICAgIEByZW1vdmVTdWJ2aWV3IFwiaXRlbVZpZXc6I3tpdGVtLmNpZH1cIlxuXG4gICMgTGlzdCBvZiB2aXNpYmxlIGl0ZW1zXG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgIyBVcGRhdGUgdmlzaWJsZUl0ZW1zIGxpc3QgYW5kIHRyaWdnZXIgYSBgdmlzaWJpbGl0eUNoYW5nZWRgIGV2ZW50XG4gICMgaWYgYW4gaXRlbSBjaGFuZ2VkIGl0cyB2aXNpYmlsaXR5LlxuICB1cGRhdGVWaXNpYmxlSXRlbXM6IChpdGVtLCBpbmNsdWRlZEluRmlsdGVyLCB0cmlnZ2VyRXZlbnQgPSB0cnVlKSAtPlxuICAgIHZpc2liaWxpdHlDaGFuZ2VkID0gZmFsc2VcblxuICAgIHZpc2libGVJdGVtc0luZGV4ID0gQHZpc2libGVJdGVtcy5pbmRleE9mIGl0ZW1cbiAgICBpbmNsdWRlZEluVmlzaWJsZUl0ZW1zID0gdmlzaWJsZUl0ZW1zSW5kZXggaXNudCAtMVxuXG4gICAgaWYgaW5jbHVkZWRJbkZpbHRlciBhbmQgbm90IGluY2x1ZGVkSW5WaXNpYmxlSXRlbXNcbiAgICAgICMgQWRkIGl0ZW0gdG8gdGhlIHZpc2libGUgaXRlbXMgbGlzdC5cbiAgICAgIEB2aXNpYmxlSXRlbXMucHVzaCBpdGVtXG4gICAgICB2aXNpYmlsaXR5Q2hhbmdlZCA9IHRydWVcbiAgICBlbHNlIGlmIG5vdCBpbmNsdWRlZEluRmlsdGVyIGFuZCBpbmNsdWRlZEluVmlzaWJsZUl0ZW1zXG4gICAgICAjIFJlbW92ZSBpdGVtIGZyb20gdGhlIHZpc2libGUgaXRlbXMgbGlzdC5cbiAgICAgIEB2aXNpYmxlSXRlbXMuc3BsaWNlIHZpc2libGVJdGVtc0luZGV4LCAxXG4gICAgICB2aXNpYmlsaXR5Q2hhbmdlZCA9IHRydWVcblxuICAgICMgVHJpZ2dlciBhIGB2aXNpYmlsaXR5Q2hhbmdlYCBldmVudCBpZiB0aGUgdmlzaWJsZSBpdGVtcyBjaGFuZ2VkLlxuICAgIGlmIHZpc2liaWxpdHlDaGFuZ2VkIGFuZCB0cmlnZ2VyRXZlbnRcbiAgICAgIEB0cmlnZ2VyICd2aXNpYmlsaXR5Q2hhbmdlJywgQHZpc2libGVJdGVtc1xuXG4gICAgdmlzaWJpbGl0eUNoYW5nZWRcblxuICAjIERpc3Bvc2FsXG4gICMgLS0tLS0tLS1cblxuICBkaXNwb3NlOiAtPlxuICAgIHJldHVybiBpZiBAZGlzcG9zZWRcblxuICAgICMgUmVtb3ZlIGpRdWVyeSBvYmplY3RzLCBpdGVtIHZpZXcgY2FjaGUgYW5kIHZpc2libGUgaXRlbXMgbGlzdC5cbiAgICBkZWxldGUgdGhpc1twcm9wXSBmb3IgcHJvcCBpbiBbXG4gICAgICAnJGxpc3QnLCAnJGZhbGxiYWNrJyxcbiAgICAgICckbG9hZGluZycsICd2aXNpYmxlSXRlbXMnXG4gICAgXVxuXG4gICAgIyBTZWxmLWRpc3Bvc2FsLlxuICAgIHN1cGVyXG4iLCIndXNlIHN0cmljdCdcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUnXG5CYWNrYm9uZSA9IHJlcXVpcmUgJ2JhY2tib25lJ1xuXG5WaWV3ID0gcmVxdWlyZSAnLi92aWV3J1xuRXZlbnRCcm9rZXIgPSByZXF1aXJlICcuLi9saWIvZXZlbnRfYnJva2VyJ1xudXRpbHMgPSByZXF1aXJlICcuLi9saWIvdXRpbHMnXG5tZWRpYXRvciA9IHJlcXVpcmUgJy4uL21lZGlhdG9yJ1xuXG4jIFNob3J0Y3V0IHRvIGFjY2VzcyB0aGUgRE9NIG1hbmlwdWxhdGlvbiBsaWJyYXJ5LlxueyR9ID0gQmFja2JvbmVcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBMYXlvdXQgZXh0ZW5kcyBWaWV3XG4gICMgQmluZCB0byBkb2N1bWVudCBib2R5IGJ5IGRlZmF1bHQuXG4gIGVsOiAnYm9keSdcblxuICAjIE92ZXJyaWRlIGRlZmF1bHQgdmlldyBiZWhhdmlvciwgd2UgZG9u4oCZdCB3YW50IGRvY3VtZW50LmJvZHkgdG8gYmUgcmVtb3ZlZC5cbiAga2VlcEVsZW1lbnQ6IHRydWVcblxuICAjIFRoZSBzaXRlIHRpdGxlIHVzZWQgaW4gdGhlIGRvY3VtZW50IHRpdGxlLlxuICAjIFRoaXMgc2hvdWxkIGJlIHNldCBpbiB5b3VyIGFwcC1zcGVjaWZpYyBBcHBsaWNhdGlvbiBjbGFzc1xuICAjIGFuZCBwYXNzZWQgYXMgYW4gb3B0aW9uLlxuICB0aXRsZTogJydcblxuICAjIFJlZ2lvbnNcbiAgIyAtLS0tLS0tXG5cbiAgIyBDb2xsZWN0aW9uIG9mIHJlZ2lzdGVyZWQgcmVnaW9uczsgYWxsIHZpZXcgcmVnaW9ucyBhcmUgY29sbGVjdGVkIGhlcmUuXG4gIGdsb2JhbFJlZ2lvbnM6IG51bGxcblxuICBsaXN0ZW46XG4gICAgJ2JlZm9yZUNvbnRyb2xsZXJEaXNwb3NlIG1lZGlhdG9yJzogJ3Njcm9sbCdcblxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICBAZ2xvYmFsUmVnaW9ucyA9IFtdXG4gICAgQHRpdGxlID0gb3B0aW9ucy50aXRsZVxuICAgIEByZWdpb25zID0gb3B0aW9ucy5yZWdpb25zIGlmIG9wdGlvbnMucmVnaW9uc1xuICAgIEBzZXR0aW5ncyA9IF8uZGVmYXVsdHMgb3B0aW9ucyxcbiAgICAgIHRpdGxlVGVtcGxhdGU6IChkYXRhKSAtPlxuICAgICAgICBzdCA9IGlmIGRhdGEuc3VidGl0bGUgdGhlbiBcIiN7ZGF0YS5zdWJ0aXRsZX0gXFx1MjAxMyBcIiBlbHNlICcnXG4gICAgICAgIHN0ICsgZGF0YS50aXRsZVxuICAgICAgb3BlbkV4dGVybmFsVG9CbGFuazogZmFsc2VcbiAgICAgIHJvdXRlTGlua3M6ICdhLCAuZ28tdG8nXG4gICAgICBza2lwUm91dGluZzogJy5ub3NjcmlwdCdcbiAgICAgICMgUGVyIGRlZmF1bHQsIGp1bXAgdG8gdGhlIHRvcCBvZiB0aGUgcGFnZS5cbiAgICAgIHNjcm9sbFRvOiBbMCwgMF1cblxuICAgIG1lZGlhdG9yLnNldEhhbmRsZXIgJ3JlZ2lvbjpzaG93JywgQHNob3dSZWdpb24sIHRoaXNcbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyICdyZWdpb246cmVnaXN0ZXInLCBAcmVnaXN0ZXJSZWdpb25IYW5kbGVyLCB0aGlzXG4gICAgbWVkaWF0b3Iuc2V0SGFuZGxlciAncmVnaW9uOnVucmVnaXN0ZXInLCBAdW5yZWdpc3RlclJlZ2lvbkhhbmRsZXIsIHRoaXNcbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyICdyZWdpb246ZmluZCcsIEByZWdpb25CeU5hbWUsIHRoaXNcbiAgICBtZWRpYXRvci5zZXRIYW5kbGVyICdhZGp1c3RUaXRsZScsIEBhZGp1c3RUaXRsZSwgdGhpc1xuXG4gICAgc3VwZXJcblxuICAgICMgU2V0IHRoZSBhcHAgbGluayByb3V0aW5nLlxuICAgIEBzdGFydExpbmtSb3V0aW5nKCkgaWYgQHNldHRpbmdzLnJvdXRlTGlua3NcblxuICAjIENvbnRyb2xsZXIgc3RhcnR1cCBhbmQgZGlzcG9zYWxcbiAgIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgIyBIYW5kbGVyIGZvciB0aGUgZ2xvYmFsIGJlZm9yZUNvbnRyb2xsZXJEaXNwb3NlIGV2ZW50LlxuICBzY3JvbGw6IC0+XG4gICAgIyBSZXNldCB0aGUgc2Nyb2xsIHBvc2l0aW9uLlxuICAgIHRvID0gQHNldHRpbmdzLnNjcm9sbFRvXG4gICAgaWYgdG8gYW5kIHR5cGVvZiB0byBpcyAnb2JqZWN0J1xuICAgICAgW3gsIHldID0gdG9cbiAgICAgIHdpbmRvdy5zY3JvbGxUbyB4LCB5XG5cbiAgIyBIYW5kbGVyIGZvciB0aGUgZ2xvYmFsIGRpc3BhdGNoZXI6ZGlzcGF0Y2ggZXZlbnQuXG4gICMgQ2hhbmdlIHRoZSBkb2N1bWVudCB0aXRsZSB0byBtYXRjaCB0aGUgbmV3IGNvbnRyb2xsZXIuXG4gICMgR2V0IHRoZSB0aXRsZSBmcm9tIHRoZSB0aXRsZSBwcm9wZXJ0eSBvZiB0aGUgY3VycmVudCBjb250cm9sbGVyLlxuICBhZGp1c3RUaXRsZTogKHN1YnRpdGxlID0gJycpIC0+XG4gICAgdGl0bGUgPSBAc2V0dGluZ3MudGl0bGVUZW1wbGF0ZSB7QHRpdGxlLCBzdWJ0aXRsZX1cbiAgICBkb2N1bWVudC50aXRsZSA9IHRpdGxlXG4gICAgQHB1Ymxpc2hFdmVudCAnYWRqdXN0VGl0bGUnLCBzdWJ0aXRsZSwgdGl0bGVcbiAgICB0aXRsZVxuXG4gICMgQXV0b21hdGljIHJvdXRpbmcgb2YgaW50ZXJuYWwgbGlua3NcbiAgIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHN0YXJ0TGlua1JvdXRpbmc6IC0+XG4gICAgcm91dGUgPSBAc2V0dGluZ3Mucm91dGVMaW5rc1xuICAgIEBkZWxlZ2F0ZSAnY2xpY2snLCByb3V0ZSwgQG9wZW5MaW5rIGlmIHJvdXRlXG5cbiAgc3RvcExpbmtSb3V0aW5nOiAtPlxuICAgIHJvdXRlID0gQHNldHRpbmdzLnJvdXRlTGlua3NcbiAgICBAdW5kZWxlZ2F0ZSAnY2xpY2snLCByb3V0ZSBpZiByb3V0ZVxuXG4gIGlzRXh0ZXJuYWxMaW5rOiAobGluaykgLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIHV0aWxzLm1hdGNoZXNTZWxlY3RvciBsaW5rLCAnYSwgYXJlYSdcbiAgICByZXR1cm4gdHJ1ZSBpZiBsaW5rLmhhc0F0dHJpYnV0ZSAnZG93bmxvYWQnXG5cbiAgICAjIElFIDktMTEgcmVzb2x2ZSBocmVmIGJ1dCBkbyBub3QgcG9wdWxhdGUgcHJvdG9jb2wsIGhvc3QgZXRjLlxuICAgICMgUmVhc3NpZ25pbmcgaHJlZiBoZWxwcy4gU2VlICM4NzggaXNzdWUgZm9yIGRldGFpbHMuXG4gICAgbGluay5ocmVmICs9ICcnIHVubGVzcyBsaW5rLmhvc3RcblxuICAgIHtwcm90b2NvbCwgaG9zdH0gPSBsb2NhdGlvblxuICAgIHt0YXJnZXR9ID0gbGlua1xuXG4gICAgdGFyZ2V0IGlzICdfYmxhbmsnIG9yXG4gICAgbGluay5yZWwgaXMgJ2V4dGVybmFsJyBvclxuICAgIGxpbmsucHJvdG9jb2wgaXNudCBwcm90b2NvbCBvclxuICAgIGxpbmsuaG9zdCBpc250IGhvc3Qgb3JcbiAgICAodGFyZ2V0IGlzICdfcGFyZW50JyBhbmQgcGFyZW50IGlzbnQgc2VsZikgb3JcbiAgICAodGFyZ2V0IGlzICdfdG9wJyBhbmQgdG9wIGlzbnQgc2VsZilcblxuICAjIEhhbmRsZSBhbGwgY2xpY2tzIG9uIEEgZWxlbWVudHMgYW5kIHRyeSB0byByb3V0ZSB0aGVtIGludGVybmFsbHkuXG4gIG9wZW5MaW5rOiAoZXZlbnQpID0+XG4gICAgcmV0dXJuIGlmIHV0aWxzLm1vZGlmaWVyS2V5UHJlc3NlZCBldmVudFxuXG4gICAgZWwgPSBpZiAkIHRoZW4gZXZlbnQuY3VycmVudFRhcmdldCBlbHNlIGV2ZW50LmRlbGVnYXRlVGFyZ2V0XG5cbiAgICAjIEdldCB0aGUgaHJlZiBhbmQgcGVyZm9ybSBjaGVja3Mgb24gaXQuXG4gICAgaHJlZiA9IGVsLmdldEF0dHJpYnV0ZSgnaHJlZicpIG9yIGVsLmdldEF0dHJpYnV0ZSgnZGF0YS1ocmVmJylcblxuICAgICMgQmFzaWMgaHJlZiBjaGVja3MuXG4gICAgIyBUZWNobmljYWxseSBhbiBlbXB0eSBzdHJpbmcgaXMgYSB2YWxpZCByZWxhdGl2ZSBVUkxcbiAgICAjIGJ1dCBpdCBkb2VzbuKAmXQgbWFrZSBzZW5zZSB0byByb3V0ZSBpdC5cbiAgICByZXR1cm4gaWYgbm90IGhyZWYgb3JcbiAgICAgICMgRXhjbHVkZSBmcmFnbWVudCBsaW5rcy5cbiAgICAgIGhyZWZbMF0gaXMgJyMnXG5cbiAgICAjIEFwcGx5IHNraXBSb3V0aW5nIG9wdGlvbi5cbiAgICB7c2tpcFJvdXRpbmd9ID0gQHNldHRpbmdzXG4gICAgc3dpdGNoIHR5cGVvZiBza2lwUm91dGluZ1xuICAgICAgd2hlbiAnZnVuY3Rpb24nXG4gICAgICAgIHJldHVybiB1bmxlc3Mgc2tpcFJvdXRpbmcgaHJlZiwgZWxcbiAgICAgIHdoZW4gJ3N0cmluZydcbiAgICAgICAgcmV0dXJuIGlmIHV0aWxzLm1hdGNoZXNTZWxlY3RvciBlbCwgc2tpcFJvdXRpbmdcblxuICAgICMgSGFuZGxlIGV4dGVybmFsIGxpbmtzLlxuICAgIGlmIEBpc0V4dGVybmFsTGluayBlbFxuICAgICAgaWYgQHNldHRpbmdzLm9wZW5FeHRlcm5hbFRvQmxhbmtcbiAgICAgICAgIyBPcGVuIGV4dGVybmFsIGxpbmtzIG5vcm1hbGx5IGluIGEgbmV3IHRhYi5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICAgICBAb3BlbldpbmRvdyBocmVmXG4gICAgICByZXR1cm5cblxuICAgICMgUGFzcyB0byB0aGUgcm91dGVyLCB0cnkgdG8gcm91dGUgdGhlIHBhdGggaW50ZXJuYWxseS5cbiAgICB1dGlscy5yZWRpcmVjdFRvIHVybDogaHJlZlxuXG4gICAgIyBQcmV2ZW50IGRlZmF1bHQgaGFuZGxpbmcgaWYgdGhlIFVSTCBjb3VsZCBiZSByb3V0ZWQuXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuXG4gICMgSGFuZGxlIGFsbCBicm93c2luZyBjb250ZXh0IHJlc291cmNlc1xuICBvcGVuV2luZG93OiAoaHJlZikgLT5cbiAgICB3aW5kb3cub3BlbiBocmVmXG5cbiAgIyBSZWdpb24gbWFuYWdlbWVudFxuICAjIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgIyBIYW5kbGVyIGZvciBgIXJlZ2lvbjpyZWdpc3RlcmAuXG4gICMgUmVnaXN0ZXIgYSBzaW5nbGUgdmlldyByZWdpb24gb3IgYWxsIHJlZ2lvbnMgZXhwb3NlZC5cbiAgcmVnaXN0ZXJSZWdpb25IYW5kbGVyOiAoaW5zdGFuY2UsIG5hbWUsIHNlbGVjdG9yKSAtPlxuICAgIGlmIG5hbWU/XG4gICAgICBAcmVnaXN0ZXJHbG9iYWxSZWdpb24gaW5zdGFuY2UsIG5hbWUsIHNlbGVjdG9yXG4gICAgZWxzZVxuICAgICAgQHJlZ2lzdGVyR2xvYmFsUmVnaW9ucyBpbnN0YW5jZVxuXG4gICMgUmVnaXN0ZXJpbmcgb25lIHJlZ2lvbiBib3VuZCB0byBhIHZpZXcuXG4gIHJlZ2lzdGVyR2xvYmFsUmVnaW9uOiAoaW5zdGFuY2UsIG5hbWUsIHNlbGVjdG9yKSAtPlxuICAgICMgUmVtb3ZlIHRoZSByZWdpb24gaWYgdGhlcmUgd2FzIGFscmVhZHkgb25lIHJlZ2lzdGVyZWQgcGVyaGFwcyBieVxuICAgICMgYSBiYXNlIGNsYXNzLlxuICAgIEB1bnJlZ2lzdGVyR2xvYmFsUmVnaW9uIGluc3RhbmNlLCBuYW1lXG5cbiAgICAjIFBsYWNlIHRoaXMgcmVnaW9uIHJlZ2lzdHJhdGlvbiBpbnRvIHRoZSByZWdpb25zIGFycmF5LlxuICAgIEBnbG9iYWxSZWdpb25zLnVuc2hpZnQge2luc3RhbmNlLCBuYW1lLCBzZWxlY3Rvcn1cblxuICAjIFRyaWdnZXJlZCBieSB2aWV3OyBwYXNzZWQgaW4gdGhlIHJlZ2lvbnMgaGFzaC5cbiAgIyBTaW1wbHkgcmVnaXN0ZXIgYWxsIHJlZ2lvbnMgZXhwb3NlZCBieSBpdC5cbiAgcmVnaXN0ZXJHbG9iYWxSZWdpb25zOiAoaW5zdGFuY2UpIC0+XG4gICAgIyBSZWdpb25zIGNhbiBiZSBiZSBleHRlbmRlZCBieSBzdWJjbGFzc2VzLCBzbyB3ZSBuZWVkIHRvIGNoZWNrIHRoZVxuICAgICMgd2hvbGUgcHJvdG90eXBlIGNoYWluIGZvciBtYXRjaGluZyByZWdpb25zLiBSZWdpb25zIHJlZ2lzdGVyZWQgYnkgdGhlXG4gICAgIyBtb3JlLWRlcml2ZWQgY2xhc3Mgb3ZlcndyaXRlcyB0aGUgcmVnaW9uIHJlZ2lzdGVyZWQgYnkgdGhlIGxlc3MtZGVyaXZlZFxuICAgICMgY2xhc3MuXG4gICAgZm9yIHZlcnNpb24gaW4gdXRpbHMuZ2V0QWxsUHJvcGVydHlWZXJzaW9ucyBpbnN0YW5jZSwgJ3JlZ2lvbnMnXG4gICAgICBmb3IgbmFtZSwgc2VsZWN0b3Igb2YgdmVyc2lvblxuICAgICAgICBAcmVnaXN0ZXJHbG9iYWxSZWdpb24gaW5zdGFuY2UsIG5hbWUsIHNlbGVjdG9yXG4gICAgIyBSZXR1cm4gbm90aGluZy5cbiAgICByZXR1cm5cblxuICAjIEhhbmRsZXIgZm9yIGAhcmVnaW9uOnVucmVnaXN0ZXJgLlxuICAjIFVucmVnaXN0ZXJzIHNpbmdsZSBuYW1lZCByZWdpb24gb3IgYWxsIHZpZXcgcmVnaW9ucy5cbiAgdW5yZWdpc3RlclJlZ2lvbkhhbmRsZXI6IChpbnN0YW5jZSwgbmFtZSkgLT5cbiAgICBpZiBuYW1lP1xuICAgICAgQHVucmVnaXN0ZXJHbG9iYWxSZWdpb24gaW5zdGFuY2UsIG5hbWVcbiAgICBlbHNlXG4gICAgICBAdW5yZWdpc3Rlckdsb2JhbFJlZ2lvbnMgaW5zdGFuY2VcblxuICAjIFVucmVnaXN0ZXJzIGEgc3BlY2lmaWMgbmFtZWQgcmVnaW9uIGZyb20gYSB2aWV3LlxuICB1bnJlZ2lzdGVyR2xvYmFsUmVnaW9uOiAoaW5zdGFuY2UsIG5hbWUpIC0+XG4gICAgY2lkID0gaW5zdGFuY2UuY2lkXG4gICAgQGdsb2JhbFJlZ2lvbnMgPSAocmVnaW9uIGZvciByZWdpb24gaW4gQGdsb2JhbFJlZ2lvbnMgd2hlbiAoXG4gICAgICByZWdpb24uaW5zdGFuY2UuY2lkIGlzbnQgY2lkIG9yIHJlZ2lvbi5uYW1lIGlzbnQgbmFtZVxuICAgICkpXG5cbiAgIyBXaGVuIHZpZXdzIGFyZSBkaXNwb3NlZDsgcmVtb3ZlIGFsbCB0aGVpciByZWdpc3RlcmVkIHJlZ2lvbnMuXG4gIHVucmVnaXN0ZXJHbG9iYWxSZWdpb25zOiAoaW5zdGFuY2UpIC0+XG4gICAgQGdsb2JhbFJlZ2lvbnMgPSAocmVnaW9uIGZvciByZWdpb24gaW4gQGdsb2JhbFJlZ2lvbnMgd2hlbiAoXG4gICAgICByZWdpb24uaW5zdGFuY2UuY2lkIGlzbnQgaW5zdGFuY2UuY2lkXG4gICAgKSlcblxuICAjIFJldHVybnMgdGhlIHJlZ2lvbiBieSBpdHMgbmFtZSwgaWYgZm91bmQuXG4gIHJlZ2lvbkJ5TmFtZTogKG5hbWUpIC0+XG4gICAgZm9yIHJlZyBpbiBAZ2xvYmFsUmVnaW9ucyB3aGVuIHJlZy5uYW1lIGlzIG5hbWUgYW5kIG5vdCByZWcuaW5zdGFuY2Uuc3RhbGVcbiAgICAgIHJldHVybiByZWdcblxuICAjIFdoZW4gdmlld3MgYXJlIGluc3RhbnRpYXRlZCBhbmQgcmVxdWVzdCBmb3IgYSByZWdpb24gYXNzaWdubWVudDtcbiAgIyBhdHRlbXB0IHRvIGZ1bGZpbGwgaXQuXG4gIHNob3dSZWdpb246IChuYW1lLCBpbnN0YW5jZSkgLT5cbiAgICAjIEZpbmQgYW4gYXBwcm9wcmlhdGUgcmVnaW9uLlxuICAgIHJlZ2lvbiA9IEByZWdpb25CeU5hbWUgbmFtZVxuXG4gICAgIyBBc3NlcnQgdGhhdCB3ZSBnb3QgYSB2YWxpZCByZWdpb24uXG4gICAgdGhyb3cgbmV3IEVycm9yIFwiTm8gcmVnaW9uIHJlZ2lzdGVyZWQgdW5kZXIgI3tuYW1lfVwiIHVubGVzcyByZWdpb25cblxuICAgICMgQXBwbHkgdGhlIHJlZ2lvbiBzZWxlY3Rvci5cbiAgICBpbnN0YW5jZS5jb250YWluZXIgPSBpZiByZWdpb24uc2VsZWN0b3IgaXMgJydcbiAgICAgIGlmICRcbiAgICAgICAgcmVnaW9uLmluc3RhbmNlLiRlbFxuICAgICAgZWxzZVxuICAgICAgICByZWdpb24uaW5zdGFuY2UuZWxcbiAgICBlbHNlXG4gICAgICBpZiByZWdpb24uaW5zdGFuY2Uubm9XcmFwXG4gICAgICAgIHJlZ2lvbi5pbnN0YW5jZS5jb250YWluZXIuZmluZCByZWdpb24uc2VsZWN0b3JcbiAgICAgIGVsc2VcbiAgICAgICAgcmVnaW9uLmluc3RhbmNlLmZpbmQgcmVnaW9uLnNlbGVjdG9yXG5cbiAgIyBEaXNwb3NhbFxuICAjIC0tLS0tLS0tXG5cbiAgZGlzcG9zZTogLT5cbiAgICByZXR1cm4gaWYgQGRpc3Bvc2VkXG5cbiAgICAjIFN0b3Agcm91dGluZyBsaW5rcy5cbiAgICBAc3RvcExpbmtSb3V0aW5nKClcblxuICAgICMgUmVtb3ZlIGFsbCByZWdpb25zIGFuZCBkb2N1bWVudCB0aXRsZSBzZXR0aW5nLlxuICAgIGRlbGV0ZSB0aGlzW3Byb3BdIGZvciBwcm9wIGluIFsnZ2xvYmFsUmVnaW9ucycsICd0aXRsZScsICdyb3V0ZSddXG5cbiAgICBtZWRpYXRvci5yZW1vdmVIYW5kbGVycyB0aGlzXG5cbiAgICBzdXBlclxuIiwiJ3VzZSBzdHJpY3QnXG5cbl8gPSByZXF1aXJlICd1bmRlcnNjb3JlJ1xuQmFja2JvbmUgPSByZXF1aXJlICdiYWNrYm9uZSdcblxuRXZlbnRCcm9rZXIgPSByZXF1aXJlICcuLi9saWIvZXZlbnRfYnJva2VyJ1xudXRpbHMgPSByZXF1aXJlICcuLi9saWIvdXRpbHMnXG5tZWRpYXRvciA9IHJlcXVpcmUgJy4uL21lZGlhdG9yJ1xuXG4jIFNob3J0Y3V0IHRvIGFjY2VzcyB0aGUgRE9NIG1hbmlwdWxhdGlvbiBsaWJyYXJ5LlxueyR9ID0gQmFja2JvbmVcblxuc2V0SFRNTCA9IGRvIC0+XG4gIGlmICRcbiAgICAodmlldywgaHRtbCkgLT5cbiAgICAgIHZpZXcuJGVsLmh0bWwgaHRtbFxuICAgICAgaHRtbFxuICBlbHNlXG4gICAgKHZpZXcsIGh0bWwpIC0+XG4gICAgICB2aWV3LmVsLmlubmVySFRNTCA9IGh0bWxcblxuYXR0YWNoID0gZG8gLT5cbiAgaWYgJFxuICAgICh2aWV3KSAtPlxuICAgICAgYWN0dWFsID0gJCB2aWV3LmNvbnRhaW5lclxuICAgICAgaWYgdHlwZW9mIHZpZXcuY29udGFpbmVyTWV0aG9kIGlzICdmdW5jdGlvbidcbiAgICAgICAgdmlldy5jb250YWluZXJNZXRob2QgYWN0dWFsLCB2aWV3LmVsXG4gICAgICBlbHNlXG4gICAgICAgIGFjdHVhbFt2aWV3LmNvbnRhaW5lck1ldGhvZF0gdmlldy5lbFxuICBlbHNlXG4gICAgKHZpZXcpIC0+XG4gICAgICBhY3R1YWwgPSBpZiB0eXBlb2Ygdmlldy5jb250YWluZXIgaXMgJ3N0cmluZydcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvciB2aWV3LmNvbnRhaW5lclxuICAgICAgZWxzZVxuICAgICAgICB2aWV3LmNvbnRhaW5lclxuXG4gICAgICBpZiB0eXBlb2Ygdmlldy5jb250YWluZXJNZXRob2QgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICB2aWV3LmNvbnRhaW5lck1ldGhvZCBhY3R1YWwsIHZpZXcuZWxcbiAgICAgIGVsc2VcbiAgICAgICAgYWN0dWFsW3ZpZXcuY29udGFpbmVyTWV0aG9kXSB2aWV3LmVsXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgVmlldyBleHRlbmRzIEJhY2tib25lLk5hdGl2ZVZpZXcgb3IgQmFja2JvbmUuVmlld1xuICAjIE1peGluIGFuIEV2ZW50QnJva2VyLlxuICBfLmV4dGVuZCBAcHJvdG90eXBlLCBFdmVudEJyb2tlclxuXG4gICMgQXV0b21hdGljIHJlbmRlcmluZ1xuICAjIC0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAjIEZsYWcgd2hldGhlciB0byByZW5kZXIgdGhlIHZpZXcgYXV0b21hdGljYWxseSBvbiBpbml0aWFsaXphdGlvbi5cbiAgIyBBcyBhbiBhbHRlcm5hdGl2ZSB5b3UgbWlnaHQgcGFzcyBhIGByZW5kZXJgIG9wdGlvbiB0byB0aGUgY29uc3RydWN0b3IuXG4gIGF1dG9SZW5kZXI6IGZhbHNlXG5cbiAgIyBGbGFnIHdoZXRoZXIgdG8gYXR0YWNoIHRoZSB2aWV3IGF1dG9tYXRpY2FsbHkgb24gcmVuZGVyLlxuICBhdXRvQXR0YWNoOiB0cnVlXG5cbiAgIyBBdXRvbWF0aWMgaW5zZXJ0aW5nIGludG8gRE9NXG4gICMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICMgVmlldyBjb250YWluZXIgZWxlbWVudC5cbiAgIyBTZXQgdGhpcyBwcm9wZXJ0eSBpbiBhIGRlcml2ZWQgY2xhc3MgdG8gc3BlY2lmeSB0aGUgY29udGFpbmVyIGVsZW1lbnQuXG4gICMgTm9ybWFsbHkgdGhpcyBpcyBhIHNlbGVjdG9yIHN0cmluZyBidXQgaXQgbWlnaHQgYWxzbyBiZSBhbiBlbGVtZW50IG9yXG4gICMgalF1ZXJ5IG9iamVjdC5cbiAgIyBUaGUgdmlldyBpcyBhdXRvbWF0aWNhbGx5IGluc2VydGVkIGludG8gdGhlIGNvbnRhaW5lciB3aGVuIGl04oCZcyByZW5kZXJlZC5cbiAgIyBBcyBhbiBhbHRlcm5hdGl2ZSB5b3UgbWlnaHQgcGFzcyBhIGBjb250YWluZXJgIG9wdGlvbiB0byB0aGUgY29uc3RydWN0b3IuXG4gIGNvbnRhaW5lcjogbnVsbFxuXG4gICMgTWV0aG9kIHdoaWNoIGlzIHVzZWQgZm9yIGFkZGluZyB0aGUgdmlldyB0byB0aGUgRE9NXG4gICMgTGlrZSBqUXVlcnnigJlzIGBodG1sYCwgYHByZXBlbmRgLCBgYXBwZW5kYCwgYGFmdGVyYCwgYGJlZm9yZWAgZXRjLlxuICBjb250YWluZXJNZXRob2Q6IGlmICQgdGhlbiAnYXBwZW5kJyBlbHNlICdhcHBlbmRDaGlsZCdcblxuICAjIFJlZ2lvbnNcbiAgIyAtLS0tLS0tXG5cbiAgIyBSZWdpb24gcmVnaXN0cmF0aW9uOyByZWdpb25zIGFyZSBpbiBlc3NlbmNlIG5hbWVkIHNlbGVjdG9ycyB0aGF0IGFpbVxuICAjIHRvIGRlY291cGxlIHRoZSB2aWV3IGZyb20gaXRzIHBhcmVudC5cbiAgI1xuICAjIFRoaXMgZnVuY3Rpb25zIGNsb3NlIHRvIHRoZSBkZWNsYXJhdGl2ZSBldmVudHMgaGFzaDsgdXNlIGFzIGZvbGxvd3M6XG4gICMgcmVnaW9uczpcbiAgIyAgICdyZWdpb24xJzogJy5jbGFzcydcbiAgIyAgICdyZWdpb24yJzogJyNpZCdcbiAgcmVnaW9uczogbnVsbFxuXG4gICMgUmVnaW9uIGFwcGxpY2F0aW9uIGlzIHRoZSByZXZlcnNlOyB5b3UncmUgc3BlY2lmeWluZyB0aGF0IHRoaXMgdmlld1xuICAjIHdpbGwgYmUgaW5zZXJ0ZWQgaW50byB0aGUgRE9NIGF0IHRoZSBuYW1lZCByZWdpb24uIEVycm9yIHRocm93biBpZlxuICAjIHRoZSByZWdpb24gaXMgdW5yZWdpc3RlcmVkIGF0IHRoZSB0aW1lIG9mIGluaXRpYWxpemF0aW9uLlxuICAjIFNldCB0aGUgcmVnaW9uIG5hbWUgb24geW91ciBkZXJpdmVkIGNsYXNzIG9yIHBhc3MgaXQgaW50byB0aGVcbiAgIyBjb25zdHJ1Y3RvciBpbiBjb250cm9sbGVyIGFjdGlvbi5cbiAgcmVnaW9uOiBudWxsXG5cbiAgIyBBIHZpZXcgaXMgYHN0YWxlYCB3aGVuIGl0IGhhcyBiZWVuIHByZXZpb3VzbHkgY29tcG9zZWQgYnkgdGhlIGxhc3RcbiAgIyByb3V0ZSBidXQgaGFzIG5vdCB5ZXQgYmVlbiBjb21wb3NlZCBieSB0aGUgY3VycmVudCByb3V0ZS5cbiAgc3RhbGU6IGZhbHNlXG5cbiAgIyBGbGFnIHdoZXRoZXIgdG8gd3JhcCBhIHZpZXcgd2l0aCB0aGUgYHRhZ05hbWVgIGVsZW1lbnQgd2hlblxuICAjIHJlbmRlcmluZyBpbnRvIGEgcmVnaW9uLlxuICBub1dyYXA6IGZhbHNlXG5cbiAgIyBTcGVjaWZpZXMgaWYgY3VycmVudCBlbGVtZW50IHNob3VsZCBiZSBrZXB0IGluIERPTSBhZnRlciBkaXNwb3NhbC5cbiAga2VlcEVsZW1lbnQ6IGZhbHNlXG5cbiAgIyBTdWJ2aWV3c1xuICAjIC0tLS0tLS0tXG5cbiAgIyBMaXN0IG9mIHN1YnZpZXdzLlxuICBzdWJ2aWV3czogbnVsbFxuICBzdWJ2aWV3c0J5TmFtZTogbnVsbFxuXG4gICMgSW5pdGlhbGl6YXRpb25cbiAgIyAtLS0tLS0tLS0tLS0tLVxuXG4gICMgTGlzdCBvZiBvcHRpb25zIHRoYXQgd2lsbCBiZSBwaWNrZWQgZnJvbSBjb25zdHJ1Y3Rvci5cbiAgIyBFYXN5IHRvIGV4dGVuZDogYG9wdGlvbk5hbWVzOiBWaWV3OjpvcHRpb25OYW1lcy5jb25jYXQgWyd0ZW1wbGF0ZSddYFxuICBvcHRpb25OYW1lczogW1xuICAgICdhdXRvQXR0YWNoJywgJ2F1dG9SZW5kZXInLFxuICAgICdjb250YWluZXInLCAnY29udGFpbmVyTWV0aG9kJyxcbiAgICAncmVnaW9uJywgJ3JlZ2lvbnMnXG4gICAgJ25vV3JhcCdcbiAgXVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICMgQ29weSBzb21lIG9wdGlvbnMgdG8gaW5zdGFuY2UgcHJvcGVydGllcy5cbiAgICBmb3Iga2V5IGluIE9iamVjdC5rZXlzIG9wdGlvbnNcbiAgICAgIGlmIGtleSBpbiBAb3B0aW9uTmFtZXNcbiAgICAgICAgQFtrZXldID0gb3B0aW9uc1trZXldXG5cbiAgICAjIFdyYXAgYHJlbmRlcmAgc28gYGF0dGFjaGAgaXMgY2FsbGVkIGFmdGVyd2FyZHMuXG4gICAgIyBFbmNsb3NlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbiAgICByZW5kZXIgPSBAcmVuZGVyXG4gICAgIyBDcmVhdGUgdGhlIHdyYXBwZXIgbWV0aG9kLlxuICAgIEByZW5kZXIgPSAtPlxuICAgICAgIyBTdG9wIGlmIHRoZSBpbnN0YW5jZSB3YXMgYWxyZWFkeSBkaXNwb3NlZC5cbiAgICAgIHJldHVybiBmYWxzZSBpZiBAZGlzcG9zZWRcbiAgICAgICMgQ2FsbCB0aGUgb3JpZ2luYWwgbWV0aG9kLlxuICAgICAgcmV0dXJuVmFsdWUgPSByZW5kZXIuYXBwbHkgdGhpcywgYXJndW1lbnRzXG4gICAgICAjIEF0dGFjaCB0byBET00uXG4gICAgICBAYXR0YWNoIGFyZ3VtZW50cy4uLiBpZiBAYXV0b0F0dGFjaFxuICAgICAgIyBSZXR1cm4gdmFsdWUgZnJvbSBvcmlnaW4gbWV0aG9kLlxuICAgICAgcmV0dXJuVmFsdWVcblxuICAgICMgSW5pdGlhbGl6ZSBzdWJ2aWV3cyBjb2xsZWN0aW9ucy5cbiAgICBAc3Vidmlld3MgPSBbXVxuICAgIEBzdWJ2aWV3c0J5TmFtZSA9IHt9XG5cbiAgICBpZiBAbm9XcmFwXG4gICAgICBpZiBAcmVnaW9uXG4gICAgICAgIHJlZ2lvbiA9IG1lZGlhdG9yLmV4ZWN1dGUgJ3JlZ2lvbjpmaW5kJywgQHJlZ2lvblxuICAgICAgICAjIFNldCB0aGUgYHRoaXMuZWxgIHRvIGJlIHRoZSBjbG9zZXN0IHJlbGV2YW50IGNvbnRhaW5lci5cbiAgICAgICAgaWYgcmVnaW9uP1xuICAgICAgICAgIEBlbCA9XG4gICAgICAgICAgICBpZiByZWdpb24uaW5zdGFuY2UuY29udGFpbmVyP1xuICAgICAgICAgICAgICBpZiByZWdpb24uaW5zdGFuY2UucmVnaW9uP1xuICAgICAgICAgICAgICAgICQocmVnaW9uLmluc3RhbmNlLmNvbnRhaW5lcikuZmluZCByZWdpb24uc2VsZWN0b3JcbiAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJlZ2lvbi5pbnN0YW5jZS5jb250YWluZXJcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgcmVnaW9uLmluc3RhbmNlLiQgcmVnaW9uLnNlbGVjdG9yXG5cbiAgICAgIEBlbCA9IEBjb250YWluZXIgaWYgQGNvbnRhaW5lclxuXG4gICAgIyBDYWxsIEJhY2tib25l4oCZcyBjb25zdHJ1Y3Rvci5cbiAgICBzdXBlclxuXG4gICAgIyBTZXQgdXAgZGVjbGFyYXRpdmUgYmluZGluZ3MgYWZ0ZXIgYGluaXRpYWxpemVgIGhhcyBiZWVuIGNhbGxlZFxuICAgICMgc28gaW5pdGlhbGl6ZSBtYXkgc2V0IG1vZGVsL2NvbGxlY3Rpb24gYW5kIGNyZWF0ZSBvciBiaW5kIG1ldGhvZHMuXG4gICAgQGRlbGVnYXRlTGlzdGVuZXJzKClcblxuICAgICMgTGlzdGVuIGZvciBkaXNwb3NhbCBvZiB0aGUgbW9kZWwgb3IgY29sbGVjdGlvbi5cbiAgICAjIElmIHRoZSBtb2RlbCBpcyBkaXNwb3NlZCwgYXV0b21hdGljYWxseSBkaXNwb3NlIHRoZSBhc3NvY2lhdGVkIHZpZXcuXG4gICAgQGxpc3RlblRvIEBtb2RlbCwgJ2Rpc3Bvc2UnLCBAZGlzcG9zZSBpZiBAbW9kZWxcbiAgICBpZiBAY29sbGVjdGlvblxuICAgICAgQGxpc3RlblRvIEBjb2xsZWN0aW9uLCAnZGlzcG9zZScsIChzdWJqZWN0KSA9PlxuICAgICAgICBAZGlzcG9zZSgpIGlmIG5vdCBzdWJqZWN0IG9yIHN1YmplY3QgaXMgQGNvbGxlY3Rpb25cblxuICAgICMgUmVnaXN0ZXIgYWxsIGV4cG9zZWQgcmVnaW9ucy5cbiAgICBtZWRpYXRvci5leGVjdXRlICdyZWdpb246cmVnaXN0ZXInLCB0aGlzIGlmIEByZWdpb25zP1xuXG4gICAgIyBSZW5kZXIgYXV0b21hdGljYWxseSBpZiBzZXQgYnkgb3B0aW9ucyBvciBpbnN0YW5jZSBwcm9wZXJ0eS5cbiAgICBAcmVuZGVyKCkgaWYgQGF1dG9SZW5kZXJcblxuICBmaW5kOiAoc2VsZWN0b3IpIC0+XG4gICAgaWYgJFxuICAgICAgQCRlbC5maW5kIHNlbGVjdG9yXG4gICAgZWxzZVxuICAgICAgQGVsLnF1ZXJ5U2VsZWN0b3Igc2VsZWN0b3JcblxuICAjIFVzZXIgaW5wdXQgZXZlbnQgaGFuZGxpbmdcbiAgIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgIyBFdmVudCBoYW5kbGluZyB1c2luZyBldmVudCBkZWxlZ2F0aW9uXG4gICMgUmVnaXN0ZXIgYSBoYW5kbGVyIGZvciBhIHNwZWNpZmljIGV2ZW50IHR5cGVcbiAgIyBGb3IgdGhlIHdob2xlIHZpZXc6XG4gICMgICBkZWxlZ2F0ZShldmVudE5hbWUsIGhhbmRsZXIpXG4gICMgICBlLmcuXG4gICMgICBAZGVsZWdhdGUoJ2NsaWNrJywgQGNsaWNrZWQpXG4gICMgRm9yIGFuIGVsZW1lbnQgaW4gdGhlIHBhc3NpbmcgYSBzZWxlY3RvcjpcbiAgIyAgIGRlbGVnYXRlKGV2ZW50TmFtZSwgc2VsZWN0b3IsIGhhbmRsZXIpXG4gICMgICBlLmcuXG4gICMgICBAZGVsZWdhdGUoJ2NsaWNrJywgJ2J1dHRvbi5jb25maXJtJywgQGNvbmZpcm0pXG4gIGRlbGVnYXRlOiAoZXZlbnROYW1lLCBzZWNvbmQsIHRoaXJkKSAtPlxuICAgIGlmIHR5cGVvZiBldmVudE5hbWUgaXNudCAnc3RyaW5nJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnVmlldyNkZWxlZ2F0ZTogZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZydcblxuICAgIHN3aXRjaCBhcmd1bWVudHMubGVuZ3RoXG4gICAgICB3aGVuIDJcbiAgICAgICAgaGFuZGxlciA9IHNlY29uZFxuICAgICAgd2hlbiAzXG4gICAgICAgIHNlbGVjdG9yID0gc2Vjb25kXG4gICAgICAgIGhhbmRsZXIgPSB0aGlyZFxuICAgICAgICBpZiB0eXBlb2Ygc2VsZWN0b3IgaXNudCAnc3RyaW5nJ1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgJ1ZpZXcjZGVsZWdhdGU6ICcgK1xuICAgICAgICAgICAgJ3NlY29uZCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgICAgZWxzZVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yICdWaWV3I2RlbGVnYXRlOiAnICtcbiAgICAgICAgICAnb25seSB0d28gb3IgdGhyZWUgYXJndW1lbnRzIGFyZSBhbGxvd2VkJ1xuXG4gICAgaWYgdHlwZW9mIGhhbmRsZXIgaXNudCAnZnVuY3Rpb24nXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yICdWaWV3I2RlbGVnYXRlOiAnICtcbiAgICAgICAgJ2hhbmRsZXIgYXJndW1lbnQgbXVzdCBiZSBmdW5jdGlvbidcblxuICAgICMgQWRkIGFuIGV2ZW50IG5hbWVzcGFjZSwgYmluZCBoYW5kbGVyIGl0IHRvIHZpZXcuXG4gICAgIyBCaW5kIGhhbmRsZXIgdG8gdmlldy5cbiAgICBib3VuZCA9IGhhbmRsZXIuYmluZCB0aGlzXG5cbiAgICBpZiAkXG4gICAgICBldmVudHMgPSBldmVudE5hbWVcbiAgICAgICAgLnNwbGl0ICcgJ1xuICAgICAgICAubWFwIChuYW1lKSA9PiBcIiN7bmFtZX0uZGVsZWdhdGVFdmVudHMje0BjaWR9XCJcbiAgICAgICAgLmpvaW4gJyAnXG5cbiAgICAgIEAkZWwub24gZXZlbnRzLCBzZWxlY3RvciwgYm91bmRcbiAgICBlbHNlXG4gICAgICBmb3IgZXZlbnQgaW4gZXZlbnROYW1lLnNwbGl0ICcgJ1xuICAgICAgICBzdXBlciBldmVudCwgc2VsZWN0b3IsIGJvdW5kXG5cbiAgICAjIFJldHVybiB0aGUgYm91bmQgaGFuZGxlci5cbiAgICBib3VuZFxuXG4gICMgQ29weSBvZiBvcmlnaW5hbCBCYWNrYm9uZSBtZXRob2Qgd2l0aG91dCBgdW5kZWxlZ2F0ZUV2ZW50c2AgY2FsbC5cbiAgX2RlbGVnYXRlRXZlbnRzOiAoZXZlbnRzKSAtPlxuICAgIGZvciBrZXkgaW4gT2JqZWN0LmtleXMgZXZlbnRzXG4gICAgICB2YWx1ZSA9IGV2ZW50c1trZXldXG4gICAgICBoYW5kbGVyID0gaWYgdHlwZW9mIHZhbHVlIGlzICdmdW5jdGlvbicgdGhlbiB2YWx1ZSBlbHNlIEBbdmFsdWVdXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgXCJNZXRob2QgYCN7dmFsdWV9YCBkb2VzIG5vdCBleGlzdFwiIHVubGVzcyBoYW5kbGVyXG5cbiAgICAgIG1hdGNoID0gL14oXFxTKylcXHMqKC4qKSQvLmV4ZWMga2V5XG4gICAgICBAZGVsZWdhdGUgbWF0Y2hbMV0sIG1hdGNoWzJdLCBoYW5kbGVyXG5cbiAgICByZXR1cm5cblxuICAjIE92ZXJyaWRlIEJhY2tib25lcyBtZXRob2QgdG8gY29tYmluZSB0aGUgZXZlbnRzXG4gICMgb2YgdGhlIHBhcmVudCB2aWV3IGlmIGl0IGV4aXN0cy5cbiAgZGVsZWdhdGVFdmVudHM6IChldmVudHMsIGtlZXBPbGQpIC0+XG4gICAgQHVuZGVsZWdhdGVFdmVudHMoKSB1bmxlc3Mga2VlcE9sZFxuICAgIHJldHVybiBAX2RlbGVnYXRlRXZlbnRzIGV2ZW50cyBpZiBldmVudHNcbiAgICAjIENhbGwgX2RlbGVnYXRlRXZlbnRzIGZvciBhbGwgc3VwZXJjbGFzc2Vz4oCZIGBldmVudHNgLlxuICAgIGZvciBjbGFzc0V2ZW50cyBpbiB1dGlscy5nZXRBbGxQcm9wZXJ0eVZlcnNpb25zIHRoaXMsICdldmVudHMnXG4gICAgICBjbGFzc0V2ZW50cyA9IGNsYXNzRXZlbnRzLmNhbGwgdGhpcyBpZiB0eXBlb2YgY2xhc3NFdmVudHMgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgQF9kZWxlZ2F0ZUV2ZW50cyBjbGFzc0V2ZW50c1xuXG4gICAgcmV0dXJuXG5cbiAgIyBSZW1vdmUgYWxsIGhhbmRsZXJzIHJlZ2lzdGVyZWQgd2l0aCBAZGVsZWdhdGUuXG4gIHVuZGVsZWdhdGU6IChldmVudE5hbWUgPSAnJywgc2Vjb25kKSAtPlxuICAgIGlmIHR5cGVvZiBldmVudE5hbWUgaXNudCAnc3RyaW5nJ1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciAnVmlldyN1bmRlbGVnYXRlOiBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuXG4gICAgc3dpdGNoIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgIHdoZW4gMlxuICAgICAgICBzZWxlY3RvciA9IHNlY29uZCBpZiB0eXBlb2Ygc2Vjb25kIGlzICdzdHJpbmcnXG4gICAgICB3aGVuIDNcbiAgICAgICAgc2VsZWN0b3IgPSBzZWNvbmRcbiAgICAgICAgaWYgdHlwZW9mIHNlbGVjdG9yIGlzbnQgJ3N0cmluZydcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yICdWaWV3I3VuZGVsZWdhdGU6ICcgK1xuICAgICAgICAgICAgJ3NlY29uZCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuXG4gICAgaWYgJFxuICAgICAgZXZlbnRzID0gZXZlbnROYW1lXG4gICAgICAgIC5zcGxpdCAnICdcbiAgICAgICAgLm1hcCAobmFtZSkgPT4gXCIje25hbWV9LmRlbGVnYXRlRXZlbnRzI3tAY2lkfVwiXG4gICAgICAgIC5qb2luICcgJ1xuXG4gICAgICBAJGVsLm9mZiBldmVudHMsIHNlbGVjdG9yXG4gICAgZWxzZVxuICAgICAgaWYgZXZlbnROYW1lXG4gICAgICAgIHN1cGVyIGV2ZW50TmFtZSwgc2VsZWN0b3JcbiAgICAgIGVsc2VcbiAgICAgICAgQHVuZGVsZWdhdGVFdmVudHMoKVxuXG4gICMgSGFuZGxlIGRlY2xhcmF0aXZlIGV2ZW50IGJpbmRpbmdzIGZyb20gYGxpc3RlbmBcbiAgZGVsZWdhdGVMaXN0ZW5lcnM6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBAbGlzdGVuXG5cbiAgICAjIFdhbGsgYWxsIGBsaXN0ZW5gIGhhc2hlcyBpbiB0aGUgcHJvdG90eXBlIGNoYWluLlxuICAgIGZvciB2ZXJzaW9uIGluIHV0aWxzLmdldEFsbFByb3BlcnR5VmVyc2lvbnMgdGhpcywgJ2xpc3RlbidcbiAgICAgIHZlcnNpb24gPSB2ZXJzaW9uLmNhbGwgdGhpcyBpZiB0eXBlb2YgdmVyc2lvbiBpcyAnZnVuY3Rpb24nXG4gICAgICBmb3Iga2V5IGluIE9iamVjdC5rZXlzIHZlcnNpb25cbiAgICAgICAgIyBHZXQgdGhlIG1ldGhvZCwgZW5zdXJlIGl0IGlzIGEgZnVuY3Rpb24uXG4gICAgICAgIG1ldGhvZCA9IHZlcnNpb25ba2V5XVxuICAgICAgICBpZiB0eXBlb2YgbWV0aG9kIGlzbnQgJ2Z1bmN0aW9uJ1xuICAgICAgICAgIG1ldGhvZCA9IEBbbWV0aG9kXVxuICAgICAgICBpZiB0eXBlb2YgbWV0aG9kIGlzbnQgJ2Z1bmN0aW9uJ1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvciAnVmlldyNkZWxlZ2F0ZUxpc3RlbmVyczogJyArXG4gICAgICAgICAgICBcImxpc3RlbmVyIGZvciBgI3trZXl9YCBtdXN0IGJlIGZ1bmN0aW9uXCJcblxuICAgICAgICAjIFNwbGl0IGV2ZW50IG5hbWUgYW5kIHRhcmdldC5cbiAgICAgICAgW2V2ZW50TmFtZSwgdGFyZ2V0XSA9IGtleS5zcGxpdCAnICdcbiAgICAgICAgQGRlbGVnYXRlTGlzdGVuZXIgZXZlbnROYW1lLCB0YXJnZXQsIG1ldGhvZFxuXG4gICAgcmV0dXJuXG5cbiAgZGVsZWdhdGVMaXN0ZW5lcjogKGV2ZW50TmFtZSwgdGFyZ2V0LCBjYWxsYmFjaykgLT5cbiAgICBpZiB0YXJnZXQgaW4gWydtb2RlbCcsICdjb2xsZWN0aW9uJ11cbiAgICAgIHByb3AgPSBAW3RhcmdldF1cbiAgICAgIEBsaXN0ZW5UbyBwcm9wLCBldmVudE5hbWUsIGNhbGxiYWNrIGlmIHByb3BcbiAgICBlbHNlIGlmIHRhcmdldCBpcyAnbWVkaWF0b3InXG4gICAgICBAc3Vic2NyaWJlRXZlbnQgZXZlbnROYW1lLCBjYWxsYmFja1xuICAgIGVsc2UgaWYgbm90IHRhcmdldFxuICAgICAgQG9uIGV2ZW50TmFtZSwgY2FsbGJhY2ssIHRoaXNcblxuICAgIHJldHVyblxuXG4gICMgUmVnaW9uIG1hbmFnZW1lbnRcbiAgIyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gICMgRnVuY3Rpb25hbGx5IHJlZ2lzdGVyIGEgc2luZ2xlIHJlZ2lvbi5cbiAgcmVnaXN0ZXJSZWdpb246IChuYW1lLCBzZWxlY3RvcikgLT5cbiAgICBtZWRpYXRvci5leGVjdXRlICdyZWdpb246cmVnaXN0ZXInLCB0aGlzLCBuYW1lLCBzZWxlY3RvclxuXG4gICMgRnVuY3Rpb25hbGx5IHVucmVnaXN0ZXIgYSBzaW5nbGUgcmVnaW9uIGJ5IG5hbWUuXG4gIHVucmVnaXN0ZXJSZWdpb246IChuYW1lKSAtPlxuICAgIG1lZGlhdG9yLmV4ZWN1dGUgJ3JlZ2lvbjp1bnJlZ2lzdGVyJywgdGhpcywgbmFtZVxuXG4gICMgVW5yZWdpc3RlciBhbGwgcmVnaW9uczsgY2FsbGVkIHVwb24gdmlldyBkaXNwb3NhbC5cbiAgdW5yZWdpc3RlckFsbFJlZ2lvbnM6IC0+XG4gICAgbWVkaWF0b3IuZXhlY3V0ZSBuYW1lOiAncmVnaW9uOnVucmVnaXN0ZXInLCBzaWxlbnQ6IHRydWUsIHRoaXNcblxuICAjIFN1YnZpZXdzXG4gICMgLS0tLS0tLS1cblxuICAjIEdldHRpbmcgb3IgYWRkaW5nIGEgc3Vidmlldy5cbiAgc3VidmlldzogKG5hbWUsIHZpZXcpIC0+XG4gICAgIyBJbml0aWFsaXplIHN1YnZpZXdzIGNvbGxlY3Rpb25zIGlmIHRoZXkgZG9u4oCZdCBleGlzdCB5ZXQuXG4gICAgc3Vidmlld3MgPSBAc3Vidmlld3NcbiAgICBieU5hbWUgPSBAc3Vidmlld3NCeU5hbWVcblxuICAgIGlmIG5hbWUgYW5kIHZpZXdcbiAgICAgICMgQWRkIHRoZSBzdWJ2aWV3LCBlbnN1cmUgaXTigJlzIHVuaXF1ZS5cbiAgICAgIEByZW1vdmVTdWJ2aWV3IG5hbWVcbiAgICAgIHN1YnZpZXdzLnB1c2ggdmlld1xuICAgICAgYnlOYW1lW25hbWVdID0gdmlld1xuICAgICAgdmlld1xuICAgIGVsc2UgaWYgbmFtZVxuICAgICAgIyBHZXQgYW5kIHJldHVybiB0aGUgc3VidmlldyBieSB0aGUgZ2l2ZW4gbmFtZS5cbiAgICAgIGJ5TmFtZVtuYW1lXVxuXG4gICMgUmVtb3ZpbmcgYSBzdWJ2aWV3LlxuICByZW1vdmVTdWJ2aWV3OiAobmFtZU9yVmlldykgLT5cbiAgICByZXR1cm4gdW5sZXNzIG5hbWVPclZpZXdcbiAgICBzdWJ2aWV3cyA9IEBzdWJ2aWV3c1xuICAgIGJ5TmFtZSA9IEBzdWJ2aWV3c0J5TmFtZVxuXG4gICAgaWYgdHlwZW9mIG5hbWVPclZpZXcgaXMgJ3N0cmluZydcbiAgICAgICMgTmFtZSBnaXZlbiwgc2VhcmNoIGZvciBhIHN1YnZpZXcgYnkgbmFtZS5cbiAgICAgIG5hbWUgPSBuYW1lT3JWaWV3XG4gICAgICB2aWV3ID0gYnlOYW1lW25hbWVdXG4gICAgZWxzZVxuICAgICAgIyBWaWV3IGluc3RhbmNlIGdpdmVuLCBzZWFyY2ggZm9yIHRoZSBjb3JyZXNwb25kaW5nIG5hbWUuXG4gICAgICB2aWV3ID0gbmFtZU9yVmlld1xuICAgICAgT2JqZWN0LmtleXMoYnlOYW1lKS5zb21lIChrZXkpIC0+XG4gICAgICAgIG5hbWUgPSBrZXkgaWYgYnlOYW1lW2tleV0gaXMgdmlld1xuXG4gICAgIyBCcmVhayBpZiBubyB2aWV3IGFuZCBuYW1lIHdlcmUgZm91bmQuXG4gICAgcmV0dXJuIHVubGVzcyBuYW1lIGFuZCB2aWV3Py5kaXNwb3NlXG5cbiAgICAjIERpc3Bvc2UgdGhlIHZpZXcuXG4gICAgdmlldy5kaXNwb3NlKClcblxuICAgICMgUmVtb3ZlIHRoZSBzdWJ2aWV3IGZyb20gdGhlIGxpc3RzLlxuICAgIGluZGV4ID0gc3Vidmlld3MuaW5kZXhPZiB2aWV3XG4gICAgc3Vidmlld3Muc3BsaWNlIGluZGV4LCAxIGlmIGluZGV4IGlzbnQgLTFcbiAgICBkZWxldGUgYnlOYW1lW25hbWVdXG5cbiAgIyBSZW5kZXJpbmdcbiAgIyAtLS0tLS0tLS1cblxuICAjIEdldCB0aGUgbW9kZWwvY29sbGVjdGlvbiBkYXRhIGZvciB0aGUgdGVtcGxhdGluZyBmdW5jdGlvblxuICAjIFVzZXMgb3B0aW1pemVkIENoYXBsaW4gc2VyaWFsaXphdGlvbiBpZiBhdmFpbGFibGUuXG4gIGdldFRlbXBsYXRlRGF0YTogLT5cbiAgICBkYXRhID0gaWYgQG1vZGVsXG4gICAgICB1dGlscy5zZXJpYWxpemUgQG1vZGVsXG4gICAgZWxzZSBpZiBAY29sbGVjdGlvblxuICAgICAge2l0ZW1zOiB1dGlscy5zZXJpYWxpemUoQGNvbGxlY3Rpb24pLCBsZW5ndGg6IEBjb2xsZWN0aW9uLmxlbmd0aH1cbiAgICBlbHNlXG4gICAgICB7fVxuXG4gICAgc291cmNlID0gQG1vZGVsIG9yIEBjb2xsZWN0aW9uXG4gICAgaWYgc291cmNlXG4gICAgICAjIElmIHRoZSBtb2RlbC9jb2xsZWN0aW9uIGlzIGEgU3luY01hY2hpbmUsIGFkZCBhIGBzeW5jZWRgIGZsYWcsXG4gICAgICAjIGJ1dCBvbmx5IGlmIGl04oCZcyBub3QgcHJlc2VudCB5ZXQuXG4gICAgICBpZiB0eXBlb2Ygc291cmNlLmlzU3luY2VkIGlzICdmdW5jdGlvbicgYW5kIG5vdCAoJ3N5bmNlZCcgb2YgZGF0YSlcbiAgICAgICAgZGF0YS5zeW5jZWQgPSBzb3VyY2UuaXNTeW5jZWQoKVxuXG4gICAgZGF0YVxuXG4gICMgUmV0dXJucyB0aGUgY29tcGlsZWQgdGVtcGxhdGUgZnVuY3Rpb24uXG4gIGdldFRlbXBsYXRlRnVuY3Rpb246IC0+XG4gICAgIyBDaGFwbGluIGRvZXNu4oCZdCBkZWZpbmUgaG93IHlvdSBsb2FkIGFuZCBjb21waWxlIHRlbXBsYXRlcyBpbiBvcmRlciB0b1xuICAgICMgcmVuZGVyIHZpZXdzLiBUaGUgZXhhbXBsZSBhcHBsaWNhdGlvbiB1c2VzIEhhbmRsZWJhcnMgYW5kIFJlcXVpcmVKU1xuICAgICMgdG8gbG9hZCBhbmQgY29tcGlsZSB0ZW1wbGF0ZXMgb24gdGhlIGNsaWVudCBzaWRlLiBTZWUgdGhlIGRlcml2ZWRcbiAgICAjIFZpZXcgY2xhc3MgaW4gdGhlXG4gICAgIyBbZXhhbXBsZSBhcHBsaWNhdGlvbl0oaHR0cHM6Ly9naXRodWIuY29tL2NoYXBsaW5qcy9mYWNlYm9vay1leGFtcGxlKS5cbiAgICAjXG4gICAgIyBJZiB5b3UgcHJlY29tcGlsZSB0ZW1wbGF0ZXMgdG8gSmF2YVNjcmlwdCBmdW5jdGlvbnMgb24gdGhlIHNlcnZlcixcbiAgICAjIHlvdSBtaWdodCBqdXN0IHJldHVybiBhIHJlZmVyZW5jZSB0byB0aGF0IGZ1bmN0aW9uLlxuICAgICMgU2V2ZXJhbCBwcmVjb21waWxlcnMgY3JlYXRlIGEgZ2xvYmFsIGBKU1RgIGhhc2ggd2hpY2ggc3RvcmVzIHRoZVxuICAgICMgdGVtcGxhdGUgZnVuY3Rpb25zLiBZb3UgY2FuIGdldCB0aGUgZnVuY3Rpb24gYnkgdGhlIHRlbXBsYXRlIG5hbWU6XG4gICAgIyBKU1RbQHRlbXBsYXRlTmFtZV1cbiAgICB0aHJvdyBuZXcgRXJyb3IgJ1ZpZXcjZ2V0VGVtcGxhdGVGdW5jdGlvbiBtdXN0IGJlIG92ZXJyaWRkZW4nXG5cbiAgIyBNYWluIHJlbmRlciBmdW5jdGlvbi5cbiAgIyBUaGlzIG1ldGhvZCBpcyBib3VuZCB0byB0aGUgaW5zdGFuY2UgaW4gdGhlIGNvbnN0cnVjdG9yIChzZWUgYWJvdmUpXG4gIHJlbmRlcjogLT5cbiAgICAjIERvIG5vdCByZW5kZXIgaWYgdGhlIG9iamVjdCB3YXMgZGlzcG9zZWRcbiAgICAjIChyZW5kZXIgbWlnaHQgYmUgY2FsbGVkIGFzIGFuIGV2ZW50IGhhbmRsZXIgd2hpY2ggd2FzbuKAmXRcbiAgICAjIHJlbW92ZWQgY29ycmVjdGx5KS5cbiAgICByZXR1cm4gZmFsc2UgaWYgQGRpc3Bvc2VkXG5cbiAgICB0ZW1wbGF0ZUZ1bmMgPSBAZ2V0VGVtcGxhdGVGdW5jdGlvbigpXG5cbiAgICBpZiB0eXBlb2YgdGVtcGxhdGVGdW5jIGlzICdmdW5jdGlvbidcbiAgICAgICMgQ2FsbCB0aGUgdGVtcGxhdGUgZnVuY3Rpb24gcGFzc2luZyB0aGUgdGVtcGxhdGUgZGF0YS5cbiAgICAgIGh0bWwgPSB0ZW1wbGF0ZUZ1bmMgQGdldFRlbXBsYXRlRGF0YSgpXG5cbiAgICAgICMgUmVwbGFjZSBIVE1MXG4gICAgICBpZiBAbm9XcmFwXG4gICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCAnZGl2J1xuICAgICAgICBlbC5pbm5lckhUTUwgPSBodG1sXG5cbiAgICAgICAgaWYgZWwuY2hpbGRyZW4ubGVuZ3RoID4gMVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvciAnVGhlcmUgbXVzdCBiZSBhIHNpbmdsZSB0b3AtbGV2ZWwgZWxlbWVudCAnICtcbiAgICAgICAgICAgICd3aGVuIHVzaW5nIGBub1dyYXBgJ1xuXG4gICAgICAgICMgVW5kZWxlZ2F0ZSB0aGUgY29udGFpbmVyIGV2ZW50cyB0aGF0IHdlcmUgc2V0dXAuXG4gICAgICAgIEB1bmRlbGVnYXRlRXZlbnRzKClcbiAgICAgICAgIyBEZWxlZ2F0ZSBldmVudHMgdG8gdGhlIHRvcC1sZXZlbCBjb250YWluZXIgaW4gdGhlIHRlbXBsYXRlLlxuICAgICAgICBAc2V0RWxlbWVudCBlbC5maXJzdENoaWxkLCB0cnVlXG4gICAgICBlbHNlXG4gICAgICAgIHNldEhUTUwgdGhpcywgaHRtbFxuXG4gICAgIyBSZXR1cm4gdGhlIHZpZXcuXG4gICAgdGhpc1xuXG4gICMgVGhpcyBtZXRob2QgaXMgY2FsbGVkIGFmdGVyIGEgc3BlY2lmaWMgYHJlbmRlcmAgb2YgYSBkZXJpdmVkIGNsYXNzLlxuICBhdHRhY2g6IC0+XG4gICAgIyBBdHRlbXB0IHRvIGJpbmQgdGhpcyB2aWV3IHRvIGl0cyBuYW1lZCByZWdpb24uXG4gICAgbWVkaWF0b3IuZXhlY3V0ZSAncmVnaW9uOnNob3cnLCBAcmVnaW9uLCB0aGlzIGlmIEByZWdpb24/XG5cbiAgICAjIEF1dG9tYXRpY2FsbHkgYXBwZW5kIHRvIERPTSBpZiB0aGUgY29udGFpbmVyIGVsZW1lbnQgaXMgc2V0LlxuICAgIGlmIEBjb250YWluZXIgYW5kIG5vdCBkb2N1bWVudC5ib2R5LmNvbnRhaW5zIEBlbFxuICAgICAgYXR0YWNoIHRoaXNcbiAgICAgICMgVHJpZ2dlciBhbiBldmVudC5cbiAgICAgIEB0cmlnZ2VyICdhZGRlZFRvRE9NJ1xuXG4gICMgRGlzcG9zYWxcbiAgIyAtLS0tLS0tLVxuXG4gIGRpc3Bvc2VkOiBmYWxzZVxuXG4gIGRpc3Bvc2U6IC0+XG4gICAgcmV0dXJuIGlmIEBkaXNwb3NlZFxuXG4gICAgIyBVbnJlZ2lzdGVyIGFsbCByZWdpb25zLlxuICAgIEB1bnJlZ2lzdGVyQWxsUmVnaW9ucygpXG5cbiAgICAjIERpc3Bvc2Ugc3Vidmlld3MuXG4gICAgc3Vidmlldy5kaXNwb3NlKCkgZm9yIHN1YnZpZXcgaW4gQHN1YnZpZXdzXG5cbiAgICAjIFVuYmluZCBoYW5kbGVycyBvZiBnbG9iYWwgZXZlbnRzLlxuICAgIEB1bnN1YnNjcmliZUFsbEV2ZW50cygpXG5cbiAgICAjIFJlbW92ZSBhbGwgZXZlbnQgaGFuZGxlcnMgb24gdGhpcyBtb2R1bGUuXG4gICAgQG9mZigpXG5cbiAgICAjIENoZWNrIGlmIHZpZXcgc2hvdWxkIGJlIHJlbW92ZWQgZnJvbSBET00uXG4gICAgaWYgQGtlZXBFbGVtZW50XG4gICAgICAjIFVuc3Vic2NyaWJlIGZyb20gYWxsIERPTSBldmVudHMuXG4gICAgICBAdW5kZWxlZ2F0ZUV2ZW50cygpXG4gICAgICBAdW5kZWxlZ2F0ZSgpXG4gICAgICAjIFVuYmluZCBhbGwgcmVmZXJlbmNlZCBoYW5kbGVycy5cbiAgICAgIEBzdG9wTGlzdGVuaW5nKClcbiAgICBlbHNlXG4gICAgICAjIFJlbW92ZSB0aGUgdG9wbW9zdCBlbGVtZW50IGZyb20gRE9NLiBUaGlzIGFsc28gcmVtb3ZlcyBhbGwgZXZlbnRcbiAgICAgICMgaGFuZGxlcnMgZnJvbSB0aGUgZWxlbWVudCBhbmQgYWxsIGl0cyBjaGlsZHJlbi5cbiAgICAgIEByZW1vdmUoKVxuXG4gICAgIyBSZW1vdmUgZWxlbWVudCByZWZlcmVuY2VzLCBvcHRpb25zLFxuICAgICMgbW9kZWwvY29sbGVjdGlvbiByZWZlcmVuY2VzIGFuZCBzdWJ2aWV3IGxpc3RzLlxuICAgIGRlbGV0ZSB0aGlzW3Byb3BdIGZvciBwcm9wIGluIFtcbiAgICAgICdlbCcsICckZWwnLFxuICAgICAgJ29wdGlvbnMnLCAnbW9kZWwnLCAnY29sbGVjdGlvbicsXG4gICAgICAnc3Vidmlld3MnLCAnc3Vidmlld3NCeU5hbWUnLFxuICAgICAgJ19jYWxsYmFja3MnXG4gICAgXVxuXG4gICAgIyBGaW5pc2hlZC5cbiAgICBAZGlzcG9zZWQgPSB0cnVlXG5cbiAgICAjIFlvdeKAmXJlIGZyb3plbiB3aGVuIHlvdXIgaGVhcnTigJlzIG5vdCBvcGVuLlxuICAgIE9iamVjdC5mcmVlemUgdGhpc1xuIl19
return require(1);
}))