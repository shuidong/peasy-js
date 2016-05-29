var ExecutionResult = require('./executionResult');
var ServiceException = require('./serviceException');
var RulesValidator = require('./rulesValidator');

var Command = (function() {

  "use strict";

  var Command = function(callbacks) {
    callbacks = callbacks || {};
    if (this instanceof Command) {

      if (!this.onInitialization) { // allow for inheritance (ES6)
        this.onInitialization = callbacks.onInitialization || function(context, done) {
          done();
        };
      }

      if (!this.getRules) { // allow for inheritance (ES6)
        this.getRules = callbacks.getRules || function(context, done) {
          done([]);
        };
      }

      if (!this.onValidationSuccess) { // allow for inheritance (ES6)
        this.onValidationSuccess = callbacks.onValidationSuccess || function(context, done) {
          done();
        };
      }

    } else {
      return new Command(
        callbacks.onInitialization,
        callbacks.getRules,
        callbacks.onValidationSuccess
      );
    }
  };

  Command.prototype = {

    constructor: Command,

    execute: function(done) {
      var self = this;
      var context = {};

      self.onInitialization(context, function() {

        self.getRules(context, function(rules) {

          if (!Array.isArray(rules)) {
            rules = [rules];
          }

          new RulesValidator(rules).validate(function() {

            var errors = rules.filter(function(rule) { return !rule.valid; })
                              .map(function(rule) { return rule.errors; });

            errors = [].concat.apply([], errors); // flatten array

            if (errors.length > 0)
              return done(null, new ExecutionResult(false, null, errors));

            try {
              self.onValidationSuccess(context, function(err, result) {
                done(err, new ExecutionResult(true, result, null));
              });
            }
            catch(ex) {
              if (ex instanceof ServiceException) {
                done(null, new ExecutionResult(false, null, [{ association: ex.association, error: ex.message }]));
              } else {
                done(ex);
              }
            }
          });
        });
      });
    }
  };

  Command.extend = function(options) {
    var options = options || {};
    var params = options.params || [];
    var functions = options.functions || {};

    var Extended = function() {
      var self = this;
      self.arguments = arguments;
      Command.call(self, options.functions);
      params.forEach(function(param, index) {
        self[param] = self.arguments[index];
      });
    }

    params.forEach(function(param) {
      Extended.prototype[param] = null;
    });

    return Extended;
  }

  return Command;

})();

module.exports = Command;
