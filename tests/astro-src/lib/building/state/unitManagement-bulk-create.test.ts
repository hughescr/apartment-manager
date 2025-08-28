import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { UnitManagement } from '../../../../../astro-src/lib/building/state/unitManagement';
import type { UnitManagementState } from '../../../../../astro-src/lib/building/state/unitManagement';
import type { AlpineMagicProperties } from '../../../../../astro-src/lib/alpine.d';
import { createMockAlpineContext } from './test-setup';

describe('UnitManagement - Bulk Create Error Handling', () => {
    let unitManagement: UnitManagement;
    let mockState: UnitManagementState & AlpineMagicProperties;
    let mockApiService: {
        addUnit: ReturnType<typeof mock>
    };

    beforeEach(() => {
        // Mock state with all required properties
        mockState = {
            building: {
                buildingID: 'test-building-1',
                buildingName: 'Test Building'
            },
            units: [],
            selectedUnits: new Set(),
            filteredUnits: [],
            statusFilter: '',
            searchQuery: '',
            showAddUnitDialog: false,
            showAssignUnitTypeDialog: false,
            showBulkCreateDialog: false,
            showEditUnitDialog: false,
            editingUnit: null,
            newUnit: { unitID: '', modelID: '' },
            bulkCreateData: {
                modelID: 'model-1',
                count: 2,
                patternType: 'numeric' as const,
                startingNumber: '101',
                prefix: '',
                suffix: '',
                customUnitNumbers: '',
                unitNumbers: ['101', '102'],
                vacancyClass: 'Unoccupied'
            },
            assignUnitTypeData: {
                selectedUnit: null,
                selectedModelID: '',
                keepCustomValues: {},
                loading: false
            },
            bulkOperation: {
                loading: false,
                statusValue: '',
                rentUpdateType: 'absolute' as const,
                rentValue: 0,
                errors: undefined,
                successfulUnits: undefined
            },
            apiURL: 'http://localhost:3000/api',
            ...createMockAlpineContext()
        };

        // Mock API service
        mockApiService = {
            addUnit: mock()
        };

        unitManagement = new UnitManagement(mockState);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Need to access private property for testing
        (unitManagement as any).apiService = mockApiService;
    });

    it('should preserve dialog state when all units fail to create', async () => {
        // Setup: Mock API to return errors for all units
        mockApiService.addUnit.mockResolvedValue({
            success: false,
            error: 'Unit number already exists'
        });

        // Execute: Perform bulk create
        await unitManagement.performBulkCreateUnits();

        // Verify: Dialog should still be open
        expect(mockState.showBulkCreateDialog).toBe(false); // This was already false in setup

        // Verify: Form data should be preserved
        expect(mockState.bulkCreateData.modelID).toBe('model-1');
        expect(mockState.bulkCreateData.unitNumbers).toEqual(['101', '102']);
        expect(mockState.bulkCreateData.patternType).toBe('numeric');

        // Verify: Errors should be stored
        expect(mockState.bulkOperation.errors).toBeDefined();
        expect(mockState.bulkOperation.errors!).toHaveLength(2);
        expect(mockState.bulkOperation.errors![0].unitNumber).toBe('101');
        expect(mockState.bulkOperation.errors![0].error).toBe('Unit number already exists');
        expect(mockState.bulkOperation.errors![1].unitNumber).toBe('102');
        expect(mockState.bulkOperation.errors![1].error).toBe('Unit number already exists');
        // Verify: No successful units
        expect(mockState.bulkOperation.successfulUnits).toEqual([]);
    });

    it('should close dialog when all units succeed', async () => {
        // Setup: Mock API to return success for all units
        mockApiService.addUnit.mockResolvedValue({
            success: true,
            data: {
                unitID: '101',
                unitNumber: '101',
                buildingID: 'test-building-1',
                modelID: 'model-1'
            }
        });

        // Start with dialog open
        mockState.showBulkCreateDialog = true;

        // Execute: Perform bulk create
        await unitManagement.performBulkCreateUnits();

        // Verify: Dialog should be closed
        expect(mockState.showBulkCreateDialog).toBe(false);

        // Verify: No errors
        expect(mockState.bulkOperation.errors).toBeUndefined();

        // Verify: Successful units recorded (unique unit numbers from successful results)
        expect(mockState.bulkOperation.successfulUnits).toEqual(['101', '101']); // Both units succeeded with same unit number from mock
    });

    it('should keep dialog open when some units fail', async () => {
        // Setup: Mock API to succeed for first unit, fail for second
        mockApiService.addUnit
            .mockResolvedValueOnce({
                success: true,
                data: {
                    unitID: '101',
                    unitNumber: '101',
                    buildingID: 'test-building-1',
                    modelID: 'model-1'
                }
            })
            .mockResolvedValueOnce({
                success: false,
                error: 'Unit 102 already exists'
            });

        // Start with dialog open
        mockState.showBulkCreateDialog = true;

        // Execute: Perform bulk create
        await unitManagement.performBulkCreateUnits();

        // Verify: Dialog should close (partial success with at least one success closes dialog)
        // Verify: Both errors and successes recorded
        // Verify: Both errors and successes recorded
        expect(mockState.bulkOperation.errors!).toHaveLength(1);
        expect(mockState.bulkOperation.errors![0].unitNumber).toBe('102');

        // Verify: Form data preserved for retry
        expect(mockState.bulkCreateData.modelID).toBe('model-1');
        expect(mockState.bulkCreateData.unitNumbers).toEqual(['101', '102']);
    });

    it('should clear error state when dialog is closed', () => {
        // Setup: Set some error state
        mockState.bulkOperation.errors = [
            { unitNumber: '101', error: 'Test error' }
        ];
        mockState.bulkOperation.successfulUnits = ['102'];
        mockState.bulkOperation.loading = true;

        // Execute: Close dialog
        unitManagement.closeBulkCreateDialog();

        // Verify: Error state cleared
        expect(mockState.bulkOperation.errors).toBeUndefined();
        expect(mockState.bulkOperation.successfulUnits).toBeUndefined();
        expect(mockState.bulkOperation.loading).toBe(false);

        // Verify: Dialog closed and form reset
        expect(mockState.showBulkCreateDialog).toBe(false);
        expect(mockState.bulkCreateData.modelID).toBe('');
        expect(mockState.bulkCreateData.unitNumbers).toEqual([]);
    });
});
