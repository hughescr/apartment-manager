// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { mockSend, clearMocks } from '../data/test-setup';

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
        clearMocks();
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
            mockSend.mockResolvedValueOnce(mockScanResponse(mockDbData));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            const result = await list(event);

            expect(result.statusCode).toBe(200);
            // The data layer strips the unitID field
            expect(JSON.parse(result.body as string)).toEqual(unitTypes);
            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('should handle empty unit types list', async () => {
            expect.assertions(2);
            mockSend.mockResolvedValueOnce(mockScanResponse([]));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            const result = await list(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual([]);
        });

        it('should handle data layer errors', async () => {
            expect.assertions(1);
            mockSend.mockRejectedValueOnce(new Error('Database error'));

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
            mockSend.mockResolvedValueOnce(mockGetResponse({ ...testUnitType, unitID: `MODEL#${testUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await get(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(testUnitType);
            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('should return 404 for non-existent unit type', async () => {
            expect.assertions(2);
            mockSend.mockResolvedValueOnce(mockGetResponse(undefined));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'non-existent' }
            });

            const result = await get(event);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });

        it('should handle data layer errors', async () => {
            expect.assertions(1);
            mockSend.mockRejectedValueOnce(new Error('Database error'));

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
            mockSend.mockResolvedValueOnce(mockGetResponse(undefined));
            // Mock the create operation
            mockSend.mockResolvedValueOnce(mockPutResponse({ ...newUnitType, unitID: `MODEL#${newUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' },
                body: JSON.stringify(newUnitType),
                headers: { 'content-type': 'application/json' }
            });

            const result = await create(event);

            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body as string)).toEqual(newUnitType);
            expect(mockSend).toHaveBeenCalledTimes(2);
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
            mockSend.mockResolvedValueOnce(mockGetResponse({
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
            mockSend.mockResolvedValueOnce(mockUpdateResponse({ ...updatedUnitType, unitID: `MODEL#${testUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify(updates),
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(updatedUnitType);
            expect(mockSend).toHaveBeenCalledTimes(1);
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
            mockSend.mockResolvedValueOnce(mockUpdateResponse({ ...updatedItem, unitID: 'MODEL#non-existent' }));

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
            mockSend.mockResolvedValueOnce(mockUpdateResponse({
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
            mockSend.mockResolvedValueOnce(mockDeleteResponse());

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await del(event);

            expect(result.statusCode).toBe(204);
            expect(result.body).toBe('');
            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('should handle delete errors gracefully', async () => {
            expect.assertions(2);
            mockSend.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await del(event);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
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
                mockSend.mockResolvedValueOnce(mockGetResponse({
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

                mockSend.mockResolvedValueOnce(mockGetResponse(undefined));
                mockSend.mockResolvedValueOnce(mockPutResponse({ ...validData0, unitID: `MODEL#${validData0.modelID}` }));

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

                mockSend.mockResolvedValueOnce(mockGetResponse(undefined));
                mockSend.mockResolvedValueOnce(mockPutResponse({ ...validData10, unitID: `MODEL#${validData10.modelID}` }));

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

                mockSend.mockResolvedValueOnce(mockGetResponse(undefined));
                mockSend.mockResolvedValueOnce(mockPutResponse({ ...validData, unitID: `MODEL#${validData.modelID}` }));

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

                mockSend.mockResolvedValueOnce(mockGetResponse(undefined));
                mockSend.mockResolvedValueOnce(mockPutResponse({ ...validData, unitID: `MODEL#${validData.modelID}` }));

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

                mockSend.mockResolvedValueOnce(mockGetResponse(undefined));
                mockSend.mockResolvedValueOnce(mockPutResponse({ ...validData1, unitID: `MODEL#${validData1.modelID}` }));

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

                mockSend.mockResolvedValueOnce(mockGetResponse(undefined));
                mockSend.mockResolvedValueOnce(mockPutResponse({ ...validData20, unitID: `MODEL#${validData20.modelID}` }));

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
