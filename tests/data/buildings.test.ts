import { describe, it, expect, mock } from 'bun:test';
import { getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding } from '../../data/buildings';
import { ScanCommand } from 'dynamodb-toolbox/table/actions/scan';

// Mock the logger to prevent console output during tests
mock.module('@hughescr/logger', () => ({
    logger: {
        error: mock(),
    },
}));

// Mock the dynamodb-toolbox methods
const mockSend = mock();

// Mock the ApartmentTable and Building entity
mock.module('../../data/model', () => ({
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

describe('Building Data Layer', () => {
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
});
