// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { dynamoDbMock, jest } from '../data/test-setup';

import { describe, it, expect, beforeEach } from 'bun:test';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { AmenityCategory } from '../../src/types';
import { mockScanResponse, mockGetResponse, mockPutResponse, mockUpdateResponse, mockDeleteResponse } from '../helpers/mock-responses';
import _ from 'lodash';

// Import API functions directly - they will use the mocked DynamoDB client from test-setup
import { list, get, create, update, del } from '../../api/unitTypes';

describe('Unit Types API', () => {
    beforeEach(() => {
        // Clear mock calls before each test
        jest.clearAllMocks();
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
        ],
    };

    describe('list endpoint', () => {
        it('should return all unit types for a building', async () => {
            expect.assertions(3);
            const unitTypes = [
                testUnitType,
                { ...testUnitType, modelID: 'model-1br', modelName: '1 Bedroom' }
            ];
            // Mock DynamoDB scan response with proper unitID format
            const mockDbData = _.map(unitTypes, ut => ({ ...ut, unitID: `MODEL#${ut.modelID}` }));
            dynamoDbMock.mockResolvedValueOnce(mockScanResponse(mockDbData));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            const result = await list(event);

            expect(result.statusCode).toBe(200);
            // The data layer strips the unitID field
            expect(JSON.parse(result.body as string)).toEqual(unitTypes);
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should handle empty unit types list', async () => {
            expect.assertions(2);
            dynamoDbMock.mockResolvedValueOnce(mockScanResponse([]));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            const result = await list(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual([]);
        });

        it('should handle data layer errors', async () => {
            expect.assertions(1);
            dynamoDbMock.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            expect(list(event)).rejects.toThrow('Database error');
        });
    });

    describe('get endpoint', () => {
        it('should return a specific unit type', async () => {
            expect.assertions(3);
            // Mock DynamoDB get response with proper unitID format
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testUnitType, unitID: `MODEL#${testUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await get(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(testUnitType);
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should return 404 for non-existent unit type', async () => {
            expect.assertions(2);
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'non-existent' }
            });

            const result = await get(event);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });

        it('should handle data layer errors', async () => {
            expect.assertions(1);
            dynamoDbMock.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            expect(get(event)).rejects.toThrow('Database error');
        });
    });

    describe('create endpoint', () => {
        it('should create a new unit type', async () => {
            expect.assertions(3);
            const newUnitType = {
                modelID: 'model-3br',
                modelName: '3 Bedroom',
                beds: 3,
                baths: 2.5,
                buildingID: 'test-building-1'
            };
            // Mock the check for existing unit type (returns undefined)
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
            // Mock the create operation
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...newUnitType, unitID: `MODEL#${newUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' },
                body: JSON.stringify(newUnitType),
                headers: { 'content-type': 'application/json' }
            });

            const result = await create(event);

            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body as string)).toEqual(newUnitType);
            expect(dynamoDbMock).toHaveBeenCalledTimes(2);
        });

        it('should validate required fields', async () => {
            expect.assertions(4);
            const invalidData = {
                modelName: '3 Bedroom',
                // Missing modelID, beds, baths
            };

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' },
                body: JSON.stringify(invalidData),
                headers: { 'content-type': 'application/json' }
            });

            const result = await create(event);

            expect(result.statusCode).toBe(400);
            const errors = JSON.parse(result.body as string).errors;
            expect(errors).toHaveProperty('modelID');
            expect(errors).toHaveProperty('beds');
            expect(errors).toHaveProperty('baths');
        });

        it('should handle JSON parsing errors', async () => {
            expect.assertions(2);
            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' },
                body: 'invalid json',
                headers: { 'content-type': 'application/json' }
            });

            const result = await create(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body as string)).toEqual({ error: 'Invalid request body' });
        });

        it('should return 409 conflict when unit type already exists', async () => {
            expect.assertions(2);
            const newUnitType = {
                modelID: 'existing-model',
                modelName: 'Existing Model',
                beds: 2,
                baths: 2,
                buildingID: 'test-building-1'
            };
            // Mock the check for existing unit type (returns an existing item)
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse({
                ...newUnitType,
                unitID: `MODEL#${newUnitType.modelID}`
            }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' },
                body: JSON.stringify(newUnitType),
                headers: { 'content-type': 'application/json' }
            });

            const result = await create(event);

            expect(result.statusCode).toBe(409);
            expect(JSON.parse(result.body as string)).toEqual({ error: 'Unit type already exists' });
        });

        describe('validation edge cases', () => {
            it('should validate empty modelName', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: '   ', // Whitespace only
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1'
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.modelName).toBe('Model name cannot be empty');
            });

            it('should validate invalid modelID format', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'invalid!@#$%',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1'
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.modelID).toBe('Model ID can only contain letters, numbers, underscores, and hyphens');
            });

            it('should validate out-of-range beds and baths', async () => {
                expect.assertions(3);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 11, // > 10
                    baths: 15, // > 10
                    buildingID: 'test-building-1'
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.beds).toBe('Number of beds must be between 0 and 10');
                expect(errors.baths).toBe('Number of baths must be between 0 and 10');
            });

            it('should validate negative countAvailable', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    countAvailable: -5
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.countAvailable).toBe('Count available cannot be negative');
            });

            it('should validate invalid date format', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    dateAvailable: 'not-a-date'
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.dateAvailable).toBe('Available date must be a valid date');
            });

            it('should validate out-of-range maxOccupants', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    maxOccupants: 25 // > 20
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.maxOccupants).toBe('Max occupants must be between 1 and 20');
            });

            it('should validate negative rent values', async () => {
                expect.assertions(4);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    minRent: -100,
                    maxRent: -200,
                    perPersonRent: -50
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.minRent).toBe('Min rent cannot be negative');
                expect(errors.maxRent).toBe('Max rent cannot be negative');
                expect(errors.perPersonRent).toBe('Per person rent cannot be negative');
            });

            it('should validate min rent greater than max rent', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    minRent: 2000,
                    maxRent: 1500
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.rentRange).toBe('Min rent cannot be greater than max rent');
            });

            it('should validate out-of-range square footage', async () => {
                expect.assertions(3);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    minSqft: 15000, // > 10000
                    maxSqft: 20000  // > 10000
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.minSqft).toBe('Min square footage must be between 0 and 10000');
                expect(errors.maxSqft).toBe('Max square footage must be between 0 and 10000');
            });

            it('should validate min sqft greater than max sqft', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    minSqft: 1500,
                    maxSqft: 1000
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.sqftRange).toBe('Min square footage cannot be greater than max square footage');
            });

            it('should validate negative deposit', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    deposit: -500
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.deposit).toBe('Deposit cannot be negative');
            });

            it('should validate out-of-range lease terms', async () => {
                expect.assertions(3);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    minLeaseTerm: 0,  // < 1
                    maxLeaseTerm: 48  // > 36
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.minLeaseTerm).toBe('Min lease term must be between 1 and 36 months');
                expect(errors.maxLeaseTerm).toBe('Max lease term must be between 1 and 36 months');
            });

            it('should validate min lease term greater than max lease term', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    minLeaseTerm: 12,
                    maxLeaseTerm: 6
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.leaseTermRange).toBe('Min lease term cannot be greater than max lease term');
            });

            it('should accumulate multiple validation errors', async () => {
                expect.assertions(5);
                const invalidData = {
                    modelID: 'test!@#',
                    modelName: '',
                    beds: -5,
                    baths: 20,
                    buildingID: 'test-building-1',
                    deposit: -1000
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.modelID).toBeDefined();
                expect(errors.modelName).toBeDefined();
                expect(errors.beds).toBeDefined();
                expect(errors.baths).toBeDefined();
            });
        });
    });

    describe('update endpoint', () => {
        it('should update a unit type', async () => {
            expect.assertions(3);
            const updates = {
                modelName: '2 Bedroom Premium',
                minRent: 1600,
                maxRent: 1900
            };
            // Mock returns the updated item with unitID
            const updatedUnitType = { ...testUnitType, ...updates };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...updatedUnitType, unitID: `MODEL#${testUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify(updates),
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(updatedUnitType);
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should successfully update a non-existent unit type', async () => {
            expect.assertions(2);
            // In real DynamoDB, UpdateItem would fail due to missing required fields
            // But in our mocked tests, we control the response
            const updates = { modelName: 'Updated Name' };
            const updatedItem = {
                buildingID: 'test-building-1',
                modelID: 'non-existent',
                modelName: 'Updated Name',
                beds: 1, // These would be required in real DynamoDB
                baths: 1
            };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...updatedItem, unitID: 'MODEL#non-existent' }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'non-existent' },
                body: JSON.stringify(updates),
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(updatedItem);
        });

        it('should ignore attempts to change protected fields', async () => {
            expect.assertions(3);
            const invalidUpdates = {
                modelID: 'new-id', // Will be ignored
                buildingID: 'different-building', // Will be ignored
                modelName: 'Updated Name' // This will be applied
            };

            // The data layer will use the IDs from path params, not from body
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
                ...testUnitType,
                modelName: 'Updated Name',
                unitID: `MODEL#${testUnitType.modelID}`
            }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify(invalidUpdates),
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(200);
            const updatedData = JSON.parse(result.body as string);
            // Verify the IDs weren't changed
            expect(updatedData.modelID).toBe('model-2br');
            expect(updatedData.buildingID).toBe('test-building-1');
        });

        it('should handle JSON parsing errors in update', async () => {
            expect.assertions(2);
            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: 'invalid json {{{',
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body as string)).toEqual({ error: 'Invalid request body' });
        });

        it('should handle validation failures in update', async () => {
            expect.assertions(3);
            const invalidUpdates = {
                minRent: -500,  // Negative rent
                maxRent: -100,  // Negative rent
                deposit: -1000  // Negative deposit
            };

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify(invalidUpdates),
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body as string);
            expect(response.error).toBe('Validation failed');
            expect(response.errors).toHaveProperty('minRent');
        });

        it('should validate all fields in update like create', async () => {
            expect.assertions(5);
            const invalidUpdates = {
                modelName: '   ', // Empty
                beds: 15, // > 10
                maxOccupants: 0, // < 1
                minLeaseTerm: 50, // > 36
                minSqft: 15000 // > 10000
            };

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify(invalidUpdates),
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(400);
            const errors = JSON.parse(result.body as string).errors;
            expect(errors.modelName).toBe('Model name cannot be empty');
            expect(errors.beds).toBe('Number of beds must be between 0 and 10');
            expect(errors.maxOccupants).toBe('Max occupants must be between 1 and 20');
            expect(errors.minLeaseTerm).toBe('Min lease term must be between 1 and 36 months');
        });
    });

    describe('delete endpoint', () => {
        it('should delete a unit type', async () => {
            expect.assertions(3);
            dynamoDbMock.mockResolvedValueOnce(mockDeleteResponse());

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await del(event);

            expect(result.statusCode).toBe(204);
            expect(result.body).toBe('');
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should handle delete errors gracefully', async () => {
            expect.assertions(2);
            dynamoDbMock.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await del(event);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });
    });

    describe('edge case tests', () => {
        describe('HTTP headers and request handling', () => {
            it('should handle missing Content-Type header', async () => {
                expect.assertions(2);
                const data = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1'
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(data),
                    headers: {} // No Content-Type
                });

                // The API should still process JSON body even without Content-Type
                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...data, unitID: `MODEL#${data.modelID}` }));

                const result = await create(event);

                expect(result.statusCode).toBe(201);
                expect(JSON.parse(result.body as string)).toEqual(data);
            });

            it('should handle invalid Content-Type header', async () => {
                expect.assertions(2);
                const data = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1'
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(data),
                    headers: { 'content-type': 'text/plain' } // Wrong Content-Type
                });

                // The API should still process JSON body regardless of Content-Type
                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...data, unitID: `MODEL#${data.modelID}` }));

                const result = await create(event);

                expect(result.statusCode).toBe(201);
                expect(JSON.parse(result.body as string)).toEqual(data);
            });

            it('should handle very large Content-Length header', async () => {
                expect.assertions(2);
                const data = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1'
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(data),
                    headers: {
                        'content-type': 'application/json',
                        'content-length': '999999999' // Very large but body is small
                    }
                });

                // The API should process based on actual body, not header
                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...data, unitID: `MODEL#${data.modelID}` }));

                const result = await create(event);

                expect(result.statusCode).toBe(201);
                expect(JSON.parse(result.body as string)).toEqual(data);
            });

            it('should handle requests with Authorization headers', async () => {
                expect.assertions(2);
                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    headers: {
                        authorization: 'Bearer fake-token',
                        'x-api-key': 'fake-api-key'
                    }
                });

                const unitTypes = [testUnitType];
                const mockDbData = _.map(unitTypes, ut => ({ ...ut, unitID: `MODEL#${ut.modelID}` }));
                dynamoDbMock.mockResolvedValueOnce(mockScanResponse(mockDbData));

                const result = await list(event);

                expect(result.statusCode).toBe(200);
                expect(JSON.parse(result.body as string)).toEqual(unitTypes);
            });
        });

        describe('request body edge cases', () => {
            it('should handle extremely large JSON payload', async () => {
                expect.assertions(2);
                // Create a large object with many fields
                const largeData: Record<string, unknown> = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1'
                };

                // Add 1000 extra fields
                for(let i = 0; i < 1000; i++) {
                    largeData[`extra_field_${i}`] = _.repeat('x', 100);
                }

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(largeData),
                    headers: { 'content-type': 'application/json' }
                });

                // The API should ignore extra fields and process normally
                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    unitID: 'MODEL#test-model'
                }));

                const result = await create(event);

                expect(result.statusCode).toBe(201);
                const created = JSON.parse(result.body as string);
                expect(created.modelID).toBe('test-model');
            });

            it('should handle deeply nested JSON structures', async () => {
                expect.assertions(2);
                // Create a deeply nested object
                let deeplyNested: Record<string, unknown> = { value: 'deep' };
                for(let i = 0; i < 100; i++) {
                    deeplyNested = { nested: deeplyNested };
                }

                const data = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    deepData: deeplyNested
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(data),
                    headers: { 'content-type': 'application/json' }
                });

                // The API should handle and ignore the deep nesting
                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    unitID: 'MODEL#test-model'
                }));

                const result = await create(event);

                expect(result.statusCode).toBe(201);
                const created = JSON.parse(result.body as string);
                expect(created.modelID).toBe('test-model');
            });

            it('should handle malformed JSON with truncation', async () => {
                expect.assertions(2);
                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: '{"modelID": "test", "modelName": "Test', // Truncated JSON
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                expect(JSON.parse(result.body as string)).toEqual({ error: 'Invalid request body' });
            });

            it('should handle JSON with special Unicode sequences', async () => {
                expect.assertions(2);
                // \uDEAD is actually a valid Unicode escape sequence, just unpaired surrogate
                // The JSON will parse successfully but validation will fail
                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: '{"modelID": "test", "modelName": "Test\uDEAD", "beds": 2, "baths": 2, "buildingID": "test-building-1"}',
                    headers: { 'content-type': 'application/json' }
                });

                // Check for existing first
                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                // Then create
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({
                    modelID: 'test',
                    modelName: 'Test\uDEAD',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    unitID: 'MODEL#test'
                }));

                const result = await create(event);

                expect(result.statusCode).toBe(201);
                const created = JSON.parse(result.body as string);
                expect(created.modelID).toBe('test');
            });

            it('should handle empty body', async () => {
                expect.assertions(2);
                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: '',
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const response = JSON.parse(result.body as string);
                expect(response.error).toBe('Validation failed');
            });

            it('should handle null body', async () => {
                expect.assertions(2);
                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: null as unknown as string,
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const response = JSON.parse(result.body as string);
                expect(response.error).toBe('Validation failed');
            });

            it('should handle undefined body', async () => {
                expect.assertions(2);
                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: undefined,
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const response = JSON.parse(result.body as string);
                expect(response.error).toBe('Validation failed');
            });
        });

        describe('path parameter validation', () => {
            it('should handle SQL injection attempts in buildingID', async () => {
                expect.assertions(2);
                const event = createMockEvent({
                    pathParameters: {
                        buildingID: "test'; DROP TABLE units; --",
                        modelID: 'model-1'
                    }
                });

                // DynamoDB is NoSQL, so SQL injection doesn't apply, but test handling
                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));

                const result = await get(event);

                expect(result.statusCode).toBe(404);
                expect(result.body).toBe('Not Found');
            });

            it('should handle XSS attempts in modelID', async () => {
                expect.assertions(2);
                const event = createMockEvent({
                    pathParameters: {
                        buildingID: 'test-building-1',
                        modelID: '<script>alert("xss")</script>'
                    }
                });

                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));

                const result = await get(event);

                expect(result.statusCode).toBe(404);
                expect(result.body).toBe('Not Found');
            });

            it('should handle very long path parameters', async () => {
                expect.assertions(2);
                const veryLongId = _.repeat('a', 10000); // 10K characters
                const event = createMockEvent({
                    pathParameters: {
                        buildingID: veryLongId,
                        modelID: 'model-1'
                    }
                });

                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));

                const result = await get(event);

                expect(result.statusCode).toBe(404);
                expect(result.body).toBe('Not Found');
            });

            it('should handle missing path parameters', async () => {
                expect.assertions(3);
                const event = createMockEvent({
                    pathParameters: undefined
                });

                dynamoDbMock.mockResolvedValueOnce(mockScanResponse([]));

                const result = await list(event);

                expect(result.statusCode).toBe(200);
                expect(JSON.parse(result.body as string)).toEqual([]);
                // Verify it used empty string as buildingID
                expect(dynamoDbMock).toHaveBeenCalledTimes(1);
            });

            it('should handle null path parameters', async () => {
                expect.assertions(3);
                const event = createMockEvent({
                    pathParameters: null as unknown as Record<string, string | undefined>
                });

                dynamoDbMock.mockResolvedValueOnce(mockScanResponse([]));

                const result = await list(event);

                expect(result.statusCode).toBe(200);
                expect(JSON.parse(result.body as string)).toEqual([]);
                expect(dynamoDbMock).toHaveBeenCalledTimes(1);
            });

            it('should handle special characters in path parameters', async () => {
                expect.assertions(2);
                const event = createMockEvent({
                    pathParameters: {
                        buildingID: 'building%20with%20spaces',
                        modelID: 'model#with$special@chars!'
                    }
                });

                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));

                const result = await get(event);

                expect(result.statusCode).toBe(404);
                expect(result.body).toBe('Not Found');
            });
        });

        describe('HTTP method validation', () => {
            it('should handle invalid HTTP method in request context', async () => {
                expect.assertions(2);
                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    requestContext: {
                        ...createMockEvent().requestContext,
                        http: {
                            ...createMockEvent().requestContext.http,
                            method: 'INVALID' as unknown as 'GET'
                        }
                    }
                });

                const unitTypes = [testUnitType];
                const mockDbData = _.map(unitTypes, ut => ({ ...ut, unitID: `MODEL#${ut.modelID}` }));
                dynamoDbMock.mockResolvedValueOnce(mockScanResponse(mockDbData));

                // The handler doesn't check method, so it should work normally
                const result = await list(event);

                expect(result.statusCode).toBe(200);
                expect(JSON.parse(result.body as string)).toEqual(unitTypes);
            });
        });

        describe('CORS and response headers', () => {
            it('should not include CORS headers in responses', async () => {
                expect.assertions(3);
                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    headers: {
                        origin: 'https://malicious-site.com'
                    }
                });

                const unitTypes = [testUnitType];
                const mockDbData = _.map(unitTypes, ut => ({ ...ut, unitID: `MODEL#${ut.modelID}` }));
                dynamoDbMock.mockResolvedValueOnce(mockScanResponse(mockDbData));

                const result = await list(event);

                expect(result.statusCode).toBe(200);
                expect(result.headers).toBeUndefined(); // No CORS headers added
                expect(JSON.parse(result.body as string)).toEqual(unitTypes);
            });
        });

        describe('concurrent request handling', () => {
            it('should handle concurrent requests for the same resource', async () => {
                expect.assertions(6);
                const buildingID = 'test-building-1';
                const modelID = 'model-2br';

                // Create multiple events for concurrent requests
                const event1 = createMockEvent({
                    pathParameters: { buildingID, modelID }
                });
                const event2 = createMockEvent({
                    pathParameters: { buildingID, modelID }
                });
                const event3 = createMockEvent({
                    pathParameters: { buildingID, modelID }
                });

                // Mock responses for all three requests
                dynamoDbMock
                    .mockResolvedValueOnce(mockGetResponse({ ...testUnitType, unitID: `MODEL#${modelID}` }))
                    .mockResolvedValueOnce(mockGetResponse({ ...testUnitType, unitID: `MODEL#${modelID}` }))
                    .mockResolvedValueOnce(mockGetResponse({ ...testUnitType, unitID: `MODEL#${modelID}` }));

                // Execute requests concurrently
                const [result1, result2, result3] = await Promise.all([
                    get(event1),
                    get(event2),
                    get(event3)
                ]);

                // All should return the same successful response
                expect(result1.statusCode).toBe(200);
                expect(result2.statusCode).toBe(200);
                expect(result3.statusCode).toBe(200);
                expect(JSON.parse(result1.body as string)).toEqual(testUnitType);
                expect(JSON.parse(result2.body as string)).toEqual(testUnitType);
                expect(JSON.parse(result3.body as string)).toEqual(testUnitType);
            });

            it('should handle concurrent requests for the same unit type creation', async () => {
                expect.assertions(3);
                const data = {
                    modelID: 'concurrent-model',
                    modelName: 'Concurrent Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1'
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(data),
                    headers: { 'content-type': 'application/json' }
                });

                // Simulate that unit type was created between check and create
                // First check shows it doesn't exist
                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                // But the create fails because another request created it first
                // This simulates a condition check failure in DynamoDB
                dynamoDbMock.mockResolvedValueOnce({});

                const result = await create(event);

                // The create should succeed (our data layer returns the input on condition failure)
                expect(result.statusCode).toBe(201);
                expect(JSON.parse(result.body as string).modelID).toBe('concurrent-model');
                expect(dynamoDbMock).toHaveBeenCalledTimes(2);
            });
        });

        describe('error response consistency', () => {
            it('should return consistent error format for validation errors', async () => {
                expect.assertions(4);
                const invalidData = {
                    modelID: '',
                    modelName: '',
                    buildingID: 'test-building-1',
                    beds: -1,
                    baths: 'not-a-number' as unknown as number
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const response = JSON.parse(result.body as string);
                expect(response).toHaveProperty('error', 'Validation failed');
                expect(response).toHaveProperty('errors');
                expect(typeof response.errors).toBe('object');
            });

            it('should return consistent error format for JSON parse errors', async () => {
                expect.assertions(3);
                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: '{{{{invalid json',
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const response = JSON.parse(result.body as string);
                expect(response).toHaveProperty('error', 'Invalid request body');
                expect(response.errors).toBeUndefined(); // No validation errors for parse failure
            });

            it('should return consistent 404 format', async () => {
                expect.assertions(4);
                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1', modelID: 'non-existent' }
                });

                const result = await get(event);

                expect(result.statusCode).toBe(404);
                expect(result.body).toBe('Not Found');
                expect(result.headers).toBeUndefined();
                expect(typeof result.body).toBe('string'); // Not JSON
            });

            it('should return consistent 409 format', async () => {
                expect.assertions(3);
                const data = {
                    modelID: 'existing',
                    modelName: 'Existing',
                    beds: 1,
                    baths: 1,
                    buildingID: 'test-building-1'
                };

                dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...data, unitID: `MODEL#${data.modelID}` }));

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(data),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(409);
                const response = JSON.parse(result.body as string);
                expect(response).toHaveProperty('error', 'Unit type already exists');
                expect(response.errors).toBeUndefined();
            });
        });

        describe('extra fields handling', () => {
            it('should ignore unexpected fields in create request', async () => {
                expect.assertions(3);
                const data = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    unexpectedField1: 'should be ignored',
                    unexpectedField2: 12345,
                    unexpectedField3: { nested: 'object' },
                    unexpectedField4: ['array', 'values']
                };

                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1',
                    unitID: 'MODEL#test-model'
                }));

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(data),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(201);
                const created = JSON.parse(result.body as string);
                expect(created).not.toHaveProperty('unexpectedField1');
                expect(created).not.toHaveProperty('unexpectedField2');
            });

            it('should ignore unexpected fields in update request', async () => {
                expect.assertions(3);
                const updates = {
                    modelName: 'Updated Name',
                    minRent: 1600,
                    extraField: 'should be ignored',
                    anotherExtra: true
                };

                const updatedData = {
                    ...testUnitType,
                    modelName: 'Updated Name',
                    minRent: 1600
                };

                dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...updatedData, unitID: `MODEL#${testUnitType.modelID}` }));

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                    body: JSON.stringify(updates),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await update(event);

                expect(result.statusCode).toBe(200);
                const updated = JSON.parse(result.body as string);
                expect(updated).not.toHaveProperty('extraField');
                expect(updated).not.toHaveProperty('anotherExtra');
            });
        });

        describe('Lambda context edge cases', () => {
            it('should handle missing requestContext', async () => {
                expect.assertions(2);
                const event = {
                    ...createMockEvent(),
                    requestContext: undefined as unknown as APIGatewayProxyEventV2['requestContext']
                };

                const unitTypes = [testUnitType];
                const mockDbData = _.map(unitTypes, ut => ({ ...ut, unitID: `MODEL#${ut.modelID}` }));
                dynamoDbMock.mockResolvedValueOnce(mockScanResponse(mockDbData));

                const result = await list(event);

                expect(result.statusCode).toBe(200);
                expect(JSON.parse(result.body as string)).toEqual(unitTypes);
            });

            it('should handle event with minimal required fields only', async () => {
                expect.assertions(2);
                const minimalEvent = {
                    version: '2.0',
                    headers: {},
                    isBase64Encoded: false,
                    rawPath: '',
                    rawQueryString: '',
                    routeKey: '',
                    pathParameters: { buildingID: 'test-building-1' }
                } as APIGatewayProxyEventV2;

                const unitTypes = [testUnitType];
                const mockDbData = _.map(unitTypes, ut => ({ ...ut, unitID: `MODEL#${ut.modelID}` }));
                dynamoDbMock.mockResolvedValueOnce(mockScanResponse(mockDbData));

                const result = await list(minimalEvent);

                expect(result.statusCode).toBe(200);
                expect(JSON.parse(result.body as string)).toEqual(unitTypes);
            });
        });
    });

    describe('validation edge cases', () => {
        describe('create endpoint validation', () => {
            it('should reject empty modelName', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: '   ', // whitespace only
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('modelName', 'Model name cannot be empty');
            });

            it('should reject invalid modelID format', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model@test!', // contains invalid characters
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('modelID', 'Model ID can only contain letters, numbers, underscores, and hyphens');
            });

            it('should reject beds count greater than 10', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 11, // > 10
                    baths: 2
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('beds', 'Number of beds must be between 0 and 10');
            });

            it('should reject baths count greater than 10', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 11 // > 10
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('baths', 'Number of baths must be between 0 and 10');
            });

            it('should reject negative countAvailable', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    countAvailable: -1
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('countAvailable', 'Count available cannot be negative');
            });

            it('should reject invalid date format', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    dateAvailable: 'not-a-date'
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('dateAvailable', 'Available date must be a valid date');
            });

            it('should reject maxOccupants less than 1', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    maxOccupants: 0
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('maxOccupants', 'Max occupants must be between 1 and 20');
            });

            it('should reject maxOccupants greater than 20', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    maxOccupants: 21
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('maxOccupants', 'Max occupants must be between 1 and 20');
            });

            it('should reject negative minRent', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    minRent: -100
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('minRent', 'Min rent cannot be negative');
            });

            it('should reject negative maxRent', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    maxRent: -100
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('maxRent', 'Max rent cannot be negative');
            });

            it('should reject minRent greater than maxRent', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    minRent: 2000,
                    maxRent: 1500
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('rentRange', 'Min rent cannot be greater than max rent');
            });

            it('should reject negative perPersonRent', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    perPersonRent: -50
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('perPersonRent', 'Per person rent cannot be negative');
            });

            it('should reject minSqft greater than 10000', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    minSqft: 10001
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('minSqft', 'Min square footage must be between 0 and 10000');
            });

            it('should reject maxSqft greater than 10000', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    maxSqft: 10001
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('maxSqft', 'Max square footage must be between 0 and 10000');
            });

            it('should reject minSqft greater than maxSqft', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    minSqft: 1200,
                    maxSqft: 1000
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('sqftRange', 'Min square footage cannot be greater than max square footage');
            });

            it('should reject negative deposit', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    deposit: -100
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('deposit', 'Deposit cannot be negative');
            });

            it('should reject minLeaseTerm less than 1', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    minLeaseTerm: 0
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('minLeaseTerm', 'Min lease term must be between 1 and 36 months');
            });

            it('should reject maxLeaseTerm greater than 36', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    maxLeaseTerm: 37
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('maxLeaseTerm', 'Max lease term must be between 1 and 36 months');
            });

            it('should reject minLeaseTerm greater than maxLeaseTerm', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'model-test',
                    modelName: 'Test Model',
                    buildingID: 'test-building-1',
                    beds: 2,
                    baths: 2,
                    minLeaseTerm: 12,
                    maxLeaseTerm: 6
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('leaseTermRange', 'Min lease term cannot be greater than max lease term');
            });

            it('should return 409 when unit type already exists', async () => {
                expect.assertions(2);
                const newUnitType = {
                    modelID: 'existing-model',
                    modelName: 'Existing Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1'
                };

                // Mock the check for existing unit type to return an existing item
                dynamoDbMock.mockResolvedValueOnce(mockGetResponse({
                    ...newUnitType,
                    unitID: `MODEL#${newUnitType.modelID}`
                }));

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(newUnitType),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(409);
                expect(JSON.parse(result.body as string)).toEqual({ error: 'Unit type already exists' });
            });

            it('should handle multiple validation errors', async () => {
                expect.assertions(5);
                const invalidData = {
                    modelID: 'test@model!',
                    modelName: '   ',
                    buildingID: 'test-building-1',
                    beds: -1,
                    baths: 15,
                    minRent: 2000,
                    maxRent: 1000
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('modelID');
                expect(errors).toHaveProperty('modelName');
                expect(errors).toHaveProperty('beds');
                expect(errors).toHaveProperty('baths');
            });
        });

        describe('update endpoint validation', () => {
            it('should reject invalid JSON in update', async () => {
                expect.assertions(2);
                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                    body: '{ invalid json }',
                    headers: { 'content-type': 'application/json' }
                });

                const result = await update(event);

                expect(result.statusCode).toBe(400);
                expect(JSON.parse(result.body as string)).toEqual({ error: 'Invalid request body' });
            });

            it('should validate fields in update', async () => {
                expect.assertions(3);
                const invalidUpdates = {
                    modelName: '   ', // whitespace only
                    beds: 11,
                    minRent: -100
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                    body: JSON.stringify(invalidUpdates),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await update(event);

                expect(result.statusCode).toBe(400);
                const response = JSON.parse(result.body as string);
                expect(response.error).toBe('Validation failed');
                expect(response.errors).toHaveProperty('modelName');
            });

            it('should validate all field types in update', async () => {
                expect.assertions(5);
                const invalidUpdates = {
                    modelID: 'invalid@id', // Should be rejected even though it won't be used
                    maxOccupants: 25,
                    deposit: -500,
                    minLeaseTerm: 0,
                    maxLeaseTerm: 40
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                    body: JSON.stringify(invalidUpdates),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await update(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors).toHaveProperty('modelID');
                expect(errors).toHaveProperty('maxOccupants');
                expect(errors).toHaveProperty('deposit');
                expect(errors).toHaveProperty('minLeaseTerm');
            });
        });

        describe('boundary value tests', () => {
            it('should accept beds at boundary values', async () => {
                expect.assertions(4);
                // Test beds = 0
                const validData0 = {
                    modelID: 'studio',
                    modelName: 'Studio',
                    buildingID: 'test-building-1',
                    beds: 0,
                    baths: 1
                };

                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...validData0, unitID: `MODEL#${validData0.modelID}` }));

                const event0 = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(validData0),
                    headers: { 'content-type': 'application/json' }
                });

                const result0 = await create(event0);
                expect(result0.statusCode).toBe(201);

                // Test beds = 10
                const validData10 = {
                    modelID: 'penthouse',
                    modelName: 'Penthouse',
                    buildingID: 'test-building-1',
                    beds: 10,
                    baths: 5
                };

                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...validData10, unitID: `MODEL#${validData10.modelID}` }));

                const event10 = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(validData10),
                    headers: { 'content-type': 'application/json' }
                });

                const result10 = await create(event10);
                expect(result10.statusCode).toBe(201);

                // Test beds = -1 (invalid)
                const invalidData = {
                    modelID: 'invalid',
                    modelName: 'Invalid',
                    buildingID: 'test-building-1',
                    beds: -1,
                    baths: 1
                };

                const eventInvalid = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const resultInvalid = await create(eventInvalid);
                expect(resultInvalid.statusCode).toBe(400);
                const errors = JSON.parse(resultInvalid.body as string).errors;
                expect(errors).toHaveProperty('beds');
            });

            it('should accept lease terms at boundary values', async () => {
                expect.assertions(3);
                // Test minLeaseTerm = 1, maxLeaseTerm = 36
                const validData = {
                    modelID: 'flex-lease',
                    modelName: 'Flexible Lease',
                    buildingID: 'test-building-1',
                    beds: 1,
                    baths: 1,
                    minLeaseTerm: 1,
                    maxLeaseTerm: 36
                };

                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...validData, unitID: `MODEL#${validData.modelID}` }));

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(validData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);
                expect(result.statusCode).toBe(201);
                const created = JSON.parse(result.body as string);
                expect(created.minLeaseTerm).toBe(1);
                expect(created.maxLeaseTerm).toBe(36);
            });

            it('should accept square footage at boundary values', async () => {
                expect.assertions(3);
                // Test minSqft = 0, maxSqft = 10000
                const validData = {
                    modelID: 'huge-unit',
                    modelName: 'Huge Unit',
                    buildingID: 'test-building-1',
                    beds: 5,
                    baths: 4,
                    minSqft: 0,
                    maxSqft: 10000
                };

                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...validData, unitID: `MODEL#${validData.modelID}` }));

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(validData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);
                expect(result.statusCode).toBe(201);
                const created = JSON.parse(result.body as string);
                expect(created.minSqft).toBe(0);
                expect(created.maxSqft).toBe(10000);
            });

            it('should accept maxOccupants at boundary values', async () => {
                expect.assertions(3);
                // Test maxOccupants = 1 and 20
                const validData1 = {
                    modelID: 'single',
                    modelName: 'Single Occupancy',
                    buildingID: 'test-building-1',
                    beds: 0,
                    baths: 1,
                    maxOccupants: 1
                };

                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...validData1, unitID: `MODEL#${validData1.modelID}` }));

                const event1 = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(validData1),
                    headers: { 'content-type': 'application/json' }
                });

                const result1 = await create(event1);
                expect(result1.statusCode).toBe(201);

                const validData20 = {
                    modelID: 'commune',
                    modelName: 'Commune Living',
                    buildingID: 'test-building-1',
                    beds: 10,
                    baths: 5,
                    maxOccupants: 20
                };

                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
                dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...validData20, unitID: `MODEL#${validData20.modelID}` }));

                const event20 = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(validData20),
                    headers: { 'content-type': 'application/json' }
                });

                const result20 = await create(event20);
                expect(result20.statusCode).toBe(201);
                const created20 = JSON.parse(result20.body as string);
                expect(created20.maxOccupants).toBe(20);
            });
        });
    });
});
