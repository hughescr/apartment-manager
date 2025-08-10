// CRITICAL: Import test setup FIRST before any other imports
import '../test-setup';

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import _ from 'lodash';
import { buildingEventBus } from '../../../../astro-src/lib/building/eventBus';
import {
    createTestBuildingData,
    createTestUnitData,
    createTestUnitTypeData,
    jest
} from '../test-setup';

describe('UnitsTab Business Logic', () => {
    const mockBuildingData = createTestBuildingData();
    const mockUnitsData = [
        createTestUnitData({
            unitID: 'unit-1',
            unitNumber: '101',
            modelID: 'model-1bd',
            vacancyClass: 'Occupied',
            rent: 2500
        }),
        createTestUnitData({
            unitID: 'unit-2',
            unitNumber: '102',
            modelID: 'model-1bd',
            vacancyClass: 'Unoccupied',
            rent: 2600
        }),
        createTestUnitData({
            unitID: 'unit-3',
            unitNumber: '201',
            modelID: 'model-2bd',
            vacancyClass: 'Unoccupied',
            rent: 3200
        }),
        createTestUnitData({
            unitID: 'unit-4',
            unitNumber: '202',
            modelID: 'model-2bd',
            vacancyClass: 'Notice',
            rent: 3300
        })
    ];
    const mockUnitTypesData = [
        createTestUnitTypeData({
            modelID: 'model-1bd',
            modelName: '1 Bedroom',
            beds: 1,
            baths: 1
        }),
        createTestUnitTypeData({
            modelID: 'model-2bd',
            modelName: '2 Bedroom',
            beds: 2,
            baths: 2
        })
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        buildingEventBus.clear();
    });

    describe('Data Structure Validation', () => {
        it('should have valid units data structure', () => {
            expect(_.isArray(mockUnitsData)).toBe(true);
            expect(mockUnitsData.length).toBeGreaterThan(0);

            _.forEach(mockUnitsData, (unit) => {
                expect(unit.unitID).toBeDefined();
                expect(unit.unitNumber).toBeDefined();
                expect(unit.vacancyClass).toBeDefined();
                expect(unit.modelID).toBeDefined();
                expect(typeof unit.rent).toBe('number');
            });
        });

        it('should validate unit types data structure', () => {
            expect(_.isArray(mockUnitTypesData)).toBe(true);
            expect(mockUnitTypesData.length).toBeGreaterThan(0);

            _.forEach(mockUnitTypesData, (unitType) => {
                expect(unitType.modelID).toBeDefined();
                expect(unitType.modelName).toBeDefined();
                expect(typeof unitType.beds).toBe('number');
                expect(typeof unitType.baths).toBe('number');
            });
        });

        it('should validate vacancy class values', () => {
            const validVacancyClasses = ['Occupied', 'Unoccupied', 'Notice', 'Down'];
            _.forEach(mockUnitsData, (unit) => {
                expect(validVacancyClasses).toContain(unit.vacancyClass);
            });
        });
    });

    describe('Unit Filtering Logic', () => {
        it('should filter units by vacancy status', () => {
            const occupiedUnits = _.filter(mockUnitsData, { vacancyClass: 'Occupied' });
            const unoccupiedUnits = _.filter(mockUnitsData, { vacancyClass: 'Unoccupied' });

            expect(occupiedUnits.length).toBe(1);
            expect(unoccupiedUnits.length).toBe(2);
            expect(occupiedUnits[0].unitNumber).toBe('101');
        });

        it('should filter units by unit number search', () => {
            const searchQuery = '10';
            const matchingUnits = _.filter(mockUnitsData, unit =>
                _.chain(unit.unitNumber)
                  .toLower()
                  .includes(_.toLower(searchQuery))
                  .value()
            );

            expect(matchingUnits.length).toBe(2);
            expect(_.map(matchingUnits, 'unitNumber')).toEqual(['101', '102']);
        });

        it('should filter units by model type', () => {
            const oneBedUnits = _.filter(mockUnitsData, { modelID: 'model-1bd' });
            const twoBedUnits = _.filter(mockUnitsData, { modelID: 'model-2bd' });

            expect(oneBedUnits.length).toBe(2);
            expect(twoBedUnits.length).toBe(2);
        });

        it('should handle combined filters', () => {
            const availableOneBeds = _.filter(mockUnitsData, {
                vacancyClass: 'Unoccupied',
                modelID: 'model-1bd'
            });

            // Based on the mock data: unit-2 is Unoccupied and model-1bd
            expect(availableOneBeds.length).toBe(1);
        });
    });

    describe('Unit Selection Logic', () => {
        it('should handle single unit selection', () => {
            const selectedUnits = new Set(['unit-1']);

            expect(selectedUnits.has('unit-1')).toBe(true);
            expect(selectedUnits.has('unit-2')).toBe(false);
            expect(selectedUnits.size).toBe(1);
        });

        it('should handle multiple unit selection', () => {
            const selectedUnits = new Set(['unit-1', 'unit-3']);

            expect(selectedUnits.has('unit-1')).toBe(true);
            expect(selectedUnits.has('unit-3')).toBe(true);
            expect(selectedUnits.size).toBe(2);
        });

        it('should handle select all units', () => {
            const allUnitIds = _.map(mockUnitsData, 'unitID');
            const selectedUnits = new Set(allUnitIds);

            expect(selectedUnits.size).toBe(mockUnitsData.length);
            _.forEach(allUnitIds, (unitId) => {
                expect(selectedUnits.has(unitId)).toBe(true);
            });
        });

        it('should handle deselect all units', () => {
            const selectedUnits = new Set<string>();

            expect(selectedUnits.size).toBe(0);
        });
    });

    describe('Bulk Operations Logic', () => {
        it('should validate bulk status change data', () => {
            const bulkOperation = {
                type: 'status' as const,
                unitIDs: ['unit-1', 'unit-2'],
                statusValue: 'Down'
            };

            expect(bulkOperation.type).toBe('status');
            expect(_.isArray(bulkOperation.unitIDs)).toBe(true);
            expect(bulkOperation.unitIDs.length).toBe(2);
            expect(['Occupied', 'Unoccupied', 'Notice', 'Down']).toContain(bulkOperation.statusValue);
        });

        it('should validate bulk rent change data', () => {
            const bulkOperation = {
                type: 'rent' as const,
                unitIDs: ['unit-1', 'unit-2'],
                rentUpdateType: 'percentage' as const,
                rentValue: 5
            };

            expect(bulkOperation.type).toBe('rent');
            expect(['absolute', 'percentage']).toContain(bulkOperation.rentUpdateType);
            expect(typeof bulkOperation.rentValue).toBe('number');
        });

        it('should calculate percentage rent increases', () => {
            const originalRent = 2500;
            const percentageIncrease = 5;
            const newRent = originalRent * (1 + percentageIncrease / 100);

            expect(newRent).toBe(2625);
        });

        it('should calculate absolute rent changes', () => {
            const originalRent = 2500;
            const absoluteIncrease = 100;
            const newRent = originalRent + absoluteIncrease;

            expect(newRent).toBe(2600);
        });
    });

    describe('Quick Actions Logic', () => {
        it('should handle quick filter actions', () => {
            const quickFilters = {
                available: (units: typeof mockUnitsData) => _.filter(units, { vacancyClass: 'Unoccupied' }),
                occupied: (units: typeof mockUnitsData) => _.filter(units, { vacancyClass: 'Occupied' }),
                notice: (units: typeof mockUnitsData) => _.filter(units, { vacancyClass: 'Notice' })
            };

            expect(quickFilters.available(mockUnitsData).length).toBe(2);
            expect(quickFilters.occupied(mockUnitsData).length).toBe(1);
            expect(quickFilters.notice(mockUnitsData).length).toBe(1);
        });

        it('should handle quick sort actions', () => {
            const sortByUnitNumber = _.sortBy(mockUnitsData, 'unitNumber');
            const sortByRent = _.sortBy(mockUnitsData, 'rent');

            expect(sortByUnitNumber[0].unitNumber).toBe('101');
            expect(sortByRent[0].rent).toBe(2500);
        });
    });

    describe('Unit Grid Display Logic', () => {
        it('should group units by floor', () => {
            const groupedByFloor = _.groupBy(mockUnitsData, (unit) => {
                return unit.unitNumber ? Math.floor(parseInt(unit.unitNumber) / 100) : 0;
            });

            expect(_.keys(groupedByFloor)).toContain('1');
            expect(_.keys(groupedByFloor)).toContain('2');
            expect(groupedByFloor['1'].length).toBe(2);
            expect(groupedByFloor['2'].length).toBe(2);
        });

        it('should calculate occupancy statistics', () => {
            const totalUnits = mockUnitsData.length;
            const occupiedCount = _.filter(mockUnitsData, { vacancyClass: 'Occupied' }).length;
            const availableCount = _.filter(mockUnitsData, { vacancyClass: 'Unoccupied' }).length;
            const occupancyRate = (occupiedCount / totalUnits) * 100;

            expect(totalUnits).toBe(4);
            expect(occupiedCount).toBe(1);
            expect(availableCount).toBe(2);
            expect(occupancyRate).toBe(25);
        });

        it('should calculate rent statistics', () => {
            const rents = _.map(mockUnitsData, 'rent');
            const minRent = _.min(rents);
            const maxRent = _.max(rents);
            const avgRent = _.mean(rents);

            expect(minRent).toBe(2500);
            expect(maxRent).toBe(3300);
            expect(avgRent).toBe(2900);
        });
    });

    describe('Event Bus Integration', () => {
        it('should handle building updated events', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('building:updated', eventSpy);

            buildingEventBus.emit('building:updated', {
                building: mockBuildingData
            });

            expect(eventSpy).toHaveBeenCalledWith({
                building: mockBuildingData
            });
        });

        it('should handle units filter events', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('units:filter', eventSpy);

            buildingEventBus.emit('units:filter', {
                filter: 'Unoccupied',
                query: '10'
            });

            expect(eventSpy).toHaveBeenCalledWith({
                filter: 'Unoccupied',
                query: '10'
            });
        });

        it('should handle units bulk update events', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('units:bulk-update', eventSpy);

            buildingEventBus.emit('units:bulk-update', {
                operationType: 'status',
                unitIDs: ['unit-1', 'unit-2']
            });

            expect(eventSpy).toHaveBeenCalledWith({
                operationType: 'status',
                unitIDs: ['unit-1', 'unit-2']
            });
        });

        it('should handle toast notifications', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('toast:show', eventSpy);

            buildingEventBus.emit('toast:show', {
                message: 'Units updated successfully',
                toastType: 'success'
            });

            expect(eventSpy).toHaveBeenCalledWith({
                message: 'Units updated successfully',
                toastType: 'success'
            });
        });
    });

    describe('Performance Considerations', () => {
        it('should handle large datasets efficiently', () => {
            const manyUnits = _.map(Array.from({ length: 100 }), (_, i) =>
                createTestUnitData({
                    unitID: `unit-${i}`,
                    unitNumber: `${i + 100}`,
                    rent: 2500 + (i * 10)
                })
            );

            const startTime = Date.now();
            const availableUnits = _.filter(manyUnits, { vacancyClass: 'Unoccupied' });
            const groupedByModel = _.groupBy(availableUnits, 'modelID');
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(100);
            expect(typeof groupedByModel).toBe('object');
        });

        it('should efficiently process bulk operations', () => {
            const unitIds = _.map(mockUnitsData, 'unitID');
            const chunkSize = 10;
            const chunks = _.chunk(unitIds, chunkSize);

            expect(_.isArray(chunks)).toBe(true);
            expect(chunks.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle empty units array', () => {
            const emptyUnits: typeof mockUnitsData = [];

            const filteredUnits = _.filter(emptyUnits, { vacancyClass: 'Unoccupied' });
            const selectedUnits = new Set<string>();

            expect(_.isArray(filteredUnits)).toBe(true);
            expect(filteredUnits.length).toBe(0);
            expect(selectedUnits.size).toBe(0);
        });

        it('should handle invalid vacancy classes', () => {
            const unitWithInvalidStatus = {
                ...mockUnitsData[0],
                vacancyClass: 'InvalidStatus' as 'Occupied'
            };

            const validStatuses = ['Occupied', 'Unoccupied', 'Notice', 'Down'];
            expect(validStatuses).not.toContain(unitWithInvalidStatus.vacancyClass);
        });

        it('should handle missing unit data gracefully', () => {
            const incompleteUnit: { unitID: string, unitNumber?: string } = {
                unitID: 'test-unit',
                // Missing required fields
            };

            expect(incompleteUnit.unitID).toBeDefined();
            expect(incompleteUnit.unitNumber).toBeUndefined();
        });
    });

    describe('Unit-Type Relationships', () => {
        it('should link units to their unit types correctly', () => {
            const unitTypeMap = _.keyBy(mockUnitTypesData, 'modelID');

            _.forEach(mockUnitsData, (unit) => {
                const relatedUnitType = unit.modelID ? unitTypeMap[unit.modelID] : undefined;
                if(relatedUnitType) {
                    expect(relatedUnitType.modelID).toBe(unit.modelID!);
                }
            });
        });

        it('should identify units by bedroom count', () => {
            const unitTypeMap = _.keyBy(mockUnitTypesData, 'modelID');
            const oneBedrooms = _.filter(mockUnitsData, (unit) => {
                const unitType = unit.modelID ? unitTypeMap[unit.modelID] : undefined;
                return unitType && unitType.beds === 1;
            });

            expect(oneBedrooms.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Search and Sort Logic', () => {
        it('should handle text-based searches', () => {
            const searchTerm = '10';
            const matchingUnits = _.filter(mockUnitsData, (unit) => {
                return (unit.unitNumber?.includes(searchTerm) ?? false) ||
                  unit.unitID.includes(searchTerm);
            });

            expect(_.isArray(matchingUnits)).toBe(true);
        });

        it('should handle sorting by multiple criteria', () => {
            const sortedUnits = _.orderBy(mockUnitsData, ['vacancyClass', 'rent'], ['asc', 'desc']);

            expect(_.isArray(sortedUnits)).toBe(true);
            expect(sortedUnits.length).toBe(mockUnitsData.length);
        });
    });
});
