/**
 * Unit tests for BuildingApiService unit type methods
 * Tests the API service methods for unit type CRUD operations
 * Focuses on proper request formation, response handling, and error conditions
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { BuildingApiService } from '../../../../../astro-src/lib/building/services/buildingApiService';
import { mockFetch, createMockResponse, resetAllMocks } from './test-setup';
import type { UnitType } from '../../../../../src/types';

describe('BuildingApiService - Unit Type Methods', () => {
    let apiService: BuildingApiService;
    const testApiURL = 'https://api.example.com';
    const testBuildingId = 'test-building-123';

    beforeEach(() => {
        resetAllMocks();
        apiService = new BuildingApiService(testApiURL);
    });

    describe('addUnitType', () => {
        const testUnitType: UnitType = {
            modelID:    'model-2br',
            modelName:  '2 Bedroom Deluxe',
            beds:       2,
            baths:      2,
            buildingID: testBuildingId,
            minRent:    1800,
            maxRent:    2200,
            minSqft:    950,
            maxSqft:    1100
        };

        test('should successfully add unit type with valid data', async () => {
            expect.assertions(5);
            const responseData = { ...testUnitType, unitID: `MODEL#${testUnitType.modelID}` };

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 201,
                json:   () => Promise.resolve(responseData)
            }));

            const result = await apiService.addUnitType(testBuildingId, testUnitType);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(responseData);
            expect(result.error).toBeUndefined();
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/buildings/${testBuildingId}/unit-types`,
                {
                    method:  'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(testUnitType)
                }
            );
        });

        test('should handle server error responses', async () => {
            expect.assertions(4);
            const errorMessage = 'Validation failed: Model ID already exists';

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     false,
                status: 400,
                text:   () => Promise.resolve(errorMessage)
            }));

            const result = await apiService.addUnitType(testBuildingId, testUnitType);

            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe(errorMessage);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        test('should handle network errors', async () => {
            expect.assertions(3);
            const networkError = new Error('Network connection failed');

            mockFetch.mockRejectedValueOnce(networkError);

            const result = await apiService.addUnitType(testBuildingId, testUnitType);

            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Network connection failed');
        });

        test('should handle non-Error exceptions', async () => {
            expect.assertions(3);

            mockFetch.mockRejectedValueOnce('String error');

            const result = await apiService.addUnitType(testBuildingId, testUnitType);

            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Network error occurred');
        });

        test('should handle server error with empty response body', async () => {
            expect.assertions(3);

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     false,
                status: 500,
                text:   () => Promise.resolve('')
            }));

            const result = await apiService.addUnitType(testBuildingId, testUnitType);

            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Failed to add unit type');
        });
    });

    describe('updateUnitType', () => {
        const testModelId = 'model-2br';
        const testUpdates: Partial<UnitType> = {
            modelName: 'Updated 2 Bedroom Deluxe',
            minRent:   1900,
            maxRent:   2300
        };

        test('should successfully update unit type', async () => {
            expect.assertions(5);
            const responseData = {
                modelID:    testModelId,
                buildingID: testBuildingId,
                ...testUpdates,
                beds:       2,
                baths:      2
            } as UnitType;

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 200,
                json:   () => Promise.resolve(responseData)
            }));

            const result = await apiService.updateUnitType(testBuildingId, testModelId, testUpdates);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(responseData);
            expect(result.error).toBeUndefined();
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/buildings/${testBuildingId}/unit-types/${testModelId}`,
                {
                    method:  'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(testUpdates)
                }
            );
        });

        test('should handle update of non-existent unit type', async () => {
            expect.assertions(4);
            const errorMessage = 'Unit type not found';

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     false,
                status: 404,
                text:   () => Promise.resolve(errorMessage)
            }));

            const result = await apiService.updateUnitType(testBuildingId, 'non-existent-id', testUpdates);

            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe(errorMessage);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        test('should handle network errors during update', async () => {
            expect.assertions(3);
            const networkError = new Error('Connection timeout');

            mockFetch.mockRejectedValueOnce(networkError);

            const result = await apiService.updateUnitType(testBuildingId, testModelId, testUpdates);

            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Connection timeout');
        });

        test('should handle empty update data', async () => {
            expect.assertions(5);
            const emptyUpdates = {};
            const responseData = {
                modelID:    testModelId,
                buildingID: testBuildingId,
                modelName:  'Original Name',
                beds:       2,
                baths:      2
            } as UnitType;

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 200,
                json:   () => Promise.resolve(responseData)
            }));

            const result = await apiService.updateUnitType(testBuildingId, testModelId, emptyUpdates);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(responseData);
            expect(result.error).toBeUndefined();
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/buildings/${testBuildingId}/unit-types/${testModelId}`,
                {
                    method:  'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(emptyUpdates)
                }
            );
        });
    });

    describe('deleteUnitType', () => {
        const testModelId = 'model-2br';

        test('should successfully delete unit type', async () => {
            expect.assertions(4);

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 200
            }));

            const result = await apiService.deleteUnitType(testBuildingId, testModelId);

            expect(result.success).toBe(true);
            expect(result.data).toBeUndefined();
            expect(result.error).toBeUndefined();
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/buildings/${testBuildingId}/unit-types/${testModelId}`,
                {
                    method: 'DELETE'
                }
            );
        });

        test('should handle deletion of non-existent unit type', async () => {
            expect.assertions(4);
            const errorMessage = 'Unit type not found';

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     false,
                status: 404,
                text:   () => Promise.resolve(errorMessage)
            }));

            const result = await apiService.deleteUnitType(testBuildingId, 'non-existent-id');

            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe(errorMessage);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        test('should handle network errors during deletion', async () => {
            expect.assertions(3);
            const networkError = new Error('Request failed');

            mockFetch.mockRejectedValueOnce(networkError);

            const result = await apiService.deleteUnitType(testBuildingId, testModelId);

            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Request failed');
        });

        test('should handle server error with default message', async () => {
            expect.assertions(3);

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     false,
                status: 500,
                text:   () => Promise.resolve('')
            }));

            const result = await apiService.deleteUnitType(testBuildingId, testModelId);

            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Failed to delete unit type');
        });

        test('should handle constraint violation (units exist)', async () => {
            expect.assertions(4);
            const errorMessage = 'Cannot delete unit type: units of this type exist';

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     false,
                status: 409,
                text:   () => Promise.resolve(errorMessage)
            }));

            const result = await apiService.deleteUnitType(testBuildingId, testModelId);

            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe(errorMessage);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('URL construction', () => {
        test('should handle API URL with trailing slash', () => {
            expect.assertions(1);
            const apiServiceWithSlash = new BuildingApiService('https://api.example.com/');

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 200
            }));

            void apiServiceWithSlash.deleteUnitType(testBuildingId, 'test-id');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/buildings/test-building-123/unit-types/test-id',
                {
                    method: 'DELETE'
                }
            );
        });

        test('should handle API URL without trailing slash', () => {
            expect.assertions(1);
            const apiServiceNoSlash = new BuildingApiService('https://api.example.com');

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 200
            }));

            const promise = apiServiceNoSlash.deleteUnitType(testBuildingId, 'test-id');
            void promise;

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/buildings/test-building-123/unit-types/test-id',
                {
                    method: 'DELETE'
                }
            );
        });

        test('should handle special characters in IDs', () => {
            expect.assertions(1);
            const specialBuildingId = 'building-with-hyphens_and_underscores';
            const specialModelId = 'model-with-special_chars';

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 200
            }));

            const promise = apiService.deleteUnitType(specialBuildingId, specialModelId);
            void promise;

            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/buildings/${specialBuildingId}/unit-types/${specialModelId}`,
                {
                    method: 'DELETE'
                }
            );
        });
    });

    describe('response handling edge cases', () => {
        test('should handle JSON response that fails to parse', async () => {
            expect.assertions(3);

            mockFetch.mockResolvedValueOnce({
                ...createMockResponse({
                    ok:     true,
                    status: 200
                }),
                json: () => Promise.reject(new Error('Invalid JSON'))
            });

            const result = await apiService.addUnitType(testBuildingId, {
                modelID:    'test',
                modelName:  'Test',
                beds:       1,
                baths:      1,
                buildingID: testBuildingId
            });

            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Invalid JSON');
        });

        test('should handle text response that fails to read', async () => {
            expect.assertions(3);

            mockFetch.mockResolvedValueOnce({
                ...createMockResponse({
                    ok:     false,
                    status: 400
                }),
                text: () => Promise.reject(new Error('Failed to read response'))
            });

            const result = await apiService.addUnitType(testBuildingId, {
                modelID:    'test',
                modelName:  'Test',
                beds:       1,
                baths:      1,
                buildingID: testBuildingId
            });

            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Failed to read response');
        });
    });
});
