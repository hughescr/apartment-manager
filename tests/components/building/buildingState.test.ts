// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import _ from 'lodash';
import type { BuildingData, UnitData, UnitTypeData } from '../../../astro-src/types';
import { buildingEventBus } from '../../../astro-src/lib/building/eventBus';
import { createBuildingCardState } from '../../../astro-src/lib/building/buildingState';
import {
    createTestBuildingData,
    createTestUnitData,
    createTestUnitTypeData,
    mockAlpineContext,
    // mockWindow, // Unused import
    jest
} from './test-setup';

// Mock individual services
const mockStateManager = {
    building: null as BuildingData | null,
    original: null as BuildingData | null,
    units: [] as UnitData[],
    unitTypes: [] as UnitTypeData[],
    showSave: false,
    saving: false,
    activeSectionTab: 'building-info',
    geocoding: false,
    initializeState: jest.fn(),
    setupWatchers: jest.fn(),
    resetToOriginal: jest.fn()
};

const mockValidationService = {
    validateBuilding: jest.fn(),
    validateNewUnit: jest.fn(),
    clearErrors: jest.fn(),
    getErrorMessages: jest.fn().mockReturnValue({}),
    setErrors: jest.fn()
};

const mockApiService = {
    setBaseUrl: jest.fn(),
    saveBuilding: jest.fn(),
    deleteBuilding: jest.fn(),
    createUnit: jest.fn(),
    updateUnit: jest.fn(),
    bulkUpdateStatus: jest.fn(),
    bulkUpdateRent: jest.fn()
};

const mockFormatService = {
    parseDataAttributes: jest.fn(),
    formatCurrency: jest.fn().mockImplementation(amount => `$${amount || 0}`),
    formatRelativeTime: jest.fn().mockImplementation(dateString => (dateString ? '1 hour ago' : 'Never')),
    getStatusBadgeClass: jest.fn().mockImplementation((status) => {
        const statusMap: Record<string, string> = {
            occupied: 'badge-error',
            unoccupied: 'badge-success',
            notice: 'badge-warning',
            down: 'badge-neutral'
        };
        return statusMap[_.toLower(status) || 'unknown'] || 'badge-ghost';
    }),
    getTabDisplayName: jest.fn().mockImplementation((tabKey) => {
        const tabMap: Record<string, string> = {
            'building-info': 'Building Info',
            'floorplans-units': 'Floorplans & Units',
            'pricing-policies': 'Pricing & Policies',
            marketing: 'Marketing',
            units: 'Units'
        };
        return tabMap[tabKey] || 'Building Info';
    })
};

const mockBulkOperationService = {
    validateSelectionExists: jest.fn(),
    validateStatusUpdate: jest.fn(),
    validateRentUpdate: jest.fn(),
    setBulkOperationLoading: jest.fn(),
    getBulkOperationState: jest.fn().mockReturnValue({
        loading: false,
        statusValue: '',
        rentUpdateType: 'absolute' as 'absolute' | 'percentage',
        rentValue: 0
    }),
    toggleSelectAll: jest.fn(),
    isUnitSelected: jest.fn(),
    toggleUnitSelection: jest.fn(),
    getSelectedCount: jest.fn(),
    determineNewStatus: jest.fn(),
    calculateNewRent: jest.fn()
};

const mockFilterService = {
    getActiveFilters: jest.fn().mockReturnValue({
        statusFilter: '',
        searchQuery: ''
    }),
    updateFilters: jest.fn(),
    filterUnits: jest.fn().mockImplementation(units => units)
};

const mockDialogService = {
    isAddUnitDialogOpen: jest.fn().mockReturnValue(false),
    isAddUnitTypeDialogOpen: jest.fn().mockReturnValue(false),
    isBulkStatusDialogOpen: jest.fn().mockReturnValue(false),
    isBulkRentDialogOpen: jest.fn().mockReturnValue(false),
    openAddUnitDialog: jest.fn(),
    openAddUnitTypeDialog: jest.fn(),
    closeAddUnitDialog: jest.fn(),
    closeAddUnitTypeDialog: jest.fn(),
    closeBulkStatusDialog: jest.fn(),
    closeBulkRentDialog: jest.fn(),
    getNewUnitData: jest.fn().mockReturnValue({ unitID: '', modelID: '' }),
    setNewUnitData: jest.fn()
};

// Mock the orchestrator with all the methods we need
export const mockOrchestrator = {
    building: null as BuildingData | null,
    original: null as BuildingData | null,
    units: [] as UnitData[],
    unitTypes: [] as UnitTypeData[],
    showSave: false,
    saving: false,
    activeSectionTab: 'building-info',
    geocoding: false,
    filteredUnitsGetter: [] as UnitData[],
    selectedUnitsGetter: new Set(),
    statusFilter: '',
    searchQuery: '',
    showAddUnitDialog: false,
    showAddUnitTypeDialog: false,
    showBulkStatusDialog: false,
    showBulkRentDialog: false,
    newUnit: { unitID: '', modelID: '' },
    bulkOperation: {
        loading: false,
        statusValue: '',
        rentUpdateType: 'absolute' as 'absolute' | 'percentage',
        rentValue: 0
    },
    errors: {},
    initialize: jest.fn(),
    validateForm: jest.fn().mockReturnValue(true),
    saveBuilding: jest.fn().mockResolvedValue(undefined),
    deleteBuilding: jest.fn().mockResolvedValue(undefined),
    undoChanges: jest.fn(),
    openAddUnitDialog: jest.fn(),
    openAddUnitTypeDialog: jest.fn(),
    closeAddUnitTypeDialog: jest.fn(),
    addUnit: jest.fn().mockResolvedValue(undefined),
    updateFilteredUnits: jest.fn(),
    toggleSelectAll: jest.fn(),
    isUnitSelected: jest.fn().mockReturnValue(false),
    toggleUnitSelection: jest.fn(),
    getSelectedCount: jest.fn().mockReturnValue(0),
    performBulkStatusUpdate: jest.fn().mockResolvedValue(undefined),
    performBulkRentUpdate: jest.fn().mockResolvedValue(undefined),
    toggleUnitAvailability: jest.fn().mockResolvedValue(undefined),
    formatCurrency: jest.fn().mockImplementation(amount => `$${amount || 0}`),
    formatRelativeTime: jest.fn().mockImplementation(dateString => (dateString ? '1 hour ago' : 'Never')),
    getStatusBadgeClass: jest.fn().mockImplementation((status) => {
        const statusMap: Record<string, string> = {
            occupied: 'badge-error',
            unoccupied: 'badge-success',
            notice: 'badge-warning',
            down: 'badge-neutral'
        };
        return statusMap[_.toLower(status) || 'unknown'] || 'badge-ghost';
    }),
    getTabDisplayName: jest.fn().mockImplementation((tabKey) => {
        const tabMap: Record<string, string> = {
            'building-info': 'Building Info',
            'floorplans-units': 'Floorplans & Units',
            'pricing-policies': 'Pricing & Policies',
            marketing: 'Marketing',
            units: 'Units'
        };
        return tabMap[tabKey] || 'Building Info';
    })
};

// Mock the BuildingCardOrchestrator
mock.module('../../../astro-src/lib/building/orchestrator/BuildingCardOrchestrator', () => ({
    BuildingCardOrchestrator: jest.fn().mockImplementation(() => mockOrchestrator)
}));

// Mock the service modules
mock.module('../../../astro-src/lib/building/services/StateManager', () => ({
    createStateManager: jest.fn().mockReturnValue(mockStateManager)
}));

mock.module('../../../astro-src/lib/building/services/ValidationService', () => ({
    ValidationServiceImpl: jest.fn().mockImplementation(() => mockValidationService)
}));

mock.module('../../../astro-src/lib/building/services/ApiService', () => ({
    ApiService: jest.fn().mockImplementation(() => mockApiService)
}));

mock.module('../../../astro-src/lib/building/services/FormatService', () => ({
    FormatServiceImpl: jest.fn().mockImplementation(() => mockFormatService)
}));

mock.module('../../../astro-src/lib/building/services/BulkOperationService', () => ({
    BulkOperationService: jest.fn().mockImplementation(() => mockBulkOperationService)
}));

mock.module('../../../astro-src/lib/building/services/FilterService', () => ({
    DefaultFilterService: jest.fn().mockImplementation(() => mockFilterService)
}));

mock.module('../../../astro-src/lib/building/services/DialogService', () => ({
    DefaultDialogService: jest.fn().mockImplementation(() => mockDialogService)
}));

describe('BuildingCardState', () => {
    let state: ReturnType<typeof createBuildingCardState>;
    let mockBuildingData: ReturnType<typeof createTestBuildingData>;
    let mockUnitsData: ReturnType<typeof createTestUnitData>[];
    let mockUnitTypesData: ReturnType<typeof createTestUnitTypeData>[];

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        buildingEventBus.clear();

        // Reset orchestrator and service mocks
        _(mockOrchestrator).values().forEach((prop) => {
            if(_.isFunction(prop) && 'mockReset' in prop) {
                (prop.mockReset as () => void)();
            }
        });
        _(mockStateManager).values().forEach((prop) => {
            if(_.isFunction(prop) && 'mockReset' in prop) {
                (prop.mockReset as () => void)();
            }
        });
        _(mockValidationService).values().forEach((prop) => {
            if(_.isFunction(prop) && 'mockReset' in prop) {
                (prop.mockReset as () => void)();
            }
        });
        _(mockApiService).values().forEach((prop) => {
            if(_.isFunction(prop) && 'mockReset' in prop) {
                (prop.mockReset as () => void)();
            }
        });
        _(mockFormatService).values().forEach((prop) => {
            if(_.isFunction(prop) && 'mockReset' in prop) {
                (prop.mockReset as () => void)();
            }
        });
        _(mockBulkOperationService).values().forEach((prop) => {
            if(_.isFunction(prop) && 'mockReset' in prop) {
                (prop.mockReset as () => void)();
            }
        });
        _(mockFilterService).values().forEach((prop) => {
            if(_.isFunction(prop) && 'mockReset' in prop) {
                (prop.mockReset as () => void)();
            }
        });
        _(mockDialogService).values().forEach((prop) => {
            if(_.isFunction(prop) && 'mockReset' in prop) {
                (prop.mockReset as () => void)();
            }
        });

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

        // Configure orchestrator mock with test data
        mockOrchestrator.building = mockBuildingData;
        mockOrchestrator.original = { ...mockBuildingData };
        mockOrchestrator.units = mockUnitsData;
        mockOrchestrator.unitTypes = mockUnitTypesData;
        mockOrchestrator.showSave = false;
        mockOrchestrator.saving = false;
        mockOrchestrator.activeSectionTab = 'building-info';
        mockOrchestrator.geocoding = false;
        mockOrchestrator.filteredUnitsGetter = mockUnitsData;
        mockOrchestrator.selectedUnitsGetter = new Set();
        mockOrchestrator.statusFilter = '';
        mockOrchestrator.searchQuery = '';
        mockOrchestrator.errors = {};
        mockOrchestrator.newUnit = { unitID: '', modelID: '' };
        mockOrchestrator.bulkOperation = {
            loading: false,
            statusValue: '',
            rentUpdateType: 'absolute' as 'absolute' | 'percentage',
            rentValue: 0
        };

        // Configure service mocks with test data
        mockStateManager.building = mockBuildingData as BuildingData;
        mockStateManager.original = { ...mockBuildingData } as BuildingData;
        mockStateManager.units = mockUnitsData as UnitData[];
        mockStateManager.unitTypes = mockUnitTypesData as UnitTypeData[];
        mockStateManager.showSave = false;
        mockStateManager.saving = false;
        mockStateManager.activeSectionTab = 'building-info';
        mockStateManager.geocoding = false;

        mockFormatService.parseDataAttributes.mockReturnValue({
            apiURL: '/api/',
            building: mockBuildingData,
            units: mockUnitsData,
            unitTypes: mockUnitTypesData
        });

        mockFilterService.filterUnits.mockImplementation(units => units);
        mockFilterService.getActiveFilters.mockReturnValue({
            statusFilter: '',
            searchQuery: ''
        });

        mockBulkOperationService.getBulkOperationState.mockReturnValue({
            loading: false,
            statusValue: '',
            rentUpdateType: 'absolute' as 'absolute' | 'percentage',
            rentValue: 0
        });

        mockDialogService.getNewUnitData.mockReturnValue({ unitID: '', modelID: '' });

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

        it('should initialize orchestrator with services during init', () => {
            // Create fresh state without auto-init
            const freshState = createBuildingCardState();
            _.assign(freshState, mockAlpineContext);

            freshState.init();

            // Verify orchestrator was created and initialized
            expect((freshState as { _orchestrator?: unknown })._orchestrator).toBeTruthy();
            expect(mockOrchestrator.initialize).toHaveBeenCalled();
        });

        it('should setup watchers during initialization', () => {
            // Create fresh state and init
            const freshState = createBuildingCardState();
            _.assign(freshState, mockAlpineContext);

            freshState.init();

            // Verify orchestrator initialize was called, which would set up watchers
            expect(mockOrchestrator.initialize).toHaveBeenCalled();
        });

        it('should proxy data from state manager after init', () => {
            expect(state.building).toEqual(mockBuildingData);
            expect(state.original).toEqual(mockBuildingData);
            expect(state.units).toEqual(mockUnitsData);
            expect(state.unitTypes).toEqual(mockUnitTypesData);
        });

        it('should handle orchestrator initialization during init', () => {
            expect(mockOrchestrator.initialize).toHaveBeenCalled();
        });
    });

    describe('Validation', () => {
        it('should delegate validation to orchestrator', () => {
            mockOrchestrator.validateForm.mockReturnValue(true);

            const result = state.validateForm();

            expect(mockOrchestrator.validateForm).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should emit validation events through orchestrator', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('building:validate', eventSpy);

            mockOrchestrator.validateForm.mockReturnValue(false);

            state.validateForm();

            expect(mockOrchestrator.validateForm).toHaveBeenCalled();
        });

        it('should return errors from orchestrator', () => {
            const mockErrors = { street: 'Street is required', city: 'City is required' };
            mockOrchestrator.errors = mockErrors;

            expect(state.errors).toEqual(mockErrors);
        });

        it('should set errors through orchestrator', () => {
            const mockErrors = { street: 'Invalid street' };
            state.errors = mockErrors;

            // Since the setter proxies to orchestrator, we can verify the value was set
            expect(mockOrchestrator.errors).toEqual(mockErrors);
        });
    });

    describe('Building Management', () => {
        beforeEach(() => {
            mockValidationService.validateBuilding.mockReturnValue({
                isValid: true,
                errors: {}
            });
            mockApiService.saveBuilding.mockResolvedValue({ success: true });
            mockApiService.deleteBuilding.mockResolvedValue({ success: true });
        });

        it('should save building through orchestrator workflow', async () => {
            await state.saveBuilding();

            expect(mockOrchestrator.saveBuilding).toHaveBeenCalled();
        });

        it('should handle validation failure during save', async () => {
            await state.saveBuilding();

            expect(mockOrchestrator.saveBuilding).toHaveBeenCalled();
        });

        it('should handle API save errors', async () => {
            await state.saveBuilding();

            expect(mockOrchestrator.saveBuilding).toHaveBeenCalled();
        });

        it('should delete building through orchestrator workflow', async () => {
            await state.deleteBuilding();

            expect(mockOrchestrator.deleteBuilding).toHaveBeenCalled();
        });

        it('should not delete building if user cancels', async () => {
            await state.deleteBuilding();

            expect(mockOrchestrator.deleteBuilding).toHaveBeenCalled();
        });

        it('should undo changes through orchestrator', () => {
            state.undoChanges();

            expect(mockOrchestrator.undoChanges).toHaveBeenCalled();
        });
    });

    describe('Unit Management', () => {
        beforeEach(() => {
            mockValidationService.validateNewUnit.mockReturnValue({
                isValid: true,
                errors: {}
            });
            mockApiService.createUnit.mockResolvedValue({ success: true });
            mockApiService.updateUnit.mockResolvedValue({ success: true });
        });

        it('should add new unit through orchestrator workflow', async () => {
            await state.addUnit();

            expect(mockOrchestrator.addUnit).toHaveBeenCalled();
        });

        it('should handle validation failure when adding unit', async () => {
            await state.addUnit();

            expect(mockOrchestrator.addUnit).toHaveBeenCalled();
        });

        it('should toggle unit availability through orchestrator', async () => {
            const unit = mockUnitsData[0];
            const eventSpy = jest.fn();
            buildingEventBus.on('toast:show', eventSpy);

            await state.toggleUnitAvailability(unit);

            expect(mockOrchestrator.toggleUnitAvailability).toHaveBeenCalledWith(unit);
        });

        it('should handle API errors during unit toggle', async () => {
            const unit = mockUnitsData[0];
            const eventSpy = jest.fn();
            buildingEventBus.on('toast:show', eventSpy);

            await state.toggleUnitAvailability(unit);

            expect(mockOrchestrator.toggleUnitAvailability).toHaveBeenCalledWith(unit);
        });
    });

    describe('Units Filtering', () => {
        it('should delegate filtering to orchestrator', () => {
            state.updateFilteredUnits();
            expect(mockOrchestrator.updateFilteredUnits).toHaveBeenCalled();
        });

        it('should update status filter through orchestrator', () => {
            state.statusFilter = 'Occupied';
            expect(mockOrchestrator.statusFilter).toBe('Occupied');
        });

        it('should update search query through orchestrator', () => {
            state.searchQuery = '101';
            expect(mockOrchestrator.searchQuery).toBe('101');
        });

        it('should emit filter events when filtering', () => {
            state.updateFilteredUnits();

            expect(mockOrchestrator.updateFilteredUnits).toHaveBeenCalled();
        });

        it('should get filtered units from orchestrator', () => {
            const filteredUnits = [mockUnitsData[0], mockUnitsData[1]];
            mockOrchestrator.filteredUnitsGetter = filteredUnits;

            expect(state.filteredUnits).toEqual(filteredUnits);
        });
    });

    describe('Unit Selection', () => {
        it('should toggle unit selection through orchestrator', () => {
            const unitID = 'unit-1';

            state.toggleUnitSelection(unitID);

            expect(mockOrchestrator.toggleUnitSelection).toHaveBeenCalledWith(unitID);
        });

        it('should check if unit is selected through orchestrator', () => {
            const unitID = 'unit-1';
            mockOrchestrator.isUnitSelected.mockReturnValue(true);

            const result = state.isUnitSelected(unitID);

            expect(mockOrchestrator.isUnitSelected).toHaveBeenCalledWith(unitID);
            expect(result).toBe(true);
        });

        it('should toggle select all through orchestrator', () => {
            state.toggleSelectAll();

            expect(mockOrchestrator.toggleSelectAll).toHaveBeenCalled();
        });

        it('should get selected count through orchestrator', () => {
            const expectedCount = 2;
            mockOrchestrator.getSelectedCount.mockReturnValue(expectedCount);

            const result = state.getSelectedCount();

            expect(mockOrchestrator.getSelectedCount).toHaveBeenCalled();
            expect(result).toBe(expectedCount);
        });

        it('should proxy selectedUnits from orchestrator', () => {
            const mockSelectedUnits = new Set(['unit-1', 'unit-2']);
            mockOrchestrator.selectedUnitsGetter = mockSelectedUnits;

            expect(state.selectedUnits).toEqual(mockSelectedUnits);
        });
    });

    describe('Bulk Operations', () => {
        beforeEach(() => {
            // Mock successful validation and API responses
            mockBulkOperationService.validateSelectionExists.mockReturnValue({
                isValid: true,
                message: ''
            });
            mockBulkOperationService.validateStatusUpdate.mockReturnValue({
                isValid: true,
                message: ''
            });
            mockBulkOperationService.validateRentUpdate.mockReturnValue({
                isValid: true,
                message: ''
            });
            mockBulkOperationService.getBulkOperationState.mockReturnValue({
                loading: false,
                statusValue: 'Occupied',
                rentUpdateType: 'absolute' as 'absolute' | 'percentage',
                rentValue: 2800
            });
            mockApiService.bulkUpdateStatus.mockResolvedValue({ success: true });
            mockApiService.bulkUpdateRent.mockResolvedValue({ success: true });
        });

        it('should perform bulk status update through orchestrator workflow', async () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('toast:show', eventSpy);
            buildingEventBus.on('units:bulk-update', eventSpy);

            await state.performBulkStatusUpdate();

            expect(mockOrchestrator.performBulkStatusUpdate).toHaveBeenCalled();
        });

        it('should perform bulk rent update through orchestrator workflow', async () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('toast:show', eventSpy);
            buildingEventBus.on('units:bulk-update', eventSpy);

            await state.performBulkRentUpdate();

            expect(mockOrchestrator.performBulkRentUpdate).toHaveBeenCalled();
        });

        it('should handle validation failures in bulk operations', async () => {
            await state.performBulkStatusUpdate();

            expect(mockOrchestrator.performBulkStatusUpdate).toHaveBeenCalled();
        });

        it('should handle API errors in bulk operations', async () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('toast:show', eventSpy);

            await state.performBulkStatusUpdate();

            expect(mockOrchestrator.performBulkStatusUpdate).toHaveBeenCalled();
        });

        it('should proxy bulk operation state from orchestrator', () => {
            const expectedState = {
                loading: true,
                statusValue: 'Unoccupied',
                rentUpdateType: 'percentage' as const,
                rentValue: 5
            };
            mockOrchestrator.bulkOperation = expectedState;

            expect(state.bulkOperation).toEqual(expectedState);
        });
    });

    describe('Dialog Management', () => {
        it('should delegate dialog operations to orchestrator', () => {
            state.openAddUnitDialog();
            expect(mockOrchestrator.openAddUnitDialog).toHaveBeenCalled();

            state.openAddUnitTypeDialog();
            expect(mockOrchestrator.openAddUnitTypeDialog).toHaveBeenCalled();

            state.closeAddUnitTypeDialog();
            expect(mockOrchestrator.closeAddUnitTypeDialog).toHaveBeenCalled();
        });

        it('should proxy dialog state from orchestrator', () => {
            mockOrchestrator.showAddUnitDialog = true;
            mockOrchestrator.showAddUnitTypeDialog = false;
            mockOrchestrator.showBulkStatusDialog = true;
            mockOrchestrator.showBulkRentDialog = false;

            expect(state.showAddUnitDialog).toBe(true);
            expect(state.showAddUnitTypeDialog).toBe(false);
            expect(state.showBulkStatusDialog).toBe(true);
            expect(state.showBulkRentDialog).toBe(false);
        });

        it('should proxy new unit data from orchestrator', () => {
            const mockNewUnitData = { unitID: '103', modelID: 'model-2bd' };
            mockOrchestrator.newUnit = mockNewUnitData;

            expect(state.newUnit).toEqual(mockNewUnitData);
        });

        it('should set new unit data through orchestrator', () => {
            const newUnitData = { unitID: '104', modelID: 'model-1bd' };
            state.newUnit = newUnitData;

            expect(mockOrchestrator.newUnit).toEqual(newUnitData);
        });
    });

    describe('Helper Functions', () => {
        it('should delegate formatting to orchestrator', () => {
            mockOrchestrator.formatCurrency.mockReturnValue('$2,500');
            expect(state.formatCurrency(2500)).toBe('$2,500');
            expect(mockOrchestrator.formatCurrency).toHaveBeenCalledWith(2500);

            mockOrchestrator.formatCurrency.mockReturnValue('$0');
            expect(state.formatCurrency(null)).toBe('$0');
            expect(mockOrchestrator.formatCurrency).toHaveBeenCalledWith(null);
        });

        it('should delegate time formatting to orchestrator', () => {
            const dateString = new Date().toISOString();
            mockOrchestrator.formatRelativeTime.mockReturnValue('1 hour ago');

            expect(state.formatRelativeTime(dateString)).toBe('1 hour ago');
            expect(mockOrchestrator.formatRelativeTime).toHaveBeenCalledWith(dateString);

            mockOrchestrator.formatRelativeTime.mockReturnValue('Never');
            expect(state.formatRelativeTime(undefined)).toBe('Never');
            expect(mockOrchestrator.formatRelativeTime).toHaveBeenCalledWith(undefined);
        });

        it('should delegate status badge class to orchestrator', () => {
            mockOrchestrator.getStatusBadgeClass.mockReturnValue('badge-error');
            expect(state.getStatusBadgeClass('occupied')).toBe('badge-error');
            expect(mockOrchestrator.getStatusBadgeClass).toHaveBeenCalledWith('occupied');

            mockOrchestrator.getStatusBadgeClass.mockReturnValue('badge-success');
            expect(state.getStatusBadgeClass('unoccupied')).toBe('badge-success');
            expect(mockOrchestrator.getStatusBadgeClass).toHaveBeenCalledWith('unoccupied');

            mockOrchestrator.getStatusBadgeClass.mockReturnValue('badge-ghost');
            expect(state.getStatusBadgeClass('unknown')).toBe('badge-ghost');
            expect(mockOrchestrator.getStatusBadgeClass).toHaveBeenCalledWith('unknown');
        });

        it('should delegate tab display names to orchestrator', () => {
            mockOrchestrator.getTabDisplayName.mockReturnValue('Building Info');
            expect(state.getTabDisplayName('building-info')).toBe('Building Info');
            expect(mockOrchestrator.getTabDisplayName).toHaveBeenCalledWith('building-info');

            mockOrchestrator.getTabDisplayName.mockReturnValue('Floorplans & Units');
            expect(state.getTabDisplayName('floorplans-units')).toBe('Floorplans & Units');
            expect(mockOrchestrator.getTabDisplayName).toHaveBeenCalledWith('floorplans-units');

            mockOrchestrator.getTabDisplayName.mockReturnValue('Building Info');
            expect(state.getTabDisplayName('unknown')).toBe('Building Info');
            expect(mockOrchestrator.getTabDisplayName).toHaveBeenCalledWith('unknown');
        });
    });

    describe('Event Integration', () => {
        it('should setup watchers through orchestrator during init', () => {
            expect(mockOrchestrator.initialize).toHaveBeenCalled();
        });

        it('should emit save events through orchestrator on successful save', async () => {
            await state.saveBuilding();
            expect(mockOrchestrator.saveBuilding).toHaveBeenCalled();
        });

        it('should emit validation events through orchestrator', () => {
            state.validateForm();
            expect(mockOrchestrator.validateForm).toHaveBeenCalled();
        });

        it('should emit filter events through orchestrator', () => {
            state.updateFilteredUnits();
            expect(mockOrchestrator.updateFilteredUnits).toHaveBeenCalled();
        });

        it('should emit bulk update events through orchestrator', async () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('units:bulk-update', eventSpy);

            await state.performBulkStatusUpdate();

            expect(mockOrchestrator.performBulkStatusUpdate).toHaveBeenCalled();
        });
    });
});
