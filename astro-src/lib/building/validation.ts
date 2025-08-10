import type { BuildingData } from '../../types';
import type { ValidationResult, ValidationRule } from './types';
import { isString, trim, forEach, find, isNumber } from 'lodash';

/**
 * Validation rules for building data
 */
const BUILDING_VALIDATION_RULES: ValidationRule[] = [
    {
        field: 'buildingID',
        required: true,
        message: 'Building ID is required'
    },
    {
        field: 'street',
        required: true,
        message: 'Street address is required'
    },
    {
        field: 'city',
        required: true,
        message: 'City is required'
    },
    {
        field: 'state',
        required: true,
        message: 'State is required'
    },
    {
        field: 'zip',
        required: true,
        pattern: /^\d{5}(-\d{4})?$/,
        message: 'ZIP code must be in format 12345 or 12345-6789'
    }
];

/**
 * Checks if a value is required and missing
 */
function isRequiredAndMissing(value: unknown, required: boolean): boolean {
    return required && (value == null || value === '' || (isString(value) && trim(value) === ''));
}

/**
 * Validates pattern for string values - returns true if validation fails (error exists)
 */
function validatePattern(value: unknown, pattern: RegExp): boolean {
    if(value == null || value === '' || !isString(value)) {
        return false; // Not an error for null/empty/non-string values
    }
    return !pattern.test(value); // Return true if pattern fails (error exists)
}

/**
 * Validates numeric range - returns true if validation fails (error exists)
 */
function validateNumericRange(value: unknown, min?: number, max?: number): boolean {
    if(value === null || value === undefined || value === '') {
        return false; // Not an error for null/empty values
    }

    const numValue = Number(value);
    if(isNaN(numValue)) {
        return false; // Not an error for non-numeric values
    }

    return (min !== undefined && numValue < min) || (max !== undefined && numValue > max);
}

/**
 * Validates a single field against its rules
 */
function validateField(value: unknown, rules: ValidationRule[]): string | null {
    for(const rule of rules) {
        if(isRequiredAndMissing(value, rule.required || false)) {
            return rule.message;
        }

        if(rule.pattern && validatePattern(value, rule.pattern)) {
            return rule.message;
        }

        if(validateNumericRange(value, rule.min, rule.max)) {
            return rule.message;
        }
    }

    return null;
}

/**
 * Validates basic building fields
 */
function validateBasicFields(building: BuildingData, errors: Record<string, string>): boolean {
    let isValid = true;

    for(const rule of BUILDING_VALIDATION_RULES) {
        const fieldValue = building[rule.field as keyof BuildingData];
        const error = validateField(fieldValue, [rule]);

        if(error) {
            errors[rule.field] = error;
            isValid = false;
        }
    }

    return isValid;
}

/**
 * Validates year built field
 */
function validateYearBuilt(building: BuildingData, errors: Record<string, string>): boolean {
    const yearBuilt = building.yearBuilt;
    if(yearBuilt != null && (yearBuilt < 1800 || yearBuilt > new Date().getFullYear() + 1)) {
        errors.yearBuilt = 'Year built must be between 1800 and next year';
        return false;
    }
    return true;
}

/**
 * Validates rent specials
 */
function validateRentSpecials(building: BuildingData, errors: Record<string, string>): boolean {
    let isValid = true;

    if(building.rentSpecials && building.rentSpecials.length > 0) {
        forEach(building.rentSpecials, (special, index) => {
            if(!special.title || trim(special.title) === '') {
                errors[`rentSpecial${index}Title`] = 'Rent special title is required';
                isValid = false;
            }

            if(special.startDate && special.endDate && new Date(special.startDate).getTime() > new Date(special.endDate).getTime()) {
                errors[`rentSpecial${index}Dates`] = 'Start date must be before end date';
                isValid = false;
            }
        });
    }

    return isValid;
}

/**
 * Validates income restrictions
 */
function validateIncomeRestrictions(building: BuildingData, errors: Record<string, string>): boolean {
    if(building.incomeRestrictions?.amiLimit != null) {
        const amiLimit = isNumber(building.incomeRestrictions.amiLimit)
            ? building.incomeRestrictions.amiLimit
            : Number(building.incomeRestrictions.amiLimit);

        if(!isNaN(amiLimit) && (amiLimit < 0 || amiLimit > 200)) {
            errors.amiLimit = 'AMI limit must be between 0 and 200%';
            return false;
        }
    }
    return true;
}

/**
 * Validates screening criteria
 */
function validateScreeningCriteria(building: BuildingData, errors: Record<string, string>): boolean {
    let isValid = true;

    if(building.screeningCriteria) {
        const { screeningCriteria } = building;

        const minCreditScore = screeningCriteria.minCreditScore;
        if(minCreditScore != null && (minCreditScore < 300 || minCreditScore > 850)) {
            errors.minCreditScore = 'Credit score must be between 300 and 850';
            isValid = false;
        }

        const incomeRatio = screeningCriteria.incomeRatio;
        if(incomeRatio != null && (incomeRatio < 0 || incomeRatio > 10)) {
            errors.incomeRatio = 'Income ratio must be between 0 and 10';
            isValid = false;
        }

        const maxOccupantsPerBedroom = screeningCriteria.maxOccupantsPerBedroom;
        if(maxOccupantsPerBedroom != null && (maxOccupantsPerBedroom < 0 || maxOccupantsPerBedroom > 5)) {
            errors.maxOccupantsPerBedroom = 'Max occupants per bedroom must be between 0 and 5';
            isValid = false;
        }
    }

    return isValid;
}

/**
 * Validates building data and returns validation result
 */
export function validateBuildingForm(building: BuildingData | null): ValidationResult {
    const errors: Record<string, string> = {};

    if(!building) {
        return { isValid: false, errors: { general: 'Building data is required' } };
    }

    const basicValid = validateBasicFields(building, errors);
    const yearValid = validateYearBuilt(building, errors);
    const specialsValid = validateRentSpecials(building, errors);
    const incomeValid = validateIncomeRestrictions(building, errors);
    const screeningValid = validateScreeningCriteria(building, errors);

    const isValid = basicValid && yearValid && specialsValid && incomeValid && screeningValid;

    return { isValid, errors };
}

/**
 * Validates year built field
 */
function validateYearBuiltField(value: unknown): string | null {
    if(value == null || value === '') {
        return null;
    }

    let numValue: number;
    if(isNumber(value)) {
        numValue = value;
    } else {
        numValue = Number(String(value));
    }

    if(isNaN(numValue)) {
        return null;
    }

    if(numValue < 1800 || numValue > new Date().getFullYear() + 1) {
        return 'Year built must be between 1800 and next year';
    }
    return null;
}

/**
 * Validates AMI limit field
 */
function validateAmiLimitField(value: unknown): string | null {
    if(value == null || value === '') {
        return null;
    }

    let numValue: number;
    if(isNumber(value)) {
        numValue = value;
    } else {
        numValue = Number(String(value));
    }

    if(isNaN(numValue)) {
        return null;
    }

    if(numValue < 0 || numValue > 200) {
        return 'AMI limit must be between 0 and 200%';
    }
    return null;
}

/**
 * Validates credit score field
 */
function validateCreditScoreField(value: unknown): string | null {
    if(value == null || value === '') {
        return null;
    }

    let numValue: number;
    if(isNumber(value)) {
        numValue = value;
    } else {
        numValue = Number(String(value));
    }

    if(isNaN(numValue)) {
        return null;
    }

    if(numValue < 300 || numValue > 850) {
        return 'Credit score must be between 300 and 850';
    }
    return null;
}

/**
 * Validates income ratio field
 */
function validateIncomeRatioField(value: unknown): string | null {
    if(value == null || value === '') {
        return null;
    }

    let numValue: number;
    if(isNumber(value)) {
        numValue = value;
    } else {
        numValue = Number(String(value));
    }

    if(isNaN(numValue)) {
        return null;
    }

    if(numValue < 0 || numValue > 10) {
        return 'Income ratio must be between 0 and 10';
    }
    return null;
}

/**
 * Validates max occupants field
 */
function validateMaxOccupantsField(value: unknown): string | null {
    if(value == null || value === '') {
        return null;
    }

    let numValue: number;
    if(isNumber(value)) {
        numValue = value;
    } else {
        numValue = Number(String(value));
    }

    if(isNaN(numValue)) {
        return null;
    }

    if(numValue < 0 || numValue > 5) {
        return 'Max occupants per bedroom must be between 0 and 5';
    }
    return null;
}

/**
 * Validates a specific field and returns error message if invalid
 */
export function validateSingleField(
    fieldName: string,
    value: unknown,
    _building?: BuildingData
): string | null {
    const rule = find(BUILDING_VALIDATION_RULES, { field: fieldName });

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
