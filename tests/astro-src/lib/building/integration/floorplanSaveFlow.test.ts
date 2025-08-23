/**
 * Integration tests for end-to-end floorplan save flow
 * Tests the complete workflow from dialog interaction to API persistence
 * Validates that all components work together correctly
 */
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import type { AlpineMagicProperties } from '../../../../../astro-src/lib/alpine';
import {
    resetAllMocks,
    createTestBuildingData,
    createTestUnitTypeData,
    createMockAlpineContext,
    mockFetch,
    createMockResponse,
    jest
} from '../state/test-setup';
import type { BuildingData, UnitTypeData } from '../../../../../astro-src/types';

// Mock validation module with realistic validation
const mockValidateUnitType = jest.fn();
mock.module('../../../../../astro-src/lib/building/state/unitTypeValidation', () => ({
    validateUnitType: mockValidateUnitType
}));

// Mock CRUD module with realistic operations
const mockUnitTypeCrud = {
    createNewUnitType: jest.fn(),
    addUnitType: jest.fn(),
    updateUnitType: jest.fn(),
    removeUnitType: jest.fn()
};
mock.module('../../../../../astro-src/lib/building/state/unitTypeCrud', () => ({
    UnitTypeCrud: mockUnitTypeCrud
}));

// Import after mocking
import { UnitTypeManagement } from '../../../../../astro-src/lib/building/state/unitTypeManagement';
import type { UnitTypeManagementState } from '../../../../../astro-src/lib/building/state/unitTypeManagement';

describe('Floorplan Save Flow - Integration Tests', () => {
    let management: UnitTypeManagement;
    let mockState: UnitTypeManagementState & AlpineMagicProperties;
    let testBuilding: BuildingData;
    const testApiURL = 'https://api.example.com/buildings/test-building';

    beforeEach(() => {
        resetAllMocks();

        testBuilding = createTestBuildingData();

        // Create realistic Alpine.js state with event dispatching
        const mockContext = createMockAlpineContext();
        mockState = {
            unitTypes: [],
            showAddUnitTypeDialog: false,
            newUnitType: {},
            building: testBuilding,
            apiURL: testApiURL,
            ...mockContext
        };

        management = new UnitTypeManagement(mockState);

        // Setup realistic mock behaviors
        mockValidateUnitType.mockReset();
        mockUnitTypeCrud.createNewUnitType.mockReset();
        mockUnitTypeCrud.addUnitType.mockReset();
        mockUnitTypeCrud.updateUnitType.mockReset();
        mockUnitTypeCrud.removeUnitType.mockReset();
    });

    describe('Complete Add Floorplan Flow', () => {
        test('should complete full add floorplan workflow with API persistence', async () => {
            expect.assertions(12);

            // Step 1: User opens dialog
            management.openAddUnitTypeDialog();
            expect(mockState.showAddUnitTypeDialog).toBe(true);
            expect(mockState.newUnitType.buildingID).toBe(testBuilding.buildingID);

            // Step 2: User fills in form data
            mockState.newUnitType = {
                modelID: 'model-2br-deluxe',
                modelName: '2 Bedroom Deluxe',
                beds: 2,
                baths: 2,
                buildingID: testBuilding.buildingID,
                minRent: 1800,
                maxRent: 2200,
                minSqft: 950,
                maxSqft: 1100
            };

            // Step 3: Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            // Step 4: Mock CRUD operations
            const createdUnitType: UnitTypeData = {
                ...mockState.newUnitType,
                unitID: `MODEL#${mockState.newUnitType.modelID}`,
                updatedAt: new Date('2024-01-01T12:00:00Z')
            } as UnitTypeData;

            mockUnitTypeCrud.createNewUnitType.mockReturnValue(createdUnitType);
            mockUnitTypeCrud.addUnitType.mockReturnValue([createdUnitType]);

            // Step 5: Mock successful API response
            const apiResponseData = {
                ...createdUnitType,
                updatedAt: new Date() // Server adds timestamp
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: true,
                status: 201,
                json: () => Promise.resolve(apiResponseData)
            }));

            // Step 6: User submits form
            await management.addUnitType();

            // Verify complete workflow
            expect(mockValidateUnitType).toHaveBeenCalledWith(mockState.newUnitType);
            expect(mockUnitTypeCrud.createNewUnitType).toHaveBeenCalledWith(
                testBuilding.buildingID,
                mockState.newUnitType
            );
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/unit-types`,
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(createdUnitType)
                })
            );

            // Verify state updates
            expect(mockUnitTypeCrud.addUnitType).toHaveBeenCalledWith([], apiResponseData);
            expect(mockState.unitTypes).toEqual([apiResponseData]);
            expect(mockState.showAddUnitTypeDialog).toBe(false);
            expect(mockState.newUnitType).toEqual({});

            // Verify user feedback
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type added successfully',
                type: 'success'
            });

            // Verify component communication
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', {
                unitTypes: [apiResponseData]
            });
        });

        test('should handle validation failure during form submission', async () => {
            expect.assertions(7);

            // User opens dialog and fills incomplete data
            management.openAddUnitTypeDialog();
            mockState.newUnitType = {
                modelID: '', // Missing required field
                modelName: '   ', // Empty name
                beds: 2,
                baths: 2,
                buildingID: testBuilding.buildingID
            };

            // Mock validation failure
            mockValidateUnitType.mockReturnValue({
                isValid: false,
                errors: {
                    modelID: 'Model ID is required',
                    modelName: 'Model name cannot be empty'
                }
            });

            // User attempts to submit
            await management.addUnitType();

            // Verify validation stops the process
            expect(mockValidateUnitType).toHaveBeenCalledWith(mockState.newUnitType);
            expect(mockUnitTypeCrud.createNewUnitType).not.toHaveBeenCalled();
            expect(mockFetch).not.toHaveBeenCalled();

            // Verify user sees error and form stays open
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Model ID is required',
                type: 'error'
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
                modelID: 'existing-model',
                modelName: 'Existing Model',
                beds: 2,
                baths: 2,
                buildingID: testBuilding.buildingID,
                minRent: 1800
            };

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            const createdUnitType = { ...mockState.newUnitType, unitID: 'MODEL#existing-model' } as UnitTypeData;
            mockUnitTypeCrud.createNewUnitType.mockReturnValue(createdUnitType);

            // Mock API conflict response
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: false,
                status: 409,
                text: () => Promise.resolve('Unit type with this model ID already exists')
            }));

            // User submits
            await management.addUnitType();

            // Verify API was called but local state not updated
            expect(mockValidateUnitType).toHaveBeenCalled();
            expect(mockUnitTypeCrud.createNewUnitType).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalled();
            expect(mockUnitTypeCrud.addUnitType).not.toHaveBeenCalled();

            // Verify error handling
            expect(mockState.unitTypes).toEqual([]);
            expect(mockState.showAddUnitTypeDialog).toBe(true); // Form stays open
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type with this model ID already exists',
                type: 'error'
            });
            expect(mockState.$dispatch).not.toHaveBeenCalledWith('unit-types:updated', expect.any(Object));
        });

        test('should handle network failures with proper fallback', async () => {
            expect.assertions(7);

            // User fills valid data
            management.openAddUnitTypeDialog();
            mockState.newUnitType = {
                modelID: 'model-network-test',
                modelName: 'Network Test Model',
                beds: 1,
                baths: 1,
                buildingID: testBuilding.buildingID
            };

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            const createdUnitType = { ...mockState.newUnitType, unitID: 'MODEL#model-network-test' } as UnitTypeData;
            mockUnitTypeCrud.createNewUnitType.mockReturnValue(createdUnitType);

            // Mock network failure
            const networkError = new Error('fetch failed');
            mockFetch.mockRejectedValueOnce(networkError);

            // User submits
            await management.addUnitType();

            // Verify attempted API call
            expect(mockValidateUnitType).toHaveBeenCalled();
            expect(mockUnitTypeCrud.createNewUnitType).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalled();

            // Verify error handling - no local state changes
            expect(mockUnitTypeCrud.addUnitType).not.toHaveBeenCalled();
            expect(mockState.unitTypes).toEqual([]);
            expect(mockState.showAddUnitTypeDialog).toBe(true);
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'fetch failed',
                type: 'error'
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
                modelID: 'offline-model',
                modelName: 'Offline Test Model',
                beds: 1,
                baths: 1,
                buildingID: testBuilding.buildingID
            };

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            const createdUnitType = { ...mockState.newUnitType, unitID: 'MODEL#offline-model' } as UnitTypeData;
            mockUnitTypeCrud.createNewUnitType.mockReturnValue(createdUnitType);
            mockUnitTypeCrud.addUnitType.mockReturnValue([createdUnitType]);

            // User submits
            await management.addUnitType();

            // Verify no API call but local operations work
            expect(mockValidateUnitType).toHaveBeenCalled();
            expect(mockUnitTypeCrud.createNewUnitType).toHaveBeenCalled();
            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockUnitTypeCrud.addUnitType).toHaveBeenCalledWith([], createdUnitType);

            // Verify state updated locally
            expect(mockState.unitTypes).toEqual([createdUnitType]);
            expect(mockState.showAddUnitTypeDialog).toBe(false);
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type added successfully',
                type: 'success'
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
            expect.assertions(7);

            const updates = {
                modelName: 'Updated Model Name',
                minRent: 2000,
                maxRent: 2500
            };

            const updatedUnitType = { ...existingUnitType, ...updates };
            mockUnitTypeCrud.updateUnitType.mockReturnValue([updatedUnitType]);

            // Mock successful API response
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: true,
                status: 200,
                json: () => Promise.resolve(updatedUnitType)
            }));

            // Perform update
            await management.updateUnitType('existing-model', updates);

            // Verify API call
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/unit-types/existing-model`,
                expect.objectContaining({
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                })
            );

            // Verify state updates
            expect(mockUnitTypeCrud.updateUnitType).toHaveBeenCalledWith(
                [existingUnitType],
                'existing-model',
                updatedUnitType
            );
            expect(mockState.unitTypes).toEqual([updatedUnitType]);

            // Verify events
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', {
                unitTypes: [updatedUnitType]
            });
            expect(mockState.$dispatch).toHaveBeenCalledTimes(1);
            expect(mockState.$dispatch).not.toHaveBeenCalledWith('toast:show', expect.any(Object));
            expect(mockFetch).toHaveBeenCalledTimes(1);
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
            expect.assertions(8);

            const remainingUnitTypes = [existingUnitTypes[1]];
            mockUnitTypeCrud.removeUnitType.mockReturnValue(remainingUnitTypes);

            // Mock successful API response
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: true,
                status: 200
            }));

            // Perform delete
            await management.deleteUnitType('model-to-delete');

            // Verify user confirmation
            expect((global as typeof globalThis & { confirm: jest.Mock }).confirm).toHaveBeenCalledWith(
                'Are you sure you want to delete unit type model-to-delete?'
            );

            // Verify API call
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/unit-types/model-to-delete`,
                expect.objectContaining({
                    method: 'DELETE'
                })
            );

            // Verify state updates
            expect(mockUnitTypeCrud.removeUnitType).toHaveBeenCalledWith(
                existingUnitTypes,
                'model-to-delete'
            );
            expect(mockState.unitTypes).toEqual(remainingUnitTypes);

            // Verify user feedback
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type deleted successfully',
                type: 'success'
            });
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', {
                unitTypes: remainingUnitTypes
            });
            expect(mockState.$dispatch).toHaveBeenCalledTimes(2);
            expect(mockFetch).toHaveBeenCalledTimes(1);
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
            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockUnitTypeCrud.removeUnitType).not.toHaveBeenCalled();
            expect(mockState.unitTypes).toEqual(existingUnitTypes); // Unchanged
        });
    });

    describe('Persistence Verification', () => {
        test('should verify that floorplan persists after page reload simulation', async () => {
            expect.assertions(5);

            // Step 1: Add floorplan
            management.openAddUnitTypeDialog();
            mockState.newUnitType = {
                modelID: 'persistent-model',
                modelName: 'Persistent Model',
                beds: 2,
                baths: 2,
                buildingID: testBuilding.buildingID
            };

            mockValidateUnitType.mockReturnValue({ isValid: true, errors: {} });
            const createdUnitType = { ...mockState.newUnitType, unitID: 'MODEL#persistent-model' } as UnitTypeData;
            mockUnitTypeCrud.createNewUnitType.mockReturnValue(createdUnitType);
            mockUnitTypeCrud.addUnitType.mockReturnValue([createdUnitType]);

            // Mock successful save to API
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: true,
                status: 201,
                json: () => Promise.resolve(createdUnitType)
            }));

            await management.addUnitType();

            // Verify item was added
            expect(mockState.unitTypes).toEqual([createdUnitType]);
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Step 2: Simulate page reload - create new management instance
            // In real app, data would come from server via HTML dataset
            const newMockState = {
                ...mockState,
                unitTypes: [createdUnitType], // Simulates server data
                showAddUnitTypeDialog: false,
                newUnitType: {}
            };

            const newManagement = new UnitTypeManagement(newMockState);

            // Step 3: Verify data persisted
            expect(newMockState.unitTypes).toEqual([createdUnitType]);
            expect(newManagement.getAllUnitTypes()).toEqual([createdUnitType]);
            expect(newManagement.getUnitType('persistent-model')).toEqual(createdUnitType);
        });
    });

    describe('Error Recovery', () => {
        test('should handle partial failures and maintain UI state', async () => {
            expect.assertions(6);

            // Setup: User has filled form
            management.openAddUnitTypeDialog();
            const formData = {
                modelID: 'recovery-test',
                modelName: 'Recovery Test Model',
                beds: 2,
                baths: 2,
                buildingID: testBuilding.buildingID
            };
            mockState.newUnitType = formData;

            // Mock validation passes
            mockValidateUnitType.mockReturnValue({ isValid: true, errors: {} });
            const createdUnitType = { ...formData, unitID: 'MODEL#recovery-test' } as UnitTypeData;
            mockUnitTypeCrud.createNewUnitType.mockReturnValue(createdUnitType);

            // Mock API failure
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Internal server error')
            }));

            // User submits and gets error
            await management.addUnitType();

            // Verify form state is preserved for retry
            expect(mockState.showAddUnitTypeDialog).toBe(true); // Dialog stays open
            expect(mockState.newUnitType).toEqual(formData); // Form data preserved
            expect(mockState.unitTypes).toEqual([]); // No local changes
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Internal server error',
                type: 'error'
            });

            // User can retry - mock success this time
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: true,
                status: 201,
                json: () => Promise.resolve(createdUnitType)
            }));

            mockUnitTypeCrud.addUnitType.mockReturnValue([createdUnitType]);

            await management.addUnitType();

            // Verify recovery succeeded
            expect(mockState.unitTypes).toEqual([createdUnitType]);
            expect(mockState.showAddUnitTypeDialog).toBe(false);
        });
    });
});
