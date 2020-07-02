var test = require('tap').test,
    UnitBezier = require('../');

test('unit bezier', function(t) {
    var u = new UnitBezier(0, 0, 1, 1);
    t.equal(u.sampleCurveY(1), 1, 'sampleCurveY');
    t.equal(u.sampleCurveX(1), 1, 'sampleCurveX');
    t.end();
});
