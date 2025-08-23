/**
 * Unit tests for UnitTypeManagement async operations
 * Tests the state management class methods for unit type operations
 * Focuses on API integration, error handling, state updates, and event dispatching
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
} from './test-setup';
import type { BuildingData, UnitTypeData } from '../../../../../astro-src/types';

// Mock validation module
const mockValidateUnitType = jest.fn();
mock.module('../../../../../astro-src/lib/building/state/unitTypeValidation', () => ({
    validateUnitType: mockValidateUnitType
}));

// Mock CRUD module
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

describe('UnitTypeManagement - Async Operations', () => {
    let management: UnitTypeManagement;
    let mockState: UnitTypeManagementState & AlpineMagicProperties;
    let testBuilding: BuildingData;
    let testUnitType: Partial<UnitTypeData>;
    const testApiURL = 'https://api.example.com/buildings/test-building';

    beforeEach(() => {
        resetAllMocks();

        testBuilding = createTestBuildingData();
        testUnitType = {
            modelID: 'model-2br',
            modelName: '2 Bedroom Deluxe',
            beds: 2,
            baths: 2,
            buildingID: testBuilding.buildingID,
            minRent: 1800,
            maxRent: 2200
        };

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

        // Reset mock implementations
        mockValidateUnitType.mockReset();
        mockUnitTypeCrud.createNewUnitType.mockReset();
        mockUnitTypeCrud.addUnitType.mockReset();
        mockUnitTypeCrud.updateUnitType.mockReset();
        mockUnitTypeCrud.removeUnitType.mockReset();
    });

    describe('addUnitType', () => {
        beforeEach(() => {
            mockState.newUnitType = testUnitType;
        });

        test('should successfully add unit type with API', async () => {
            expect.assertions(9);

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            // Mock CRUD operations
            const createdUnitType: UnitTypeData = { ...testUnitType as Required<typeof testUnitType>, buildingID: testBuilding.buildingID };
            mockUnitTypeCrud.createNewUnitType.mockReturnValue(createdUnitType);
            mockUnitTypeCrud.addUnitType.mockReturnValue([createdUnitType]);

            // Mock successful API response
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: true,
                status: 201,
                json: () => Promise.resolve(createdUnitType)
            }));

            await management.addUnitType();

            expect(mockValidateUnitType).toHaveBeenCalledWith(testUnitType);
            expect(mockUnitTypeCrud.createNewUnitType).toHaveBeenCalledWith(
                testBuilding.buildingID,
                testUnitType
            );
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/unit-types`,
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(createdUnitType)
                })
            );
            expect(mockUnitTypeCrud.addUnitType).toHaveBeenCalledWith([], createdUnitType);
            expect(mockState.unitTypes).toEqual([createdUnitType]);
            expect(mockState.showAddUnitTypeDialog).toBe(false);
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type added successfully',
                type: 'success'
            });
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', {
                unitTypes: [createdUnitType]
            });
            expect(mockState.$dispatch).toHaveBeenCalledTimes(2);
        });

        test('should handle validation errors', async () => {
            expect.assertions(5);

            // Mock validation failure
            mockValidateUnitType.mockReturnValue({
                isValid: false,
                errors: {
                    modelID: 'Model ID is required',
                    modelName: 'Model name cannot be empty'
                }
            });

            await management.addUnitType();

            expect(mockValidateUnitType).toHaveBeenCalledWith(testUnitType);
            expect(mockUnitTypeCrud.createNewUnitType).not.toHaveBeenCalled();
            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Model ID is required',
                type: 'error'
            });
            expect(mockState.showAddUnitTypeDialog).toBe(true); // Should remain open
        });

        test('should handle missing building ID', async () => {
            expect.assertions(4);

            mockState.building = null;

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            await management.addUnitType();

            expect(mockValidateUnitType).toHaveBeenCalledWith(testUnitType);
            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Building ID not available',
                type: 'error'
            });
            expect(mockState.showAddUnitTypeDialog).toBe(true);
        });

        test('should handle API errors', async () => {
            expect.assertions(6);

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            const createdUnitType: UnitTypeData = { ...testUnitType as Required<typeof testUnitType>, buildingID: testBuilding.buildingID };
            mockUnitTypeCrud.createNewUnitType.mockReturnValue(createdUnitType);

            // Mock API error response
            const errorMessage = 'Unit type already exists';
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: false,
                status: 409,
                text: () => Promise.resolve(errorMessage)
            }));

            await management.addUnitType();

            expect(mockValidateUnitType).toHaveBeenCalledWith(testUnitType);
            expect(mockUnitTypeCrud.createNewUnitType).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalled();
            expect(mockUnitTypeCrud.addUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: errorMessage,
                type: 'error'
            });
            expect(mockState.showAddUnitTypeDialog).toBe(true);
        });

        test('should handle network errors', async () => {
            expect.assertions(5);

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            const createdUnitType: UnitTypeData = { ...testUnitType as Required<typeof testUnitType>, buildingID: testBuilding.buildingID };
            mockUnitTypeCrud.createNewUnitType.mockReturnValue(createdUnitType);

            // Mock network error
            const networkError = new Error('Network connection failed');
            mockFetch.mockRejectedValueOnce(networkError);

            await management.addUnitType();

            expect(mockValidateUnitType).toHaveBeenCalledWith(testUnitType);
            expect(mockUnitTypeCrud.createNewUnitType).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Network connection failed',
                type: 'error'
            });
            expect(mockState.showAddUnitTypeDialog).toBe(true);
        });

        test('should fallback to local state when API not available', async () => {
            expect.assertions(7);

            // Clear API URL to simulate no API service
            mockState.apiURL = '';
            management = new UnitTypeManagement(mockState);

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            const createdUnitType: UnitTypeData = { ...testUnitType as Required<typeof testUnitType>, buildingID: testBuilding.buildingID };
            mockUnitTypeCrud.createNewUnitType.mockReturnValue(createdUnitType);
            mockUnitTypeCrud.addUnitType.mockReturnValue([createdUnitType]);

            await management.addUnitType();

            expect(mockValidateUnitType).toHaveBeenCalledWith(testUnitType);
            expect(mockUnitTypeCrud.createNewUnitType).toHaveBeenCalled();
            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockUnitTypeCrud.addUnitType).toHaveBeenCalledWith([], createdUnitType);
            expect(mockState.unitTypes).toEqual([createdUnitType]);
            expect(mockState.showAddUnitTypeDialog).toBe(false);
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type added successfully',
                type: 'success'
            });
        });

        test('should use API response data when available', async () => {
            expect.assertions(3);

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            const createdUnitType: UnitTypeData = { ...testUnitType as Required<typeof testUnitType>, buildingID: testBuilding.buildingID };
            const apiResponseData = { ...createdUnitType, updatedAt: new Date() };
            mockUnitTypeCrud.addUnitType.mockReturnValue([apiResponseData]);

            // Mock successful API response with additional data
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: true,
                status: 201,
                json: () => Promise.resolve(apiResponseData)
            }));

            await management.addUnitType();

            expect(mockUnitTypeCrud.addUnitType).toHaveBeenCalledWith([], apiResponseData);
            expect(mockState.unitTypes).toEqual([apiResponseData]);
            expect(mockState.showAddUnitTypeDialog).toBe(false);
        });
    });

    describe('updateUnitType', () => {
        const testModelID = 'model-2br';
        const testUpdates = { modelName: 'Updated 2 Bedroom', minRent: 1900 };
        const existingUnitType = createTestUnitTypeData({ modelID: testModelID });

        beforeEach(() => {
            mockState.unitTypes = [existingUnitType];
        });

        test('should successfully update unit type with API', async () => {
            expect.assertions(6);

            const updatedUnitType = { ...existingUnitType, ...testUpdates };
            mockUnitTypeCrud.updateUnitType.mockReturnValue([updatedUnitType]);

            // Mock successful API response
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: true,
                status: 200,
                json: () => Promise.resolve(updatedUnitType)
            }));

            await management.updateUnitType(testModelID, testUpdates);

            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/unit-types/${testModelID}`,
                expect.objectContaining({
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testUpdates)
                })
            );
            expect(mockUnitTypeCrud.updateUnitType).toHaveBeenCalledWith(
                [existingUnitType],
                testModelID,
                updatedUnitType
            );
            expect(mockState.unitTypes).toEqual([updatedUnitType]);
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', {
                unitTypes: [updatedUnitType]
            });
            expect(mockState.$dispatch).not.toHaveBeenCalledWith('toast:show');
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        test('should handle missing building ID during update', async () => {
            expect.assertions(3);

            mockState.building = null;

            await management.updateUnitType(testModelID, testUpdates);

            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockUnitTypeCrud.updateUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Building ID not available',
                type: 'error'
            });
        });

        test('should handle API errors during update', async () => {
            expect.assertions(4);

            const errorMessage = 'Unit type not found';
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: false,
                status: 404,
                text: () => Promise.resolve(errorMessage)
            }));

            await management.updateUnitType(testModelID, testUpdates);

            expect(mockFetch).toHaveBeenCalled();
            expect(mockUnitTypeCrud.updateUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: errorMessage,
                type: 'error'
            });
            expect(mockState.unitTypes).toEqual([existingUnitType]); // Unchanged
        });

        test('should fallback to local updates without API response data', async () => {
            expect.assertions(4);

            mockUnitTypeCrud.updateUnitType.mockReturnValue([{ ...existingUnitType, ...testUpdates }]);

            // Mock successful API response without data
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: true,
                status: 200,
                json: () => Promise.resolve(null)
            }));

            await management.updateUnitType(testModelID, testUpdates);

            expect(mockFetch).toHaveBeenCalled();
            expect(mockUnitTypeCrud.updateUnitType).toHaveBeenCalledWith(
                [existingUnitType],
                testModelID,
                testUpdates
            );
            expect(mockState.unitTypes).toEqual([{ ...existingUnitType, ...testUpdates }]);
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', expect.any(Object));
        });

        test('should work without API service', async () => {
            expect.assertions(4);

            mockState.apiURL = '';
            management = new UnitTypeManagement(mockState);

            mockUnitTypeCrud.updateUnitType.mockReturnValue([{ ...existingUnitType, ...testUpdates }]);

            await management.updateUnitType(testModelID, testUpdates);

            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockUnitTypeCrud.updateUnitType).toHaveBeenCalledWith(
                [existingUnitType],
                testModelID,
                testUpdates
            );
            expect(mockState.unitTypes).toEqual([{ ...existingUnitType, ...testUpdates }]);
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', expect.any(Object));
        });

        test('should handle network errors during update', async () => {
            expect.assertions(3);

            const networkError = new Error('Connection timeout');
            mockFetch.mockRejectedValueOnce(networkError);

            await management.updateUnitType(testModelID, testUpdates);

            expect(mockFetch).toHaveBeenCalled();
            expect(mockUnitTypeCrud.updateUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Connection timeout',
                type: 'error'
            });
        });
    });

    describe('deleteUnitType', () => {
        const testModelID = 'model-2br';
        const existingUnitType = createTestUnitTypeData({ modelID: testModelID });

        beforeEach(() => {
            mockState.unitTypes = [existingUnitType, createTestUnitTypeData({ modelID: 'other-model' })];
        });

        test('should successfully delete unit type with API', async () => {
            expect.assertions(6);

            mockUnitTypeCrud.removeUnitType.mockReturnValue([createTestUnitTypeData({ modelID: 'other-model' })]);

            // Mock successful API response
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: true,
                status: 200
            }));

            await management.deleteUnitType(testModelID);

            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/unit-types/${testModelID}`,
                expect.objectContaining({
                    method: 'DELETE'
                })
            );
            expect(mockUnitTypeCrud.removeUnitType).toHaveBeenCalledWith(
                mockState.unitTypes,
                testModelID
            );
            expect(mockState.unitTypes).toHaveLength(1);
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type deleted successfully',
                type: 'success'
            });
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', expect.any(Object));
            expect(mockState.$dispatch).toHaveBeenCalledTimes(2);
        });

        test('should handle user cancellation', async () => {
            expect.assertions(3);

            // Mock user canceling the confirmation
            (global as typeof globalThis & { confirm: jest.Mock }).confirm = jest.fn().mockReturnValue(false);
            await management.deleteUnitType(testModelID);

            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockUnitTypeCrud.removeUnitType).not.toHaveBeenCalled();
            expect(mockState.unitTypes).toHaveLength(2); // Unchanged
        });

        test('should handle missing building ID', async () => {
            expect.assertions(3);

            mockState.building = null;

            await management.deleteUnitType(testModelID);

            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockUnitTypeCrud.removeUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Building ID not available',
                type: 'error'
            });
        });

        test('should handle API errors during deletion', async () => {
            expect.assertions(4);

            const errorMessage = 'Cannot delete: units of this type exist';
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: false,
                status: 409,
                text: () => Promise.resolve(errorMessage)
            }));

            await management.deleteUnitType(testModelID);

            expect(mockFetch).toHaveBeenCalled();
            expect(mockUnitTypeCrud.removeUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: errorMessage,
                type: 'error'
            });
            expect(mockState.unitTypes).toHaveLength(2); // Unchanged
        });

        test('should handle case where unit type is not found locally', async () => {
            expect.assertions(4);

            // Mock CRUD operation that doesn't change the array (item not found)
            mockUnitTypeCrud.removeUnitType.mockReturnValue(mockState.unitTypes);

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: true,
                status: 200
            }));

            await management.deleteUnitType('non-existent-model');

            expect(mockFetch).toHaveBeenCalled();
            expect(mockUnitTypeCrud.removeUnitType).toHaveBeenCalled();
            expect(mockState.unitTypes).toHaveLength(2); // Unchanged
            expect(mockState.$dispatch).not.toHaveBeenCalledWith('toast:show',
                expect.objectContaining({ type: 'success' })
            );
        });

        test('should work without API service', async () => {
            expect.assertions(4);

            mockState.apiURL = '';
            management = new UnitTypeManagement(mockState);

            mockUnitTypeCrud.removeUnitType.mockReturnValue([createTestUnitTypeData({ modelID: 'other-model' })]);

            await management.deleteUnitType(testModelID);

            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockUnitTypeCrud.removeUnitType).toHaveBeenCalledWith(
                mockState.unitTypes,
                testModelID
            );
            expect(mockState.unitTypes).toHaveLength(1);
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type deleted successfully',
                type: 'success'
            });
        });

        test('should handle network errors during deletion', async () => {
            expect.assertions(3);

            const networkError = new Error('Network error');
            mockFetch.mockRejectedValueOnce(networkError);

            await management.deleteUnitType(testModelID);

            expect(mockFetch).toHaveBeenCalled();
            expect(mockUnitTypeCrud.removeUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Network error',
                type: 'error'
            });
        });

        test('should handle non-Error exceptions', async () => {
            expect.assertions(3);

            mockFetch.mockRejectedValueOnce('String error');

            await management.deleteUnitType(testModelID);

            expect(mockFetch).toHaveBeenCalled();
            expect(mockUnitTypeCrud.removeUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'An unexpected error occurred',
                type: 'error'
            });
        });
    });

    describe('dialog management', () => {
        test('should open add unit type dialog with initialized data', () => {
            expect.assertions(6);

            management.openAddUnitTypeDialog();

            expect(mockState.showAddUnitTypeDialog).toBe(true);
            expect(mockState.newUnitType).toEqual({
                modelID: '',
                modelName: '',
                beds: 1,
                baths: 1,
                minSqft: undefined,
                maxSqft: undefined,
                minRent: undefined,
                maxRent: undefined,
                buildingID: testBuilding.buildingID
            });
        });

        test('should close add unit type dialog and clear data', () => {
            expect.assertions(2);

            mockState.showAddUnitTypeDialog = true;
            mockState.newUnitType = { modelID: 'test', modelName: 'Test' };

            management.closeAddUnitTypeDialog();

            expect(mockState.showAddUnitTypeDialog).toBe(false);
            expect(mockState.newUnitType).toEqual({});
        });

        test('should handle missing building ID when opening dialog', () => {
            expect.assertions(1);

            mockState.building = null;

            management.openAddUnitTypeDialog();

            expect(mockState.newUnitType.buildingID).toBe('');
        });
    });
});
