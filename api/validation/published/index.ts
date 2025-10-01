/**
 * MITS 4.1 Published Validation Schemas
 *
 * This module provides strict validation schemas for publishing apartment data
 * to rental listing sites in compliance with MITS (Multifamily Information and
 * Transactions Standard) 4.1 requirements.
 *
 * These schemas enforce ALL mandatory MITS fields and provide detailed error
 * messages explaining MITS requirements when validation fails.
 *
 * Usage:
 * ```typescript
 * import { BuildingPublishedSchema, validateForMITSPublication } from './published';
 *
 * const result = BuildingPublishedSchema.safeParse(buildingData);
 * if (!result.success) {
 *   // Handle MITS validation errors with specific requirement explanations
 *   console.error('MITS validation failed:', result.error.issues);
 * }
 * ```
 */

import { forEach, map } from 'lodash';
import {
    BuildingPublishedSchema,
    type BuildingPublishedInput,
    MITS_BUILDING_ERROR_MESSAGES
} from './buildingPublishedSchema';
import {
    UnitTypePublishedSchema,
    type UnitTypePublishedInput,
    MITS_UNIT_TYPE_ERROR_MESSAGES
} from './unitTypePublishedSchema';
import {
    UnitPublishedSchema,
    type UnitPublishedInput,
    MITS_UNIT_ERROR_MESSAGES
} from './unitPublishedSchema';

// Re-export all published schemas and types
export {
    BuildingPublishedSchema,
    type BuildingPublishedInput,
    MITS_BUILDING_ERROR_MESSAGES
} from './buildingPublishedSchema';

export {
    UnitTypePublishedSchema,
    type UnitTypePublishedInput,
    MITS_UNIT_TYPE_ERROR_MESSAGES
} from './unitTypePublishedSchema';

export {
    UnitPublishedSchema,
    type UnitPublishedInput,
    MITS_UNIT_ERROR_MESSAGES
} from './unitPublishedSchema';

// Utility function for comprehensive MITS validation
export function validateForMITSPublication(data: {
    building:  unknown
    unitTypes: unknown[]
    units:     unknown[]
}) {
    const results = {
        building:  BuildingPublishedSchema.safeParse(data.building),
        unitTypes: map(data.unitTypes, ut => UnitTypePublishedSchema.safeParse(ut)),
        units:     map(data.units, u => UnitPublishedSchema.safeParse(u)),
        isValid:   true,
        errors:    [] as {
            type:   'building' | 'unitType' | 'unit'
            index?: number
            issues: { path: string, message: string }[]
        }[]
    };

    // Check building validation
    if(!results.building.success) {
        results.isValid = false;
        results.errors.push({
            type:   'building',
            issues: map(results.building.error.issues, issue => ({
                path:    issue.path.join('.'),
                message: issue.message
            }))
        });
    }

    // Check unit type validations
    forEach(results.unitTypes, (result, index) => {
        if(!result.success) {
            results.isValid = false;
            results.errors.push({
                type:   'unitType',
                index,
                issues: map(result.error.issues, issue => ({
                    path:    issue.path.join('.'),
                    message: issue.message
                }))
            });
        }
    });

    // Check unit validations
    forEach(results.units, (result, index) => {
        if(!result.success) {
            results.isValid = false;
            results.errors.push({
                type:   'unit',
                index,
                issues: map(result.error.issues, issue => ({
                    path:    issue.path.join('.'),
                    message: issue.message
                }))
            });
        }
    });

    return results;
}

/**
 * Type guard to check if data meets MITS publication requirements
 */
export function isMITSCompliant(data: {
    building:  unknown
    unitTypes: unknown[]
    units:     unknown[]
}): data is {
    building:  BuildingPublishedInput
    unitTypes: UnitTypePublishedInput[]
    units:     UnitPublishedInput[]
} {
    const validation = validateForMITSPublication(data);
    return validation.isValid;
}

/**
 * Get all MITS error messages for reference
 */
export const ALL_MITS_ERROR_MESSAGES = {
    BUILDING:  MITS_BUILDING_ERROR_MESSAGES,
    UNIT_TYPE: MITS_UNIT_TYPE_ERROR_MESSAGES,
    UNIT:      MITS_UNIT_ERROR_MESSAGES
} as const;
