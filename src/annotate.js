// @flow strict

type cast = $FlowFixMe;

const _register: WeakSet<{ ... }> = new WeakSet();

export type ObjectAnnotation = {|
    +type: 'object',
    +fields: { +[key: string]: Annotation },
    +text?: string,
    +subcount: number, // The number of nested annotations in the values
|};

export type ArrayAnnotation = {|
    +type: 'array',
    +items: $ReadOnlyArray<Annotation>,
    +text?: string,
    +subcount: number, // The number of nested annotations in items
|};

export type ScalarAnnotation = {|
    +type: 'scalar',
    +value: mixed,
    +text?: string,
|};

export type FunctionAnnotation = {|
    +type: 'function',
    +text?: string,
|};

export type CircularRefAnnotation = {|
    +type: 'circular-ref',
    +text?: string,
|};

export type UnknownAnnotation = {|
    +type: 'unknown',
    +value: mixed,
    +text?: string,
|};

export type Annotation =
    | ObjectAnnotation
    | ArrayAnnotation
    | ScalarAnnotation
    | FunctionAnnotation
    | CircularRefAnnotation
    | UnknownAnnotation;

function brand<A: Annotation>(ann: A): A {
    _register.add(ann);
    return ann;
}

/**
 * Compute the number of annotations in an annotation tree. This number
 * can be used for efficient/compact rendering of error messages.
 *
 * For example, when formatting an error message for a long array of
 * inputs, it can be good to count how many already have been formatted,
 * to efficiently be able to truncate items that don't have error
 * messages, like:
 *
 *   [
 *     ⠇
 *     {
 *       "id": 42,
 *             ^^ Must be string
 *       ...
 *     },
 *     ...,
 *     {},
 *     ^^ Missing keys: "id"
 *     ...
 *   ]
 *
 */
function count(ann: Annotation): number {
    const self = ann.text !== undefined ? 1 : 0;
    const nested = ann.type === 'object' || ann.type === 'array' ? ann.subcount : 0;
    return self + nested;
}

export function object(
    fields: { +[key: string]: Annotation },
    text?: string,
): ObjectAnnotation {
    return brand({
        type: 'object',
        fields,
        text,
        subcount: Object.keys(fields).reduce(
            (total, field) => total + count(fields[field]),
            0,
        ),
    });
}

export function array(items: $ReadOnlyArray<Annotation>, text?: string): ArrayAnnotation {
    return brand({
        type: 'array',
        items,
        text,
        subcount: items.reduce((total, item) => total + count(item), 0),
    });
}

export function func(text?: string): FunctionAnnotation {
    return brand({
        type: 'function',
        text,
    });
}

export function unknown(value: mixed, text?: string): UnknownAnnotation {
    return brand({
        type: 'unknown',
        value,
        text,
    });
}

export function scalar(value: mixed, text?: string): ScalarAnnotation {
    return brand({
        type: 'scalar',
        value,
        text,
    });
}

export function circularRef(text?: string): CircularRefAnnotation {
    return brand({
        type: 'circular-ref',
        text,
    });
}

/**
 * Given an existing Annotation, set the annotation's text to a new value.
 */
export function updateText<A: Annotation>(annotation: A, text?: string): A {
    if (text !== undefined) {
        return brand({ ...annotation, text });
    } else {
        return annotation;
    }
}

/**
 * Given an existing ObjectAnnotation, merges new Annotations in there.
 */
export function merge(
    objAnnotation: ObjectAnnotation,
    fields: { +[key: string]: Annotation },
): ObjectAnnotation {
    const newFields = { ...objAnnotation.fields, ...fields };
    return object(newFields, objAnnotation.text);
}

export function asAnnotation(thing: mixed): Annotation | void {
    return typeof thing === 'object' && thing !== null && _register.has(thing)
        ? ((thing: cast): Annotation)
        : undefined;
}

type RefSet = WeakSet<{ ... } | $ReadOnlyArray<mixed>>;

function annotateArray(
    value: $ReadOnlyArray<mixed>,
    text?: string,
    seen: RefSet,
): ArrayAnnotation | CircularRefAnnotation {
    seen.add(value);

    const items = value.map((v) => annotate(v, undefined, seen));
    return array(items, text);
}

function annotateObject(
    obj: { +[string]: mixed },
    text?: string,
    seen: RefSet,
): ObjectAnnotation {
    seen.add(obj);

    const fields = {};
    Object.keys(obj).forEach((key) => {
        const value = obj[key];
        fields[key] = annotate(value, undefined, seen);
    });
    return object(fields, text);
}

function annotate(value: mixed, text?: string, seen: RefSet): Annotation {
    if (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'symbol' ||
        typeof value.getMonth === 'function'
    ) {
        return scalar(value, text);
    }

    const ann = asAnnotation(value);
    if (ann) {
        return updateText(ann, text);
    }

    if (Array.isArray(value)) {
        // "Circular references" can only exist in objects or arrays
        if (seen.has(value)) {
            return circularRef(text);
        } else {
            return annotateArray(value, text, seen);
        }
    }

    if (typeof value === 'object') {
        // "Circular references" can only exist in objects or arrays
        if (seen.has(value)) {
            return circularRef(text);
        } else {
            return annotateObject(value, text, seen);
        }
    }

    if (typeof value === 'function') {
        return func(text);
    }

    return unknown(value, text);
}

function public_annotate(value: mixed, text?: string): Annotation {
    return annotate(value, text, new WeakSet());
}

function public_annotateObject(
    obj: { +[string]: mixed },
    text?: string,
): ObjectAnnotation {
    return annotateObject(obj, text, new WeakSet());
}

export {
    // This construct just ensures the "seen" weakmap (used for circular
    // reference detection) isn't made part of the public API.
    public_annotate as annotate,
    public_annotateObject as annotateObject,
    //
    // NOTE: Don't acces theses private APIs directly. They are only exported here
    // to better enable unit testing.
    annotate as __private_annotate,
};
