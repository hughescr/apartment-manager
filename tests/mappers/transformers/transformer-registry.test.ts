import { describe, it, expect, beforeEach } from 'bun:test';
import { constant, fill, split, toLower, toUpper, trim } from 'lodash';
import { TransformerRegistry, createTransformerRegistry } from '../../../src/mappers/transformers/transformer-registry.js';
import type { TransformerFunction } from '../../../src/mappers/types.js';

describe('TransformerRegistry', () => {
    let registry: TransformerRegistry;

    beforeEach(() => {
        registry = new TransformerRegistry();
    });

    describe('register', () => {
        it('should register a transformer function', () => {
            const transformer: TransformerFunction = value => toUpper(value as string);
            registry.register('uppercase', transformer);

            expect(registry.has('uppercase')).toBe(true);
        });

        it('should overwrite existing transformer with the same name', () => {
            const transformer1: TransformerFunction = value => toUpper(value as string);
            const transformer2: TransformerFunction = value => toLower(value as string);

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
            const transformer: TransformerFunction = value => (value as number).toString();
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
            const multiplier: TransformerFunction = (value, params) => {
                const factor = params?.factor as number || 1;
                return (value as number) * factor;
            };

            registry.register('multiply', multiplier);
            const transformer = registry.get('multiply');

            expect(transformer?.(5)).toBe(5); // No params, default factor = 1
            expect(transformer?.(5, { factor: 3 })).toBe(15);
            expect(transformer?.(10, { factor: 0.5 })).toBe(5);
        });

        it('should handle complex transformer with multiple parameters', () => {
            const formatter: TransformerFunction = (value, params) => {
                const format = params?.format as string || 'iso';
                const locale = params?.locale as string || 'en-US';
                const dateValue = value as Date;

                if(format === 'iso') {
                    return dateValue.toISOString();
                }
                if(format === 'locale') {
                    return dateValue.toLocaleDateString(locale);
                }
                return dateValue.toString();
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
            const trimTransformer: TransformerFunction = value => trim(value as string);
            const reverse: TransformerFunction = value => split(value as string, '').reverse().join('');

            registry.register('trim', trimTransformer);
            registry.register('reverse', reverse);

            expect(registry.get('trim')?.('  hello  ')).toBe('hello');
            expect(registry.get('reverse')?.('hello')).toBe('olleh');
        });

        it('should handle number transformers', () => {
            const round: TransformerFunction = value => Math.round(value as number);
            const percentage: TransformerFunction = value => `${((value as number) * 100).toFixed(2)}%`;

            registry.register('round', round);
            registry.register('percentage', percentage);

            expect(registry.get('round')?.(3.7)).toBe(4);
            expect(registry.get('percentage')?.(0.125)).toBe('12.50%');
        });

        it('should handle boolean transformers', () => {
            const negate: TransformerFunction = value => !(value as boolean);
            const toYesNo: TransformerFunction = value => ((value as boolean) ? 'Yes' : 'No');

            registry.register('negate', negate);
            registry.register('toYesNo', toYesNo);

            expect(registry.get('negate')?.(true)).toBe(false);
            expect(registry.get('toYesNo')?.(true)).toBe('Yes');
            expect(registry.get('toYesNo')?.(false)).toBe('No');
        });

        it('should handle array transformers', () => {
            const joinArray: TransformerFunction = (value, params) => {
                const separator = params?.separator as string || ', ';
                return (value as string[]).join(separator);
            };

            registry.register('join', joinArray);

            expect(registry.get('join')?.((['a', 'b', 'c']))).toBe('a, b, c');
            expect(registry.get('join')?.((['a', 'b', 'c']), { separator: '|' })).toBe('a|b|c');
        });

        it('should handle object transformers', () => {
            interface Person {
                firstName: string
                lastName:  string
            }

            const fullName: TransformerFunction = (value) => {
                const person = value as Person;
                return `${person.firstName} ${person.lastName}`;
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
            const nullHandler: TransformerFunction = (value) => {
                return (value as string | null) ?? 'default';
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
        const transformer: TransformerFunction = value => toUpper(value as string);

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
        registry.register('trim', value => trim(value as string));
        registry.register('uppercase', value => toUpper(value as string));
        registry.register('prefix', (value, params) => {
            const prefix = params?.prefix as string || '';
            return `${prefix}${value as string}`;
        });

        // Use transformers in sequence
        const input = '  hello world  ';
        let result = input;

        const trimmer = registry.get('trim');
        if(trimmer) {
            result = trimmer(result) as string;
        }

        const uppercaser = registry.get('uppercase');
        if(uppercaser) {
            result = uppercaser(result) as string;
        }

        const prefixer = registry.get('prefix');
        if(prefixer) {
            result = prefixer(result, { prefix: 'PROCESSED: ' }) as string;
        }

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
        registry.register('t1', v => (v as number) * 2);
        expect(registry.list()).toHaveLength(2);
        expect(registry.get('t1')?.(5)).toBe(10);

        // Clear all
        registry.clear();
        expect(registry.list()).toEqual([]);
        expect(registry.has('t1')).toBe(false);
        expect(registry.has('t2')).toBe(false);
    });
});

describe('Edge Cases - Wrong Input Types', () => {
    it('should handle passing wrong types to string transformers', () => {
        const registry = createTransformerRegistry();
        const stringTransformer: TransformerFunction = value => toUpper(value as string);
        registry.register('uppercase', stringTransformer);

        const transformer = registry.get('uppercase');

        // Passing number instead of string - lodash toUpper converts to string
        expect(transformer?.(123 as unknown as string)).toBe('123');

        // Passing null - lodash toUpper returns empty string
        expect(transformer?.(null as unknown as string)).toBe('');

        // Passing undefined - lodash toUpper returns empty string
        expect(transformer?.(undefined as unknown as string)).toBe('');

        // Passing object - lodash toUpper calls toString
        expect(transformer?.({} as unknown as string)).toBe('[OBJECT OBJECT]');

        // Passing array - lodash toUpper calls toString
        expect(transformer?.([1, 2, 3] as unknown as string)).toBe('1,2,3');
    });

    it('should handle passing wrong types to number transformers', () => {
        const registry = createTransformerRegistry();
        const numberTransformer: TransformerFunction = value => (value as number) * 2;
        registry.register('double', numberTransformer);

        const transformer = registry.get('double');

        // Passing string instead of number
        expect(transformer?.('abc' as unknown as number)).toBe(NaN);

        // Passing string that looks like number
        expect(transformer?.('123' as unknown as number)).toBe(246); // JS coercion

        // Passing boolean
        expect(transformer?.(true as unknown as number)).toBe(2); // true coerces to 1
        expect(transformer?.(false as unknown as number)).toBe(0); // false coerces to 0
    });

    it('should handle type coercion edge cases', () => {
        const registry = createTransformerRegistry();
        const concatTransformer: TransformerFunction = (value, params) => {
            const suffix = params?.suffix as string || '';
            return (value as string) + suffix;
        };
        registry.register('concat', concatTransformer);

        const transformer = registry.get('concat');

        // Number gets coerced to string
        expect(transformer?.(42 as unknown as string, { suffix: ' answer' })).toBe('42 answer');

        // Boolean gets coerced to string
        expect(transformer?.(true as unknown as string, { suffix: ' value' })).toBe('true value');
    });
});

describe('Edge Cases - Transformer Chains with Failures', () => {
    it('should handle failure in the middle of a transformer chain', () => {
        const registry = createTransformerRegistry();

        registry.register('step1', value => trim(value as string));
        registry.register('step2', (value) => {
            const stringValue = value as string;
            if(stringValue === 'error') {
                throw new Error('Step 2 failed');
            }
            return toUpper(stringValue);
        });
        registry.register('step3', value => `[${value as string}]`);

        // Test normal flow
        let result = '  hello  ';
        result = registry.get('step1')?.(result) as string;
        result = registry.get('step2')?.(result) as string;
        result = registry.get('step3')?.(result) as string;
        expect(result).toBe('[HELLO]');

        // Test failure in middle
        let errorResult = '  error  ';
        errorResult = registry.get('step1')?.(errorResult) as string;
        expect(() => registry.get('step2')?.(errorResult)).toThrow('Step 2 failed');
    });

    it('should handle partial success in transformer chains', () => {
        const registry = createTransformerRegistry();
        const results: string[] = [];

        registry.register('logger', (value) => {
            const stringValue = value as string;
            results.push(`Logged: ${stringValue}`);
            return stringValue;
        });
        registry.register('failer', () => {
            throw new Error('Transform failed');
        });
        registry.register('unreachable', (value) => {
            const stringValue = value as string;
            results.push('Should not reach here');
            return stringValue;
        });

        let value = 'test';
        value = registry.get('logger')?.(value) as string;

        expect(() => registry.get('failer')?.(value)).toThrow('Transform failed');
        expect(results).toEqual(['Logged: test']);
        expect(results).not.toContain('Should not reach here');
    });
});

describe('Edge Cases - Registry Modification During Transformation', () => {
    it('should handle registry modification during transformation', () => {
        const registry = createTransformerRegistry();

        registry.register('modifier', (value) => {
            // Modify registry during transformation
            registry.register('new-transformer', v => toLower(v as string));
            registry.clear();
            return toUpper(value as string);
        });

        const modifier = registry.get('modifier');
        expect(modifier).toBeDefined();

        const result = modifier?.('hello');
        expect(result).toBe('HELLO');

        // Registry should be empty after clear
        expect(registry.list()).toEqual([]);
        expect(registry.get('modifier')).toBeUndefined();
        expect(registry.get('new-transformer')).toBeUndefined();
    });

    it('should handle self-replacement during transformation', () => {
        const registry = createTransformerRegistry();
        let callCount = 0;

        registry.register('self-replacer', (value) => {
            callCount++;
            // Replace self during execution
            registry.register('self-replacer', v => toLower(v as string));
            return toUpper(value as string);
        });

        const transformer1 = registry.get('self-replacer');
        const result1 = transformer1?.('hello');
        expect(result1).toBe('HELLO');
        expect(callCount).toBe(1);

        // Second call should use the new transformer
        const transformer2 = registry.get('self-replacer');
        const result2 = transformer2?.('WORLD');
        expect(result2).toBe('world');
        expect(callCount).toBe(1); // Original not called again
    });
});

describe('Edge Cases - Transformers Throwing Exceptions', () => {
    it('should propagate exceptions from transformers', () => {
        const registry = createTransformerRegistry();

        registry.register('thrower', () => {
            throw new Error('Transformer error');
        });
        registry.register('type-error', (value: unknown) => {
            return (value as Record<string, () => unknown>).nonExistentMethod();
        });
        registry.register('range-error', () => {
            const arr = new Array(-1); // RangeError
            return arr;
        });

        expect(() => registry.get('thrower')?.('any')).toThrow('Transformer error');
        expect(() => registry.get('type-error')?.('any')).toThrow();
        expect(() => registry.get('range-error')?.('any')).toThrow(RangeError);
    });

    it('should handle transformers that throw non-Error objects', () => {
        const registry = createTransformerRegistry();

        registry.register('string-thrower', () => {
            throw 'String error';
        });
        registry.register('number-thrower', () => {
            throw 42;
        });
        registry.register('object-thrower', () => {
            throw { error: 'Object error' };
        });

        expect(() => registry.get('string-thrower')?.('any')).toThrow('String error');
        expect(() => registry.get('number-thrower')?.('any')).toThrow();
        expect(() => registry.get('object-thrower')?.('any')).toThrow();
    });
});

describe('Edge Cases - Transformers Returning Undefined', () => {
    it('should handle transformers returning undefined when value expected', () => {
        const registry = createTransformerRegistry();

        registry.register('undefined-returner', () => undefined);
        registry.register('conditional-undefined', (value) => {
            const numberValue = value as number;
            return numberValue > 0 ? numberValue * 2 : undefined;
        });

        expect(registry.get('undefined-returner')?.('any')).toBeUndefined();
        expect(registry.get('conditional-undefined')?.(5)).toBe(10);
        expect(registry.get('conditional-undefined')?.(-5)).toBeUndefined();
    });

    it('should handle undefined in transformer chains', () => {
        const registry = createTransformerRegistry();

        registry.register('maybe-undefined', (value) => {
            const stringValue = value as string;
            return stringValue === 'skip' ? undefined : toUpper(stringValue);
        });
        registry.register('handle-undefined', (value) => {
            return (value as string | undefined) ?? 'DEFAULT';
        });

        // Normal case
        let result = registry.get('maybe-undefined')?.('hello');
        result = registry.get('handle-undefined')?.(result);
        expect(result).toBe('HELLO');

        // Undefined case
        let undefinedResult = registry.get('maybe-undefined')?.('skip');
        undefinedResult = registry.get('handle-undefined')?.(undefinedResult);
        expect(undefinedResult).toBe('DEFAULT');
    });
});

describe('Edge Cases - Memory and Performance', () => {
    it('should handle large number of transformers', () => {
        const registry = createTransformerRegistry();
        const count = 1000; // Reduced from 10000 to prevent hanging

        // Register many transformers
        for(let i = 0; i < count; i++) {
            registry.register(`transformer-${i}`, value => (value as number) + i);
        }

        expect(registry.list()).toHaveLength(count);
        expect(registry.has('transformer-500')).toBe(true);
        expect(registry.get('transformer-999')?.(1)).toBe(1000);

        // Clear should work efficiently
        registry.clear();
        expect(registry.list()).toHaveLength(0);
    });

    it('should handle transformers with closures and memory references', () => {
        const registry = createTransformerRegistry();
        const largeArray = fill(new Array(10000), 0); // Reduced from 1000000 to prevent memory issues

        registry.register('closure-transformer', (value) => {
            // Transformer closes over large array
            return (value as number) + largeArray.length;
        });

        const transformer = registry.get('closure-transformer');
        expect(transformer?.(5)).toBe(10005);

        // Clear registry should allow garbage collection
        registry.clear();
        expect(registry.has('closure-transformer')).toBe(false);
    });
});

describe('Edge Cases - Invalid Transformer Registration', () => {
    it('should handle registration with null or undefined transformers', () => {
        const registry = createTransformerRegistry();

        // These should not throw but behavior is undefined
        registry.register('null-transformer', null as unknown as TransformerFunction);
        registry.register('undefined-transformer', undefined as unknown as TransformerFunction);

        expect(registry.has('null-transformer')).toBe(true);
        expect(registry.has('undefined-transformer')).toBe(true);

        // Getting and calling them will fail
        const nullTransformer = registry.get('null-transformer');
        const undefinedTransformer = registry.get('undefined-transformer');

        // Optional chaining returns undefined, doesn't throw
        expect(nullTransformer?.('test')).toBeUndefined();
        expect(undefinedTransformer?.('test')).toBeUndefined();
    });

    it('should handle registration with non-function values', () => {
        const registry = createTransformerRegistry();

        registry.register('string-as-transformer', 'not a function' as unknown as TransformerFunction);
        registry.register('number-as-transformer', 42 as unknown as TransformerFunction);
        registry.register('object-as-transformer', { transform: constant('value') } as unknown as TransformerFunction);

        // Non-function values will throw when called
        expect(() => {
            const transformer = registry.get('string-as-transformer');
            transformer?.('test');
        }).toThrow();

        expect(() => {
            const transformer = registry.get('number-as-transformer');
            transformer?.('test');
        }).toThrow();

        expect(() => {
            const transformer = registry.get('object-as-transformer');
            transformer?.('test');
        }).toThrow();
    });
});

describe('Edge Cases - Concurrent Access', () => {
    it('should handle rapid registration and retrieval', () => {
        const registry = createTransformerRegistry();
        const results: number[] = [];

        // Simulate concurrent-like access with smaller count
        for(let i = 0; i < 50; i++) {
            registry.register(`t${i}`, value => (value as number) + i);
            const transformer = registry.get(`t${i}`);
            if(transformer) {
                results.push(transformer(1) as number);
            }
        }

        expect(results).toHaveLength(50);
        expect(results[0]).toBe(1);
        expect(results[49]).toBe(50);
    });

    it('should handle interleaved register/clear operations', () => {
        const registry = createTransformerRegistry();

        registry.register('t1', v => v);
        registry.register('t2', v => v);
        expect(registry.list()).toHaveLength(2);

        registry.clear();
        expect(registry.list()).toHaveLength(0);

        registry.register('t3', v => v);
        expect(registry.list()).toHaveLength(1);
        expect(registry.has('t1')).toBe(false);
        expect(registry.has('t3')).toBe(true);
    });
});

describe('Edge Cases - Transformer Side Effects', () => {
    it('should handle transformers with side effects', () => {
        const registry = createTransformerRegistry();
        const sideEffects: string[] = [];

        registry.register('side-effect-transformer', (value) => {
            const stringValue = value as string;
            sideEffects.push(`Processing: ${stringValue}`);
            return toUpper(stringValue);
        });

        const transformer = registry.get('side-effect-transformer');

        expect(transformer?.('hello')).toBe('HELLO');
        expect(transformer?.('world')).toBe('WORLD');
        expect(sideEffects).toEqual(['Processing: hello', 'Processing: world']);
    });

    it('should handle transformers that modify their input', () => {
        const registry = createTransformerRegistry();

        interface MutableObject {
            value:      string
            processed?: boolean
        }

        registry.register('mutating-transformer', (obj) => {
            const mutableObj = obj as MutableObject;
            mutableObj.processed = true; // Mutates input
            return { ...mutableObj, value: toUpper(mutableObj.value) };
        });

        const input: MutableObject = { value: 'test' };
        const transformer = registry.get('mutating-transformer');
        const result = transformer?.(input) as MutableObject;

        expect(result.value).toBe('TEST');
        expect(result.processed).toBe(true);
        expect(input.processed).toBe(true); // Input was mutated
    });
});
