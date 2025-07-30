import { describe, it, expect, beforeEach } from 'bun:test';
import { TransformerRegistry, createTransformerRegistry } from '../../../src/mappers/transformers/transformer-registry.js';
import type { TransformerFunction } from '../../../src/mappers/types.js';

describe('TransformerRegistry', () => {
    let registry: TransformerRegistry;

    beforeEach(() => {
        registry = new TransformerRegistry();
    });

    describe('register', () => {
        it('should register a transformer function', () => {
            const transformer: TransformerFunction<string, string> = value => value.toUpperCase();
            registry.register('uppercase', transformer);

            expect(registry.has('uppercase')).toBe(true);
        });

        it('should overwrite existing transformer with the same name', () => {
            const transformer1: TransformerFunction<string, string> = value => value.toUpperCase();
            const transformer2: TransformerFunction<string, string> = value => value.toLowerCase();

            registry.register('myTransformer', transformer1);
            registry.register('myTransformer', transformer2);

            const retrieved = registry.get('myTransformer');
            expect(retrieved).toBe(transformer2);
            expect(retrieved?.('TEST')).toBe('test');
        });

        it('should handle empty string as transformer name', () => {
            const transformer: TransformerFunction = value => value;
            registry.register('', transformer);

            expect(registry.has('')).toBe(true);
            expect(registry.get('')).toBe(transformer);
        });

        it('should handle special characters in transformer name', () => {
            const transformer: TransformerFunction = value => value;
            const specialName = '!@#$%^&*()_+-=[]{}|;\':",./<>?';
            registry.register(specialName, transformer);

            expect(registry.has(specialName)).toBe(true);
            expect(registry.get(specialName)).toBe(transformer);
        });
    });

    describe('get', () => {
        it('should retrieve a registered transformer', () => {
            const transformer: TransformerFunction<number, string> = value => value.toString();
            registry.register('toString', transformer);

            const retrieved = registry.get('toString');
            expect(retrieved).toBe(transformer);
            expect(retrieved?.(42)).toBe('42');
        });

        it('should return undefined for non-existent transformer', () => {
            const result = registry.get('nonExistent');
            expect(result).toBeUndefined();
        });

        it('should handle empty string lookup', () => {
            const result = registry.get('');
            expect(result).toBeUndefined();
        });

        it('should be case-sensitive', () => {
            const transformer: TransformerFunction = value => value;
            registry.register('myTransformer', transformer);

            expect(registry.get('myTransformer')).toBe(transformer);
            expect(registry.get('MyTransformer')).toBeUndefined();
            expect(registry.get('MYTRANSFORMER')).toBeUndefined();
        });
    });

    describe('has', () => {
        it('should return true for registered transformer', () => {
            const transformer: TransformerFunction = value => value;
            registry.register('exists', transformer);

            expect(registry.has('exists')).toBe(true);
        });

        it('should return false for non-existent transformer', () => {
            expect(registry.has('doesNotExist')).toBe(false);
        });

        it('should handle empty string check', () => {
            expect(registry.has('')).toBe(false);

            const transformer: TransformerFunction = value => value;
            registry.register('', transformer);

            expect(registry.has('')).toBe(true);
        });

        it('should be case-sensitive', () => {
            const transformer: TransformerFunction = value => value;
            registry.register('caseSensitive', transformer);

            expect(registry.has('caseSensitive')).toBe(true);
            expect(registry.has('CaseSensitive')).toBe(false);
            expect(registry.has('CASESENSITIVE')).toBe(false);
        });
    });

    describe('list', () => {
        it('should return empty array when no transformers registered', () => {
            expect(registry.list()).toEqual([]);
        });

        it('should return all registered transformer names', () => {
            registry.register('first', value => value);
            registry.register('second', value => value);
            registry.register('third', value => value);

            const names = registry.list();
            expect(names).toHaveLength(3);
            expect(names).toContain('first');
            expect(names).toContain('second');
            expect(names).toContain('third');
        });

        it('should not include duplicate names when overwriting', () => {
            registry.register('duplicate', value => value);
            registry.register('duplicate', value => value);

            const names = registry.list();
            expect(names).toHaveLength(1);
            expect(names).toContain('duplicate');
        });

        it('should include empty string if registered', () => {
            registry.register('', value => value);
            registry.register('normal', value => value);

            const names = registry.list();
            expect(names).toHaveLength(2);
            expect(names).toContain('');
            expect(names).toContain('normal');
        });

        it('should return a new array each time', () => {
            registry.register('test', value => value);

            const list1 = registry.list();
            const list2 = registry.list();

            expect(list1).not.toBe(list2);
            expect(list1).toEqual(list2);
        });
    });

    describe('clear', () => {
        it('should remove all registered transformers', () => {
            registry.register('one', value => value);
            registry.register('two', value => value);
            registry.register('three', value => value);

            expect(registry.list()).toHaveLength(3);

            registry.clear();

            expect(registry.list()).toHaveLength(0);
            expect(registry.has('one')).toBe(false);
            expect(registry.has('two')).toBe(false);
            expect(registry.has('three')).toBe(false);
        });

        it('should work on empty registry', () => {
            expect(() => registry.clear()).not.toThrow();
            expect(registry.list()).toHaveLength(0);
        });

        it('should allow registering new transformers after clear', () => {
            registry.register('before', value => value);
            registry.clear();
            registry.register('after', value => value);

            expect(registry.has('before')).toBe(false);
            expect(registry.has('after')).toBe(true);
            expect(registry.list()).toEqual(['after']);
        });
    });

    describe('transformer functions with parameters', () => {
        it('should handle transformer with optional parameters', () => {
            const multiplier: TransformerFunction<number, number> = (value, params) => {
                const factor = params?.factor as number || 1;
                return value * factor;
            };

            registry.register('multiply', multiplier);
            const transformer = registry.get('multiply');

            expect(transformer?.(5)).toBe(5); // No params, default factor = 1
            expect(transformer?.(5, { factor: 3 })).toBe(15);
            expect(transformer?.(10, { factor: 0.5 })).toBe(5);
        });

        it('should handle complex transformer with multiple parameters', () => {
            const formatter: TransformerFunction<Date, string> = (value, params) => {
                const format = params?.format as string || 'iso';
                const locale = params?.locale as string || 'en-US';

                if(format === 'iso') { return value.toISOString(); }
                if(format === 'locale') { return value.toLocaleDateString(locale); }
                return value.toString();
            };

            registry.register('dateFormat', formatter);
            const transformer = registry.get('dateFormat');
            const testDate = new Date('2024-01-15T12:00:00Z');

            expect(transformer?.(testDate)).toBe(testDate.toISOString());
            expect(transformer?.(testDate, { format: 'locale' })).toBe(testDate.toLocaleDateString('en-US'));
            expect(transformer?.(testDate, { format: 'locale', locale: 'de-DE' })).toBe(testDate.toLocaleDateString('de-DE'));
        });
    });

    describe('different transformer types', () => {
        it('should handle string transformers', () => {
            const trim: TransformerFunction<string, string> = value => value.trim();
            const reverse: TransformerFunction<string, string> = value => value.split('').reverse().join('');

            registry.register('trim', trim);
            registry.register('reverse', reverse);

            expect(registry.get('trim')?.('  hello  ')).toBe('hello');
            expect(registry.get('reverse')?.('hello')).toBe('olleh');
        });

        it('should handle number transformers', () => {
            const round: TransformerFunction<number, number> = value => Math.round(value);
            const percentage: TransformerFunction<number, string> = value => `${(value * 100).toFixed(2)}%`;

            registry.register('round', round);
            registry.register('percentage', percentage);

            expect(registry.get('round')?.(3.7)).toBe(4);
            expect(registry.get('percentage')?.(0.125)).toBe('12.50%');
        });

        it('should handle boolean transformers', () => {
            const negate: TransformerFunction<boolean, boolean> = value => !value;
            const toYesNo: TransformerFunction<boolean, string> = value => (value ? 'Yes' : 'No');

            registry.register('negate', negate);
            registry.register('toYesNo', toYesNo);

            expect(registry.get('negate')?.(true)).toBe(false);
            expect(registry.get('toYesNo')?.(true)).toBe('Yes');
            expect(registry.get('toYesNo')?.(false)).toBe('No');
        });

        it('should handle array transformers', () => {
            const joinArray: TransformerFunction<string[], string> = (value, params) => {
                const separator = params?.separator as string || ', ';
                return value.join(separator);
            };

            registry.register('join', joinArray);

            expect(registry.get('join')?.((['a', 'b', 'c']))).toBe('a, b, c');
            expect(registry.get('join')?.((['a', 'b', 'c']), { separator: '|' })).toBe('a|b|c');
        });

        it('should handle object transformers', () => {
            interface Person {
                firstName: string
                lastName: string
            }

            const fullName: TransformerFunction<Person, string> = (value) => {
                return `${value.firstName} ${value.lastName}`;
            };

            registry.register('fullName', fullName);

            const person: Person = { firstName: 'John', lastName: 'Doe' };
            expect(registry.get('fullName')?.(person)).toBe('John Doe');
        });

        it('should handle transformers that throw errors', () => {
            const errorTransformer: TransformerFunction = () => {
                throw new Error('Transform failed');
            };

            registry.register('error', errorTransformer);
            const transformer = registry.get('error');

            expect(() => transformer?.('any value')).toThrow('Transform failed');
        });

        it('should handle null/undefined transformers', () => {
            const nullHandler: TransformerFunction<string | null, string> = (value) => {
                return value ?? 'default';
            };

            registry.register('nullHandler', nullHandler);
            const transformer = registry.get('nullHandler');

            expect(transformer?.('hello')).toBe('hello');
            expect(transformer?.(null)).toBe('default');
        });
    });
});

describe('createTransformerRegistry', () => {
    it('should create a new TransformerRegistry instance', () => {
        const registry = createTransformerRegistry();
        expect(registry).toBeInstanceOf(TransformerRegistry);
    });

    it('should create empty registry without default transformers', () => {
        const registry = createTransformerRegistry();
        expect(registry.list()).toHaveLength(0);
    });

    it('should create independent instances', () => {
        const registry1 = createTransformerRegistry();
        const registry2 = createTransformerRegistry();

        registry1.register('test', value => value);

        expect(registry1.has('test')).toBe(true);
        expect(registry2.has('test')).toBe(false);
    });

    it('should create registry that supports all operations', () => {
        const registry = createTransformerRegistry();
        const transformer: TransformerFunction<string, string> = value => value.toUpperCase();

        // Test all methods work on created registry
        registry.register('upper', transformer);
        expect(registry.has('upper')).toBe(true);
        expect(registry.get('upper')).toBe(transformer);
        expect(registry.list()).toEqual(['upper']);

        registry.clear();
        expect(registry.list()).toHaveLength(0);
    });
});

describe('Integration tests', () => {
    it('should handle complex workflow with multiple transformers', () => {
        const registry = createTransformerRegistry();

        // Register various transformers
        registry.register('trim', (value: string) => value.trim());
        registry.register('uppercase', (value: string) => value.toUpperCase());
        registry.register('prefix', (value: string, params) => {
            const prefix = params?.prefix as string || '';
            return `${prefix}${value}`;
        });

        // Use transformers in sequence
        const input = '  hello world  ';
        let result = input;

        const trimmer = registry.get('trim');
        if(trimmer) { result = trimmer(result) as string; }

        const uppercaser = registry.get('uppercase');
        if(uppercaser) { result = uppercaser(result) as string; }

        const prefixer = registry.get('prefix');
        if(prefixer) { result = prefixer(result, { prefix: 'PROCESSED: ' }) as string; }

        expect(result).toBe('PROCESSED: HELLO WORLD');
    });

    it('should handle transformer registry lifecycle', () => {
        const registry = new TransformerRegistry();

        // Start empty
        expect(registry.list()).toEqual([]);

        // Add transformers
        registry.register('t1', v => v);
        registry.register('t2', v => v);
        expect(registry.list()).toHaveLength(2);

        // Overwrite one
        registry.register('t1', (v: number) => v * 2);
        expect(registry.list()).toHaveLength(2);
        expect(registry.get('t1')?.(5)).toBe(10);

        // Clear all
        registry.clear();
        expect(registry.list()).toEqual([]);
        expect(registry.has('t1')).toBe(false);
        expect(registry.has('t2')).toBe(false);
    });
});
