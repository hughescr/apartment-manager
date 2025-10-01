// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { dynamoDbMock, jest, resetAllMocks } from '../../data/test-setup';

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { find, isArray, omit } from 'lodash';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { validate } from '../../../api/validate-for-publish';
import { mockGetResponse, mockQueryResponse } from '../../helpers/mock-responses';
import { PropertyType } from '../../../src/types';

describe('Validate for Publish API Endpoint', () => {
    beforeAll(() => {
        resetAllMocks();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
        dynamoDbMock.mockReset();
        // Clear the default implementation to allow mockResolvedValueOnce to work
        dynamoDbMock.mockClear();
    });

    describe('Single Entity Validation', () => {
        it('should validate a single building successfully', async () => {
            const validBuilding = {
                buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
                buildingName:  'Test Building',
                street:        '123 Main St',
                city:          'Dallas',
                state:         'TX',
                zip:           '75001',
                latitude:      32.7767,
                longitude:     -96.7970,
                propertyType:  PropertyType.APARTMENT,
                structureType: 'Apartment',
                rentalType:    'Market Rate',
                contactInfo:   {
                    email: 'test@example.com',
                    phone: '555-123-4567'
                }
            };

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'building',
                    entityData: validBuilding
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);
            expect(response.success).toBe(true);
            expect(response.entityType).toBe('building');
            expect(response.validationResults.basic.success).toBe(true);
            expect(response.summary.canPublish).toBe(true);
            expect(response.summary.totalEntitiesValidated).toBe(1);
            expect(response.summary.entitiesWithErrors).toBe(0);
        });

        it('should validate a single unit type successfully', async () => {
            const validUnitType = {
                buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                modelID:    'model-1br',
                modelName:  '1 Bedroom',
                beds:       1,
                baths:      1,
                minSqft:    650,
                minRent:    1200
            };

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'unitType',
                    entityData: validUnitType
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);
            expect(response.success).toBe(true);
            expect(response.entityType).toBe('unitType');
            expect(response.validationResults.basic.success).toBe(true);
            expect(response.summary.canPublish).toBe(true);
        });

        it('should validate a single unit successfully', async () => {
            const validUnit = {
                buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
                unitID:        'unit-101',
                unitNumber:    '101',
                beds:          1,
                baths:         1,
                sqft:          700,
                rent:          1250,
                vacancyClass:  'Unoccupied',
                availableDate: '2024-01-01'
            };

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'unit',
                    entityData: validUnit
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);
            expect(response.success).toBe(true);
            expect(response.entityType).toBe('unit');
            expect(response.validationResults.basic.success).toBe(true);
            expect(response.summary.canPublish).toBe(true);
        });

        it('should return validation errors for invalid single entity', async () => {
            const invalidBuilding = {
                buildingID:   'gSPgoPTdFcPqdeCYMBZMzy',
                buildingName: 'Test Building'
                // Missing required MITS fields
            };

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'building',
                    entityData: invalidBuilding
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);
            expect(response.success).toBe(false);
            expect(response.validationResults.basic.success).toBe(false);
            expect(response.validationResults.basic.errors.length).toBeGreaterThan(0);
            expect(response.summary.canPublish).toBe(false);
            expect(response.summary.entitiesWithErrors).toBe(1);
        });

        it('should indicate site validation not supported for single entities', async () => {
            const validBuilding = {
                buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
                buildingName:  'Test Building',
                street:        '123 Main St',
                city:          'Dallas',
                state:         'TX',
                zip:           '75001',
                latitude:      32.7767,
                longitude:     -96.7970,
                propertyType:  PropertyType.APARTMENT,
                structureType: 'Apartment',
                rentalType:    'Market Rate',
                contactInfo:   {
                    email: 'test@example.com',
                    phone: '555-123-4567'
                }
            };

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType:            'building',
                    entityData:            validBuilding,
                    includeSiteValidation: true,
                    sites:                 ['apartments_com', 'zillow']
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);
            expect(response.validationResults.siteRequirements).toHaveLength(2);
            expect(response.validationResults.siteRequirements[0].canPublish).toBe(false);
            expect(response.validationResults.siteRequirements[0].errors[0].message).toContain('Site validation requires complete building data');
            expect(response.summary.canPublishToSites.apartments_com).toBe(false);
            expect(response.summary.canPublishToSites.zillow).toBe(false);
        });
    });

    describe('Batch Entity Validation', () => {
        it('should validate multiple entities of the same type', async () => {
            const validUnits = [
                {
                    buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
                    unitID:        'unit-101',
                    unitNumber:    '101',
                    beds:          1,
                    baths:         1,
                    sqft:          700,
                    rent:          1250,
                    vacancyClass:  'Unoccupied',
                    availableDate: '2024-01-01'
                },
                {
                    buildingID:   'gSPgoPTdFcPqdeCYMBZMzy',
                    unitID:       'unit-102',
                    unitNumber:   '102',
                    beds:         1,
                    baths:        1,
                    sqft:         720,
                    rent:         1300,
                    vacancyClass: 'Occupied'
                }
            ];

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'unit',
                    entities:   validUnits
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);
            expect(response.success).toBe(true);
            expect(response.entityType).toBe('unit');
            expect(response.entities).toBe(2);
            expect(response.validationResults).toHaveLength(2);
            expect(response.validationResults[0].success).toBe(true);
            expect(response.validationResults[1].success).toBe(true);
            expect(response.summary.totalEntitiesValidated).toBe(2);
            expect(response.summary.entitiesWithErrors).toBe(0);
            expect(response.summary.canPublish).toBe(true);
        });

        it('should handle mixed valid and invalid entities in batch', async () => {
            const mixedUnits = [
                {
                    buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
                    unitID:        'unit-101',
                    unitNumber:    '101',
                    beds:          1,
                    baths:         1,
                    sqft:          700,
                    rent:          1250,
                    vacancyClass:  'Unoccupied',
                    availableDate: '2024-01-01'
                },
                {
                    buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                    unitID:     'unit-102',
                    unitNumber: '102'
                    // Missing required fields
                }
            ];

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'unit',
                    entities:   mixedUnits
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);
            expect(response.success).toBe(false);
            expect(response.validationResults[0].success).toBe(true);
            expect(response.validationResults[1].success).toBe(false);
            expect(response.summary.entitiesWithErrors).toBe(1);
            expect(response.summary.totalErrors).toBeGreaterThan(0);
            expect(response.summary.canPublish).toBe(false);
        });

        it('should indicate site validation not supported for batch mode', async () => {
            const validUnits = [
                {
                    buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
                    unitID:        'unit-101',
                    unitNumber:    '101',
                    beds:          1,
                    baths:         1,
                    sqft:          700,
                    rent:          1250,
                    vacancyClass:  'Unoccupied',
                    availableDate: '2024-01-01'
                }
            ];

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType:            'unit',
                    entities:              validUnits,
                    includeSiteValidation: true,
                    sites:                 ['apartments_com']
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);
            expect(response.summary.canPublishToSites.apartments_com).toBe(false);
        });
    });

    describe('Complete Building Validation', () => {
        const completeBuilding = {
            buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
            unitID:        'BUILDING',  // This is for DynamoDB key, not validation
            buildingName:  'Test Building',
            street:        '123 Main St',
            city:          'Dallas',
            state:         'TX',
            zip:           '75001',
            latitude:      32.7767,
            longitude:     -96.7970,
            propertyType:  PropertyType.APARTMENT,
            structureType: 'Apartment',
            rentalType:    'Market Rate',
            contactInfo:   {
                email: 'test@example.com',
                phone: '555-123-4567'
            },
            photos: ['https://example.com/photo1.jpg']  // Required for Apartments.com
        };

        const completeUnitTypes = [
            {
                buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                unitID:     'MODEL#1br',  // This is for DynamoDB key, not validation
                modelID:    'model-1br',
                modelName:  '1 Bedroom',
                beds:       1,
                baths:      1,
                minSqft:    650,
                maxSqft:    750,
                minRent:    1200,
                maxRent:    1400
            }
        ];

        const completeUnits = [
            {
                buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
                unitID:        'UNIT#unit-101',  // Database format with UNIT# prefix for proper entity detection
                unitNumber:    '101',
                beds:          1,
                baths:         1,
                sqft:          700,
                rent:          1250,
                vacancyClass:  'Unoccupied',
                availableDate: '2024-01-01',
                _et:           'Unit'  // Explicitly set entity type for filtering
            }
        ];

        it('should validate complete building with all data', async () => {
            // Mock database responses
            const buildingResponse = mockGetResponse(completeBuilding);
            const unitTypesResponse = mockQueryResponse(completeUnitTypes);
            const unitsResponse = mockQueryResponse(completeUnits);

            // Clear mock call history to ensure clean state for this test
            jest.clearAllMocks();
            // Don't reset the mock - just clear call history

            // Set up mock responses with enough for parallel calls
            // Since the calls are parallel, we need to ensure units response is available
            dynamoDbMock
                .mockResolvedValue(buildingResponse)     // Default to building response
                .mockResolvedValueOnce(buildingResponse) // getBuilding
                .mockResolvedValueOnce(unitTypesResponse)// getUnitTypes
                .mockResolvedValueOnce(unitsResponse);   // getUnits

            // Additional setup to ensure units get through
            dynamoDbMock
                .mockResolvedValueOnce(unitsResponse)    // Extra units response
                .mockResolvedValueOnce(unitsResponse)    // More units responses
                .mockResolvedValueOnce(unitsResponse);

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'complete',
                    buildingID: 'gSPgoPTdFcPqdeCYMBZMzy'
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);

            expect(response.success).toBe(true);
            expect(response.buildingID).toBe('gSPgoPTdFcPqdeCYMBZMzy');
            expect(response.totalEntities).toBe(3); // building + 1 unit type + 1 unit
            expect(response.validationResults.building.success).toBe(true);
            expect(response.validationResults.unitTypes[0].success).toBe(true);
            expect(response.validationResults.units[0].success).toBe(true);
            expect(response.validationResults.complete.success).toBe(true);
            expect(response.summary.canPublish).toBe(true);
        });

        it('should validate complete building with site validation', async () => {
            // Mock database responses
            dynamoDbMock
                .mockResolvedValueOnce(mockGetResponse(completeBuilding))
                .mockResolvedValueOnce(mockQueryResponse(completeUnitTypes))
                .mockResolvedValueOnce(mockQueryResponse(completeUnits));

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType:            'complete',
                    buildingID:            'gSPgoPTdFcPqdeCYMBZMzy',
                    includeSiteValidation: true,
                    sites:                 ['apartments_com', 'zillow']
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);

            // Debug logging to see what's failing - use test framework reporting
            if(!response.summary.canPublishToSites.apartments_com) {
                throw new Error(`Apartments.com requirements not met: ${JSON.stringify(response.siteRequirements[0], null, 2)}`);
            }

            expect(response.success).toBe(true);
            expect(response.siteRequirements).toHaveLength(2);
            expect(response.siteRequirements[0].site).toBe('apartments_com');
            expect(response.siteRequirements[1].site).toBe('zillow');
            expect(response.summary.canPublishToSites.apartments_com).toBe(true);
            expect(response.summary.canPublishToSites.zillow).toBe(true);
        });

        it('should return 404 for non-existent building', async () => {
            // Mock database to return null (building not found) and empty arrays for unit types and units
            dynamoDbMock
                .mockResolvedValueOnce({}) // getBuilding returns no Item
                .mockResolvedValueOnce(mockQueryResponse([])) // getUnitTypes returns empty array
                .mockResolvedValueOnce(mockQueryResponse([])); // getUnits returns empty array

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'complete',
                    buildingID: '73q9vDtt8Kmj2Kp1kS79t7'
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(404);
            const response = JSON.parse(result.body!);
            expect(response.error).toBe('Building not found');
        });

        it('should identify missing MITS fields in complete validation', async () => {
            const incompleteBuilding = {
                buildingID:   'gSPgoPTdFcPqdeCYMBZMzy',
                unitID:       'BUILDING',
                buildingName: 'Test Building'
                // Missing required MITS fields
            };

            const incompleteUnits = [
                {
                    buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                    unitID:     'UNIT#101',
                    unitNumber: '101'
                    // Missing required fields
                }
            ];

            // Mock database responses with incomplete data
            dynamoDbMock
                .mockResolvedValueOnce(mockGetResponse(incompleteBuilding))
                .mockResolvedValueOnce(mockQueryResponse(completeUnitTypes))
                .mockResolvedValueOnce(mockQueryResponse(incompleteUnits));

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'complete',
                    buildingID: 'gSPgoPTdFcPqdeCYMBZMzy'
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);
            expect(response.success).toBe(false);
            expect(response.validationResults.building.success).toBe(false);
            expect(response.validationResults.units[0].success).toBe(false);
            expect(response.missingMITSFields.length).toBeGreaterThan(0);
            expect(response.summary.canPublish).toBe(false);
            expect(response.summary.entitiesWithErrors).toBeGreaterThan(0);
        });

        it('should handle apartments.com site requirements', async () => {
            const buildingWithoutPhotos = omit(completeBuilding, 'photos');
            // No photos field - will fail apartments.com requirement

            // Mock database responses
            dynamoDbMock
                .mockResolvedValueOnce(mockGetResponse(buildingWithoutPhotos))
                .mockResolvedValueOnce(mockQueryResponse(completeUnitTypes))
                .mockResolvedValueOnce(mockQueryResponse(completeUnits));

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType:            'complete',
                    buildingID:            'gSPgoPTdFcPqdeCYMBZMzy',
                    includeSiteValidation: true,
                    sites:                 ['apartments_com']
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);
            expect(response.siteRequirements[0].canPublish).toBe(false);
            expect(response.summary.canPublishToSites.apartments_com).toBe(false);

            const photoError = find(response.siteRequirements[0].errors, {
                field: 'building.photos'
            });
            expect(photoError?.message).toContain('At least one building photo is required for Apartments.com');
        });

        it('should handle zillow site requirements', async () => {
            const unitsWithoutRent = [
                {
                    buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
                    unitID:        'UNIT#101',
                    unitNumber:    '101',
                    beds:          1,
                    baths:         1,
                    sqft:          700,
                    rent:          0, // Invalid rent for Zillow
                    vacancyClass:  'Unoccupied',
                    availableDate: '2024-01-01'
                }
            ];

            // Mock database responses
            dynamoDbMock
                .mockResolvedValueOnce(mockGetResponse(completeBuilding))
                .mockResolvedValueOnce(mockQueryResponse(completeUnitTypes))
                .mockResolvedValueOnce(mockQueryResponse(unitsWithoutRent));

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType:            'complete',
                    buildingID:            'gSPgoPTdFcPqdeCYMBZMzy',
                    includeSiteValidation: true,
                    sites:                 ['zillow']
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body!);
            expect(response.siteRequirements[0].canPublish).toBe(false);
            expect(response.summary.canPublishToSites.zillow).toBe(false);

            const rentError = find(response.siteRequirements[0].errors, {
                field: 'units.0.rent'
            });
            expect(rentError?.message).toContain('Rent amount is required for all units on Zillow');
        });
    });

    describe('Request Validation and Error Handling', () => {
        it('should return 400 for invalid request body', async () => {
            const event: Partial<APIGatewayProxyEventV2> = {
                body: 'invalid json'
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body!);
            expect(response.error).toBe('Invalid request body');
        });

        it('should return 400 for missing entityType', async () => {
            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityData: { test: 'data' }
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body!);
            expect(response.error).toBe('Validation failed');
            expect(response.errors.entityType).toContain('entityType must be one of');
        });

        it('should return 400 for invalid entityType', async () => {
            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'invalidType'
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body!);
            expect(response.errors.entityType).toContain('entityType must be one of');
        });

        it('should return 400 for invalid buildingID format', async () => {
            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'complete',
                    buildingID: 'invalid id!'
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body!);
            expect(response.errors.buildingID).toContain('Invalid buildingID format');
        });

        it('should return 400 for missing required parameters', async () => {
            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'building'
                    // Missing entityData, entities, or buildingID
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body!);
            expect(response.error).toBe('Invalid request');
            expect(response.message).toContain('Must provide either entityData');
        });

        it('should handle database errors gracefully', async () => {
            dynamoDbMock.mockRejectedValueOnce(new Error('Database connection failed'));

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'complete',
                    buildingID: 'gSPgoPTdFcPqdeCYMBZMzy'
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(500);
            const response = JSON.parse(result.body!);
            expect(response.error).toBe('Internal server error during validation');
            expect(response.details).toBe('Database connection failed');
        });

        it('should handle null request body gracefully', async () => {
            const event: Partial<APIGatewayProxyEventV2> = {
                body: undefined
            };

            const result = await validate(event as APIGatewayProxyEventV2);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body!);
            expect(response.errors.entityType).toContain('entityType must be one of');
        });
    });

    describe('Response Format Validation', () => {
        it('should return proper response format for single entity validation', async () => {
            const validBuilding = {
                buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
                buildingName:  'Test Building',
                street:        '123 Main St',
                city:          'Dallas',
                state:         'TX',
                zip:           '75001',
                latitude:      32.7767,
                longitude:     -96.7970,
                propertyType:  PropertyType.APARTMENT,
                structureType: 'Apartment',
                rentalType:    'Market Rate',
                contactInfo:   {
                    email: 'test@example.com',
                    phone: '555-123-4567'
                }
            };

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'building',
                    entityData: validBuilding
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);
            const response = JSON.parse(result.body!);

            // Verify response structure
            expect(response).toHaveProperty('success');
            expect(response).toHaveProperty('entityType');
            expect(response).toHaveProperty('validationResults');
            expect(response).toHaveProperty('summary');
            expect(response.validationResults).toHaveProperty('basic');
            expect(response.summary).toHaveProperty('canSave');
            expect(response.summary).toHaveProperty('canPublish');
            expect(response.summary).toHaveProperty('canPublishToSites');
            expect(response.summary).toHaveProperty('totalEntitiesValidated');
            expect(response.summary).toHaveProperty('entitiesWithErrors');
            expect(response.summary).toHaveProperty('totalErrors');
        });

        it('should return proper response format for complete validation', async () => {
            const completeBuilding = {
                buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
                unitID:        'BUILDING',
                buildingName:  'Test Building',
                street:        '123 Main St',
                city:          'Dallas',
                state:         'TX',
                zip:           '75001',
                latitude:      32.7767,
                longitude:     -96.7970,
                propertyType:  PropertyType.APARTMENT,
                structureType: 'Apartment',
                rentalType:    'Market Rate',
                contactInfo:   {
                    email: 'test@example.com',
                    phone: '555-123-4567'
                }
            };

            dynamoDbMock
                .mockResolvedValueOnce(mockGetResponse(completeBuilding))
                .mockResolvedValueOnce(mockQueryResponse([]))
                .mockResolvedValueOnce(mockQueryResponse([]));

            const event: Partial<APIGatewayProxyEventV2> = {
                body: JSON.stringify({
                    entityType: 'complete',
                    buildingID: 'gSPgoPTdFcPqdeCYMBZMzy'
                })
            };

            const result = await validate(event as APIGatewayProxyEventV2);
            const response = JSON.parse(result.body!);

            // Verify complete validation response structure
            expect(response).toHaveProperty('success');
            expect(response).toHaveProperty('buildingID');
            expect(response).toHaveProperty('totalEntities');
            expect(response).toHaveProperty('validationResults');
            expect(response).toHaveProperty('missingMITSFields');
            expect(response).toHaveProperty('siteRequirements');
            expect(response).toHaveProperty('summary');
            expect(response.validationResults).toHaveProperty('building');
            expect(response.validationResults).toHaveProperty('unitTypes');
            expect(response.validationResults).toHaveProperty('units');
            expect(response.validationResults).toHaveProperty('complete');
            expect(isArray(response.missingMITSFields)).toBe(true);
            expect(isArray(response.siteRequirements)).toBe(true);
        });
    });
});
