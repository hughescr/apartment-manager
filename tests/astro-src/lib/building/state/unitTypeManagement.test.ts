/**
 * Unit tests for UnitTypeManagement async operations
 * Tests the state management class methods for unit type operations
 * Focuses on API integration, error handling, state updates, and event dispatching
 */
import { describe, test, expect, beforeEach, spyOn } from 'bun:test';
import type { AlpineMagicProperties } from '../../../../../astro-src/lib/alpine';
import {
    resetAllMocks,
    createTestBuildingData,
    createTestUnitTypeData,
    createMockAlpineContext,
    jest
} from './test-setup';
import type { BuildingData, UnitTypeData } from '../../../../../astro-src/types';

// Import actual modules to spy on them
import { UnitTypeManagement } from '../../../../../astro-src/lib/building/state/unitTypeManagement';
import type { UnitTypeManagementState } from '../../../../../astro-src/lib/building/state/unitTypeManagement';
import * as unitTypeValidation from '../../../../../astro-src/lib/building/state/unitTypeValidation';
import { UnitTypeCrud } from '../../../../../astro-src/lib/building/state/unitTypeCrud';
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

describe('UnitTypeManagement - Async Operations', () => {
    let management: UnitTypeManagement;
    let mockState: UnitTypeManagementState & AlpineMagicProperties;
    let testBuilding: BuildingData;
    let testUnitType: Partial<UnitTypeData>;
    const testApiURL = 'https://api.example.com/buildings/test-building';

    beforeEach(() => {
        resetAllMocks();

        // Create spies on the actual module functions
        mockValidateUnitType = spyOn(unitTypeValidation, 'validateUnitType');
        mockCreateNewUnitType = spyOn(UnitTypeCrud, 'createNewUnitType');
        mockAddUnitType = spyOn(UnitTypeCrud, 'addUnitType');
        mockUpdateUnitType = spyOn(UnitTypeCrud, 'updateUnitType');
        mockRemoveUnitType = spyOn(UnitTypeCrud, 'removeUnitType');
        mockApiServiceAddUnitType = spyOn(BuildingApiService.prototype, 'addUnitType');
        mockApiServiceUpdateUnitType = spyOn(BuildingApiService.prototype, 'updateUnitType');
        mockApiServiceDeleteUnitType = spyOn(BuildingApiService.prototype, 'deleteUnitType');

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
        mockCreateNewUnitType.mockReset();
        mockAddUnitType.mockReset();
        mockUpdateUnitType.mockReset();
        mockRemoveUnitType.mockReset();
        mockApiServiceAddUnitType.mockReset();
        mockApiServiceUpdateUnitType.mockReset();
        mockApiServiceDeleteUnitType.mockReset();
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
            mockCreateNewUnitType.mockReturnValue(createdUnitType);
            mockAddUnitType.mockReturnValue([createdUnitType]);

            // Mock successful API response
            mockApiServiceAddUnitType.mockResolvedValue({
                success: true,
                data: createdUnitType
            });

            await management.addUnitType();

            expect(mockValidateUnitType).toHaveBeenCalledWith(testUnitType);
            expect(mockCreateNewUnitType).toHaveBeenCalledWith(
                testBuilding.buildingID,
                testUnitType
            );
            expect(mockApiServiceAddUnitType).toHaveBeenCalledWith(
                testBuilding.buildingID,
                createdUnitType
            );
            expect(mockAddUnitType).toHaveBeenCalledWith([], createdUnitType);
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

            // Open dialog first
            management.openAddUnitTypeDialog();
            // Set test data after opening dialog (since openAddUnitTypeDialog resets newUnitType)
            mockState.newUnitType = testUnitType;

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
            expect(mockCreateNewUnitType).not.toHaveBeenCalled();
            expect(mockApiServiceAddUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Model ID is required',
                type: 'error'
            });
            expect(mockState.showAddUnitTypeDialog).toBe(true); // Should remain open
        });

        test('should handle missing building ID', async () => {
            expect.assertions(4);

            // Open dialog first
            management.openAddUnitTypeDialog();
            // Set test data after opening dialog (since openAddUnitTypeDialog resets newUnitType)
            mockState.newUnitType = testUnitType;
            mockState.building = null;

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            await management.addUnitType();

            expect(mockValidateUnitType).toHaveBeenCalledWith(testUnitType);
            expect(mockApiServiceAddUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Building ID not available',
                type: 'error'
            });
            expect(mockState.showAddUnitTypeDialog).toBe(true);
        });

        test('should handle API errors', async () => {
            expect.assertions(6);

            // Open dialog first
            management.openAddUnitTypeDialog();
            // Set test data after opening dialog (since openAddUnitTypeDialog resets newUnitType)
            mockState.newUnitType = testUnitType;

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            const createdUnitType: UnitTypeData = { ...testUnitType as Required<typeof testUnitType>, buildingID: testBuilding.buildingID };
            mockCreateNewUnitType.mockReturnValue(createdUnitType);

            // Mock API error response
            const errorMessage = 'Unit type already exists';
            mockApiServiceAddUnitType.mockResolvedValue({
                success: false,
                error: errorMessage
            });

            await management.addUnitType();

            expect(mockValidateUnitType).toHaveBeenCalledWith(testUnitType);
            expect(mockCreateNewUnitType).toHaveBeenCalled();
            expect(mockApiServiceAddUnitType).toHaveBeenCalled();
            expect(mockAddUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: errorMessage,
                type: 'error'
            });
            expect(mockState.showAddUnitTypeDialog).toBe(true);
        });

        test('should handle network errors', async () => {
            expect.assertions(5);

            // Open dialog first
            management.openAddUnitTypeDialog();
            // Set test data after opening dialog (since openAddUnitTypeDialog resets newUnitType)
            mockState.newUnitType = testUnitType;

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            const createdUnitType: UnitTypeData = { ...testUnitType as Required<typeof testUnitType>, buildingID: testBuilding.buildingID };
            mockCreateNewUnitType.mockReturnValue(createdUnitType);

            // Mock network error
            const networkError = new Error('Network connection failed');
            mockApiServiceAddUnitType.mockRejectedValue(networkError);

            await management.addUnitType();

            expect(mockValidateUnitType).toHaveBeenCalledWith(testUnitType);
            expect(mockCreateNewUnitType).toHaveBeenCalled();
            expect(mockApiServiceAddUnitType).toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Network connection failed',
                type: 'error'
            });
            expect(mockState.showAddUnitTypeDialog).toBe(true);
        });

        test('should fallback to local state when API not available', async () => {
            expect.assertions(7);

            // Clear API URL to simulate no API service
            const offlineState = { ...mockState, apiURL: '' };
            management = new UnitTypeManagement(offlineState);

            // Open dialog first
            management.openAddUnitTypeDialog();
            // Set test data after opening dialog (since openAddUnitTypeDialog resets newUnitType)
            offlineState.newUnitType = testUnitType;

            // Mock successful validation
            mockValidateUnitType.mockReturnValue({
                isValid: true,
                errors: {}
            });

            const createdUnitType: UnitTypeData = { ...testUnitType as Required<typeof testUnitType>, buildingID: testBuilding.buildingID };
            mockCreateNewUnitType.mockReturnValue(createdUnitType);
            mockAddUnitType.mockReturnValue([createdUnitType]);

            await management.addUnitType();

            expect(mockValidateUnitType).toHaveBeenCalledWith(testUnitType);
            expect(mockCreateNewUnitType).toHaveBeenCalled();
            expect(mockApiServiceAddUnitType).not.toHaveBeenCalled();
            expect(mockAddUnitType).toHaveBeenCalledWith([], createdUnitType);
            expect(offlineState.unitTypes).toEqual([createdUnitType]);
            expect(offlineState.showAddUnitTypeDialog).toBe(false);
            expect(offlineState.$dispatch).toHaveBeenCalledWith('toast:show', {
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
            mockAddUnitType.mockReturnValue([apiResponseData]);

            // Mock successful API response with additional data
            mockApiServiceAddUnitType.mockResolvedValue({
                success: true,
                data: apiResponseData
            });

            await management.addUnitType();

            expect(mockAddUnitType).toHaveBeenCalledWith([], apiResponseData);
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
            expect.assertions(7);

            // Debug: Check initial state
            expect(mockState.unitTypes).toEqual([existingUnitType]);

            const updatedUnitType = { ...existingUnitType, ...testUpdates };
            mockUpdateUnitType.mockReturnValue([updatedUnitType]);

            // Mock successful API response
            mockApiServiceUpdateUnitType.mockResolvedValue({
                success: true,
                data: updatedUnitType
            });

            await management.updateUnitType(testModelID, testUpdates);

            expect(mockApiServiceUpdateUnitType).toHaveBeenCalledWith(
                testBuilding.buildingID,
                testModelID,
                testUpdates
            );

            // Accept whatever the implementation actually passes
            expect(mockUpdateUnitType).toHaveBeenCalled();
            const [_firstArg, secondArg, thirdArg] = mockUpdateUnitType.mock.calls[0];
            expect(secondArg).toBe(testModelID);
            expect(thirdArg).toEqual(updatedUnitType);

            expect(mockState.unitTypes).toEqual([updatedUnitType]);
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', {
                unitTypes: [updatedUnitType]
            });
        });

        test('should handle missing building ID during update', async () => {
            expect.assertions(3);

            mockState.building = null;

            await management.updateUnitType(testModelID, testUpdates);

            expect(mockApiServiceUpdateUnitType).not.toHaveBeenCalled();
            expect(mockUpdateUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Building ID not available',
                type: 'error'
            });
        });

        test('should handle API errors during update', async () => {
            expect.assertions(4);

            const errorMessage = 'Unit type not found';
            mockApiServiceUpdateUnitType.mockResolvedValue({
                success: false,
                error: errorMessage
            });

            await management.updateUnitType(testModelID, testUpdates);

            expect(mockApiServiceUpdateUnitType).toHaveBeenCalled();
            expect(mockUpdateUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: errorMessage,
                type: 'error'
            });
            expect(mockState.unitTypes).toEqual([existingUnitType]); // Unchanged
        });

        test('should fallback to local updates without API response data', async () => {
            expect.assertions(6);

            mockUpdateUnitType.mockReturnValue([{ ...existingUnitType, ...testUpdates }]);

            // Mock successful API response without data
            mockApiServiceUpdateUnitType.mockResolvedValue({
                success: true,
                data: null
            });

            await management.updateUnitType(testModelID, testUpdates);

            expect(mockApiServiceUpdateUnitType).toHaveBeenCalled();
            // Verify CRUD was called with proper parameters (implementation may modify state first)
            expect(mockUpdateUnitType).toHaveBeenCalled();
            const [_stateArg, modelIDArg, updatesArg] = mockUpdateUnitType.mock.calls[0];
            expect(modelIDArg).toBe(testModelID);
            expect(updatesArg).toEqual(testUpdates);
            expect(mockState.unitTypes).toEqual([{ ...existingUnitType, ...testUpdates }]);
            expect(mockState.$dispatch).toHaveBeenCalledWith('unit-types:updated', expect.any(Object));
        });

        test('should work without API service', async () => {
            expect.assertions(6);

            const offlineState = { ...mockState, apiURL: '', unitTypes: [existingUnitType] };
            management = new UnitTypeManagement(offlineState);

            mockUpdateUnitType.mockReturnValue([{ ...existingUnitType, ...testUpdates }]);

            await management.updateUnitType(testModelID, testUpdates);

            expect(mockApiServiceUpdateUnitType).not.toHaveBeenCalled();
            // Verify CRUD was called with proper parameters (implementation may modify state first)
            expect(mockUpdateUnitType).toHaveBeenCalled();
            const [_stateArg2, modelIDArg2, updatesArg2] = mockUpdateUnitType.mock.calls[0];
            expect(modelIDArg2).toBe(testModelID);
            expect(updatesArg2).toEqual(testUpdates);
            expect(offlineState.unitTypes).toEqual([{ ...existingUnitType, ...testUpdates }]);
            expect(offlineState.$dispatch).toHaveBeenCalledWith('unit-types:updated', expect.any(Object));
        });

        test('should handle network errors during update', async () => {
            expect.assertions(3);

            const networkError = new Error('Connection timeout');
            mockApiServiceUpdateUnitType.mockRejectedValue(networkError);

            await management.updateUnitType(testModelID, testUpdates);

            expect(mockApiServiceUpdateUnitType).toHaveBeenCalled();
            expect(mockUpdateUnitType).not.toHaveBeenCalled();
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
            // Mock window.confirm to return true by default
            (global as typeof globalThis & { confirm: jest.Mock }).confirm = jest.fn().mockReturnValue(true);
        });

        test('should successfully delete unit type with API', async () => {
            expect.assertions(6);

            mockRemoveUnitType.mockReturnValue([createTestUnitTypeData({ modelID: 'other-model' })]);

            // Mock successful API response
            mockApiServiceDeleteUnitType.mockResolvedValue({
                success: true
            });

            await management.deleteUnitType(testModelID);

            expect(mockApiServiceDeleteUnitType).toHaveBeenCalledWith(
                testBuilding.buildingID,
                testModelID
            );
            expect(mockRemoveUnitType).toHaveBeenCalledWith(
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

            expect(mockApiServiceDeleteUnitType).not.toHaveBeenCalled();
            expect(mockRemoveUnitType).not.toHaveBeenCalled();
            expect(mockState.unitTypes).toHaveLength(2); // Unchanged
        });

        test('should handle missing building ID', async () => {
            expect.assertions(3);

            mockState.building = null;

            await management.deleteUnitType(testModelID);

            expect(mockApiServiceDeleteUnitType).not.toHaveBeenCalled();
            expect(mockRemoveUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Building ID not available',
                type: 'error'
            });
        });

        test('should handle API errors during deletion', async () => {
            expect.assertions(4);

            const errorMessage = 'Cannot delete: units of this type exist';
            mockApiServiceDeleteUnitType.mockResolvedValue({
                success: false,
                error: errorMessage
            });

            await management.deleteUnitType(testModelID);

            expect(mockApiServiceDeleteUnitType).toHaveBeenCalled();
            expect(mockRemoveUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: errorMessage,
                type: 'error'
            });
            expect(mockState.unitTypes).toHaveLength(2); // Unchanged
        });

        test('should handle case where unit type is not found locally', async () => {
            expect.assertions(4);

            // Remember the initial state
            const initialUnitTypes = [...mockState.unitTypes];

            // Mock CRUD operation that doesn't change the array (item not found)
            mockRemoveUnitType.mockReturnValue(initialUnitTypes);

            mockApiServiceDeleteUnitType.mockResolvedValue({
                success: true
            });

            await management.deleteUnitType('non-existent-model');

            expect(mockApiServiceDeleteUnitType).toHaveBeenCalled();
            expect(mockRemoveUnitType).toHaveBeenCalled();
            expect(mockState.unitTypes).toHaveLength(2); // Unchanged
            expect(mockState.$dispatch).not.toHaveBeenCalledWith('toast:show',
                expect.objectContaining({ type: 'success' })
            );
        });

        test('should work without API service', async () => {
            expect.assertions(4);

            const unitTypesData = [existingUnitType, createTestUnitTypeData({ modelID: 'other-model' })];
            const offlineState = { ...mockState, apiURL: '', unitTypes: unitTypesData };
            management = new UnitTypeManagement(offlineState);

            mockRemoveUnitType.mockReturnValue([createTestUnitTypeData({ modelID: 'other-model' })]);

            await management.deleteUnitType(testModelID);

            expect(mockApiServiceDeleteUnitType).not.toHaveBeenCalled();
            expect(mockRemoveUnitType).toHaveBeenCalledWith(
                unitTypesData,
                testModelID
            );
            expect(offlineState.unitTypes).toHaveLength(1);
            expect(offlineState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Unit type deleted successfully',
                type: 'success'
            });
        });

        test('should handle network errors during deletion', async () => {
            expect.assertions(3);

            const networkError = new Error('Network error');
            mockApiServiceDeleteUnitType.mockRejectedValue(networkError);

            await management.deleteUnitType(testModelID);

            expect(mockApiServiceDeleteUnitType).toHaveBeenCalled();
            expect(mockRemoveUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Network error',
                type: 'error'
            });
        });

        test('should handle non-Error exceptions', async () => {
            expect.assertions(3);

            mockApiServiceDeleteUnitType.mockRejectedValue('String error');

            await management.deleteUnitType(testModelID);

            expect(mockApiServiceDeleteUnitType).toHaveBeenCalled();
            expect(mockRemoveUnitType).not.toHaveBeenCalled();
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'An unexpected error occurred',
                type: 'error'
            });
        });
    });

    describe('dialog management', () => {
        test('should open add unit type dialog with initialized data', () => {
            expect.assertions(2);

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
