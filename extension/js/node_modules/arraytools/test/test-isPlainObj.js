var ar = require("../.")
var test = require("tap").test


test('is object - object', function(t) {
  t.plan(1)
  var iobj = {}

  t.ok( ar.isPlainObject(iobj), 'object is a plain object' )

  t.end()
})


test('not object - array', function(t) {
  t.plan(1)
  var iobj = []

  t.notOk( ar.isPlainObject(iobj), 'array is not a plain object' )

  t.end()
})



test('not object - null', function(t) {
  t.plan(1)
  var iobj = null

  t.notOk( ar.isPlainObject(iobj), 'null is not a plain object' )

  t.end()
})
