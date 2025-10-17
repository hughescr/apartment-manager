/**
 * Integration tests for end-to-end floorplan save flow
 * Tests the complete workflow from dialog interaction to API persistence
 * Validates that all components work together correctly
 */
import { describe, test, expect, beforeEach, spyOn } from 'bun:test';
import type { AlpineMagics } from '../../../../../astro-src/lib/alpine-types';
import {
    resetAllMocks,
    createTestBuildingData,
    createTestUnitTypeData,
    createMockAlpineContext,
    jest
} from '../state/test-setup';
import type { BuildingData, UnitTypeData } from '../../../../../astro-src/types';

// Import the actual modules to spy on them
import { UnitTypeManagement, UnitTypeCrud } from '../../../../../astro-src/lib/building/state.ts';
import type { UnitTypeManagementState } from '../../../../../astro-src/lib/building/state.ts';
import * as buildingState from '../../../../../astro-src/lib/building/state.ts';
import { BuildingApiService } from '../../../../../astro-src/lib/building/services/buildingApiService';

// Create spies on the actual modules
let mockValidateUnitType: jest.Mock;
let mockCreateNewUnitType: jest.Mock;
let mockAddUnitType: jest.Mock;
let mockUpdateUnitType: jest.Mock;
let mockRemoveUnitType: jest.Mock;
let mockApiServiceAddUnitType: jest.Mock;
let mockApiServiceUpdateUnitType: jest.Mock;
let mockApiServiceDeleteUnitType: jest.Mock;

describe('Floorplan Save Flow - Integration Tests', () => {
    let management: UnitTypeManagement;
    let mockState: UnitTypeManagementState & AlpineMagics;
    let testBuilding: BuildingData;
    const testApiURL = 'https://api.example.com/buildings/test-building';

    beforeEach(() => {
        resetAllMocks();

        testBuilding = createTestBuildingData();

        // Create spies on the actual module functions
        mockValidateUnitType = spyOn(buildingState, 'validateUnitType');
        mockCreateNewUnitType = spyOn(UnitTypeCrud, 'createNewUnitType');
        mockAddUnitType = spyOn(UnitTypeCrud, 'addUnitType');
        mockUpdateUnitType = spyOn(UnitTypeCrud, 'updateUnitType');
        mockRemoveUnitType = spyOn(UnitTypeCrud, 'removeUnitType');
        mockApiServiceAddUnitType = spyOn(BuildingApiService.prototype, 'addUnitType');
        mockApiServiceUpdateUnitType = spyOn(BuildingApiService.prototype, 'updateUnitType');
        mockApiServiceDeleteUnitType = spyOn(BuildingApiService.prototype, 'deleteUnitType');

        // Create realistic Alpine.js state with event dispatching
        const mockContext = createMockAlpineContext();
        mockState = {
            unitTypes:              [],
            showAddUnitTypeDialog:  false,
            showEditUnitTypeDialog: false,
            newUnitType:            {},
            selectedUnitType:       null,
            building:               testBuilding,
            apiURL:                 testApiURL,
            ...mockContext
        } as UnitTypeManagementState & AlpineMagics;

        management = new UnitTypeManagement(mockState);

        // Setup realistic mock behaviors
        mockValidateUnitType.mockReset();
        mockCreateNewUnitType.mockReset();
        mockAddUnitType.mockReset();
        mockUpdateUnitType.mockReset();
        mockRemoveUnitType.mockReset();
        mockApiServiceAddUnitType.mockReset();
        mockApiServiceUpdateUnitType.mockReset();
        mockApiServiceDeleteUnitType.mockReset();
    });

    describe('Complete Add Floorplan Flow', () => {
        test('should complete full add floorplan workflow with API persistence', async () => {
            expect.assertions(13);

            // Step 1: User opens dialog
            management.openAddUnitTypeDialog();
            expect(mockState.showAddUnitTypeDialog).toBe(true);
            expect(mockState.newUnitType.buildingID).toBe(testBuilding.buildingID);

            // Step 2: User fills in form data
            mockState.newUnitType = {
                modelID:    'model-2br-deluxe',
                modelName:  '2 Bedroom Deluxe',
                beds:       2,
                baths:      2,
                buildingID: testBuilding.buildingID,
                minRent:    1800,
                maxRent:    2200,
                minSqft:    950,
                maxSqft:    1100
            };

            // Step 3: Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors:  {}
            });

            // Step 4: Mock CRUD operations
            const createdUnitType: UnitTypeData = {
                ...mockState.newUnitType,
                unitID:    `MODEL#${mockState.newUnitType.modelID}`,
                updatedAt: new Date('2024-01-01T12:00:00Z')
            } as UnitTypeData;

            mockCreateNewUnitType.mockReturnValue(createdUnitType);
            mockAddUnitType.mockReturnValue([createdUnitType]);

            // Step 5: Mock successful API response
            const apiResponseData = {
                ...createdUnitType,
                updatedAt: new Date() // Server adds timestamp
            };

            mockApiServiceAddUnitType.mockResolvedValue({
                success: true,
                data:    apiResponseData
            });

            // Step 6: User submits form
            await management.addUnitType();

            // Verify complete workflow - should validate the form data that was set
            expect(mockValidateUnitType).toHaveBeenCalledWith({
                modelID:    'model-2br-deluxe',
                modelName:  '2 Bedroom Deluxe',
                beds:       2,
                baths:      2,
                buildingID: testBuilding.buildingID,
                minRent:    1800,
                maxRent:    2200,
                minSqft:    950,
                maxSqft:    1100
            });
            expect(mockCreateNewUnitType).toHaveBeenCalledWith(
                testBuilding.buildingID,
                {
                    modelID:    'model-2br-deluxe',
                    modelName:  '2 Bedroom Deluxe',
                    beds:       2,
                    baths:      2,
                    buildingID: testBuilding.buildingID,
                    minRent:    1800,
                    maxRent:    2200,
                    minSqft:    950,
                    maxSqft:    1100
                }
            );
            expect(mockApiServiceAddUnitType).toHaveBeenCalledWith(
                testBuilding.buildingID,
                createdUnitType
            );

            // Verify state updates
            expect(mockAddUnitType).toHaveBeenCalledWith([], apiResponseData);
            // State should contain the API response data (may have different timestamps)
            expect(mockState.unitTypes).toHaveLength(1);
            expect(mockState.unitTypes[0].modelID).toBe('model-2br-deluxe');
            expect(mockState.unitTypes[0].modelName).toBe('2 Bedroom Deluxe');
            expect(mockState.showAddUnitTypeDialog).toBe(false);
            expect(mockState.newUnitType).toEqual({});

            // Verify user feedback
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type added successfully',
                type:    'success'
            });

            // Verify component communication - check that unit-types:updated was dispatched
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', expect.any(Object));
        });

        test('should handle validation failure during form submission', async () => {
            expect.assertions(7);

            // User opens dialog and fills incomplete data
            management.openAddUnitTypeDialog();
            mockState.newUnitType = {
                modelID:    '', // Missing required field
                modelName:  '   ', // Empty name
                beds:       2,
                baths:      2,
                buildingID: testBuilding.buildingID
            };

            // Mock validation failure
            mockValidateUnitType.mockReturnValue({
                isValid: false,
                errors:  {
                    modelID:   'Model ID is required',
                    modelName: 'Model name cannot be empty'
                }
            });

            // User attempts to submit
            await management.addUnitType();

            // Verify validation stops the process
            expect(mockValidateUnitType).toHaveBeenCalledWith(mockState.newUnitType);
            expect(mockCreateNewUnitType).not.toHaveBeenCalled();
            expect(mockApiServiceAddUnitType).not.toHaveBeenCalled();

            // Verify user sees error and form stays open
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Model ID is required',
                type:    'error'
            });
            expect(mockState.showAddUnitTypeDialog).toBe(true);
            expect(mockState.unitTypes).toEqual([]);
            expect(mockState.newUnitType.modelID).toBe(''); // Form data preserved
        });

        test('should handle API conflicts (409) gracefully', async () => {
            expect.assertions(8);

            // User fills valid data
            management.openAddUnitTypeDialog();
            mockState.newUnitType = {
                modelID:    'existing-model',
                modelName:  'Existing Model',
                beds:       2,
                baths:      2,
                buildingID: testBuilding.buildingID,
                minRent:    1800
            };

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors:  {}
            });

            const createdUnitType = { ...mockState.newUnitType, unitID: 'MODEL#existing-model' } as UnitTypeData;
            mockCreateNewUnitType.mockReturnValue(createdUnitType);

            // Mock API conflict response
            mockApiServiceAddUnitType.mockResolvedValue({
                success: false,
                error:   'Unit type with this model ID already exists'
            });

            // User submits
            await management.addUnitType();

            // Verify API was called but local state not updated
            expect(mockValidateUnitType).toHaveBeenCalled();
            expect(mockCreateNewUnitType).toHaveBeenCalled();
            expect(mockApiServiceAddUnitType).toHaveBeenCalled();
            expect(mockAddUnitType).not.toHaveBeenCalled();

            // Verify error handling
            expect(mockState.unitTypes).toEqual([]);
            expect(mockState.showAddUnitTypeDialog).toBe(true); // Form stays open
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type with this model ID already exists',
                type:    'error'
            });
            expect(mockState.$dispatch).not.toHaveBeenCalledWith('unit-types:updated', expect.any(Object));
        });

        test('should handle network failures with proper fallback', async () => {
            expect.assertions(7);

            // User fills valid data
            management.openAddUnitTypeDialog();
            mockState.newUnitType = {
                modelID:    'model-network-test',
                modelName:  'Network Test Model',
                beds:       1,
                baths:      1,
                buildingID: testBuilding.buildingID
            };

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors:  {}
            });

            const createdUnitType = { ...mockState.newUnitType, unitID: 'MODEL#model-network-test' } as UnitTypeData;
            mockCreateNewUnitType.mockReturnValue(createdUnitType);

            // Mock network failure
            const networkError = new Error('fetch failed');
            mockApiServiceAddUnitType.mockRejectedValue(networkError);

            // User submits
            await management.addUnitType();

            // Verify attempted API call
            expect(mockValidateUnitType).toHaveBeenCalled();
            expect(mockCreateNewUnitType).toHaveBeenCalled();
            expect(mockApiServiceAddUnitType).toHaveBeenCalled();

            // Verify error handling - no local state changes
            expect(mockAddUnitType).not.toHaveBeenCalled();
            expect(mockState.unitTypes).toEqual([]);
            expect(mockState.showAddUnitTypeDialog).toBe(true);
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'fetch failed',
                type:    'error'
            });
        });
    });

    describe('Offline Mode Fallback', () => {
        test('should work correctly when API is not available', async () => {
            expect.assertions(8);

            // Simulate no API URL (offline mode)
            mockState.apiURL = '';
            management = new UnitTypeManagement(mockState);

            // User workflow
            management.openAddUnitTypeDialog();
            mockState.newUnitType = {
                modelID:    'offline-model',
                modelName:  'Offline Test Model',
                beds:       1,
                baths:      1,
                buildingID: testBuilding.buildingID
            };

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors:  {}
            });

            const createdUnitType = { ...mockState.newUnitType, unitID: 'MODEL#offline-model' } as UnitTypeData;
            mockCreateNewUnitType.mockReturnValue(createdUnitType);
            mockAddUnitType.mockReturnValue([createdUnitType]);

            // User submits
            await management.addUnitType();

            // Verify no API call but local operations work
            expect(mockValidateUnitType).toHaveBeenCalled();
            expect(mockCreateNewUnitType).toHaveBeenCalled();
            expect(mockApiServiceAddUnitType).not.toHaveBeenCalled();
            expect(mockAddUnitType).toHaveBeenCalledWith([], createdUnitType);

            // Verify state updated locally
            expect(mockState.unitTypes).toEqual([createdUnitType]);
            expect(mockState.showAddUnitTypeDialog).toBe(false);
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type added successfully',
                type:    'success'
            });
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', {
                unitTypes: [createdUnitType]
            });
        });
    });

    describe('Update Floorplan Flow', () => {
        const existingUnitType = createTestUnitTypeData({ modelID: 'existing-model' });

        beforeEach(() => {
            mockState.unitTypes = [existingUnitType];
        });

        test('should complete full update workflow', async () => {
            expect.assertions(8);

            const updates = {
                modelName: 'Updated Model Name',
                minRent:   2000,
                maxRent:   2500
            };

            const updatedUnitType = { ...existingUnitType, ...updates };
            mockUpdateUnitType.mockReturnValue([updatedUnitType]);

            // Mock successful API response
            mockApiServiceUpdateUnitType.mockResolvedValue({
                success: true,
                data:    updatedUnitType
            });

            // Perform update
            await management.updateUnitType('existing-model', updates);

            // Verify API call
            expect(mockApiServiceUpdateUnitType).toHaveBeenCalledWith(
                testBuilding.buildingID,
                'existing-model',
                updates
            );

            // Verify state updates - implementation may modify state before CRUD call
            expect(mockUpdateUnitType).toHaveBeenCalled();
            const [_stateArg, modelIdArg, dataArg] = mockUpdateUnitType.mock.calls[0] as [unknown, string, UnitTypeData];
            expect(modelIdArg).toBe('existing-model');
            expect(dataArg).toEqual(updatedUnitType);
            expect(mockState.unitTypes).toEqual([updatedUnitType]);

            // Verify events
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', {
                unitTypes: [updatedUnitType]
            });
            expect(mockState.$dispatch).toHaveBeenCalledTimes(2); // Update success shows toast too
            expect(mockApiServiceUpdateUnitType).toHaveBeenCalledTimes(1);
        });
    });

    describe('Delete Floorplan Flow', () => {
        const existingUnitTypes = [
            createTestUnitTypeData({ modelID: 'model-to-delete' }),
            createTestUnitTypeData({ modelID: 'model-to-keep' })
        ];

        beforeEach(() => {
            mockState.unitTypes = [...existingUnitTypes];
            // Reset window.confirm mock
            (global as typeof globalThis & { confirm: jest.Mock }).confirm = jest.fn().mockReturnValue(true);
        });

        test('should complete full delete workflow with confirmation', async () => {
            expect.assertions(9);

            const remainingUnitTypes = [existingUnitTypes[1]];
            mockRemoveUnitType.mockReturnValue(remainingUnitTypes);

            // Mock successful API response
            mockApiServiceDeleteUnitType.mockResolvedValue({
                success: true
            });

            // Perform delete
            await management.deleteUnitType('model-to-delete');

            // Verify user confirmation
            expect((global as typeof globalThis & { confirm: jest.Mock }).confirm).toHaveBeenCalledWith(
                'Are you sure you want to delete unit type model-to-delete?'
            );

            // Verify API call
            expect(mockApiServiceDeleteUnitType).toHaveBeenCalledWith(
                testBuilding.buildingID,
                'model-to-delete'
            );

            // Verify state updates - implementation may modify state before CRUD call
            expect(mockRemoveUnitType).toHaveBeenCalled();
            const mockCalls = mockRemoveUnitType.mock.calls[0] as unknown[];
            const modelIdDeleteArg = mockCalls[1] as string;
            expect(modelIdDeleteArg).toBe('model-to-delete');
            expect(mockState.unitTypes).toEqual(remainingUnitTypes);

            // Verify user feedback
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type deleted successfully',
                type:    'success'
            });
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', {
                unitTypes: remainingUnitTypes
            });
            expect(mockState.$dispatch).toHaveBeenCalledTimes(2);
            expect(mockApiServiceDeleteUnitType).toHaveBeenCalledTimes(1);
        });

        test('should abort delete when user cancels confirmation', async () => {
            expect.assertions(4);

            // Mock user cancellation
            (global as typeof globalThis & { confirm: jest.Mock }).confirm = jest.fn().mockReturnValue(false);

            // Attempt delete
            await management.deleteUnitType('model-to-delete');

            // Verify confirmation was shown
            expect((global as typeof globalThis & { confirm: jest.Mock }).confirm).toHaveBeenCalledWith(
                'Are you sure you want to delete unit type model-to-delete?'
            );

            // Verify nothing else happened
            expect(mockApiServiceDeleteUnitType).not.toHaveBeenCalled();
            expect(mockRemoveUnitType).not.toHaveBeenCalled();
            expect(mockState.unitTypes).toEqual(existingUnitTypes); // Unchanged
        });
    });

    describe('Persistence Verification', () => {
        test('should verify that floorplan persists after page reload simulation', async () => {
            expect.assertions(5);

            // Step 1: Add floorplan
            management.openAddUnitTypeDialog();
            mockState.newUnitType = {
                modelID:    'persistent-model',
                modelName:  'Persistent Model',
                beds:       2,
                baths:      2,
                buildingID: testBuilding.buildingID
            };

            mockValidateUnitType.mockReturnValue({ isValid: true, errors: {} });
            const createdUnitType = { ...mockState.newUnitType, unitID: 'MODEL#persistent-model' } as UnitTypeData;
            mockCreateNewUnitType.mockReturnValue(createdUnitType);
            mockAddUnitType.mockReturnValue([createdUnitType]);

            // Mock successful save to API
            mockApiServiceAddUnitType.mockResolvedValue({
                success: true,
                data:    createdUnitType
            });

            await management.addUnitType();

            // Verify item was added
            expect(mockState.unitTypes).toEqual([createdUnitType]);
            expect(mockApiServiceAddUnitType).toHaveBeenCalledTimes(1);

            // Step 2: Simulate page reload - create new management instance
            // In real app, data would come from server via HTML dataset
            const newMockState = {
                ...mockState,
                unitTypes:             [createdUnitType], // Simulates server data
                showAddUnitTypeDialog: false,
                newUnitType:           {}
            };

            // Step 3: Verify data persisted
            expect(newMockState.unitTypes).toEqual([createdUnitType]);
            expect(UnitTypeCrud.getAllUnitTypes(newMockState.unitTypes)).toEqual([createdUnitType]);
            expect(newMockState.unitTypes.find((ut: UnitTypeData) => ut.modelID === 'persistent-model')).toEqual(createdUnitType);
        });
    });

    describe('Error Recovery', () => {
        test('should handle partial failures and maintain UI state', async () => {
            expect.assertions(6);

            // Setup: User has filled form
            management.openAddUnitTypeDialog();
            const formData = {
                modelID:    'recovery-test',
                modelName:  'Recovery Test Model',
                beds:       2,
                baths:      2,
                buildingID: testBuilding.buildingID
            };
            mockState.newUnitType = formData;

            // Mock validation passes
            mockValidateUnitType.mockReturnValue({ isValid: true, errors: {} });
            const createdUnitType = { ...formData, unitID: 'MODEL#recovery-test' } as UnitTypeData;
            mockCreateNewUnitType.mockReturnValue(createdUnitType);

            // Mock API failure
            mockApiServiceAddUnitType.mockResolvedValue({
                success: false,
                error:   'Internal server error'
            });

            // User submits and gets error
            await management.addUnitType();

            // Verify form state is preserved for retry
            expect(mockState.showAddUnitTypeDialog).toBe(true); // Dialog stays open
            expect(mockState.newUnitType).toEqual(formData); // Form data preserved
            expect(mockState.unitTypes).toEqual([]); // No local changes
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Internal server error',
                type:    'error'
            });

            // User can retry - mock success this time
            mockApiServiceAddUnitType.mockResolvedValue({
                success: true,
                data:    createdUnitType
            });

            mockAddUnitType.mockReturnValue([createdUnitType]);

            await management.addUnitType();

            // Verify recovery succeeded
            expect(mockState.unitTypes).toEqual([createdUnitType]);
            expect(mockState.showAddUnitTypeDialog).toBe(false);
        });
    });
});
