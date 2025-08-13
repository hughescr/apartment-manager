import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { createMockEvent, testUnitType, dynamoDbMock, jest, resetAllMocks } from './unitTypes-test-setup';
import { mockScanResponse, mockGetResponse } from '../helpers/mock-responses';
import _ from 'lodash';

// Import API functions directly - they will use the mocked DynamoDB client from test-setup
import { list, get } from '../../api/unitTypes';

describe('Unit Types API - List and Get', () => {
    beforeAll(() => {
        resetAllMocks();
    });

    beforeEach(() => {
        // Reset all mock state including queued responses
        jest.clearAllMocks();
        jest.restoreAllMocks();

        // CRITICAL: Reset the mock completely to clear any queued responses
        dynamoDbMock.mockReset();
    });

    describe('list endpoint', () => {
        it('should return all unit types for a building', async () => {
            expect.assertions(3);
            const unitTypes = [
                testUnitType,
                { ...testUnitType, modelID: 'model-1br', modelName: '1 Bedroom' }
            ];
            // Mock DynamoDB scan response with proper unitID format
            const mockDbData = _.map(unitTypes, ut => ({ ...ut, unitID: `MODEL#${ut.modelID}` }));
            dynamoDbMock.mockResolvedValueOnce(mockScanResponse(mockDbData));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            const result = await list(event);

            expect(result.statusCode).toBe(200);
            // The data layer strips the unitID field
            expect(JSON.parse(result.body as string)).toEqual(unitTypes);
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should handle empty unit types list', async () => {
            expect.assertions(2);
            dynamoDbMock.mockResolvedValueOnce(mockScanResponse([]));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            const result = await list(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual([]);
        });

        it('should handle data layer errors', async () => {
            expect.assertions(1);
            dynamoDbMock.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            expect(list(event)).rejects.toThrow('Database error');
        });
    });

    describe('get endpoint', () => {
        it('should return a specific unit type', async () => {
            expect.assertions(3);
            // Mock DynamoDB get response with proper unitID format
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testUnitType, unitID: `MODEL#${testUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await get(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(testUnitType);
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should return 404 for non-existent unit type', async () => {
            expect.assertions(2);
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'non-existent' }
            });

            const result = await get(event);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });

        it('should handle data layer errors', async () => {
            expect.assertions(1);
            dynamoDbMock.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            expect(get(event)).rejects.toThrow('Database error');
        });
    });
});
