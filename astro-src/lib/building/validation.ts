import type { BuildingData } from '../../types';
import type { ValidationResult } from './types';
import { find } from 'lodash';
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
 */
export function hasUnsavedChanges(building: BuildingData | null, original: BuildingData | null): boolean {
    if(!building || !original) {
        return false;
    }
    return JSON.stringify(building) !== JSON.stringify(original);
}
