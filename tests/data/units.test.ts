import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { getUnits, getUnit, createUnit, updateUnit, deleteUnit } from '../../data/units';
import { QueryCommand } from 'dynamodb-toolbox/table/actions/query';
import { ModuleMocker } from '../ModuleMocker';
import { AmenityCategory, WebsiteStatus } from '../../src/types';
import _ from 'lodash';

const mockSend = mock();

const moduleMocker = new ModuleMocker();

describe('Unit Data Layer', () => {
    afterEach(() => {
        mockSend.mockClear();
        moduleMocker.clear();
    });

    beforeEach(async () => {
        await moduleMocker.mock('@hughescr/logger', () => ({
            logger: {
                error: mock(),
            },
        }));

        await moduleMocker.mock('../data/model', () => ({
            ApartmentTable: {
                build: mock((command) => {
                    if(command === QueryCommand) {
                        return {
                            entities: mock(() => ({
                                query: mock(() => ({
                                    send: mockSend,
                                })),
                            })),
                        };
                    }
                    return {
                        item: mock(() => ({
                            options: mock(() => ({
                                send: mockSend,
                            })),
                            send: mockSend,
                        })),
                        key: mock(() => ({
                            send: mockSend,
                        })),
                    };
                }),
            },
            Unit: {
                build: mock(() => {
                    return {
                        item: mock(() => ({
                            options: mock(() => ({
                                send: mockSend,
                            })),
                            send: mockSend,
                        })),
                        key: mock(() => ({
                            send: mockSend,
                        })),
                    };
                }),
            },
        }));
    });

    const testBuildingID = 'test-building-1';
    const testUnit = {
        buildingID: testBuildingID,
        unitID: 'A1',
        description: 'A test unit',
        beds: 1,
        baths: 1,
        sqft: 750,
        rent: 1500,
        occupied: false,
        availableDate: '2025-01-01',
        // New fields
        modelID: 'model-1br',
        unitNumber: 'A1',
        maxOccupants: 2,
        perPersonRent: 750,
        deposit: 1500,
        minLeaseTerm: 12,
        maxLeaseTerm: 24,
        unitDescription: 'Beautiful 1-bedroom unit with city views',
        unitRentSpecial: {
            title: 'Move-in Special',
            description: 'Free parking for first 3 months'
        },
        unitAmenities: [
            { name: 'Balcony', category: AmenityCategory.UNIT },
            { name: 'City View', category: AmenityCategory.UNIT }
        ],
        photos: ['https://s3.example.com/unit-a1-1.jpg', 'https://s3.example.com/unit-a1-2.jpg'],
        websiteStatus: {
            'apartments.com': WebsiteStatus.ACTIVE,
            zillow: WebsiteStatus.PENDING
        },
        listingIds: {
            'apartments.com': 'APT-123456'
        }
    };

    it('should create a unit', async () => {
        expect.assertions(2);
        mockSend.mockResolvedValueOnce({ Attributes: { ...testUnit } });
        mockSend.mockResolvedValueOnce({ Item: { ...testUnit } });

        const createdUnit = await createUnit(testUnit);
        expect(createdUnit).toEqual(testUnit);

        const fetchedUnit = await getUnit(testUnit.buildingID, testUnit.unitID);
        expect(fetchedUnit).toEqual(testUnit);
    });

    it('should get all units for a building', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce({ Items: [{ ...testUnit }] });
        const units = await getUnits(testBuildingID);
        expect(units).toEqual([testUnit]);
    });

    it('should get a single unit', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce({ Item: { ...testUnit } });
        const fetchedUnit = await getUnit(testUnit.buildingID, testUnit.unitID);
        expect(fetchedUnit).toEqual(testUnit);
    });

    it('should update a unit', async () => {
        expect.assertions(2);
        const updatedDescription = 'Updated unit description';
        mockSend.mockResolvedValueOnce({ Attributes: { ...testUnit, description: updatedDescription } });
        mockSend.mockResolvedValueOnce({ Item: { ...testUnit, description: updatedDescription } });

        const updatedUnit = await updateUnit(testUnit.buildingID, testUnit.unitID, { description: updatedDescription });
        expect(updatedUnit.description).toBe(updatedDescription);

        const fetchedUnit = await getUnit(testUnit.buildingID, testUnit.unitID);
        expect(fetchedUnit.description).toBe(updatedDescription);
    });

    it('should delete a unit', async () => {
        expect.assertions(2);
        mockSend.mockResolvedValueOnce({}); // Successful delete
        mockSend.mockResolvedValueOnce({ Item: undefined }); // Item not found after delete

        const success = await deleteUnit(testUnit.buildingID, testUnit.unitID);
        expect(success).toBeTrue();

        const fetchedUnit = await getUnit(testUnit.buildingID, testUnit.unitID);
        expect(fetchedUnit).toBeUndefined();
    });

    it('should return true if unit to delete does not exist (idempotent delete)', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce({}); // Delete operation is idempotent
        const success = await deleteUnit(testBuildingID, 'non-existent-unit');
        expect(success).toBeTrue();
    });

    it('should not create a unit if it already exists', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce({ Attributes: { ...testUnit } }); // Simulate existing item
        const result = await createUnit(testUnit);
        expect(result).toEqual(testUnit);
    });

    it('should handle error during unit deletion', async () => {
        expect.assertions(2);
        const { logger } = await import('@hughescr/logger');
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

        const success = await deleteUnit(testUnit.buildingID, testUnit.unitID);
        expect(success).toBeFalse();
        expect(logger.error).toHaveBeenCalledWith('Error deleting unit:', expect.any(Error));
    });

    it('should handle unit with minimal fields', async () => {
        expect.assertions(1);
        const minimalUnit = {
            buildingID: testBuildingID,
            unitID: 'B2'
        };
        mockSend.mockResolvedValueOnce({ Attributes: { ...minimalUnit } });

        const createdUnit = await createUnit(minimalUnit);
        expect(createdUnit).toEqual(minimalUnit);
    });

    it('should update website status and listing IDs', async () => {
        expect.assertions(3);
        const updates = {
            websiteStatus: {
                'apartments.com': WebsiteStatus.ACTIVE,
                zillow: WebsiteStatus.ACTIVE
            },
            listingIds: {
                'apartments.com': 'APT-123456',
                zillow: 'ZIL-789012'
            }
        };
        mockSend.mockResolvedValueOnce({
            Attributes: { ...testUnit, ...updates }
        });

        const updatedUnit = await updateUnit(testUnit.buildingID, testUnit.unitID, updates);
        expect(updatedUnit.websiteStatus!.zillow).toBe(WebsiteStatus.ACTIVE);
        expect(updatedUnit.listingIds!.zillow).toBe('ZIL-789012');
        expect(_.keys(updatedUnit.listingIds!)).toHaveLength(2);
    });

    it('should handle unit with model reference', async () => {
        expect.assertions(3);
        const unitWithModel = {
            ...testUnit,
            modelID: 'model-2br-deluxe',
            unitAmenities: [] // Inherits from model
        };
        mockSend.mockResolvedValueOnce({ Attributes: { ...unitWithModel } });

        const createdUnit = await createUnit(unitWithModel);
        expect(createdUnit.modelID).toBe('model-2br-deluxe');
        expect(createdUnit.unitAmenities).toHaveLength(0);
        expect(createdUnit.beds).toBe(1); // Unit-specific override
    });

    it('should handle complex unit amenities override', async () => {
        expect.assertions(2);
        const updatedAmenities = [
            { name: 'Premium Balcony', category: AmenityCategory.UNIT, description: 'Oversized balcony' },
            { name: 'Corner Unit', category: AmenityCategory.UNIT },
            { name: 'Updated Kitchen', category: AmenityCategory.UNIT }
        ];
        mockSend.mockResolvedValueOnce({
            Attributes: { ...testUnit, unitAmenities: updatedAmenities }
        });

        const updatedUnit = await updateUnit(
            testUnit.buildingID,
            testUnit.unitID,
            { unitAmenities: updatedAmenities }
        );
        expect(updatedUnit.unitAmenities).toHaveLength(3);
        expect(updatedUnit.unitAmenities![0].description).toBe('Oversized balcony');
    });

    it('should handle empty collections in unit data', async () => {
        expect.assertions(3);
        const unitWithEmptyCollections = {
            ...testUnit,
            photos: [],
            unitAmenities: [],
            websiteStatus: {},
            listingIds: {}
        };
        mockSend.mockResolvedValueOnce({ Items: [unitWithEmptyCollections] });

        const units = await getUnits(testBuildingID);
        expect(units[0].photos).toHaveLength(0);
        expect(units[0].websiteStatus).toEqual({});
        expect(units[0].listingIds).toEqual({});
    });
});
