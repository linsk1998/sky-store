define("sky-store", ["require", "exports"], function (require, exports) {
    "use strict";
    exports.__esModule = true;
    var OPTIONS = Symbol("store");
    function watch(store, key, callback) {
        store[OPTIONS].watchers.push([key, callback]);
    }
    exports.watch = watch;
    //TODO:unwatch
    var actionStack = [];
    function actionStart() {
        actionStack.push(new Set());
    }
    function actionEnd() {
        var actions = actionStack.pop();
        actions.forEach(callAll);
    }
    function callAll(fn) {
        try {
            fn();
        }
        catch (e) {
            console.error(e);
        }
    }
    var depsStack = [];
    function getObservableValue(store, key) {
        collectDeps(store, key);
        var options = store[OPTIONS];
        var value = options.target[key];
        if (isRendering && (typeof value === "string") && !value[OPTIONS]) {
            return new Binding(key, value, options.path);
        }
        return value;
    }
    function arraySame3(newComputed) {
        if (newComputed[0] === this[0] && newComputed[1] === this[1] && newComputed[2] === this[2]) {
            return true;
        }
        return false;
    }
    function collectDeps(store, key) {
        var options = store[OPTIONS];
        if (depsStack.length) {
            var curDep = depsStack[depsStack.length - 1];
            if (curDep.computed) {
                var depStore = curDep.computed.store;
                var depKey = curDep.computed.property;
                var curDepOptions = depStore[OPTIONS];
                var newComputedFrom = [depKey, store, key];
                if (!curDepOptions.computedFrom.some(arraySame3, newComputedFrom)) {
                    curDepOptions.computedFrom.push(newComputedFrom);
                }
                var newComputedTo = [key, depStore, depKey];
                if (!options.computedTo.some(arraySame3, newComputedTo)) {
                    options.computedTo.push(newComputedTo);
                }
            }
            else if (curDep.reaction) {
                //TODO:reaction
            }
            else {
                //TODO:autorun
            }
        }
    }
    function setObservableValue(store, key, value) {
        var options = store[OPTIONS];
        options.target[key] = value;
        options.computedTo.forEach(triggerEachComputed);
        if (actionStack.length) {
            var lastSet = actionStack[actionStack.length - 1];
            options.watchers.filter(watchersFilter, arguments).forEach(addToAction, lastSet);
        }
        else {
            options.watchers.filter(watchersFilter, arguments).forEach(callAllWatchers);
        }
    }
    function watchersFilter(watcher) {
        if (watcher[0] == this[1]) {
            return true;
        }
        return false;
    }
    function addToAction(watcher) {
        this.add(watcher[1]);
    }
    function callAllWatchers(watcher) {
        try {
            watcher[1]();
        }
        catch (e) {
            console.log(e);
        }
    }
    function triggerEachComputed(options) {
        var store = options[1];
        var key = options[2];
        delete store[OPTIONS].target[key];
    }
    function getComputedValue(store, property, getter) {
        var options = store[OPTIONS];
        if (!Object.prototype.hasOwnProperty.call(options.target, property)) {
            depsStack.push({ computed: { store: store, property: property } });
            try {
                options.target[property] = getter.call(store);
            }
            catch (e) {
                console.error(e);
            }
            depsStack.pop();
        }
        collectDeps(store, property);
        var value = options.target[property];
        if (isRendering && (typeof value === "string") && !value[OPTIONS]) {
            return new Binding(property, value, options.path);
        }
        return value;
    }
    function setComputedValue(store, property, value, setter) {
        try {
            actionStart();
            setter.call(store, value);
        }
        catch (e) {
            console.error(e);
        }
        finally {
            actionEnd();
        }
    }
    var KEY_OBSERVABLE = Symbol("observable");
    var KEY_COMPUTED = Symbol("computed");
    var KEY_ACTION = Symbol("action");
    function dirct(prototype, prop) {
        prototype[prop] = void 0;
    }
    exports.dirct = dirct;
    function observable(prototype, prop) {
        var obs = prototype.constructor[KEY_OBSERVABLE];
        if (!obs) {
            obs = prototype.constructor[KEY_OBSERVABLE] = new Array();
        }
        obs.push(prop);
        Reflect.defineProperty(prototype, prop, {
            get: function () {
                return getObservableValue(this, prop);
            },
            set: function (value) {
                setObservableValue(this, prop, value);
            },
            enumerable: true
        });
    }
    exports.observable = observable;
    ;
    function computed(prototype, prop, descriptor) {
        if (descriptor) {
            computed.accessor.apply(this, arguments);
        }
        else {
            computed.method.apply(this, arguments);
        }
    }
    exports.computed = computed;
    ;
    computed.method = function (prototype, prop, undefined) {
        var computeds = prototype.constructor[KEY_COMPUTED];
        if (!computeds) {
            computeds = prototype.constructor[KEY_COMPUTED] = new Array();
        }
        computeds.push(prop);
        var method = prototype[prop];
        prototype[prop] = function () {
            return getComputedValue(this, prop, method);
        };
    };
    computed.accessor = function (prototype, prop, descriptor) {
        var computeds = prototype.constructor[KEY_COMPUTED];
        if (!computeds) {
            computeds = prototype.constructor[KEY_COMPUTED] = new Array();
        }
        computeds.push(prop);
        var getter = descriptor.get;
        if (getter) {
            descriptor.get = function () {
                return getComputedValue(this, prop, getter);
            };
        }
        var setter = descriptor.set;
        if (setter) {
            descriptor.set = function (value) {
                setComputedValue(this, prop, value, setter);
            };
        }
    };
    function action(prototype, prop, undefined) {
        var actions = prototype.constructor[KEY_ACTION];
        if (!actions) {
            actions = prototype.constructor[KEY_ACTION] = new Array();
        }
        actions.push(prop);
        var method = prototype[prop];
        prototype[prop] = function () {
            try {
                actionStart();
                var r = method.apply(this, arguments);
            }
            catch (e) {
                console.error(e);
            }
            finally {
                actionEnd();
            }
            return r;
        };
    }
    exports.action = action;
    ;
    function store(Store) {
        function Class() {
            var me = Object.create(Store.prototype);
            me[OPTIONS] = {
                watchers: [],
                target: {},
                computedFrom: [],
                computedTo: []
            };
            Store.call(me);
            return me;
        }
        return Class;
    }
    exports.store = store;
    var isRendering = false;
    function startRender() {
        isRendering = true;
    }
    exports.startRender = startRender;
    function endRender() {
        isRendering = false;
    }
    exports.endRender = endRender;
    var Binding = /** @class */ (function () {
        function Binding(name, value, path) {
            this.name = name;
            this.value = value;
            this.path = path ? name : path + "." + name;
        }
        Binding.prototype.valueOf = function () {
            return this.value;
        };
        return Binding;
    }());
    exports.Binding = Binding;
});
