// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { dynamoDbMock, jest, resetAllMocks } from '../data/test-setup';

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { create, get, update, del } from '../../api/buildings';
import { mockGetResponse, mockPutResponse, mockUpdateResponse, mockDeleteResponse } from '../helpers/mock-responses';

const testBuilding = {
    buildingID: 'test-building-1',
    buildingName: 'Test Building',
    street: '123 Main St',
    city: 'Testville',
    state: 'TX',
    zip: '75001'
};

describe('Buildings API - CRUD operations', () => {
    beforeAll(() => {
        resetAllMocks();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
        dynamoDbMock.mockReset();
    });

    describe('create endpoint', () => {
        it('should create a new building', async () => {
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testBuilding, unitID: 'BUILDING' }));

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify(testBuilding)
            };

            const result = await create(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body as string)).toEqual(testBuilding);
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should validate buildingID format', async () => {
            const invalid = { ...testBuilding, buildingID: 'invalid id!' };

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify(invalid)
            };

            const result = await create(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body as string);
            expect(body.errors.buildingID).toBe('buildingID can only contain letters, numbers, underscores, and hyphens');
        });

        it('should surface DynamoDB errors', () => {
            dynamoDbMock.mockRejectedValueOnce(new Error('Database failure'));

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify(testBuilding)
            };

            expect(create(event as APIGatewayProxyEventV2)).rejects.toThrow('Database failure');
        });
    });

    describe('get endpoint', () => {
        it('should retrieve a building', async () => {
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testBuilding, unitID: 'BUILDING' }));

            const event: Partial<APIGatewayProxyEventV2> = {
                pathParameters: { buildingID: testBuilding.buildingID }
            };

            const result = await get(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const data = JSON.parse(result.body as string);
            expect(data.buildingID).toBe(testBuilding.buildingID);
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should return 404 for invalid buildingID', async () => {
            const event: Partial<APIGatewayProxyEventV2> = {
                pathParameters: { buildingID: 'bad id!' }
            };

            const result = await get(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });

        it('should surface DynamoDB errors', () => {
            dynamoDbMock.mockRejectedValueOnce(new Error('DB error'));

            const event: Partial<APIGatewayProxyEventV2> = {
                pathParameters: { buildingID: testBuilding.buildingID }
            };

            expect(get(event as APIGatewayProxyEventV2)).rejects.toThrow('DB error');
        });
    });

    describe('update endpoint', () => {
        it('should update a building', async () => {
            const updates = { city: 'New City' };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...testBuilding, ...updates, unitID: 'BUILDING' }));

            const event: Partial<APIGatewayProxyEventV2> = {
                pathParameters: { buildingID: testBuilding.buildingID },
                body: JSON.stringify(updates)
            };

            const result = await update(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const data = JSON.parse(result.body as string);
            expect(data.city).toBe('New City');
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should return 404 for invalid buildingID', async () => {
            const event: Partial<APIGatewayProxyEventV2> = {
                pathParameters: { buildingID: 'bad id!' },
                body: JSON.stringify({ city: 'New City' })
            };

            const result = await update(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });

        it('should handle DynamoDB failures', async () => {
            dynamoDbMock.mockRejectedValueOnce(new Error('Database error'));
            dynamoDbMock.mockRejectedValueOnce(new Error('Database error'));

            const event: Partial<APIGatewayProxyEventV2> = {
                pathParameters: { buildingID: testBuilding.buildingID },
                body: JSON.stringify({ city: 'New City' })
            };

            const result = await update(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(500);
            const body = JSON.parse(result.body as string);
            expect(body.error).toBe('Internal server error during update');
        });
    });

    describe('delete endpoint', () => {
        it('should delete a building', async () => {
            dynamoDbMock.mockResolvedValueOnce(mockDeleteResponse());

            const event: Partial<APIGatewayProxyEventV2> = {
                pathParameters: { buildingID: testBuilding.buildingID }
            };

            const result = await del(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(204);
            expect(result.body).toBe('');
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should return 404 for invalid buildingID', async () => {
            const event: Partial<APIGatewayProxyEventV2> = {
                pathParameters: { buildingID: 'bad id!' }
            };

            const result = await del(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });

        it('should handle DynamoDB failures', async () => {
            dynamoDbMock.mockRejectedValueOnce(new Error('Delete failed'));

            const event: Partial<APIGatewayProxyEventV2> = {
                pathParameters: { buildingID: testBuilding.buildingID }
            };

            const result = await del(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });
    });
});
