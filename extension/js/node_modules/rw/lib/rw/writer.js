module.exports = function(open, write, close) {
  var writer = {
        encoding: writer_encoding,
        bufferLength: writer_bufferLength,
        drain: writer_drain,
        write: writer_write,
        end: writer_end,
        ended: false
      },
      error = null,
      drainCallback = null,
      channel = CHANNEL_OPEN,
      encoding = "utf8",
      bufferUsed = 0,
      bufferLength = 1 << 16,
      bufferOverflowLength = bufferLength << 1,
      buffer = new Buffer(bufferOverflowLength);

  function writer_encoding(newEncoding) {
    if (!arguments.length) return encoding;
    if (!Buffer.isEncoding(newEncoding = newEncoding + "")) throw new Error("unknown encoding: " + newEncoding);
    encoding = newEncoding;
    return writer;
  }

  function writer_bufferLength(newBufferLength) {
    if (!arguments.length) return bufferLength;
    if (bufferUsed) throw new Error("cannot change buffer length while the buffer is not empty");
    if ((newBufferLength |= 0) <= 0) throw new Error("length <= 0: " + newBufferLength);
    bufferLength = newBufferLength;
    bufferOverflowLength = bufferLength << 1;
    buffer = new Buffer(bufferOverflowLength);
    return writer;
  }

  function writer_open() {
    open(function(newError, newChannel) {
      if (error = newError) {
        var callback = drainCallback;
        drainCallback = null;
        return void callback(error);
      }
      channel = newChannel;
      drain(drainCallback);
    });
  }

  function writer_drain(callback) {
    if (error) return void process.nextTick(callback.bind(null, error));
    if (drainCallback) throw new Error("cannot drain while a drain is already in progress");
    if (writer.ended) throw new Error("cannot drain after ended");
    drain(callback);
  }

  function drain(callback) {
    if (!callback) throw new Error("missing callback");
    if (channel === CHANNEL_OPEN) return drainCallback = callback, void writer_open();

    // A drain is now in-progress.
    drainCallback = callback;

    // If there’s nothing to drain, emulate draining zero bytes.
    if (!bufferUsed) return void process.nextTick(afterDrain.bind(null, null));

    // Drain the buffer.
    write(channel, buffer, 0, bufferUsed, afterDrain);
  }

  function afterDrain(newError) {
    var oldDrainCallback = drainCallback;
    drainCallback = null;

    // If an error occurs, close, ignoring any secondary errors.
    if (error = newError) return void close(channel, oldDrainCallback.bind(null, error));

    // Otherwise mark the written bytes as drained.
    bufferUsed = 0;
    oldDrainCallback(null);
  }

  function writer_write(data) {
    if (error) throw error;
    if (drainCallback) throw new Error("cannot write while a drain is in progress");
    if (writer.ended) throw new Error("cannot write after ended");
    if (!(data instanceof Buffer)) data = new Buffer(data + "", encoding);
    var oldBufferUsed = bufferUsed;
    bufferUsed += data.length;

    // If the buffer would overflow with this new data, double its size.
    if (bufferUsed > bufferOverflowLength) {
      do bufferOverflowLength <<= 1; while (bufferUsed > bufferOverflowLength);
      var oldBuffer = buffer;
      buffer = new Buffer(bufferOverflowLength);
      oldBuffer.copy(buffer, 0, 0, oldBufferUsed);
    }

    // Combining multiple buffers into a single buffer is much faster than
    // myriad tiny writes. In addition, this copies the data to be written,
    // isolating it from any external changes (such as the reader refilling).
    data.copy(buffer, oldBufferUsed);

    return bufferUsed < bufferLength;
  }

  function writer_end(callback) {
    if (error) throw error;
    if (drainCallback) throw new Error("cannot end while a drain is in progress");
    if (writer.ended) throw new Error("cannot end after already ended");
    if (!callback) callback = rethrow;
    writer.ended = true;

    // Drain any buffered bytes, then close the channel.
    drain(function(error) {
      if (error) return void callback(error);
      close(channel, callback);
    });
  }

  return writer;
};

function rethrow(error) {
  if (error) throw error;
}

var CHANNEL_OPEN = {};
