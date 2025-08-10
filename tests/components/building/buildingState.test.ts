// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import _ from 'lodash';
import { mockFetch, createMockResponse } from './test-setup';
import { buildingEventBus } from '../../../astro-src/lib/building/eventBus';
import { createBuildingCardState } from '../../../astro-src/lib/building/buildingState';
import {
    createTestBuildingData,
    createTestUnitData,
    createTestUnitTypeData,
    mockAlpineContext,
    jest
} from './test-setup';

describe('BuildingCardState', () => {
    let state: ReturnType<typeof createBuildingCardState>;
    let mockBuildingData: ReturnType<typeof createTestBuildingData>;
    let mockUnitsData: ReturnType<typeof createTestUnitData>[];
    let mockUnitTypesData: ReturnType<typeof createTestUnitTypeData>[];

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        buildingEventBus.clear();

        // Create test data
        mockBuildingData = createTestBuildingData();
        // Ensure updatedAt is a string (as it would be after JSON serialization)
        // Use Object.assign to bypass type checking for test purposes
        _.assign(mockBuildingData, { updatedAt: mockBuildingData.updatedAt!.toISOString() });

        mockUnitsData = [
            createTestUnitData({ unitID: 'unit-1', unitNumber: '101', vacancyClass: 'Occupied' }),
            createTestUnitData({ unitID: 'unit-2', unitNumber: '102', vacancyClass: 'Unoccupied' }),
            createTestUnitData({ unitID: 'unit-3', unitNumber: '201', vacancyClass: 'Notice' })
        ];
        // Ensure updatedAt is a string (as it would be after JSON serialization)
        _.forEach(mockUnitsData, (unit) => {
            // Use Object.assign to bypass type checking for test purposes
            _.assign(unit, { updatedAt: unit.updatedAt!.toISOString() });
        });

        mockUnitTypesData = [
            createTestUnitTypeData({ modelID: 'model-1bd', modelName: '1 Bed 1 Bath' }),
            createTestUnitTypeData({ modelID: 'model-2bd', modelName: '2 Bed 2 Bath', beds: 2, baths: 2 })
        ];
        // Ensure updatedAt is a string (as it would be after JSON serialization)
        _.forEach(mockUnitTypesData, (unitType) => {
            // Use Object.assign to bypass type checking for test purposes
            _.assign(unitType, { updatedAt: unitType.updatedAt!.toISOString() });
        });

        // Setup mock element data
        mockAlpineContext.$el.dataset = {
            building: JSON.stringify(mockBuildingData),
            units: JSON.stringify(mockUnitsData),
            unitTypes: JSON.stringify(mockUnitTypesData),
            apiUrl: '/api/'
        };

        // Create state
        state = createBuildingCardState();

        // Bind Alpine context methods
        _.assign(state, mockAlpineContext);

        // Initialize state to simulate Alpine.js init
        state.init();
    });

    afterEach(() => {
        buildingEventBus.clear();
    });

    describe('Initialization', () => {
        it('should initialize with default state values', () => {
            // Create fresh state without auto-init to test initial values
            const freshState = createBuildingCardState();

            expect(freshState.original).toBe(null);
            expect(freshState.building).toBe(null);
            expect(freshState.units).toEqual([]);
            expect(freshState.unitTypes).toEqual([]);
            expect(freshState.showSave).toBe(false);
            expect(freshState.saving).toBe(false);
            expect(freshState.activeSectionTab).toBe('building-info');
            expect(freshState.errors).toEqual({});
            expect(freshState.selectedUnits).toBeInstanceOf(Set);
            expect(freshState.statusFilter).toBe('');
            expect(freshState.searchQuery).toBe('');
        });

        it('should parse building data from dataset during init', () => {
            // Create fresh state without auto-init
            const freshState = createBuildingCardState();
            _.assign(freshState, mockAlpineContext);

            freshState.init();

            expect(freshState.building).toEqual(mockBuildingData);
            expect(freshState.original).toEqual(mockBuildingData);
            expect(freshState.units).toEqual(mockUnitsData);
            expect(freshState.unitTypes).toEqual(mockUnitTypesData);
            expect(freshState.apiURL).toBe('/api/');
        });

        it('should handle malformed JSON in dataset gracefully', () => {
            mockAlpineContext.$el.dataset.building = 'invalid-json';
            mockAlpineContext.$el.dataset.units = 'invalid-json';
            mockAlpineContext.$el.dataset.unitTypes = 'invalid-json';

            state.init();

            expect(state.building).toBe(null);
            expect(state.units).toEqual([]);
            expect(state.unitTypes).toEqual([]);
        });

        it('should initialize filtered units after init', () => {
            // The state is already initialized in beforeEach, so filteredUnits should be set
            expect(state.filteredUnits).toEqual(mockUnitsData);
        });

        it('should add updatedAt to units without it during init', () => {
            const unitsWithoutUpdatedAt = _.map(mockUnitsData, (unit) => {
                const { updatedAt: _updatedAt, ...unitWithoutDate } = unit;
                return unitWithoutDate as unknown as typeof unit;
            });

            mockAlpineContext.$el.dataset.units = JSON.stringify(unitsWithoutUpdatedAt);

            state.init();

            _.forEach(state.units, (unit) => {
                expect(unit.updatedAt).toBeDefined();
                expect(typeof unit.updatedAt).toBe('string');
            });
        });
    });

    describe('Validation', () => {
        it('should validate form and return result', () => {
            const result = state.validateForm();

            expect(typeof result).toBe('boolean');
            expect(state.errors).toEqual(expect.any(Object));
        });

        it('should emit validation events', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('building:validate', eventSpy);

            state.validateForm();

            expect(eventSpy).toHaveBeenCalledWith({
                isValid: expect.any(Boolean),
                errors: expect.any(Object)
            });
        });

        it('should set errors for invalid data', () => {
            // Remove required fields
            state.building!.street = '';
            state.building!.city = '';

            const result = state.validateForm();

            expect(result).toBe(false);
            expect(state.errors.street).toBeDefined();
            expect(state.errors.city).toBeDefined();
        });
    });

    describe('Building Management', () => {
        beforeEach(() => {
            mockFetch.mockResolvedValue(createMockResponse({
                ok: true,
                status: 200,
                json: _.constant(Promise.resolve({})),
                text: _.constant(Promise.resolve(''))
            }));
        });

        it('should save building successfully', async () => {
            await state.saveBuilding();

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/buildings/test-building-123',
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(state.building)
                }
            );

            expect(state.original).toEqual(state.building);
            expect(state.showSave).toBe(false);
            expect(state.saving).toBe(false);
        });

        it('should handle save errors', async () => {
            mockFetch.mockResolvedValue(createMockResponse({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: _.constant(Promise.resolve({ error: 'Server error' })),
                text: _.constant(Promise.resolve('Server error'))
            }));

            const eventSpy = jest.fn();
            buildingEventBus.on('toast:show', eventSpy);

            await state.saveBuilding();

            expect(eventSpy).toHaveBeenCalledWith({
                message: 'Failed to save building',
                toastType: 'error'
            });
            expect(state.saving).toBe(false);
        });

        it('should not save if validation fails', async () => {
            state.building!.street = ''; // Make validation fail

            await state.saveBuilding();

            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should delete building successfully', async () => {
            global.confirm = jest.fn().mockReturnValue(true);

            await state.deleteBuilding();

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/buildings/test-building-123',
                { method: 'DELETE' }
            );
        });

        it('should not delete building if user cancels', async () => {
            global.confirm = jest.fn().mockReturnValue(false);

            await state.deleteBuilding();

            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should undo changes', () => {
            state.building!.description = 'Modified description';
            state.errors = { someField: 'some error' };

            state.undoChanges();

            expect(state.building).toEqual(state.original);
            expect(state.errors).toEqual({});
        });
    });

    describe('Unit Management', () => {
        it('should add new unit successfully', async () => {
            mockFetch.mockResolvedValue(createMockResponse({
                ok: true,
                status: 200,
                json: _.constant(Promise.resolve({})),
                text: _.constant(Promise.resolve(''))
            }));

            // Set up newUnit data before calling addUnit
            state.newUnit = {
                unitID: '103',
                modelID: 'model-1bd'
            };

            await state.addUnit();

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/buildings/test-building-123/units',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        unitID: '103',
                        buildingID: 'test-building-123',
                        modelID: 'model-1bd'
                    })
                }
            );
        });

        it('should not add unit without unitID', async () => {
            state.newUnit = { unitID: '', modelID: 'model-1bd' };
            const eventSpy = jest.fn();
            buildingEventBus.on('toast:show', eventSpy);

            await state.addUnit();

            expect(mockFetch).not.toHaveBeenCalled();
            expect(eventSpy).toHaveBeenCalledWith({
                message: 'Unit number is required',
                toastType: 'error'
            });
        });

        it('should toggle unit availability', async () => {
            mockFetch.mockResolvedValue(createMockResponse({
                ok: true,
                status: 200,
                json: _.constant(Promise.resolve({})),
                text: _.constant(Promise.resolve(''))
            }));

            const unit = state.units[0];
            const originalVacancy = unit.vacancyClass;
            await state.toggleUnitAvailability(unit);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];

            expect(url).toBe(`/api/buildings/test-building-123/units/${unit.unitID}`);
            expect(options.method).toBe('PUT');
            expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');

            const bodyData = JSON.parse(options.body as string);
            expect(bodyData.vacancyClass).toBe(originalVacancy === 'Occupied' ? 'Unoccupied' : 'Occupied');
            expect(bodyData.lastUpdated).toEqual(expect.any(String));
            expect(bodyData.unitID).toBe(unit.unitID);
        });
    });

    describe('Units Filtering', () => {
        it('should filter units by status', () => {
            state.statusFilter = 'Occupied';
            state.updateFilteredUnits();

            expect(state.filteredUnits).toHaveLength(1);
            expect(state.filteredUnits[0].vacancyClass).toBe('Occupied');
        });

        it('should filter units by search query', () => {
            state.searchQuery = '101';
            state.updateFilteredUnits();

            expect(state.filteredUnits).toHaveLength(1);
            expect(state.filteredUnits[0].unitNumber).toBe('101');
        });

        it('should combine status and search filters', () => {
            state.statusFilter = 'Unoccupied';
            state.searchQuery = '102';
            state.updateFilteredUnits();

            expect(state.filteredUnits).toHaveLength(1);
            expect(state.filteredUnits[0].unitNumber).toBe('102');
            expect(state.filteredUnits[0].vacancyClass).toBe('Unoccupied');
        });

        it('should emit filter events when filtering', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('units:filter', eventSpy);

            state.statusFilter = 'Occupied';
            state.updateFilteredUnits();

            expect(eventSpy).toHaveBeenCalledWith({
                filter: 'Occupied',
                query: ''
            });
        });
    });

    describe('Unit Selection', () => {
        it('should toggle unit selection', () => {
            const unitID = 'unit-1';

            state.toggleUnitSelection(unitID);
            expect(state.isUnitSelected(unitID)).toBe(true);

            state.toggleUnitSelection(unitID);
            expect(state.isUnitSelected(unitID)).toBe(false);
        });

        it('should select all units', () => {
            state.toggleSelectAll();

            expect(state.selectedUnits.size).toBe(state.filteredUnits.length);
            _.forEach(state.filteredUnits, (unit) => {
                expect(state.isUnitSelected(unit.unitID)).toBe(true);
            });
        });

        it('should deselect all units when all are selected', () => {
            // First select all
            state.toggleSelectAll();
            expect(state.selectedUnits.size).toBe(state.filteredUnits.length);

            // Then toggle again to deselect all
            state.toggleSelectAll();
            expect(state.selectedUnits.size).toBe(0);
        });

        it('should get selected count', () => {
            state.selectedUnits.add('unit-1');
            state.selectedUnits.add('unit-2');

            expect(state.getSelectedCount()).toBe(2);
        });
    });

    describe('Bulk Operations', () => {
        beforeEach(() => {
            state.selectedUnits.add('unit-1');
            state.selectedUnits.add('unit-2');
            state.bulkOperation.statusValue = 'Occupied'; // Set default status value
            mockFetch.mockResolvedValue(createMockResponse({
                ok: true,
                status: 200,
                json: _.constant(Promise.resolve({})),
                text: _.constant(Promise.resolve(''))
            }));
        });

        it('should perform bulk status update', async () => {
            await state.performBulkStatusUpdate();

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/buildings/test-building-123/units/bulk-status',
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        unitIDs: ['unit-1', 'unit-2'],
                        vacancyClass: 'Occupied'
                    })
                }
            );

            expect(state.selectedUnits.size).toBe(0);
            expect(state.showBulkStatusDialog).toBe(false);
        });

        it('should perform bulk rent update with absolute value', async () => {
            state.bulkOperation.rentUpdateType = 'absolute';
            state.bulkOperation.rentValue = 2800;

            await state.performBulkRentUpdate();

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/buildings/test-building-123/units/bulk-rent',
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        unitIDs: ['unit-1', 'unit-2'],
                        updateType: 'absolute',
                        value: 2800
                    })
                }
            );
        });

        it('should perform bulk rent update with percentage', async () => {
            state.bulkOperation.rentUpdateType = 'percentage';
            state.bulkOperation.rentValue = 5;

            await state.performBulkRentUpdate();

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/buildings/test-building-123/units/bulk-rent',
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        unitIDs: ['unit-1', 'unit-2'],
                        updateType: 'percentage',
                        value: 5
                    })
                }
            );
        });

        it('should handle bulk operation errors', async () => {
            mockFetch.mockResolvedValue(createMockResponse({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: _.constant(Promise.resolve({ error: 'Server error' })),
                text: _.constant(Promise.resolve('Server error'))
            }));

            const eventSpy = jest.fn();
            buildingEventBus.on('toast:show', eventSpy);

            await state.performBulkStatusUpdate();

            expect(eventSpy).toHaveBeenCalledWith({
                message: 'Failed to update units. Please try again.',
                toastType: 'error'
            });
            expect(state.bulkOperation.loading).toBe(false);
        });
    });

    describe('Dialog Management', () => {
        it('should open add unit dialog', () => {
            state.openAddUnitDialog();

            expect(state.showAddUnitDialog).toBe(true);
            expect(state.newUnit).toEqual({ unitID: '', modelID: '' });
        });

        it('should open add unit type dialog', () => {
            state.openAddUnitTypeDialog();

            expect(state.showAddUnitTypeDialog).toBe(true);
        });

        it('should close add unit type dialog', () => {
            state.showAddUnitTypeDialog = true;

            state.closeAddUnitTypeDialog();

            expect(state.showAddUnitTypeDialog).toBe(false);
        });
    });

    describe('Helper Functions', () => {
        it('should format currency correctly', () => {
            expect(state.formatCurrency(2500)).toBe('$2,500');
            expect(state.formatCurrency(0)).toBe('$0');
            expect(state.formatCurrency(null)).toBe('$0');
            expect(state.formatCurrency(undefined)).toBe('$0');
        });

        it('should format relative time correctly', () => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            expect(state.formatRelativeTime(oneHourAgo.toISOString())).toBe('1 hour ago');
            expect(state.formatRelativeTime(oneDayAgo.toISOString())).toBe('1 day ago');
            expect(state.formatRelativeTime(undefined)).toBe('Never');
        });

        it('should get status badge classes correctly', () => {
            expect(state.getStatusBadgeClass('occupied')).toBe('badge-error');
            expect(state.getStatusBadgeClass('unoccupied')).toBe('badge-success');
            expect(state.getStatusBadgeClass('notice')).toBe('badge-warning');
            expect(state.getStatusBadgeClass('down')).toBe('badge-neutral');
            expect(state.getStatusBadgeClass('unknown')).toBe('badge-ghost');
        });

        it('should get tab display names correctly', () => {
            expect(state.getTabDisplayName('building-info')).toBe('Building Info');
            expect(state.getTabDisplayName('floorplans-units')).toBe('Floorplans & Units');
            expect(state.getTabDisplayName('pricing-policies')).toBe('Pricing & Policies');
            expect(state.getTabDisplayName('marketing')).toBe('Marketing');
            expect(state.getTabDisplayName('units')).toBe('Units');
            expect(state.getTabDisplayName('unknown')).toBe('Building Info');
        });
    });

    describe('Event Integration', () => {
        it('should emit building events on state changes', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('building:updated', eventSpy);

            // Simulate Alpine $watch callback
            const watchCallback = _.find(mockAlpineContext.$watch.mock.calls,
                ['0', 'building']
            )?.[1];
            if(watchCallback) {
                watchCallback();
                expect(eventSpy).toHaveBeenCalledWith({ building: state.building });
            }
        });

        it('should emit save events on successful save', async () => {
            mockFetch.mockResolvedValue(createMockResponse({
                ok: true,
                status: 200,
                json: _.constant(Promise.resolve({})),
                text: _.constant(Promise.resolve(''))
            }));

            const eventSpy = jest.fn();
            buildingEventBus.on('building:save', eventSpy);

            await state.saveBuilding();
            expect(eventSpy).toHaveBeenCalledWith({ building: state.building });
        });

        it('should emit reset events on undo', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('building:reset', eventSpy);

            state.undoChanges();

            expect(eventSpy).toHaveBeenCalledWith({ building: state.building });
        });
    });
});
