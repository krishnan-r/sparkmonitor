/**
 * unassertify
 *   Browserify transform to encourage reliable programming by writing assertions in production code, and compiling them away from release
 * 
 * https://github.com/unassert-js/unassertify
 *
 * Copyright (c) 2015-2016 Takuto Wada
 * Licensed under the MIT license.
 *   https://github.com/unassert-js/unassertify/blob/master/LICENSE
 */
'use strict';

var path = require('path');
var through = require('through');
var acorn = require('acorn');
var escodegen = require('escodegen');
var convert = require('convert-source-map');
var transfer = require('multi-stage-sourcemap').transfer;
var unassert = require('unassert');

function mergeSourceMap (incomingSourceMap, outgoingSourceMap) {
    if (typeof outgoingSourceMap === 'string' || outgoingSourceMap instanceof String) {
        outgoingSourceMap = JSON.parse(outgoingSourceMap);
    }
    if (!incomingSourceMap) {
        return outgoingSourceMap;
    }
    return JSON.parse(transfer({fromSourceMap: outgoingSourceMap, toSourceMap: incomingSourceMap}));
}

function overwritePropertyIfExists (name, from, to) {
    if (from.hasOwnProperty(name)) {
        to.setProperty(name, from[name]);
    }
}

function reconnectSourceMap (inMap, outMap) {
    var mergedRawMap = mergeSourceMap(inMap, outMap.toObject());
    var reMap = convert.fromObject(mergedRawMap);
    overwritePropertyIfExists('sources', inMap, reMap);
    overwritePropertyIfExists('sourceRoot', inMap, reMap);
    overwritePropertyIfExists('sourcesContent', inMap, reMap);
    return reMap;
}

function handleIncomingSourceMap (originalCode) {
    var commented = convert.fromSource(originalCode);
    if (commented) {
        return commented.toObject();
    }
    return null;
}

function applyUnassertWithSourceMap (code, filepath) {
    var ast = acorn.parse(code, { sourceType: 'module', locations: true });
    var inMap = handleIncomingSourceMap(code);
    var instrumented = escodegen.generate(unassert(ast), {
        sourceMap: filepath,
        sourceContent: code,
        sourceMapWithCode: true
    });
    var outMap = convert.fromJSON(instrumented.map.toString());
    if (inMap) {
        var reMap = reconnectSourceMap(inMap, outMap);
        return instrumented.code + '\n' + reMap.toComment() + '\n';
    } else {
        return instrumented.code + '\n' + outMap.toComment() + '\n';
    }
}

function applyUnassertWithoutSourceMap (code) {
    var ast = acorn.parse(code, { sourceType: 'module' });
    return escodegen.generate(unassert(ast));
}

function shouldProduceSourceMap (options) {
    return (options && options._flags && options._flags.debug);
}

module.exports = function unassertify (filepath, options) {
    if (path.extname(filepath) === '.json') {
        return through();
    }

    var data = '',
        stream = through(write, end);

    function write(buf) {
        data += buf;
    }

    function end() {
        if (shouldProduceSourceMap(options)) {
            stream.queue(applyUnassertWithSourceMap(data, filepath));
        } else {
            stream.queue(applyUnassertWithoutSourceMap(data));
        }        
        stream.queue(null);
    }

    return stream;
};
