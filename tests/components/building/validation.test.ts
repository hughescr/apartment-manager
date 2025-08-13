// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import _ from 'lodash';
import {
    validateBuildingForm,
    validateSingleField,
    hasUnsavedChanges
} from '../../../astro-src/lib/building/validation';
import { createTestBuildingData, resetAllMocks } from './test-setup';
import type { BuildingData } from '../../../astro-src/types';
import { AmenityCategory } from '../../../src/types';

describe('Building Form Validation', () => {
    let validBuilding: BuildingData;

    beforeAll(() => {
        resetAllMocks();
    });

    beforeEach(() => {
        validBuilding = createTestBuildingData();
    });

    describe('validateBuildingForm', () => {
        it('should return valid result for complete building data', () => {
            const result = validateBuildingForm(validBuilding);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual({});
        });

        it('should return invalid result for null building', () => {
            const result = validateBuildingForm(null);

            expect(result.isValid).toBe(false);
            expect(result.errors.general).toBe('Building data is required');
        });

        it('should validate required basic fields', () => {
            const invalidBuilding = {
                ...validBuilding,
                buildingID: '',
                street: '',
                city: '',
                state: '',
                zip: ''
            };

            const result = validateBuildingForm(invalidBuilding);

            expect(result.isValid).toBe(false);
            expect(result.errors.buildingID).toBe('Building ID is required');
            expect(result.errors.street).toBe('Street address is required');
            expect(result.errors.city).toBe('City is required');
            expect(result.errors.state).toBe('State is required');
            expect(result.errors.zip).toBe('ZIP code must be in format 12345 or 12345-6789');
        });

        it('should validate ZIP code format', () => {
            const testCases = [
                { zip: '12345', shouldBeValid: true },
                { zip: '12345-6789', shouldBeValid: true },
                { zip: '1234', shouldBeValid: false },
                { zip: '123456', shouldBeValid: false },
                { zip: '12345-123', shouldBeValid: false },
                { zip: 'ABCDE', shouldBeValid: false }
            ];

            _.forEach(testCases, (testCase) => {
                const building = {
                    ...validBuilding,
                    zip: testCase.zip
                };

                const result = validateBuildingForm(building);

                if(testCase.shouldBeValid) {
                    expect(result.errors.zip).toBeUndefined();
                } else {
                    expect(result.errors.zip).toBe('ZIP code must be in format 12345 or 12345-6789');
                }
            });
        });

        it('should validate year built range', () => {
            const testCases = [
                { yearBuilt: 1800, shouldBeValid: true },
                { yearBuilt: 2020, shouldBeValid: true },
                { yearBuilt: new Date().getFullYear() + 1, shouldBeValid: true },
                { yearBuilt: 1799, shouldBeValid: false },
                { yearBuilt: new Date().getFullYear() + 2, shouldBeValid: false }
            ];

            _.forEach(testCases, (testCase) => {
                const building = {
                    ...validBuilding,
                    yearBuilt: testCase.yearBuilt
                };

                const result = validateBuildingForm(building);

                if(testCase.shouldBeValid) {
                    expect(result.errors.yearBuilt).toBeUndefined();
                } else {
                    expect(result.errors.yearBuilt).toBe('Year built must be between 1800 and next year');
                }
            });
        });

        it('should validate rent specials', () => {
            const building = {
                ...validBuilding,
                rentSpecials: [
                    { title: '', description: 'Valid special', startDate: '2025-01-01', endDate: '2025-02-01' },
                    { title: 'Valid Special', description: 'Description', startDate: '2025-02-01', endDate: '2025-01-01' }
                ]
            };

            const result = validateBuildingForm(building);

            expect(result.isValid).toBe(false);
            expect(result.errors.rentSpecial0Title).toBe('Rent special title is required');
            expect(result.errors.rentSpecial1Dates).toBe('Start date must be before end date');
        });

        it('should validate AMI limit range', () => {
            const testCases = [
                { amiLimit: 0, shouldBeValid: true },
                { amiLimit: 100, shouldBeValid: true },
                { amiLimit: 200, shouldBeValid: true },
                { amiLimit: -1, shouldBeValid: false },
                { amiLimit: 201, shouldBeValid: false }
            ];

            _.forEach(testCases, (testCase) => {
                const building = {
                    ...validBuilding,
                    incomeRestrictions: {
                        amiLimit: testCase.amiLimit,
                        maxIncomeByHouseholdSize: { '1': 50000, '2': 60000, '3': 70000, '4': 80000 }
                    }
                };

                const result = validateBuildingForm(building);

                if(testCase.shouldBeValid) {
                    expect(result.errors.amiLimit).toBeUndefined();
                } else {
                    expect(result.errors.amiLimit).toBe('AMI limit must be between 0 and 200%');
                }
            });
        });

        it('should validate screening criteria ranges', () => {
            const building = {
                ...validBuilding,
                screeningCriteria: {
                    ...validBuilding.screeningCriteria!,
                    minCreditScore: 200, // Too low
                    incomeRatio: 15, // Too high
                    maxOccupantsPerBedroom: 10 // Too high
                }
            };

            const result = validateBuildingForm(building);

            expect(result.isValid).toBe(false);
            expect(result.errors.minCreditScore).toBe('Credit score must be between 300 and 850');
            expect(result.errors.incomeRatio).toBe('Income ratio must be between 0 and 10');
            expect(result.errors.maxOccupantsPerBedroom).toBe('Max occupants per bedroom must be between 0 and 5');
        });

        it('should handle missing screening criteria', () => {
            const building = {
                ...validBuilding,
                screeningCriteria: undefined
            };

            const result = validateBuildingForm(building);

            expect(result.isValid).toBe(true);
        });

        it('should handle empty rent specials array', () => {
            const building = {
                ...validBuilding,
                rentSpecials: []
            };

            const result = validateBuildingForm(building);

            expect(result.isValid).toBe(true);
        });

        it('should handle null/undefined AMI limit', () => {
            const testCases = [
                { amiLimit: null, shouldBeValid: true },
                { amiLimit: undefined, shouldBeValid: true },
                { amiLimit: '', shouldBeValid: true }
            ];

            _.forEach(testCases, (testCase) => {
                const building = {
                    ...validBuilding,
                    incomeRestrictions: {
                        amiLimit: testCase.amiLimit as number | undefined,
                        maxIncomeByHouseholdSize: { '1': 50000, '2': 60000, '3': 70000, '4': 80000 }
                    }
                };

                const result = validateBuildingForm(building);

                expect(result.errors.amiLimit).toBeUndefined();
            });
        });
    });

    describe('validateSingleField', () => {
        it('should validate basic required fields', () => {
            const requiredFields = ['buildingID', 'street', 'city', 'state'];

            _.forEach(requiredFields, (fieldName) => {
                expect(validateSingleField(fieldName, '', validBuilding)).toMatch(/required/);
                expect(validateSingleField(fieldName, '   ', validBuilding)).toMatch(/required/);
                expect(validateSingleField(fieldName, null, validBuilding)).toMatch(/required/);
                expect(validateSingleField(fieldName, undefined, validBuilding)).toMatch(/required/);
                expect(validateSingleField(fieldName, 'valid value', validBuilding)).toBe(null);
            });
        });

        it('should validate ZIP code field', () => {
            expect(validateSingleField('zip', '12345', validBuilding)).toBe(null);
            expect(validateSingleField('zip', '12345-6789', validBuilding)).toBe(null);
            expect(validateSingleField('zip', '1234', validBuilding)).toMatch(/ZIP code must be in format/);
            expect(validateSingleField('zip', 'ABCDE', validBuilding)).toMatch(/ZIP code must be in format/);
        });

        it('should validate year built field', () => {
            expect(validateSingleField('yearBuilt', 2020, validBuilding)).toBe(null);
            expect(validateSingleField('yearBuilt', 1800, validBuilding)).toBe(null);
            expect(validateSingleField('yearBuilt', 1799, validBuilding)).toMatch(/between 1800 and/);
            expect(validateSingleField('yearBuilt', new Date().getFullYear() + 2, validBuilding)).toMatch(/between 1800 and/);
        });

        it('should validate AMI limit field', () => {
            expect(validateSingleField('amiLimit', 100, validBuilding)).toBe(null);
            expect(validateSingleField('amiLimit', 0, validBuilding)).toBe(null);
            expect(validateSingleField('amiLimit', 200, validBuilding)).toBe(null);
            expect(validateSingleField('amiLimit', null, validBuilding)).toBe(null);
            expect(validateSingleField('amiLimit', '', validBuilding)).toBe(null);
            expect(validateSingleField('amiLimit', -1, validBuilding)).toMatch(/between 0 and 200%/);
            expect(validateSingleField('amiLimit', 201, validBuilding)).toMatch(/between 0 and 200%/);
        });

        it('should validate credit score field', () => {
            expect(validateSingleField('minCreditScore', 650, validBuilding)).toBe(null);
            expect(validateSingleField('minCreditScore', 300, validBuilding)).toBe(null);
            expect(validateSingleField('minCreditScore', 850, validBuilding)).toBe(null);
            expect(validateSingleField('minCreditScore', 299, validBuilding)).toMatch(/between 300 and 850/);
            expect(validateSingleField('minCreditScore', 851, validBuilding)).toMatch(/between 300 and 850/);
        });

        it('should validate income ratio field', () => {
            expect(validateSingleField('incomeRatio', 3, validBuilding)).toBe(null);
            expect(validateSingleField('incomeRatio', 0, validBuilding)).toBe(null);
            expect(validateSingleField('incomeRatio', 10, validBuilding)).toBe(null);
            expect(validateSingleField('incomeRatio', -1, validBuilding)).toMatch(/between 0 and 10/);
            expect(validateSingleField('incomeRatio', 11, validBuilding)).toMatch(/between 0 and 10/);
        });

        it('should validate max occupants field', () => {
            expect(validateSingleField('maxOccupantsPerBedroom', 2, validBuilding)).toBe(null);
            expect(validateSingleField('maxOccupantsPerBedroom', 1, validBuilding)).toBe(null);
            expect(validateSingleField('maxOccupantsPerBedroom', 5, validBuilding)).toBe(null);
            expect(validateSingleField('maxOccupantsPerBedroom', 0, validBuilding)).toBe(null); // 0 is valid
            expect(validateSingleField('maxOccupantsPerBedroom', -1, validBuilding)).toMatch(/between 0 and 5/);
            expect(validateSingleField('maxOccupantsPerBedroom', 6, validBuilding)).toMatch(/between 0 and 5/);
            expect(validateSingleField('maxOccupantsPerBedroom', -1, validBuilding)).toMatch(/between 0 and 5/);
        });

        it('should return null for unknown fields', () => {
            expect(validateSingleField('unknownField', 'any value', validBuilding)).toBe(null);
        });

        it('should return null for valid optional fields', () => {
            const optionalFields = ['yearBuilt', 'amiLimit', 'minCreditScore', 'incomeRatio', 'maxOccupantsPerBedroom'];

            _.forEach(optionalFields, (fieldName) => {
                expect(validateSingleField(fieldName, null, validBuilding)).toBe(null);
                expect(validateSingleField(fieldName, undefined, validBuilding)).toBe(null);
            });
        });
    });

    describe('hasUnsavedChanges', () => {
        it('should return false for identical buildings', () => {
            const original = createTestBuildingData();
            const current = { ...original };

            expect(hasUnsavedChanges(current, original)).toBe(false);
        });

        it('should return true for modified buildings', () => {
            const original = createTestBuildingData();
            const modified = {
                ...original,
                description: 'Modified description'
            };

            expect(hasUnsavedChanges(modified, original)).toBe(true);
        });

        it('should return false for null buildings', () => {
            expect(hasUnsavedChanges(null, null)).toBe(false);
            expect(hasUnsavedChanges(null, validBuilding)).toBe(false);
            expect(hasUnsavedChanges(validBuilding, null)).toBe(false);
        });

        it('should detect deep changes in nested objects', () => {
            const original = createTestBuildingData();
            const modified = {
                ...original,
                contactInfo: {
                    ...original.contactInfo!,
                    name: 'Modified Name'
                }
            };

            expect(hasUnsavedChanges(modified, original)).toBe(true);
        });

        it('should detect changes in arrays', () => {
            const original = createTestBuildingData();
            const modified = {
                ...original,
                propertyAmenities: [...original.propertyAmenities!, { name: 'new-amenity', category: AmenityCategory.PROPERTY }]
            };
            expect(hasUnsavedChanges(modified, original)).toBe(true);
        });

        it('should handle array reordering as changes', () => {
            const original = createTestBuildingData();
            const modified = {
                ...original,
                propertyAmenities: [...original.propertyAmenities!].reverse()
            };

            expect(hasUnsavedChanges(modified, original)).toBe(true);
        });
    });

    describe('Edge Cases and Error Conditions', () => {
        it('should handle missing required properties gracefully', () => {
            const incompleteBuilding = {
                buildingID: 'test-id'
                // Missing other required fields
            } as BuildingData;

            const result = validateBuildingForm(incompleteBuilding);

            expect(result.isValid).toBe(false);
            expect(result.errors).toEqual(expect.any(Object));
        });

        it('should handle extremely long strings', () => {
            const longString = _.repeat('a', 10000);
            const building = {
                ...validBuilding,
                description: longString
            };

            const result = validateBuildingForm(building);

            // Long strings should be allowed (no specific validation)
            expect(result.errors.description).toBeUndefined();
        });

        it('should handle special characters in text fields', () => {
            const building = {
                ...validBuilding,
                street: '123 Main St. Apt #5-B (Rear)',
                city: 'São Paulo',
                description: 'Building with émojis 🏢 and spëcial characters!'
            };

            const result = validateBuildingForm(building);

            expect(result.errors.street).toBeUndefined();
            expect(result.errors.city).toBeUndefined();
            expect(result.errors.description).toBeUndefined();
        });

        it('should validate complex rent specials scenarios', () => {
            const building = {
                ...validBuilding,
                rentSpecials: [
                    {
                        title: '   ', // Only whitespace
                        description: 'Valid description',
                        startDate: '2025-01-01',
                        endDate: '2025-02-01'
                    },
                    {
                        title: 'Valid Special',
                        description: '',
                        startDate: '2025-01-15',
                        endDate: '2025-01-10' // End before start
                    },
                    {
                        title: 'Another Valid Special',
                        description: 'Good description',
                        startDate: '2025-03-01',
                        endDate: '2025-03-31'
                    }
                ]
            };

            const result = validateBuildingForm(building);

            expect(result.isValid).toBe(false);
            expect(result.errors.rentSpecial0Title).toBe('Rent special title is required');
            expect(result.errors.rentSpecial1Dates).toBe('Start date must be before end date');
            expect(result.errors.rentSpecial2Title).toBeUndefined();
        });

        it('should handle numeric validation edge cases', () => {
            const numericTests = [
                { field: 'yearBuilt', value: '2020', shouldBeValid: true }, // String number should be valid
                { field: 'minCreditScore', value: 650.5, shouldBeValid: true }, // Float
                { field: 'incomeRatio', value: 3.5, shouldBeValid: true }, // Float
                { field: 'maxOccupantsPerBedroom', value: 2.0, shouldBeValid: true } // Float as integer
            ];

            _.forEach(numericTests, (test) => {
                const result = validateSingleField(test.field, test.value, validBuilding);

                if(test.shouldBeValid) {
                    expect(result).toBe(null);
                } else {
                    expect(result).not.toBe(null);
                }
            });
        });
    });
});
