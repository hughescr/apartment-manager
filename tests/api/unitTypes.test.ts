import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ModuleMocker } from '../ModuleMocker';
import { AmenityCategory } from '../../src/types';

const moduleMocker = new ModuleMocker();

const mockGetUnitTypes = mock();
const mockGetUnitType = mock();
const mockCreateUnitType = mock();
const mockUpdateUnitType = mock();
const mockDeleteUnitType = mock();

describe('Unit Types API', () => {
    let list: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyStructuredResultV2>;
    let get: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyStructuredResultV2>;
    let create: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyStructuredResultV2>;
    let update: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyStructuredResultV2>;
    let del: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyStructuredResultV2>;

    beforeEach(async () => {
        // Mock SST resources first
        await moduleMocker.mock('sst', () => ({
            Resource: {
                BuildingsUnits: {
                    name: 'test-table'
                }
            }
        }));

        // Mock AWS SDK
        await moduleMocker.mock('@aws-sdk/client-dynamodb', () => ({
            DynamoDBClient: class {
                constructor() {
                    // DynamoDB client mock
                }
            }
        }));

        await moduleMocker.mock('@aws-sdk/lib-dynamodb', () => ({
            DynamoDBDocumentClient: {
                from: () => ({})
            }
        }));

        // Mock data layer
        await moduleMocker.mock('../data/unitTypes', () => ({
            getUnitTypes: mockGetUnitTypes,
            getUnitType: mockGetUnitType,
            createUnitType: mockCreateUnitType,
            updateUnitType: mockUpdateUnitType,
            deleteUnitType: mockDeleteUnitType,
        }));

        // Now import the API functions after mocks are set up
        const apiModule = await import('../../api/unitTypes');
        list = apiModule.list;
        get = apiModule.get;
        create = apiModule.create;
        update = apiModule.update;
        del = apiModule.del;
    });

    afterEach(() => {
        mockGetUnitTypes.mockClear();
        mockGetUnitType.mockClear();
        mockCreateUnitType.mockClear();
        mockUpdateUnitType.mockClear();
        mockDeleteUnitType.mockClear();
        moduleMocker.clear();
    });

    const createMockEvent = (overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 => ({
        headers: {},
        isBase64Encoded: false,
        rawPath: '/api/buildings/test-building-1/unit-types',
        rawQueryString: '',
        requestContext: {
            accountId: 'test-account',
            apiId: 'test-api',
            domainName: 'test.com',
            domainPrefix: 'test',
            http: {
                method: 'GET',
                path: '/api/buildings/test-building-1/unit-types',
                protocol: 'HTTP/1.1',
                sourceIp: '127.0.0.1',
                userAgent: 'test-agent',
            },
            requestId: 'test-request-id',
            routeKey: 'GET /api/buildings/{buildingID}/unit-types',
            stage: 'test',
            time: '01/Jan/2024:00:00:00 +0000',
            timeEpoch: 1704067200000,
        },
        routeKey: 'GET /api/buildings/{buildingID}/unit-types',
        version: '2.0',
        ...overrides,
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

    describe('list endpoint', () => {
        it('should return all unit types for a building', async () => {
            expect.assertions(3);
            const unitTypes = [testUnitType, { ...testUnitType, modelID: 'model-1br', modelName: '1 Bedroom' }];
            mockGetUnitTypes.mockResolvedValueOnce(unitTypes);

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            const result = await list(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(unitTypes);
            expect(mockGetUnitTypes).toHaveBeenCalledWith('test-building-1');
        });

        it('should handle missing buildingID parameter', async () => {
            expect.assertions(3);
            mockGetUnitTypes.mockResolvedValueOnce([]);

            const event = createMockEvent({
                pathParameters: undefined
            });

            const result = await list(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual([]);
            expect(mockGetUnitTypes).toHaveBeenCalledWith('');
        });

        it('should handle empty unit types list', async () => {
            expect.assertions(2);
            mockGetUnitTypes.mockResolvedValueOnce([]);

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            const result = await list(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual([]);
        });

        it('should handle data layer errors', async () => {
            expect.assertions(1);
            mockGetUnitTypes.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            expect(list(event)).rejects.toThrow('Database error');
        });
    });

    describe('get endpoint', () => {
        it('should return a specific unit type', async () => {
            expect.assertions(3);
            mockGetUnitType.mockResolvedValueOnce(testUnitType);

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await get(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(testUnitType);
            expect(mockGetUnitType).toHaveBeenCalledWith('test-building-1', 'model-2br');
        });

        it('should return 404 for non-existent unit type', async () => {
            expect.assertions(2);
            mockGetUnitType.mockResolvedValueOnce(undefined);

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'non-existent' }
            });

            const result = await get(event);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });

        it('should handle missing parameters', async () => {
            expect.assertions(3);
            mockGetUnitType.mockResolvedValueOnce(undefined);

            const event = createMockEvent({
                pathParameters: undefined
            });

            const result = await get(event);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
            expect(mockGetUnitType).toHaveBeenCalledWith('', '');
        });

        it('should handle partial parameters', async () => {
            expect.assertions(2);
            mockGetUnitType.mockResolvedValueOnce(undefined);

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            const result = await get(event);

            expect(result.statusCode).toBe(404);
            expect(mockGetUnitType).toHaveBeenCalledWith('test-building-1', '');
        });
    });

    describe('create endpoint', () => {
        it('should create a new unit type', async () => {
            expect.assertions(4);
            mockGetUnitType.mockResolvedValueOnce(undefined); // No existing unit type
            mockCreateUnitType.mockResolvedValueOnce(testUnitType);

            const event = createMockEvent({
                body: JSON.stringify(testUnitType)
            });

            const result = await create(event);

            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body as string)).toEqual(testUnitType);
            expect(mockGetUnitType).toHaveBeenCalledWith(testUnitType.buildingID, testUnitType.modelID);
            expect(mockCreateUnitType).toHaveBeenCalledWith(testUnitType);
        });

        it('should return 409 if unit type already exists', async () => {
            expect.assertions(3);
            mockGetUnitType.mockResolvedValueOnce(testUnitType); // Existing unit type

            const event = createMockEvent({
                body: JSON.stringify(testUnitType)
            });

            const result = await create(event);

            expect(result.statusCode).toBe(409);
            expect(JSON.parse(result.body as string)).toEqual({ error: 'Unit type already exists' });
            expect(mockCreateUnitType).not.toHaveBeenCalled();
        });

        it('should handle missing body', async () => {
            expect.assertions(1);
            const event = createMockEvent({
                body: undefined
            });

            expect(create(event)).rejects.toThrow();
        });

        it('should handle invalid JSON body', async () => {
            expect.assertions(1);
            const event = createMockEvent({
                body: 'invalid json'
            });

            expect(create(event)).rejects.toThrow();
        });

        it('should handle minimal unit type data', async () => {
            expect.assertions(2);
            const minimalUnitType = {
                buildingID: 'test-building-1',
                modelID: 'model-studio',
                modelName: 'Studio',
                beds: 0,
                baths: 1
            };
            mockGetUnitType.mockResolvedValueOnce(undefined);
            mockCreateUnitType.mockResolvedValueOnce(minimalUnitType);

            const event = createMockEvent({
                body: JSON.stringify(minimalUnitType)
            });

            const result = await create(event);

            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body as string)).toEqual(minimalUnitType);
        });

        it('should handle creation with complex amenities', async () => {
            expect.assertions(3);
            const complexUnitType = {
                ...testUnitType,
                modelAmenities: [
                    { name: 'Pool View', category: AmenityCategory.UNIT, description: 'Overlooks the pool' },
                    { name: 'Corner Unit', category: AmenityCategory.UNIT },
                    { name: 'Upgraded Appliances', category: AmenityCategory.UNIT, description: 'Stainless steel' }
                ]
            };
            mockGetUnitType.mockResolvedValueOnce(undefined);
            mockCreateUnitType.mockResolvedValueOnce(complexUnitType);

            const event = createMockEvent({
                body: JSON.stringify(complexUnitType)
            });

            const result = await create(event);

            expect(result.statusCode).toBe(201);
            const createdType = JSON.parse(result.body as string);
            expect(createdType.modelAmenities).toHaveLength(3);
            expect(createdType.modelAmenities[0].description).toBe('Overlooks the pool');
        });
    });

    describe('update endpoint', () => {
        it('should update an existing unit type', async () => {
            expect.assertions(3);
            const updates = { minRent: 1600, maxRent: 1900 };
            const updatedUnitType = { ...testUnitType, ...updates };
            mockUpdateUnitType.mockResolvedValueOnce(updatedUnitType);

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify(updates)
            });

            const result = await update(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(updatedUnitType);
            expect(mockUpdateUnitType).toHaveBeenCalledWith('test-building-1', 'model-2br', updates);
        });

        it('should return 404 if unit type does not exist', async () => {
            expect.assertions(2);
            mockUpdateUnitType.mockResolvedValueOnce(undefined);

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'non-existent' },
                body: JSON.stringify({ minRent: 1600 })
            });

            const result = await update(event);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });

        it('should handle missing parameters', async () => {
            expect.assertions(2);
            mockUpdateUnitType.mockResolvedValueOnce(undefined);

            const event = createMockEvent({
                pathParameters: undefined,
                body: JSON.stringify({ minRent: 1600 })
            });

            const result = await update(event);

            expect(result.statusCode).toBe(404);
            expect(mockUpdateUnitType).toHaveBeenCalledWith('', '', { minRent: 1600 });
        });

        it('should handle empty update body', async () => {
            expect.assertions(2);
            const updatedUnitType = testUnitType;
            mockUpdateUnitType.mockResolvedValueOnce(updatedUnitType);

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify({})
            });

            const result = await update(event);

            expect(result.statusCode).toBe(200);
            expect(mockUpdateUnitType).toHaveBeenCalledWith('test-building-1', 'model-2br', {});
        });

        it('should handle updating complex fields', async () => {
            expect.assertions(3);
            const updates = {
                modelAmenities: [
                    { name: 'Updated Flooring', category: AmenityCategory.UNIT }
                ],
                countAvailable: 3
            };
            const updatedUnitType = { ...testUnitType, ...updates };
            mockUpdateUnitType.mockResolvedValueOnce(updatedUnitType);

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify(updates)
            });

            const result = await update(event);

            expect(result.statusCode).toBe(200);
            const updated = JSON.parse(result.body as string);
            expect(updated.modelAmenities).toHaveLength(1);
            expect(updated.countAvailable).toBe(3);
        });
    });

    describe('delete endpoint', () => {
        it('should delete an existing unit type', async () => {
            expect.assertions(3);
            mockDeleteUnitType.mockResolvedValueOnce(true);

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await del(event);

            expect(result.statusCode).toBe(204);
            expect(result.body).toBe('');
            expect(mockDeleteUnitType).toHaveBeenCalledWith('test-building-1', 'model-2br');
        });

        it('should return 404 if deletion fails', async () => {
            expect.assertions(2);
            mockDeleteUnitType.mockResolvedValueOnce(false);

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'non-existent' }
            });

            const result = await del(event);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });

        it('should handle missing parameters', async () => {
            expect.assertions(2);
            mockDeleteUnitType.mockResolvedValueOnce(false);

            const event = createMockEvent({
                pathParameters: undefined
            });

            const result = await del(event);

            expect(result.statusCode).toBe(404);
            expect(mockDeleteUnitType).toHaveBeenCalledWith('', '');
        });

        it('should handle idempotent deletes', async () => {
            expect.assertions(3);
            // First delete succeeds
            mockDeleteUnitType.mockResolvedValueOnce(true);

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result1 = await del(event);
            expect(result1.statusCode).toBe(204);

            // Second delete also succeeds (idempotent)
            mockDeleteUnitType.mockResolvedValueOnce(true);
            const result2 = await del(event);
            expect(result2.statusCode).toBe(204);
            expect(mockDeleteUnitType).toHaveBeenCalledTimes(2);
        });
    });

    describe('error handling', () => {
        it('should propagate data layer errors in list', async () => {
            expect.assertions(1);
            mockGetUnitTypes.mockRejectedValueOnce(new Error('Connection timeout'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            expect(list(event)).rejects.toThrow('Connection timeout');
        });

        it('should propagate data layer errors in get', async () => {
            expect.assertions(1);
            mockGetUnitType.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            expect(get(event)).rejects.toThrow('Database error');
        });

        it('should propagate data layer errors in create', async () => {
            expect.assertions(1);
            mockGetUnitType.mockResolvedValueOnce(undefined);
            mockCreateUnitType.mockRejectedValueOnce(new Error('Write failed'));

            const event = createMockEvent({
                body: JSON.stringify(testUnitType)
            });

            expect(create(event)).rejects.toThrow('Write failed');
        });

        it('should propagate data layer errors in update', async () => {
            expect.assertions(1);
            mockUpdateUnitType.mockRejectedValueOnce(new Error('Update failed'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify({ minRent: 1600 })
            });

            expect(update(event)).rejects.toThrow('Update failed');
        });
    });
});
