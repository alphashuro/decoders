// @flow strict
/* eslint-disable no-restricted-syntax */

import { coalesce, maybe, nullable, optional } from '../optional';
import { INPUTS } from './fixtures';
import { partition } from 'itertools';
import { string } from '../string';
import { unwrap } from '../../result';

describe('optional', () => {
    const decoder = optional(string);
    const [okay, not_okay] = partition(INPUTS, (x) => typeof x === 'string');

    it('valid', () => {
        expect(okay.length).not.toBe(0);
        expect(unwrap(decoder(undefined))).toBe(undefined);
        for (const value of okay) {
            expect(unwrap(decoder(value))).toBe(value);
        }
    });

    it('invalid', () => {
        expect(not_okay.length).not.toBe(0);
        for (const value of not_okay) {
            if (value === undefined) continue;
            expect(decoder(value).ok).toBe(false);
        }
    });
});

describe('nullable', () => {
    const decoder = nullable(string);
    const [okay, not_okay] = partition(INPUTS, (x) => typeof x === 'string');

    it('valid', () => {
        expect(okay.length).not.toBe(0);
        expect(unwrap(decoder(null))).toBe(null);
        for (const value of okay) {
            expect(unwrap(decoder(value))).toBe(value);
        }
    });

    it('invalid', () => {
        expect(not_okay.length).not.toBe(0);
        for (const value of not_okay) {
            if (value === null) continue;
            expect(decoder(value).ok).toBe(false);
        }
    });
});

describe('maybe', () => {
    const decoder = maybe(string);
    const [okay, not_okay] = partition(INPUTS, (x) => typeof x === 'string');

    it('valid', () => {
        expect(okay.length).not.toBe(0);
        expect(unwrap(decoder(null))).toBe(null);
        expect(unwrap(decoder(undefined))).toBe(undefined);
        for (const value of okay) {
            expect(unwrap(decoder(value))).toBe(value);
        }
    });

    it('allowNull', () => {
        // No difference when decoding undefined
        expect(unwrap(decoder(undefined))).toBeUndefined();
        expect(unwrap(decoder(null))).toBeNull();

        // No difference when string-decoding
        expect(unwrap(decoder(''))).toBe('');
        expect(unwrap(decoder('foo'))).toBe('foo');
    });

    it('invalid', () => {
        expect(not_okay.length).not.toBe(0);
        for (const value of not_okay) {
            if (value === undefined) continue;
            if (value === null) continue;
            expect(decoder(value).ok).toBe(false);
        }
    });
});

describe('coalesce', () => {
    const decoder = coalesce(maybe(string), 42);
    const [okay, not_okay] = partition(
        INPUTS,
        (x) => typeof x === 'string' || x === null || x === undefined,
    );

    it('accepts', () => {
        expect(okay.length).not.toBe(0);
        expect(decoder(null).value).toBe(42);
        expect(decoder(undefined).value).toBe(42);
        expect(decoder('hi').value).toBe('hi');
        for (const value of okay) {
            expect(decoder(value).value).toBe(value);
        }
    });

    it('rejects', () => {
        expect(not_okay.length).not.toBe(0);
        for (const value of not_okay) {
            expect(decoder(value).ok).toBe(false);
        }
    });
});
