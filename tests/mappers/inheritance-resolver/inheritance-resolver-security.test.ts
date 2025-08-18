import { describe, it, expect, beforeEach } from 'bun:test';
import { constant, forEach, toLower } from 'lodash';
import { InheritanceResolver } from '../../../src/mappers/inheritance-resolver';
import { AmenityCategory } from '../../../src/types';
import type { UnitData, Amenity } from '../../../src/types';
import {
    buildingData,
    unitTypeData,
    createMaliciousUnit,
    createCircularAmenity,
    dangerousAmenity,
    createVeryLongString
} from './shared-fixtures';

describe('InheritanceResolver - Security Tests', () => {
    let resolver: InheritanceResolver;

    beforeEach(() => {
        resolver = new InheritanceResolver();
    });

    describe('Prototype Pollution Protection', () => {
        it('should not be vulnerable to prototype pollution', () => {
            const maliciousUnit = createMaliciousUnit();

            resolver.resolveUnitValues(maliciousUnit, unitTypeData, buildingData);

            // Check that Object prototype wasn't polluted
            expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
            expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        });

        it('should handle __proto__ in amenity names safely', () => {
            const merged = resolver.mergeAmenities([dangerousAmenity], [], []);

            expect(merged).toHaveLength(1);
            expect(merged[0].name).toBe('__proto__');
        });

        it('should handle constructor pollution attempts', () => {
            const maliciousData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                constructor: {
                    prototype: {
                        polluted: true
                    }
                }
            };

            resolver.resolveUnitValues(maliciousData as UnitData, unitTypeData, buildingData);

            // Ensure prototype pollution didn't occur
            expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
        });

        it('should handle Object.prototype pollution attempts through inheritance', () => {
            const maliciousUnitType = {
                ...unitTypeData,
                ['__proto__']: { polluted: true }
            };

            resolver.resolveUnitValues({
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001'
            }, maliciousUnitType as typeof unitTypeData, buildingData);

            // Check that pollution didn't occur
            expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
        });

        it('should safely handle attempts to modify Object.prototype through amenities', () => {
            const maliciousAmenities: Amenity[] = [
                {
                    name: 'constructor',
                    category: AmenityCategory.UNIT,
                    ['__proto__']: { polluted: true }
                } as Amenity
            ];

            const merged = resolver.mergeAmenities(maliciousAmenities, [], []);

            expect(merged).toHaveLength(1);
            expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
        });
    });

    describe('Circular References Security', () => {
        it('should handle objects with circular references safely', () => {
            const circularAmenity = createCircularAmenity();

            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitAmenities: [circularAmenity]
            };

            // This should not throw or cause infinite loop
            expect(() => {
                resolver.resolveUnitValues(unit, unitTypeData, buildingData);
            }).not.toThrow();
        });

        it('should handle deeply nested circular references', () => {
            const deepCircular: Record<string, unknown> = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                level1: {}
            };

            deepCircular.level1 = { level2: { level3: deepCircular } };

            expect(() => {
                resolver.resolveUnitValues(deepCircular as unknown as UnitData, unitTypeData, buildingData);
            }).not.toThrow();
        });

        it('should handle self-referencing arrays', () => {
            const selfRefArray: unknown[] = ['item1', 'item2'];
            selfRefArray.push(selfRefArray);

            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                photos: selfRefArray as string[]
            };

            expect(() => {
                resolver.resolveUnitValues(unit, unitTypeData, buildingData);
            }).not.toThrow();
        });

        it('should handle circular references in validation', () => {
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001'
            } as UnitData & { self?: UnitData };

            (unit as UnitData & { self?: UnitData }).self = unit;

            const requiredFields: (keyof UnitData)[] = ['buildingID', 'unitID'];

            expect(() => {
                resolver.validateRequiredFields(unit, requiredFields);
            }).not.toThrow();
        });
    });

    describe('Input Sanitization and Validation', () => {
        it('should handle malformed input objects gracefully', () => {
            const malformedUnit = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                // Malicious properties
                ['<script>alert("xss")</script>']: 'malicious',
                [Symbol.for('evil')]: 'symbol attack'
            };

            const resolved = resolver.resolveUnitValues(malformedUnit as UnitData, unitTypeData, buildingData);

            expect(resolved.buildingID).toBe('BLDG-001');
            expect(resolved.unitID).toBe('UNIT-001');
        });

        it('should handle extremely long property names', () => {
            const longPropertyName = toLower(createVeryLongString(10000));
            const unitWithLongProperty = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                [longPropertyName]: 'long property value'
            };

            expect(() => {
                resolver.resolveUnitValues(unitWithLongProperty as UnitData, unitTypeData, buildingData);
            }).not.toThrow();
        });

        it('should handle unicode and special characters in property names', () => {
            const unicodeUnit = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                ['🏠🔥💀']: 'emoji property',
                ['null\x00byte']: 'null byte property',
                ['\u0000\u0001\u0002']: 'control chars'
            };

            expect(() => {
                resolver.resolveUnitValues(unicodeUnit as UnitData, unitTypeData, buildingData);
            }).not.toThrow();
        });

        it('should handle attempts to override built-in methods', () => {
            const maliciousOverride = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                toString: constant('malicious override'),
                valueOf: constant('malicious value'),
                hasOwnProperty: constant(true),
                propertyIsEnumerable: constant(true)
            };

            const resolved = resolver.resolveUnitValues(maliciousOverride as UnitData, unitTypeData, buildingData);

            expect(resolved.buildingID).toBe('BLDG-001');
            expect(typeof resolved.toString).toBe('function');
        });
    });

    describe('Memory and Resource Safety', () => {
        it('should handle extremely large objects without memory issues', () => {
            const largeAmenityList = Array.from({ length: 10000 }, (_, i) => ({
                name: `LargeAmenity${i}`,
                category: AmenityCategory.UNIT,
                description: createVeryLongString(1000) // 1KB per amenity description
            }));

            const unitWithLargeData: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitAmenities: largeAmenityList
            };

            expect(() => {
                resolver.resolveUnitValues(unitWithLargeData, unitTypeData, buildingData);
            }).not.toThrow();
        });

        it('should handle nested objects with extreme depth', () => {
            let deepNested: Record<string, unknown> = { value: 'deep' };

            // Create 100 levels of nesting
            for(let i = 0; i < 100; i++) {
                deepNested = { [`level${i}`]: deepNested };
            }

            const unitWithDeepNesting: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                ...deepNested
            };

            expect(() => {
                resolver.resolveUnitValues(unitWithDeepNesting, unitTypeData, buildingData);
            }).not.toThrow();
        });

        it('should handle arrays with extreme sparsity', () => {
            const extremeSparseArray = new Array(1000000); // 1 million slots
            extremeSparseArray[0] = 'first';
            extremeSparseArray[999999] = 'last';

            const unitWithSparseArray: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                photos: extremeSparseArray
            };

            expect(() => {
                resolver.resolveUnitValues(unitWithSparseArray, unitTypeData, buildingData);
            }).not.toThrow();
        });
    });

    describe('Type Confusion Attacks', () => {
        it('should handle type confusion between objects and primitives', () => {
            const confusingUnit = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: { valueOf: constant(2), toString: constant('2') }, // Object pretending to be number
                rent: new String('1500') // String object instead of primitive
            };

            const resolved = resolver.resolveUnitValues(confusingUnit as unknown as UnitData, unitTypeData, buildingData);

            expect(typeof resolved.beds).toBe('object');
            expect(resolved.rent).toBeInstanceOf(String);
        });

        it('should handle function objects in unexpected places', () => {
            const functionAsProperty = constant('I am a function') as (() => string) & { beds: number, baths: number };
            functionAsProperty.beds = 2;
            functionAsProperty.baths = 1;

            const unitWithFunction: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitDescription: functionAsProperty as unknown as string
            };

            expect(() => {
                resolver.resolveUnitValues(unitWithFunction, unitTypeData, buildingData);
            }).not.toThrow();
        });

        it('should handle array-like objects that aren\'t arrays', () => {
            const fakeArray = {
                '0': 'photo1.jpg',
                '1': 'photo2.jpg',
                length: 2,
                push: Array.prototype.push
            };

            const unitWithFakeArray: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                photos: fakeArray as unknown as string[]
            };

            const resolved = resolver.resolveUnitValues(unitWithFakeArray, unitTypeData, buildingData);

            expect(resolved.photos as unknown).toBe(fakeArray);
        });
    });

    describe('Injection Prevention', () => {
        it('should handle potential script injection in string fields', () => {
            const maliciousStrings = [
                '<script>alert("xss")</script>',
                'javascript:alert(1)',
                'data:text/html,<script>alert(1)</script>',
                '${7*7}', // Template literal injection
                '#{7*7}', // Ruby-style injection
                '{{7*7}}' // Angular/Handlebars injection
            ];

            forEach(maliciousStrings, (maliciousString) => {
                const unit: UnitData = {
                    buildingID: 'BLDG-001',
                    unitID: 'UNIT-001',
                    unitDescription: maliciousString,
                    unitNumber: maliciousString
                };

                expect(() => {
                    resolver.resolveUnitValues(unit, unitTypeData, buildingData);
                }).not.toThrow();
            });
        });

        it('should handle potential SQL injection patterns', () => {
            const sqlInjectionPatterns = [
                "'; DROP TABLE units; --",
                "' OR '1'='1",
                '1; DELETE FROM buildings WHERE 1=1 --',
                'UNION SELECT * FROM sensitive_data --'
            ];

            forEach(sqlInjectionPatterns, (pattern) => {
                const unit: UnitData = {
                    buildingID: 'BLDG-001',
                    unitID: pattern,
                    unitNumber: pattern,
                    unitDescription: pattern
                };

                expect(() => {
                    resolver.resolveUnitValues(unit, unitTypeData, buildingData);
                }).not.toThrow();
            });
        });
    });
});
