// CRITICAL: Import test setup FIRST before any other imports
import { mockSend, clearMocks, preloadDataModules } from './test-setup';

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { AmenityCategory } from '../../src/types';
import { mockScanResponse, mockGetResponse, mockPutResponse, mockUpdateResponse, mockDeleteResponse } from '../helpers/mock-responses';
import _ from 'lodash';

// Import the functions AFTER mocking
import {
    getUnitTypes,
    getUnitType,
    createUnitType,
    updateUnitType,
    deleteUnitType,
    getUnitsByModelID
} from '../../data/unitTypes';

describe('UnitType Data Layer', () => {
    beforeAll(async () => {
        // Preload modules to prevent race conditions
        await preloadDataModules();

        // Validate that all expected exports are available
        expect(typeof getUnitTypes).toBe('function');
        expect(typeof getUnitType).toBe('function');
        expect(typeof createUnitType).toBe('function');
        expect(typeof updateUnitType).toBe('function');
        expect(typeof deleteUnitType).toBe('function');
        expect(typeof getUnitsByModelID).toBe('function');
    });

    beforeEach(() => {
        // Clear mock calls before each test
        clearMocks();
    });

    const testBuildingID = 'test-building-1';
    const testUnitType = {
        buildingID: testBuildingID,
        modelID: 'model-2br',
        modelName: '2 Bedroom Deluxe',
        countAvailable: 5,
        dateAvailable: '2024-04-01',
        beds: 2,
        baths: 2,
        maxOccupants: 4,
        minRent: 1500,
        maxRent: 1800,
        perPersonRent: 450,
        minSqft: 950,
        maxSqft: 1100,
        deposit: 1500,
        minLeaseTerm: 6,
        maxLeaseTerm: 12,
        modelAmenities: [
            { name: 'Balcony', category: AmenityCategory.UNIT },
            { name: 'In-unit Washer/Dryer', category: AmenityCategory.UNIT }
        ]
    };

    it('should get all unit types for a building', async () => {
        expect.assertions(1);
        const unitTypes = [
            testUnitType,
            { ...testUnitType, modelID: 'model-1br', modelName: '1 Bedroom' }
        ];
        // Mock response will include unitID field, but getUnitTypes will omit it
        const mockResponseData = _.map(unitTypes, ut => ({ ...ut, unitID: `MODEL#${ut.modelID}` }));
        mockSend.mockResolvedValueOnce(mockScanResponse(mockResponseData));

        const result = await getUnitTypes(testBuildingID);
        expect(result).toEqual(unitTypes);
    });

    it('should handle empty unit type list', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce(mockScanResponse([]));

        const result = await getUnitTypes(testBuildingID);
        expect(result).toEqual([]);
    });

    it('should get a specific unit type', async () => {
        expect.assertions(1);
        // Mock response includes unitID field, but getUnitType will omit it
        mockSend.mockResolvedValueOnce(mockGetResponse({ ...testUnitType, unitID: `MODEL#${testUnitType.modelID}` }));

        const result = await getUnitType(testBuildingID, testUnitType.modelID);
        expect(result).toEqual(testUnitType);
    });

    it('should return undefined for non-existent unit type', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce(mockGetResponse(null));

        const result = await getUnitType(testBuildingID, 'non-existent');
        expect(result).toBeUndefined();
    });

    it('should create a unit type with minimal data', async () => {
        expect.assertions(2);
        const minimalUnitType = {
            buildingID: testBuildingID,
            modelID: 'test-uuid',
            modelName: 'Studio',
            beds: 0,
            baths: 1
        };
        // Mock returns the item with unitID, but createUnitType will omit it
        mockSend.mockResolvedValueOnce(mockPutResponse({ ...minimalUnitType, unitID: 'MODEL#test-uuid' }));

        const result = await createUnitType(minimalUnitType);
        expect(result).toEqual(minimalUnitType);
        expect(result.modelID).toBe('test-uuid');
    });

    it('should create a unit type with full data', async () => {
        expect.assertions(3);
        const fullUnitType = {
            buildingID: testBuildingID,
            modelID: 'test-uuid',
            modelName: '3 Bedroom Premium',
            countAvailable: 3,
            dateAvailable: '2024-05-01',
            beds: 3,
            baths: 2.5,
            maxOccupants: 6,
            minRent: 2000,
            maxRent: 2500,
            perPersonRent: 500,
            minSqft: 1200,
            maxSqft: 1400,
            deposit: 2000,
            minLeaseTerm: 12,
            maxLeaseTerm: 24,
            modelAmenities: [
                { name: 'Walk-in Closet', category: AmenityCategory.UNIT },
                { name: 'Granite Countertops', category: AmenityCategory.UNIT }
            ]
        };
        // Mock returns the item with unitID, but createUnitType will omit it
        mockSend.mockResolvedValueOnce(mockPutResponse({ ...fullUnitType, unitID: 'MODEL#test-uuid' }));

        const result = await createUnitType(fullUnitType);
        expect(result).toEqual(fullUnitType);
        expect(result.modelAmenities).toHaveLength(2);
        expect(result.modelAmenities?.[0].name).toBe('Walk-in Closet');
    });

    it('should update a unit type', async () => {
        expect.assertions(2);
        const updates = {
            countAvailable: 3,
            minRent: 1600,
            maxRent: 1900
        };
        // Mock returns the item with unitID, but updateUnitType will omit it
        mockSend.mockResolvedValueOnce(mockUpdateResponse({ ...testUnitType, unitID: `MODEL#${testUnitType.modelID}`, ...updates }));

        const result = await updateUnitType(testBuildingID, testUnitType.modelID, updates);
        expect(result).toEqual({ ...testUnitType, ...updates });
        expect(result?.countAvailable).toBe(3);
    });

    it('should handle update with undefined values', async () => {
        expect.assertions(2);
        const updates = {
            countAvailable: 2,
            dateAvailable: undefined, // Should be removed by DynamoDB
            minRent: 1400
        };
        const expectedResult = {
            ...testUnitType,
            countAvailable: 2,
            minRent: 1400
        };
        // Mock returns the item with unitID, but updateUnitType will omit it
        mockSend.mockResolvedValueOnce(mockUpdateResponse({ ...expectedResult, unitID: `MODEL#${testUnitType.modelID}` }));

        const result = await updateUnitType(testBuildingID, testUnitType.modelID, updates);
        expect(result).toEqual(expectedResult);
        expect(result?.dateAvailable).toBe(testUnitType.dateAvailable); // Original value preserved
    });

    it('should delete a unit type', async () => {
        expect.assertions(2);
        mockSend.mockResolvedValueOnce(mockDeleteResponse());

        const result = await deleteUnitType(testBuildingID, testUnitType.modelID);
        expect(result).toBeTrue();
        expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle error during unit type deletion', async () => {
        expect.assertions(2);
        const { logger } = await import('@hughescr/logger');
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

        const success = await deleteUnitType(testBuildingID, testUnitType.modelID);
        expect(success).toBeFalse();
        // Logger should have been called with the error
        expect(logger.error).toHaveBeenCalledWith('Error deleting unit type:', expect.any(Error));
    });

    it('should get units by model ID', async () => {
        expect.assertions(2);
        const units = [
            {
                buildingID: testBuildingID,
                unitID: 'UNIT#unit-1',  // DynamoDB stores with UNIT# prefix
                unitNumber: '101',
                modelID: 'model-2br',
                beds: 2,
                baths: 2,
                rent: 1650
            },
            {
                buildingID: testBuildingID,
                unitID: 'UNIT#unit-2',  // DynamoDB stores with UNIT# prefix
                unitNumber: '201',
                modelID: 'model-2br',
                beds: 2,
                baths: 2,
                rent: 1700
            },
            {
                buildingID: testBuildingID,
                unitID: 'UNIT#unit-3',  // This one has different modelID
                unitNumber: '301',
                modelID: 'model-1br',
                beds: 1,
                baths: 1,
                rent: 1200
            }
        ];
        mockSend.mockResolvedValueOnce(mockScanResponse(units));

        const result = await getUnitsByModelID(testBuildingID, 'model-2br');
        // getUnitsByModelID strips the UNIT# prefix from unitID
        const expectedUnits = [
            { ...units[0], unitID: 'unit-1' },
            { ...units[1], unitID: 'unit-2' }
        ];
        expect(result).toEqual(expectedUnits);
        expect(result).toHaveLength(2);
    });

    it('should handle empty result when getting units by model ID', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce(mockScanResponse([]));

        const result = await getUnitsByModelID(testBuildingID, 'model-3br');
        expect(result).toEqual([]);
    });

    it('should handle complex model amenities override', async () => {
        expect.assertions(2);
        const updatedAmenities = [
            { name: 'Hardwood Floors', category: AmenityCategory.UNIT },
            { name: 'Stainless Steel Appliances', category: AmenityCategory.UNIT },
            { name: 'Ceiling Fans', category: AmenityCategory.UNIT }
        ];
        mockSend.mockResolvedValueOnce(mockUpdateResponse({
            ...testUnitType,
            unitID: `MODEL#${testUnitType.modelID}`,
            modelAmenities: updatedAmenities
        }));

        const updatedUnitType = await updateUnitType(
            testBuildingID,
            testUnitType.modelID,
            { modelAmenities: updatedAmenities }
        );
        expect(updatedUnitType?.modelAmenities).toHaveLength(3);
        expect(updatedUnitType?.modelAmenities?.[1].name).toBe('Stainless Steel Appliances');
    });

    it('should handle empty collections in unit type data', async () => {
        expect.assertions(2);
        const unitTypeWithEmptyCollections = {
            ...testUnitType,
            modelAmenities: []
        };
        // Mock response includes unitID field
        mockSend.mockResolvedValueOnce(mockScanResponse([{ ...unitTypeWithEmptyCollections, unitID: `MODEL#${testUnitType.modelID}` }]));

        const unitTypes = await getUnitTypes(testBuildingID);
        expect(unitTypes[0].modelAmenities).toHaveLength(0);
        expect(unitTypes[0].modelName).toBe('2 Bedroom Deluxe');
    });
});
