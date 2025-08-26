/**
 * Comprehensive tests for pet policy calculation helpers
 * Tests all financial calculations, policy validation, inheritance logic, and edge cases
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import { forEach } from 'lodash';
import {
    createDefaultPetPolicy,
    createDefaultPetTypePolicy,
    ensurePetPolicyStructure,
    calculatePetCosts,
    isPetTypeSelected,
    togglePetType,
    isBreedRestricted,
    addBreedRestriction,
    removeBreedRestriction,
    toggleCommonBreed,
    addBreedRestrictionToPetType,
    removeBreedRestrictionFromPetType,
    getAdvancedPetTypesSummary,
    hasAdvancedPetTypes,
    clearPetFields,
    formatCurrency,
    validatePetPolicyData
} from '../../../../astro-src/lib/pet-policy/petPolicyHelpers';
import { PetType } from '../../../../src/types';
import type { ExtendedPetPolicy } from '../../../../astro-src/lib/pet-policy/petPolicyTypes';

describe('Pet Policy Helpers - Default Creation', () => {
    describe('createDefaultPetPolicy', () => {
        it('should create a default pet policy with all fields initialized', () => {
            const policy = createDefaultPetPolicy();

            expect(policy.allowed).toBe(false);
            expect(policy.types).toEqual([]);
            expect(policy.maxCount).toBeUndefined();
            expect(policy.weightLimit).toBeUndefined();
            expect(policy.breedRestrictions).toEqual([]);
            expect(policy.deposit).toBeUndefined();
            expect(policy.monthlyFee).toBeUndefined();
            expect(policy.oneTimeFee).toBeUndefined();
            expect(policy.notes).toBe('');
            expect(policy.petTypes).toEqual([]);
        });

        it('should create consistent default policies across multiple calls', () => {
            const policy1 = createDefaultPetPolicy();
            const policy2 = createDefaultPetPolicy();

            expect(policy1).toEqual(policy2);
            expect(policy1).not.toBe(policy2); // Different objects
        });
    });

    describe('createDefaultPetTypePolicy', () => {
        it('should create default pet type policy for dogs', () => {
            const policy = createDefaultPetTypePolicy(PetType.DOG);

            expect(policy.type).toBe(PetType.DOG);
            expect(policy.weightLimit).toBeUndefined();
            expect(policy.countLimit).toBeUndefined();
            expect(policy.fee).toBeUndefined();
            expect(policy.deposit).toBeUndefined();
            expect(policy.breedRestrictions).toEqual([]);
        });

        it('should create default pet type policy for cats', () => {
            const policy = createDefaultPetTypePolicy(PetType.CAT);
            expect(policy.type).toBe(PetType.CAT);
        });

        it('should default to dog type if no type provided', () => {
            const policy = createDefaultPetTypePolicy();
            expect(policy.type).toBe(PetType.DOG);
        });

        it('should handle all pet types', () => {
            const allTypes = [PetType.DOG, PetType.CAT, PetType.BIRD, PetType.FISH, PetType.SMALL_ANIMAL];

            forEach(allTypes, (type) => {
                const policy = createDefaultPetTypePolicy(type);
                expect(policy.type).toBe(type);
                expect(policy.breedRestrictions).toEqual([]);
            });
        });
    });
});

describe('Pet Policy Helpers - Structure Validation', () => {
    describe('ensurePetPolicyStructure', () => {
        it('should return default policy when policy is null', () => {
            const result = ensurePetPolicyStructure(null);
            const defaultPolicy = createDefaultPetPolicy();
            expect(result).toEqual(defaultPolicy);
        });

        it('should return default policy when policy is undefined', () => {
            const result = ensurePetPolicyStructure(undefined);
            const defaultPolicy = createDefaultPetPolicy();
            expect(result).toEqual(defaultPolicy);
        });

        it('should ensure arrays exist in partial policy', () => {
            const partialPolicy = {
                allowed: true,
                deposit: 500
            } as ExtendedPetPolicy;

            const result = ensurePetPolicyStructure(partialPolicy);

            expect(result.allowed).toBe(true);
            expect(result.deposit).toBe(500);
            expect(result.types).toEqual([]);
            expect(result.breedRestrictions).toEqual([]);
            expect(result.petTypes).toEqual([]);
        });

        it('should preserve existing arrays in complete policy', () => {
            const completePolicy: ExtendedPetPolicy = {
                allowed: true,
                types: [PetType.DOG, PetType.CAT],
                breedRestrictions: ['Pit Bull'],
                petTypes: [createDefaultPetTypePolicy(PetType.DOG)],
                maxCount: 2,
                weightLimit: 50,
                deposit: 300,
                monthlyFee: 25,
                oneTimeFee: 100,
                notes: 'Test policy'
            };

            const result = ensurePetPolicyStructure(completePolicy);

            expect(result.types).toEqual([PetType.DOG, PetType.CAT]);
            expect(result.breedRestrictions).toEqual(['Pit Bull']);
            expect(result.petTypes).toHaveLength(1);
            expect(result.petTypes?.[0]?.type).toBe(PetType.DOG);
        });
    });
});

describe('Pet Policy Helpers - Financial Calculations', () => {
    describe('calculatePetCosts', () => {
        it('should calculate costs with all fees defined', () => {
            const policy = {
                deposit: 500,
                oneTimeFee: 200,
                monthlyFee: 50
            } as ExtendedPetPolicy;

            const costs = calculatePetCosts(policy);

            expect(costs.upfront).toBe(700); // deposit + oneTimeFee
            expect(costs.monthly).toBe(50);
            expect(costs.annual).toBe(600); // monthly * 12
        });

        it('should handle zero costs', () => {
            const policy = {
                deposit: 0,
                oneTimeFee: 0,
                monthlyFee: 0
            } as ExtendedPetPolicy;

            const costs = calculatePetCosts(policy);

            expect(costs.upfront).toBe(0);
            expect(costs.monthly).toBe(0);
            expect(costs.annual).toBe(0);
        });

        it('should handle undefined/null fees as zero', () => {
            const policy = {} as ExtendedPetPolicy;

            const costs = calculatePetCosts(policy);

            expect(costs.upfront).toBe(0);
            expect(costs.monthly).toBe(0);
            expect(costs.annual).toBe(0);
        });

        it('should handle partial fee definitions', () => {
            const policy = {
                deposit: 300,
                monthlyFee: 25
                // oneTimeFee undefined
            } as ExtendedPetPolicy;

            const costs = calculatePetCosts(policy);

            expect(costs.upfront).toBe(300); // deposit + 0
            expect(costs.monthly).toBe(25);
            expect(costs.annual).toBe(300);
        });

        it('should handle large amounts correctly', () => {
            const policy = {
                deposit: 10000,
                oneTimeFee: 5000,
                monthlyFee: 1000
            } as ExtendedPetPolicy;

            const costs = calculatePetCosts(policy);

            expect(costs.upfront).toBe(15000);
            expect(costs.monthly).toBe(1000);
            expect(costs.annual).toBe(12000);
        });

        it('should handle decimal amounts correctly', () => {
            const policy = {
                deposit: 250.50,
                oneTimeFee: 49.99,
                monthlyFee: 24.95
            } as ExtendedPetPolicy;

            const costs = calculatePetCosts(policy);

            expect(costs.upfront).toBeCloseTo(300.49, 2);
            expect(costs.monthly).toBeCloseTo(24.95, 2);
            expect(costs.annual).toBeCloseTo(299.4, 2);
        });
    });

    describe('formatCurrency', () => {
        it('should format positive amounts correctly', () => {
            expect(formatCurrency(100)).toBe('$100.00');
            expect(formatCurrency(1234.56)).toBe('$1234.56');
            expect(formatCurrency(0.99)).toBe('$0.99');
        });

        it('should handle zero amounts', () => {
            expect(formatCurrency(0)).toBe('$0');
        });

        it('should handle null and undefined', () => {
            expect(formatCurrency(null)).toBe('$0');
            expect(formatCurrency(undefined)).toBe('$0');
        });

        it('should handle edge cases', () => {
            expect(formatCurrency(0.001)).toBe('$0.00');
            expect(formatCurrency(999999.99)).toBe('$999999.99');
        });
    });
});

describe('Pet Policy Helpers - Pet Type Management', () => {
    let policy: ExtendedPetPolicy;

    beforeEach(() => {
        policy = createDefaultPetPolicy();
    });

    describe('isPetTypeSelected', () => {
        it('should return false for empty types array', () => {
            expect(isPetTypeSelected(policy, PetType.DOG)).toBe(false);
        });

        it('should return true for selected pet type', () => {
            policy.types = [PetType.DOG, PetType.CAT];
            expect(isPetTypeSelected(policy, PetType.DOG)).toBe(true);
            expect(isPetTypeSelected(policy, PetType.CAT)).toBe(true);
        });

        it('should return false for unselected pet type', () => {
            policy.types = [PetType.DOG];
            expect(isPetTypeSelected(policy, PetType.CAT)).toBe(false);
        });

        it('should handle undefined types array', () => {
            policy.types = undefined as unknown as never[];
            expect(isPetTypeSelected(policy, PetType.DOG)).toBe(false);
        });
    });

    describe('togglePetType', () => {
        it('should add pet type to empty array', () => {
            togglePetType(policy, PetType.DOG);
            expect(policy.types).toEqual([PetType.DOG]);
        });

        it('should add new pet type to existing array', () => {
            policy.types = [PetType.CAT];
            togglePetType(policy, PetType.DOG);
            expect(policy.types).toEqual([PetType.CAT, PetType.DOG]);
        });

        it('should remove existing pet type', () => {
            policy.types = [PetType.DOG, PetType.CAT];
            togglePetType(policy, PetType.DOG);
            expect(policy.types).toEqual([PetType.CAT]);
        });

        it('should handle undefined types array', () => {
            policy.types = undefined as unknown as never[];
            togglePetType(policy, PetType.DOG);
            expect(policy.types).toEqual([PetType.DOG]);
        });

        it('should handle multiple toggles of same type', () => {
            togglePetType(policy, PetType.DOG);
            expect(policy.types).toEqual([PetType.DOG]);

            togglePetType(policy, PetType.DOG);
            expect(policy.types).toEqual([]);

            togglePetType(policy, PetType.DOG);
            expect(policy.types).toEqual([PetType.DOG]);
        });
    });
});

describe('Pet Policy Helpers - Breed Restrictions', () => {
    let policy: ExtendedPetPolicy;

    beforeEach(() => {
        policy = createDefaultPetPolicy();
    });

    describe('isBreedRestricted', () => {
        it('should return false for empty restrictions', () => {
            expect(isBreedRestricted(policy, 'Pit Bull')).toBe(false);
        });

        it('should return true for restricted breed', () => {
            policy.breedRestrictions = ['Pit Bull', 'Rottweiler'];
            expect(isBreedRestricted(policy, 'Pit Bull')).toBe(true);
        });

        it('should return false for non-restricted breed', () => {
            policy.breedRestrictions = ['Pit Bull'];
            expect(isBreedRestricted(policy, 'Golden Retriever')).toBe(false);
        });

        it('should handle case sensitivity correctly', () => {
            policy.breedRestrictions = ['Pit Bull'];
            expect(isBreedRestricted(policy, 'pit bull')).toBe(false);
            expect(isBreedRestricted(policy, 'PIT BULL')).toBe(false);
        });

        it('should handle undefined restrictions array', () => {
            policy.breedRestrictions = undefined as unknown as never[];
            expect(isBreedRestricted(policy, 'Pit Bull')).toBe(false);
        });
    });

    describe('addBreedRestriction', () => {
        it('should add breed to empty restrictions', () => {
            const result = addBreedRestriction(policy, 'Pit Bull');
            expect(result).toBe(true);
            expect(policy.breedRestrictions).toEqual(['Pit Bull']);
        });

        it('should add breed to existing restrictions', () => {
            policy.breedRestrictions = ['Rottweiler'];
            const result = addBreedRestriction(policy, 'Pit Bull');
            expect(result).toBe(true);
            expect(policy.breedRestrictions).toEqual(['Rottweiler', 'Pit Bull']);
        });

        it('should not add duplicate breeds', () => {
            policy.breedRestrictions = ['Pit Bull'];
            const result = addBreedRestriction(policy, 'Pit Bull');
            expect(result).toBe(false);
            expect(policy.breedRestrictions).toEqual(['Pit Bull']);
        });

        it('should trim whitespace from breed names', () => {
            const result = addBreedRestriction(policy, '  Pit Bull  ');
            expect(result).toBe(true);
            expect(policy.breedRestrictions).toEqual(['Pit Bull']);
        });

        it('should reject empty strings', () => {
            const result = addBreedRestriction(policy, '');
            expect(result).toBe(false);
            expect(policy.breedRestrictions).toEqual([]);
        });

        it('should reject whitespace-only strings', () => {
            const result = addBreedRestriction(policy, '   ');
            expect(result).toBe(false);
            expect(policy.breedRestrictions).toEqual([]);
        });

        it('should handle undefined restrictions array', () => {
            policy.breedRestrictions = undefined as unknown as never[];
            const result = addBreedRestriction(policy, 'Pit Bull');
            expect(result).toBe(true);
            expect(policy.breedRestrictions).toEqual(['Pit Bull']);
        });
    });

    describe('removeBreedRestriction', () => {
        it('should remove breed restriction by index', () => {
            policy.breedRestrictions = ['Pit Bull', 'Rottweiler', 'German Shepherd'];
            removeBreedRestriction(policy, 1);
            expect(policy.breedRestrictions).toEqual(['Pit Bull', 'German Shepherd']);
        });

        it('should handle invalid indices gracefully', () => {
            policy.breedRestrictions = ['Pit Bull'];
            removeBreedRestriction(policy, -1);
            expect(policy.breedRestrictions).toEqual(['Pit Bull']);

            removeBreedRestriction(policy, 1);
            expect(policy.breedRestrictions).toEqual(['Pit Bull']);

            removeBreedRestriction(policy, 100);
            expect(policy.breedRestrictions).toEqual(['Pit Bull']);
        });

        it('should handle empty restrictions array', () => {
            removeBreedRestriction(policy, 0);
            expect(policy.breedRestrictions).toEqual([]);
        });

        it('should handle undefined restrictions array', () => {
            policy.breedRestrictions = undefined as unknown as never[];
            removeBreedRestriction(policy, 0);
            // Should not throw error
        });
    });

    describe('toggleCommonBreed', () => {
        it('should add breed if not restricted', () => {
            toggleCommonBreed(policy, 'Pit Bull');
            expect(policy.breedRestrictions).toEqual(['Pit Bull']);
        });

        it('should remove breed if already restricted', () => {
            policy.breedRestrictions = ['Pit Bull', 'Rottweiler'];
            toggleCommonBreed(policy, 'Pit Bull');
            expect(policy.breedRestrictions).toEqual(['Rottweiler']);
        });

        it('should handle undefined restrictions array', () => {
            policy.breedRestrictions = undefined as unknown as never[];
            toggleCommonBreed(policy, 'Pit Bull');
            expect(policy.breedRestrictions).toEqual(['Pit Bull']);
        });
    });
});

describe('Pet Policy Helpers - Advanced Pet Types', () => {
    let policy: ExtendedPetPolicy;

    beforeEach(() => {
        policy = createDefaultPetPolicy();
        policy.petTypes = [
            createDefaultPetTypePolicy(PetType.DOG),
            createDefaultPetTypePolicy(PetType.CAT)
        ];
    });

    describe('addBreedRestrictionToPetType', () => {
        it('should add breed restriction to specific pet type', () => {
            const result = addBreedRestrictionToPetType(policy, 0, 'Pit Bull');
            expect(result).toBe(true);
            expect(policy.petTypes?.[0]?.breedRestrictions).toEqual(['Pit Bull']);
        });

        it('should handle invalid pet type index', () => {
            const result = addBreedRestrictionToPetType(policy, 10, 'Pit Bull');
            expect(result).toBe(false);
        });

        it('should not add duplicate breed restrictions', () => {
            policy.petTypes![0]!.breedRestrictions = ['Pit Bull'];
            const result = addBreedRestrictionToPetType(policy, 0, 'Pit Bull');
            expect(result).toBe(false);
        });

        it('should trim breed names', () => {
            const result = addBreedRestrictionToPetType(policy, 0, '  Rottweiler  ');
            expect(result).toBe(true);
            expect(policy.petTypes?.[0]?.breedRestrictions).toEqual(['Rottweiler']);
        });

        it('should reject empty breed names', () => {
            const result = addBreedRestrictionToPetType(policy, 0, '');
            expect(result).toBe(false);
        });
    });

    describe('removeBreedRestrictionFromPetType', () => {
        beforeEach(() => {
            policy.petTypes![0]!.breedRestrictions = ['Pit Bull', 'Rottweiler', 'German Shepherd'];
        });

        it('should remove breed restriction by index', () => {
            removeBreedRestrictionFromPetType(policy, 0, 1);
            expect(policy.petTypes?.[0]?.breedRestrictions).toEqual(['Pit Bull', 'German Shepherd']);
        });

        it('should handle invalid pet type index', () => {
            removeBreedRestrictionFromPetType(policy, 10, 0);
            // Should not throw error
            expect(policy.petTypes?.[0]?.breedRestrictions).toEqual(['Pit Bull', 'Rottweiler', 'German Shepherd']);
        });

        it('should handle invalid breed index', () => {
            removeBreedRestrictionFromPetType(policy, 0, 10);
            expect(policy.petTypes?.[0]?.breedRestrictions).toEqual(['Pit Bull', 'Rottweiler', 'German Shepherd']);
        });
    });

    describe('hasAdvancedPetTypes', () => {
        it('should return true when pet types exist', () => {
            expect(hasAdvancedPetTypes(policy)).toBe(true);
        });

        it('should return false when pet types array is empty', () => {
            policy.petTypes = [];
            expect(hasAdvancedPetTypes(policy)).toBe(false);
        });

        it('should return false when pet types is undefined', () => {
            policy.petTypes = undefined;
            expect(hasAdvancedPetTypes(policy)).toBe(false);
        });
    });

    describe('getAdvancedPetTypesSummary', () => {
        it('should return summary for multiple pet types', () => {
            const summary = getAdvancedPetTypesSummary(policy);
            expect(summary).toBe('Dog, Cat (2 types)');
        });

        it('should return summary for single pet type', () => {
            policy.petTypes = [createDefaultPetTypePolicy(PetType.DOG)];
            const summary = getAdvancedPetTypesSummary(policy);
            expect(summary).toBe('Dog (1 type)');
        });

        it('should return default message for no pet types', () => {
            policy.petTypes = [];
            const summary = getAdvancedPetTypesSummary(policy);
            expect(summary).toBe('No advanced pet types configured');
        });

        it('should handle undefined pet types', () => {
            policy.petTypes = undefined;
            const summary = getAdvancedPetTypesSummary(policy);
            expect(summary).toBe('No advanced pet types configured');
        });

        it('should capitalize pet type names correctly', () => {
            policy.petTypes = [
                createDefaultPetTypePolicy(PetType.SMALL_ANIMAL),
                createDefaultPetTypePolicy(PetType.BIRD)
            ];
            const summary = getAdvancedPetTypesSummary(policy);
            expect(summary).toBe('Small-animal, Bird (2 types)');
        });
    });
});

describe('Pet Policy Helpers - Utility Functions', () => {
    let policy: ExtendedPetPolicy;

    beforeEach(() => {
        policy = {
            allowed: true,
            types: [PetType.DOG, PetType.CAT],
            maxCount: 2,
            weightLimit: 50,
            breedRestrictions: ['Pit Bull'],
            deposit: 500,
            monthlyFee: 25,
            oneTimeFee: 100,
            notes: 'Test policy',
            petTypes: [createDefaultPetTypePolicy(PetType.DOG)]
        };
    });

    describe('clearPetFields', () => {
        it('should clear all pet-related fields', () => {
            clearPetFields(policy);

            expect(policy.types).toEqual([]);
            expect(policy.maxCount).toBeUndefined();
            expect(policy.weightLimit).toBeUndefined();
            expect(policy.breedRestrictions).toEqual([]);
            expect(policy.deposit).toBeUndefined();
            expect(policy.monthlyFee).toBeUndefined();
            expect(policy.oneTimeFee).toBeUndefined();
            expect(policy.petTypes).toEqual([]);

            // Should preserve allowed flag and notes
            expect(policy.allowed).toBe(true);
            expect(policy.notes).toBe('Test policy');
        });

        it('should handle policy with undefined fields', () => {
            const minimalPolicy: ExtendedPetPolicy = { allowed: false };
            clearPetFields(minimalPolicy);

            expect(minimalPolicy.types).toEqual([]);
            expect(minimalPolicy.breedRestrictions).toEqual([]);
            expect(minimalPolicy.petTypes).toEqual([]);
        });
    });
});

describe('Pet Policy Helpers - Validation', () => {
    describe('validatePetPolicyData', () => {
        it('should return no errors for valid allowed policy', () => {
            const policy: ExtendedPetPolicy = {
                allowed: true,
                types: [PetType.DOG],
                maxCount: 2,
                weightLimit: 50,
                deposit: 300,
                monthlyFee: 25,
                oneTimeFee: 100
            };

            const errors = validatePetPolicyData(policy);
            expect(errors).toEqual([]);
        });

        it('should return no errors for not allowed policy', () => {
            const policy: ExtendedPetPolicy = {
                allowed: false
            };

            const errors = validatePetPolicyData(policy);
            expect(errors).toEqual([]);
        });

        it('should validate pet types are selected when allowed', () => {
            const policy: ExtendedPetPolicy = {
                allowed: true,
                types: []
            };

            const errors = validatePetPolicyData(policy);
            expect(errors).toContain('At least one pet type must be selected when pets are allowed');
        });

        it('should validate numeric limits', () => {
            const policy: ExtendedPetPolicy = {
                allowed: true,
                types: [PetType.DOG],
                maxCount: -1,
                weightLimit: 0,
                deposit: -100,
                monthlyFee: -25,
                oneTimeFee: -50
            };

            const errors = validatePetPolicyData(policy);
            expect(errors).toContain('Maximum pet count must be greater than 0');
            expect(errors).toContain('Weight limit must be greater than 0');
            expect(errors).toContain('Pet deposit cannot be negative');
            expect(errors).toContain('Monthly pet fee cannot be negative');
            expect(errors).toContain('One-time pet fee cannot be negative');
        });

        it('should allow zero fees', () => {
            const policy: ExtendedPetPolicy = {
                allowed: true,
                types: [PetType.DOG],
                deposit: 0,
                monthlyFee: 0,
                oneTimeFee: 0
            };

            const errors = validatePetPolicyData(policy);
            expect(errors).not.toContain('Pet deposit cannot be negative');
            expect(errors).not.toContain('Monthly pet fee cannot be negative');
            expect(errors).not.toContain('One-time pet fee cannot be negative');
        });

        it('should allow undefined optional fields', () => {
            const policy: ExtendedPetPolicy = {
                allowed: true,
                types: [PetType.DOG]
            };

            const errors = validatePetPolicyData(policy);
            expect(errors).toEqual([]);
        });
    });
});
