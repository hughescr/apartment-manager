import type { BuildingData } from '../../../types';
import type { ValidationRule } from '../types';
import { find } from 'lodash';
import { validateField } from './basicFieldValidators';

/**
 * Validation rules for address-related fields
 */
export const ADDRESS_VALIDATION_RULES: ValidationRule[] = [
    {
        field:    'buildingID',
        required: true,
        message:  'Building ID is required'
    },
    {
        field:    'street',
        required: true,
        message:  'Street address is required'
    },
    {
        field:    'city',
        required: true,
        message:  'City is required'
    },
    {
        field:    'state',
        required: true,
        message:  'State is required'
    },
    {
        field:    'zip',
        required: true,
        pattern:  /^\d{5}(-\d{4})?$/,
        message:  'ZIP code must be in format 12345 or 12345-6789'
    }
];

/**
 * Validates address-related building fields
 */
export function validateAddressFields(building: BuildingData, errors: Record<string, string>): boolean {
    let isValid = true;

    for(const rule of ADDRESS_VALIDATION_RULES) {
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
 * Validates ZIP code format
 */
export function validateZipCode(value: unknown): string | null {
    const zipRule = find(ADDRESS_VALIDATION_RULES, { field: 'zip' });
    return zipRule ? validateField(value, [zipRule]) : null;
}
