/**
 * Functional tests for floorplan save functionality
 * Tests the real BuildingApiService and verifies API calls work correctly
 * This tests the core user requirement: floorplan data persists via API calls
 */
import { describe, test, expect, beforeEach, jest } from 'bun:test';
import { BuildingApiService } from '../../../../astro-src/lib/building/services/buildingApiService';
import { generateBuildingId } from '../../../../src/utils/building-id.js';
import type { UnitType } from '../../../../src/types';

// Mock fetch globally for API testing
const mockFetch = jest.fn() as jest.Mock;
global.fetch = mockFetch as unknown as typeof fetch;

// Helper to create mock Response objects
const createMockResponse = (options: {
    ok:          boolean
    status:      number
    statusText?: string
    json?:       () => Promise<unknown>
    text?:       () => Promise<string>
}) => {
    // If json is provided but text is not, automatically create text from json
    const textMethod = options.text ?? (async () => {
        if(options.json) {
            const jsonData = await options.json();
            return JSON.stringify(jsonData);
        }
        return '';
    });

    return {
        ok:          options.ok,
        status:      options.status,
        statusText:  options.statusText ?? '',
        headers:     new Headers(),
        json:        options.json ?? (() => Promise.resolve({})),
        text:        textMethod,
        blob:        () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        formData:    () => Promise.resolve(new FormData()),
        clone:       jest.fn(),
        body:        null,
        bodyUsed:    false,
        redirected:  false,
        type:        'default' as ResponseType,
        url:         '',
        bytes:       () => Promise.resolve(new Uint8Array())
    } as Response;
};

describe('Floorplan Save - Functional Tests', () => {
    let apiService: BuildingApiService;
    const testApiURL = 'https://api.example.com';
    const testBuildingId = generateBuildingId(); // Use valid short-uuid format

    beforeEach(() => {
        mockFetch.mockReset();
        apiService = new BuildingApiService(testApiURL);
    });

    describe('Core Floorplan Save Requirements', () => {
        test('should successfully save floorplan data via API', async () => {
            expect.assertions(8);

            const testFloorplan: UnitType = {
                modelID:    'model-2br-deluxe',
                modelName:  '2 Bedroom Deluxe',
                beds:       2,
                baths:      2,
                buildingID: testBuildingId,
                minRent:    1800,
                maxRent:    2200,
                minSqft:    950,
                maxSqft:    1100
            };

            // API responses contain ISO date strings (JSON serialization), not Date objects
            const responseData = {
                ...testFloorplan,
                unitID:    `MODEL#${testFloorplan.modelID}`,
                updatedAt: new Date().toISOString()
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 201,
                json:   () => Promise.resolve(responseData)
            }));

            const result = await apiService.addUnitType(testBuildingId, testFloorplan);

            expect(result.success).toBe(true);
            // Verify core response fields
            expect(result.data?.modelID).toBe(testFloorplan.modelID);
            expect(result.data?.modelName).toBe(testFloorplan.modelName);
            expect(result.data?.beds).toBe(testFloorplan.beds);
            expect(result.data?.baths).toBe(testFloorplan.baths);
            expect(result.data?.updatedAt).toBeDefined();
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/buildings/${testBuildingId}/unit-types`,
                expect.objectContaining({
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(testFloorplan)
                })
            );
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        test('should handle API validation errors appropriately', async () => {
            expect.assertions(3);

            const invalidFloorplan: UnitType = {
                modelID:    'existing-model',
                modelName:  'Existing Model',
                beds:       2,
                baths:      2,
                buildingID: testBuildingId
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     false,
                status: 409,
                text:   () => Promise.resolve('Unit type with this model ID already exists')
            }));

            const result = await apiService.addUnitType(testBuildingId, invalidFloorplan);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unit type with this model ID already exists');
            expect(result.data).toBeUndefined();
        });

        test('should update existing floorplan via API', async () => {
            expect.assertions(8);

            const modelId = 'model-2br';
            const updates = {
                modelName: 'Updated 2 Bedroom Deluxe',
                minRent:   1900,
                maxRent:   2300
            };

            // API responses contain ISO date strings (JSON serialization), not Date objects
            const responseData = {
                modelID:    modelId,
                buildingID: testBuildingId,
                ...updates,
                beds:       2,
                baths:      2,
                updatedAt:  new Date().toISOString()
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 200,
                json:   () => Promise.resolve(responseData)
            }));

            const result = await apiService.updateUnitType(testBuildingId, modelId, updates);

            expect(result.success).toBe(true);
            // Verify response data - API returns ISO string dates, not Date objects
            expect(result.data?.modelID).toBe(modelId);
            expect(result.data?.modelName).toBe(updates.modelName);
            expect(result.data?.minRent).toBe(updates.minRent);
            expect(result.data?.maxRent).toBe(updates.maxRent);
            expect(result.data?.updatedAt).toBeDefined();
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/buildings/${testBuildingId}/unit-types/${modelId}`,
                expect.objectContaining({
                    method:  'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(updates)
                })
            );
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        test('should delete floorplan via API', async () => {
            expect.assertions(3);

            const modelId = 'model-to-delete';

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 200
            }));

            const result = await apiService.deleteUnitType(testBuildingId, modelId);

            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/buildings/${testBuildingId}/unit-types/${modelId}`,
                expect.objectContaining({
                    method: 'DELETE'
                })
            );
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('Network Error Handling', () => {
        test('should handle network failures gracefully', async () => {
            expect.assertions(3);

            const testFloorplan: UnitType = {
                modelID:    'network-test',
                modelName:  'Network Test Model',
                beds:       1,
                baths:      1,
                buildingID: testBuildingId
            };

            const networkError = new Error('Network connection failed');
            mockFetch.mockRejectedValueOnce(networkError);

            const result = await apiService.addUnitType(testBuildingId, testFloorplan);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to add unit type: Network connection failed');
            expect(result.data).toBeUndefined();
        });

        test('should handle server errors', async () => {
            expect.assertions(3);

            const testFloorplan: UnitType = {
                modelID:    'server-error-test',
                modelName:  'Server Error Test',
                beds:       1,
                baths:      1,
                buildingID: testBuildingId
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     false,
                status: 500,
                text:   () => Promise.resolve('Internal server error')
            }));

            const result = await apiService.addUnitType(testBuildingId, testFloorplan);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Internal server error');
            expect(result.data).toBeUndefined();
        });
    });

    describe('Data Validation', () => {
        test('should properly serialize complex floorplan data', async () => {
            expect.assertions(2);

            const complexFloorplan: UnitType = {
                modelID:      'complex-model',
                modelName:    'Complex Model with "Special" Characters',
                beds:         3,
                baths:        2.5,
                buildingID:   testBuildingId,
                minRent:      2500,
                maxRent:      3000,
                minSqft:      1200,
                maxSqft:      1400,
                deposit:      2500,
                maxOccupants: 6,
                minLeaseTerm: 6,
                maxLeaseTerm: 18
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 201,
                json:   () => Promise.resolve(complexFloorplan)
            }));

            const result = await apiService.addUnitType(testBuildingId, complexFloorplan);

            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/buildings/${testBuildingId}/unit-types`,
                expect.objectContaining({
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(complexFloorplan)
                })
            );
        });

        test('should handle partial update data correctly', async () => {
            expect.assertions(2);

            const modelId = 'partial-update-test';
            const partialUpdates = {
                modelName: 'Updated Name Only'
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 200,
                json:   () => Promise.resolve({
                    modelID:    modelId,
                    ...partialUpdates,
                    buildingID: testBuildingId
                })
            }));

            const result = await apiService.updateUnitType(testBuildingId, modelId, partialUpdates);

            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                `${testApiURL}/buildings/${testBuildingId}/unit-types/${modelId}`,
                expect.objectContaining({
                    method: 'PUT',
                    body:   JSON.stringify(partialUpdates)
                })
            );
        });
    });

    describe('API URL Handling', () => {
        test('should correctly construct URLs with trailing slash', () => {
            expect.assertions(1);

            const serviceWithTrailingSlash = new BuildingApiService('https://api.test.com/');

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 200
            }));

            void serviceWithTrailingSlash.deleteUnitType('building-123', 'model-123');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/buildings/building-123/unit-types/model-123',
                expect.objectContaining({ method: 'DELETE' })
            );
        });

        test('should correctly construct URLs without trailing slash', () => {
            expect.assertions(1);

            const serviceWithoutSlash = new BuildingApiService('https://api.test.com');

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 200
            }));

            void serviceWithoutSlash.deleteUnitType('building-123', 'model-123');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/buildings/building-123/unit-types/model-123',
                expect.objectContaining({ method: 'DELETE' })
            );
        });
    });

    describe('Response Processing', () => {
        test('should handle empty response bodies correctly', async () => {
            expect.assertions(3);

            const testFloorplan: UnitType = {
                modelID:    'empty-response-test',
                modelName:  'Empty Response Test',
                beds:       1,
                baths:      1,
                buildingID: testBuildingId
            };

            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     false,
                status: 400,
                text:   () => Promise.resolve('')
            }));

            const result = await apiService.addUnitType(testBuildingId, testFloorplan);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to add unit type');
            expect(result.data).toBeUndefined();
        });

        test('should handle malformed JSON responses', async () => {
            expect.assertions(3);

            const testFloorplan: UnitType = {
                modelID:    'json-error-test',
                modelName:  'JSON Error Test',
                beds:       1,
                baths:      1,
                buildingID: testBuildingId
            };

            // Mock response with malformed JSON text
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok:     true,
                status: 201,
                text:   () => Promise.resolve('not valid json{')
            }));

            const result = await apiService.addUnitType(testBuildingId, testFloorplan);

            expect(result.success).toBe(false);
            expect(result.error).toContain('JSON');
            expect(result.data).toBeUndefined();
        });
    });
});
