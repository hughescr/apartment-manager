// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { dynamoDbMock, resetAllMocks } from '../data/test-setup';

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { update } from '../../api/buildings';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { mockUpdateResponse } from '../helpers/mock-responses';

describe('Building Coordinates API', () => {
    beforeAll(() => {
        resetAllMocks();
    });

    beforeEach(() => {
        // Reset mocks before each test
        resetAllMocks();
    });

    it('should save latitude, longitude, and coordinatesVerified fields', async () => {
        const buildingID = 'test-building-123';
        const updateData = {
            buildingID,
            buildingName: 'Test Building',
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94102',
            latitude: 37.7749,
            longitude: -122.4194,
            coordinatesVerified: true,
            propertyType: 'apartment',
            photos: ['photo1.jpg', 'photo2.jpg'],
            acceptsOnlineApplications: true
        };

        // Mock DynamoDB to return the updated building data
        // The updateBuilding function uses UpdateItemCommand from DynamoDB Toolbox
        dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
            ...updateData,
            unitID: 'BUILDING'
        }));

        const event: Partial<APIGatewayProxyEventV2> = {
            pathParameters: { buildingID },
            body: JSON.stringify(updateData)
        };

        const result = await update(event as APIGatewayProxyEventV2);

        expect(result.statusCode).toBe(200);

        // Verify that DynamoDB was called
        expect(dynamoDbMock).toHaveBeenCalled();

        // Parse the response body to verify the data
        const responseData = JSON.parse(result.body!);
        expect(responseData.latitude).toBe(37.7749);
        expect(responseData.longitude).toBe(-122.4194);
        expect(responseData.coordinatesVerified).toBe(true);
    });

    it('should handle missing coordinates gracefully', async () => {
        const buildingID = 'test-building-456';
        const updateData = {
            buildingID,
            buildingName: 'Test Building 2',
            street: '456 Oak St',
            city: 'Los Angeles',
            state: 'CA',
            zip: '90001'
            // No latitude, longitude, or coordinatesVerified
        };

        // Mock DynamoDB to return the updated building data without coordinates
        // The updateBuilding function uses UpdateItemCommand from DynamoDB Toolbox
        dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
            ...updateData,
            unitID: 'BUILDING'
        }));

        const event: Partial<APIGatewayProxyEventV2> = {
            pathParameters: { buildingID },
            body: JSON.stringify(updateData)
        };

        const result = await update(event as APIGatewayProxyEventV2);

        expect(result.statusCode).toBe(200);

        // Verify that DynamoDB was called
        expect(dynamoDbMock).toHaveBeenCalled();

        // Verify that the response doesn't include coordinate fields
        const responseData = JSON.parse(result.body!);
        expect(responseData.street).toBe('456 Oak St');
        expect(responseData.city).toBe('Los Angeles');
        expect(responseData.state).toBe('CA');
        expect(responseData.zip).toBe('90001');
        expect(responseData.latitude).toBeUndefined();
        expect(responseData.longitude).toBeUndefined();
        expect(responseData.coordinatesVerified).toBeUndefined();
    });

    it('should preserve other building fields when updating coordinates', async () => {
        const buildingID = 'test-building-789';
        const updateData = {
            buildingID,
            buildingName: 'Existing Building',
            description: 'A nice building',
            yearBuilt: 2020,
            numberStories: 5,
            totalUnits: 50,
            latitude: 40.7128,
            longitude: -74.0060,
            coordinatesVerified: false,
            petPolicies: {
                allowed: true,
                maxCount: 2
            },
            parkingOptions: [{
                type: 'garage',
                included: true,
                spaces: 1
            }]
        };

        // Mock DynamoDB to return all the building data
        // The updateBuilding function uses UpdateItemCommand from DynamoDB Toolbox
        dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
            ...updateData,
            unitID: 'BUILDING'
        }));

        const event: Partial<APIGatewayProxyEventV2> = {
            pathParameters: { buildingID },
            body: JSON.stringify(updateData)
        };

        const result = await update(event as APIGatewayProxyEventV2);

        expect(result.statusCode).toBe(200);

        // Verify that DynamoDB was called
        expect(dynamoDbMock).toHaveBeenCalled();

        // Verify all fields are preserved in the response
        const responseData = JSON.parse(result.body!);
        expect(responseData.description).toBe('A nice building');
        expect(responseData.yearBuilt).toBe(2020);
        expect(responseData.numberStories).toBe(5);
        expect(responseData.totalUnits).toBe(50);
        expect(responseData.latitude).toBe(40.7128);
        expect(responseData.longitude).toBe(-74.006); // Note: response has -74.006 not -74.0060
        expect(responseData.coordinatesVerified).toBe(false);
        expect(responseData.petPolicies).toEqual({
            allowed: true,
            maxCount: 2
        });
        expect(responseData.parkingOptions).toEqual([{
            type: 'garage',
            included: true,
            spaces: 1
        }]);
    });
});
