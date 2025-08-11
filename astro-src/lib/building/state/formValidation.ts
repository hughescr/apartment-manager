import type { BuildingData, UnitTypeData } from '../../../types';
import type { ExtendedUnitData } from '../types';
import type { AlpineMagicProperties } from '../../alpine';
import { validateBuildingForm, validateSingleField, hasUnsavedChanges } from '../validation';
import { keys, trim, isString } from 'lodash';

export interface FormValidationState {
    building: BuildingData | null
    original: BuildingData | null
    units: ExtendedUnitData[]
    unitTypes: UnitTypeData[]
    errors: Record<string, string>
    showSave: boolean
}

/**
 * Form validation functionality for building management
 * Provides reactive validation and error handling
 */
export class FormValidation {
    constructor(private state: FormValidationState & AlpineMagicProperties) {}

    /**
     * Setup validation watchers
     */
    setupValidationWatchers(): void {
        // Watch for changes to update showSave state
        this.state.$watch('building', () => {
            this.state.showSave = this.hasUnsavedChanges();
        });
    }

    /**
     * Validate the entire building form
     */
    validateBuildingForm(): boolean {
        const result = validateBuildingForm(this.state.building);
        this.state.errors = result.errors;

        this.state.$dispatch('building:validate', {
            isValid: result.isValid,
            errors: result.errors
        });

        return result.isValid;
    }

    /**
     * Validate a single field and update errors
     */
    validateField(fieldName: string, value: unknown): boolean {
        const error = validateSingleField(fieldName, value, this.state.building || undefined);

        if(error) {
            this.state.errors[fieldName] = error;
            return false;
        } else {
            // Remove error if validation passes
            if(this.state.errors[fieldName]) {
                delete this.state.errors[fieldName];
            }
            return true;
        }
    }

    /**
     * Clear validation errors
     */
    clearErrors(): void {
        this.state.errors = {};
    }

    /**
     * Clear error for specific field
     */
    clearFieldError(fieldName: string): void {
        if(this.state.errors[fieldName]) {
            delete this.state.errors[fieldName];
        }
    }

    /**
     * Check if form has any validation errors
     */
    hasValidationErrors(): boolean {
        return keys(this.state.errors).length > 0;
    }

    /**
     * Get error message for a specific field
     */
    getFieldError(fieldName: string): string | null {
        return this.state.errors[fieldName] || null;
    }

    /**
     * Get all validation errors
     */
    getAllErrors(): Record<string, string> {
        return { ...this.state.errors };
    }

    /**
     * Check if building has unsaved changes
     */
    hasUnsavedChanges(): boolean {
        return hasUnsavedChanges(this.state.building, this.state.original);
    }

    /**
     * Validate required string field
     */
    private validateRequiredString(value: string | undefined, fieldName: string): string | null {
        if(!value || trim(value) === '') {
            return `${fieldName} is required`;
        }
        return null;
    }

    /**
     * Validate numeric range
     */
    private validateNumericRange(
        value: number | undefined | null,
        fieldName: string,
        min: number,
        max: number
    ): string | null {
        if(value !== undefined && value !== null) {
            if(value < min || value > max) {
                return `${fieldName} must be between ${min} and ${max.toLocaleString()}`;
            }
        }
        return null;
    }

    /**
     * Helper to conditionally add validation errors to errors object
     */
    private addErrorIfExists(errors: Record<string, string>, key: string, errorMessage: string | null): void {
        if(errorMessage) {
            errors[key] = errorMessage;
        }
    }

    /**
     * Validate unit data
     */
    validateUnit(unit: Partial<ExtendedUnitData>): { isValid: boolean, errors: Record<string, string> } {
        const errors: Record<string, string> = {};

        // Required fields validation
        this.addErrorIfExists(errors, 'unitID', this.validateRequiredString(unit.unitID, 'Unit ID'));
        this.addErrorIfExists(errors, 'modelID', this.validateRequiredString(unit.modelID, 'Model'));

        // Numeric range validations
        this.addErrorIfExists(errors, 'rent', this.validateNumericRange(unit.rent, 'Rent', 0, 25000));
        this.addErrorIfExists(errors, 'beds', this.validateNumericRange(unit.beds, 'Beds', 0, 10));
        this.addErrorIfExists(errors, 'baths', this.validateNumericRange(unit.baths, 'Baths', 0, 10));
        this.addErrorIfExists(errors, 'sqft', this.validateNumericRange(unit.sqft, 'Square feet', 0, 10000));

        return {
            isValid: keys(errors).length === 0,
            errors
        };
    }

    /**
     * Validate unit type data
     */
    validateUnitType(unitType: Partial<UnitTypeData>): { isValid: boolean, errors: Record<string, string> } {
        const errors: Record<string, string> = {};

        // Required fields validation
        this.addErrorIfExists(errors, 'modelID', this.validateRequiredString(unitType.modelID, 'Model ID'));
        this.addErrorIfExists(errors, 'modelName', this.validateRequiredString(unitType.modelName, 'Model name'));

        // Numeric range validations
        this.addErrorIfExists(errors, 'beds', this.validateNumericRange(unitType.beds, 'Beds', 0, 10));
        this.addErrorIfExists(errors, 'baths', this.validateNumericRange(unitType.baths, 'Baths', 0, 10));
        this.addErrorIfExists(errors, 'minSqft', this.validateNumericRange(unitType.minSqft, 'Minimum square feet', 0, 10000));
        this.addErrorIfExists(errors, 'maxSqft', this.validateNumericRange(unitType.maxSqft, 'Maximum square feet', 0, 10000));
        this.addErrorIfExists(errors, 'minRent', this.validateNumericRange(unitType.minRent, 'Minimum rent', 0, 50000));
        this.addErrorIfExists(errors, 'maxRent', this.validateNumericRange(unitType.maxRent, 'Maximum rent', 0, 50000));

        return {
            isValid: keys(errors).length === 0,
            errors
        };
    }

    /**
     * Validate bulk operation data
     */
    validateBulkOperation(operation: 'status' | 'rent', value: unknown, type?: 'absolute' | 'percentage'): { isValid: boolean, error?: string } {
        if(operation === 'status') {
            if(!value || !isString(value) || trim(value) === '') {
                return { isValid: false, error: 'Status value is required' };
            }

            const validStatuses = ['Occupied', 'Unoccupied', 'Notice', 'Down'];
            if(!validStatuses.includes(value)) {
                return { isValid: false, error: 'Invalid status value' };
            }
        }

        if(operation === 'rent') {
            const rentValue = isString(value) ? parseFloat(value) : Number(value);

            if(isNaN(rentValue)) {
                return { isValid: false, error: 'Rent value must be a number' };
            }

            if(type === 'absolute') {
                if(rentValue < 0 || rentValue > 25000) {
                    return { isValid: false, error: 'Rent must be between $0 and $25,000' };
                }
            } else if(type === 'percentage') {
                if(rentValue < -100 || rentValue > 1000) {
                    return { isValid: false, error: 'Percentage must be between -100% and 1000%' };
                }
            }
        }

        return { isValid: true };
    }

    /**
     * Show validation error as toast
     */
    showValidationError(message: string): void {
        this.state.$dispatch('toast:show', {
            message,
            type: 'error'
        });
    }

    /**
     * Show validation success as toast
     */
    showValidationSuccess(message: string): void {
        this.state.$dispatch('toast:show', {
            message,
            type: 'success'
        });
    }
}
