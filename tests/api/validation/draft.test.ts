// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { resetAllMocks } from '../../data/test-setup';

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { find, noop } from 'lodash';
import {
    BuildingDraftSchema,
    UnitTypeDraftSchema,
    UnitDraftSchema,
    type BuildingDraftInput,
    type UnitTypeDraftInput
} from '../../../api/validation/draft';
import { PropertyType } from '../../../src/types';

describe('Draft Schema Validation - Permissive for Work-in-Progress', () => {
    beforeAll(() => {
        resetAllMocks();
    });

    beforeEach(() => {
        // Reset any mock state between tests
        noop();
    });

    describe('BuildingDraftSchema', () => {
        const minimalBuildingData = {
            buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
            buildingName: 'Test Building'
        };

        it('should accept minimal data with only required fields', () => {
            const result = BuildingDraftSchema.safeParse(minimalBuildingData);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.buildingID).toBe('gSPgoPTdFcPqdeCYMBZMzy');
                expect(result.data.buildingName).toBe('Test Building');
            }
        });

        it('should allow all optional fields to be omitted', () => {
            const result = BuildingDraftSchema.safeParse(minimalBuildingData);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.street).toBeUndefined();
                expect(result.data.city).toBeUndefined();
                expect(result.data.state).toBeUndefined();
                expect(result.data.zip).toBeUndefined();
                expect(result.data.latitude).toBeUndefined();
                expect(result.data.longitude).toBeUndefined();
                expect(result.data.propertyType).toBeUndefined();
            }
        });

        it('should accept partial address information', () => {
            const partialData = {
                ...minimalBuildingData,
                street: '123 Main St',
                // Missing city, state, zip - should still be valid in draft
            };

            const result = BuildingDraftSchema.safeParse(partialData);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.street).toBe('123 Main St');
            }
        });

        it('should validate buildingID format requirements', () => {
            const invalidData = {
                ...minimalBuildingData,
                buildingID: 'invalid id with spaces!'
            };

            const result = BuildingDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const idError = find(result.error.issues, issue => issue.path.includes('buildingID'));
                expect(idError?.message).toContain('must be a valid building ID format');
            }
        });

        it('should require buildingName to be non-empty', () => {
            const invalidData = {
                buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                buildingName: ''
            };

            const result = BuildingDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const nameError = find(result.error.issues, issue => issue.path.includes('buildingName'));
                expect(nameError?.message).toContain('buildingName is required');
            }
        });

        it('should accept valid optional fields when provided', () => {
            const completeData: BuildingDraftInput = {
                ...minimalBuildingData,
                street: '123 Main St',
                city: 'Testville',
                state: 'TX',
                zip: '75001',
                latitude: 32.7767,
                longitude: -96.7970,
                propertyType: PropertyType.APARTMENT,
                applicationFee: 100,
                numberStories: 3,
                leaseLength: 12,
                contactInfo: {
                    email: 'test@example.com',
                    phone: '555-123-4567'
                },
                acceptsOnlineApplications: true
            };

            const result = BuildingDraftSchema.safeParse(completeData);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.street).toBe('123 Main St');
                expect(result.data.propertyType).toBe(PropertyType.APARTMENT);
                expect(result.data.contactInfo?.email).toBe('test@example.com');
            }
        });

        it('should validate email format when contactInfo is provided', () => {
            const invalidData = {
                ...minimalBuildingData,
                contactInfo: {
                    email: 'invalid-email'
                }
            };

            const result = BuildingDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const emailError = find(result.error.issues, issue => issue.path.includes('email'));
                expect(emailError?.message).toContain('Invalid email address format');
            }
        });

        it('should validate zip code format when provided', () => {
            const invalidData = {
                ...minimalBuildingData,
                zip: 'invalid-zip'
            };

            const result = BuildingDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const zipError = find(result.error.issues, issue => issue.path.includes('zip'));
                expect(zipError?.message).toContain('ZIP code must be in format 12345 or 12345-6789');
            }
        });

        it('should validate coordinate ranges when provided', () => {
            const invalidData = {
                ...minimalBuildingData,
                latitude: 91, // Invalid - outside valid range
                longitude: -181 // Invalid - outside valid range
            };

            const result = BuildingDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const latError = find(result.error.issues, issue => issue.path.includes('latitude'));
                const lngError = find(result.error.issues, issue => issue.path.includes('longitude'));
                expect(latError?.message).toContain('Latitude must be between -90 and 90');
                expect(lngError?.message).toContain('Longitude must be between -180 and 180');
            }
        });
    });

    describe('UnitTypeDraftSchema', () => {
        const minimalUnitTypeData = {
            buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
            modelID: 'model-1br',
            modelName: '1 Bedroom Apartment'
        };

        it('should accept minimal data with only required fields', () => {
            const result = UnitTypeDraftSchema.safeParse(minimalUnitTypeData);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.buildingID).toBe('gSPgoPTdFcPqdeCYMBZMzy');
                expect(result.data.modelID).toBe('model-1br');
                expect(result.data.modelName).toBe('1 Bedroom Apartment');
            }
        });

        it('should allow all optional fields to be omitted', () => {
            const result = UnitTypeDraftSchema.safeParse(minimalUnitTypeData);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.beds).toBeUndefined();
                expect(result.data.baths).toBeUndefined();
                expect(result.data.minRent).toBeUndefined();
                expect(result.data.maxRent).toBeUndefined();
                expect(result.data.minSqft).toBeUndefined();
                expect(result.data.maxSqft).toBeUndefined();
            }
        });

        it('should validate ID format requirements', () => {
            const invalidData = {
                ...minimalUnitTypeData,
                buildingID: 'invalid id!',
                modelID: 'bad model id!'
            };

            const result = UnitTypeDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const buildingIdError = find(result.error.issues, issue => issue.path.includes('buildingID'));
                const modelIdError = find(result.error.issues, issue => issue.path.includes('modelID'));
                expect(buildingIdError?.message).toContain('must be a valid building ID format');
                expect(modelIdError?.message).toContain('can only contain letters, numbers, underscores, and hyphens');
            }
        });

        it('should accept valid optional fields when provided', () => {
            const completeData: UnitTypeDraftInput = {
                ...minimalUnitTypeData,
                beds: 1,
                baths: 1.5,
                minRent: 1200,
                maxRent: 1400,
                minSqft: 650,
                maxSqft: 750,
                countAvailable: 3,
                maxOccupants: 2,
                deposit: 1200,
                minLeaseTerm: 6,
                maxLeaseTerm: 12
            };

            const result = UnitTypeDraftSchema.safeParse(completeData);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.beds).toBe(1);
                expect(result.data.baths).toBe(1.5);
                expect(result.data.minRent).toBe(1200);
                expect(result.data.maxRent).toBe(1400);
            }
        });

        it('should validate cross-field constraints for rent when both values exist', () => {
            const invalidData = {
                ...minimalUnitTypeData,
                minRent: 1500,
                maxRent: 1200 // min > max - should fail
            };

            const result = UnitTypeDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const rentError = find(result.error.issues, issue =>
                    issue.path.includes('maxRent') && issue.message.includes('Min rent cannot be greater than max rent')
                );
                expect(rentError).toBeDefined();
            }
        });

        it('should validate cross-field constraints for square footage when both values exist', () => {
            const invalidData = {
                ...minimalUnitTypeData,
                minSqft: 800,
                maxSqft: 600 // min > max - should fail
            };

            const result = UnitTypeDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const sqftError = find(result.error.issues, issue =>
                    issue.path.includes('maxSqft') && issue.message.includes('Min square footage cannot be greater than max square footage')
                );
                expect(sqftError).toBeDefined();
            }
        });

        it('should validate cross-field constraints for lease terms when both values exist', () => {
            const invalidData = {
                ...minimalUnitTypeData,
                minLeaseTerm: 12,
                maxLeaseTerm: 6 // min > max - should fail
            };

            const result = UnitTypeDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const leaseError = find(result.error.issues, issue =>
                    issue.path.includes('maxLeaseTerm') && issue.message.includes('Min lease term cannot be greater than max lease term')
                );
                expect(leaseError).toBeDefined();
            }
        });

        it('should allow partial cross-field data without validation errors', () => {
            const partialData = {
                ...minimalUnitTypeData,
                minRent: 1200
                // maxRent not provided - should not trigger cross-field validation
            };

            const result = UnitTypeDraftSchema.safeParse(partialData);
            expect(result.success).toBe(true);
        });
    });

    describe('UnitDraftSchema', () => {
        const minimalUnitData = {
            buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
            unitID: 'unit-101',
            unitNumber: '101'
        };

        it('should accept minimal data with only required fields', () => {
            const result = UnitDraftSchema.safeParse(minimalUnitData);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.buildingID).toBe('gSPgoPTdFcPqdeCYMBZMzy');
                expect(result.data.unitID).toBe('unit-101');
                expect(result.data.unitNumber).toBe('101');
            }
        });

        it('should allow all optional fields to be omitted', () => {
            const result = UnitDraftSchema.safeParse(minimalUnitData);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.modelID).toBeUndefined();
                expect(result.data.beds).toBeUndefined();
                expect(result.data.baths).toBeUndefined();
                expect(result.data.rent).toBeUndefined();
                expect(result.data.sqft).toBeUndefined();
                expect(result.data.vacancyClass).toBeUndefined();
            }
        });

        it('should validate ID format requirements', () => {
            const invalidData = {
                ...minimalUnitData,
                buildingID: 'invalid id!',
                unitID: 'bad unit id!'
            };

            const result = UnitDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const buildingIdError = find(result.error.issues, issue => issue.path.includes('buildingID'));
                const unitIdError = find(result.error.issues, issue => issue.path.includes('unitID'));
                expect(buildingIdError?.message).toContain('must be a valid building ID format');
                expect(unitIdError?.message).toContain('can only contain letters, numbers, underscores, and hyphens');
            }
        });

        it('should require unitNumber to be non-empty', () => {
            const invalidData = {
                buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                unitID: 'unit-101',
                unitNumber: ''
            };

            const result = UnitDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const numberError = find(result.error.issues, issue => issue.path.includes('unitNumber'));
                expect(numberError?.message).toContain('Unit number is required');
            }
        });

        it('should accept valid optional fields when provided', () => {
            const completeData = {
                ...minimalUnitData,
                modelID: 'model-1br',
                beds: 1,
                baths: 1,
                rent: 1250,
                sqft: 700,
                vacancyClass: 'Available',
                dateAvailable: '2024-01-01',
                maxOccupants: 2,
                deposit: 1250,
                leaseLength: 12
            };

            const result = UnitDraftSchema.safeParse(completeData);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.modelID).toBe('model-1br');
                expect(result.data.beds).toBe(1);
                expect(result.data.rent).toBe(1250);
                expect(result.data.sqft).toBe(700);
            }
        });

        it('should validate negative value constraints', () => {
            const invalidData = {
                ...minimalUnitData,
                rent: -100,
                sqft: -50,
                beds: -1
            };

            const result = UnitDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const rentError = find(result.error.issues, issue => issue.path.includes('rent'));
                const sqftError = find(result.error.issues, issue => issue.path.includes('sqft'));
                const bedsError = find(result.error.issues, issue => issue.path.includes('beds'));
                expect(rentError?.message).toContain('cannot be negative');
                expect(sqftError?.message).toContain('cannot be negative');
                expect(bedsError?.message).toContain('Number of beds must be between 0 and 10');
            }
        });

        it('should validate date format when provided', () => {
            const invalidData = {
                ...minimalUnitData,
                dateAvailable: 'invalid-date'
            };

            const result = UnitDraftSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if(!result.success) {
                const dateError = find(result.error.issues, issue => issue.path.includes('dateAvailable'));
                expect(dateError?.message).toContain('Invalid date format');
            }
        });

        it('should accept valid date formats', () => {
            const validData = {
                ...minimalUnitData,
                dateAvailable: '2024-01-01'
            };

            const result = UnitDraftSchema.safeParse(validData);
            expect(result.success).toBe(true);
            if(result.success) {
                expect(result.data.dateAvailable).toBe('2024-01-01');
            }
        });
    });

    describe('Cross-Schema Consistency', () => {
        it('should use consistent ID validation patterns across all schemas', () => {
            const validId = 'wgey4dDPEd8qEMGtGoMef7'; // Valid short-uuid format
            const invalidId = 'invalid id!';

            // Test building ID validation
            const buildingValid = BuildingDraftSchema.safeParse({ buildingID: validId, buildingName: 'Test' });
            const buildingInvalid = BuildingDraftSchema.safeParse({ buildingID: invalidId, buildingName: 'Test' });
            expect(buildingValid.success).toBe(true);
            expect(buildingInvalid.success).toBe(false);

            // Test unit type ID validation
            const unitTypeValid = UnitTypeDraftSchema.safeParse({
                buildingID: validId,
                modelID: validId,
                modelName: 'Test Model'
            });
            const unitTypeInvalid = UnitTypeDraftSchema.safeParse({
                buildingID: invalidId,
                modelID: invalidId,
                modelName: 'Test Model'
            });
            expect(unitTypeValid.success).toBe(true);
            expect(unitTypeInvalid.success).toBe(false);

            // Test unit ID validation
            const unitValid = UnitDraftSchema.safeParse({
                buildingID: validId,
                unitID: validId,
                unitNumber: '101'
            });
            const unitInvalid = UnitDraftSchema.safeParse({
                buildingID: invalidId,
                unitID: invalidId,
                unitNumber: '101'
            });
            expect(unitValid.success).toBe(true);
            expect(unitInvalid.success).toBe(false);
        });

        it('should allow incremental data entry workflow', () => {
            // Simulate user entering data incrementally

            // Step 1: Just the bare minimum
            const step1 = {
                buildingID: 'gSPgoPTdFcPqdeCYMBZMzy',
                buildingName: 'My Building'
            };
            expect(BuildingDraftSchema.safeParse(step1).success).toBe(true);

            // Step 2: Add some address info
            const step2 = {
                ...step1,
                street: '123 Main St'
            };
            expect(BuildingDraftSchema.safeParse(step2).success).toBe(true);

            // Step 3: Add more complete address
            const step3 = {
                ...step2,
                city: 'Testville',
                state: 'TX',
                zip: '75001'
            };
            expect(BuildingDraftSchema.safeParse(step3).success).toBe(true);

            // All steps should pass validation, supporting auto-save workflow
        });
    });
});
