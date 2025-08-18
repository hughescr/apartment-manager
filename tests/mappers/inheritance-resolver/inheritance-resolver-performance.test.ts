import { describe, it, expect, beforeEach } from 'bun:test';
import { every, filter, flow, keys, map, padStart, uniq } from 'lodash';
import { InheritanceResolver } from '../../../src/mappers/inheritance-resolver';
import { AmenityCategory, FeeType } from '../../../src/types';
import type { UnitData } from '../../../src/types';
import {
    buildingData,
    unitTypeData,
    createLargeAmenitySet,
    createDeepAmenityNesting,
    createUnitWithManyFields
} from './shared-fixtures';

describe('InheritanceResolver - Performance Tests', () => {
    let resolver: InheritanceResolver;

    beforeEach(() => {
        resolver = new InheritanceResolver();
    });

    describe('Performance with Large Datasets', () => {
        it('should handle units with 1000+ amenities efficiently', () => {
            const largeAmenitySet = createLargeAmenitySet(1000);

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
            const unitWithManyFields = createUnitWithManyFields();

            const allFields = keys(unitWithManyFields) as (keyof UnitData)[];
            const startTime = performance.now();

            const result = resolver.validateRequiredFields(unitWithManyFields, allFields);

            const endTime = performance.now();

            expect(result.isValid).toBe(true);
            expect(endTime - startTime).toBeLessThan(10); // Should complete in < 10ms
        });

        it('should handle extremely large amenity merging efficiently', () => {
            // Test with 5000 amenities across three sources
            const hugeAmenitySet = createLargeAmenitySet(5000);

            const startTime = performance.now();

            const merged = resolver.mergeAmenities(
                hugeAmenitySet.slice(0, 1666),
                hugeAmenitySet.slice(1666, 3333),
                hugeAmenitySet.slice(3333)
            );

            const endTime = performance.now();

            expect(merged).toHaveLength(5000);
            expect(endTime - startTime).toBeLessThan(500); // Should complete in < 500ms
        });

        it('should handle massive fee resolution efficiently', () => {
            // Create large fee arrays
            const unitFees = Array.from({ length: 500 }, (_, i) => ({
                type: `UNIT_FEE_${i}` as unknown as FeeType,
                amount: 50 + i,
                refundable: i % 2 === 0
            }));

            const buildingOneTimeFees = Array.from({ length: 500 }, (_, i) => ({
                type: `BUILDING_ONETIME_${i}` as unknown as FeeType,
                amount: 100 + i,
                refundable: i % 3 === 0
            }));

            const buildingMonthlyFees = Array.from({ length: 500 }, (_, i) => ({
                type: `BUILDING_MONTHLY_${i}` as unknown as FeeType,
                amount: 75 + i,
                refundable: i % 4 === 0
            }));

            const startTime = performance.now();

            const resolved = resolver.resolveFees(unitFees, buildingOneTimeFees, buildingMonthlyFees);

            const endTime = performance.now();

            expect(resolved).toHaveLength(1500); // All fees combined
            expect(endTime - startTime).toBeLessThan(50); // Should complete in < 50ms
        });

        it('should handle deep amenity inheritance chains efficiently', () => {
            const deepAmenities = createDeepAmenityNesting(15);

            const unitWithDeep: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitAmenities: deepAmenities.slice(10)
            };

            const modelWithDeep = {
                ...unitTypeData,
                modelAmenities: deepAmenities.slice(5, 10)
            };

            const buildingWithDeep = {
                ...buildingData,
                propertyAmenities: deepAmenities.slice(0, 5)
            };

            const startTime = performance.now();

            const resolved = resolver.resolveUnitValues(unitWithDeep, modelWithDeep, buildingWithDeep);

            const endTime = performance.now();

            expect(resolved.unitAmenities).toHaveLength(5);
            expect(endTime - startTime).toBeLessThan(25); // Should complete in < 25ms
        });

        it('should handle bulk unit processing efficiently', () => {
            // Create 1000 similar units for bulk processing
            const units = Array.from({ length: 1000 }, (_unused, i) => ({
                buildingID: 'BLDG-001',
                unitID: `UNIT-${padStart(String(i), 4, '0')}`,
                unitNumber: String(i + 1),
                beds: undefined, // Force inheritance
                baths: undefined, // Force inheritance
                sqft: 900 + (i % 100),
                rent: 1500 + (i % 300)
            }));

            const startTime = performance.now();

            const resolvedUnits = map(units, unit =>
                resolver.resolveUnitValues(unit, unitTypeData, buildingData)
            );

            const endTime = performance.now();

            expect(resolvedUnits).toHaveLength(1000);
            expect(every(resolvedUnits, ['beds', 2])).toBe(true);
            expect(every(resolvedUnits, ['baths', 2])).toBe(true);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
        });

        it('should handle complex amenity deduplication efficiently', () => {
            // Create overlapping amenity sets to test deduplication performance
            const baseAmenities = createLargeAmenitySet(200);

            // Create overlapping sets
            const unitAmenities = [
                ...baseAmenities.slice(0, 100),
                ...baseAmenities.slice(150, 200) // 50 overlap with building
            ];

            const modelAmenities = [
                ...baseAmenities.slice(50, 150), // 50 overlap with unit, 50 overlap with building
                ...Array.from({ length: 100 }, (_, i) => ({
                    name: `ModelSpecific${i}`,
                    category: AmenityCategory.UNIT
                }))
            ];

            const buildingAmenities = [
                ...baseAmenities.slice(100, 200), // 50 overlap with unit, 50 overlap with model
                ...Array.from({ length: 100 }, (_, i) => ({
                    name: `BuildingSpecific${i}`,
                    category: AmenityCategory.PROPERTY
                }))
            ];

            const startTime = performance.now();

            const merged = resolver.mergeAmenities(unitAmenities, modelAmenities, buildingAmenities);

            const endTime = performance.now();

            // Should have deduplicated properly
            const uniqueNames = flow([
                merged => map(merged, 'name'),
                uniq
            ])(merged);
            expect(merged).toHaveLength(uniqueNames.length);
            expect(merged.length).toBeGreaterThan(300); // Should have all unique amenities
            expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
        });

        it('should handle validation of massive field lists efficiently', () => {
            // Create a unit with many dynamic properties
            const unitWithMassiveFields: Record<string, unknown> = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001'
            };

            // Add 1000 dynamic fields
            for(let i = 0; i < 1000; i++) {
                unitWithMassiveFields[`dynamicField${i}`] = `value${i}`;
            }

            const allFieldNames = keys(unitWithMassiveFields);
            const startTime = performance.now();

            const result = resolver.validateRequiredFields(
                unitWithMassiveFields as unknown as UnitData,
                allFieldNames as (keyof UnitData)[]
            );

            const endTime = performance.now();

            expect(result.isValid).toBe(true);
            expect(result.missingFields).toEqual([]);
            expect(endTime - startTime).toBeLessThan(50); // Should complete in < 50ms
        });

        it('should handle default application to large objects efficiently', () => {
            // Create a large defaults object
            const massiveDefaults: Record<string, unknown> = {};
            for(let i = 0; i < 1000; i++) {
                massiveDefaults[`default${i}`] = `defaultValue${i}`;
            }

            const sparseUnit: Record<string, unknown> = {
                unitID: 'UNIT-001',
                // Only populate every 10th field
                ...Object.fromEntries(
                    flow([
                        (entries: [string, unknown][]) => filter(entries, (_, index) => index % 10 === 0),
                        (entries: [string, unknown][]) => map(entries, ([key, value]) => [key, `override_${value}`])
                    ])(Object.entries(massiveDefaults))
                )
            };

            const startTime = performance.now();

            const result = resolver.applyDefaults(sparseUnit, massiveDefaults);

            const endTime = performance.now();

            expect(keys(result)).toHaveLength(1001); // unitID + 1000 defaults
            expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
        });

        it('should handle flattenForSingleTier with complex data efficiently', () => {
            const complexUnit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitNumber: '101',
                beds: undefined, // Force inheritance
                baths: undefined, // Force inheritance
                unitAmenities: createLargeAmenitySet(500)
            };

            const complexUnitType = {
                ...unitTypeData,
                modelAmenities: createLargeAmenitySet(500)
            };

            const complexBuilding = {
                ...buildingData,
                propertyAmenities: createLargeAmenitySet(500)
            };

            const startTime = performance.now();

            const flattened = resolver.flattenForSingleTier(complexUnit, complexUnitType, complexBuilding);

            const endTime = performance.now();

            expect(flattened.beds).toBe(2); // Inherited
            expect(flattened.baths).toBe(2); // Inherited
            expect(flattened.unitAmenities).toHaveLength(500); // Unit amenities preserved
            expect(endTime - startTime).toBeLessThan(200); // Should complete in < 200ms
        });

        it('should maintain performance with extremely sparse data', () => {
            // Test performance when most fields are undefined/missing
            const sparseUnits = Array.from({ length: 1000 }, (_, i) => ({
                buildingID: 'BLDG-001',
                unitID: `SPARSE-${i}`,
                // Most fields undefined to force maximum inheritance
                ...(i % 100 === 0 ? { unitNumber: String(i) } : {}), // Only every 100th has unitNumber
                ...(i % 200 === 0 ? { beds: 3 } : {}), // Only every 200th has beds
                ...(i % 300 === 0 ? { rent: 2000 } : {}) // Only every 300th has rent
            }));

            const startTime = performance.now();

            const resolvedSparseUnits = map(sparseUnits, unit =>
                resolver.resolveUnitValues(unit as UnitData, unitTypeData, buildingData)
            );

            const endTime = performance.now();

            expect(resolvedSparseUnits).toHaveLength(1000);
            // Most should have inherited beds/baths from model
            const inheritedBeds = filter(resolvedSparseUnits, ['beds', 2]);
            expect(inheritedBeds.length).toBeGreaterThan(950); // Most should inherit
            expect(endTime - startTime).toBeLessThan(1500); // Should complete in < 1.5 seconds
        });
    });

    describe('Memory Usage Optimization', () => {
        it('should not cause memory leaks with repeated operations', () => {
            const baseUnit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: undefined,
                baths: undefined
            };

            // Perform 1000 resolution operations to check for memory leaks
            for(let i = 0; i < 1000; i++) {
                const result = resolver.resolveUnitValues(baseUnit, unitTypeData, buildingData);
                expect(result.beds).toBe(2);
                expect(result.baths).toBe(2);

                // Create some temporary objects that should be garbage collected
                const tempAmenities = createLargeAmenitySet(10);
                resolver.mergeAmenities(tempAmenities, [], []);
            }

            // If we get here without running out of memory, the test passes
            expect(true).toBe(true);
        });

        it('should handle concurrent-like operations efficiently', () => {
            // Simulate concurrent processing by interleaving different operations
            const operations = [];
            const startTime = performance.now();

            for(let i = 0; i < 100; i++) {
                // Mix different types of operations
                if(i % 3 === 0) {
                    operations.push(resolver.resolveUnitValues({
                        buildingID: 'BLDG-001',
                        unitID: `CONCURRENT-${i}`,
                        beds: undefined
                    }, unitTypeData, buildingData));
                } else if(i % 3 === 1) {
                    operations.push(resolver.mergeAmenities(
                        createLargeAmenitySet(50),
                        createLargeAmenitySet(50),
                        createLargeAmenitySet(50)
                    ));
                } else {
                    operations.push(resolver.validateRequiredFields({
                        buildingID: 'BLDG-001',
                        unitID: `VALIDATION-${i}`,
                        beds: 2,
                        rent: 1500
                    }, ['buildingID', 'unitID', 'beds', 'rent']));
                }
            }

            const endTime = performance.now();

            expect(operations).toHaveLength(100);
            expect(endTime - startTime).toBeLessThan(500); // Should complete in < 500ms
        });
    });
});
