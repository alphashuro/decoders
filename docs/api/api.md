---
title: API Reference
nav_order: 10
has_children: true
---

# API Reference

The decoders package consists of a few building blocks:

-   [Guards](#guards)
-   [Primitives](#primitives)
-   [Compositions](#compositions)
-   [Building custom decoders](#building-custom-decoders)

### Guards

<a name="guard" href="#guard">#</a> <b>guard</b>(decoder: <i>Decoder&lt;T&gt;</i>,
formatter?: <i>Annotation => string</i>): <i>Guard&lt;T&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/_guard.js 'Source')

Turns any given `Decoder<T>` into a `Guard<T>`.

A guard works like a decoder, but will either:

-   Return the decoded value (aka the happy path)
-   Or throw an exception

So a Guard bypasses the intermediate "Result" type that decoders output. An "ok" result
will get returned, an "err" result will be formatted into an error message and thrown.

The typical usage is that you keep composing decoders until you have one decoder for your
entire input object, and then use a guard to wrap that outer decoder. Decoders can be
composed to build larger decoders. Guards cannot be composed.

#### Formatting error messsages

By default, `guard()` will use the `formatInline` error formatter. You can pass another
built-in formatter as the second argument, or provide your own. (This will require
understanding the internal `Annotation` datastructure that decoders uses for error
reporting.)

Built-in formatters are:

-   `formatInline` (default) — will echo back the input object and inline error messages
    smartly. Example:

    ```typescript
    import { array, guard, object, string } from 'decoders';
    import { formatInline } from 'decoders/format';

    const mydecoder = array(object({ name: string, age: number }));

    const defaultGuard = guard(mydecoder, formatInline);
    defaultGuard([{ name: 'Alice', age: '33' }]);
    ```

    Will throw the following error message:

    ```text
    Decoding error:
    [
      {
        name: 'Alice',
        age: '33',
             ^^^^ Must be number
      },
    ]
    ```

-   `formatShort` — will report the _path_ into the object where the error happened.
    Example:

    ```typescript
    import { formatShort } from 'decoders/format';
    const customGuard = guard(mydecoder, formatShort);
    ```

    Will throw the following error message:

    ```text
    Decoding error: Value at keypath 0.age: Must be number
    ```

### Compositions

Composite decoders can build new decoders from existing decoders that can already decode a
"subtype". Examples are: if you already have a `string` decoder (of type
`Decoder<string>`), then you can use `array(string)` to automatically build a decoder for
arrays of strings, which will be of type `Decoder<Array<string>>`.

<a name="optional" href="#optional">#</a>
<b>optional</b><i>&lt;T&gt;</i>(<i>Decoder&lt;T&gt;</i>): <i>Decoder&lt;T |
undefined&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/optional.js 'Source')

Accepts only the literal value `undefined`, or whatever the given decoder accepts.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(optional(string));

// 👍
verify('hello') === 'hello';
verify(undefined) === undefined;

// 👎
verify(null);  // throws
verify(0);     // throws
verify(42);    // throws
```
<!-- prettier-ignore-end -->

A typical case where `optional` is useful is in decoding objects with optional fields:

```javascript
object({
    id: number,
    name: string,
    address: optional(string),
});
```

Which will decode to type:

```javascript
{
  id: number,
  name: string,
  address?: string,
}
```

---

<a name="nullable" href="#nullable">#</a>
<b>nullable</b><i>&lt;T&gt;</i>(<i>Decoder&lt;T&gt;</i>): <i>Decoder&lt;T | null&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/optional.js 'Source')

Accepts only the literal value `null`, or whatever the given decoder accepts.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(nullable(string));

// 👍
verify('hello') === 'hello';
verify(null) === null;

// 👎
verify(undefined);  // throws
verify(0);          // throws
verify(42);         // throws
```
<!-- prettier-ignore-end -->

---

<a name="maybe" href="#maybe">#</a> <b>maybe</b><i>&lt;T&gt;</i>(<i>Decoder&lt;T&gt;</i>):
<i>Decoder&lt;?T&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/optional.js 'Source')

Accepts only `undefined`, `null`, or whatever the given decoder accepts.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(maybe(string));

// 👍
verify('hello') === 'hello';
verify(null) === null;
verify(undefined) === undefined;

// 👎
verify(0);   // throws
verify(42);  // throws
```
<!-- prettier-ignore-end -->

---

<a name="array" href="#array">#</a> <b>array</b><i>&lt;T&gt;</i>(<i>Decoder&lt;T&gt;</i>):
<i>Decoder&lt;Array&lt;T&gt;&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/array.js 'Source')

Accepts only arrays of whatever the given decoder accepts.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(array(string));

// 👍
verify(['hello', 'world']) === ['hello', 'world'];

// 👎
verify(['hello', 1.2]);  // throws
```
<!-- prettier-ignore-end -->

---

<a name="nonEmptyArray" href="#nonEmptyArray">#</a>
<b>nonEmptyArray</b><i>&lt;T&gt;</i>(<i>Decoder&lt;T&gt;</i>):
<i>Decoder&lt;Array&lt;T&gt;&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/array.js 'Source')

Like `array()`, but will reject arrays with 0 elements.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(nonEmptyArray(string));

// 👍
verify(['hello', 'world']) === ['hello', 'world'];

// 👎
verify(['hello', 1.2]);  // throws
verify([]);              // throws
```
<!-- prettier-ignore-end -->

---

<a name="poja" href="#poja">#</a> <b>poja</b>: <i>Decoder&lt;Array&lt;unknown&gt;&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/array.js 'Source')

Accepts any array, but doesn't validate its items further.

"poja" means "plain old JavaScript array", a play on ["pojo"](#pojo).

<!-- prettier-ignore-start -->
```javascript
const verify = guard(poja);

// 👍
verify([1, 'hi', true]) === [1, 'hi', true];
verify(['hello', 'world']) === ['hello', 'world'];
verify([]) === [];

// 👎
verify({});    // throws
verify('hi');  // throws
```
<!-- prettier-ignore-end -->

---

<a name="tuple" href="#tuple">#</a> <b>tuple</b><i>&lt;A, B, C,
...&gt;</i>(<i>Decoder&lt;A&gt;</i>, <i>Decoder&lt;B&gt;</i>, <i>Decoder&lt;C&gt;</i>):
<i>Decoder&lt;[A, B, C, ...]&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/tuple.js 'Source')

Accepts a tuple (an array with exactly _n_ items) of values accepted by the _n_ given
decoders.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(tuple(string, number));

// 👍
verify(['hello', 1.2]) === ['hello', 1.2];

// 👎
verify([]);                  // throws, too few items
verify(['hello', 'world']);  // throws, not the right types
verify(['a', 1, 'c']);       // throws, too many items
```
<!-- prettier-ignore-end -->

---

<a name="object" href="#object">#</a> <b>object</b><i>&lt;O: { [field: string]:
Decoder&lt;any&gt; }&gt;</i>(mapping: O): <i>Decoder&lt;{ ... }&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/object.js 'Source')

Accepts object values with fields matching the given decoders. Extra fields that exist on
the input object are ignored and will not be returned.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(
    object({
        x: number,
        y: number,
    }),
);

// 👍
verify({ x: 1, y: 2 }) === { x: 1, y: 2 };
verify({ x: 1, y: 2, z: 3 }) === { x: 1, y: 2 }; // ⚠️ extra field `z` not returned!

// 👎
verify({ x: 1 });  // throws, missing field `y`
```
<!-- prettier-ignore-end -->

For more information, see also
[The difference between `object`, `exact`, and `inexact`](#the-difference-between-object-exact-and-inexact).

---

<a name="exact" href="#exact">#</a> <b>exact</b><i>&lt;O: { [field: string]:
Decoder&lt;any&gt; }&gt;</i>(mapping: O): <i>Decoder&lt;{ ... }&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/object.js 'Source')

Like `object()`, but will reject inputs that contain extra keys that are not specified
explicitly.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(
    exact({
        x: number,
        y: number,
    }),
);

// 👍
verify({ x: 1, y: 2 }) === { x: 1, y: 2 };

// 👎
verify({ x: 1, y: 2, z: 3 });  // throws, extra field `z` not allowed
verify({ x: 1 });              // throws, missing field `y`
```
<!-- prettier-ignore-end -->

For more information, see also
[The difference between `object`, `exact`, and `inexact`](#the-difference-between-object-exact-and-inexact).

---

<a name="inexact" href="#inexact">#</a> <b>inexact</b><i>&lt;O: { [field: string]:
Decoder&lt;any&gt; }&gt;</i>(mapping: O): <i>Decoder&lt;{ ... }&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/object.js 'Source')

Like `object()`, but will pass through any extra fields on the input object unvalidated
that will thus be of `unknown` type statically.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(
    inexact({
        x: number,
    }),
);

// 👍
verify({ x: 1, y: 2 }) === { x: 1, y: 2 };
verify({ x: 1, y: 2, z: 3 }) === { x: 1, y: 2, z: 3 };

// 👎
verify({ x: 1 });  // throws, missing field `y`
```
<!-- prettier-ignore-end -->

For more information, see also
[The difference between `object`, `exact`, and `inexact`](#the-difference-between-object-exact-and-inexact).

---

<a name="pojo" href="#pojo">#</a> <b>pojo</b>: <i>Decoder&lt;{ [key: string]: unknown
}&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/object.js 'Source')

Accepts any "plain old JavaScript object", but doesn't validate its keys or values
further.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(pojo);

// 👍
verify({}) === {};
verify({ name: 'hi' }) === { name: 'hi' };

// 👎
verify('hi');        // throws
verify([]);          // throws
verify(new Date());  // throws
verify(null);        // throws
```
<!-- prettier-ignore-end -->

---

<a name="dict" href="#dict">#</a> <b>dict</b><i>&lt;T&gt;</i>(<i>Decoder&lt;T&gt;</i>):
<i>Decoder&lt;{ [string]: &lt;T&gt;}&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/mapping.js 'Source')

Accepts objects where all values match the given decoder, and returns the result as a
`{ [string]: T }`.

The main difference between `object()` and `dict()` is that you'd typically use `object()`
if this is a record-like object, where all field names are known and the values are
heterogeneous. Whereas with `dict()` the keys are typically dynamic and the values
homogeneous, like in a dictionary, a lookup table, or a cache.

```javascript
const verify = guard(dict(person)); // Assume you have a "person" decoder already

// 👍
verify({
    1: { name: 'Alice' },
    2: { name: 'Bob' },
    3: { name: 'Charlie' },
}); // ≈ {
//     "1": { name: "Alice" },
//     "2": { name: "Bob" },
//     "3": { name: "Charlie" },
// }
```

---

<a name="mapping" href="#mapping">#</a>
<b>mapping</b><i>&lt;T&gt;</i>(<i>Decoder&lt;T&gt;</i>): <i>Decoder&lt;Map&lt;string,
T&gt;&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/mapping.js 'Source')

Like `dict()`, but returns the result as a `Map<string, T>` instead.

```javascript
const verify = guard(mapping(person)); // Assume you have a "person" decoder already

// 👍
verify({
    1: { name: 'Alice' },
    2: { name: 'Bob' },
    3: { name: 'Charlie' },
});
// ≈ Map([
//     ['1', { name: 'Alice' }],
//     ['2', { name: 'Bob' }],
//     ['3', { name: 'Charlie' }],
//   ]);
```

---

<a name="json" href="#json">#</a> <b>json</b>: <i>Decoder&lt;JSONValue&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/json.js 'Source')

Accepts any value that's a valid JSON value:

-   `null`
-   `string`
-   `number`
-   `boolean`
-   `{ [string]: JSONValue }`
-   `Array<JSONValue>`

```javascript
const verify = guard(json);

// 👍
verify({
    name: 'Amir',
    age: 27,
    admin: true,
    image: null,
    tags: ['vip', 'staff'],
});
```

Any value returned by `JSON.parse()` should decode without failure.

---

<a name="jsonObject" href="#jsonObject">#</a> <b>jsonObject</b>:
<i>Decoder&lt;JSONObject&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/json.js 'Source')

Like `json`, but will only decode when the JSON value is an object.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(json);

// 👍
verify({});                // ≈ {}
verify({ name: 'Amir' });  // ≈ { name: 'Amir' }

// 👎
verify([]);                   // throws
verify([{ name: 'Alice' }]);  // throws
verify('hello');              // throws
verify(null);                 // throws
```
<!-- prettier-ignore-end -->

---

<a name="jsonArray" href="#jsonArray">#</a> <b>jsonArray</b>:
<i>Decoder&lt;JSONArray&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/json.js 'Source')

Like `json`, but will only decode when the JSON value is an array.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(json);

// 👍
verify([]);                  // ≈ []
verify([{ name: 'Amir' }]);  // ≈ [{ name: 'Amir' }]

// 👎
verify({});                 // throws
verify({ name: 'Alice' });  // throws
verify('hello');            // throws
verify(null);               // throws
```
<!-- prettier-ignore-end -->

---

<a name="either" href="#either">#</a> <b>either</b><i>&lt;A, B, C,
...&gt;</i>(<i>Decoder&lt;A&gt;</i>, <i>Decoder&lt;B&gt;</i>, <i>Decoder&lt;C&gt;</i>,
...): <i>Decoder&lt;A | B | C | ...&gt;</i><br />
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/either.js 'Source')<br />

Accepts any value that is accepted by any of the given decoders. The decoders are
attempted on the input in given order. The first one that accepts the input "wins".

<!-- prettier-ignore-start -->
```javascript
const verify = guard(either(number, string));

// 👍
verify('hello world') === 'hello world';
verify(123) === 123;

// 👎
verify(false);  // throws
```
<!-- prettier-ignore-end -->

**NOTE to Flow users:** In Flow, there is a max of 16 arguments with this construct. (This
is no problem in TypeScript.) If you hit the 16 argument limit, you can work around that
by stacking, e.g. do `either(<15 arguments here>, either(...))`.

---

<a name="disjointUnion" href="#disjointUnion">#</a> <b>disjointUnion</b><i>&lt;O: {
[field: string]: (Decoder&lt;T&gt; | Decoder&lt;V&gt; | ...) }&gt;</i>(field: string,
mapping: O): <i>Decoder&lt;T | V | ...&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/dispatch.js 'Source')

**NOTE:** In decoders@1.x, this was called `dispatch()`.

Like `either`, but only for building unions of object types with a common field (like a
`type` field) that lets you distinguish members.

The following two decoders are effectively equivalent:

```javascript
type Rect = { __type: 'rect', x: number, y: number, width: number, height: number };
type Circle = { __type: 'circle', cx: number, cy: number, r: number };
//              ^^^^^^
//              Field that defines which decoder to pick
//                                               vvvvvv
const shape1: Decoder<Rect | Circle> = disjointUnion('__type', { rect, circle });
const shape2: Decoder<Rect | Circle> = either(rect, circle);
```

But using `disjointUnion()` will typically be more runtime-efficient than using
`either()`. The reason is that `disjointUnion()` will first do minimal work to "look
ahead" into the `type` field here, and based on that value, pick which decoder to invoke.
Error messages will then also be tailored to the specific decoder.

The `either()` version will instead try each decoder in turn until it finds one that
matches. If none of the alternatives match, it needs to report all errors, which is
sometimes confusing.

---

<a name="oneOf" href="#oneOf">#</a> <b>oneOf</b><i>&lt;T&gt;</i>(<i>Array&lt;T&gt;</i>):
<i>Decoder&lt;T&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/either.js 'Source')<br />

Accepts any value that is strictly-equal (using `===`) to one of the specified values.

<!-- prettier-ignore-start -->
```javascript
const verify = guard(oneOf(['foo', 'bar', 3]));

// 👍
verify('foo') === 'foo';
verify(3) === 3;

// 👎
verify('hello');  // throws
verify(4);        // throws
verify(false);    // throws
```
<!-- prettier-ignore-end -->

For example, given an array of strings, like so:

```javascript
oneOf(['foo', 'bar']);
```

TypeScript is capable of inferring the return type as `Decoder<'foo' | 'bar'>`, but in
Flow it will (unfortunately) be `Decoder<string>`. So in Flow, be sure to explicitly
annotate the type. Either by doing `oneOf([('foo': 'foo'), ('bar': 'bar')])`, or as
`oneOf<'foo' | 'bar'>(['foo', 'bar'])`.

---

<a name="instanceOf" href="#instanceOf">#</a>
<b>instanceOf</b><i>&lt;T&gt;</i>(<i>Class&lt;T&gt;</i>): <i>Decoder&lt;T&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/instanceOf.js 'Source')<br />

Accepts any value that is an `instanceof` the given class.

> **NOTE: Help wanted!** The TypeScript annotation for this decoder needs help! If you
> know how to express it, please submit a PR. See
> https://github.com/nvie/decoders/blob/main/src/core/instanceOf.d.ts

<!-- prettier-ignore-start -->
```javascript
const verify = guard(instanceOf(Error));

// 👍
const value = new Error('foo');
verify(value) === value;

// 👎
verify('foo');  // throws
verify(3);      // throws
```
<!-- prettier-ignore-end -->

---

<a name="map" href="#map">#</a> <b>map</b><i>&lt;T, V&gt;</i>(<i>Decoder&lt;T&gt;</i>,
<i>&lt;T&gt;</i> =&gt; <i>&lt;V&gt;</i>): <i>Decoder&lt;V&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/utils.js 'Source')<br />

Accepts any value the given decoder accepts, and on success, will call the mapper value
**on the decoded result**. If the mapper function throws an error, the whole decoder will
fail using the error message as the failure reason.

<!-- prettier-ignore-start -->
```javascript
const upper = map(string, (s) => s.toUpperCase());
const verify = guard(upper);

// 👍
verify('foo') === 'FOO';

// 👎
verify(4);  // throws
```
<!-- prettier-ignore-end -->

---

<a name="compose" href="#compose">#</a> <b>compose</b><i>&lt;T,
V&gt;</i>(<i>Decoder&lt;T&gt;</i>, <i>Decoder&lt;V, T&gt;</i>): <i>Decoder&lt;V&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/composition.js 'Source')<br />

Given a decoder for _T_ and another one for _V_-given-a-_T_. Will first decode the input
using the first decoder, and _if okay_, pass the result on to the second decoder. The
second decoder will thus be able to make more assumptions about its input value, i.e. it
can know what type the input value is (`T` instead of `unknown`).

This is an advanced decoder, typically only useful for authors of decoders. It's not
recommended to rely on this decoder directly for normal usage.

---

<a name="predicate" href="#predicate">#</a>
<b>predicate</b><i>&lt;T&gt;</i>(<i>Decoder&lt;T&gt;</i>, <i>&lt;T&gt; => boolean</i>,
string): <i>Decoder&lt;T&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/composition.js 'Source')<br />

Accepts values that are accepted by the decoder _and_ also pass the predicate function.

<!-- prettier-ignore-start -->
```typescript
const odd = predicate(
  number,
  (n) => n % 2 !== 0,
  'Must be odd'
);
const verify = guard(odd);

// 👍
verify(3) === 3;

// 👎
verify('hi');  // throws: not a number
verify(42);    // throws: not an odd number
```
<!-- prettier-ignore-end -->

In TypeScript, if you provide a predicate that also doubles as a [type
predicate][type-predicates], then this will be reflected in the return type, too.

---

<a name="prep" href="#prep">#</a> <b>prep</b><i>&lt;T, I&gt;</i>(<i>unknown => I</i>,
<i>Decoder&lt;T, I&gt;</i>): <i>Decoder&lt;T&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/composition.js 'Source')<br />

Pre-process the raw data input before passing it into the decoder. This gives you the
ability to arbitrarily customize the input on the fly before passing it to the decoder. Of
course, the input value at that point is still of `unknown` type, so you will have to deal
with that accordingly.

<!-- prettier-ignore-start -->
```typescript
const verify = prep(
  // Will convert any input to an int first, before feeding it to
  // positiveInteger. This will effectively also allow numeric strings
  // to be accepted (and returned) as integers. If this ever throws,
  // then the error message will be what gets annotated on the input.
  x => parseInt(x),
  positiveInteger,
);

// 👍
verify(42) === 42;
verify('3') === 3;

// 👎
verify('-3');  // throws: not a positive number
verify('hi');  // throws: not a number
```
<!-- prettier-ignore-end -->

---

<a name="describe" href="#describe">#</a>
<b>describe</b><i>&lt;T&gt;</i>(<i>Decoder&lt;T&gt;</i>, <i>string</i>):
<i>Decoder&lt;T&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/describe.js 'Source')<br />

Uses the given decoder, but will use an alternative error message in case it rejects. This
can be used to simplify or shorten otherwise long or low-level/technical errors.

```javascript
const vowel = describe(
    either5(constant('a'), constant('e'), constant('i'), constant('o'), constant('u')),
    'Must be vowel',
);
```

---

<a name="lazy" href="#lazy">#</a> <b>lazy</b><i>&lt;T&gt;</i>(() =>
<i>Decoder&lt;T&gt;</i>): <i>Decoder&lt;T&gt;</i>
[&lt;&gt;](https://github.com/nvie/decoders/blob/main/src/core/lazy.js 'Source')<br />

Lazily evaluate the given decoder. This is useful to build self-referential types for
recursive data structures. Example:

```js
type Tree = {
    value: string,
    children: Array<Tree>,
    //              ^^^^
    //              Self-reference defining a recursive type
};

const treeDecoder: Decoder<Tree> = object({
    value: string,
    children: array(lazy(() => treeDecoder)),
    //              ^^^^^^^^^^^^^^^^^^^^^^^
    //              Use lazy() like this to refer to the treeDecoder which is
    //              getting defined here
});
```

### The difference between `object`, `exact`, and `inexact`

The three decoders in the "object" family of decoders only differ in how they treat extra
properties on input values.

For example, for a definition like:

```js
import { exact, inexact, number, object, string } from 'decoders';

const thing = {
    a: string,
    b: number,
};
```

And a runtime input of:

```js
{
  a: "hi",
  b: 42,
  c: "extra",  // Note "c" is not a known field
}
```

|                  | Extra properties | Output value                   | Inferred type                               |
| ---------------- | ---------------- | ------------------------------ | ------------------------------------------- |
| `object(thing)`  | discarded        | `{a: "hi", b: 42}`             | `{a: string, b: number}`                    |
| `exact(thing)`   | not allowed      | ⚡️ Runtime error              | `{a: string, b: number}`                    |
| `inexact(thing)` | retained         | `{a: "hi", b: 42, c: "extra"}` | `{a: string, b: number, [string]: unknown}` |
