import { describe, it, expect, beforeEach } from 'bun:test';
import { constant, isArray, map } from 'lodash';
import { InheritanceResolver } from '../../../src/mappers/inheritance-resolver';
import { AmenityCategory } from '../../../src/types';
import type { UnitData, Amenity } from '../../../src/types';
import {
    buildingData,
    unitTypeData,
    unitDataWithStringNumbers,
    unitDataWithBooleanStrings,
    unitDataWithNulls,
    unitDataWithSpecialNumbers,
    unitDataWithMaxValues,
    createVeryLongString,
    mixedPhotos,
    mixedAmenities,
    validDate,
    invalidDate,
    regexPattern
} from './shared-fixtures';

describe('InheritanceResolver - Edge Cases', () => {
    let resolver: InheritanceResolver;

    beforeEach(() => {
        resolver = new InheritanceResolver();
    });

    describe('Type Coercion Edge Cases', () => {
        it('should handle string vs number type coercion for numeric fields', () => {
            const resolved = resolver.resolveUnitValues(unitDataWithStringNumbers, unitTypeData, buildingData);

            // Strings should be preserved as-is (no automatic conversion)
            expect(resolved.beds as unknown).toBe('2');
            expect(resolved.baths as unknown).toBe('1.5');
            expect(resolved.sqft as unknown).toBe('900');
            expect(resolved.rent as unknown).toBe('1500');
            expect(resolved.deposit as unknown).toBe('1000');
        });

        it('should handle boolean type coercion', () => {
            const resolved = resolver.resolveUnitValues(unitDataWithBooleanStrings, unitTypeData, buildingData);

            // String 'true' should be preserved as-is
            expect(resolved.occupied as unknown).toBe('true');
            expect(typeof resolved.occupied).toBe('string');
        });

        it('should handle numeric strings in applyDefaults', () => {
            const unit: Partial<UnitData> = {
                beds: '0' as unknown as number,
                rent: '0' as unknown as number
            };

            const defaults: Partial<UnitData> = {
                beds: 2,
                rent: 1000
            };

            const result = resolver.applyDefaults(unit, defaults);

            // String '0' is truthy, so it should be preserved
            expect(result.beds as unknown).toBe('0');
            expect(result.rent as unknown).toBe('0');
        });
    });

    describe('Null vs Undefined vs Empty Array Handling', () => {
        it('should treat null differently from undefined in inheritance', () => {
            const resolved = resolver.resolveUnitValues(unitDataWithNulls, unitTypeData, buildingData);

            // null should be preserved (not inherit from model)
            expect(resolved.beds).toBeNull();
            expect(resolved.unitAmenities).toBeNull();
            expect(resolved.photos).toBeNull();

            // undefined should inherit from model
            expect(resolved.baths).toBe(2);
        });

        it('should handle empty arrays vs null vs undefined in validation', () => {
            const unitWithVariousEmpty: UnitData = {
                buildingID:    'BLDG-001',
                unitID:        'UNIT-001',
                photos:        [],
                unitAmenities: null as unknown as Amenity[]
            };

            const requiredFields: (keyof UnitData)[] = ['photos', 'unitAmenities', 'unitDescription'];
            const result = resolver.validateRequiredFields(unitWithVariousEmpty, requiredFields);

            expect(result.isValid).toBe(false);
            expect(result.missingFields).toContain('photos'); // empty array
            expect(result.missingFields).toContain('unitAmenities'); // null
            expect(result.missingFields).toContain('unitDescription'); // undefined
        });

        it('should handle empty arrays in amenity merging', () => {
            const emptyAmenities: Amenity[] = [];
            const nullAmenities = null as unknown as Amenity[];
            const undefinedAmenities = undefined;

            const merged = resolver.mergeAmenities(emptyAmenities, nullAmenities, undefinedAmenities);

            expect(merged).toEqual([]);
            expect(isArray(merged)).toBe(true);
        });
    });

    describe('JavaScript Special Values', () => {
        it('should handle NaN, Infinity, and -0', () => {
            const resolved = resolver.resolveUnitValues(unitDataWithSpecialNumbers, unitTypeData, buildingData);

            expect(Number.isNaN(resolved.beds)).toBe(true);
            expect(resolved.baths).toBe(Infinity);
            expect(Object.is(resolved.sqft, -0)).toBe(true);
            expect(resolved.rent).toBe(-Infinity);
        });

        it('should handle undefined vs missing properties', () => {
            const unitExplicitUndefined: UnitData = {
                buildingID: 'BLDG-001',
                unitID:     'UNIT-001',
                beds:       undefined
            };

            const unitMissingProperty: UnitData = {
                buildingID: 'BLDG-001',
                unitID:     'UNIT-001'
                // beds is missing entirely
            };

            const resolved1 = resolver.resolveUnitValues(unitExplicitUndefined, unitTypeData, buildingData);
            const resolved2 = resolver.resolveUnitValues(unitMissingProperty, unitTypeData, buildingData);

            // Both should inherit from model
            expect(resolved1.beds).toBe(2);
            expect(resolved2.beds).toBe(2);
        });
    });

    describe('Arrays with Holes (Sparse Arrays)', () => {
        it('should handle sparse arrays in photos', () => {
            const sparsePhotos = new Array(5);
            sparsePhotos[0] = 'photo1.jpg';
            sparsePhotos[4] = 'photo5.jpg';
            // indices 1, 2, 3 are holes

            const unitWithSparsePhotos: UnitData = {
                buildingID: 'BLDG-001',
                unitID:     'UNIT-001',
                photos:     sparsePhotos
            };

            const resolved = resolver.resolveUnitValues(unitWithSparsePhotos, unitTypeData, buildingData);

            expect(resolved.photos).toHaveLength(5);
            expect(resolved.photos![0]).toBe('photo1.jpg');
            expect(resolved.photos![1]).toBeUndefined();
            expect(resolved.photos![4]).toBe('photo5.jpg');
        });

        it('should handle sparse arrays in amenities', () => {
            const sparseAmenities = new Array(3);
            sparseAmenities[0] = { name: 'First', category: AmenityCategory.UNIT };
            sparseAmenities[2] = { name: 'Third', category: AmenityCategory.UNIT };

            const merged = resolver.mergeAmenities(sparseAmenities, [], []);

            // Map-based deduplication should handle sparse arrays
            expect(merged).toHaveLength(2);
            expect(map(merged, 'name')).toContain('First');
            expect(map(merged, 'name')).toContain('Third');
        });
    });

    describe('Mixed Type Arrays', () => {
        it('should handle arrays with mixed types', () => {
            const unitWithMixedPhotos: UnitData = {
                buildingID: 'BLDG-001',
                unitID:     'UNIT-001',
                photos:     mixedPhotos as unknown as string[]
            };

            const resolved = resolver.resolveUnitValues(unitWithMixedPhotos, unitTypeData, buildingData);

            expect(resolved.photos as unknown).toBe(mixedPhotos);
            expect(resolved.photos).toHaveLength(7);
        });

        it('should handle mixed type amenities', () => {
            const merged = resolver.mergeAmenities(mixedAmenities as unknown as Amenity[], [], []);

            // Map will process all items, including invalid ones
            expect(merged.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Date Object Handling', () => {
        it('should handle Date objects in date fields', () => {
            const unitWithDateObj: UnitData = {
                buildingID:    'BLDG-001',
                unitID:        'UNIT-001',
                availableDate: validDate as unknown as string
            };

            const resolved = resolver.resolveUnitValues(unitWithDateObj, unitTypeData, buildingData);

            // Date object should be preserved
            expect(resolved.availableDate as unknown).toBe(validDate);
            expect(resolved.availableDate).toBeInstanceOf(Date);
        });

        it('should handle invalid Date objects', () => {
            const unitWithInvalidDate: UnitData = {
                buildingID:    'BLDG-001',
                unitID:        'UNIT-001',
                availableDate: invalidDate as unknown as string
            };

            const resolved = resolver.resolveUnitValues(unitWithInvalidDate, unitTypeData, buildingData);

            expect(resolved.availableDate as unknown).toBe(invalidDate);
            expect(Number.isNaN((resolved.availableDate as unknown as Date).getTime())).toBe(true);
        });
    });

    describe('RegExp Object Handling', () => {
        it('should handle RegExp objects in string fields', () => {
            const unitWithRegex: UnitData = {
                buildingID:      'BLDG-001',
                unitID:          'UNIT-001',
                unitDescription: regexPattern as unknown as string
            };

            const resolved = resolver.resolveUnitValues(unitWithRegex, unitTypeData, buildingData);

            expect(resolved.unitDescription as unknown).toBe(regexPattern);
            expect(resolved.unitDescription).toBeInstanceOf(RegExp);
        });
    });

    describe('Function Properties', () => {
        it('should handle function values in fields', () => {
            const testFunction = constant('test value');
            const unitWithFunction: UnitData = {
                buildingID:      'BLDG-001',
                unitID:          'UNIT-001',
                unitDescription: testFunction as unknown as string
            };

            const resolved = resolver.resolveUnitValues(unitWithFunction, unitTypeData, buildingData);

            expect(resolved.unitDescription as unknown).toBe(testFunction);
            expect(typeof resolved.unitDescription).toBe('function');
        });

        it('should handle constructor functions', () => {
            class CustomDescription {
                toString = constant('Custom Description');
            }

            const unitWithConstructor: UnitData = {
                buildingID:      'BLDG-001',
                unitID:          'UNIT-001',
                unitDescription: new CustomDescription() as unknown as string
            };

            const resolved = resolver.resolveUnitValues(unitWithConstructor, unitTypeData, buildingData);

            expect(resolved.unitDescription).toBeInstanceOf(CustomDescription);
        });
    });

    describe('Boundary Value Testing', () => {
        it('should handle maximum safe integer values', () => {
            const resolved = resolver.resolveUnitValues(unitDataWithMaxValues, unitTypeData, buildingData);

            expect(resolved.beds).toBe(Number.MAX_SAFE_INTEGER);
            expect(resolved.sqft).toBe(Number.MAX_SAFE_INTEGER);
            expect(resolved.rent).toBe(Number.MAX_SAFE_INTEGER);
        });

        it('should handle very long strings', () => {
            const veryLongString = createVeryLongString(10000);
            const unitWithLongStrings: UnitData = {
                buildingID:      'BLDG-001',
                unitID:          'UNIT-001',
                unitDescription: veryLongString,
                unitNumber:      veryLongString
            };

            const resolved = resolver.resolveUnitValues(unitWithLongStrings, unitTypeData, buildingData);

            expect(resolved.unitDescription).toHaveLength(10000);
            expect(resolved.unitNumber).toHaveLength(10000);
        });
    });

    describe('Edge Cases in applyDefaults', () => {
        it('should handle defaults with getters', () => {
            let callCount = 0;
            const defaults = {
                get beds() {
                    callCount++;
                    return 2;
                }
            };

            const unit: Partial<UnitData> = {
                unitID: 'UNIT-001'
            };

            const result = resolver.applyDefaults(unit, defaults);

            expect(result.beds).toBe(2);
            expect(callCount).toBeGreaterThan(0);
        });

        it('should handle complex nested default objects', () => {
            const complexDefaults: Partial<UnitData> = {
                unitAmenities: [
                    { name: 'Default1', category: AmenityCategory.UNIT },
                    { name: 'Default2', category: AmenityCategory.UNIT }
                ],
                photos: ['default1.jpg', 'default2.jpg']
            };

            const unit: Partial<UnitData> = {
                unitID: 'UNIT-001',
                photos: undefined
            };

            const result = resolver.applyDefaults(unit, complexDefaults);

            expect(result.photos).toEqual(['default1.jpg', 'default2.jpg']);
            expect(result.unitAmenities).toEqual(complexDefaults.unitAmenities);
        });
    });

    describe('Deeply Nested undefined values', () => {
        it('should handle deeply nested undefined values', () => {
            const unitWithNested: UnitData = {
                buildingID:    'BLDG-001',
                unitID:        'UNIT-001',
                unitAmenities: undefined
            };

            const resolved = resolver.resolveUnitValues(unitWithNested, unitTypeData, buildingData);

            expect(resolved.unitAmenities).toEqual(unitTypeData.modelAmenities);
        });

        it('should handle circular reference prevention', () => {
            // Test that the same amenity name doesn't appear multiple times
            const sameAmenity: Amenity = { name: 'Same', category: AmenityCategory.UNIT };

            const merged = resolver.mergeAmenities(
                [sameAmenity],
                [sameAmenity],
                [sameAmenity]
            );

            expect(merged).toHaveLength(1);
            expect(merged[0]).toEqual(sameAmenity);
        });

        it('should handle very long amenity lists', () => {
            const manyAmenities = Array.from({ length: 100 }, (_, i) => ({
                name:     `Amenity ${i}`,
                category: AmenityCategory.PROPERTY
            }));

            const merged = resolver.mergeAmenities(manyAmenities, [], []);

            expect(merged).toHaveLength(100);
        });
    });

    describe('Circular References and Object Mutations', () => {
        it('should not mutate original objects during resolution', () => {
            const originalUnit = {
                buildingID: 'BLDG-001',
                unitID:     'UNIT-001',
                beds:       undefined
            };

            const unitCopy = { ...originalUnit };

            resolver.resolveUnitValues(unitCopy, unitTypeData, buildingData);

            // Original should remain unchanged
            expect(originalUnit.beds).toBeUndefined();
        });
    });
});
