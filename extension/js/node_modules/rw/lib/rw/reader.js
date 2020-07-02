module.exports = function(open, read, close) {
  var reader = {
        bufferLength: reader_bufferLength,
        fill: reader_fill,
        read: reader_read,
        end: reader_end,
        ended: false
      },
      error = null,
      fillCallback = null,
      channel = CHANNEL_OPEN,
      bufferOffset = 0,
      bufferLength = 1 << 16,
      bufferAvailable = 0,
      buffer = new Buffer(bufferLength);

  function reader_bufferLength(newBufferLength) {
    if (!arguments.length) return bufferLength;
    if (bufferAvailable) throw new Error("cannot change buffer length while the buffer is not empty");
    if (fillCallback) throw new Error("cannot change buffer length while the buffer is filling");
    if ((newBufferLength |= 0) <= 0) throw new Error("length <= 0: " + newBufferLength);
    buffer = new Buffer(bufferLength = newBufferLength);
    return reader;
  }

  function reader_open() {
    open(function(newError, newChannel) {
      if (error = newError) {
        var callback = fillCallback;
        fillCallback = null;
        return void callback(error);
      }
      channel = newChannel;
      fill(fillCallback);
    });
  }

  function reader_fill(callback) {
    if (error) return void process.nextTick(callback.bind(null, error));
    if (fillCallback) throw new Error("cannot fill while a fill is already in progress");
    if (reader.ended) throw new Error("cannot fill after ended");
    fill(callback);
  }

  function fill(callback) {
    if (!callback) throw new Error("missing callback");
    if (channel === CHANNEL_OPEN) return fillCallback = callback, void reader_open();

    // A fill is now in-progress.
    fillCallback = callback;

    // If there’s no space to read more, emulate reading zero bytes.
    if (bufferAvailable >= bufferLength) return void process.nextTick(afterFill.bind(null, null, 0));

    // Move any unread bytes to the front of the buffer before filling.
    if (bufferOffset) {
      if (bufferAvailable) buffer.copy(buffer, 0, bufferOffset, bufferOffset + bufferAvailable);
      bufferOffset = 0;
    }

    // Fill the buffer. If no bytes are read, the channel has ended.
    read(channel, buffer, bufferAvailable, bufferLength - bufferAvailable, afterFill);
  }

  function afterFill(newError, readLength) {
    var oldFillCallback = fillCallback;
    fillCallback = null;

    // If an error occurs, close, ignoring any secondary errors.
    if (error = newError) return void close(channel, oldFillCallback.bind(null, error));

    // If no more bytes were available, then we’ve reached the end, so close.
    if (!readLength) return reader.ended = true, void close(channel, oldFillCallback);

    // Otherwise mark the read bytes as available.
    bufferAvailable += readLength;
    oldFillCallback(null);
  }

  // Note: the returned data may not be read after the reader starts filling.
  function reader_read(length) {
    if (error) throw error;
    if (fillCallback) throw new Error("cannot read while a fill is in progress");
    if (length == null) length = bufferAvailable;
    else if ((length |= 0) < 0) throw new Error("length < 0: " + length);
    else if (length > bufferLength) throw new Error("length > bufferLength: " + length);

    // If all the requested bytes are not available, return null.
    if (!bufferAvailable || length > bufferAvailable) return null;

    // Otherwise, return the next slice of bytes from the buffer.
    var oldBufferOffset = bufferOffset;
    bufferAvailable -= length;
    bufferOffset += length;
    return oldBufferOffset || bufferOffset !== bufferLength
        ? buffer.slice(oldBufferOffset, bufferOffset)
        : buffer;
  }

  // Close the channel.
  function reader_end(callback) {
    if (error) throw error;
    if (fillCallback) throw new Error("cannot end while a fill is in progress");
    if (reader.ended) throw new Error("cannot end after already ended");
    if (!callback) callback = rethrow;
    reader.ended = true;
    close(channel, callback);
  }

  return reader;
};

function rethrow(error) {
  if (error) throw error;
}

var CHANNEL_OPEN = {};
