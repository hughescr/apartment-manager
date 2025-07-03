import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { getUnits, getUnit, createUnit, updateUnit, deleteUnit } from '../../data/units';
import { QueryCommand } from 'dynamodb-toolbox/table/actions/query';

import { forEach } from 'lodash';

/**
* When setting up a test that will mock a module, the block should add this:
* const moduleMocker = new ModuleMocker();
*
* afterEach(() => {
*   moduleMocker.clear();
* });
*
* When a test mocks a module, it should do it this way:
*
* beforeEach(() => {
*     await moduleMocker.mock('@/services/token.ts', () => ({
*         getBucketToken: mock(() => {
*             throw new Error('Unexpected error');
*         }),
*     });
* });
*
*/
interface MockResult {
    clear: () => void
}

export class ModuleMocker {
    private mocks: MockResult[] = [];

    async mock(modulePath: string, renderMocks: () => Record<string, unknown>) {
        const original = {
            ...(await import(modulePath))
        };
        const mocks = renderMocks();
        const result = {
            ...original,
            ...mocks,
        };
        mock.module(modulePath, () => result);

        this.mocks.push({
            clear: () => {
                mock.module(modulePath, () => original);
            },
        });
    }

    clear() {
        forEach(this.mocks, mockResult => mockResult.clear());
        this.mocks = [];
    }
}

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

        await moduleMocker.mock('../../data/model', () => ({
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
});
