var fs = require("fs");

var reader = require("./reader");

module.exports = function(filePath) {
  return reader(
    function open(callback) {
      fs.open(filePath, "r", 438 /*=0666*/, callback);
    },
    read,
    close
  );
};

function read(descriptor, buffer, offset, length, callback) {
  fs.read(descriptor, buffer, offset, length, null, callback);
}

function close(descriptor, callback) {
  fs.close(descriptor, callback);
}
