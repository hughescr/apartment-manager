import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding } from '../../data/buildings';
import { ScanCommand } from 'dynamodb-toolbox/table/actions/scan';
import { ModuleMocker } from '../ModuleMocker';

const mockSend = mock();

const moduleMocker = new ModuleMocker();

describe('Building Data Layer', () => {
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
                    if(command === ScanCommand) {
                        return {
                            entities: mock(() => ({
                                send: mockSend,
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
            Building: {
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

    const testBuilding = {
        buildingID: 'test-building-1',
        street: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zip: '12345',
        description: 'A test building',
        yearBuilt: 2020,
        numberStories: 3,
        totalUnits: 10,
    };

    it('should create a building', async () => {
        expect.assertions(2);
        mockSend.mockResolvedValueOnce({ Attributes: { ...testBuilding } });
        mockSend.mockResolvedValueOnce({ Item: { ...testBuilding } });

        const createdBuilding = await createBuilding(testBuilding);
        expect(createdBuilding).toEqual({ ...testBuilding });

        const fetchedBuilding = await getBuilding(testBuilding.buildingID);
        expect(fetchedBuilding).toEqual({ ...testBuilding });
    });

    it('should get all buildings', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce({ Items: [{ ...testBuilding }] });
        const buildings = await getBuildings();
        expect(buildings).toEqual([{ ...testBuilding }]);
    });

    it('should get a single building', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce({ Item: { ...testBuilding } });
        const fetchedBuilding = await getBuilding(testBuilding.buildingID);
        expect(fetchedBuilding).toEqual({ ...testBuilding });
    });

    it('should update a building', async () => {
        expect.assertions(2);
        const updatedDescription = 'Updated description';
        mockSend.mockResolvedValueOnce({ Attributes: { ...testBuilding, description: updatedDescription } });
        mockSend.mockResolvedValueOnce({ Item: { ...testBuilding, description: updatedDescription } });

        const updatedBuilding = await updateBuilding(testBuilding.buildingID, { description: updatedDescription });
        expect(updatedBuilding.description).toBe(updatedDescription);

        const fetchedBuilding = await getBuilding(testBuilding.buildingID);
        expect(fetchedBuilding?.description).toBe(updatedDescription);
    });

    it('should delete a building', async () => {
        expect.assertions(2);
        mockSend.mockResolvedValueOnce({}); // Successful delete
        mockSend.mockResolvedValueOnce({ Item: undefined }); // Item not found after delete

        const success = await deleteBuilding(testBuilding.buildingID);
        expect(success).toBeTrue();

        const fetchedBuilding = await getBuilding(testBuilding.buildingID);
        expect(fetchedBuilding).toBeUndefined();
    });

    it('should return true if building to delete does not exist (idempotent delete)', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce({}); // Delete operation is idempotent
        const success = await deleteBuilding('non-existent-building');
        expect(success).toBeTrue();
    });

    it('should not create a building if it already exists', async () => {
        expect.assertions(1);
        mockSend.mockResolvedValueOnce({ Attributes: { ...testBuilding } }); // Simulate existing item
        const result = await createBuilding(testBuilding);
        expect(result).toEqual({ ...testBuilding });
    });

    it('should handle error during building deletion', async () => {
        expect.assertions(2);
        const { logger } = await import('@hughescr/logger');
        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

        const success = await deleteBuilding(testBuilding.buildingID);
        expect(success).toBeFalse();
        expect(logger.error).toHaveBeenCalledWith('Error deleting building:', expect.any(Error));
    });
});
