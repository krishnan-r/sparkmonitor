var rewind = require('../'),
    fs = require('fs'),
    test = require('tap').test;

function f(_) {
    return JSON.parse(fs.readFileSync(_, 'utf8'));
}

test('rewind', function(t) {
    t.deepEqual(rewind(f('./test/rev.input.geojson')), f('./test/rev.output.geojson'), 'flips rings');
    t.deepEqual(rewind(f('./test/featuregood.input.geojson')), f('./test/featuregood.output.geojson'), 'does not muck up props');
    t.deepEqual(rewind(f('./test/flip.input.geojson'), true), f('./test/flip.output.geojson'), 'does not muck up props');
    t.end();
});
