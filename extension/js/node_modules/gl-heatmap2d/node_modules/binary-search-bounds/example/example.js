var bounds = require('../search-bounds')

//Create an array
var array = [1, 2, 3, 3, 3, 5, 6, 10, 11, 13, 50, 1000, 2200]

//Print all elements in array contained in the interval [3, 50)
console.log(
  array.slice(
    bounds.ge(array, 3),
    bounds.lt(array, 50)))

//Test if array contains the element 4
console.log('indexOf(6)=', bounds.eq(array, 6))
console.log('indexOf(4)=', bounds.eq(array, 4))

//Find the element immediately after 13
console.log('successor of 13 = ', array[bounds.gt(array, 13)])

//Find the element in the array before 4
console.log('predecessor of 4 = ', array[bounds.lt(array, 4)])
