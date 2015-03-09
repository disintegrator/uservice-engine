var EventEmitter = require('events').EventEmitter;
var es = require('event-stream');
var has = Object.prototype.hasOwnProperty;

var Engine = module.exports = function() {
    EventEmitter.call(this);
    this.transports = {};
    this.services = {};
};

Engine.prototype = Object.create(EventEmitter.prototype);
Engine.prototype.constructor = Engine;

var proto = Engine.prototype;

proto.register = function(service) {
    var name = service.name;
    if (has.call(this.services, name)) {
        throw new Error('Service \'' + name + '\' already registered.');
    }
    this.services[name] = service;
    return this;
};

proto.connect = function(transport) {
    this.transports[transport.name] = transport;
    return this;
};

proto.handleMessage = function(message, done) {
    var self = this;
    var iter = function(name, cb) { self.services[name].execute(message, cb); };
    async.map(Object.keys(this.services), iter, function(err, res) {
        done(err, res);
    });
};

proto.start = function(transport) {
    var self = this;
    async.each(Object.keys(this.transports), function(name, cb) {
        var transport = self.transports[name];
        transport.stream
            .pipe(es.map(self.handleMessage.bind(self)))
            .pipe(transport.stream);
    }, function(err) {
        if (err) { throw err; }
        self.started = true;
        self.emit('started', self);
    });
    return this;
};

