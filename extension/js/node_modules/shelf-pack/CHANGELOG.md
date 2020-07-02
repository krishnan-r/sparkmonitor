:warning: = Breaking change

## 1.1.0
##### Jul 15, 2016
* Release as ES6 module alongside UMD build, add `jsnext:main` to `package.json`

## 1.0.0
##### Mar 29, 2016
* :warning: Rename `allocate()` -> `packOne()` for API consistency
* Add `autoResize` option (closes #7)
* Add `clear()` method
* Generate API docs (closes #9)
* Add `pack()` batch allocator
* Add benchmarks (closes #2)
* :warning: Return `null` instead of `{-1,-1}` on failed allocation (closes #1)
