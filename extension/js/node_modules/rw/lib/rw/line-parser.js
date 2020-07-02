module.exports = function() {
  var parser = {
        encoding: parser_encoding,
        push: parser_push,
        pop: parser_pop
      },
      buffer = new Buffer(0),
      bufferOffset = 0,
      bufferLength = 0,
      encoding = "utf8",
      fragment = null,
      state = STATE_DEFAULT;

  function parser_encoding(newEncoding) {
    if (!arguments.length) return encoding;
    if (bufferLength > 0) throw new Error("cannot change encoding after pushing data");
    if (!Buffer.isEncoding(newEncoding = newEncoding + "")) throw new Error("unknown encoding: " + newEncoding);
    encoding = newEncoding;
    return parser;
  }

  function parser_push(data) {
    if (bufferOffset < bufferLength) throw new Error("cannot push before all lines are popped");
    bufferLength = data.length;
    bufferOffset = 0;
    buffer = data;
  }

  function parser_pop(allowPartial) {
    var oldBufferOffset = bufferOffset;

    // Find the next line terminator.
    while (bufferOffset < bufferLength) {
      var code = buffer[bufferOffset++];
      if (state === STATE_MAYBE_CARRIAGE_RETURN_LINE_FEED) {
        if (code === CODE_LINE_FEED) {
          state = STATE_AFTER_CARRIAGE_RETURN_LINE_FEED;
        } else {
          state = STATE_AFTER_LINE_FEED; // treat bare \r as \n
          --bufferOffset;
        }
        break;
      }
      if (code === CODE_LINE_FEED) {
        state = STATE_AFTER_LINE_FEED;
        break;
      }
      if (code === CODE_CARRIAGE_RETURN) {
        state = STATE_MAYBE_CARRIAGE_RETURN_LINE_FEED;
        continue;
      }
    }

    // Slice out the new data.
    var newFragment = buffer.slice(oldBufferOffset, bufferOffset);

    // Combine it with the old data, if any.
    if (fragment != null) {
      var oldFragment = newFragment;
      newFragment = new Buffer(fragment.length + oldFragment.length);
      fragment.copy(newFragment);
      oldFragment.copy(newFragment, fragment.length);
      fragment = null;
    }

    // Slice off the \r or \n.
    if (state === STATE_AFTER_LINE_FEED) {
      state = STATE_DEFAULT;
      return newFragment.slice(0, -1);
    }

    // Slice off the \r\n.
    if (state === STATE_AFTER_CARRIAGE_RETURN_LINE_FEED) {
      state = STATE_DEFAULT;
      return newFragment.slice(0, -2);
    }

    // Return the whole thing, if a trailing partial line is wanted.
    if (allowPartial) {
      state = STATE_DEFAULT;
      return newFragment.length ? newFragment : null;
    }

    // Otherwise, we’ve read part of a line. Copy the fragment so that the
    // source buffer can be modified without changing the fragment contents.
    fragment = new Buffer(newFragment.length);
    newFragment.copy(fragment);
    return null;
  }

  return parser;
};

var CODE_LINE_FEED = 10,
    CODE_CARRIAGE_RETURN = 13;

var STATE_DEFAULT = 1,
    STATE_AFTER_LINE_FEED = 2,
    STATE_AFTER_CARRIAGE_RETURN_LINE_FEED = 3,
    STATE_MAYBE_CARRIAGE_RETURN_LINE_FEED = 4;
