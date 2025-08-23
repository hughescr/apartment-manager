// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { dynamoDbMock, resetAllMocks } from './test-setup';

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { testBuilding, testUnit, testUnitType } from './buildings-test-fixtures';
import { mockScanResponse } from '../helpers/mock-responses';
import { padStart, keys } from 'lodash';

// Import the function AFTER mocking
import { getAllData } from '../../data/all-data';

describe('All Data Layer', () => {
    beforeAll(() => {
        // Reset mocks at the start of this test file to prevent cross-file pollution
        resetAllMocks();
    });

    beforeEach(() => {
        // CRITICAL: Reset ALL mocks to prevent cross-test contamination
        resetAllMocks();
    });

    it('should fetch all data in single scan and organize by type', async () => {
        expect.assertions(5);

        // Mock DynamoDB scan response with mixed data types
        const mixedScanData = [
            { ...testBuilding, unitID: 'BUILDING' }, // Building
            { ...testUnit, unitID: 'UNIT#101', buildingID: testBuilding.buildingID }, // Unit
            { ...testUnit, unitID: 'UNIT#102', buildingID: testBuilding.buildingID, unitNumber: '102' }, // Another unit
            { ...testUnitType, unitID: 'MODEL#studio', buildingID: testBuilding.buildingID }, // Unit type
            // Another building
            {
                buildingID: 'building-2',
                unitID: 'BUILDING',
                buildingName: 'Second Building',
                street: '456 Second St'
            },
            // Unit for second building
            {
                buildingID: 'building-2',
                unitID: 'UNIT#201',
                unitNumber: '201',
                beds: 2,
                baths: 1
            },
            // Unit type for second building
            {
                buildingID: 'building-2',
                unitID: 'MODEL#onebr',
                modelID: 'onebr',
                modelName: 'One Bedroom',
                beds: 1,
                baths: 1
            }
        ];

        dynamoDbMock.mockResolvedValueOnce(mockScanResponse(mixedScanData));

        const result = await getAllData();

        // Verify structure
        expect(result.buildings).toHaveLength(2);
        expect(result.unitsByBuilding[testBuilding.buildingID]).toHaveLength(2);
        expect(result.unitTypesByBuilding[testBuilding.buildingID]).toHaveLength(1);
        expect(result.unitsByBuilding['building-2']).toHaveLength(1);
        expect(result.unitTypesByBuilding['building-2']).toHaveLength(1);
    });

    it('should handle empty database (no items)', async () => {
        expect.assertions(3);

        dynamoDbMock.mockResolvedValueOnce(mockScanResponse([]));

        const result = await getAllData();

        expect(result.buildings).toEqual([]);
        expect(result.unitsByBuilding).toEqual({});
        expect(result.unitTypesByBuilding).toEqual({});
    });

    it('should handle buildings without units or unit types', async () => {
        expect.assertions(4);

        const buildingOnlyData = [
            { ...testBuilding, unitID: 'BUILDING' }
        ];

        dynamoDbMock.mockResolvedValueOnce(mockScanResponse(buildingOnlyData));

        const result = await getAllData();

        expect(result.buildings).toHaveLength(1);
        expect(result.buildings[0].buildingID).toBe(testBuilding.buildingID);
        expect(result.unitsByBuilding[testBuilding.buildingID]).toEqual([]);
        expect(result.unitTypesByBuilding[testBuilding.buildingID]).toEqual([]);
    });

    it('should properly convert unit IDs by removing UNIT# prefix', async () => {
        expect.assertions(3);

        const unitData = [
            { ...testBuilding, unitID: 'BUILDING' },
            { ...testUnit, unitID: 'UNIT#apartment-101', buildingID: testBuilding.buildingID }
        ];

        dynamoDbMock.mockResolvedValueOnce(mockScanResponse(unitData));

        const result = await getAllData();

        expect(result.buildings).toHaveLength(1);
        expect(result.unitsByBuilding[testBuilding.buildingID]).toHaveLength(1);
        expect(result.unitsByBuilding[testBuilding.buildingID][0].unitID).toBe('apartment-101');
    });

    it('should properly convert timestamps from strings to Date objects', async () => {
        expect.assertions(4);

        const timestamp = new Date().toISOString();
        const dataWithTimestamps = [
            { ...testBuilding, unitID: 'BUILDING', updatedAt: timestamp },
            { ...testUnit, unitID: 'UNIT#101', buildingID: testBuilding.buildingID, updatedAt: timestamp },
            { ...testUnitType, unitID: 'MODEL#studio', buildingID: testBuilding.buildingID, updatedAt: timestamp }
        ];

        dynamoDbMock.mockResolvedValueOnce(mockScanResponse(dataWithTimestamps));

        const result = await getAllData();

        expect(result.buildings[0].updatedAt).toBeInstanceOf(Date);
        expect(result.unitsByBuilding[testBuilding.buildingID][0].updatedAt).toBeInstanceOf(Date);
        expect(result.unitTypesByBuilding[testBuilding.buildingID][0].updatedAt).toBeInstanceOf(Date);
        expect(result.buildings[0].updatedAt?.toISOString()).toBe(timestamp);
    });

    it('should handle feed data conversion for units', async () => {
        expect.assertions(3);

        const feedTimestamp = new Date().toISOString();
        const unitWithFeedData = {
            ...testUnit,
            unitID: 'UNIT#101',
            buildingID: testBuilding.buildingID,
            feedLastPulled: {
                'apartments.com': {
                    timestamp: feedTimestamp,
                    ipAddress: '192.168.1.1'
                }
            },
            feedLastModified: feedTimestamp
        };

        const dataWithFeed = [
            { ...testBuilding, unitID: 'BUILDING' },
            unitWithFeedData
        ];

        dynamoDbMock.mockResolvedValueOnce(mockScanResponse(dataWithFeed));

        const result = await getAllData();

        const unit = result.unitsByBuilding[testBuilding.buildingID]![0];
        expect(unit.feedLastPulled!['apartments.com']!.timestamp).toBeInstanceOf(Date);
        expect(unit.feedLastModified).toBeInstanceOf(Date);
        expect(unit.feedLastPulled!['apartments.com']!.ipAddress).toBe('192.168.1.1');
    });

    it('should handle DynamoDB scan errors gracefully', async () => {
        expect.assertions(1);

        const scanError = new Error('DynamoDB scan failed');
        dynamoDbMock.mockRejectedValueOnce(scanError);

        expect(getAllData()).rejects.toThrow('DynamoDB scan failed');
    });

    it('should apply building data defaults correctly', async () => {
        expect.assertions(4);

        const minimalBuilding = {
            buildingID: 'minimal-building',
            unitID: 'BUILDING',
            street: '123 Minimal St'
            // Missing many optional fields
        };

        dynamoDbMock.mockResolvedValueOnce(mockScanResponse([minimalBuilding]));

        const result = await getAllData();

        const building = result.buildings[0];
        expect(building.buildingID).toBe('minimal-building');
        expect(building.street).toBe('123 Minimal St');
        expect(building.city).toBe(''); // Should have default empty string
        expect(building.rentSpecials).toEqual([]); // Should have default empty array
    });

    it('should process large dataset efficiently', async () => {
        expect.assertions(4);

        // Create a larger dataset to test performance characteristics
        const largeDataset = [];
        const numBuildings = 10;
        const unitsPerBuilding = 50;
        const unitTypesPerBuilding = 5;

        for(let b = 1; b <= numBuildings; b++) {
            // Add building
            largeDataset.push({
                buildingID: `building-${b}`,
                unitID: 'BUILDING',
                buildingName: `Building ${b}`,
                street: `${100 + b} Test St`
            });

            // Add units
            for(let u = 1; u <= unitsPerBuilding; u++) {
                largeDataset.push({
                    buildingID: `building-${b}`,
                    unitID: `UNIT#${b}${padStart(u.toString(), 2, '0')}`,
                    unitNumber: `${b}${padStart(u.toString(), 2, '0')}`,
                    beds: Math.floor(Math.random() * 3) + 1,
                    baths: 1
                });
            }

            // Add unit types
            for(let t = 1; t <= unitTypesPerBuilding; t++) {
                largeDataset.push({
                    buildingID: `building-${b}`,
                    unitID: `MODEL#type-${t}`,
                    modelID: `type-${t}`,
                    modelName: `Type ${t}`,
                    beds: t,
                    baths: 1
                });
            }
        }

        dynamoDbMock.mockResolvedValueOnce(mockScanResponse(largeDataset));

        const startTime = Date.now();
        const result = await getAllData();
        const processingTime = Date.now() - startTime;

        expect(result.buildings).toHaveLength(numBuildings);
        expect(keys(result.unitsByBuilding)).toHaveLength(numBuildings);
        expect(keys(result.unitTypesByBuilding)).toHaveLength(numBuildings);
        expect(processingTime).toBeLessThan(1000); // Should process in under 1 second
    });
});
