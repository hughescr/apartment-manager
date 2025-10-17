import type { PetPolicy } from '../../types';
import { PetType } from '../../types';
import type { ExtendedPetPolicy, PetCostSummary, PetTypePolicy } from './petPolicyTypes';
import { map, toUpper, trim } from 'lodash';

/**
 * Creates a default pet policy structure
 */
export function createDefaultPetPolicy(): ExtendedPetPolicy {
    return {
        allowed:           false,
        types:             [],
        maxCount:          undefined,
        weightLimit:       undefined,
        breedRestrictions: [],
        deposit:           undefined,
        monthlyFee:        undefined,
        oneTimeFee:        undefined,
        notes:             '',
        petTypes:          []
    };
}

/**
 * Creates a default pet type policy
 */
export function createDefaultPetTypePolicy(type: PetType = PetType.DOG): PetTypePolicy {
    return {
        type,
        weightLimit:       undefined,
        countLimit:        undefined,
        fee:               undefined,
        deposit:           undefined,
        breedRestrictions: []
    };
}

/**
 * Ensures pet policy has all required fields initialized
 */
export function ensurePetPolicyStructure(policy: PetPolicy | null | undefined): ExtendedPetPolicy {
    if(!policy) {
        return createDefaultPetPolicy();
    }

    const extended = policy as ExtendedPetPolicy;

    // Ensure all arrays exist
    extended.types ??= [];
    extended.breedRestrictions ??= [];
    extended.petTypes ??= [];

    return extended;
}

/**
 * Calculates total cost summary for pet fees
 */
export function calculatePetCosts(policy: PetPolicy): PetCostSummary {
    const deposit = policy.deposit ?? 0;
    const oneTime = policy.oneTimeFee ?? 0;
    const monthly = policy.monthlyFee ?? 0;

    return {
        upfront: deposit + oneTime,
        monthly: monthly,
        annual:  monthly * 12
    };
}

/**
 * Checks if a pet type is selected in the policy
 */
export function isPetTypeSelected(policy: ExtendedPetPolicy, type: PetType): boolean {
    return policy.types?.includes(type) ?? false;
}

/**
 * Toggles a pet type in the policy
 */
export function togglePetType(policy: ExtendedPetPolicy, type: PetType): void {
    policy.types ??= [];

    const index = policy.types.indexOf(type);
    if(index >= 0) {
        policy.types.splice(index, 1);
    } else {
        policy.types.push(type);
    }
}

/**
 * Checks if a breed is restricted in the policy
 */
export function isBreedRestricted(policy: ExtendedPetPolicy, breed: string): boolean {
    return policy.breedRestrictions?.includes(breed) ?? false;
}

/**
 * Adds a breed restriction to the policy
 */
export function addBreedRestriction(policy: ExtendedPetPolicy, breed: string): boolean {
    policy.breedRestrictions ??= [];

    const trimmedBreed = trim(breed);
    if(trimmedBreed && !policy.breedRestrictions.includes(trimmedBreed)) {
        policy.breedRestrictions.push(trimmedBreed);
        return true;
    }
    return false;
}

/**
 * Removes a breed restriction from the policy
 */
export function removeBreedRestriction(policy: ExtendedPetPolicy, index: number): void {
    if(policy.breedRestrictions && index >= 0 && index < policy.breedRestrictions.length) {
        policy.breedRestrictions.splice(index, 1);
    }
}

/**
 * Toggles a common breed restriction
 */
export function toggleCommonBreed(policy: ExtendedPetPolicy, breed: string): void {
    policy.breedRestrictions ??= [];

    const index = policy.breedRestrictions.indexOf(breed);
    if(index >= 0) {
        policy.breedRestrictions.splice(index, 1);
    } else {
        policy.breedRestrictions.push(breed);
    }
}

/**
 * Adds a breed restriction to a specific pet type policy
 */
export function addBreedRestrictionToPetType(
    policy: ExtendedPetPolicy,
    petTypeIndex: number,
    breed: string
): boolean {
    const petTypePolicy = policy.petTypes?.[petTypeIndex];
    if(!petTypePolicy) {
        return false;
    }

    petTypePolicy.breedRestrictions ??= [];

    const trimmedBreed = trim(breed);
    if(trimmedBreed && !petTypePolicy.breedRestrictions.includes(trimmedBreed)) {
        petTypePolicy.breedRestrictions.push(trimmedBreed);
        return true;
    }
    return false;
}

/**
 * Removes a breed restriction from a specific pet type policy
 */
export function removeBreedRestrictionFromPetType(
    policy: ExtendedPetPolicy,
    petTypeIndex: number,
    breedIndex: number
): void {
    const petTypePolicy = policy.petTypes?.[petTypeIndex];
    if(petTypePolicy?.breedRestrictions
      && breedIndex >= 0
      && breedIndex < petTypePolicy.breedRestrictions.length) {
        petTypePolicy.breedRestrictions.splice(breedIndex, 1);
    }
}

/**
 * Gets a summary of advanced pet type configurations
 */
export function getAdvancedPetTypesSummary(policy: ExtendedPetPolicy): string {
    const petTypes = policy.petTypes ?? [];
    if(petTypes.length === 0) {
        return 'No advanced pet types configured';
    }

    const typeNames = map(petTypes, p => toUpper(p.type.charAt(0)) + p.type.slice(1));
    return `${typeNames.join(', ')} (${petTypes.length} type${petTypes.length > 1 ? 's' : ''})`;
}

/**
 * Checks if policy has advanced pet type configurations
 */
export function hasAdvancedPetTypes(policy: ExtendedPetPolicy): boolean {
    return (policy.petTypes?.length ?? 0) > 0;
}

/**
 * Clears pet-related fields when pets are not allowed
 */
export function clearPetFields(policy: ExtendedPetPolicy): void {
    policy.types = [];
    policy.maxCount = undefined;
    policy.weightLimit = undefined;
    policy.breedRestrictions = [];
    policy.deposit = undefined;
    policy.monthlyFee = undefined;
    policy.oneTimeFee = undefined;
    policy.petTypes = [];
}

/**
 * Formats currency amount for display
 */
export function formatCurrency(amount: number | null | undefined): string {
    if(amount === null || amount === undefined || amount === 0) {
        return '$0';
    }
    return `$${amount.toFixed(2)}`;
}

/**
 * Validates a pet policy for completeness and consistency
 */
export function validatePetPolicyData(policy: ExtendedPetPolicy): string[] {
    const errors: string[] = [];

    if(policy.allowed) {
        // If pets are allowed, should have at least one type selected
        if(!policy.types?.length) {
            errors.push('At least one pet type must be selected when pets are allowed');
        }

        // Validate numeric fields
        if(policy.maxCount !== undefined && policy.maxCount <= 0) {
            errors.push('Maximum pet count must be greater than 0');
        }

        if(policy.weightLimit !== undefined && policy.weightLimit <= 0) {
            errors.push('Weight limit must be greater than 0');
        }

        if(policy.deposit !== undefined && policy.deposit < 0) {
            errors.push('Pet deposit cannot be negative');
        }

        if(policy.monthlyFee !== undefined && policy.monthlyFee < 0) {
            errors.push('Monthly pet fee cannot be negative');
        }

        if(policy.oneTimeFee !== undefined && policy.oneTimeFee < 0) {
            errors.push('One-time pet fee cannot be negative');
        }
    }

    return errors;
}
