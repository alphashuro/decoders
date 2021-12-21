import { Decoder, DecoderType } from '../_types';

export type Values<T extends object> = T[keyof T];

export function dispatch<T, V>(
    base: Decoder<T>,
    next: (base: T) => Decoder<V>,
): Decoder<V>;

export function disjointUnion<O extends { [key: string]: Decoder<any> }>(
    field: string,
    mapping: O,
): Decoder<Values<{ [key in keyof O]: DecoderType<O[key]> }>>;
