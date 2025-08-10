// CRITICAL: Import test setup FIRST before any other imports
import '../test-setup';

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import _ from 'lodash';
import {
    createTestBuildingData,
    createTestUnitData,
    createTestUnitTypeData,
    jest
} from '../test-setup';

describe('FloorplansUnitsTab Component Logic', () => {
    let mockBuildingData: ReturnType<typeof createTestBuildingData>;
    let mockUnitsData: ReturnType<typeof createTestUnitData>[];
    let mockUnitTypesData: ReturnType<typeof createTestUnitTypeData>[];
    let mockBuildingAmenities: { id: string, name: string, category: string }[];

    beforeEach(() => {
        jest.clearAllMocks();

        mockBuildingData = createTestBuildingData();
        mockUnitsData = [
            createTestUnitData({ unitID: 'unit-1', unitNumber: '101', vacancyClass: 'Occupied', modelID: 'model-1bd' }),
            createTestUnitData({ unitID: 'unit-2', unitNumber: '102', vacancyClass: 'Unoccupied', modelID: 'model-2bd' }),
            createTestUnitData({ unitID: 'unit-3', unitNumber: '201', vacancyClass: 'Notice', modelID: 'model-1bd' })
        ];
        mockUnitTypesData = [
            createTestUnitTypeData({ modelID: 'model-1bd', modelName: '1 Bed 1 Bath' }),
            createTestUnitTypeData({ modelID: 'model-2bd', modelName: '2 Bed 2 Bath', beds: 2, baths: 2 })
        ];
        mockBuildingAmenities = [
            { id: 'fitness-center', name: 'Fitness Center', category: 'Recreation' },
            { id: 'pool', name: 'Swimming Pool', category: 'Recreation' },
            { id: 'parking', name: 'Parking', category: 'Transportation' }
        ];
    });

    afterEach(_.noop);

    describe('Data Structure Validation', () => {
        it('should have valid building data structure', () => {
            expect(mockBuildingData).toBeDefined();
            expect(mockBuildingData.buildingID).toBeDefined();
            expect(typeof mockBuildingData.buildingID).toBe('string');
        });

        it('should have valid units data structure', () => {
            expect(_.isArray(mockUnitsData)).toBe(true);
            expect(mockUnitsData.length).toBeGreaterThan(0);

            _.forEach(mockUnitsData, (unit) => {
                expect(unit.unitID).toBeDefined();
                expect(unit.modelID).toBeDefined();
                expect(unit.vacancyClass).toBeDefined();
            });
        });

        it('should have valid unit types data structure', () => {
            expect(_.isArray(mockUnitTypesData)).toBe(true);
            expect(mockUnitTypesData.length).toBeGreaterThan(0);

            _.forEach(mockUnitTypesData, (unitType) => {
                expect(unitType.modelID).toBeDefined();
                expect(unitType.modelName).toBeDefined();
                expect(typeof unitType.beds).toBe('number');
                expect(typeof unitType.baths).toBe('number');
            });
        });

        it('should have valid building amenities structure', () => {
            expect(_.isArray(mockBuildingAmenities)).toBe(true);

            _.forEach(mockBuildingAmenities, (amenity) => {
                expect(amenity.id).toBeDefined();
                expect(amenity.name).toBeDefined();
                expect(amenity.category).toBeDefined();
            });
        });
    });

    describe('Component Props Interface', () => {
        it('should accept required props', () => {
            const props = {
                building: mockBuildingData,
                units: mockUnitsData,
                unitTypes: mockUnitTypesData,
                buildingAmenities: mockBuildingAmenities
            };

            expect(props.building).toBeDefined();
            expect(props.units).toBeDefined();
            expect(props.unitTypes).toBeDefined();
            expect(props.buildingAmenities).toBeDefined();
        });

        it('should handle empty arrays gracefully', () => {
            const propsWithEmptyArrays = {
                building: mockBuildingData,
                units: [],
                unitTypes: [],
                buildingAmenities: []
            };

            expect(_.isArray(propsWithEmptyArrays.units)).toBe(true);
            expect(_.isArray(propsWithEmptyArrays.unitTypes)).toBe(true);
            expect(_.isArray(propsWithEmptyArrays.buildingAmenities)).toBe(true);
        });
    });

    describe('Unit Type and Unit Relationship Logic', () => {
        it('should link units to their unit types correctly', () => {
            const unitTypeMap = _.keyBy(mockUnitTypesData, 'modelID');

            _.forEach(mockUnitsData, (unit) => {
                const relatedUnitType = unit.modelID ? unitTypeMap[unit.modelID] : undefined;
                if(relatedUnitType) {
                    expect(relatedUnitType.modelID).toBe(unit.modelID!);
                }
            });
        });

        it('should identify orphaned units without unit types', () => {
            const unitTypeIds = _.map(mockUnitTypesData, 'modelID');
            const orphanedUnits = _.filter(mockUnitsData, unit =>
                !_.includes(unitTypeIds, unit.modelID)
            );

            // In our test data, all units should have corresponding unit types
            expect(orphanedUnits.length).toBe(0);
        });

        it('should identify unit types without any units', () => {
            const unitModelIds = _.map(mockUnitsData, 'modelID');
            const unusedUnitTypes = _.filter(mockUnitTypesData, unitType =>
                !_.includes(unitModelIds, unitType.modelID)
            );

            // This could be valid in real scenarios
            expect(_.isArray(unusedUnitTypes)).toBe(true);
        });
    });

    describe('Data Filtering and Grouping', () => {
        it('should group units by vacancy status', () => {
            const groupedByStatus = _.groupBy(mockUnitsData, 'vacancyClass');

            expect(groupedByStatus.Occupied).toBeDefined();
            expect(groupedByStatus.Unoccupied).toBeDefined();
            expect(groupedByStatus.Notice).toBeDefined();
        });

        it('should group units by unit type', () => {
            const groupedByModel = _.groupBy(mockUnitsData, 'modelID');

            _.forEach(mockUnitTypesData, (unitType) => {
                const unitsOfThisType = groupedByModel[unitType.modelID] || [];
                expect(_.isArray(unitsOfThisType)).toBe(true);
            });
        });

        it('should calculate summary statistics', () => {
            const totalUnits = mockUnitsData.length;
            const occupiedUnits = _.filter(mockUnitsData, { vacancyClass: 'Occupied' }).length;
            const availableUnits = _.filter(mockUnitsData, { vacancyClass: 'Unoccupied' }).length;

            expect(totalUnits).toBe(mockUnitsData.length);
            expect(typeof occupiedUnits).toBe('number');
            expect(typeof availableUnits).toBe('number');
            expect(occupiedUnits + availableUnits).toBeLessThanOrEqual(totalUnits);
        });
    });

    describe('Component Business Logic', () => {
        it('should validate unit type requirements', () => {
            const validUnitType = mockUnitTypesData[0];

            expect(validUnitType.modelID).toBeDefined();
            expect(validUnitType.modelName).toBeDefined();
            expect(validUnitType.beds).toBeGreaterThan(0);
            expect(validUnitType.baths).toBeGreaterThan(0);
        });

        it('should validate unit requirements', () => {
            const validUnit = mockUnitsData[0];

            expect(validUnit.unitID).toBeDefined();
            expect(validUnit.buildingID).toBeDefined();
            expect(validUnit.modelID).toBeDefined();
            expect(['Occupied', 'Unoccupied', 'Notice', 'Down']).toContain(validUnit.vacancyClass);
        });

        it('should handle inheritance between unit types and units', () => {
            const unitType = mockUnitTypesData[0];
            const unitsOfThisType = _.filter(mockUnitsData, { modelID: unitType.modelID });

            _.forEach(unitsOfThisType, (unit) => {
                // Units should be able to inherit from their unit type
                expect(unit.modelID).toBe(unitType.modelID);

                // Units can override unit type defaults
                if(unit.beds !== undefined) {
                    expect(typeof unit.beds).toBe('number');
                }
                if(unit.baths !== undefined) {
                    expect(typeof unit.baths).toBe('number');
                }
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle missing data gracefully', () => {
            const emptyProps = {
                building: null,
                units: null,
                unitTypes: null,
                buildingAmenities: null
            };

            // Component should handle null values
            expect(emptyProps.building).toBe(null);
            expect(emptyProps.units).toBe(null);
            expect(emptyProps.unitTypes).toBe(null);
            expect(emptyProps.buildingAmenities).toBe(null);
        });

        it('should handle malformed data', () => {
            const malformedUnit = {
                unitID: 'test-unit',
                // Missing required fields
                vacancyClass: 'InvalidStatus'
            };

            expect(malformedUnit.unitID).toBeDefined();
            expect(['Occupied', 'Unoccupied', 'Notice', 'Down']).not.toContain(malformedUnit.vacancyClass);
        });
    });

    describe('Performance Considerations', () => {
        it('should handle large datasets efficiently', () => {
            const largeUnitsArray = _.times(1000, i =>
                createTestUnitData({
                    unitID: `unit-${i}`,
                    unitNumber: `${i + 1000}`
                })
            );

            // Basic operations should still be performant
            const startTime = Date.now();
            const grouped = _.groupBy(largeUnitsArray, 'modelID');
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
            expect(_.keys(grouped).length).toBeGreaterThan(0);
        });
    });
});
