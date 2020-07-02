var ar = require("../.")
var test = require("tap").test


test('matrix sum - regular array', function(t) {
  t.plan(1)

  var v = [[1, 1, 1], [1, 1, 1], [1, 1, 1]]
  var sum = ar.sum(v)
  t.equal(sum , 9)
})


test('matrix sum - Typed64Array array', function(t) {
  t.plan(2)

  var u = new Float64Array( 20 )

  t.equal(ar.sum(u), 0)

  for (var i = 0; i < u.length; i++)
    u[i] = 1

  t.equal(ar.sum(u) , 20)

})
