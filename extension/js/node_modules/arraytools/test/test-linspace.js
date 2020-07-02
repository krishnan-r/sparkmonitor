var ar = require("../.")
var test = require("tap").test


test('linspace dimensions', function(t) {
  t.plan(1)

  var line = ar.linspace(0,10,11)
  t.equal( line.length , 11)

})


test('linspace values', function(t) {
  t.plan(1)
  var bool = true
  var line = ar.linspace(0,10,11)
  for (var i = 0; i < line.length; i++)
    bool = bool & (line[i] === i)

  t.ok( bool )
})
