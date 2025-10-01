import { describe, it, expect, beforeEach } from 'bun:test';
import { find, map } from 'lodash';
import { InheritanceResolver } from '../../../src/mappers/inheritance-resolver';
import { AmenityCategory, FeeType } from '../../../src/types';
import type { UnitData, UnitTypeData, Amenity, Fee } from '../../../src/types';
import {
    buildingData,
    unitTypeData,
    unitData,
    buildingDataWithPropertyType
} from './shared-fixtures';

describe('InheritanceResolver - Core Functionality', () => {
    let resolver: InheritanceResolver;

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
            expect(map(merged, 'name')).toContain('Air Conditioning');
            expect(map(merged, 'name')).toContain('Hardwood Floors');
            expect(map(merged, 'name')).toContain('Dishwasher');
            expect(map(merged, 'name')).toContain('Swimming Pool');
            expect(map(merged, 'name')).toContain('Fitness Center');

            // Check that unit category takes precedence
            const airConditioning = find(merged, ['name', 'Air Conditioning']);
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

            expect(map(merged, 'name')).toEqual(['First', 'Second', 'Third', 'Fourth']);
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
            expect(map(resolved, 'type')).toContain(FeeType.APPLICATION);
            expect(map(resolved, 'type')).toContain(FeeType.SECURITY_DEPOSIT);
            expect(map(resolved, 'type')).toContain(FeeType.PARKING);
            expect(map(resolved, 'type')).toContain(FeeType.PET_DEPOSIT);
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

            const flattened = resolver.flattenForSingleTier(unitWithoutDate, unitTypeData, buildingDataWithPropertyType);

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
                unitID:     'UNIT-001',
                unitNumber: '101',
                beds:       2,
                baths:      2,
                sqft:       900,
                rent:       1500
            };

            const requiredFields: (keyof UnitData)[] = ['unitNumber', 'beds', 'baths', 'rent'];
            const result = resolver.validateRequiredFields(unit, requiredFields);

            expect(result.isValid).toBe(true);
            expect(result.missingFields).toEqual([]);
        });

        it('should identify missing fields', () => {
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID:     'UNIT-001',
                unitNumber: '101',
                beds:       undefined,
                baths:      2
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
                buildingID:      'BLDG-001',
                unitID:          'UNIT-001',
                unitNumber:      '',
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
                unitID:     'UNIT-001',
                photos:     []
            };

            const requiredFields: (keyof UnitData)[] = ['photos'];
            const result = resolver.validateRequiredFields(unit, requiredFields);

            expect(result.isValid).toBe(false);
            expect(result.missingFields).toContain('photos');
        });

        it('should handle zero values as present', () => {
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID:     'UNIT-001',
                beds:       0,
                rent:       0
            };

            const requiredFields: (keyof UnitData)[] = ['beds', 'rent'];
            const result = resolver.validateRequiredFields(unit, requiredFields);

            expect(result.isValid).toBe(true);
            expect(result.missingFields).toEqual([]);
        });

        it('should handle empty required fields array', () => {
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID:     'UNIT-001'
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
                beds:   2
            };

            const defaults: Partial<UnitData> = {
                beds:    1,
                baths:   1,
                rent:    1000,
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
                beds:   3,
                baths:  2,
                rent:   1500
            };

            const defaults: Partial<UnitData> = {
                beds:  1,
                baths: 1,
                rent:  1000
            };

            const result = resolver.applyDefaults(unit, defaults);

            expect(result.beds).toBe(3);
            expect(result.baths).toBe(2);
            expect(result.rent).toBe(1500);
        });

        it('should handle empty unit object', () => {
            const unit: Partial<UnitData> = {};

            const defaults: Partial<UnitData> = {
                beds:  1,
                baths: 1,
                rent:  1000
            };

            const result = resolver.applyDefaults(unit, defaults);

            expect(result).toEqual(defaults);
        });

        it('should handle empty defaults', () => {
            const unit: Partial<UnitData> = {
                unitID: 'UNIT-001',
                beds:   2
            };

            const result = resolver.applyDefaults(unit, {});

            expect(result).toEqual(unit);
        });

        it('should handle null and undefined differently', () => {
            const unit: Partial<UnitData> = {
                beds:  null as unknown as number,
                baths: undefined
            };

            const defaults: Partial<UnitData> = {
                beds:  1,
                baths: 1
            };

            const result = resolver.applyDefaults(unit, defaults);

            expect(result.beds).toBeNull(); // null is preserved
            expect(result.baths).toBe(1); // undefined gets default
        });
    });
});
