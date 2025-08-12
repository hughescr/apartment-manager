import { describe, it, expect, beforeEach, jest, mock } from 'bun:test';
import { update } from '../../api/buildings';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// Mock the data layer
mock.module('../../data/buildings', () => ({
    updateBuilding: jest.fn()
}));

import { updateBuilding } from '../../data/buildings';
const mockUpdateBuilding = updateBuilding as jest.Mock;

describe('Building Coordinates API', () => {
    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
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

        // Mock the data layer to return the updated building
        mockUpdateBuilding.mockResolvedValue({
            ...updateData,
            created: new Date(),
            modified: new Date()
        });

        const event: Partial<APIGatewayProxyEventV2> = {
            pathParameters: { buildingID },
            body: JSON.stringify(updateData)
        };

        const result = await update(event as APIGatewayProxyEventV2);

        expect(result.statusCode).toBe(200);

        // Verify that updateBuilding was called with the correct data
        expect(mockUpdateBuilding).toHaveBeenCalledWith(
            buildingID,
            expect.objectContaining({
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
            })
        );

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

        mockUpdateBuilding.mockResolvedValue({
            ...updateData,
            created: new Date(),
            modified: new Date()
        });

        const event: Partial<APIGatewayProxyEventV2> = {
            pathParameters: { buildingID },
            body: JSON.stringify(updateData)
        };

        const result = await update(event as APIGatewayProxyEventV2);

        expect(result.statusCode).toBe(200);

        // Verify that updateBuilding was called without coordinate fields
        expect(mockUpdateBuilding).toHaveBeenCalledWith(
            buildingID,
            expect.objectContaining({
                buildingName: 'Test Building 2',
                street: '456 Oak St',
                city: 'Los Angeles',
                state: 'CA',
                zip: '90001'
            })
        );
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

        mockUpdateBuilding.mockResolvedValue({
            ...updateData,
            created: new Date(),
            modified: new Date()
        });

        const event: Partial<APIGatewayProxyEventV2> = {
            pathParameters: { buildingID },
            body: JSON.stringify(updateData)
        };

        const result = await update(event as APIGatewayProxyEventV2);

        expect(result.statusCode).toBe(200);

        // Verify all fields are preserved
        expect(mockUpdateBuilding).toHaveBeenCalledWith(
            buildingID,
            expect.objectContaining({
                buildingName: 'Existing Building',
                description: 'A nice building',
                yearBuilt: 2020,
                numberStories: 5,
                totalUnits: 50,
                latitude: 40.7128,
                longitude: -74.0060,
                coordinatesVerified: false,
                petPolicies: expect.objectContaining({
                    allowed: true,
                    maxCount: 2
                }),
                parkingOptions: expect.arrayContaining([
                    expect.objectContaining({
                        type: 'garage',
                        included: true,
                        spaces: 1
                    })
                ])
            })
        );
    });
});
