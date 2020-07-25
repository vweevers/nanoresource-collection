'use strict'

const { fromCallback, fromPromise } = require('catering')
const combine = require('maybe-combine-errors')
const Nanoresource = require('nanoresource')
const kResources = Symbol('kResources')

class Collection extends Nanoresource {
  constructor (options, resources) {
    super()

    if (Array.isArray(options)) {
      resources = options
      options = null
    }

    this[kResources] = []
    this.supports = { ...this.supports, promises: false, callbacks: true }

    if (options == null) options = {}
    if (options.opened) this.opened = true

    if (resources) {
      this[kResources].push(...resources)
    }
  }

  push (...resources) {
    this[kResources].push(...resources)
  }

  _open (callback) {
    openStack(this[kResources].slice(), callback)
  }

  _close (callback) {
    closeStack(this[kResources].slice(), callback)
  }

  destroy (reason, callback) {
    this.close(function (err) {
      callback(combine([reason, err]))
    })
  }

  [Symbol.iterator] () {
    return this[kResources][Symbol.iterator]()
  }

  get length () {
    return this[kResources].length
  }
}

Collection.promises = class CollectionPromises extends Collection {
  constructor (...args) {
    super(...args)
    this.supports = { ...this.supports, promises: true, callbacks: true }
  }

  open (...args) {
    const callback = fromCallback(takeCallback(args))
    super.open(...args, callback)
    return callback.promise
  }

  close (...args) {
    const callback = fromCallback(takeCallback(args))
    super.close(...args, callback)
    return callback.promise
  }

  destroy (...args) {
    const callback = fromCallback(takeCallback(args))
    super.destroy(...args, callback)
    return callback.promise
  }
}

module.exports = Collection

function takeCallback (args) {
  if (typeof args[args.length - 1] === 'function') {
    return args.pop()
  }
}

function openStack (stack, callback) {
  const opened = []

  next()

  function next () {
    if (stack.length === 0) callback()
    else call(stack[0], 'open', 'opened', onopen)
  }

  function onopen (err) {
    if (err) return closeStack(opened, callback, err)
    opened.push(stack.shift())
    next()
  }
}

function closeStack (stack, callback, err) {
  const errors = []

  next(err)

  function next (err) {
    if (err) errors.push(err)
    if (stack.length === 0) return callback(combine(errors))
    call(stack.pop(), 'close', 'closed', next)
  }
}

function call (resource, method, stateProperty, callback) {
  // Doesn't have to be a nanoresource per se
  if (typeof resource[method] !== 'function') {
    return callback()
  }

  // Skip a tick if already opened or closed
  if (resource[stateProperty] === true) {
    return callback()
  }

  // Use promise if resource only supports promises
  if (resource.supports && resource.supports.promises && !resource.supports.callbacks) {
    fromPromise(resource[method](), callback)
  } else {
    resource[method](callback)
  }
}
