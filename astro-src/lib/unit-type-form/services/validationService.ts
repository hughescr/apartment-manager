import type { UnitTypeData } from '../../../types';
import { keys, trim } from 'lodash';

export interface ValidationErrors {
    [key: string]: string | undefined
    submit?: string // API/network errors
}

/**
 * Unit type form validation service
 * Extracted from UnitTypeForm.astro for reusability and testability
 */
export class UnitTypeValidationService {
    /**
     * Validate unit type form data
     * @param unitType - The unit type data to validate
     * @returns Object containing validation errors keyed by field name
     */
    static validateForm(unitType: Partial<UnitTypeData>): ValidationErrors {
        const errors: ValidationErrors = {};

        // Required fields validation
        this.validateRequiredFields(unitType, errors);

        // Numeric range validation
        this.validateNumericRanges(unitType, errors);

        // Range consistency validation
        this.validateRangeConsistency(unitType, errors);

        return errors;
    }

    /**
     * Check if validation passed (no errors)
     */
    static isValid(errors: ValidationErrors): boolean {
        return keys(errors).length === 0;
    }

    /**
     * Validate required fields
     */
    private static validateRequiredFields(unitType: Partial<UnitTypeData>, errors: ValidationErrors): void {
        if(!unitType.modelID || trim(unitType.modelID) === '') {
            errors.modelID = 'Model ID is required';
        }

        if(!unitType.modelName || trim(unitType.modelName) === '') {
            errors.modelName = 'Model Name is required';
        }
    }

    /**
     * Validate numeric ranges
     */
    private static validateNumericRanges(unitType: Partial<UnitTypeData>, errors: ValidationErrors): void {
        // Validate beds
        if(unitType.beds !== undefined && unitType.beds !== null) {
            if(unitType.beds < 0 || unitType.beds > 10) {
                errors.beds = 'Beds must be between 0 and 10';
            }
        }

        // Validate baths
        if(unitType.baths !== undefined && unitType.baths !== null) {
            if(unitType.baths < 0 || unitType.baths > 10) {
                errors.baths = 'Baths must be between 0 and 10';
            }
        }
    }

    /**
     * Validate range consistency (min vs max values)
     */
    private static validateRangeConsistency(unitType: Partial<UnitTypeData>, errors: ValidationErrors): void {
        // Validate rent range
        if(unitType.minRent && unitType.maxRent && unitType.minRent > unitType.maxRent) {
            errors.rent = 'Minimum rent cannot be greater than maximum rent';
        }

        // Validate square footage range
        if(unitType.minSqft && unitType.maxSqft && unitType.minSqft > unitType.maxSqft) {
            errors.sqft = 'Minimum square footage cannot be greater than maximum';
        }

        // Validate lease term range
        if(unitType.minLeaseTerm && unitType.maxLeaseTerm && unitType.minLeaseTerm > unitType.maxLeaseTerm) {
            errors.lease = 'Minimum lease term cannot be greater than maximum';
        }
    }
}
