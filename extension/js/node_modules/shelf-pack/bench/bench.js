'use strict';

var Benchmark = require('benchmark');
var ShelfPack = require('../.');
var BinPack = require('bin-pack');

var N = 10000;
var dim = 10000;
var sizes = [12, 16, 20, 24];

function randSize() {
    return sizes[Math.floor(Math.random() * sizes.length)];
}

// generate data
var fixedBoth = [],
    randWidth = [],
    randHeight = [],
    randBoth = [],
    w, h;

for (var i = 0; i < N; i++) {
    w = randSize();
    h = randSize();
    fixedBoth.push({ width: 12, height: 12 });
    randWidth.push({ width: w, height: 12 });
    randHeight.push({ width: 12, height: h });
    randBoth.push({ width: w, height: h });
}


var suite = new Benchmark.Suite();

suite
    .add('ShelfPack batch allocate fixed size bins', function() {
        new ShelfPack(dim, dim).pack(fixedBoth);
    })
    .add('ShelfPack batch allocate random width bins', function() {
        new ShelfPack(dim, dim).pack(randWidth);
    })
    .add('ShelfPack batch allocate random height bins', function() {
        new ShelfPack(dim, dim).pack(randHeight);
    })
    .add('ShelfPack batch allocate random height and width bins', function() {
        new ShelfPack(dim, dim).pack(randBoth);
    })
    .add('ShelfPack single allocate fixed size bins', function() {
        var pack = new ShelfPack(dim, dim);
        var ok = true;
        for (var j = 0; j < N; j++) {
            ok = pack.packOne(fixedBoth[j].width, fixedBoth[j].height);
            if (!ok) throw new Error('out of space');
        }
    })
    .add('ShelfPack single allocate random width bins', function() {
        var pack = new ShelfPack(dim, dim);
        var ok = true;
        for (var j = 0; j < N; j++) {
            ok = pack.packOne(randWidth[j].width, randWidth[j].height);
            if (!ok) throw new Error('out of space');
        }
    })
    .add('ShelfPack single allocate random height bins', function() {
        var pack = new ShelfPack(dim, dim);
        var ok = true;
        for (var j = 0; j < N; j++) {
            ok = pack.packOne(randHeight[j].width, randHeight[j].height);
            if (!ok) throw new Error('out of space');
        }
    })
    .add('ShelfPack single allocate random height and width bins', function() {
        var pack = new ShelfPack(dim, dim);
        var ok = true;
        for (var j = 0; j < N; j++) {
            ok = pack.packOne(randBoth[j].width, randBoth[j].height);
            if (!ok) throw new Error('out of space');
        }
    })
    .add('BinPack batch allocate fixed size bins', function() {
        BinPack(fixedBoth);
    })
    .add('BinPack batch allocate random width bins', function() {
        BinPack(randWidth);
    })
    .add('BinPack batch allocate random height bins', function() {
        BinPack(randHeight);
    })
    .add('BinPack batch allocate random height and width bins', function() {
        BinPack(randBoth);
    })
    .on('cycle', function(event) {
        /* eslint-disable no-console */
        if (event.target.error) {
            console.log(event.target.name + ':  ERROR ' + event.target.error);
        } else {
            console.log(String(event.target));
        }
        /* eslint-enable no-console */
    })
    .run();
