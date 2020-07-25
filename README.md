# nanoresource-collection

**Open and close multiple [nanoresources](https://github.com/mafintosh/nanoresource) as one.**

[![npm status](http://img.shields.io/npm/v/nanoresource-collection.svg)](https://www.npmjs.org/package/nanoresource-collection)
[![node](https://img.shields.io/node/v/nanoresource-collection.svg)](https://www.npmjs.org/package/nanoresource-collection)
[![Travis build status](https://img.shields.io/travis/com/vweevers/nanoresource-collection.svg?label=travis)](http://travis-ci.com/vweevers/nanoresource-collection)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Usage

```js
const Collection = require('nanoresource-collection')
const collection = new Collection([resource1, resource2])

collection.open(function (err) {
  // All resources have been opened
})

collection.close(function (err) {
  // All resources have been closed
})
```

## API

### `new Collection([options, ][resources])`

Both arguments are optional. The `resources` argument can be an array and should contain `nanoresource` instances. Alternatively use `collection.push(...resources)`.

Resources in the collection are opened sequentially. If one of the resources fails to open, other resources that did open successfully will be closed again. Resources are closed in reverse order: the last to be opened is the first to be closed.

Options:

- `opened` (boolean): default `false`. If `true`, assume the resources are already open and adjust collection state accordingly. Useful for partially compliant resources (like servers) that only have a `.close()` method.

Because `nanoresource-collection` is itself a `nanoresource`, the API is the same and collections are composable. In addition `nanoresource-collection` ships a variant that (also) supports promises:

```js
const Collection = require('nanoresource-collection').promises
const collection = new Collection()

await collection.open()
await collection.close()
```

## Install

With [npm](https://npmjs.org) do:

```
npm install nanoresource-collection
```

## License

[MIT](LICENSE.md) © 2020-present Vincent Weevers
