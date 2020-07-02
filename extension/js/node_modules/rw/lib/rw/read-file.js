var fs = require("fs"),
    decode = require("./decode");

module.exports = function(filename, options, callback) {
  if (arguments.length < 2) callback = options, options = null;
  fs.stat(filename, function(error, stat) {
    if (error) return callback(error);
    if (stat.isFile()) {
      fs.readFile(filename, options, callback);
    } else {
      var decoder = decode(options);
      fs.createReadStream(filename, options && {flags: options.flag || "r"}) // N.B. flag / flags
          .on("error", callback)
          .on("data", function(d) { decoder.push(d); })
          .on("end", function() { callback(null, decoder.value()); });
    }
  });
};
