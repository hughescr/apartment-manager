import type { BuildingData } from '../../types';
import type { ValidationResult } from './types';
import { find, isArray, isObject, keys, filter, isNumber } from 'lodash';
import {
    validateAddressFields,
    validateYearBuilt,
    validateRentSpecials,
    validateIncomeRestrictions,
    validateScreeningCriteria,
    ADDRESS_VALIDATION_RULES,
    validateField,
    validateYearBuiltField,
    validateAmiLimitField,
    validateCreditScoreField,
    validateIncomeRatioField,
    validateMaxOccupantsField
} from './validators';

/**
 * Validates building data and returns validation result
 */
export function validateBuildingForm(building: BuildingData | null): ValidationResult {
    const errors: Record<string, string> = {};

    if(!building) {
        return { isValid: false, errors: { general: 'Building data is required' } };
    }

    const addressValid = validateAddressFields(building, errors);
    const yearValid = validateYearBuilt(building, errors);
    const specialsValid = validateRentSpecials(building, errors);
    const incomeValid = validateIncomeRestrictions(building, errors);
    const screeningValid = validateScreeningCriteria(building, errors);

    const isValid = addressValid && yearValid && specialsValid && incomeValid && screeningValid;

    return { isValid, errors };
}

/**
 * Validates a specific field and returns error message if invalid
 */
export function validateSingleField(
    fieldName: string,
    value: unknown,
    _building?: BuildingData
): string | null {
    const rule = find(ADDRESS_VALIDATION_RULES, { field: fieldName });

    if(rule) {
        return validateField(value, [rule]);
    }

    // Custom field validations
    switch(fieldName) {
        case 'yearBuilt':
            return validateYearBuiltField(value);
        case 'amiLimit':
            return validateAmiLimitField(value);
        case 'minCreditScore':
            return validateCreditScoreField(value);
        case 'incomeRatio':
            return validateIncomeRatioField(value);
        case 'maxOccupantsPerBedroom':
            return validateMaxOccupantsField(value);
        default:
            return null;
    }
}
/**
 * Helper to check if building data has unsaved changes
 * Uses deep comparison with proper handling of initialization states
 */
export function hasUnsavedChanges(building: BuildingData | null, original: BuildingData | null): boolean {
    // If either is null, no changes to compare
    if(!building || !original) {
        return false;
    }

    // Use a more robust deep comparison that handles common serialization issues
    return !isDeepEqual(building, original);
}

/**
 * Checks if two numbers are approximately equal (for floating point coordinates)
 */
function areNumbersEqual(num1: number, num2: number): boolean {
    const epsilon = 1e-10;
    return Math.abs(num1 - num2) < epsilon;
}

/**
 * Compares arrays for deep equality
 */
function areArraysEqual(arr1: unknown[], arr2: unknown[]): boolean {
    if(arr1.length !== arr2.length) {
        return false;
    }
    for(let i = 0; i < arr1.length; i++) {
        if(!isDeepEqual(arr1[i], arr2[i])) {
            return false;
        }
    }
    return true;
}

/**
 * Compares objects for deep equality, handling meaningful keys only
 */
function areObjectsEqual(obj1: Record<string, unknown>, obj2: Record<string, unknown>): boolean {
    const keys1 = keys(obj1);
    const keys2 = keys(obj2);

    // Compare only keys that have meaningful values (ignore undefined)
    const meaningfulKeys1 = filter(keys1, key => obj1[key] !== undefined);
    const meaningfulKeys2 = filter(keys2, key => obj2[key] !== undefined);

    if(meaningfulKeys1.length !== meaningfulKeys2.length) {
        return false;
    }

    for(const key of meaningfulKeys1) {
        if(!meaningfulKeys2.includes(key)) {
            return false;
        }
        if(!isDeepEqual(obj1[key], obj2[key])) {
            return false;
        }
    }

    return true;
}

/**
 * Deep comparison function that handles common serialization issues
 * that can cause false positives with JSON.stringify comparison
 */
function isDeepEqual(obj1: unknown, obj2: unknown): boolean {
    // Same reference
    if(obj1 === obj2) {
        return true;
    }

    // One is null/undefined
    if(obj1 == null || obj2 == null) {
        return obj1 === obj2;
    }

    // Different types
    if(typeof obj1 !== typeof obj2) {
        return false;
    }

    // Handle arrays
    if(isArray(obj1) && isArray(obj2)) {
        return areArraysEqual(obj1, obj2);
    }

    // Handle primitive types with special case for numbers
    if(!isObject(obj1)) {
        // Special handling for floating point coordinates
        if(isNumber(obj1) && isNumber(obj2)) {
            return areNumbersEqual(obj1, obj2);
        }
        return obj1 === obj2;
    }

    // Handle objects
    return areObjectsEqual(obj1 as Record<string, unknown>, obj2 as Record<string, unknown>);
}
