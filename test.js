'use strict'

const test = require('tape')
const Nanoresource = require('nanoresource')
const create = () => new Nanoresource()
const Collection = require('.')

test('no resources', function (t) {
  t.plan(4)

  for (const Ctor of [Collection, Collection.promises]) {
    t.is(new Ctor().opened, false)
    t.is(new Ctor({ opened: true }).opened, true)
  }
})

test('pass resources to constructor', function (t) {
  t.plan(4)

  for (const Ctor of [Collection, Collection.promises]) {
    const collection = new Ctor([create(), create()])

    t.is(collection.length, 2)
    t.is(collection.opened, false)
  }
})

test('pass opened resources to constructor', function (t) {
  t.plan(4)

  for (const Ctor of [Collection, Collection.promises]) {
    const collection = new Ctor({ opened: true }, [create(), create()])

    t.is(collection.length, 2)
    t.is(collection.opened, true)
  }
})

test('push resources', function (t) {
  t.plan(4)

  for (const Ctor of [Collection, Collection.promises]) {
    const collection = new Ctor([create(), create()])

    collection.push(create())

    t.is(collection.length, 3)
    t.is(collection.opened, false)
  }
})

test('push opened resources', function (t) {
  t.plan(4)

  for (const Ctor of [Collection, Collection.promises]) {
    const collection = new Ctor({ opened: true })

    collection.push(create())

    t.is(collection.length, 1)
    t.is(collection.opened, true)
  }
})

test('open and close', function (t) {
  t.plan(24)

  for (const Ctor of [Collection, Collection.promises]) {
    const c1 = new Ctor([create(), create()])
    const c2 = new Ctor([create(), create()])

    c1.open(function (err) {
      t.ifError(err, 'no open error')
      t.is(c1.opened, true, 'opened')
      t.ok(Array.from(c1).every(r => r.opened), 'all opened')
    })

    c1.close(function (err) {
      t.ifError(err, 'no close error')
      t.is(c1.closed, true, 'closed')
      t.ok(Array.from(c1).every(r => r.closed), 'all closed')
    })

    c2.open(function (err) {
      t.ifError(err, 'no open error')
      t.is(c2.opened, true, 'opened')
      t.ok(Array.from(c2).every(r => r.opened), 'all opened')

      c2.close(function (err) {
        t.ifError(err, 'no close error')
        t.is(c2.closed, true, 'closed')
        t.ok(Array.from(c2).every(r => r.closed), 'all closed')
      })
    })
  }
})

test('open order', function (t) {
  t.plan(3)

  const slow1 = {
    _called: false,
    open (callback) {
      t.is(fast2._called, false)
      this._called = true
      setTimeout(callback, 200)
    }
  }

  const fast2 = {
    _called: false,
    open (callback) {
      t.is(slow1._called, true)
      this._called = true
      process.nextTick(callback)
    }
  }

  const collection = new Collection([slow1, fast2])

  collection.open(function (err) {
    t.ifError(err, 'no open error')
  })
})

test('close order', function (t) {
  t.plan(3)

  const fast1 = {
    _called: false,
    close (callback) {
      t.is(slow2._called, true)
      this._called = true
      process.nextTick(callback)
    }
  }

  const slow2 = {
    _called: false,
    close (callback) {
      t.is(fast1._called, false)
      this._called = true
      setTimeout(callback, 200)
    }
  }

  const collection = new Collection({ opened: true }, [fast1, slow2])

  collection.close(function (err) {
    t.ifError(err, 'no close error')
  })
})

test('open and close partially compliant resources', function (t) {
  t.plan(6)

  const onlyOpen = {
    open (callback) {
      t.pass('open called')
      process.nextTick(callback)
    }
  }

  const onlyClose = {
    close (callback) {
      t.pass('close called')
      process.nextTick(callback)
    }
  }

  const collection = new Collection([onlyOpen, onlyClose])

  collection.open(function (err) {
    t.ifError(err, 'no open error')
    t.is(collection.opened, true, 'opened')
  })

  collection.close(function (err) {
    t.ifError(err, 'no close error')
    t.is(collection.closed, true, 'closed')
  })
})

test('open with error half-way', function (t) {
  t.plan(7)

  const ok1 = {
    open (callback) {
      t.pass('open 1 called')
      process.nextTick(callback)
    },
    close (callback) {
      t.pass('close 1 called')
      process.nextTick(callback)
    }
  }

  const ok2 = {
    open (callback) {
      t.pass('open 2 called')
      process.nextTick(callback)
    },
    close (callback) {
      t.pass('close 2 called')
      process.nextTick(callback)
    }
  }

  const failing = {
    open (callback) {
      process.nextTick(callback, new Error('test'))
    }
  }

  const collection = new Collection([ok1, ok2, failing])

  collection.open(function (err) {
    t.is(err.message, 'test')
    t.is(collection.opened, false, 'not opened')
    t.ok(Array.from(collection).every(r => r.closed || !r.opened))
  })
})

test('open with 2 errors', function (t) {
  t.plan(3)

  const failing1 = {
    open (callback) {
      process.nextTick(callback, new Error('test1'))
    }
  }

  const failing2 = {
    open (callback) {
      t.fail('should not be called')
    }
  }

  const collection = new Collection([failing1, failing2])

  collection.open(function (err) {
    t.is(err.message, 'test1')
    t.is(collection.opened, false, 'not opened')
    t.ok(Array.from(collection).every(r => !r.opened), 'all not opened')
  })
})

test('close with 2 errors', function (t) {
  t.plan(3)

  const failing1 = {
    close (callback) {
      process.nextTick(callback, new Error('test1'))
    }
  }

  const failing2 = {
    close (callback) {
      process.nextTick(callback, new Error('test2'))
    }
  }

  const collection = new Collection({ opened: true }, [failing1, failing2])

  collection.close(function (err) {
    t.is(err.message, 'test2; test1')
    t.is(collection.closed, false, 'not successfully closed')
    t.ok(Array.from(collection).every(r => !r.closed))
  })
})

test('destroy with 2 errors', function (t) {
  t.plan(3)

  const failing1 = {
    close (callback) {
      process.nextTick(callback, new Error('test1'))
    }
  }

  const failing2 = {
    close (callback) {
      process.nextTick(callback, new Error('test2'))
    }
  }

  const collection = new Collection({ opened: true }, [failing1, failing2])

  collection.destroy(new Error('abc'), function (err) {
    t.is(err.message, 'abc; test2; test1')
    t.is(collection.closed, false, 'not successfully closed')
    t.ok(Array.from(collection).every(r => !r.closed))
  })
})

test('skips open if initial collection state is opened', function (t) {
  t.plan(3)

  const mock = {
    open (callback) {
      t.fail('should not be called')
    },
    close (callback) {
      t.pass('called close')
      process.nextTick(callback)
    }
  }

  const collection = new Collection({ opened: true }, [mock])

  collection.open(function (err) {
    t.ifError(err, 'no open error')
  })

  collection.close(function (err) {
    t.ifError(err, 'no close error')
  })
})

test('skips open if initial resource state is opened', function (t) {
  t.plan(3)

  const mock = {
    opened: true,
    open (callback) {
      t.fail('should not be called')
    },
    close (callback) {
      t.pass('called close')
      process.nextTick(callback)
    }
  }

  const collection = new Collection([mock])

  collection.open(function (err) {
    t.ifError(err, 'no open error')
  })

  collection.close(function (err) {
    t.ifError(err, 'no close error')
  })
})

test('skips close if resource state is closed', function (t) {
  t.plan(3)

  const mock = {
    open (callback) {
      t.pass('called open')
      process.nextTick(callback)
    },
    close (callback) {
      t.fail('should not be called')
    }
  }

  const collection = new Collection([mock])

  collection.open(function (err) {
    t.ifError(err, 'no open error')

    mock.closed = true
    collection.close(function (err) {
      t.ifError(err, 'no close error')
    })
  })
})

test('Collection.promises', async function (t) {
  const Ctor = Collection.promises
  const collection = new Ctor([create(), create()])

  await collection.open()
  t.ok(Array.from(collection).every(r => r.opened), 'all opened')

  await collection.close()
  t.ok(Array.from(collection).every(r => r.closed), 'all closed')
})

test('Collection.promises destroy', async function (t) {
  t.plan(1)

  const Ctor = Collection.promises
  const collection = new Ctor([create(), create()])

  try {
    await collection.destroy(new Error('test'))
  } catch (err) {
    t.is(err.message, 'test')
  }
})

test('Collection.promises destroy with callback', function (t) {
  t.plan(1)

  const Ctor = Collection.promises
  const collection = new Ctor([create(), create()])

  collection.destroy(new Error('test'), function (err) {
    t.is(err.message, 'test')
  })
})

test('Collection.promises close with allowActive argument', function (t) {
  t.plan(2)

  const Ctor = Collection.promises
  const c1 = new Ctor({ opened: true }, [create(), create()])
  const c2 = new Ctor({ opened: true }, [create(), create()])

  c1.close(false, function (err) {
    t.ifError(err, 'no close error')
  })

  c2.close(false).then(function () {
    t.pass('closed')
  })
})

test('resource that only supports promises: open and close', function (t) {
  t.plan(4)

  const mock = {
    supports: { promises: true },

    async open () {
      t.pass('open called')
    },

    async close () {
      t.pass('close called')
    }
  }

  const collection = new Collection([mock])

  collection.open(function (err) {
    t.ifError(err, 'no open error')
  })

  collection.close(function (err) {
    t.ifError(err, 'no close error')
  })
})

test('resource that only supports promises: open error', function (t) {
  t.plan(1)

  const mock = {
    supports: { promises: true },

    async open () {
      throw new Error('test')
    }
  }

  const collection = new Collection([mock])

  collection.open(function (err) {
    t.is(err.message, 'test')
  })
})

test('resource that only supports promises: close error', function (t) {
  t.plan(1)

  const mock = {
    supports: { promises: true },

    async close () {
      throw new Error('test')
    }
  }

  const collection = new Collection({ opened: true }, [mock])

  collection.close(function (err) {
    t.is(err.message, 'test')
  })
})
