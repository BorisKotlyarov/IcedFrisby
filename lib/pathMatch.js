'use strict';

var expect = require('chai').expect;
var _ = require('lodash');
var checkTypes = require('check-types');
var Joi = require('joi');

// setup Chai
var chai = require('chai');
chai.should(); // setup should assertions
chai.use(require('chai-things'));
chai.config.includeStack = false;
global.expect = chai.expect;

var pathMatch = {};

// performs a setup operation by checking the input data and merging the input data with a set of defaults
// returns the result of merging the default options and the input data
function setup(check) {
    if (!check) {
        throw new Error('Data to match is not defined');
    } else if (!check.jsonBody) {
        throw new Error('jsonBody is not defined');
    } else if (!check.jsonTest) {
        throw new Error('jsonTest is not defined');
    }

    // define the defaults
    var defaults = {
        isNot: false,
        path: undefined
        // jsonBody will be present
        // jsonTest will be present
    };

    // merge the passed in values with the defaults
    return _.merge(defaults, check);
}

// applies a path traversal by navigating through the jsonBody
// returns an object containing the last option specified in the path (*, ? or undefined) and
// the traversed json body
function applyPath(path, jsonBody, isNot) {
    // TODO input validation
    // * path cannot end in '.'
    // * path cannot be ''
    // * path cannot have more than one '*'/'?'
    // * path cannot start with ? or * and have more stuff after

    // states the last option in the path
    var lastOption = undefined;

    // split up the path by '.'
    var pathSegments = path.split('.');
    // temporarially store the last option
    var tmpLast = pathSegments[pathSegments.length - 1];
    // if the last option is not a '*' or '?', set it to unefined as the developer didn't specify one
    if ('*' === tmpLast || '?' === tmpLast) {
        lastOption = tmpLast;
    }

    try {
        // break apart the path and iterate through the keys to traverse through the JSON object
        _.forEach(pathSegments, function(segment) {
            // if the next 'segment' isn't actually a special character, traverse through the object
            if('*' !== segment && '?' !== segment) {
                jsonBody = jsonBody[segment];
            }
        });
    } catch(e) {
        if(!isNot) {
            throw e;
        } else {
            console.warn("[IcedFrisby] You attempted to traverse through an object with a path ('" + path + "') that did not exist in the object. \
            This issue was suppressed because you specified the isNot option. This behavior is usually considered an anti-pattern. Use a schema check instead.");
        }
    }

    return {
        lastOption: lastOption,
        jsonBody: jsonBody
    };
}

// performs a complete JSON match
pathMatch.matchJSON = function(check) {
    // setup the data (validate check object, apply defaults)
    check = setup(check);

    // states the last option specified in the path (undefined, '*', or '?')
    var lastOption = undefined;

    // traverse through a deep object if needed
    if(check.path) {
        var results = applyPath(check.path, check.jsonBody, check.isNot);
        lastOption = results.lastOption;
        check.jsonBody = results.jsonBody;
    }

    // EACH item in array should match
    if('*' === lastOption) {
        // assert that jsonBody is an array
        checkTypes.assert.array(check.jsonBody);

        _.forEach(check.jsonBody, function(json) {
            if (check.isNot) {
                expect(json).to.not.deep.equal(check.jsonTest);
            } else {
                expect(json).to.deep.equal(check.jsonTest);
            }
        });

    // ONE item in array should match
    } else if('?' === lastOption) {
        // assert that jsonBody is an array
        checkTypes.assert.array(check.jsonBody);

        var itemCount = check.jsonBody.length;

        // check if there are any objects to match against. Don't do this for the .not case - having 0 elements would be valid.
        if (0 === itemCount && !check.isNot) {
            throw new Error('There are no JSON objects to match against');
        }

        if (check.isNot) {
            check.jsonBody.should.not.include.something.that.deep.equals(check.jsonTest);
        } else {
            check.jsonBody.should.include.something.that.deep.equals(check.jsonTest);
        }

    // Normal matcher, entire object/array should match
    } else {
        if (check.isNot) {
            expect(check.jsonBody).to.not.deep.equal(check.jsonTest);
        } else {
            expect(check.jsonBody).to.deep.equal(check.jsonTest);
        }
    }
}

// performs a complete JSON type match with Joi
pathMatch.matchJSONTypes = function(check) {
    // setup the data (validate check object, apply defaults)
    check = setup(check);

    // states the last option specified in the path (undefined, '*', or '?')
    var lastOption = undefined;

    // traverse through a deep object if needed
    if(check.path) {
        var results = applyPath(check.path, check.jsonBody, check.isNot);
        lastOption = results.lastOption;
        check.jsonBody = results.jsonBody;
    }

    // EACH item in array should match
    if('*' === lastOption) {
        checkTypes.assert.array(check.jsonBody, "Expected an Array in the path '" + check.path + "' but got " + typeof(check.jsonBody));

        var errorCount = 0;
        _.forEach(check.jsonBody, function(json) {
            // expect(json).toContainJsonTypes(jsonTest, self.current.isNot);
            Joi.validate(json, check.jsonTest, function(err, value) {
                if (err) {
                    if (check.isNot) {
                        // there is an error but isNot case is true. Increment counter.
                        errorCount++;
                    } else {
                        throw err;
                    }
                }
            });
        });

        // if this is the isNot case, ALL the validations should have failed for the '*' case
        if (check.isNot) {
            var delta = check.jsonBody.length - errorCount;
            // if the error count is not the same as the number of elements, something validated successfully - which is a problem
            if (0 !== delta) {
                throw new Error('Expected all objects to be invalid but ' + delta + '/' + check.jsonBody.length + ' objects validated successfully');
            }
        }


    // ONE item in array should match
    } else if('?' === lastOption) {
        checkTypes.assert.array(check.jsonBody, "Expected an Array in the path '" + check.path + "' but got " + typeof(check.jsonBody));

        var itemCount = check.jsonBody.length;
        var errorCount = 0;

        // check if there are any objects to match against. Don't do this for the .not case - having 0 elements would be valid.
        if (0 === itemCount && !check.isNot) {
            throw new Error("There are no JSON objects to match against");
        }

        for(var i = 0; i < itemCount; i++) {
            Joi.validate(check.jsonBody[i], check.jsonTest, function(err, value) {
                if (err) {
                    // didn't match this object, increment number of errors
                    errorCount++;
                }
            });
        }

        // If all errors, test fails
        if(itemCount === errorCount && !check.isNot) {
            var objPlural = itemCount > 1 ? "objects" : "object";
            throw new Error("Expected one out of " + itemCount + " " + objPlural + " to match provided JSON types");
        }
    // Normal matcher, entire object/array should match
    } else {
        Joi.validate(check.jsonBody, check.jsonTest, function(err, value) {
            if (err && !check.isNot) {
                throw err;
            }
        });
    }
}

module.exports = pathMatch;
