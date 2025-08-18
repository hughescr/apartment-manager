import { keys } from 'lodash';
// All required types are imported from other modules
import type { UnitCardState } from '../unitCardState';
import { UnitFormValidator, type ValidationErrors, type ValidationResult } from '../formValidation';

/**
 * Service for handling unit validation logic within the unit card state context
 */
export class ValidationService {
    private validator: UnitFormValidator;

    constructor(private state: UnitCardState) {
        this.validator = new UnitFormValidator();
    }

    /**
     * Validate the entire form and update state errors
     */
    validateForm(): boolean {
        if(!this.state.unit) {
            return false;
        }

        const result = this.validator.validateForm(this.state.unit);
        this.state.errors = result.errors;

        if(!result.isValid && this.state.events) {
            this.state.events.validationError(result.errors);
        } else if(result.isValid && this.state.events) {
            this.state.events.validationCleared();
        }

        return result.isValid;
    }

    /**
     * Validate a specific field
     */
    validateField(fieldName: string): string | null {
        if(!this.state.unit) {
            return null;
        }

        return this.validator.validateField(this.state.unit, fieldName);
    }

    /**
     * Get full validation result without updating state
     */
    getValidationResult(): ValidationResult | null {
        if(!this.state.unit) {
            return null;
        }

        return this.validator.validateForm(this.state.unit);
    }

    /**
     * Clear validation error for a specific field
     */
    clearFieldError(fieldName: string): void {
        this.validator.clearFieldError(this.state.errors, fieldName);
    }

    /**
     * Check if there are any validation errors
     */
    hasErrors(): boolean {
        return keys(this.state.errors).length > 0;
    }

    /**
     * Clear all validation errors
     */
    clearAllErrors(): void {
        this.state.errors = {};
    }

    /**
     * Get error for a specific field
     */
    getFieldError(fieldName: string): string | undefined {
        return this.state.errors[fieldName];
    }

    /**
     * Set error for a specific field
     */
    setFieldError(fieldName: string, message: string): void {
        this.state.errors[fieldName] = message;
    }

    /**
     * Get all current errors
     */
    getAllErrors(): ValidationErrors {
        return { ...this.state.errors };
    }

    /**
     * Check if a specific field has an error
     */
    hasFieldError(fieldName: string): boolean {
        return fieldName in this.state.errors;
    }
}
