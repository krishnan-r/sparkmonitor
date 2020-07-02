exports.reader = require("./lib/rw/reader");
exports.writer = require("./lib/rw/writer");

exports.fileReader = require("./lib/rw/file-reader");
exports.fileWriter = require("./lib/rw/file-writer");

exports.readFile = require("./lib/rw/read-file");
exports.readFileSync = require("./lib/rw/read-file-sync");
exports.writeFile = require("./lib/rw/write-file");
exports.writeFileSync = require("./lib/rw/write-file-sync");

exports.lineParser = require("./lib/rw/line-parser");
exports.dsvParser = require("./lib/rw/dsv-parser");

exports.pipe = require("./lib/rw/pipe");
