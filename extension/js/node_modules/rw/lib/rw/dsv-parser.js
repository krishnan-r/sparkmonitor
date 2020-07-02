module.exports = function() {
  var parser = {
        delimiter: parser_delimiter,
        encoding: parser_encoding,
        transform: parser_transform,
        push: parser_push,
        pop: parser_pop
      },
      delimiterCode = CODE_COMMA, // character code of delimiter
      encoding = "utf8", // encoding for converting tokens to strings
      transform = TRANSFORM_AUTO, // transform function
      bufferOffset = 0, // number of bytes we’ve read from buffer
      bufferLength = 0, // number of bytes available in buffer
      buffer = new Buffer(0), // current buffer (not a copy)
      state = STATE_FIELD, // parser finite state machine
      row = [], // current row of fields
      rowIndex = -1, // count of rows that have been parsed
      lineEmpty = true, // true if the line was completely empty (to skip)
      tokenOffset = 0, // number of bytes we’ve written for the current token
      tokenDefaultLength = 1 << 7, // default token length to allocate
      tokenLength = tokenDefaultLength, // current token length (doubles)
      token = new Buffer(tokenLength); // current token accumulation buffer

  function parser_delimiter(newDelimiter) {
    if (!arguments.length) return String.fromCharCode(delimiterCode);
    if (bufferLength > 0) throw new Error("cannot change delimiter after pushing data");
    if ((newDelimiter += "").length !== 1) throw new Error("invalid delimiter: " + newDelimiter);
    delimiterCode = newDelimiter.charCodeAt(0);
    return parser;
  }

  function parser_encoding(newEncoding) {
    if (!arguments.length) return encoding;
    if (bufferLength > 0) throw new Error("cannot change encoding after pushing data");
    if (!Buffer.isEncoding(newEncoding = newEncoding + "")) throw new Error("unknown encoding: " + newEncoding);
    encoding = newEncoding;
    return parser;
  }

  function parser_transform(newTransform) {
    if (!arguments.length) return transform === TRANSFORM_AUTO ? "auto" : transform === TRANSFORM_IDENTITY ? null : transform;
    if (newTransform === null) newTransform = TRANSFORM_IDENTITY;
    else if (newTransform === "auto") newTransform = TRANSFORM_AUTO;
    else if (typeof newTransform != "function") throw new Error("invalid transform: " + newTransform);
    transform = newTransform;
    return parser;
  }

  function parser_push(data) {
    if (bufferOffset < bufferLength) throw new Error("cannot push before all lines are popped");
    bufferLength = data.length;
    bufferOffset = 0;
    buffer = data;
  }

  // TODO Optimize special case of non-quoted, not-fragmented field.
  function parser_token(allowPartial) {
    if (bufferOffset > bufferLength) return null;

    while (bufferOffset < bufferLength) {
      var code = buffer[bufferOffset++];
      if (state === STATE_FIELD) {
        if (code === CODE_QUOTE) { // entered a quoted value
          state = STATE_QUOTE;
          lineEmpty = false;
        } else if (code === CODE_CARRIAGE_RETURN) { // possible CRLF
          state = STATE_AFTER_CARRIAGE_RETURN;
        } else if (code === CODE_LINE_FEED) { // ended an unquoted field & row
          state = STATE_END_OF_LINE;
          return tokenEnd();
        } else if (code === delimiterCode) { // ended an unquoted field
          lineEmpty = false;
          return tokenEnd();
        } else { // read an unquoted character
          lineEmpty = false;
          tokenCharacter(code);
          continue;
        }
      } else if (state === STATE_QUOTE) {
        if (code === CODE_QUOTE) { // read a quote within a quoted value
          state = STATE_AFTER_QUOTE_IN_QUOTE;
        } else { // read a quoted character
          tokenCharacter(code);
          continue;
        }
      } else if (state === STATE_AFTER_QUOTE_IN_QUOTE) {
        if (code === CODE_QUOTE) { // read a quoted quote
          state = STATE_QUOTE;
          tokenCharacter(CODE_QUOTE);
        } else { // exited a quoted value
          state = STATE_FIELD;
          --bufferOffset;
        }
      } else if (state === STATE_AFTER_CARRIAGE_RETURN) {
        state = STATE_END_OF_LINE;
        if (code === CODE_LINE_FEED) {
          return tokenEnd();
        } else {
          --bufferOffset;
        }
      }
    }

    if (allowPartial) {
      state = STATE_END_OF_LINE;
      ++bufferOffset;
      return tokenEnd();
    }

    return null;
  }

  function tokenCharacter(code) {
    if (tokenOffset >= tokenLength) {
      var oldToken = token;
      token = new Buffer(tokenLength <<= 1);
      oldToken.copy(token);
    }
    token[tokenOffset++] = code;
  }

  function tokenEnd() {
    var oldToken = token.slice(0, tokenOffset);
    token = new Buffer(tokenLength = tokenDefaultLength);
    tokenOffset = 0;
    return oldToken;
  }

  function parser_pop(allowPartial) {
    var token;

    while ((token = parser_token(allowPartial)) != null) {
      row.push(token.toString(encoding));
      if (state === STATE_END_OF_LINE) {
        state = STATE_FIELD;
        var oldRow = row,
            oldLineEmpty = lineEmpty;
        row = [];
        lineEmpty = true;
        if (oldLineEmpty) continue; // skip empty lines
        ++rowIndex;
        if (transform === TRANSFORM_AUTO) {
          transform = autoTransform(oldRow);
          --rowIndex;
          continue;
        }
        oldRow = transform(oldRow, rowIndex);
        if (oldRow == null) continue; // skip filtered rows
        return oldRow;
      }
    }

    return null;
  }

  return parser;
};

var CODE_QUOTE = '"'.charCodeAt(0),
    CODE_COMMA = ",".charCodeAt(0),
    CODE_LINE_FEED = "\n".charCodeAt(0),
    CODE_CARRIAGE_RETURN = "\r".charCodeAt(0);

var STATES = 0,
    STATE_FIELD = ++STATES, // inside an unquoted value
    STATE_QUOTE = ++STATES, // inside a quoted value
    STATE_AFTER_QUOTE_IN_QUOTE = ++STATES, // after a quote (") in a quoted value
    STATE_AFTER_CARRIAGE_RETURN = ++STATES, // after a carriage return in an unquoted value
    STATE_END_OF_LINE = ++STATES; // after the last field in a line

var TRANSFORM_AUTO = {},
    TRANSFORM_IDENTITY = function(d) { return d; };

function autoTransform(row) {
  return new Function("d", "return {"
      + row.map(function(name, i) {
            return JSON.stringify(name) + ": d[" + i + "]";
          }).join(",")+ "}");
}
