/**
 * Validation Module Index
 *
 * Re-exports all validation functions and types for backward compatibility.
 * This maintains the existing API while organizing code into domain-specific modules.
 */

// Export all types
export type {
    ValidationResult,
    ValidationError,
    MissingMITSField,
    SiteRequirements
} from './types';

// Export type definitions from draft and published schemas
export type {
    BuildingDraftInput,
    UnitTypeDraftInput,
    UnitDraftInput
} from './draft';

export type {
    BuildingPublishedInput,
    UnitTypePublishedInput,
    UnitPublishedInput
} from './published';

// Export security validation functions
export {
    performSecurityValidations,
    sanitizeDataForSecurity
} from './security-validator';

// Export building-specific validation functions
export {
    validateBuildingForSave,
    validateBuildingForPublish
} from './building-validator';

// Export unit and unit type validation functions
export {
    validateUnitTypeForSave,
    validateUnitTypeForPublish,
    validateUnitForSave,
    validateUnitForPublish
} from './unit-validator';

// Export MITS validation functions
export {
    getMissingMITSFields,
    canPublishToSite
} from './mits-validator';

// Main validation functions that route to appropriate validators
import {
    validateBuildingForSave,
    validateBuildingForPublish
} from './building-validator';

import {
    validateUnitTypeForSave,
    validateUnitTypeForPublish,
    validateUnitForSave,
    validateUnitForPublish
} from './unit-validator';

import { ValidationResult } from './types';

/**
 * Validates data for saving (draft mode) - uses permissive validation
 * Accepts building, unitType, or unit data and returns validation result
 * with clear error messages. Allows partial/incomplete data.
 *
 * @param entityType - Type of entity being validated
 * @param data - The data to validate
 * @returns ValidationResult with success status and any errors
 */
export function validateForSave(
    entityType: 'building' | 'unitType' | 'unit',
    data: unknown
): ValidationResult {
    switch(entityType) {
        case 'building':
            return validateBuildingForSave(data);
        case 'unitType':
            return validateUnitTypeForSave(data);
        case 'unit':
            return validateUnitForSave(data);
        default:
            return {
                success: false,
                errors:  [{
                    field:   'entityType',
                    message: `Unknown entity type: ${String(entityType)}`,
                    code:    'INVALID_ENTITY_TYPE'
                }]
            };
    }
}

/**
 * Validates data for publishing - uses strict MITS schemas
 * Validates against MITS 4.1 requirements and returns detailed errors
 * explaining what's missing. Includes field-level MITS requirement explanations.
 *
 * @param entityType - Type of entity being validated
 * @param data - The data to validate
 * @returns ValidationResult with detailed MITS compliance errors
 */
export function validateForPublish(
    entityType: 'building' | 'unitType' | 'unit',
    data: unknown
): ValidationResult {
    switch(entityType) {
        case 'building':
            return validateBuildingForPublish(data);
        case 'unitType':
            return validateUnitTypeForPublish(data);
        case 'unit':
            return validateUnitForPublish(data);
        default:
            return {
                success: false,
                errors:  [{
                    field:   'entityType',
                    message: `Unknown entity type: ${String(entityType)}`,
                    code:    'INVALID_ENTITY_TYPE'
                }]
            };
    }
}
