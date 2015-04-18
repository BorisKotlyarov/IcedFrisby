# IcedFrisby API Guide

- [IcedFrisby API Guide](#icedfrisby-api-guide)
	- [Expectations](#expectations)
		- [expectStatus(code)](#expectstatuscode)
		- [expectHeader(key, content)](#expectheaderkey-content)
		- [expectHeaderContains(key, content)](#expectheadercontainskey-content)
		- [expectJSON([path], json)](#expectjsonpath-json)
		- [expectContainsJSON([path], json)](#expectcontainsjsonpath-json)
		- [expectJSONTypes([path], schema)](#expectjsontypespath-schema)
		- [expectBodyContains(content)](#expectbodycontainscontent)
		- [expectJSONLength([path], length)](#expectjsonlengthpath-length)
		- [Using Paths](#using-paths)
			- [Testing Nested Objects](#testing-nested-objects)
			- [Testing All Objects in an Array](#testing-all-objects-in-an-array)
			- [Testing One Object in an Array](#testing-one-object-in-an-array)
	- [Global Setup](#global-setup)
		- [request.baseUri](#requestbaseuri)
		- [request.headers](#requestheaders)
		- [request.json](#requestjson)
		- [request.inspectOnFailure](#requestinspectonfailure)
		- [failOnMultiSetup](#failonmultisetup)
		- [Resetting `globalSetup`](#resetting-globalsetup)

## Expectations

IcedFrisby provides a lot of helper functions to help you check the most common aspects of REST API testing.

Use the expect functions after create() and before toss().
```javascript
frisby.create('a test')
    .expectStatus(200)
    // any number of additional expect statements here
    .toss();
```

### expectStatus(code)
Tests the HTTP response Status code.
* Types: `code`: `integer`
* Default: `none`

```javascript
frisby.create('Ensure we are dealing with a teapot')
  .get('http://httpbin.org/status/418')
    .expectStatus(418)
.toss()
```

### expectHeader(key, content)
Tests that a single HTTP response header matches the [exact content](http://chaijs.com/api/bdd/#equal). Both
key and content comparisons are case-insensitive.

* Types: `key`: `string`, `content`: `string`
* Defaults: `none`

```javascript
frisby.create('Ensure response has a proper JSON Content-Type header')
  .get('http://httpbin.org/get')
    .expectHeader('Content-Type', 'application/json')
.toss();
```

### expectHeaderContains(key, content)
Tests that a single HTTP response header [contains](http://chaijs.com/api/bdd/#include) the specified content. Both key and content comparisons are case-insensitive.

* Types: `key`: `string`, `content`: `string, regex`
* Defaults: `none`

```javascript
frisby.create('Ensure response has JSON somewhere in the Content-Type header')
  .get('http://httpbin.org/get')
    .expectHeaderContains('Content-Type', 'json')
.toss();
```

### expectJSON([path], json)
Tests that response body is JSON and [deeply equals](http://chaijs.com/api/bdd/#deep) the provided JSON.

* Types: `path`: `string`, `json`: `JSON`
* Defaults: `none`

```javascript
frisby.create('Ensure test has foo and bar')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
    .expectJSON('args', {
      args: {
        foo: 'bar',
        bar: 'baz'
      }
    })
.toss()
```

### expectContainsJSON([path], json)
Tests that response body is JSON and [contains a subset](http://chaijs.com/plugins/chai-subset) of the provided JSON.

* Types: `path`: `string`, `json`: `JSON`
* Defaults: `none`

```javascript
frisby.create('Ensure test has foo and bar')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
    .expectContainsJSON('args', {
      foo: 'bar'
    })
.toss()
```

### expectJSONTypes([path], schema)
Validates the response body against the provided [Joi](https://github.com/hapijs/joi) schema.

* Types: `path`: `string`, `schema`: [`Joi schema`](https://github.com/hapijs/joi)
* Defaults: `none`

```javascript
frisby.create('Ensure response has proper JSON types in specified keys')
  .post('http://httpbin.org/post', {
    arr: [1, 2, 3, 4],
    foo: "bar",
    bar: "baz",
    answer: 42
  })
  .expectJSONTypes('args.json', Joi.object().keys({
    arr: Joi.array().items(Joi.number()).required(),
    foo: Joi.string().required(),
    bar: Joi.string().required(),
    answer: Joi.number().integer().required()
  }))
  .toss();
```

### expectBodyContains(content)
Tests that the HTTP response body [contains](http://chaijs.com/api/bdd/#include) the provided content string. Used for testing HTML, text, or other content types.

* Types: `content`: `string, regex`
* Defaults: `none`

```javascript
frisby.create('Ensure this is *actually* a real teapot, not some imposter coffee pot')
  .get('http://httpbin.org/status/418')
    .expectStatus(418)
    .expectBodyContains('teapot')
.toss()
```

### expectJSONLength([path], length)
Tests given path or full JSON response for specified length. When used on objects, the number of keys are counted. When used on other JavaScript types such as Arrays or Strings, the native length property is used for comparison.

* Types: `length`: `integer`
* Defaults: `none`

```javascript
frisby.create('Ensure "bar" really is only 3 characters... because you never know...')
  .get('http://httpbin.org/get?foo=bar&bar=baz')
    .expectJSONLength('args.foo', 3)
.toss()
```

### Using Paths
Paths are used in the following IcedFrisby functions:
* `expectJSON`
* `expectContainsJSON`
* `expectJSONTypes`
* `expectJSONLength`

#### Testing Nested Objects
The path parameter can be used to test a nested JSON object.

```javascript
frisby.create('Ensure response has proper JSON types in specified keys')
  .post('http://httpbin.org/post', {
    answer: 42
  })
  .expectJSONTypes('args.json', Joi.object().keys({
    answer: Joi.number().integer().required()
  }))
  .toss();
```
This example returns a REST response with `{ args: { json: { answer: 42 } } }`. Using a path of `args.json` allows testing of a nested JSON object, `{ answer: 42 }`. This is useful when you don't care about other parts of the response.

#### Testing All Objects in an Array
To test all objects in an array, use an asterisk character, so the path looks like `'args.path.myarray.*'` if the array is at the root level, use `'*'` as the path.

This path mode is often combined with expectJSONTypes to ensure each item in an array contains all required keys and types.

```javascript
  // some request that returns:
  // [
  //   {
  //     number: 5,
  //     string: 'a string'
  //   },
  //   {
  //     number: 6,
  //     string: 'another string'
  //   }
  // ]
  .expectJSONTypes('*', Joi.object().keys({
      number: Joi.number().required(),
      string: Joi.string().required(),
      boolean: Joi.boolean().forbidden()
  }))
.toss();
```
#### Testing One Object in an Array
To test a single object in an array, use an asterisk character, so the path looks like `'args.path.myarray.?'` if the array is at the root level, use `'?'` as the path.

```javascript
// some request that returns:
// [
//   {
//     number: 5
//   },
//   {
//     string: 'a string'
//   }
// ]
  .expectJSONTypes('?', Joi.object().keys({
    string: Joi.string().required()
  })
.toss();
```


## Global Setup

`globalSetup()` allows you to define default options for ALL IcedFrisby tests.

:collision: Global setup will affect IcedFrisby tests even across files. It is truly global. Do not call `globalSetup()` more than once unless you know what you are doing.

### request.baseUri
Base URI/URL that will be prepended to every request.
Type: `string`
Default: `''`

```javascript
frisby.globalSetup({
  request: {
    baseUri: 'http://localhost:3000/api/'
  }
});
```

### request.headers
Default headers by providing an object with key-value pairs.
Type: `Object`
Default: `{}`

```javascript
frisby.globalSetup({
  request: {
    headers: { 'Authorization': 'Bearer [...]' }
  }
});
```

### request.json
Sets the `content-type` header to `application/json`.
Type: `boolean`
Default: `false`

```javascript
frisby.globalSetup({
  request: {
    json: true // or false
  }
});
```

### request.inspectOnFailure
This is a really neat option that will help you figure out what is happening with your requests. Dumps request/response information to the logs.
Type: `boolean`
Default: `false`

```javascript
frisby.globalSetup({
  request: {
    inspectOnFailure: true // or false
  }
});
```

### failOnMultiSetup
Enabling the `failOnMultiSetup` option causes IcedFrisby to throw an error if `globalSetup(opts)` is called more than once. We recommend enabling this option. Message:
> IcedFrisby global setup has already been done. Doing so again is disabled (see the failOnMultiSetup option) because it may cause indeterministic behavior.

Type: `boolean`
Default: `false` Disabled by default for backwards compatibility.

```javascript
frisby.globalSetup({
  request: {
    inspectOnFailure: true // or false
  }
});
```

### Resetting `globalSetup`
Resets the `globalSetup` settings for the current test.

```javascript
frisby.create('Request without the globalSetup options')
  .reset() // reset the globalSetup options
  .get(...)
  ...
```
