// CRITICAL: Import test setup FIRST before any other imports
import { mockSend, clearMocks } from './test-setup';

import { describe, it, expect, beforeEach } from 'bun:test';
import { AmenityCategory, WebsiteStatus } from '../../src/types';
import { mockScanResponse, mockGetResponse, mockPutResponse, mockUpdateResponse, mockDeleteResponse } from '../helpers/mock-responses';

// Import the functions AFTER mocking
import { getUnits, getUnit, createUnit, updateUnit, deleteUnit } from '../../data/units';

describe('Unit Data Layer', () => {
    beforeEach(() => {
        // Clear mock calls before each test
        clearMocks();
    });

    const testBuildingID = 'test-building-1';
    const testUnit = {
        buildingID: testBuildingID,
        unitID: 'test-unit-1',
        unitNumber: '101',
        modelID: 'model-2br',
        description: 'Spacious 2BR unit',
        beds: 2,
        baths: 2,
        sqft: 1050,
        rent: 1600,
        occupied: false,
        availableDate: '2024-04-01',
        maxOccupants: 4,
        perPersonRent: 400,
        deposit: 1600,
        minLeaseTerm: 6,
        maxLeaseTerm: 12,
        unitDescription: 'Corner unit with great views',
        unitRentSpecial: { title: '1 Month Free', description: '1 month free', endDate: '2024-05-01' },
        unitAmenities: [
            { name: 'Balcony', category: AmenityCategory.UNIT },
            { name: 'In-unit Washer/Dryer', category: AmenityCategory.UNIT }
        ],
        photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        websiteStatus: {
            zillow: WebsiteStatus.ACTIVE,
            apartments: WebsiteStatus.INACTIVE
        },
        listingIds: {
            zillow: 'ZIL123',
            apartments: 'APT456'
        }
    };

    it('should get all units for a building', async () => {
        expect.assertions(1);
        const units = [
            { ...testUnit, unitID: 'UNIT#test-unit-1' },
            { ...testUnit, unitID: 'UNIT#test-unit-2', unitNumber: '102' }
        ];
        mockSend.mockResolvedValueOnce(mockScanResponse(units));

        const result = await getUnits(testBuildingID);
        // The function strips the UNIT# prefix when returning
        expect(result).toEqual([
            testUnit,
            { ...testUnit, unitID: 'test-unit-2', unitNumber: '102' }
        ]);
    });

    it('should handle empty unit list', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce(mockScanResponse([]));

        const result = await getUnits(testBuildingID);
        expect(result).toEqual([]);
    });

    it('should get a specific unit', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce(mockGetResponse({ ...testUnit, unitID: 'UNIT#test-unit-1' }));

        const result = await getUnit(testUnit.buildingID, testUnit.unitID);
        expect(result).toEqual(testUnit);
    });

    it('should return undefined for non-existent unit', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce(mockGetResponse(undefined));

        const result = await getUnit(testUnit.buildingID, 'non-existent');
        expect(result).toBeUndefined();
    });

    it('should create a unit with minimal data', async () => {
        expect.assertions(3);
        const minimalUnit = {
            unitNumber: '103',
            beds: 1,
            baths: 1
        };
        const expectedUnit = {
            ...minimalUnit,
            buildingID: testBuildingID,
            unitID: 'UNIT#test-uuid'
        };
        mockSend.mockResolvedValueOnce(mockPutResponse(expectedUnit));

        const result = await createUnit({ ...minimalUnit, buildingID: testBuildingID, unitID: 'test-uuid' });
        // The function strips the UNIT# prefix when returning
        expect(result).toEqual({ ...minimalUnit, buildingID: testBuildingID, unitID: 'test-uuid' });
        expect(result.unitID).toBe('test-uuid');
        expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle createUnit when Attributes is not returned', async () => {
        expect.assertions(2);
        const unitData = {
            unitNumber: '103B',
            beds: 2,
            baths: 1,
            buildingID: testBuildingID,
            unitID: 'test-uuid'
        };
        // Mock a response where Attributes is explicitly undefined (edge case)
        mockSend.mockResolvedValueOnce({
            Attributes: undefined,
            $metadata: { httpStatusCode: 200 }
        });

        const result = await createUnit(unitData);
        // Should return the original unit data when Attributes is not provided
        expect(result).toEqual(unitData);
        expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should create a unit with full data', async () => {
        expect.assertions(4);
        const fullUnit = {
            unitNumber: '104',
            modelID: 'model-3br',
            description: 'Luxury 3BR unit',
            beds: 3,
            baths: 2.5,
            sqft: 1500,
            rent: 2500,
            occupied: false,
            availableDate: '2024-05-01',
            maxOccupants: 6,
            perPersonRent: 420,
            deposit: 2500,
            minLeaseTerm: 12,
            maxLeaseTerm: 24,
            unitDescription: 'Premium unit with all amenities',
            unitRentSpecial: { title: '2 Months Free', description: '2 months free', endDate: '2024-06-01' },
            unitAmenities: [
                { name: 'Walk-in Closet', category: AmenityCategory.UNIT },
                { name: 'Granite Countertops', category: AmenityCategory.UNIT }
            ],
            photos: ['https://example.com/unit104-1.jpg', 'https://example.com/unit104-2.jpg'],
            websiteStatus: {
                zillow: WebsiteStatus.PENDING,
                apartments: WebsiteStatus.ACTIVE
            },
            listingIds: {
                zillow: 'ZIL789',
                apartments: 'APT012'
            }
        };
        const expectedUnit = {
            ...fullUnit,
            buildingID: testBuildingID,
            unitID: 'UNIT#test-uuid'
        };
        mockSend.mockResolvedValueOnce(mockPutResponse(expectedUnit));

        const result = await createUnit({ ...fullUnit, buildingID: testBuildingID, unitID: 'test-uuid' });
        // The function strips the UNIT# prefix when returning
        expect(result).toEqual({ ...fullUnit, buildingID: testBuildingID, unitID: 'test-uuid' });
        expect(result.unitID).toBe('test-uuid');
        expect(result.websiteStatus).toEqual(fullUnit.websiteStatus);
        expect(result.listingIds).toEqual(fullUnit.listingIds);
    });

    it('should update a unit', async () => {
        expect.assertions(2);
        const updates = {
            rent: 1700,
            occupied: true,
            availableDate: '2024-06-01'
        };
        mockSend.mockResolvedValueOnce(mockUpdateResponse({ ...testUnit, unitID: 'UNIT#test-unit-1', ...updates }));

        const result = await updateUnit(testUnit.buildingID, testUnit.unitID, updates);
        expect(result).toEqual({ ...testUnit, ...updates });
        expect(result?.rent).toBe(1700);
    });

    it('should handle update with undefined values', async () => {
        expect.assertions(2);
        const updates = {
            rent: 1700,
            description: undefined, // Should be removed by DynamoDB
            occupied: false
        };
        const expectedResult = {
            ...testUnit,
            rent: 1700,
            occupied: false
        };
        mockSend.mockResolvedValueOnce(mockUpdateResponse({ ...expectedResult, unitID: 'UNIT#test-unit-1' }));

        const result = await updateUnit(testUnit.buildingID, testUnit.unitID, updates);
        expect(result).toEqual(expectedResult);
        expect(result?.description).toBe(testUnit.description); // Original value preserved
    });

    it('should delete a unit', async () => {
        expect.assertions(2);
        mockSend.mockResolvedValueOnce(mockDeleteResponse());

        const result = await deleteUnit(testUnit.buildingID, testUnit.unitID);
        expect(result).toBeTrue();
        expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle error during unit deletion', async () => {
        expect.assertions(2);
        const { logger } = await import('@hughescr/logger');
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

        const success = await deleteUnit(testUnit.buildingID, testUnit.unitID);
        expect(success).toBeFalse();
        expect(logger.error).toHaveBeenCalledWith(
            'Error deleting unit:',
            expect.any(Error)
        );
    });

    // Additional test cases for new fields
    it('should update website status and listing IDs', async () => {
        expect.assertions(3);
        const updates = {
            websiteStatus: {
                zillow: WebsiteStatus.ACTIVE,
                apartments: WebsiteStatus.INACTIVE
            },
            listingIds: {
                zillow: 'ZIL999',
                apartments: 'APT999'
            }
        };
        mockSend.mockResolvedValueOnce(mockUpdateResponse({ ...testUnit, unitID: 'UNIT#test-unit-1', ...updates }));

        const updatedUnit = await updateUnit(testUnit.buildingID, testUnit.unitID, updates);
        expect(updatedUnit?.websiteStatus?.zillow).toBe(WebsiteStatus.ACTIVE);
        expect(updatedUnit?.websiteStatus?.apartments).toBe(WebsiteStatus.INACTIVE);
        expect(updatedUnit?.listingIds?.zillow).toBe('ZIL999');
    });

    it('should handle complex unit amenities override', async () => {
        expect.assertions(2);
        const updatedAmenities = [
            { name: 'Hardwood Floors', category: AmenityCategory.UNIT },
            { name: 'Walk-in Closet', category: AmenityCategory.UNIT },
            { name: 'Private Patio', category: AmenityCategory.UNIT }
        ];
        mockSend.mockResolvedValueOnce(mockUpdateResponse({
            ...testUnit,
            unitID: 'UNIT#test-unit-1',
            unitAmenities: updatedAmenities
        }));

        const updatedUnit = await updateUnit(
            testUnit.buildingID,
            testUnit.unitID,
            { unitAmenities: updatedAmenities }
        );
        expect(updatedUnit?.unitAmenities).toHaveLength(3);
        expect(updatedUnit?.unitAmenities?.[0].name).toBe('Hardwood Floors');
    });

    it('should handle empty collections in unit data', async () => {
        expect.assertions(3);
        const unitWithEmptyCollections = {
            ...testUnit,
            unitID: 'UNIT#test-unit-1',
            unitAmenities: [],
            photos: [],
            websiteStatus: {},
            listingIds: {}
        };
        mockSend.mockResolvedValueOnce(mockScanResponse([unitWithEmptyCollections]));

        const units = await getUnits(testBuildingID);
        expect(units[0].photos).toHaveLength(0);
        expect(units[0].unitAmenities).toHaveLength(0);
        expect(units[0].websiteStatus).toEqual({});
    });
});
