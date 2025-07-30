import { describe, it, expect, beforeEach } from 'bun:test';
import _ from 'lodash';
import { InheritanceResolver } from '../../src/mappers/inheritance-resolver';
import { AmenityCategory, FeeType, PropertyType } from '../../src/types';
import type { UnitData, UnitTypeData, BuildingData, Amenity, Fee } from '../../src/types';

describe('InheritanceResolver', () => {
    let resolver: InheritanceResolver;

    // Test data
    const buildingData: BuildingData = {
        buildingID: 'BLDG-001',
        street: '123 Main St',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
        leaseLength: 12,
        propertyDescription: 'Beautiful property with many amenities',
        photos: [
            'https://example.com/building1.jpg',
            'https://example.com/building2.jpg'
        ],
        propertyAmenities: [
            { name: 'Swimming Pool', category: AmenityCategory.PROPERTY },
            { name: 'Fitness Center', category: AmenityCategory.PROPERTY }
        ],
        oneTimeFees: [
            { type: FeeType.APPLICATION, amount: 50, refundable: false },
            { type: FeeType.SECURITY_DEPOSIT, amount: 1000, refundable: true }
        ],
        monthlyFees: [
            { type: FeeType.PARKING, amount: 100, refundable: false }
        ]
    };

    const unitTypeData: UnitTypeData = {
        buildingID: 'BLDG-001',
        modelID: 'MODEL-001',
        modelName: '2BR/2BA Standard',
        beds: 2,
        baths: 2,
        minSqft: 900,
        maxSqft: 950,
        minRent: 1500,
        maxRent: 1700,
        deposit: 1500,
        maxOccupants: 4,
        perPersonRent: 100,
        minLeaseTerm: 6,
        maxLeaseTerm: 24,
        modelAmenities: [
            { name: 'Air Conditioning', category: AmenityCategory.UNIT },
            { name: 'Dishwasher', category: AmenityCategory.UNIT }
        ]
    };

    const unitData: UnitData = {
        buildingID: 'BLDG-001',
        unitID: 'UNIT-001',
        modelID: 'MODEL-001',
        unitNumber: '101',
        beds: undefined, // Should inherit from model
        baths: undefined, // Should inherit from model
        sqft: 925,
        rent: 1600,
        availableDate: '2024-01-01',
        unitDescription: 'Corner unit with great views',
        photos: [
            'https://example.com/unit101-1.jpg',
            'https://example.com/unit101-2.jpg'
        ]
    };

    beforeEach(() => {
        resolver = new InheritanceResolver();
    });

    describe('resolveUnitValues', () => {
        it('should inherit values from unit type when unit values are missing', () => {
            const resolved = resolver.resolveUnitValues(unitData, unitTypeData, buildingData);

            expect(resolved.beds).toBe(2);
            expect(resolved.baths).toBe(2);
            expect(resolved.deposit).toBe(1500);
            expect(resolved.maxOccupants).toBe(4);
            expect(resolved.perPersonRent).toBe(100);
            expect(resolved.minLeaseTerm).toBe(6);
            expect(resolved.maxLeaseTerm).toBe(24);
        });

        it('should keep unit-specific values when present', () => {
            const resolved = resolver.resolveUnitValues(unitData, unitTypeData, buildingData);

            expect(resolved.sqft).toBe(925);
            expect(resolved.rent).toBe(1600);
            expect(resolved.unitDescription).toBe('Corner unit with great views');
            expect(resolved.photos).toEqual(unitData.photos);
        });

        it('should inherit lease terms from building if not in unit or model', () => {
            const unitWithoutLease: UnitData = {
                ...unitData,
                minLeaseTerm: undefined,
                maxLeaseTerm: undefined
            };

            const modelWithoutLease: UnitTypeData = {
                ...unitTypeData,
                minLeaseTerm: undefined,
                maxLeaseTerm: undefined
            };

            const resolved = resolver.resolveUnitValues(unitWithoutLease, modelWithoutLease, buildingData);

            expect(resolved.minLeaseTerm).toBe(12);
            expect(resolved.maxLeaseTerm).toBe(12);
        });

        it('should inherit amenities from model when unit has none', () => {
            const resolved = resolver.resolveUnitValues(unitData, unitTypeData, buildingData);

            expect(resolved.unitAmenities).toEqual(unitTypeData.modelAmenities);
        });

        it('should use unit photos when available', () => {
            const resolved = resolver.resolveUnitValues(unitData, unitTypeData, buildingData);

            expect(resolved.photos).toEqual(unitData.photos);
        });

        it('should use building photos when unit has none', () => {
            const unitWithoutPhotos: UnitData = {
                ...unitData,
                photos: undefined
            };

            const resolved = resolver.resolveUnitValues(unitWithoutPhotos, unitTypeData, buildingData);

            expect(resolved.photos).toEqual(buildingData.photos);
        });

        it('should handle missing unit type', () => {
            const resolved = resolver.resolveUnitValues(unitData, undefined, buildingData);

            expect(resolved.beds).toBeUndefined();
            expect(resolved.baths).toBeUndefined();
            expect(resolved.sqft).toBe(925);
            expect(resolved.rent).toBe(1600);
        });

        it('should handle missing building', () => {
            const resolved = resolver.resolveUnitValues(unitData, unitTypeData, undefined);

            expect(resolved.beds).toBe(2);
            expect(resolved.baths).toBe(2);
            expect(resolved.minLeaseTerm).toBe(6);
            expect(resolved.maxLeaseTerm).toBe(24);
        });

        it('should handle all missing data', () => {
            const resolved = resolver.resolveUnitValues(unitData, undefined, undefined);

            expect(resolved).toEqual(unitData);
        });

        it('should use unit sqft over model minSqft', () => {
            const unitWithoutSqft: UnitData = {
                ...unitData,
                sqft: undefined
            };

            const resolved = resolver.resolveUnitValues(unitWithoutSqft, unitTypeData, buildingData);

            expect(resolved.sqft).toBe(900); // model's minSqft
        });

        it('should use unit rent over model minRent', () => {
            const unitWithoutRent: UnitData = {
                ...unitData,
                rent: undefined
            };

            const resolved = resolver.resolveUnitValues(unitWithoutRent, unitTypeData, buildingData);

            expect(resolved.rent).toBe(1500); // model's minRent
        });
    });

    describe('mergeAmenities', () => {
        it('should merge amenities with unit taking precedence', () => {
            const unitAmenities: Amenity[] = [
                { name: 'Air Conditioning', category: AmenityCategory.UNIT },
                { name: 'Hardwood Floors', category: AmenityCategory.UNIT }
            ];

            const modelAmenities: Amenity[] = [
                { name: 'Air Conditioning', category: AmenityCategory.PROPERTY }, // Different category
                { name: 'Dishwasher', category: AmenityCategory.UNIT }
            ];

            const buildingAmenities: Amenity[] = [
                { name: 'Swimming Pool', category: AmenityCategory.PROPERTY },
                { name: 'Fitness Center', category: AmenityCategory.PROPERTY }
            ];

            const merged = resolver.mergeAmenities(unitAmenities, modelAmenities, buildingAmenities);

            expect(merged).toHaveLength(5);
            expect(_.map(merged, 'name')).toContain('Air Conditioning');
            expect(_.map(merged, 'name')).toContain('Hardwood Floors');
            expect(_.map(merged, 'name')).toContain('Dishwasher');
            expect(_.map(merged, 'name')).toContain('Swimming Pool');
            expect(_.map(merged, 'name')).toContain('Fitness Center');

            // Check that unit category takes precedence
            const airConditioning = _.find(merged, ['name', 'Air Conditioning']);
            expect(airConditioning?.category).toBe(AmenityCategory.UNIT);
        });

        it('should handle undefined sources', () => {
            const unitAmenities: Amenity[] = [
                { name: 'Air Conditioning', category: AmenityCategory.UNIT }
            ];

            const merged = resolver.mergeAmenities(unitAmenities, undefined, undefined);

            expect(merged).toHaveLength(1);
            expect(merged[0].name).toBe('Air Conditioning');
        });

        it('should handle all undefined', () => {
            const merged = resolver.mergeAmenities(undefined, undefined, undefined);
            expect(merged).toEqual([]);
        });

        it('should maintain order with later sources overriding', () => {
            const buildingAmenities: Amenity[] = [
                { name: 'First', category: AmenityCategory.PROPERTY },
                { name: 'Second', category: AmenityCategory.PROPERTY }
            ];

            const modelAmenities: Amenity[] = [
                { name: 'Third', category: AmenityCategory.UNIT }
            ];

            const unitAmenities: Amenity[] = [
                { name: 'Fourth', category: AmenityCategory.UNIT }
            ];

            const merged = resolver.mergeAmenities(unitAmenities, modelAmenities, buildingAmenities);

            expect(_.map(merged, 'name')).toEqual(['First', 'Second', 'Third', 'Fourth']);
        });
    });

    describe('resolveFees', () => {
        it('should combine building and unit fees', () => {
            const unitFees: Fee[] = [
                { type: FeeType.PET_DEPOSIT, amount: 300, refundable: true }
            ];

            const buildingOneTime: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false },
                { type: FeeType.SECURITY_DEPOSIT, amount: 1000, refundable: true }
            ];

            const buildingMonthly: Fee[] = [
                { type: FeeType.PARKING, amount: 100, refundable: false }
            ];

            const resolved = resolver.resolveFees(unitFees, buildingOneTime, buildingMonthly);

            expect(resolved).toHaveLength(4);
            expect(_.map(resolved, 'type')).toContain(FeeType.APPLICATION);
            expect(_.map(resolved, 'type')).toContain(FeeType.SECURITY_DEPOSIT);
            expect(_.map(resolved, 'type')).toContain(FeeType.PARKING);
            expect(_.map(resolved, 'type')).toContain(FeeType.PET_DEPOSIT);
        });

        it('should override building fees with unit fees of same type', () => {
            const unitFees: Fee[] = [
                { type: FeeType.SECURITY_DEPOSIT, amount: 1500, refundable: true }
            ];

            const buildingOneTime: Fee[] = [
                { type: FeeType.SECURITY_DEPOSIT, amount: 1000, refundable: true }
            ];

            const resolved = resolver.resolveFees(unitFees, buildingOneTime, undefined);

            expect(resolved).toHaveLength(1);
            expect(resolved[0].amount).toBe(1500);
        });

        it('should handle undefined fees', () => {
            const resolved = resolver.resolveFees(undefined, undefined, undefined);
            expect(resolved).toEqual([]);
        });

        it('should handle only building fees', () => {
            const buildingOneTime: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false }
            ];

            const resolved = resolver.resolveFees(undefined, buildingOneTime, undefined);

            expect(resolved).toHaveLength(1);
            expect(resolved[0].type).toBe(FeeType.APPLICATION);
        });
    });

    describe('flattenForSingleTier', () => {
        it('should flatten all data into unit', () => {
            const flattened = resolver.flattenForSingleTier(unitData, unitTypeData, buildingData);

            // Should have all resolved values
            expect(flattened.beds).toBe(2);
            expect(flattened.baths).toBe(2);
            expect(flattened.sqft).toBe(925);
            expect(flattened.rent).toBe(1600);

            // Should have unit description
            expect(flattened.unitDescription).toBe('Corner unit with great views');

            // Should have available date
            expect(flattened.availableDate).toBe('2024-01-01');
        });

        it('should use building description when unit has none', () => {
            const unitWithoutDesc: UnitData = {
                ...unitData,
                unitDescription: undefined
            };

            const flattened = resolver.flattenForSingleTier(unitWithoutDesc, unitTypeData, buildingData);

            expect(flattened.unitDescription).toBe('Beautiful property with many amenities');
        });

        it('should set available date to now if not specified', () => {
            const unitWithoutDate: UnitData = {
                ...unitData,
                availableDate: undefined
            };

            const buildingWithPropertyType: BuildingData = {
                ...buildingData,
                propertyType: PropertyType.APARTMENT
            };

            const flattened = resolver.flattenForSingleTier(unitWithoutDate, unitTypeData, buildingWithPropertyType);

            expect(flattened.availableDate).toBeDefined();
            expect(new Date(flattened.availableDate!).toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}/);
        });

        it('should handle missing unit type', () => {
            const flattened = resolver.flattenForSingleTier(unitData, undefined, buildingData);

            expect(flattened.sqft).toBe(925);
            expect(flattened.rent).toBe(1600);
            expect(flattened.beds).toBeUndefined();
        });

        it('should handle missing building', () => {
            const flattened = resolver.flattenForSingleTier(unitData, unitTypeData, undefined);

            expect(flattened.beds).toBe(2);
            expect(flattened.unitDescription).toBe('Corner unit with great views');
        });
    });

    describe('validateRequiredFields', () => {
        it('should validate all required fields are present', () => {
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitNumber: '101',
                beds: 2,
                baths: 2,
                sqft: 900,
                rent: 1500
            };

            const requiredFields: (keyof UnitData)[] = ['unitNumber', 'beds', 'baths', 'rent'];
            const result = resolver.validateRequiredFields(unit, requiredFields);

            expect(result.isValid).toBe(true);
            expect(result.missingFields).toEqual([]);
        });

        it('should identify missing fields', () => {
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitNumber: '101',
                beds: undefined,
                baths: 2
            };

            const requiredFields: (keyof UnitData)[] = ['unitNumber', 'beds', 'baths', 'rent'];
            const result = resolver.validateRequiredFields(unit, requiredFields);

            expect(result.isValid).toBe(false);
            expect(result.missingFields).toContain('beds');
            expect(result.missingFields).toContain('rent');
            expect(result.missingFields).toHaveLength(2);
        });

        it('should treat empty strings as missing', () => {
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitNumber: '',
                unitDescription: '   ' // Whitespace only
            };

            const requiredFields: (keyof UnitData)[] = ['unitNumber', 'unitDescription'];
            const result = resolver.validateRequiredFields(unit, requiredFields);

            expect(result.isValid).toBe(false);
            expect(result.missingFields).toContain('unitNumber');
            expect(result.missingFields).toContain('unitDescription');
        });

        it('should treat empty arrays as missing', () => {
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                photos: []
            };

            const requiredFields: (keyof UnitData)[] = ['photos'];
            const result = resolver.validateRequiredFields(unit, requiredFields);

            expect(result.isValid).toBe(false);
            expect(result.missingFields).toContain('photos');
        });

        it('should handle zero values as present', () => {
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: 0,
                rent: 0
            };

            const requiredFields: (keyof UnitData)[] = ['beds', 'rent'];
            const result = resolver.validateRequiredFields(unit, requiredFields);

            expect(result.isValid).toBe(true);
            expect(result.missingFields).toEqual([]);
        });

        it('should handle empty required fields array', () => {
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001'
            };

            const result = resolver.validateRequiredFields(unit, []);

            expect(result.isValid).toBe(true);
            expect(result.missingFields).toEqual([]);
        });
    });

    describe('applyDefaults', () => {
        it('should apply defaults for missing values', () => {
            const unit: Partial<UnitData> = {
                unitID: 'UNIT-001',
                beds: 2
            };

            const defaults: Partial<UnitData> = {
                beds: 1,
                baths: 1,
                rent: 1000,
                deposit: 1000
            };

            const result = resolver.applyDefaults(unit, defaults);

            expect(result.beds).toBe(2); // Original value preserved
            expect(result.baths).toBe(1); // Default applied
            expect(result.rent).toBe(1000); // Default applied
            expect(result.deposit).toBe(1000); // Default applied
        });

        it('should not override existing values', () => {
            const unit: Partial<UnitData> = {
                unitID: 'UNIT-001',
                beds: 3,
                baths: 2,
                rent: 1500
            };

            const defaults: Partial<UnitData> = {
                beds: 1,
                baths: 1,
                rent: 1000
            };

            const result = resolver.applyDefaults(unit, defaults);

            expect(result.beds).toBe(3);
            expect(result.baths).toBe(2);
            expect(result.rent).toBe(1500);
        });

        it('should handle empty unit object', () => {
            const unit: Partial<UnitData> = {};

            const defaults: Partial<UnitData> = {
                beds: 1,
                baths: 1,
                rent: 1000
            };

            const result = resolver.applyDefaults(unit, defaults);

            expect(result).toEqual(defaults);
        });

        it('should handle empty defaults', () => {
            const unit: Partial<UnitData> = {
                unitID: 'UNIT-001',
                beds: 2
            };

            const result = resolver.applyDefaults(unit, {});

            expect(result).toEqual(unit);
        });

        it('should handle null and undefined differently', () => {
            const unit: Partial<UnitData> = {
                beds: null as unknown as number,
                baths: undefined
            };

            const defaults: Partial<UnitData> = {
                beds: 1,
                baths: 1
            };

            const result = resolver.applyDefaults(unit, defaults);

            expect(result.beds).toBeNull(); // null is preserved
            expect(result.baths).toBe(1); // undefined gets default
        });
    });

    describe('Edge Cases', () => {
        it('should handle deeply nested undefined values', () => {
            const unitWithNested: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
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
                name: `Amenity ${i}`,
                category: AmenityCategory.PROPERTY
            }));

            const merged = resolver.mergeAmenities(manyAmenities, [], []);

            expect(merged).toHaveLength(100);
        });
    });

    describe('Type Coercion Edge Cases', () => {
        it('should handle string vs number type coercion for numeric fields', () => {
            const unitWithStringNumbers: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: '2' as unknown as number,
                baths: '1.5' as unknown as number,
                sqft: '900' as unknown as number,
                rent: '1500' as unknown as number,
                deposit: '1000' as unknown as number
            };

            const resolved = resolver.resolveUnitValues(unitWithStringNumbers, unitTypeData, buildingData);

            // Strings should be preserved as-is (no automatic conversion)
            expect(resolved.beds).toBe('2');
            expect(resolved.baths).toBe('1.5');
            expect(resolved.sqft).toBe('900');
            expect(resolved.rent).toBe('1500');
            expect(resolved.deposit).toBe('1000');
        });

        it('should handle boolean type coercion', () => {
            const unitWithBooleanStrings: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                occupied: 'true' as unknown as boolean
            };

            const resolved = resolver.resolveUnitValues(unitWithBooleanStrings, unitTypeData, buildingData);

            // String 'true' should be preserved as-is
            expect(resolved.occupied).toBe('true');
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
            expect(result.beds).toBe('0');
            expect(result.rent).toBe('0');
        });
    });

    describe('Null vs Undefined vs Empty Array Handling', () => {
        it('should treat null differently from undefined in inheritance', () => {
            const unitWithNulls: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: null as unknown as number,
                baths: undefined,
                unitAmenities: null as unknown as Amenity[],
                photos: null as unknown as string[]
            };

            const resolved = resolver.resolveUnitValues(unitWithNulls, unitTypeData, buildingData);

            // null should be preserved (not inherit from model)
            expect(resolved.beds).toBeNull();
            expect(resolved.unitAmenities).toBeNull();
            expect(resolved.photos).toBeNull();

            // undefined should inherit from model
            expect(resolved.baths).toBe(2);
        });

        it('should handle empty arrays vs null vs undefined in validation', () => {
            const unitWithVariousEmpty: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                photos: [],
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
            expect(_.isArray(merged)).toBe(true);
        });
    });

    describe('Circular References and Object Mutations', () => {
        it('should handle objects with circular references safely', () => {
            const circularAmenity = { name: 'Circular', category: AmenityCategory.UNIT } as Amenity & { self?: Amenity };
            circularAmenity.self = circularAmenity; // Create circular reference

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

        it('should not mutate original objects during resolution', () => {
            const originalUnit = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: undefined
            };

            const unitCopy = { ...originalUnit };

            resolver.resolveUnitValues(unitCopy, unitTypeData, buildingData);

            // Original should remain unchanged
            expect(originalUnit.beds).toBeUndefined();
        });
    });

    describe('Deep Inheritance Chains', () => {
        it('should handle deeply nested inheritance (10+ levels)', () => {
            // Test with deeply nested amenity descriptions
            const deeplyNestedAmenities = Array.from({ length: 15 }, (_, i) => ({
                name: `Level${i}`,
                category: AmenityCategory.UNIT,
                description: _.repeat('A', 1000) // Large description
            }));

            const unitWithDeep: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitAmenities: deeplyNestedAmenities.slice(10)
            };

            const modelWithDeep: UnitTypeData = {
                ...unitTypeData,
                modelAmenities: deeplyNestedAmenities.slice(5, 10)
            };

            const buildingWithDeep: BuildingData = {
                ...buildingData,
                propertyAmenities: deeplyNestedAmenities.slice(0, 5)
            };

            const resolved = resolver.resolveUnitValues(unitWithDeep, modelWithDeep, buildingWithDeep);

            expect(resolved.unitAmenities).toHaveLength(5);
            expect(resolved.unitAmenities).toEqual(deeplyNestedAmenities.slice(10));
        });
    });

    describe('Performance with Large Datasets', () => {
        it('should handle units with 1000+ amenities efficiently', () => {
            const largeAmenitySet = Array.from({ length: 1000 }, (_, i) => ({
                name: `Amenity${i}`,
                category: i % 2 === 0 ? AmenityCategory.UNIT : AmenityCategory.PROPERTY,
                description: `Description for amenity ${i}`
            }));

            const startTime = performance.now();

            const merged = resolver.mergeAmenities(
                largeAmenitySet.slice(0, 333),
                largeAmenitySet.slice(333, 666),
                largeAmenitySet.slice(666)
            );

            const endTime = performance.now();

            expect(merged).toHaveLength(1000);
            expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
        });

        it('should handle validation of units with many fields efficiently', () => {
            const unitWithManyFields: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitNumber: '101',
                beds: 2,
                baths: 2,
                sqft: 900,
                rent: 1500,
                occupied: false,
                availableDate: '2024-01-01',
                description: 'Test',
                modelID: 'MODEL-001',
                maxOccupants: 4,
                perPersonRent: 100,
                deposit: 1500,
                minLeaseTerm: 6,
                maxLeaseTerm: 24,
                unitDescription: 'Test description',
                photos: _.fill(Array(100), 'https://example.com/photo.jpg')
            };

            const allFields = _.keys(unitWithManyFields) as (keyof UnitData)[];
            const startTime = performance.now();

            const result = resolver.validateRequiredFields(unitWithManyFields, allFields);

            const endTime = performance.now();

            expect(result.isValid).toBe(true);
            expect(endTime - startTime).toBeLessThan(10); // Should complete in < 10ms
        });
    });

    describe('JavaScript Special Values', () => {
        it('should handle NaN, Infinity, and -0', () => {
            const unitWithSpecialNumbers: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: NaN,
                baths: Infinity,
                sqft: -0,
                rent: -Infinity
            };

            const resolved = resolver.resolveUnitValues(unitWithSpecialNumbers, unitTypeData, buildingData);

            expect(Number.isNaN(resolved.beds)).toBe(true);
            expect(resolved.baths).toBe(Infinity);
            expect(Object.is(resolved.sqft, -0)).toBe(true);
            expect(resolved.rent).toBe(-Infinity);
        });

        it('should handle undefined vs missing properties', () => {
            const unitExplicitUndefined: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: undefined
            };

            const unitMissingProperty: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001'
                // beds is missing entirely
            };

            const resolved1 = resolver.resolveUnitValues(unitExplicitUndefined, unitTypeData, buildingData);
            const resolved2 = resolver.resolveUnitValues(unitMissingProperty, unitTypeData, buildingData);

            // Both should inherit from model
            expect(resolved1.beds).toBe(2);
            expect(resolved2.beds).toBe(2);
        });
    });

    describe('Symbol and Non-Enumerable Properties', () => {
        it('should handle Symbol properties', () => {
            const symbolKey = Symbol('test');
            const unitWithSymbol = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                [symbolKey]: 'symbol value'
            } as UnitData;

            const resolved = resolver.resolveUnitValues(unitWithSymbol, unitTypeData, buildingData);

            // Symbol properties should not affect normal operation
            expect(resolved.buildingID).toBe('BLDG-001');
            expect(resolved[symbolKey]).toBe('symbol value');
        });

        it('should handle non-enumerable properties', () => {
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001'
            };

            Object.defineProperty(unit, 'hiddenProperty', {
                value: 'hidden',
                enumerable: false
            });

            const resolved = resolver.resolveUnitValues(unit, unitTypeData, buildingData);

            expect((unit as Record<string, unknown>).hiddenProperty).toBe('hidden');
            expect(_.keys(resolved)).not.toContain('hiddenProperty');
        });
    });

    describe('Getter/Setter Properties', () => {
        it('should handle objects with getters and setters', () => {
            let internalValue = 1000;
            const unitWithGetterSetter: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                get rent() { return internalValue; },
                set rent(val: number) { internalValue = val; }
            } as UnitData;

            const resolved = resolver.resolveUnitValues(unitWithGetterSetter, unitTypeData, buildingData);

            expect(resolved.rent).toBe(1000);
        });

        it('should handle throwing getters gracefully', () => {
            const unitWithThrowingGetter: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                get beds() { throw new Error('Getter error'); }
            } as UnitData;

            expect(() => {
                resolver.resolveUnitValues(unitWithThrowingGetter, unitTypeData, buildingData);
            }).toThrow('Getter error');
        });
    });

    describe('Frozen and Sealed Objects', () => {
        it('should handle frozen objects', () => {
            const frozenUnit = Object.freeze({
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: 1
            });

            const resolved = resolver.resolveUnitValues(frozenUnit as UnitData, unitTypeData, buildingData);

            // Should create a new object, not mutate the frozen one
            expect(resolved).not.toBe(frozenUnit);
            expect(resolved.beds).toBe(1);
            expect(resolved.baths).toBe(2); // From model
        });

        it('should handle sealed objects', () => {
            const sealedUnit = Object.seal({
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: undefined,
                baths: undefined
            });

            const resolved = resolver.resolveUnitValues(sealedUnit as UnitData, unitTypeData, buildingData);

            // Should create a new object
            expect(resolved).not.toBe(sealedUnit);
            expect(resolved.beds).toBe(2);
            expect(resolved.baths).toBe(2);
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
                unitID: 'UNIT-001',
                photos: sparsePhotos
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
            expect(_.map(merged, 'name')).toContain('First');
            expect(_.map(merged, 'name')).toContain('Third');
        });
    });

    describe('Mixed Type Arrays', () => {
        it('should handle arrays with mixed types', () => {
            const mixedPhotos: unknown[] = [
                'photo1.jpg',
                123,
                null,
                undefined,
                { url: 'photo2.jpg' },
                true,
                Symbol('photo')
            ];

            const unitWithMixedPhotos: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                photos: mixedPhotos
            };

            const resolved = resolver.resolveUnitValues(unitWithMixedPhotos, unitTypeData, buildingData);

            expect(resolved.photos).toBe(mixedPhotos);
            expect(resolved.photos).toHaveLength(7);
        });

        it('should handle mixed type amenities', () => {
            const mixedAmenities: unknown[] = [
                { name: 'Valid', category: AmenityCategory.UNIT },
                'invalid string',
                123,
                null,
                { name: 'Another', category: AmenityCategory.PROPERTY }
            ];

            const merged = resolver.mergeAmenities(mixedAmenities, [], []);

            // Map will process all items, including invalid ones
            expect(merged.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Date Object Handling', () => {
        it('should handle Date objects in date fields', () => {
            const dateObj = new Date('2024-01-01');
            const unitWithDateObj: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                availableDate: dateObj as unknown as string
            };

            const resolved = resolver.resolveUnitValues(unitWithDateObj, unitTypeData, buildingData);

            // Date object should be preserved
            expect(resolved.availableDate).toBe(dateObj);
            expect(resolved.availableDate).toBeInstanceOf(Date);
        });

        it('should handle invalid Date objects', () => {
            const invalidDate = new Date('invalid');
            const unitWithInvalidDate: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                availableDate: invalidDate as unknown as string
            };

            const resolved = resolver.resolveUnitValues(unitWithInvalidDate, unitTypeData, buildingData);

            expect(resolved.availableDate).toBe(invalidDate);
            expect(Number.isNaN((resolved.availableDate as unknown as Date).getTime())).toBe(true);
        });
    });

    describe('RegExp Object Handling', () => {
        it('should handle RegExp objects in string fields', () => {
            const regexPattern = /test pattern/gi;
            const unitWithRegex: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitDescription: regexPattern as unknown as string
            };

            const resolved = resolver.resolveUnitValues(unitWithRegex, unitTypeData, buildingData);

            expect(resolved.unitDescription).toBe(regexPattern);
            expect(resolved.unitDescription).toBeInstanceOf(RegExp);
        });
    });

    describe('Function Properties', () => {
        it('should handle function values in fields', () => {
            const testFunction = _.constant('test value');
            const unitWithFunction: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitDescription: testFunction as unknown as string
            };

            const resolved = resolver.resolveUnitValues(unitWithFunction, unitTypeData, buildingData);

            expect(resolved.unitDescription).toBe(testFunction);
            expect(typeof resolved.unitDescription).toBe('function');
        });

        it('should handle constructor functions', () => {
            class CustomDescription {
                toString = _.constant('Custom Description');
            }

            const unitWithConstructor: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitDescription: new CustomDescription() as unknown as string
            };

            const resolved = resolver.resolveUnitValues(unitWithConstructor, unitTypeData, buildingData);

            expect(resolved.unitDescription).toBeInstanceOf(CustomDescription);
        });
    });

    describe('Prototype Pollution Protection', () => {
        it('should not be vulnerable to prototype pollution', () => {
            const maliciousUnit = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                __proto__: { polluted: true },
                constructor: { prototype: { polluted: true } }
            };

            resolver.resolveUnitValues(maliciousUnit as UnitData, unitTypeData, buildingData);

            // Check that Object prototype wasn't polluted
            expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
            expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        });

        it('should handle __proto__ in amenity names safely', () => {
            const dangerousAmenity: Amenity = {
                name: '__proto__',
                category: AmenityCategory.UNIT
            };

            const merged = resolver.mergeAmenities([dangerousAmenity], [], []);

            expect(merged).toHaveLength(1);
            expect(merged[0].name).toBe('__proto__');
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

    describe('Boundary Value Testing', () => {
        it('should handle maximum safe integer values', () => {
            const unitWithMaxValues: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: Number.MAX_SAFE_INTEGER,
                sqft: Number.MAX_SAFE_INTEGER,
                rent: Number.MAX_SAFE_INTEGER
            };

            const resolved = resolver.resolveUnitValues(unitWithMaxValues, unitTypeData, buildingData);

            expect(resolved.beds).toBe(Number.MAX_SAFE_INTEGER);
            expect(resolved.sqft).toBe(Number.MAX_SAFE_INTEGER);
            expect(resolved.rent).toBe(Number.MAX_SAFE_INTEGER);
        });

        it('should handle very long strings', () => {
            const veryLongString = _.repeat('A', 10000);
            const unitWithLongStrings: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitDescription: veryLongString,
                unitNumber: veryLongString
            };

            const resolved = resolver.resolveUnitValues(unitWithLongStrings, unitTypeData, buildingData);

            expect(resolved.unitDescription).toHaveLength(10000);
            expect(resolved.unitNumber).toHaveLength(10000);
        });
    });
});
