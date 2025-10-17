import type { ExtendedPetPolicy, PetPolicyErrors, PetPolicyValidationResult } from './petPolicyTypes';
import { filter, isObject, isString, map, trim } from 'lodash';

/**
 * Validates basic pet policy fields
 */
function validateBasicPetFields(policy: ExtendedPetPolicy, errors: PetPolicyErrors): boolean {
    let isValid = true;

    // Pet type validation
    if(!policy.types || policy.types.length === 0) {
        errors.types = 'At least one pet type must be selected when pets are allowed';
        isValid = false;
    }

    return isValid;
}

/**
 * Validates numeric limits for pet policy
 */
function validatePetLimits(policy: ExtendedPetPolicy, errors: PetPolicyErrors): boolean {
    let isValid = true;

    // Max count validation
    if(policy.maxCount !== undefined) {
        if(policy.maxCount <= 0) {
            errors.maxCount = 'Maximum pet count must be greater than 0';
            isValid = false;
        } else if(policy.maxCount > 10) {
            errors.maxCount = 'Maximum pet count cannot exceed 10';
            isValid = false;
        }
    }

    // Weight limit validation
    if(policy.weightLimit !== undefined) {
        if(policy.weightLimit <= 0) {
            errors.weightLimit = 'Weight limit must be greater than 0';
            isValid = false;
        } else if(policy.weightLimit > 500) {
            errors.weightLimit = 'Weight limit cannot exceed 500 lbs';
            isValid = false;
        }
    }

    return isValid;
}

/**
 * Validates pet fees for correct ranges
 */
function validatePetFees(policy: ExtendedPetPolicy, errors: PetPolicyErrors): boolean {
    let isValid = true;

    // Deposit validation
    if(policy.deposit !== undefined) {
        if(policy.deposit < 0) {
            errors.deposit = 'Pet deposit cannot be negative';
            isValid = false;
        } else if(policy.deposit > 10000) {
            errors.deposit = 'Pet deposit cannot exceed $10,000';
            isValid = false;
        }
    }

    // Monthly fee validation
    if(policy.monthlyFee !== undefined) {
        if(policy.monthlyFee < 0) {
            errors.monthlyFee = 'Monthly pet fee cannot be negative';
            isValid = false;
        } else if(policy.monthlyFee > 1000) {
            errors.monthlyFee = 'Monthly pet fee cannot exceed $1,000';
            isValid = false;
        }
    }

    // One-time fee validation
    if(policy.oneTimeFee !== undefined) {
        if(policy.oneTimeFee < 0) {
            errors.oneTimeFee = 'One-time pet fee cannot be negative';
            isValid = false;
        } else if(policy.oneTimeFee > 10000) {
            errors.oneTimeFee = 'One-time pet fee cannot exceed $10,000';
            isValid = false;
        }
    }

    return isValid;
}

/**
 * Validates breed restrictions for duplicates and empty values
 */
function validateBreedRestrictions(policy: ExtendedPetPolicy, errors: PetPolicyErrors): boolean {
    let isValid = true;

    if(policy.breedRestrictions) {
        const duplicates = findDuplicates(policy.breedRestrictions);
        if(duplicates.length > 0) {
            errors.breedRestrictions = `Duplicate breed restrictions found: ${duplicates.join(', ')}`;
            isValid = false;
        }

        // Check for empty or whitespace-only restrictions
        const emptyRestrictions = filter(policy.breedRestrictions, breed => !trim(breed));
        if(emptyRestrictions.length > 0) {
            errors.breedRestrictions = 'Breed restrictions cannot be empty';
            isValid = false;
        }
    }

    return isValid;
}

/**
 * Validates advanced pet type policies
 */
function validateAdvancedPetTypes(policy: ExtendedPetPolicy, errors: PetPolicyErrors): boolean {
    let isValid = true;

    if(policy.petTypes && policy.petTypes.length > 0) {
        for(let i = 0; i < policy.petTypes.length; i++) {
            const petType = policy.petTypes[i];
            const petTypeErrors = validatePetTypePolicy(petType, i);

            if(petTypeErrors.length > 0) {
                errors.general ??= '';
                errors.general += `Pet Type ${i + 1}: ${petTypeErrors.join(', ')}. `;
                isValid = false;
            }
        }

        // Check for duplicate pet types
        const petTypeValues = map(policy.petTypes, 'type');
        const duplicatePetTypes = findDuplicates(petTypeValues);
        if(duplicatePetTypes.length > 0) {
            errors.general ??= '';
            errors.general += `Duplicate pet types found: ${duplicatePetTypes.join(', ')}`;
            isValid = false;
        }
    }

    return isValid;
}

/**
 * Validates a pet policy for completeness and consistency
 */
export function validatePetPolicy(policy: ExtendedPetPolicy, required = false): PetPolicyValidationResult {
    const errors: PetPolicyErrors = {};
    let isValid = true;

    // If pets are not allowed, most validation rules don't apply
    if(!policy.allowed) {
        // If pet policy is required, pets must be allowed
        if(required) {
            errors.general = 'Pet policy is required - please specify if pets are allowed or not';
            isValid = false;
        }
        return { isValid, errors };
    }

    // Validate different aspects of the pet policy
    isValid = validateBasicPetFields(policy, errors) && isValid;
    isValid = validatePetLimits(policy, errors) && isValid;
    isValid = validatePetFees(policy, errors) && isValid;
    isValid = validateBreedRestrictions(policy, errors) && isValid;
    isValid = validateAdvancedPetTypes(policy, errors) && isValid;

    // Notes length validation (optional but good practice)
    if(policy.notes && policy.notes.length > 1000) {
        errors.notes = 'Pet policy notes cannot exceed 1000 characters';
        isValid = false;
    }

    return { isValid, errors };
}

/**
 * Validates weight limit for pet type policy
 */
function validatePetTypeWeightLimit(petType: import('./petPolicyTypes').PetTypePolicy, errors: string[]): void {
    if(petType.weightLimit !== undefined) {
        if(petType.weightLimit <= 0) {
            errors.push('Weight limit must be greater than 0');
        } else if(petType.weightLimit > 500) {
            errors.push('Weight limit cannot exceed 500 lbs');
        }
    }
}

/**
 * Validates count limit for pet type policy
 */
function validatePetTypeCountLimit(petType: import('./petPolicyTypes').PetTypePolicy, errors: string[]): void {
    if(petType.countLimit !== undefined) {
        if(petType.countLimit <= 0) {
            errors.push('Count limit must be greater than 0');
        } else if(petType.countLimit > 10) {
            errors.push('Count limit cannot exceed 10');
        }
    }
}

/**
 * Validates fees for pet type policy
 */
function validatePetTypeFees(petType: import('./petPolicyTypes').PetTypePolicy, errors: string[]): void {
    if(petType.fee !== undefined) {
        if(petType.fee < 0) {
            errors.push('Monthly fee cannot be negative');
        } else if(petType.fee > 1000) {
            errors.push('Monthly fee cannot exceed $1,000');
        }
    }

    if(petType.deposit !== undefined) {
        if(petType.deposit < 0) {
            errors.push('Deposit cannot be negative');
        } else if(petType.deposit > 10000) {
            errors.push('Deposit cannot exceed $10,000');
        }
    }
}

/**
 * Validates breed restrictions for pet type policy
 */
function validatePetTypeBreedRestrictions(petType: import('./petPolicyTypes').PetTypePolicy, errors: string[]): void {
    if(petType.breedRestrictions) {
        const duplicates = findDuplicates(petType.breedRestrictions);
        if(duplicates.length > 0) {
            errors.push(`Duplicate breed restrictions: ${duplicates.join(', ')}`);
        }

        const emptyRestrictions = filter(petType.breedRestrictions, breed => !trim(breed));
        if(emptyRestrictions.length > 0) {
            errors.push('Breed restrictions cannot be empty');
        }
    }
}

/**
 * Validates an individual pet type policy
 */
function validatePetTypePolicy(petType: import('./petPolicyTypes').PetTypePolicy, _index: number): string[] {
    const errors: string[] = [];

    if(!petType.type) {
        errors.push('Pet type is required');
    }

    validatePetTypeWeightLimit(petType, errors);
    validatePetTypeCountLimit(petType, errors);
    validatePetTypeFees(petType, errors);
    validatePetTypeBreedRestrictions(petType, errors);

    return errors;
}

/**
 * Finds duplicate values in an array
 */
function findDuplicates<T>(arr: T[]): T[] {
    const seen = new Set<T>();
    const duplicates = new Set<T>();

    for(const item of arr) {
        if(seen.has(item)) {
            duplicates.add(item);
        } else {
            seen.add(item);
        }
    }

    return Array.from(duplicates);
}

/**
 * Validates that breed name is valid
 */
export function validateBreedName(breed: string): boolean {
    if(!breed || !isString(breed)) {
        return false;
    }

    const trimmed = trim(breed);
    if(trimmed.length === 0) {
        return false;
    }
    if(trimmed.length > 100) {
        return false;
    }

    // Allow letters, spaces, hyphens, and apostrophes
    const validPattern = /^[a-z\s\-']+$/i;
    return validPattern.test(trimmed);
}

/**
 * Validates numeric input for pet policy fields
 */
export function validateNumericInput(value: unknown, min = 0, max = Infinity): { isValid: boolean, error?: string } {
    if(value === null || value === undefined || value === '') {
        return { isValid: true }; // Optional fields
    }

    const num = Number(value);

    if(isNaN(num)) {
        return { isValid: false, error: 'Must be a valid number' };
    }

    if(num < min) {
        return { isValid: false, error: `Must be at least ${min}` };
    }

    if(num > max) {
        return { isValid: false, error: `Cannot exceed ${max}` };
    }

    return { isValid: true };
}

/**
 * Gets field-specific validation limits
 */
export const VALIDATION_LIMITS = {
    maxCount:        { min: 1, max: 10 },
    weightLimit:     { min: 1, max: 500 },
    deposit:         { min: 0, max: 10000 },
    monthlyFee:      { min: 0, max: 1000 },
    oneTimeFee:      { min: 0, max: 10000 },
    notesLength:     1000,
    breedNameLength: 100
} as const;

/**
 * Validates a complete pet policy form
 */
export function validatePetPolicyForm(formData: FormData, required = false): PetPolicyValidationResult {
    try {
        const petPolicyData = formData.get('petPolicy') as string;
        if(!petPolicyData) {
            if(required) {
                return {
                    isValid: false,
                    errors:  { general: 'Pet policy data is missing' }
                };
            }
            return { isValid: true, errors: {} };
        }

        const policy: ExtendedPetPolicy = JSON.parse(petPolicyData);
        return validatePetPolicy(policy, required);
    } catch{
        return {
            isValid: false,
            errors:  { general: 'Invalid pet policy data format' }
        };
    }
}

/**
 * Validates numeric fields using their limits from VALIDATION_LIMITS
 */
function validateNumericFieldValue(fieldName: string, value: unknown): string | null {
    const limits = VALIDATION_LIMITS[fieldName as keyof typeof VALIDATION_LIMITS];
    if(isObject(limits) && 'min' in limits && 'max' in limits) {
        const result = validateNumericInput(value, limits.min, limits.max);
        return result.error ?? null;
    }
    return null;
}

/**
 * Real-time validation for Alpine.js
 */
export function createRealTimeValidator() {
    return {
        validateField(fieldName: string, value: unknown, _policy: ExtendedPetPolicy): string | null {
            // Handle numeric fields with common validation pattern
            if(['maxCount', 'weightLimit', 'deposit', 'monthlyFee', 'oneTimeFee'].includes(fieldName)) {
                return validateNumericFieldValue(fieldName, value);
            }

            // Handle special validation cases
            switch(fieldName) {
                case 'breedName': {
                    return validateBreedName(value as string) ? null : 'Invalid breed name';
                }

                case 'notes': {
                    const notes = value as string;
                    return notes && notes.length > VALIDATION_LIMITS.notesLength ? `Notes cannot exceed ${VALIDATION_LIMITS.notesLength} characters` : null;
                }

                default: {
                    return null;
                }
            }
        }
    };
}
