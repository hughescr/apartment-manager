// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { resetAllMocks } from '../../data/test-setup';

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { filter, find, forEach, map, noop, omit, some } from 'lodash';
import {
    validateForSave,
    validateForPublish,
    getMissingMITSFields,
    canPublishToSite
} from '../../../api/validation/helpers';
import { PropertyType } from '../../../src/types';

describe('Validation Helper Functions', () => {
    beforeAll(() => {
        resetAllMocks();
    });

    beforeEach(() => {
        // Reset any mock state between tests
        noop();
    });

    describe('validateForSave - Draft Mode Validation', () => {
        it('should accept minimal building data for save', () => {
            const minimalBuilding = {
                buildingID:   'gSPgoPTdFcPqdeCYMBZMzy',
                buildingName: 'Test Building'
            };

            const result = validateForSave('building', minimalBuilding);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(minimalBuilding);
            expect(result.errors).toHaveLength(0);
        });

        it('should accept minimal unit type data for save', () => {
            const minimalUnitType = {
                buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                modelID:    'model-1br',
                modelName:  '1 Bedroom'
            };

            const result = validateForSave('unitType', minimalUnitType);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(minimalUnitType);
            expect(result.errors).toHaveLength(0);
        });

        it('should accept minimal unit data for save', () => {
            const minimalUnit = {
                buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                unitID:     'unit-101',
                unitNumber: '101'
            };

            const result = validateForSave('unit', minimalUnit);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(minimalUnit);
            expect(result.errors).toHaveLength(0);
        });

        it('should provide user-friendly errors for invalid data in draft mode', () => {
            const invalidBuilding = {
                buildingID:   'invalid id!', // Invalid format
                buildingName: 'Test Building'
            };

            const result = validateForSave('building', invalidBuilding);
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1); // Building ID format validation
            // Error should be for buildingID field
            expect(result.errors[0].field).toBe('buildingID');

            // Should contain building ID validation error
            const errorMessages = map(result.errors, 'message');
            expect(errorMessages).toEqual(expect.arrayContaining([
                expect.stringContaining('must be a valid building ID format')
            ]));

            // All errors should have draft context
            forEach(result.errors, (error) => {
                expect(error.context).toContain('Draft validation allows incomplete data');
            });
        });

        it('should handle invalid entity type', () => {
            const result = validateForSave('invalidType' as 'building' | 'unitType' | 'unit', {});
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].field).toBe('entityType');
            expect(result.errors[0].message).toBe('Unknown entity type: invalidType');
            expect(result.errors[0].code).toBe('INVALID_ENTITY_TYPE');
        });

        it('should allow partial data that would fail MITS validation', () => {
            const partialBuilding = {
                buildingID:   'gSPgoPTdFcPqdeCYMBZMzy',
                buildingName: 'Test Building',
                street:       '123 Main St'
                // Missing required MITS fields: city, state, zip, coordinates, contact, etc.
            };

            const result = validateForSave('building', partialBuilding);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(partialBuilding);
        });
    });

    describe('validateForPublish - MITS Compliance Validation', () => {
        const completeBuilding = {
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

        const completeUnitType = {
            buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
            modelID:    'model-1br',
            modelName:  '1 Bedroom',
            beds:       1,
            baths:      1,
            minSqft:    650,
            minRent:    1200
        };

        const completeUnit = {
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

        it('should accept complete valid building data for publish', () => {
            const result = validateForPublish('building', completeBuilding);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(completeBuilding);
            expect(result.errors).toHaveLength(0);
        });

        it('should accept complete valid unit type data for publish', () => {
            const result = validateForPublish('unitType', completeUnitType);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(completeUnitType);
            expect(result.errors).toHaveLength(0);
        });

        it('should accept complete valid unit data for publish', () => {
            const result = validateForPublish('unit', completeUnit);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(completeUnit);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject incomplete building data with MITS-specific errors', () => {
            const incompleteBuilding = {
                buildingID:   'gSPgoPTdFcPqdeCYMBZMzy',
                buildingName: 'Test Building'
                // Missing all MITS required fields
            };

            const result = validateForPublish('building', incompleteBuilding);
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);

            // Check for MITS context in error messages
            const hasStreetError = some(result.errors, {
                field: 'street'
            });
            expect(hasStreetError).toBe(true);
        });

        it('should reject incomplete unit type data with MITS-specific errors', () => {
            const incompleteUnitType = {
                buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                modelID:    'model-1br',
                modelName:  '1 Bedroom'
                // Missing beds, baths, sqft, rent
            };

            const result = validateForPublish('unitType', incompleteUnitType);
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);

            // Should fail due to missing required beds and baths info
            const hasBedsError = some(result.errors, { field: 'beds' });
            const hasBathsError = some(result.errors, { field: 'baths' });
            expect(hasBedsError || hasBathsError).toBe(true);
        });

        it('should reject incomplete unit data with MITS-specific errors', () => {
            const incompleteUnit = {
                buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                unitID:     'unit-101',
                unitNumber: '101'
                // Missing beds, baths, sqft, rent, vacancyClass
            };

            const result = validateForPublish('unit', incompleteUnit);
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);

            // Check for specific MITS requirements
            const hasBedsError = some(result.errors, {
                field: 'beds'
            });
            expect(hasBedsError).toBe(true);
        });

        it('should handle invalid entity type for publish validation', () => {
            const result = validateForPublish('invalidType' as 'building' | 'unitType' | 'unit', {});
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].field).toBe('entityType');
            expect(result.errors[0].message).toBe('Unknown entity type: invalidType');
        });
    });

    describe('getMissingMITSFields', () => {
        it('should return empty array for complete valid data', () => {
            const completeData = {
                building: {
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
                },
                unitTypes: [{
                    buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                    modelID:    'model-1br',
                    modelName:  '1 Bedroom',
                    beds:       1,
                    baths:      1,
                    minSqft:    650,
                    minRent:    1200
                }],
                units: [{
                    buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
                    unitID:        'unit-101',
                    unitNumber:    '101',
                    beds:          1,
                    baths:         1,
                    sqft:          700,
                    rent:          1250,
                    vacancyClass:  'Unoccupied',
                    availableDate: '2024-01-01'
                }]
            };

            const missingFields = getMissingMITSFields(completeData);
            expect(missingFields).toHaveLength(0);
        });

        it('should identify missing building fields with proper display names', () => {
            const incompleteData = {
                building: {
                    buildingID:   'gSPgoPTdFcPqdeCYMBZMzy',
                    buildingName: 'Test Building'
                    // Missing required fields
                },
                unitTypes: [],
                units:     []
            };

            const missingFields = getMissingMITSFields(incompleteData);
            expect(missingFields.length).toBeGreaterThan(0);

            // Check for specific missing fields
            const missingStreet = find(missingFields, { field: 'street', entityType: 'building' });
            const missingCity = find(missingFields, { field: 'city', entityType: 'building' });
            const missingState = find(missingFields, { field: 'state', entityType: 'building' });

            expect(missingStreet?.displayName).toBe('Street Address');
            expect(missingCity?.displayName).toBe('City');
            expect(missingState?.displayName).toBe('State');
            expect(missingStreet?.required).toBe(true);
        });

        it('should identify missing unit type fields with index information', () => {
            const incompleteData = {
                building: {
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
                },
                unitTypes: [{
                    buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                    modelID:    'model-1br',
                    modelName:  '1 Bedroom'
                    // Missing beds, baths, sqft, rent
                }],
                units: []
            };

            const missingFields = getMissingMITSFields(incompleteData);
            expect(missingFields.length).toBeGreaterThan(0);

            // Should have unit type fields with index information
            const unitTypeFields = filter(missingFields, { entityType: 'unitType' });
            expect(unitTypeFields.length).toBeGreaterThan(0);

            const bedsField = find(unitTypeFields, { field: 'beds' });
            expect(bedsField?.displayName).toContain('Unit Type #1');
        });

        it('should identify missing unit fields with index information', () => {
            const incompleteData = {
                building: {
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
                },
                unitTypes: [{
                    buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                    modelID:    'model-1br',
                    modelName:  '1 Bedroom',
                    beds:       1,
                    baths:      1,
                    minSqft:    650,
                    minRent:    1200
                }],
                units: [{
                    buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                    unitID:     'unit-101',
                    unitNumber: '101'
                    // Missing beds, baths, sqft, rent, vacancyClass
                }]
            };

            const missingFields = getMissingMITSFields(incompleteData);
            expect(missingFields.length).toBeGreaterThan(0);

            // Should have unit fields with index information
            const unitFields = filter(missingFields, { entityType: 'unit' });
            expect(unitFields.length).toBeGreaterThan(0);

            const rentField = find(unitFields, { field: 'rent' });
            expect(rentField?.displayName).toContain('Unit #1');
        });
    });

    describe('canPublishToSite', () => {
        const completeData = {
            building: {
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
                // Note: photos will be added dynamically in site-specific tests
            },
            unitTypes: [{
                buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                modelID:    'model-1br',
                modelName:  '1 Bedroom',
                beds:       1,
                baths:      1,
                minSqft:    650,
                maxSqft:    750,
                minRent:    1200,
                maxRent:    1400
            }],
            units: [{
                buildingID:    'gSPgoPTdFcPqdeCYMBZMzy',
                unitID:        'unit-101',  // Use simple format without special characters
                unitNumber:    '101',
                beds:          1,
                baths:         1,
                sqft:          700,
                rent:          1250,
                vacancyClass:  'Unoccupied',
                availableDate: '2024-01-01'
            }]
        };

        it('should allow publishing to apartments.com with photos', () => {
            // Add photos for apartments.com requirement
            const dataWithPhotos = {
                ...completeData,
                building: {
                    ...completeData.building,
                    photos: ['https://example.com/photo1.jpg']
                }
            };

            const result = canPublishToSite('apartments_com', dataWithPhotos);
            // Debug output for test failures - using test framework reporting
            if(result.errors.length > 0) {
                throw new Error(`Validation errors found: ${JSON.stringify(result.errors, null, 2)}`);
            }
            if(result.missingFields.length > 0) {
                throw new Error(`Missing required fields: ${JSON.stringify(result.missingFields, null, 2)}`);
            }
            expect(result.site).toBe('apartments_com');
            expect(result.canPublish).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.missingFields).toHaveLength(0);
        });

        it('should prevent publishing to apartments.com without photos', () => {
            const dataWithoutPhotos = {
                ...completeData,
                building: omit(completeData.building, 'photos')
            };

            const result = canPublishToSite('apartments_com', dataWithoutPhotos);
            expect(result.site).toBe('apartments_com');
            expect(result.canPublish).toBe(false);

            const photoError = find(result.errors, {
                field: 'building.photos'
            });
            expect(photoError?.message).toContain('At least one building photo is required for Apartments.com');
            expect(photoError?.context).toBe('Apartments.com site requirement');

            const photoMissing = find(result.missingFields, {
                field: 'building.photos'
            });
            expect(photoMissing?.displayName).toBe('Building Photos');
            expect(photoMissing?.required).toBe(true);
        });

        it('should allow publishing to zillow with rent information', () => {
            const result = canPublishToSite('zillow', completeData);
            expect(result.site).toBe('zillow');
            expect(result.canPublish).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.missingFields).toHaveLength(0);
        });

        it('should prevent publishing to zillow without rent information', () => {
            const dataWithoutRent = {
                ...completeData,
                units: [{
                    ...completeData.units[0],
                    rent: 0 // Invalid rent
                }]
            };

            const result = canPublishToSite('zillow', dataWithoutRent);
            expect(result.site).toBe('zillow');
            expect(result.canPublish).toBe(false);

            const rentError = find(result.errors, {
                field: 'units.0.rent'
            });
            expect(rentError?.message).toContain('Rent amount is required for all units on Zillow');
            expect(rentError?.context).toBe('Zillow site requirement');

            const rentMissing = find(result.missingFields, {
                field: 'units.0.rent'
            });
            expect(rentMissing?.displayName).toBe('Unit #1 Rent');
            expect(rentMissing?.required).toBe(true);
        });

        it('should prevent publishing when MITS validation fails', () => {
            const incompleteData = {
                building: {
                    buildingID:   'gSPgoPTdFcPqdeCYMBZMzy',
                    buildingName: 'Test Building'
                    // Missing required MITS fields
                },
                unitTypes: [],
                units:     []
            };

            const result = canPublishToSite('apartments_com', incompleteData);
            expect(result.canPublish).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);

            // Should have MITS compliance errors
            const mitsError = find(result.errors, {
                context: 'MITS 4.1 compliance requirement'
            });
            expect(mitsError).toBeDefined();
        });

        it('should handle multiple units with missing rent for zillow', () => {
            const dataWithMultipleUnits = {
                ...completeData,
                units: [
                    completeData.units[0], // Has rent
                    {
                        buildingID:   'gSPgoPTdFcPqdeCYMBZMzy',
                        unitID:       'unit-102',
                        unitNumber:   '102',
                        beds:         1,
                        baths:        1,
                        sqft:         700,
                        rent:         0, // Missing rent
                        vacancyClass: 'Unoccupied'
                    }
                ]
            };

            const result = canPublishToSite('zillow', dataWithMultipleUnits);
            expect(result.canPublish).toBe(false);

            const rentError = find(result.errors, {
                field: 'units.1.rent'
            });
            expect(rentError).toBeDefined();

            const rentMissing = find(result.missingFields, {
                field: 'units.1.rent'
            });
            expect(rentMissing?.displayName).toBe('Unit #2 Rent');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle null and undefined inputs gracefully', () => {
            expect(() => validateForSave('building', null)).not.toThrow();
            expect(() => validateForSave('building', undefined)).not.toThrow();
            expect(() => validateForPublish('building', null)).not.toThrow();
            expect(() => validateForPublish('building', undefined)).not.toThrow();
        });

        it('should handle empty data structures', () => {
            const emptyData = {
                building:  {},
                unitTypes: [],
                units:     []
            };

            const missingFields = getMissingMITSFields(emptyData);
            expect(missingFields.length).toBeGreaterThan(0);

            const apartmentsResult = canPublishToSite('apartments_com', emptyData);
            expect(apartmentsResult.canPublish).toBe(false);

            const zillowResult = canPublishToSite('zillow', emptyData);
            expect(zillowResult.canPublish).toBe(false);
        });

        it('should provide consistent error message formatting', () => {
            const invalidData = {
                buildingID:   'invalid id!',
                buildingName: ''
            };

            const saveResult = validateForSave('building', invalidData);
            const publishResult = validateForPublish('building', invalidData);

            // Both should have errors but with different contexts
            expect(saveResult.success).toBe(false);
            expect(publishResult.success).toBe(false);
            expect(saveResult.errors.length).toBeGreaterThan(0);
            expect(publishResult.errors.length).toBeGreaterThan(0);

            // Save errors should mention draft context
            const saveError = saveResult.errors[0];
            expect(saveError.context).toContain('Draft validation allows incomplete data');

            // Publish errors should mention MITS context
            const publishError = publishResult.errors[0];
            expect(publishError.context).toContain('MITS Requirement');
        });
    });
});
