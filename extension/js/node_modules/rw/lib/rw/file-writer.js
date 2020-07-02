var fs = require("fs");

var writer = require("./writer");

module.exports = function(filePath) {
  return writer(
    function open(callback) {
      fs.open(filePath, "w", 438 /*=0666*/, callback);
    },
    write,
    close
  );
};

// if (error_ && error_.code === "EPIPE") error_ = null; // TODO ignore broken pipe and ignore subsequent writes
function write(channel, buffer, offset, length, callback) {
  fs.write(channel, buffer, offset, length, null, function(error, writeLength) {
    if (error) return void callback(error);
    if (writeLength < length) return void write(channel, buffer, offset + writeLength, length - writeLength, callback);
    callback(null);
  });
}

function close(descriptor, callback) {
  fs.close(descriptor, callback);
}
