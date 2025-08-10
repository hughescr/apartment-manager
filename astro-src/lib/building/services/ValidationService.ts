import type { BuildingData, UnitData } from '../../../types';
import type { ValidationResult } from '../types';
import {
    validateBuildingForm,
    validateSingleField,
    hasUnsavedChanges
} from '../validation';
import { trim, isString, isNumber, assign } from 'lodash';

// New unit data interface
export interface NewUnitData {
    unitID: string
    modelID?: string
}

// Bulk operation data interface
export interface BulkOperationData {
    type: 'status' | 'rent'
    unitIDs: string[]
    statusValue?: string
    rentUpdateType?: 'absolute' | 'percentage'
    rentValue?: number
}

/**
 * ValidationService interface
 * Provides centralized validation logic for building card operations
 */
export interface ValidationService {
    validateBuilding(building: BuildingData | null): ValidationResult
    validateNewUnit(unit: NewUnitData): ValidationResult
    validateBulkOperation(operation: BulkOperationData): ValidationResult
    validateSingleField(fieldName: string, value: unknown, building?: BuildingData): string | null
    hasUnsavedChanges(building: BuildingData | null, original: BuildingData | null): boolean
    getErrorMessages(): Record<string, string>
    setErrors(errors: Record<string, string>): void
    clearErrors(): void
    addError(field: string, message: string): void
    removeError(field: string): void
}

/**
 * Implementation of ValidationService
 * Centralizes all validation logic for building operations
 */
export class ValidationServiceImpl implements ValidationService {
    private errors: Record<string, string> = {};

    /**
     * Validates complete building data
     */
    validateBuilding(building: BuildingData | null): ValidationResult {
        const result = validateBuildingForm(building);
        this.errors = { ...result.errors };
        return result;
    }

    /**
     * Validates new unit data before creation
     */
    validateNewUnit(unit: NewUnitData): ValidationResult {
        const errors: Record<string, string> = {};
        let isValid = true;

        // Validate unit ID
        if(!unit.unitID || trim(unit.unitID) === '') {
            errors.unitID = 'Unit number is required';
            isValid = false;
        } else if(unit.unitID.length > 50) {
            errors.unitID = 'Unit number must be less than 50 characters';
            isValid = false;
        }

        // Validate modelID if provided
        if(unit.modelID && trim(unit.modelID) === '') {
            errors.modelID = 'Model ID cannot be empty if specified';
            isValid = false;
        }

        // Update internal errors if there are validation errors
        if(!isValid) {
            assign(this.errors, errors);
        }

        return { isValid, errors };
    }

    /**
     * Validates bulk operation data
     */
    validateBulkOperation(operation: BulkOperationData): ValidationResult {
        const errors: Record<string, string> = {};
        let isValid = true;

        // Validate basic operation data
        isValid = this.validateBulkOperationBasics(operation, errors) && isValid;

        // Type-specific validation
        if(operation.type === 'status') {
            isValid = this.validateStatusOperation(operation, errors) && isValid;
        } else if(operation.type === 'rent') {
            isValid = this.validateRentOperation(operation, errors) && isValid;
        }

        // Update internal errors if there are validation errors
        if(!isValid) {
            assign(this.errors, errors);
        }

        return { isValid, errors };
    }

    /**
     * Validates basic bulk operation requirements
     */
    private validateBulkOperationBasics(operation: BulkOperationData, errors: Record<string, string>): boolean {
        let isValid = true;

        // Validate unit selection
        if(!operation.unitIDs || operation.unitIDs.length === 0) {
            errors.unitSelection = 'At least one unit must be selected';
            isValid = false;
        }

        // Validate operation type
        if(!operation.type || !['status', 'rent'].includes(operation.type)) {
            errors.operationType = 'Invalid operation type';
            isValid = false;
        }

        return isValid;
    }

    /**
     * Validates status-specific bulk operation data
     */
    private validateStatusOperation(operation: BulkOperationData, errors: Record<string, string>): boolean {
        if(!operation.statusValue || trim(operation.statusValue) === '') {
            errors.statusValue = 'Status value is required';
            return false;
        }

        if(!['Occupied', 'Unoccupied', 'Notice', 'Down'].includes(operation.statusValue)) {
            errors.statusValue = 'Invalid status value';
            return false;
        }

        return true;
    }

    /**
     * Validates rent-specific bulk operation data
     */
    private validateRentOperation(operation: BulkOperationData, errors: Record<string, string>): boolean {
        let isValid = true;

        // Validate rent update type
        if(!operation.rentUpdateType || !['absolute', 'percentage'].includes(operation.rentUpdateType)) {
            errors.rentUpdateType = 'Rent update type must be absolute or percentage';
            isValid = false;
        }

        // Validate rent value
        if(operation.rentValue === null || operation.rentValue === undefined) {
            errors.rentValue = 'Rent value is required';
            isValid = false;
        } else if(!isNumber(operation.rentValue) && !this.isValidNumber(operation.rentValue)) {
            errors.rentValue = 'Rent value must be a valid number';
            isValid = false;
        } else {
            const numValue = Number(operation.rentValue);
            if(operation.rentUpdateType === 'absolute' && numValue < 0) {
                errors.rentValue = 'Absolute rent value cannot be negative';
                isValid = false;
            } else if(operation.rentUpdateType === 'percentage' && (numValue < -100 || numValue > 1000)) {
                errors.rentValue = 'Percentage change must be between -100% and 1000%';
                isValid = false;
            }
        }

        return isValid;
    }

    /**
     * Validates a single field using existing validation logic
     */
    validateSingleField(fieldName: string, value: unknown, building?: BuildingData): string | null {
        return validateSingleField(fieldName, value, building);
    }

    /**
     * Checks if building data has unsaved changes
     */
    hasUnsavedChanges(building: BuildingData | null, original: BuildingData | null): boolean {
        return hasUnsavedChanges(building, original);
    }

    /**
     * Gets current error messages
     */
    getErrorMessages(): Record<string, string> {
        return { ...this.errors };
    }

    /**
     * Sets error messages (replaces all existing errors)
     */
    setErrors(errors: Record<string, string>): void {
        this.errors = { ...errors };
    }

    /**
     * Clears all error messages
     */
    clearErrors(): void {
        this.errors = {};
    }

    /**
     * Adds a single error message
     */
    addError(field: string, message: string): void {
        this.errors[field] = message;
    }

    /**
     * Removes a specific error message
     */
    removeError(field: string): void {
        delete this.errors[field];
    }

    /**
     * Helper method to validate if a value can be converted to a valid number
     */
    private isValidNumber(value: unknown): boolean {
        if(value === null || value === undefined || value === '') {
            return false;
        }
        if(isString(value) && trim(value) === '') {
            return false;
        }
        const numValue = Number(value);
        return !isNaN(numValue) && isFinite(numValue);
    }
}

/**
 * Factory function to create a ValidationService instance
 * This allows for easy testing and potential dependency injection
 */
export function createValidationService(): ValidationService {
    return new ValidationServiceImpl();
}

/**
 * Singleton instance for use throughout the application
 * Use this for consistency across components
 */
export const validationService = createValidationService();

/**
 * Additional validation utilities for complex scenarios
 */
export class ValidationUtils {
    /**
     * Validates unit data for bulk operations
     */
    static validateUnitsForBulkOperation(
        units: UnitData[],
        operation: BulkOperationData
    ): { validUnits: UnitData[], invalidUnits: { unit: UnitData, reason: string }[] } {
        const validUnits: UnitData[] = [];
        const invalidUnits: { unit: UnitData, reason: string }[] = [];

        for(const unit of units) {
            if(!operation.unitIDs.includes(unit.unitID)) {
                continue; // Skip units not selected for operation
            }

            if(operation.type === 'rent') {
                // For rent updates, ensure unit has a current rent value for percentage updates
                if(operation.rentUpdateType === 'percentage' && !unit.rent) {
                    invalidUnits.push({ unit, reason: 'Unit has no current rent for percentage calculation' });
                    continue;
                }
            }

            validUnits.push(unit);
        }

        return { validUnits, invalidUnits };
    }

    /**
     * Validates rent special dates
     */
    static validateRentSpecialDates(startDate?: string, endDate?: string): string | null {
        if(!startDate && !endDate) {
            return null; // No dates specified is valid
        }

        if(startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if(isNaN(start.getTime()) || isNaN(end.getTime())) {
                return 'Invalid date format';
            }

            if(start >= end) {
                return 'Start date must be before end date';
            }

            // Check if dates are not too far in the past or future
            const now = new Date();
            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());

            if(end < oneYearAgo) {
                return 'End date cannot be more than one year in the past';
            }

            if(start > twoYearsFromNow) {
                return 'Start date cannot be more than two years in the future';
            }
        }

        return null;
    }

    /**
     * Validates contact information
     */
    static validateContactInfo(contactInfo?: {
        name?: string
        phone?: string
        email?: string
        propertyWebsite?: string
        managementWebsite?: string
    }): Record<string, string> {
        const errors: Record<string, string> = {};

        if(contactInfo?.email && !this.isValidEmail(contactInfo.email)) {
            errors.email = 'Invalid email format';
        }

        if(contactInfo?.phone && !this.isValidPhoneNumber(contactInfo.phone)) {
            errors.phone = 'Invalid phone number format';
        }

        if(contactInfo?.propertyWebsite && !this.isValidUrl(contactInfo.propertyWebsite)) {
            errors.propertyWebsite = 'Invalid website URL';
        }

        if(contactInfo?.managementWebsite && !this.isValidUrl(contactInfo.managementWebsite)) {
            errors.managementWebsite = 'Invalid website URL';
        }

        return errors;
    }

    /**
     * Email validation regex
     */
    private static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Phone number validation (US format)
     */
    private static isValidPhoneNumber(phone: string): boolean {
        const phoneRegex = /^\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
        return phoneRegex.test(phone);
    }

    /**
     * URL validation
     */
    private static isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch{
            return false;
        }
    }
}

/**
 * Error message constants for consistent messaging
 */
export const VALIDATION_MESSAGES = {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_PHONE: 'Please enter a valid phone number',
    INVALID_URL: 'Please enter a valid URL',
    INVALID_ZIP: 'ZIP code must be in format 12345 or 12345-6789',
    INVALID_YEAR: 'Year built must be between 1800 and next year',
    INVALID_CREDIT_SCORE: 'Credit score must be between 300 and 850',
    INVALID_INCOME_RATIO: 'Income ratio must be between 0 and 10',
    INVALID_AMI_LIMIT: 'AMI limit must be between 0 and 200%',
    INVALID_DATE_RANGE: 'Start date must be before end date',
    NO_UNITS_SELECTED: 'At least one unit must be selected',
    INVALID_RENT_VALUE: 'Please enter a valid rent amount',
    INVALID_PERCENTAGE: 'Percentage must be between -100% and 1000%'
} as const;
