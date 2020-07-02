var tokenize = require('glsl-tokenizer/string')
var inject   = require('glsl-inject-defines')
var defines  = require('glsl-token-defines')
var descope  = require('glsl-token-descope')
var string   = require('glsl-token-string')
var scope    = require('glsl-token-scope')
var depth    = require('glsl-token-depth')

module.exports = function(deps) {
  return inject(Bundle(deps).src, {
    GLSLIFY: 1
  })
}

function Bundle(deps) {
  if (!(this instanceof Bundle)) return new Bundle(deps)

  this.depList    = deps
  this.depIndex   = indexBy(deps, 'id')
  this.exported   = {}
  this.cache      = {}
  this.varCounter = 0

  this.src = []

  for (var i = 0; i < deps.length; i++) {
    var dep = deps[i]
    if (dep.entry) {
      this.src = this.src.concat(this.bundle(dep).tokens)
    }
  }

  this.src = string(this.src)
}

Bundle.prototype.bundle = function(dep) {
  var tokens  = tokenize(dep.source)
  var self    = this
  var imports = []
  var exports = null

  depth(tokens)
  scope(tokens)

  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]
    if (token.type !== 'preprocessor') continue
    if (!glslifyPreprocessor(token.data)) continue

    var exported = glslifyExport(token.data)
    var imported = glslifyImport(token.data)

    if (exported) {
      exports = exported[1]
      tokens.splice(i--, 1)
    } else
    if (imported) {
      var name = imported[1]
      var maps = imported[2].split(/\s?,\s?/g)
      var path = maps.shift()
        .trim()
        .replace(/^'|'$/g, '')
        .replace(/^"|"$/g, '')

      var target = this.depIndex[dep.deps[path]]

      maps = toMapping(maps)

      if (!target) throw new Error('Could not find module: "' + path + '"')

      imports.push({
        name: name,
        target: target
      })

      if (self.cache[target.id]) {
        tokens.splice(i--, 1)
        continue
      }

      var targetBundle = this.bundle(target)
      var targetTokens = targetBundle.tokens
      var targetExport = targetBundle.exports
      var targetIndex  = tokens.indexOf(token)
      var targetDefs   = defines(targetTokens)

      descope(targetTokens, function(local, token) {
        if ('module' in token) return local
        if (targetDefs[local]) return local
        if (maps && maps[local]) return maps[local]

        // Give each variable in the required GLSL module
        // a new name unique to the module. This prevents
        // variable name conflicts between modules, in the
        // same way you get with node/browserify.
        var name = [local, target.id, self.varCounter++].join('_')

        // Keep a cache of exported variable names, such
        // that we can share them across files and refer
        // to the same function/struct/value.
        if (targetExport === local) {
          return self.cache[target.id] = self.cache[target.id] || name
        }

        return name
      })

      for (var j = 0; j < targetTokens.length; j++) {
        if ('module' in token) continue
        targetTokens[j].module = target.id
      }

      tokens = []
        .concat(tokens.slice(0, targetIndex))
        .concat(targetTokens)
        .concat(tokens.slice(targetIndex + 1))

      i += targetTokens.length
    }
  }

  tokens.forEach(function(token) {
    if (token.type !== 'ident') return
    if ('module' in token) return

    imports.forEach(function(imported) {
      if (imported.name !== token.data) return
      token.data = self.cache[imported.target.id]
    })
  })

  return {
    tokens: tokens,
    exports: exports
  }
}

function glslifyPreprocessor(data) {
  return /#pragma glslify:/.test(data)
}

function glslifyExport(data) {
  return /#pragma glslify:\s*export\(([^\)]+)\)/.exec(data)
}

function glslifyImport(data) {
  return /#pragma glslify:\s*([^=\s]+)\s*=\s*require\(([^\)]+)\)/.exec(data)
}

function indexBy(deps, key) {
  return deps.reduce(function(deps, entry) {
    deps[entry[key]] = entry
    return deps
  }, {})
}

function toMapping(maps) {
  if (!maps) return false

  return maps.reduce(function(mapping, defn) {
    defn = defn.split(/\s?=\s?/g)

    var expr = defn.pop()

    defn.forEach(function(key) {
      mapping[key] = expr
    })

    return mapping
  }, {})
}
