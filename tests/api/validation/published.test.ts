// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { resetAllMocks } from '../../data/test-setup';

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import _ from 'lodash';
import {
    BuildingPublishedSchema,
    UnitTypePublishedSchema,
    UnitPublishedSchema,
    type BuildingPublishedInput,
    type UnitTypePublishedInput,
    type UnitPublishedInput,
    MITS_BUILDING_ERROR_MESSAGES
} from '../../../api/validation/published';
import { PropertyType } from '../../../src/types';

describe('Published Schema Validation - Strict MITS Compliance', () => {
    beforeAll(() => {
        resetAllMocks();
    });

    beforeEach(() => {
        // Reset any mock state between tests
        _.noop();
    });

    describe('BuildingPublishedSchema - MITS Requirements', () => {
        const completeValidBuilding: BuildingPublishedInput = {
            buildingID: 'test-building-1',
            buildingName: 'Test Building',
            street: '123 Main St',
            city: 'Dallas',
            state: 'TX',
            zip: '75001',
            latitude: 32.7767,
            longitude: -96.7970,
            propertyType: PropertyType.APARTMENT,
            structureType: 'Apartment',
            rentalType: 'Market Rate',
            contactInfo: {
                email: 'leasing@testbuilding.com',
                phone: '555-123-4567'
            }
        };

        it('should accept complete valid MITS building data', () => {
            const result = BuildingPublishedSchema.safeParse(completeValidBuilding);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.buildingID).toBe('test-building-1');
                expect(result.data.buildingName).toBe('Test Building');
                expect(result.data.propertyType).toBe(PropertyType.APARTMENT);
            }
        });

        it('should require buildingID for MITS Property_ID identification', () => {
            const missingBuildingId = _.omit(completeValidBuilding, 'buildingID');
            const result = BuildingPublishedSchema.safeParse(missingBuildingId);
            expect(result.success).toBe(false);
            if(!result.success) {
                const error = _.find(result.error.issues, issue => issue.path.includes('buildingID'));
                expect(error?.message).toContain('Building ID is required for MITS Property_ID identification');
            }
        });

        it('should require buildingName for MITS MarketingName element', () => {
            const missingName = _.omit(completeValidBuilding, 'buildingName');
            const result = BuildingPublishedSchema.safeParse(missingName);
            expect(result.success).toBe(false);
            if(!result.success) {
                const error = _.find(result.error.issues, issue => issue.path.includes('buildingName'));
                expect(error?.message).toContain('Building name is required for MITS MarketingName element');
            }
        });

        it('should require complete address for MITS Address element', () => {
            const missingAddress = _.omit(completeValidBuilding, ['street', 'city', 'state', 'zip']);
            const result = BuildingPublishedSchema.safeParse(missingAddress);
            expect(result.success).toBe(false);
            if(!result.success) {
                const streetError = _.find(result.error.issues, issue => issue.path.includes('street'));
                const cityError = _.find(result.error.issues, issue => issue.path.includes('city'));
                const stateError = _.find(result.error.issues, issue => issue.path.includes('state'));
                const zipError = _.find(result.error.issues, issue => issue.path.includes('zip'));

                expect(streetError?.message).toContain('Street address is required for MITS Address element');
                expect(cityError?.message).toContain('City is required for MITS Address element');
                expect(stateError?.message).toContain('State is required for MITS Address element');
                expect(zipError?.message).toContain('ZIP code must be 5 digits or 5+4 format');
            }
        });

        it('should require coordinates for MITS Location element', () => {
            const missingCoords = _.omit(completeValidBuilding, ['latitude', 'longitude']);
            const result = BuildingPublishedSchema.safeParse(missingCoords);
            expect(result.success).toBe(false);
            if(!result.success) {
                const latError = _.find(result.error.issues, issue => issue.path.includes('latitude'));
                const lngError = _.find(result.error.issues, issue => issue.path.includes('longitude'));

                expect(latError?.message).toContain('Latitude must be between -90 and 90 degrees for MITS Location element');
                expect(lngError?.message).toContain('Longitude must be between -180 and 180 degrees for MITS Location element');
            }
        });

        it('should require property classification fields for MITS compliance', () => {
            const missingClassification = _.omit(completeValidBuilding, ['propertyType', 'structureType', 'rentalType']);
            const result = BuildingPublishedSchema.safeParse(missingClassification);
            expect(result.success).toBe(false);
            if(!result.success) {
                const propertyTypeError = _.find(result.error.issues, issue => issue.path.includes('propertyType'));
                const structureTypeError = _.find(result.error.issues, issue => issue.path.includes('structureType'));
                const rentalTypeError = _.find(result.error.issues, issue => issue.path.includes('rentalType'));

                expect(propertyTypeError?.message).toContain('Property type is required for MITS Information.PropertyType classification');
                expect(structureTypeError?.message).toContain('Structure type is required for MITS Information.StructureType element');
                expect(rentalTypeError?.message).toContain('Rental type is required for MITS ILS_Identification.RentalType element');
            }
        });

        it('should require both email and phone in contactInfo for MITS Information elements', () => {
            const missingContact = _.omit(completeValidBuilding, 'contactInfo');
            const result = BuildingPublishedSchema.safeParse(missingContact);
            expect(result.success).toBe(false);
            if(!result.success) {
                const contactError = _.find(result.error.issues, issue => issue.path.includes('contactInfo'));
                expect(contactError?.message).toContain('Both email and phone are required in contactInfo for MITS');
            }
        });

        it('should validate state format requirements', () => {
            const invalidState = { ...completeValidBuilding, state: 'Texas' }; // Should be 'TX'
            const result = BuildingPublishedSchema.safeParse(invalidState);
            expect(result.success).toBe(false);
            if(!result.success) {
                const stateError = _.find(result.error.issues, issue => issue.path.includes('state'));
                expect(stateError?.message).toContain('State must be 2 uppercase letters for MITS compliance');
            }
        });

        it('should validate coordinate ranges and reject invalid values', () => {
            const invalidCoords = {
                ...completeValidBuilding,
                latitude: 0, // Will fail refinement check
                longitude: 0 // Will fail refinement check
            };
            const result = BuildingPublishedSchema.safeParse(invalidCoords);
            expect(result.success).toBe(false);
            if(!result.success) {
                const coordError = _.find(result.error.issues, issue => issue.path.includes('coordinates'));
                expect(coordError?.message).toContain('Building coordinates appear to be invalid');
            }
        });

        it('should validate email format in contactInfo', () => {
            const invalidEmail = {
                ...completeValidBuilding,
                contactInfo: {
                    email: 'invalid-email',
                    phone: '555-123-4567'
                }
            };
            const result = BuildingPublishedSchema.safeParse(invalidEmail);
            expect(result.success).toBe(false);
            if(!result.success) {
                const emailError = _.find(result.error.issues, issue => issue.path.includes('email'));
                expect(emailError?.message).toContain('Valid email address is required for MITS compliance');
            }
        });

        it('should validate phone number format and length', () => {
            const invalidPhone = {
                ...completeValidBuilding,
                contactInfo: {
                    email: 'test@example.com',
                    phone: '123' // Too short
                }
            };
            const result = BuildingPublishedSchema.safeParse(invalidPhone);
            expect(result.success).toBe(false);
            if(!result.success) {
                const phoneError = _.find(result.error.issues, issue => issue.path.includes('phone'));
                expect(phoneError?.message).toContain('Phone number must contain at least 10 digits for MITS compliance');
            }
        });
    });

    describe('UnitTypePublishedSchema - MITS Floorplan Requirements', () => {
        const completeValidUnitType: UnitTypePublishedInput = {
            buildingID: 'test-building-1',
            modelID: 'model-1br',
            modelName: '1 Bedroom Apartment',
            beds: 1,
            baths: 1,
            minSqft: 650,
            maxSqft: 750,
            minRent: 1200,
            maxRent: 1400
        };

        it('should accept complete valid MITS unit type data', () => {
            const result = UnitTypePublishedSchema.safeParse(completeValidUnitType);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.modelID).toBe('model-1br');
                expect(result.data.beds).toBe(1);
                expect(result.data.baths).toBe(1);
            }
        });

        it('should require modelID for MITS Floorplan.Identification.FloorplanID', () => {
            const missingModelId = _.omit(completeValidUnitType, 'modelID');
            const result = UnitTypePublishedSchema.safeParse(missingModelId);
            expect(result.success).toBe(false);
            if(!result.success) {
                const error = _.find(result.error.issues, issue => issue.path.includes('modelID'));
                expect(error?.message).toContain('Model ID is required for MITS Floorplan.Identification.FloorplanID');
            }
        });

        it('should require modelName for MITS Floorplan.Identification.Name element', () => {
            const missingName = _.omit(completeValidUnitType, 'modelName');
            const result = UnitTypePublishedSchema.safeParse(missingName);
            expect(result.success).toBe(false);
            if(!result.success) {
                const error = _.find(result.error.issues, issue => issue.path.includes('modelName'));
                expect(error?.message).toContain('Model name is required for MITS Floorplan.Identification.Name element');
            }
        });

        it('should require beds and baths for MITS Room elements', () => {
            const missingRooms = _.omit(completeValidUnitType, ['beds', 'baths']);
            const result = UnitTypePublishedSchema.safeParse(missingRooms);
            expect(result.success).toBe(false);
            if(!result.success) {
                const bedsError = _.find(result.error.issues, issue => issue.path.includes('beds'));
                const bathsError = _.find(result.error.issues, issue => issue.path.includes('baths'));

                expect(bedsError?.message).toContain('Number of bedrooms cannot be negative');
                expect(bathsError?.message).toContain('Number of bathrooms cannot be negative for MITS Room element');
            }
        });

        it('should require at least one square footage value for MITS SquareFeet element', () => {
            const noSqft = _.omit(completeValidUnitType, ['minSqft', 'maxSqft']);
            const result = UnitTypePublishedSchema.safeParse(noSqft);
            expect(result.success).toBe(false);
            if(!result.success) {
                const sqftError = _.find(result.error.issues, issue => issue.path.includes('sqft'));
                expect(sqftError?.message).toContain('At least one square footage value (minSqft or maxSqft) is required for MITS Floorplan.SquareFeet element');
            }
        });

        it('should require at least one rent value for MITS MarketRent element', () => {
            const noRent = _.omit(completeValidUnitType, ['minRent', 'maxRent']);
            const result = UnitTypePublishedSchema.safeParse(noRent);
            expect(result.success).toBe(false);
            if(!result.success) {
                const rentError = _.find(result.error.issues, issue => issue.path.includes('rent'));
                expect(rentError?.message).toContain('At least one rent value (minRent or maxRent) is required for MITS Floorplan.MarketRent element');
            }
        });

        it('should validate cross-field constraints for square footage', () => {
            const invalidSqft = {
                ...completeValidUnitType,
                minSqft: 800,
                maxSqft: 600 // min > max - should fail
            };
            const result = UnitTypePublishedSchema.safeParse(invalidSqft);
            expect(result.success).toBe(false);
            if(!result.success) {
                const sqftError = _.find(result.error.issues, issue =>
                    issue.path.includes('maxSqft') && issue.message.includes('Minimum square footage cannot be greater than maximum square footage')
                );
                expect(sqftError).toBeDefined();
            }
        });

        it('should validate cross-field constraints for rent', () => {
            const invalidRent = {
                ...completeValidUnitType,
                minRent: 1500,
                maxRent: 1200 // min > max - should fail
            };
            const result = UnitTypePublishedSchema.safeParse(invalidRent);
            expect(result.success).toBe(false);
            if(!result.success) {
                const rentError = _.find(result.error.issues, issue =>
                    issue.path.includes('maxRent') && issue.message.includes('Minimum rent cannot be greater than maximum rent')
                );
                expect(rentError).toBeDefined();
            }
        });

        it('should validate bathroom increments for MITS compliance', () => {
            const invalidBaths = {
                ...completeValidUnitType,
                baths: 1.3 // Invalid - not 0.5 increment
            };
            const result = UnitTypePublishedSchema.safeParse(invalidBaths);
            expect(result.success).toBe(false);
            if(!result.success) {
                const bathsError = _.find(result.error.issues, issue =>
                    issue.path.includes('baths') && issue.message.includes('Number of bathrooms must be in 0.5 increments')
                );
                expect(bathsError).toBeDefined();
            }
        });

        it('should accept valid bathroom increments', () => {
            const validBaths = [0, 0.5, 1, 1.5, 2, 2.5, 3];
            for(const bathCount of validBaths) {
                const validData = { ...completeValidUnitType, baths: bathCount };
                const result = UnitTypePublishedSchema.safeParse(validData);
                expect(result.success).toBe(true);
            }
        });

        it('should allow single square footage value', () => {
            const onlyMinSqft = _.omit(completeValidUnitType, 'maxSqft');
            const result = UnitTypePublishedSchema.safeParse(onlyMinSqft);
            expect(result.success).toBe(true);

            const onlyMaxSqft = _.omit(completeValidUnitType, 'minSqft');
            const result2 = UnitTypePublishedSchema.safeParse(onlyMaxSqft);
            expect(result2.success).toBe(true);
        });

        it('should allow single rent value', () => {
            const onlyMinRent = _.omit(completeValidUnitType, 'maxRent');
            const result = UnitTypePublishedSchema.safeParse(onlyMinRent);
            expect(result.success).toBe(true);

            const onlyMaxRent = _.omit(completeValidUnitType, 'minRent');
            const result2 = UnitTypePublishedSchema.safeParse(onlyMaxRent);
            expect(result2.success).toBe(true);
        });
    });

    describe('UnitPublishedSchema - MITS ILS_Unit Requirements', () => {
        const completeValidUnit: UnitPublishedInput = {
            buildingID: 'test-building-1',
            unitID: 'unit-101',
            unitNumber: '101',
            beds: 1,
            baths: 1,
            sqft: 700,
            rent: 1250,
            vacancyClass: 'Unoccupied'
        };

        it('should accept complete valid MITS unit data', () => {
            const result = UnitPublishedSchema.safeParse(completeValidUnit);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.unitID).toBe('unit-101');
                expect(result.data.unitNumber).toBe('101');
                expect(result.data.vacancyClass).toBe('Unoccupied');
            }
        });

        it('should require unitID for MITS ILS_Unit.Unit identification', () => {
            const missingUnitId = _.omit(completeValidUnit, 'unitID');
            const result = UnitPublishedSchema.safeParse(missingUnitId);
            expect(result.success).toBe(false);
            if(!result.success) {
                const error = _.find(result.error.issues, issue => issue.path.includes('unitID'));
                expect(error?.message).toContain('Unit ID is required for MITS ILS_Unit.Unit identification');
            }
        });

        it('should require unitNumber for MITS ILS_Unit.UnitID element', () => {
            const missingNumber = _.omit(completeValidUnit, 'unitNumber');
            const result = UnitPublishedSchema.safeParse(missingNumber);
            expect(result.success).toBe(false);
            if(!result.success) {
                const error = _.find(result.error.issues, issue => issue.path.includes('unitNumber'));
                expect(error?.message).toContain('Unit number is required for MITS ILS_Unit.UnitID element');
            }
        });

        it('should require beds, baths, sqft for MITS Room and SquareFeet elements', () => {
            const missingRequired = _.omit(completeValidUnit, ['beds', 'baths', 'sqft']);
            const result = UnitPublishedSchema.safeParse(missingRequired);
            expect(result.success).toBe(false);
            if(!result.success) {
                const bedsError = _.find(result.error.issues, issue => issue.path.includes('beds'));
                const bathsError = _.find(result.error.issues, issue => issue.path.includes('baths'));
                const sqftError = _.find(result.error.issues, issue => issue.path.includes('sqft'));

                expect(bedsError?.message).toContain('Number of bedrooms is required for MITS ILS_Unit.Room element');
                expect(bathsError?.message).toContain('Number of bathrooms is required for MITS ILS_Unit.Room element');
                expect(sqftError?.message).toContain('Square footage is required for MITS ILS_Unit.SquareFeet element');
            }
        });

        it('should require rent for MITS ILS_Unit.MarketRent element', () => {
            const missingRent = _.omit(completeValidUnit, 'rent');
            const result = UnitPublishedSchema.safeParse(missingRent);
            expect(result.success).toBe(false);
            if(!result.success) {
                const error = _.find(result.error.issues, issue => issue.path.includes('rent'));
                expect(error?.message).toContain('Rent is required for MITS ILS_Unit.MarketRent element');
            }
        });

        it('should require vacancyClass for MITS ILS_Unit.VacancyClass element', () => {
            const missingVacancy = _.omit(completeValidUnit, 'vacancyClass');
            const result = UnitPublishedSchema.safeParse(missingVacancy);
            expect(result.success).toBe(false);
            if(!result.success) {
                const error = _.find(result.error.issues, issue => issue.path.includes('vacancyClass'));
                expect(error?.message).toContain('Vacancy class is required for MITS ILS_Unit.VacancyClass element');
            }
        });

        it('should validate vacancy class values', () => {
            const validVacancyClasses = ['Occupied', 'Unoccupied', 'Notice', 'Down'];
            for(const vacancyClass of validVacancyClasses) {
                const validData = { ...completeValidUnit, vacancyClass };
                const result = UnitPublishedSchema.safeParse(validData);
                expect(result.success).toBe(true);
            }

            const invalidVacancy = { ...completeValidUnit, vacancyClass: 'Invalid Status' };
            const result = UnitPublishedSchema.safeParse(invalidVacancy);
            expect(result.success).toBe(false);
        });

        it('should validate bathroom increments for MITS compliance', () => {
            const invalidBaths = {
                ...completeValidUnit,
                baths: 1.3 // Invalid - not 0.5 increment
            };
            const result = UnitPublishedSchema.safeParse(invalidBaths);
            expect(result.success).toBe(false);
            if(!result.success) {
                const bathsError = _.find(result.error.issues, issue =>
                    issue.path.includes('baths') && issue.message.includes('Number of bathrooms must be in 0.5 increments')
                );
                expect(bathsError).toBeDefined();
            }
        });

        it('should validate reasonable value ranges', () => {
            const extremeValues = {
                ...completeValidUnit,
                beds: 15, // Too many
                baths: 20, // Too many
                sqft: 50000, // Too large
                rent: 100000 // Too high
            };
            const result = UnitPublishedSchema.safeParse(extremeValues);
            expect(result.success).toBe(false);
            if(!result.success) {
                const bedsError = _.find(result.error.issues, issue =>
                    issue.path.includes('beds') && issue.message.includes('Number of bedrooms must be 10 or less')
                );
                const bathsError = _.find(result.error.issues, issue =>
                    issue.path.includes('baths') && issue.message.includes('Number of bathrooms must be 10 or less')
                );
                expect(bedsError).toBeDefined();
                expect(bathsError).toBeDefined();
            }
        });

        it('should accept optional fields when provided', () => {
            const withOptionalFields = {
                ...completeValidUnit,
                modelID: 'model-1br',
                availableDate: '2024-01-01',
                maxOccupants: 2,
                deposit: 1250,
                leaseLength: 12
            };
            const result = UnitPublishedSchema.safeParse(withOptionalFields);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.modelID).toBe('model-1br');
                expect(result.data.availableDate).toBe('2024-01-01');
            }
        });
    });

    describe('MITS Error Messages and Context', () => {
        it('should provide MITS-specific error messages', () => {
            expect(MITS_BUILDING_ERROR_MESSAGES.MISSING_REQUIRED_FIELD).toContain('MITS 4.1 compliance');
            expect(MITS_BUILDING_ERROR_MESSAGES.INVALID_COORDINATES).toContain('MITS requires accurate latitude/longitude');
            expect(MITS_BUILDING_ERROR_MESSAGES.INVALID_ADDRESS).toContain('MITS Address element');
            expect(MITS_BUILDING_ERROR_MESSAGES.INVALID_CONTACT).toContain('MITS requires both email and phone number');
        });

        it('should enforce strict mode to prevent additional properties', () => {
            const buildingWithExtraFields = {
                buildingID: 'test-building-1',
                buildingName: 'Test Building',
                street: '123 Main St',
                city: 'Dallas',
                state: 'TX',
                zip: '75001',
                latitude: 32.7767,
                longitude: -96.7970,
                propertyType: PropertyType.APARTMENT,
                structureType: 'Apartment',
                rentalType: 'Market Rate',
                contactInfo: {
                    email: 'test@example.com',
                    phone: '555-123-4567'
                },
                // Extra field not in schema
                extraField: 'should be rejected'
            };

            const result = BuildingPublishedSchema.safeParse(buildingWithExtraFields);
            expect(result.success).toBe(false);
            if(!result.success) {
                const extraFieldError = _.find(result.error.issues, { code: 'unrecognized_keys' });
                expect(extraFieldError).toBeDefined();
            }
        });
    });

    describe('Cross-Schema MITS Compliance', () => {
        it('should enforce consistent ID format requirements across all schemas', () => {
            const invalidId = 'invalid id!';

            // Building ID validation
            const buildingData = {
                buildingID: invalidId,
                buildingName: 'Test Building',
                street: '123 Main St',
                city: 'Dallas',
                state: 'TX',
                zip: '75001',
                latitude: 32.7767,
                longitude: -96.7970,
                propertyType: PropertyType.APARTMENT,
                structureType: 'Apartment',
                rentalType: 'Market Rate',
                contactInfo: { email: 'test@example.com', phone: '555-123-4567' }
            };
            expect(BuildingPublishedSchema.safeParse(buildingData).success).toBe(false);

            // UnitType ID validation
            const unitTypeData = {
                buildingID: invalidId,
                modelID: invalidId,
                modelName: 'Test Model',
                beds: 1,
                baths: 1,
                minSqft: 650,
                minRent: 1200
            };
            expect(UnitTypePublishedSchema.safeParse(unitTypeData).success).toBe(false);

            // Unit ID validation
            const unitData = {
                buildingID: invalidId,
                unitID: invalidId,
                unitNumber: '101',
                beds: 1,
                baths: 1,
                sqft: 700,
                rent: 1250,
                vacancyClass: 'Unoccupied'
            };
            expect(UnitPublishedSchema.safeParse(unitData).success).toBe(false);
        });

        it('should require MITS-compliant room count consistency', () => {
            // Both unit type and unit should have consistent bed/bath requirements
            const unitTypeWithRooms = {
                buildingID: 'test-building',
                modelID: 'model-1br',
                modelName: '1 Bedroom',
                beds: 1,
                baths: 1.5,
                minSqft: 650,
                minRent: 1200
            };
            expect(UnitTypePublishedSchema.safeParse(unitTypeWithRooms).success).toBe(true);

            const unitWithRooms = {
                buildingID: 'test-building',
                unitID: 'unit-101',
                unitNumber: '101',
                beds: 1,
                baths: 1.5,
                sqft: 700,
                rent: 1250,
                vacancyClass: 'Unoccupied'
            };
            expect(UnitPublishedSchema.safeParse(unitWithRooms).success).toBe(true);
        });
    });
});
