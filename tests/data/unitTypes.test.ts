import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import {
    getUnitTypes,
    getUnitType,
    createUnitType,
    updateUnitType,
    deleteUnitType,
    getUnitsByModelID
} from '../../data/unitTypes';
import { QueryCommand } from 'dynamodb-toolbox/table/actions/query';
import { ModuleMocker } from '../ModuleMocker';
import { AmenityCategory } from '../../src/types';

const mockSend = mock();

const moduleMocker = new ModuleMocker();

describe('UnitType Data Layer', () => {
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
                                    options: mock(() => ({
                                        send: mockSend,
                                    })),
                                    send: mockSend,
                                })),
                                options: mock(() => ({
                                    query: mock(() => ({
                                        send: mockSend,
                                    })),
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
            UnitType: {
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

    const testUnitType = {
        buildingID: 'test-building-1',
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

    it('should create a unit type', async () => {
        expect.assertions(2);
        mockSend.mockResolvedValueOnce({
            Attributes: { ...testUnitType, unitID: `MODEL#${testUnitType.modelID}` }
        });
        mockSend.mockResolvedValueOnce({
            Item: { ...testUnitType, unitID: `MODEL#${testUnitType.modelID}` }
        });

        const createdUnitType = await createUnitType(testUnitType);
        expect(createdUnitType).toEqual(testUnitType);

        const fetchedUnitType = await getUnitType(testUnitType.buildingID, testUnitType.modelID);
        expect(fetchedUnitType).toEqual(testUnitType);
    });

    it('should get all unit types for a building', async () => {
        expect.assertions(2);
        const unitTypes = [
            { ...testUnitType, unitID: `MODEL#${testUnitType.modelID}` },
            {
                ...testUnitType,
                modelID: 'model-1br',
                modelName: '1 Bedroom',
                beds: 1,
                baths: 1,
                unitID: 'MODEL#model-1br'
            }
        ];
        mockSend.mockResolvedValueOnce({ Items: unitTypes });

        const result = await getUnitTypes(testUnitType.buildingID);
        expect(result).toHaveLength(2);
        expect(result[0]).not.toHaveProperty('unitID');
    });

    it('should get a single unit type', async () => {
        expect.assertions(2);
        mockSend.mockResolvedValueOnce({
            Item: { ...testUnitType, unitID: `MODEL#${testUnitType.modelID}` }
        });

        const fetchedUnitType = await getUnitType(testUnitType.buildingID, testUnitType.modelID);
        expect(fetchedUnitType).toEqual(testUnitType);
        expect(fetchedUnitType).not.toHaveProperty('unitID');
    });

    it('should return undefined for non-existent unit type', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce({ Item: undefined });

        const fetchedUnitType = await getUnitType('non-existent-building', 'non-existent-model');
        expect(fetchedUnitType).toBeUndefined();
    });

    it('should update a unit type', async () => {
        expect.assertions(3);
        const updatedRent = { minRent: 1600, maxRent: 1900 };
        mockSend.mockResolvedValueOnce({
            Attributes: {
                ...testUnitType,
                ...updatedRent,
                unitID: `MODEL#${testUnitType.modelID}`
            }
        });
        mockSend.mockResolvedValueOnce({
            Item: {
                ...testUnitType,
                ...updatedRent,
                unitID: `MODEL#${testUnitType.modelID}`
            }
        });

        const updatedUnitType = await updateUnitType(
            testUnitType.buildingID,
            testUnitType.modelID,
            updatedRent
        );
        expect(updatedUnitType.minRent).toBe(1600);
        expect(updatedUnitType.maxRent).toBe(1900);

        const fetchedUnitType = await getUnitType(testUnitType.buildingID, testUnitType.modelID);
        expect(fetchedUnitType?.minRent).toBe(1600);
    });

    it('should delete a unit type', async () => {
        expect.assertions(2);
        mockSend.mockResolvedValueOnce({}); // Successful delete
        mockSend.mockResolvedValueOnce({ Item: undefined }); // Item not found after delete

        const success = await deleteUnitType(testUnitType.buildingID, testUnitType.modelID);
        expect(success).toBeTrue();

        const fetchedUnitType = await getUnitType(testUnitType.buildingID, testUnitType.modelID);
        expect(fetchedUnitType).toBeUndefined();
    });

    it('should return true if unit type to delete does not exist (idempotent delete)', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce({}); // Delete operation is idempotent
        const success = await deleteUnitType('non-existent-building', 'non-existent-model');
        expect(success).toBeTrue();
    });

    it('should not create a unit type if it already exists', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce({
            Attributes: undefined
        });
        const result = await createUnitType(testUnitType);
        expect(result).toEqual(testUnitType);
    });

    it('should handle error during unit type deletion', async () => {
        expect.assertions(2);
        const { logger } = await import('@hughescr/logger');
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

        const success = await deleteUnitType(testUnitType.buildingID, testUnitType.modelID);
        expect(success).toBeFalse();
        expect(logger.error).toHaveBeenCalledWith('Error deleting unit type:', expect.any(Error));
    });

    it('should get units by model ID', async () => {
        expect.assertions(3);
        const units = [
            {
                buildingID: testUnitType.buildingID,
                unitID: 'unit-101',
                modelID: testUnitType.modelID,
                unitNumber: '101',
                beds: 2,
                baths: 2
            },
            {
                buildingID: testUnitType.buildingID,
                unitID: 'unit-102',
                modelID: testUnitType.modelID,
                unitNumber: '102',
                beds: 2,
                baths: 2
            },
            {
                buildingID: testUnitType.buildingID,
                unitID: 'unit-201',
                modelID: 'model-1br',
                unitNumber: '201',
                beds: 1,
                baths: 1
            }
        ];
        mockSend.mockResolvedValueOnce({ Items: units });

        const result = await getUnitsByModelID(testUnitType.buildingID, testUnitType.modelID);
        expect(result).toHaveLength(2);
        expect(result[0].modelID).toBe(testUnitType.modelID);
        expect(result[1].modelID).toBe(testUnitType.modelID);
    });

    it('should return empty array when no units match model ID', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce({ Items: [] });

        const result = await getUnitsByModelID(testUnitType.buildingID, 'non-existent-model');
        expect(result).toEqual([]);
    });

    it('should handle unit types with minimal data', async () => {
        expect.assertions(2);
        const minimalUnitType = {
            buildingID: 'test-building-1',
            modelID: 'model-studio',
            modelName: 'Studio',
            beds: 0,
            baths: 1
        };
        mockSend.mockResolvedValueOnce({
            Attributes: { ...minimalUnitType, unitID: `MODEL#${minimalUnitType.modelID}` }
        });

        const createdUnitType = await createUnitType(minimalUnitType);
        expect(createdUnitType).toEqual(minimalUnitType);
        expect(createdUnitType.modelAmenities).toBeUndefined();
    });

    it('should handle unit types with all optional fields', async () => {
        expect.assertions(1);
        const fullUnitType = {
            ...testUnitType,
            modelAmenities: [
                { name: 'Granite Countertops', category: AmenityCategory.UNIT, description: 'Premium granite' },
                { name: 'Hardwood Floors', category: AmenityCategory.UNIT },
                { name: 'Walk-in Closet', category: AmenityCategory.UNIT }
            ]
        };
        mockSend.mockResolvedValueOnce({
            Attributes: { ...fullUnitType, unitID: `MODEL#${fullUnitType.modelID}` }
        });

        const createdUnitType = await createUnitType(fullUnitType);
        expect(createdUnitType.modelAmenities).toHaveLength(3);
    });

    it('should properly format sort keys with MODEL# prefix', async () => {
        expect.assertions(1);
        const modelID = 'special-model-123';
        mockSend.mockResolvedValueOnce({
            Item: {
                buildingID: 'bldg-1',
                modelID,
                modelName: 'Special Model',
                beds: 3,
                baths: 2,
                unitID: `MODEL#${modelID}`
            }
        });

        const result = await getUnitType('bldg-1', modelID);
        expect(result?.modelID).toBe(modelID);
    });
});
