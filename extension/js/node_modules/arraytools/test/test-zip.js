var zip = require("../.").zip;
var test = require("tap").test;

test('zips single vector', function(t) {
    t.plan(1);

    var a = [1,2,3];

    var result = zip(a);

    t.deepEqual(result, [[1],[2],[3]]);

    t.end();
});


test('zips arbitrary number of vectors', function(t) {
    t.plan(1);

    var a = [1,2,3];
    var b = [3,2,1];
    var c = [1,2,3];
    var d = [3,2,1];


    var result = zip(a,b,c,d);

    t.deepEqual(result, [[1,3,1,3],[2,2,2,2],[3,1,3,1]]);

    t.end();
});
