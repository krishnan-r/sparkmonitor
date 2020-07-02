var ar = require("../.")
var test = require("tap").test

test('parses 3 digit hex string', function(t) {
  t.plan(2)

  var hex = '#fff'

  var rgb256 = ar.str2RgbaArray(hex, true)
  var rgb1 = ar.str2RgbaArray(hex)

  t.deepEqual(rgb256, [255, 255, 255])
  t.deepEqual(rgb1, [1 , 1, 1])

  t.end()
})

test('parses 6 digit hex string', function(t) {
  t.plan(2)

  var hex = '#447adb'

  var rgb256 = ar.str2RgbaArray(hex, true)
  var rgb1 = ar.str2RgbaArray(hex)

  t.deepEqual(rgb256, [68, 122, 219], '6 digit hex into rgb 256 array')
  t.deepEqual(rgb1, [rgb256[0]/255, rgb256[1]/255, rgb256[2]/255], '6 digit hex into rgb 1-based array')

  t.end()

})


test('parses rgb string', function(t) {
  t.plan(2)

  var rgbstr = 'rgb(122,122,122)'

  var rgb256 = ar.str2RgbaArray(rgbstr, true)
  var rgb1 = ar.str2RgbaArray(rgbstr)


  t.deepEqual(rgb256, [122, 122, 122, 1])
  t.deepEqual(rgb1, [rgb256[0]/255, rgb256[1]/255, rgb256[2]/255, 1])

  t.end()
})


test('parses rgb string with alpha values', function(t) {
  t.plan(2)

  var rgbstr = 'rgba(122,122,122, 0.4)'

  var rgb256 = ar.str2RgbaArray(rgbstr, true)
  var rgb1 = ar.str2RgbaArray(rgbstr)


  t.deepEqual(rgb256, [122, 122, 122, 0.4])
  t.deepEqual(rgb1, [rgb256[0]/255, rgb256[1]/255, rgb256[2]/255, 0.4])

  t.end()

})


test('parses rgb string with rgb + alpha values', function(t) {
  t.plan(2)

  var rgbstr = 'rgb(122,122,122, 0.4)'

  var rgb256 = ar.str2RgbaArray(rgbstr, true)
  var rgb1 = ar.str2RgbaArray(rgbstr)


  t.deepEqual(rgb256, [122, 122, 122, 0.4])
  t.deepEqual(rgb1, [rgb256[0]/255, rgb256[1]/255, rgb256[2]/255, 0.4])

  t.end()

})
