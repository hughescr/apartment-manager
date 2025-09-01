import { describe, it, expect, beforeEach } from 'bun:test';
import { generateMITSFeed } from '../../src/mits/generator';
import { inheritanceResolver } from '../../src/mappers/inheritance-resolver';
import { FieldInheritanceManager, type FieldName } from '../../astro-src/lib/unit-card/fieldInheritance';
import { map, isEqual, pick, forEach, find, filter, chain, isString, isNumber } from 'lodash';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';

describe('Inheritance System Consistency Tests', () => {
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let testUnits: UnitData[];
    let fieldInheritanceManager: FieldInheritanceManager;

    beforeEach(() => {
        fieldInheritanceManager = new FieldInheritanceManager();

        mockBuilding = {
            buildingID: 'consistency-building',
            buildingName: 'Consistency Test Building',
            street: '123 Consistency St',
            city: 'Test City',
            state: 'CA',
            zip: '90210',
            latitude: 34.0522,
            longitude: -118.2437,
            leaseLength: 12 // Building-level default
        };

        mockUnitTypes = [
            {
                buildingID: 'consistency-building',
                modelID: 'studio-standard',
                modelName: 'Studio Standard',
                beds: 0,
                baths: 1,
                minRent: 1300,
                maxRent: 1500,
                minSqft: 400,
                maxSqft: 500,
                deposit: 1300,
                minLeaseTerm: 6,
                maxLeaseTerm: 18,
                maxOccupants: 2,
                perPersonRent: 1300,
                countAvailable: 5
            },
            {
                buildingID: 'consistency-building',
                modelID: 'one-bed-luxury',
                modelName: 'One Bedroom Luxury',
                beds: 1,
                baths: 1.5,
                minRent: 2000,
                maxRent: 2000, // Same min/max
                minSqft: 800,
                maxSqft: 800, // Same min/max
                deposit: 2000,
                minLeaseTerm: 12,
                maxLeaseTerm: 24,
                maxOccupants: 3,
                perPersonRent: 1000,
                countAvailable: 3
            },
            {
                buildingID: 'consistency-building',
                modelID: 'two-bed-executive',
                modelName: 'Two Bedroom Executive',
                beds: 2,
                baths: 2,
                minRent: 2800,
                maxRent: 3200,
                minSqft: 1100,
                maxSqft: 1300,
                deposit: 2800,
                minLeaseTerm: 12,
                maxLeaseTerm: 36,
                maxOccupants: 5,
                perPersonRent: 1400,
                countAvailable: 2
            }
        ];

        testUnits = [
            {
                // Complete inheritance scenario
                buildingID: 'consistency-building',
                unitID: 'unit-full-inherit',
                unitNumber: 'FI01',
                modelID: 'studio-standard',
                beds: undefined,
                baths: undefined,
                sqft: undefined,
                rent: undefined,
                deposit: undefined,
                maxOccupants: undefined,
                perPersonRent: undefined,
                minLeaseTerm: undefined,
                maxLeaseTerm: undefined,
                occupied: false,
                availableDate: '2025-02-01',
                feedInclusion: { apartments_com: true, zillow: true }
            },
            {
                // Mixed inheritance and overrides
                buildingID: 'consistency-building',
                unitID: 'unit-mixed',
                unitNumber: 'MX01',
                modelID: 'one-bed-luxury',
                beds: undefined,           // Inherit: 1
                baths: 2,             // Override: 2 vs 1.5
                sqft: undefined,           // Inherit: 800 (same min/max)
                rent: 2100,           // Override: 2100 vs 2000
                deposit: undefined,        // Inherit: 2000
                maxOccupants: 4,      // Override: 4 vs 3
                perPersonRent: undefined,  // Inherit: 1000
                minLeaseTerm: undefined,   // Inherit: 12
                maxLeaseTerm: 30,     // Override: 30 vs 24
                occupied: false,
                availableDate: '2025-02-15',
                feedInclusion: { apartments_com: true, zillow: true }
            },
            {
                // Range inheritance (different min/max values)
                buildingID: 'consistency-building',
                unitID: 'unit-ranges',
                unitNumber: 'RG01',
                modelID: 'two-bed-executive',
                beds: undefined,           // Inherit: 2
                baths: undefined,          // Inherit: 2
                sqft: undefined,           // Inherit: 1100-1300 range
                rent: undefined,           // Inherit: 2800-3200 range
                deposit: 3000,        // Override: 3000 vs 2800
                maxOccupants: undefined,   // Inherit: 5
                perPersonRent: undefined,  // Inherit: 1400
                minLeaseTerm: undefined,   // Inherit: 12
                maxLeaseTerm: undefined,   // Inherit: 36
                occupied: false,
                availableDate: '2025-03-01',
                feedInclusion: { apartments_com: true, zillow: true }
            },
            {
                // Custom unit (no unit type)
                buildingID: 'consistency-building',
                unitID: 'unit-custom',
                unitNumber: 'CU01',
                modelID: '', // No unit type
                beds: 3,
                baths: 2.5,
                sqft: 1500,
                rent: 3500,
                deposit: 3500,
                maxOccupants: 6,
                perPersonRent: 1750,
                minLeaseTerm: 12,
                maxLeaseTerm: 24,
                occupied: false,
                availableDate: '2025-03-15',
                feedInclusion: { apartments_com: true, zillow: true }
            },
            {
                // Edge case: zero values (should be preserved, not inherited)
                buildingID: 'consistency-building',
                unitID: 'unit-zeros',
                unitNumber: 'ZR01',
                modelID: 'studio-standard',
                beds: 0,             // Explicit 0 (studio)
                baths: undefined,         // Inherit: 1
                sqft: undefined,          // Inherit: 400 (minSqft)
                rent: 0,             // Explicit 0 (free unit)
                deposit: 0,          // Explicit 0 (no deposit)
                maxOccupants: undefined,  // Inherit: 2
                perPersonRent: undefined, // Inherit: 1300
                minLeaseTerm: undefined,  // Inherit: 6
                maxLeaseTerm: undefined,  // Inherit: 18
                occupied: false,
                availableDate: '2025-04-01',
                feedInclusion: { apartments_com: true, zillow: true }
            }
        ];
    });

    describe('Cross-System Inheritance Resolution Consistency', () => {
        // Helper function to handle range field comparison (sqft/rent)
        const compareRangeFields = (
            field: string,
            unitType: UnitTypeData,
            effectiveValueByManager: unknown,
            resolvedValue: unknown
        ) => {
            const minField = field === 'sqft' ? 'minSqft' : 'minRent';
            const maxField = field === 'sqft' ? 'maxSqft' : 'maxRent';

            if(unitType[minField as keyof UnitTypeData] === unitType[maxField as keyof UnitTypeData]) {
                // Same min/max - should use single value
                expect(effectiveValueByManager).toBe(unitType[minField as keyof UnitTypeData]);
                if(unitType[minField as keyof UnitTypeData] !== undefined) {
                    const expectedValue = unitType[minField as keyof UnitTypeData];
                    if(expectedValue !== undefined) {
                        expect(resolvedValue).toBe(expectedValue);
                    } else {
                        expect(resolvedValue).toBeUndefined();
                    }
                } else {
                    expect(resolvedValue).toBeUndefined();
                }
            } else {
                // Different min/max - effective might be range, resolved uses min
                if(unitType[minField as keyof UnitTypeData] !== undefined) {
                    const expectedValue = unitType[minField as keyof UnitTypeData];
                    if(expectedValue !== undefined) {
                        expect(resolvedValue).toBe(expectedValue);
                    } else {
                        expect(resolvedValue).toBeUndefined();
                    }
                } else {
                    expect(resolvedValue).toBeUndefined();
                }
                expect(effectiveValueByManager).toBe(`${unitType[minField as keyof UnitTypeData]} - ${unitType[maxField as keyof UnitTypeData]}`);
            }
        };

        // Helper function to test field inheritance consistency
        const testFieldConsistency = (
            field: string,
            unit: UnitData,
            unitType: UnitTypeData,
            fieldInheritanceManager: FieldInheritanceManager
        ) => {
            // 1. Get inheritance manager results
            const isInheritedByManager = fieldInheritanceManager.isInherited(
                unit,
                unitType,
                field as FieldName
            );
            const inheritedValueByManager = fieldInheritanceManager.getInheritedValue(
                unitType,
                field as FieldName
            );
            const effectiveValueByManager = fieldInheritanceManager.getEffectiveValue(
                unit,
                unitType,
                field as FieldName
            );

            // 2. Get resolver results
            const resolvedByResolver = inheritanceResolver.resolveUnitValues(unit, unitType, mockBuilding);
            const unitValue = unit[field as keyof UnitData];
            const hasUnitValue = unitValue !== null && unitValue !== undefined && unitValue !== '';

            if(hasUnitValue) {
                // Unit has explicit value - should not be inherited
                expect(isInheritedByManager).toBe(false);
                expect(effectiveValueByManager).toBe(unitValue);
                expect(resolvedByResolver[field as keyof typeof resolvedByResolver]).toBe(unitValue);
            } else if(inheritedValueByManager !== null) {
                // Unit should inherit value
                expect(isInheritedByManager).toBe(true);
                const resolvedValue = resolvedByResolver[field as keyof typeof resolvedByResolver];

                if(field === 'sqft' || field === 'rent') {
                    compareRangeFields(field, unitType, effectiveValueByManager, resolvedValue);
                } else {
                    // Direct field comparison
                    expect(effectiveValueByManager).toBe(resolvedValue);
                }
            } else {
                // No inheritance available
                expect(isInheritedByManager).toBe(false);
                const expectedValue = unitValue === undefined ? null : unitValue;
                const resolvedFieldValue = resolvedByResolver[field as keyof typeof resolvedByResolver];
                if(expectedValue === null) {
                    expect(resolvedFieldValue).toBeNull();
                } else {
                    expect(resolvedFieldValue).toBe(expectedValue);
                }
            }
        };
        it('should produce identical results across all inheritance systems', async () => {
            const testScenarios = [
                {
                    name: 'Complete inheritance',
                    unit: testUnits[0],
                    unitType: mockUnitTypes[0]
                },
                {
                    name: 'Mixed inheritance/overrides',
                    unit: testUnits[1],
                    unitType: mockUnitTypes[1]
                },
                {
                    name: 'Range inheritance',
                    unit: testUnits[2],
                    unitType: mockUnitTypes[2]
                }
            ];

            forEach(testScenarios, (scenario) => {
                // Test each inheritable field
                const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];

                forEach(inheritableFields, (field) => {
                    testFieldConsistency(field, scenario.unit, scenario.unitType, fieldInheritanceManager);
                });
            });
        });

        it('should handle edge cases consistently across systems', async () => {
            const edgeCaseUnit = testUnits[4]; // unit with zero values
            const unitType = mockUnitTypes[0]; // studio-standard

            // Zero values should be treated as explicit, not inherited
            expect(fieldInheritanceManager.isInherited(edgeCaseUnit, unitType, 'beds')).toBe(false);
            expect(fieldInheritanceManager.isInherited(edgeCaseUnit, unitType, 'rent')).toBe(false);
            expect(fieldInheritanceManager.isInherited(edgeCaseUnit, unitType, 'deposit')).toBe(false);

            // But null values should inherit
            expect(fieldInheritanceManager.isInherited(edgeCaseUnit, unitType, 'baths')).toBe(true);
            expect(fieldInheritanceManager.isInherited(edgeCaseUnit, unitType, 'sqft')).toBe(true);

            // Inheritance resolver should match
            const resolved = inheritanceResolver.resolveUnitValues(edgeCaseUnit, unitType, mockBuilding);
            expect(resolved.beds).toBe(0);   // Explicit zero preserved
            expect(resolved.rent).toBe(0);   // Explicit zero preserved
            expect(resolved.baths).toBe(1);  // Inherited from unit type
        });

        it('should handle custom units consistently', async () => {
            const customUnit = testUnits[3]; // unit without unit type

            // No inheritance should occur
            const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
            forEach(inheritableFields, (field) => {
                expect(fieldInheritanceManager.isInherited(customUnit, null, field as FieldName)).toBe(false); // Use correct FieldName type
                expect(fieldInheritanceManager.getInheritedValue(null, field as FieldName)).toBe(null); // Use correct FieldName type
            });

            // Resolver should use unit values directly
            const resolved = inheritanceResolver.resolveUnitValues(customUnit, undefined, mockBuilding);
            expect(resolved.beds).toBe(3);
            expect(resolved.baths).toBe(2.5);
            expect(resolved.sqft).toBe(1500);
            expect(resolved.rent).toBe(3500);
        });
    });

    describe('MITS Generation Consistency', () => {
        it('should generate MITS XML that reflects inheritance resolver results', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: filter(testUnits, u => u.modelID !== ''), // Filter out custom units with empty modelID
                siteName: 'apartments_com'
            });

            // Test each unit's MITS representation matches inheritance resolver
            // Filter out custom units with no unit type as MITS generation requires valid unit types
            const availableUnits = filter(testUnits, u => !u.occupied && u.modelID !== '');
            forEach(availableUnits, (unit) => {
                const unitType = find(mockUnitTypes, { modelID: unit.modelID }) || undefined;
                const resolved = inheritanceResolver.resolveUnitValues(unit, unitType, mockBuilding);

                // Find unit section in XML
                const unitStart = xml.indexOf(`<UnitID>${unit.unitID}</UnitID>`);
                if(unitStart === -1) {
                    return; // Unit not in XML (maybe filtered out)
                }

                const unitEnd = xml.indexOf('</Unit>', unitStart);
                const unitSection = xml.substring(unitStart, unitEnd);

                // Verify resolved values match XML values
                expect(unitSection).toContain(`<UnitBedrooms>${resolved.beds}</UnitBedrooms>`);
                expect(unitSection).toContain(`<UnitBathrooms>${resolved.baths}</UnitBathrooms>`);

                // Square feet uses resolved value for both min and max when unit has specific sqft
                expect(unitSection).toContain(`<MinSquareFeet>${resolved.sqft}</MinSquareFeet>`);
                expect(unitSection).toContain(`<MaxSquareFeet>${resolved.sqft}</MaxSquareFeet>`);

                // Market rent uses resolved value (but may be omitted if zero)
                if(resolved.rent && resolved.rent > 0) {
                    expect(unitSection).toContain(`<MarketRent>${resolved.rent}</MarketRent>`);
                }
            });
        });

        it('should handle inheritance resolution performance at scale', async () => {
            // Create a large number of units with various inheritance patterns
            const largeUnitSet: UnitData[] = [];
            for(let i = 1; i <= 1000; i++) {
                largeUnitSet.push({
                    buildingID: 'consistency-building',
                    unitID: `perf-unit-${i}`,
                    unitNumber: `${i}`,
                    modelID: (() => {
                        if(i % 3 === 0) {
                            return 'studio-standard';
                        }
                        if(i % 3 === 1) {
                            return 'one-bed-luxury';
                        }
                        return 'two-bed-executive';
                    })(),
                    beds: i % 5 === 0 ? i % 3 : undefined,      // Some overrides
                    baths: i % 7 === 0 ? 1.5 : undefined,       // Some overrides
                    sqft: i % 11 === 0 ? 800 + i : undefined,   // Some overrides
                    rent: i % 13 === 0 ? 2000 + i : undefined,  // Some overrides
                    occupied: i % 10 === 0,                 // 10% occupied
                    availableDate: i % 10 === 0 ? undefined : '2025-04-01',
                    feedInclusion: { apartments_com: true, zillow: true }
                });
            }

            const startTime = Date.now();

            // Test inheritance resolution performance
            let resolvedUnits = 0;
            forEach(largeUnitSet, (unit) => {
                const unitType = find(mockUnitTypes, { modelID: unit.modelID }) || undefined;
                const resolved = inheritanceResolver.resolveUnitValues(unit, unitType, mockBuilding);

                // Basic validation that resolution worked
                expect(resolved.beds).toBeDefined();
                expect(resolved.baths).toBeDefined();
                expect(resolved.rent).toBeDefined();

                resolvedUnits++;
            });

            const resolutionTime = Date.now() - startTime;

            // Test MITS generation performance
            const mitsStartTime = Date.now();
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: filter(largeUnitSet, u => !u.occupied), // Only available units
                siteName: 'apartments_com'
            });
            const mitsTime = Date.now() - mitsStartTime;

            // Performance expectations (adjust thresholds as needed)
            expect(resolutionTime).toBeLessThan(2000); // 2 seconds for 1000 resolutions
            expect(mitsTime).toBeLessThan(5000); // 5 seconds for MITS generation
            expect(resolvedUnits).toBe(1000);

            // Verify XML contains expected number of units (900 available units)
            const unitMatches = xml.match(/<UnitID>perf-unit-\d+<\/UnitID>/g) || [];
            expect(unitMatches.length).toBe(900); // 1000 - 100 occupied
        });
    });

    describe('Data Integrity and Validation', () => {
        it('should maintain inheritance data integrity across system operations', async () => {
            const testUnit = testUnits[1]; // Mixed inheritance unit
            const unitType = mockUnitTypes[1]; // one-bed-luxury

            // Initial state verification
            const initialResolved = inheritanceResolver.resolveUnitValues(testUnit, unitType, mockBuilding);

            // Simulate editing operations that might affect inheritance
            const editedUnit = {
                ...testUnit,
                baths: undefined // Clear override, should now inherit
            };

            const editedResolved = inheritanceResolver.resolveUnitValues(editedUnit, unitType, mockBuilding);

            // Baths should now be inherited value, not the previous override
            expect(editedResolved.baths).toBe(unitType.baths); // 1.5 from unit type
            expect(editedResolved.baths).not.toBe(testUnit.baths); // Not the override value (2)

            // Other values should remain the same
            // Other values should remain the same
            if(initialResolved.beds !== undefined) {
                expect(editedResolved.beds).toBe(initialResolved.beds);
            } else {
                expect(editedResolved.beds).toBeUndefined();
            }
            if(initialResolved.rent !== undefined) {
                expect(editedResolved.rent).toBe(initialResolved.rent);
            } else {
                expect(editedResolved.rent).toBeUndefined();
            }
        });

        it('should validate inheritance logic with complex unit type relationships', async () => {
            // Test unit type with incomplete data
            const incompleteUnitType: UnitTypeData = {
                buildingID: 'consistency-building',
                modelID: 'incomplete-type',
                modelName: 'Incomplete Type',
                beds: 1,
                baths: 1,
                // Missing rent ranges
                minRent: undefined as unknown as number,
                maxRent: undefined as unknown as number,
                // Missing sqft ranges
                minSqft: undefined as unknown as number,
                maxSqft: undefined as unknown as number,
                deposit: 1500,
                countAvailable: 1
            };

            const unitWithIncompleteType: UnitData = {
                buildingID: 'consistency-building',
                unitID: 'incomplete-test',
                unitNumber: 'IT01',
                modelID: 'incomplete-type',
                beds: undefined,    // Should inherit: 1
                baths: undefined,   // Should inherit: 1
                sqft: undefined,    // Cannot inherit (no data)
                rent: undefined,    // Cannot inherit (no data)
                occupied: false,
                availableDate: '2025-04-01',
                feedInclusion: { apartments_com: true, zillow: true }
            };

            // Test inheritance behavior with incomplete unit type
            expect(fieldInheritanceManager.isInherited(unitWithIncompleteType, incompleteUnitType, 'beds')).toBe(true);
            expect(fieldInheritanceManager.isInherited(unitWithIncompleteType, incompleteUnitType, 'baths')).toBe(true);
            expect(fieldInheritanceManager.isInherited(unitWithIncompleteType, incompleteUnitType, 'sqft')).toBe(false);
            expect(fieldInheritanceManager.isInherited(unitWithIncompleteType, incompleteUnitType, 'rent')).toBe(false);

            const resolved = inheritanceResolver.resolveUnitValues(unitWithIncompleteType, incompleteUnitType, mockBuilding);
            expect(resolved.beds).toBe(1);    // Inherited
            expect(resolved.baths).toBe(1);   // Inherited
            expect(resolved.sqft).toBeUndefined(); // Cannot inherit
            expect(resolved.rent).toBeUndefined(); // Cannot inherit
        });

        it('should ensure inheritance consistency across multiple edit operations', async () => {
            let workingUnit = { ...testUnits[1] }; // Start with mixed unit
            const unitType = mockUnitTypes[1];

            // Simulation of multiple edit operations
            const editOperations = [
                { field: 'baths', value: undefined },     // Clear override
                { field: 'rent', value: 2200 },      // Add override
                { field: 'maxOccupants', value: undefined }, // Clear override
                { field: 'beds', value: 2 },         // Add override
                { field: 'beds', value: undefined },      // Clear override again
            ];

            forEach(editOperations, (operation) => {
                workingUnit = {
                    ...workingUnit,
                    [operation.field]: operation.value
                };

                // Verify consistency after each operation
                const resolved = inheritanceResolver.resolveUnitValues(workingUnit, unitType, mockBuilding);
                const isInherited = fieldInheritanceManager.isInherited(
                    workingUnit,
                    unitType,
                    operation.field as FieldName // Use correct FieldName type
                );

                if(operation.value === undefined) {
                    // Should inherit if unit type has value
                    const hasTypeValue = unitType[operation.field as keyof UnitTypeData] !== null &&
                      unitType[operation.field as keyof UnitTypeData] !== undefined;
                    expect(isInherited).toBe(hasTypeValue);
                } else {
                    // Should not inherit (has explicit value)
                    expect(isInherited).toBe(false);
                    expect(resolved[operation.field as keyof typeof resolved]).toBe(operation.value);
                }
            });
        });
    });

    describe('System Integration Validation', () => {
        it('should maintain consistency between UI components and backend systems', async () => {
            // Simulate the complete flow: UI -> API -> MITS Generation

            forEach(testUnits, (unit) => {
                const unitType = find(mockUnitTypes, { modelID: unit.modelID }) || undefined;

                // 1. UI layer (FieldInheritanceManager) evaluation
                const uiEvaluation = {
                    beds: {
                        inherited: fieldInheritanceManager.isInherited(unit, unitType ?? null, 'beds'),
                        effective: fieldInheritanceManager.getEffectiveValue(unit, unitType ?? null, 'beds')
                    },
                    baths: {
                        inherited: fieldInheritanceManager.isInherited(unit, unitType ?? null, 'baths'),
                        effective: fieldInheritanceManager.getEffectiveValue(unit, unitType ?? null, 'baths')
                    },
                    sqft: {
                        inherited: fieldInheritanceManager.isInherited(unit, unitType ?? null, 'sqft'),
                        effective: fieldInheritanceManager.getEffectiveValue(unit, unitType ?? null, 'sqft')
                    },
                    rent: {
                        inherited: fieldInheritanceManager.isInherited(unit, unitType ?? null, 'rent'),
                        effective: fieldInheritanceManager.getEffectiveValue(unit, unitType ?? null, 'rent')
                    }
                };

                // 2. Backend API layer (InheritanceResolver) evaluation
                const backendResolved = inheritanceResolver.resolveUnitValues(unit, unitType, mockBuilding);

                // 4. Validate consistency between UI and backend layers
                chain(uiEvaluation)
                    .keys()
                    .forEach((field) => {
                        const uiResult = uiEvaluation[field as keyof typeof uiEvaluation];
                        const backendValue = backendResolved[field as keyof typeof backendResolved];

                        if(uiResult.inherited) {
                            // UI shows as inherited - backend should use unit type value
                            if(unitType) {
                                if(field === 'sqft' || field === 'rent') {
                                    // Range fields: backend uses min value, UI might show range string
                                    const minField = field === 'sqft' ? 'minSqft' : 'minRent';
                                    if(unitType[minField as keyof UnitTypeData] !== undefined) {
                                        const expectedValue = unitType[minField as keyof UnitTypeData];
                                        if(expectedValue !== undefined) {
                                            expect(backendValue).toBe(expectedValue);
                                        } else {
                                            expect(backendValue).toBeUndefined();
                                        }
                                    } else {
                                        expect(backendValue).toBeUndefined();
                                    }
                                } else {
                                    // Simple fields: should match exactly or be the inherited value
                                    const typeValue = unitType[field as keyof UnitTypeData];
                                    if(isString(uiResult.effective) && isNumber(typeValue)) {
                                        // UI might show range string, backend uses number
                                        expect(backendValue).toBe(typeValue);
                                    } else {
                                        if(typeValue !== undefined) {
                                            expect(backendValue).toBe(typeValue);
                                        } else {
                                            expect(backendValue).toBeUndefined();
                                        }
                                    }
                                }
                            }
                        } else {
                            // UI shows as not inherited - should use unit value or null
                            const unitValue = unit[field as keyof UnitData];
                            if(unitValue !== undefined) {
                                expect(backendValue).toBe(unitValue);
                            } else {
                                expect(backendValue).toBeUndefined();
                            }
                        }
                    })
                    .value();
            });
        });

        it('should ensure inheritance behavior is deterministic across system restarts', async () => {
            // Test that inheritance resolution is deterministic and not affected by system state

            const testCycles = 5;
            const results: Record<string, unknown>[] = [];

            // Run multiple cycles of inheritance resolution
            const processTestUnits = (freshFieldManager: FieldInheritanceManager) => {
                const cycleResults: Record<string, unknown> = {};
                forEach(testUnits, (unit, unitIndex) => {
                    const unitType = find(mockUnitTypes, { modelID: unit.modelID }) || undefined;

                    // Test resolution with fresh manager instance
                    const resolved = inheritanceResolver.resolveUnitValues(unit, unitType, mockBuilding);
                    const inherited = map(['beds', 'baths', 'sqft', 'rent'], field => ({
                        field,
                        isInherited: freshFieldManager.isInherited(unit, unitType ?? null, field as FieldName), // Use correct FieldName type and convert undefined to null
                        effective: freshFieldManager.getEffectiveValue(unit, unitType ?? null, field as FieldName) // Use correct FieldName type and convert undefined to null
                    }));

                    cycleResults[`unit-${unitIndex}`] = {
                        resolved: pick(resolved, ['beds', 'baths', 'sqft', 'rent']),
                        inherited
                    };
                });
                return cycleResults;
            };

            for(let cycle = 0; cycle < testCycles; cycle++) {
                // Create fresh instances to simulate system restart
                const freshFieldManager = new FieldInheritanceManager();
                const cycleResults = processTestUnits(freshFieldManager);
                results.push(cycleResults);
            }

            // Verify all cycles produced identical results
            const firstResult = results[0];
            for(let i = 1; i < testCycles; i++) {
                expect(isEqual(results[i], firstResult)).toBe(true);
            }
        });
    });
});
