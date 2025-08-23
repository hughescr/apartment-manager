// CRITICAL: Import test setup FIRST before any other imports
import '../data/test-setup';
import { dynamoDbMock, resetAllMocks } from '../data/test-setup';

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { testBuilding, testUnit, testUnitType } from '../data/buildings-test-fixtures';
import { mockScanResponse } from '../helpers/mock-responses';

// Import the API function AFTER mocking
import { get as getAllDataEndpoint } from '../../api/all-data';

describe('All Data API Endpoint', () => {
    beforeAll(() => {
        // Reset mocks at the start of this test file to prevent cross-file pollution
        resetAllMocks();
    });

    beforeEach(() => {
        // CRITICAL: Reset ALL mocks to prevent cross-test contamination
        resetAllMocks();
    });

    it('should return 200 with all data from unified scan', async () => {
        expect.assertions(4);

        // Mock DynamoDB scan response with mixed data types
        const mixedScanData = [
            { ...testBuilding, unitID: 'BUILDING' },
            { ...testUnit, unitID: 'UNIT#101', buildingID: testBuilding.buildingID },
            { ...testUnitType, unitID: 'MODEL#studio', buildingID: testBuilding.buildingID }
        ];

        dynamoDbMock.mockResolvedValueOnce(mockScanResponse(mixedScanData));

        const response = await getAllDataEndpoint();

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body!);
        expect(body.buildings).toHaveLength(1);
        expect(body.unitsByBuilding[testBuilding.buildingID]).toHaveLength(1);
        expect(body.unitTypesByBuilding[testBuilding.buildingID]).toHaveLength(1);
    });

    it('should return 500 when DynamoDB scan fails', async () => {
        expect.assertions(2);

        const scanError = new Error('DynamoDB scan failed');
        dynamoDbMock.mockRejectedValueOnce(scanError);

        const response = await getAllDataEndpoint();

        expect(response.statusCode).toBe(500);

        const body = JSON.parse(response.body!);
        expect(body.error).toBe('Internal server error during getalldata');
    });

    it('should return empty data structure when no items found', async () => {
        expect.assertions(4);

        dynamoDbMock.mockResolvedValueOnce(mockScanResponse([]));

        const response = await getAllDataEndpoint();

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body!);
        expect(body.buildings).toEqual([]);
        expect(body.unitsByBuilding).toEqual({});
        expect(body.unitTypesByBuilding).toEqual({});
    });
});
