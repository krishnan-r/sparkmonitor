var ar = require("../.")
var test = require("tap").test

test('copies irregular 2D array', function(t) {
  t.plan(1)

  var array = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7]
  ];


  var copiedArray = ar.copy2D(array);

  t.deepEqual(array, copiedArray)

  t.end()
})
