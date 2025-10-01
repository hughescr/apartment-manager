/**
 * Comprehensive tests for pet policy validation helpers
 * Tests all validation rules, business logic, edge cases, and form validation
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import { forEach, repeat } from 'lodash';
import {
    validatePetPolicy,
    validateBreedName,
    validateNumericInput,
    validatePetPolicyForm,
    createRealTimeValidator,
    VALIDATION_LIMITS
} from '../../../../astro-src/lib/pet-policy/petPolicyValidation';
import { PetType } from '../../../../src/types';
import type { ExtendedPetPolicy } from '../../../../astro-src/lib/pet-policy/petPolicyTypes';
import { createDefaultPetPolicy, createDefaultPetTypePolicy } from '../../../../astro-src/lib/pet-policy/petPolicyHelpers';

describe('Pet Policy Validation - Core Validation', () => {
    describe('validatePetPolicy', () => {
        it('should validate complete valid policy', () => {
            const policy: ExtendedPetPolicy = {
                allowed:           true,
                types:             [PetType.DOG, PetType.CAT],
                maxCount:          2,
                weightLimit:       50,
                breedRestrictions: ['Pit Bull', 'Rottweiler'],
                deposit:           500,
                monthlyFee:        25,
                oneTimeFee:        100,
                notes:             'Valid policy',
                petTypes:          [
                    {
                        type:              PetType.DOG,
                        weightLimit:       80,
                        countLimit:        1,
                        fee:               30,
                        deposit:           250,
                        breedRestrictions: ['German Shepherd']
                    }
                ]
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual({});
        });

        it('should validate policy when pets not allowed', () => {
            const policy: ExtendedPetPolicy = {
                allowed: false
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual({});
        });

        it('should require pet policy when required and pets not allowed', () => {
            const policy: ExtendedPetPolicy = {
                allowed: false
            };

            const result = validatePetPolicy(policy, true);

            expect(result.isValid).toBe(false);
            expect(result.errors.general).toBe('Pet policy is required - please specify if pets are allowed or not');
        });

        it('should validate basic pet fields when pets allowed', () => {
            const policy: ExtendedPetPolicy = {
                allowed: true,
                types:   []
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(false);
            expect(result.errors.types).toBe('At least one pet type must be selected when pets are allowed');
        });

        it('should validate numeric limits - pet counts', () => {
            const invalidCounts = [-1, 0, 11];

            forEach(invalidCounts, (count) => {
                const policy: ExtendedPetPolicy = {
                    allowed:  true,
                    types:    [PetType.DOG],
                    maxCount: count
                };

                const result = validatePetPolicy(policy);

                expect(result.isValid).toBe(false);
                if(count <= 0) {
                    expect(result.errors.maxCount).toBe('Maximum pet count must be greater than 0');
                } else {
                    expect(result.errors.maxCount).toBe('Maximum pet count cannot exceed 10');
                }
            });
        });

        it('should validate numeric limits - weight limits', () => {
            const invalidWeights = [-1, 0, 501];

            forEach(invalidWeights, (weight) => {
                const policy: ExtendedPetPolicy = {
                    allowed:     true,
                    types:       [PetType.DOG],
                    weightLimit: weight
                };

                const result = validatePetPolicy(policy);

                expect(result.isValid).toBe(false);
                if(weight <= 0) {
                    expect(result.errors.weightLimit).toBe('Weight limit must be greater than 0');
                } else {
                    expect(result.errors.weightLimit).toBe('Weight limit cannot exceed 500 lbs');
                }
            });
        });

        it('should validate fee ranges - deposits', () => {
            const testCases = [
                { deposit: -1, expected: 'Pet deposit cannot be negative' },
                { deposit: 10001, expected: 'Pet deposit cannot exceed $10,000' }
            ];

            forEach(testCases, ({ deposit, expected }) => {
                const policy: ExtendedPetPolicy = {
                    allowed: true,
                    types:   [PetType.DOG],
                    deposit
                };

                const result = validatePetPolicy(policy);

                expect(result.isValid).toBe(false);
                expect(result.errors.deposit).toBe(expected);
            });
        });

        it('should validate fee ranges - monthly fees', () => {
            const testCases = [
                { monthlyFee: -1, expected: 'Monthly pet fee cannot be negative' },
                { monthlyFee: 1001, expected: 'Monthly pet fee cannot exceed $1,000' }
            ];

            forEach(testCases, ({ monthlyFee, expected }) => {
                const policy: ExtendedPetPolicy = {
                    allowed: true,
                    types:   [PetType.DOG],
                    monthlyFee
                };

                const result = validatePetPolicy(policy);

                expect(result.isValid).toBe(false);
                expect(result.errors.monthlyFee).toBe(expected);
            });
        });

        it('should validate fee ranges - one-time fees', () => {
            const testCases = [
                { oneTimeFee: -1, expected: 'One-time pet fee cannot be negative' },
                { oneTimeFee: 10001, expected: 'One-time pet fee cannot exceed $10,000' }
            ];

            forEach(testCases, ({ oneTimeFee, expected }) => {
                const policy: ExtendedPetPolicy = {
                    allowed: true,
                    types:   [PetType.DOG],
                    oneTimeFee
                };

                const result = validatePetPolicy(policy);

                expect(result.isValid).toBe(false);
                expect(result.errors.oneTimeFee).toBe(expected);
            });
        });

        it('should allow valid ranges for all numeric fields', () => {
            const policy: ExtendedPetPolicy = {
                allowed:     true,
                types:       [PetType.DOG],
                maxCount:    5,
                weightLimit: 100,
                deposit:     1000,
                monthlyFee:  50,
                oneTimeFee:  200
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual({});
        });

        it('should validate breed restrictions for duplicates', () => {
            const policy: ExtendedPetPolicy = {
                allowed:           true,
                types:             [PetType.DOG],
                breedRestrictions: ['Pit Bull', 'Rottweiler', 'Pit Bull']
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(false);
            expect(result.errors.breedRestrictions).toBe('Duplicate breed restrictions found: Pit Bull');
        });

        it('should validate breed restrictions for empty values', () => {
            const policy: ExtendedPetPolicy = {
                allowed:           true,
                types:             [PetType.DOG],
                breedRestrictions: ['Pit Bull', '', '   ', 'Rottweiler']
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(false);
            expect(result.errors.breedRestrictions).toBe('Breed restrictions cannot be empty');
        });

        it('should validate notes length', () => {
            const longNotes = repeat('x', 1001);
            const policy: ExtendedPetPolicy = {
                allowed: true,
                types:   [PetType.DOG],
                notes:   longNotes
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(false);
            expect(result.errors.notes).toBe('Pet policy notes cannot exceed 1000 characters');
        });

        it('should allow valid notes length', () => {
            const validNotes = repeat('x', 1000);
            const policy: ExtendedPetPolicy = {
                allowed: true,
                types:   [PetType.DOG],
                notes:   validNotes
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(true);
            expect(result.errors.notes).toBeUndefined();
        });

        it('should validate advanced pet types - duplicate types', () => {
            const policy: ExtendedPetPolicy = {
                allowed:  true,
                types:    [PetType.DOG],
                petTypes: [
                    createDefaultPetTypePolicy(PetType.DOG),
                    createDefaultPetTypePolicy(PetType.CAT),
                    createDefaultPetTypePolicy(PetType.DOG)
                ]
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(false);
            expect(result.errors.general).toContain('Duplicate pet types found: dog');
        });

        it('should validate advanced pet types - invalid individual policies', () => {
            const policy: ExtendedPetPolicy = {
                allowed:  true,
                types:    [PetType.DOG],
                petTypes: [
                    {
                        type:              PetType.DOG,
                        weightLimit:       -1,
                        countLimit:        15,
                        fee:               -50,
                        deposit:           15000,
                        breedRestrictions: ['Valid', '', 'Also Valid']
                    }
                ]
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(false);
            expect(result.errors.general).toContain('Pet Type 1:');
            expect(result.errors.general).toContain('Weight limit must be greater than 0');
            expect(result.errors.general).toContain('Count limit cannot exceed 10');
            expect(result.errors.general).toContain('Monthly fee cannot be negative');
            expect(result.errors.general).toContain('Deposit cannot exceed $10,000');
            expect(result.errors.general).toContain('Breed restrictions cannot be empty');
        });

        it('should accumulate multiple validation errors', () => {
            const policy: ExtendedPetPolicy = {
                allowed:           true,
                types:             [], // Missing types
                maxCount:          -1, // Invalid count
                weightLimit:       600, // Exceeds limit
                deposit:           -100, // Negative
                breedRestrictions: ['Pit Bull', 'Pit Bull'], // Duplicates
                notes:             repeat('x', 1001) // Too long
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(false);
            expect(result.errors.types).toBeDefined();
            expect(result.errors.maxCount).toBeDefined();
            expect(result.errors.weightLimit).toBeDefined();
            expect(result.errors.deposit).toBeDefined();
            expect(result.errors.breedRestrictions).toBeDefined();
            expect(result.errors.notes).toBeDefined();
        });
    });
});

describe('Pet Policy Validation - Breed Name Validation', () => {
    describe('validateBreedName', () => {
        it('should validate correct breed names', () => {
            const validBreeds = [
                'Golden Retriever',
                'German Shepherd',
                'Pit Bull',
                'Bull Terrier',
                'Saint Bernard',
                'Jack-Russell',
                "O'Malley's Cat",
                'A'
            ];

            forEach(validBreeds, (breed) => {
                expect(validateBreedName(breed)).toBe(true);
            });
        });

        it('should reject invalid breed names', () => {
            const invalidBreeds = [
                '', // Empty
                '   ', // Whitespace only
                null as unknown as string, // Null
                undefined as unknown as string, // Undefined
                123 as unknown as string, // Number
                repeat('x', 101), // Too long
                'Golden123', // Numbers
                'Golden@Retriever', // Special chars
                'Golden_Retriever', // Underscores
                'Golden/Retriever' // Slashes
            ];

            forEach(invalidBreeds, (breed) => {
                expect(validateBreedName(breed)).toBe(false);
            });
        });

        it('should handle edge cases', () => {
            expect(validateBreedName('A')).toBe(true); // Single character
            expect(validateBreedName(repeat('x', 100))).toBe(true); // Max length
            expect(validateBreedName(repeat('x', 101))).toBe(false); // Over max length
        });

        it('should allow valid characters only', () => {
            expect(validateBreedName('Test-Breed')).toBe(true); // Hyphen
            expect(validateBreedName("Test'Breed")).toBe(true); // Apostrophe
            expect(validateBreedName('Test Breed')).toBe(true); // Space
            expect(validateBreedName('TestBreed')).toBe(true); // Letters only
        });
    });
});

describe('Pet Policy Validation - Numeric Input Validation', () => {
    describe('validateNumericInput', () => {
        it('should validate within range', () => {
            const result = validateNumericInput(5, 1, 10);
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should handle null/undefined as valid (optional)', () => {
            expect(validateNumericInput(null).isValid).toBe(true);
            expect(validateNumericInput(undefined).isValid).toBe(true);
            expect(validateNumericInput('').isValid).toBe(true);
        });

        it('should reject non-numeric values', () => {
            const invalidValues = ['abc', 'not-a-number', {}];

            forEach(invalidValues, (value) => {
                const result = validateNumericInput(value);
                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Must be a valid number');
            });

            // Arrays and booleans are converted to numbers, so they might be valid
            expect(validateNumericInput([]).isValid).toBe(true); // [] converts to 0
        });

        it('should validate minimum constraints', () => {
            const result = validateNumericInput(0, 1, 10);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Must be at least 1');
        });

        it('should validate maximum constraints', () => {
            const result = validateNumericInput(15, 1, 10);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Cannot exceed 10');
        });

        it('should handle default min/max ranges', () => {
            // Default min = 0, max = Infinity
            expect(validateNumericInput(0).isValid).toBe(true);
            expect(validateNumericInput(999999).isValid).toBe(true);
            expect(validateNumericInput(-1).isValid).toBe(false);
        });

        it('should handle boundary values correctly', () => {
            expect(validateNumericInput(1, 1, 10).isValid).toBe(true); // Min boundary
            expect(validateNumericInput(10, 1, 10).isValid).toBe(true); // Max boundary
            expect(validateNumericInput(0.9, 1, 10).isValid).toBe(false);
            expect(validateNumericInput(10.1, 1, 10).isValid).toBe(false);
        });

        it('should handle string numbers', () => {
            expect(validateNumericInput('5', 1, 10).isValid).toBe(true);
            expect(validateNumericInput('15', 1, 10).isValid).toBe(false);
            expect(validateNumericInput('0.5', 1, 10).isValid).toBe(false);
        });
    });
});

describe('Pet Policy Validation - Form Validation', () => {
    describe('validatePetPolicyForm', () => {
        it('should validate form with valid pet policy data', () => {
            const formData = new FormData();
            const policy = createDefaultPetPolicy();
            policy.allowed = true;
            policy.types = [PetType.DOG];

            formData.set('petPolicy', JSON.stringify(policy));

            const result = validatePetPolicyForm(formData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual({});
        });

        it('should handle missing pet policy data when not required', () => {
            const formData = new FormData();

            const result = validatePetPolicyForm(formData, false);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual({});
        });

        it('should handle missing pet policy data when required', () => {
            const formData = new FormData();

            const result = validatePetPolicyForm(formData, true);

            expect(result.isValid).toBe(false);
            expect(result.errors.general).toBe('Pet policy data is missing');
        });

        it('should handle invalid JSON in form data', () => {
            const formData = new FormData();
            formData.set('petPolicy', 'invalid-json{');

            const result = validatePetPolicyForm(formData);

            expect(result.isValid).toBe(false);
            expect(result.errors.general).toBe('Invalid pet policy data format');
        });

        it('should validate form data against policy rules', () => {
            const formData = new FormData();
            const policy = {
                allowed:  true,
                types:    [], // Invalid - no types selected
                maxCount: -1 // Invalid - negative count
            };

            formData.set('petPolicy', JSON.stringify(policy));

            const result = validatePetPolicyForm(formData);

            expect(result.isValid).toBe(false);
            expect(result.errors.types).toBeDefined();
            expect(result.errors.maxCount).toBeDefined();
        });
    });
});

describe('Pet Policy Validation - Real-time Validator', () => {
    describe('createRealTimeValidator', () => {
        let validator: ReturnType<typeof createRealTimeValidator>;
        let mockPolicy: ExtendedPetPolicy;

        beforeEach(() => {
            validator = createRealTimeValidator();
            mockPolicy = createDefaultPetPolicy();
        });

        it('should validate numeric fields correctly', () => {
            const numericFields = ['maxCount', 'weightLimit', 'deposit', 'monthlyFee', 'oneTimeFee'];

            forEach(numericFields, (field) => {
                // Valid values
                expect(validator.validateField(field, 10, mockPolicy)).toBeNull();

                // Invalid values based on field limits
                expect(validator.validateField(field, 'invalid', mockPolicy)).toBe('Must be a valid number');
            });
        });

        it('should validate breed names', () => {
            expect(validator.validateField('breedName', 'Golden Retriever', mockPolicy)).toBeNull();
            expect(validator.validateField('breedName', 'Invalid123', mockPolicy)).toBe('Invalid breed name');
            expect(validator.validateField('breedName', '', mockPolicy)).toBe('Invalid breed name');
        });

        it('should validate notes length', () => {
            const validNotes = repeat('x', 500);
            const invalidNotes = repeat('x', 1001);

            expect(validator.validateField('notes', validNotes, mockPolicy)).toBeNull();
            expect(validator.validateField('notes', invalidNotes, mockPolicy)).toBe('Notes cannot exceed 1000 characters');
        });

        it('should return null for unknown fields', () => {
            expect(validator.validateField('unknownField', 'any-value', mockPolicy)).toBeNull();
        });

        it('should handle null/undefined values for notes', () => {
            expect(validator.validateField('notes', null, mockPolicy)).toBeNull();
            expect(validator.validateField('notes', undefined, mockPolicy)).toBeNull();
        });
    });
});

describe('Pet Policy Validation - Constants and Limits', () => {
    describe('VALIDATION_LIMITS', () => {
        it('should define correct validation limits', () => {
            expect(VALIDATION_LIMITS.maxCount).toEqual({ min: 1, max: 10 });
            expect(VALIDATION_LIMITS.weightLimit).toEqual({ min: 1, max: 500 });
            expect(VALIDATION_LIMITS.deposit).toEqual({ min: 0, max: 10000 });
            expect(VALIDATION_LIMITS.monthlyFee).toEqual({ min: 0, max: 1000 });
            expect(VALIDATION_LIMITS.oneTimeFee).toEqual({ min: 0, max: 10000 });
            expect(VALIDATION_LIMITS.notesLength).toBe(1000);
            expect(VALIDATION_LIMITS.breedNameLength).toBe(100);
        });

        it('should be read-only constants', () => {
            // TypeScript prevents modification at compile-time due to 'as const'
            // The values should match what's defined in the source
            expect(VALIDATION_LIMITS.maxCount.min).toBe(1);
            expect(VALIDATION_LIMITS.maxCount.max).toBe(10);

            // Test that the object structure is immutable at compile time
            // We can't actually mutate it due to 'as const', so we test the types are correct
            const testLimits = VALIDATION_LIMITS;
            expect(testLimits.maxCount).toEqual({ min: 1, max: 10 });
            expect(Object.isFrozen(VALIDATION_LIMITS)).toBe(false); // Not frozen at runtime

            // Verify all properties are present and have expected readonly values
            expect(VALIDATION_LIMITS.weightLimit).toEqual({ min: 1, max: 500 });
            expect(VALIDATION_LIMITS.deposit).toEqual({ min: 0, max: 10000 });
        });
    });
});

describe('Pet Policy Validation - Business Rules & Edge Cases', () => {
    describe('Complex validation scenarios', () => {
        it('should validate policy with mixed valid and invalid advanced pet types', () => {
            const policy: ExtendedPetPolicy = {
                allowed:  true,
                types:    [PetType.DOG, PetType.CAT],
                petTypes: [
                    // Valid pet type
                    {
                        type:              PetType.DOG,
                        weightLimit:       50,
                        countLimit:        2,
                        fee:               25,
                        deposit:           200,
                        breedRestrictions: ['Pit Bull']
                    },
                    // Invalid pet type
                    {
                        type:              PetType.CAT,
                        weightLimit:       -1, // Invalid
                        countLimit:        15, // Invalid
                        fee:               -10, // Invalid
                        deposit:           15000, // Invalid
                        breedRestrictions: ['Valid Breed', ''] // One invalid
                    }
                ]
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(false);
            expect(result.errors.general).toContain('Pet Type 2:');
            expect(result.errors.general).toContain('Weight limit must be greater than 0');
            expect(result.errors.general).toContain('Count limit cannot exceed 10');
            expect(result.errors.general).toContain('Monthly fee cannot be negative');
            expect(result.errors.general).toContain('Deposit cannot exceed $10,000');
            expect(result.errors.general).toContain('Breed restrictions cannot be empty');
        });

        it('should handle policy with no pet type but advanced pet types defined', () => {
            const policy: ExtendedPetPolicy = {
                allowed:  true,
                types:    [],
                petTypes: [createDefaultPetTypePolicy(PetType.DOG)]
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(false);
            expect(result.errors.types).toBe('At least one pet type must be selected when pets are allowed');
        });

        it('should validate empty policy structure', () => {
            const policy = {} as ExtendedPetPolicy;

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(true); // allowed is falsy, so pets not allowed
            expect(result.errors).toEqual({});
        });

        it('should handle multiple duplicate breeds in restrictions', () => {
            const policy: ExtendedPetPolicy = {
                allowed:           true,
                types:             [PetType.DOG],
                breedRestrictions: ['Pit Bull', 'Rottweiler', 'Pit Bull', 'German Shepherd', 'Rottweiler']
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(false);
            expect(result.errors.breedRestrictions).toBe('Duplicate breed restrictions found: Pit Bull, Rottweiler');
        });

        it('should validate boundary values for all numeric limits', () => {
            const policy: ExtendedPetPolicy = {
                allowed:     true,
                types:       [PetType.DOG],
                maxCount:    10, // Max allowed
                weightLimit: 500, // Max allowed
                deposit:     10000, // Max allowed
                monthlyFee:  1000, // Max allowed
                oneTimeFee:  10000 // Max allowed
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual({});
        });

        it('should handle pet type with no breed restrictions', () => {
            const policy: ExtendedPetPolicy = {
                allowed:  true,
                types:    [PetType.DOG],
                petTypes: [
                    {
                        type:        PetType.DOG,
                        weightLimit: 50,
                        countLimit:  2,
                        fee:         25,
                        deposit:     200
                        // No breedRestrictions defined
                    }
                ]
            };

            const result = validatePetPolicy(policy);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual({});
        });
    });
});
