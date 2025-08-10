import type { VacancyClass } from '../../src/types';
import { updateUnit } from '../units';
import { logger } from '@hughescr/logger';
import _ from 'lodash';

/**
 * Domain service for bulk operations on units
 * Handles business logic for bulk unit manipulations
 */

export interface BulkOperationResult {
    success: boolean
    processedUnits: number
    errors: string[]
}

export interface BulkStatusUpdateParams {
    buildingID: string
    unitIDs: string[]
    vacancyClass: VacancyClass
}

export interface BulkRentUpdateParams {
    buildingID: string
    unitIDs: string[]
    updateType: 'absolute' | 'percentage'
    value: number
}

/**
 * Perform bulk status update on multiple units
 */
export async function performBulkStatusUpdate(params: BulkStatusUpdateParams): Promise<BulkOperationResult> {
    const { buildingID, unitIDs, vacancyClass } = params;
    const result: BulkOperationResult = {
        success: true,
        processedUnits: 0,
        errors: []
    };

    logger.info(`Starting bulk status update for ${unitIDs.length} units in building ${buildingID}`);

    for(const unitID of unitIDs) {
        try {
            // Determine occupied status based on vacancy class
            const occupied = determineOccupiedStatus(vacancyClass);

            await updateUnit(buildingID, unitID, {
                vacancyClass,
                occupied
            });

            result.processedUnits++;
            logger.debug(`Updated unit ${unitID} status to ${vacancyClass}`);
        } catch(error) {
            const errorMessage = `Failed to update unit ${unitID}: ${_.isError(error) ? error.message : 'Unknown error'}`;
            result.errors.push(errorMessage);
            logger.error(errorMessage, { error, unitID, buildingID });
        }
    }

    result.success = result.errors.length === 0;
    logger.info(`Bulk status update completed: ${result.processedUnits}/${unitIDs.length} units processed`, {
        success: result.success,
        errors: result.errors.length
    });

    return result;
}

/**
 * Perform bulk rent update on multiple units
 */
export async function performBulkRentUpdate(params: BulkRentUpdateParams): Promise<BulkOperationResult> {
    const { buildingID, unitIDs, updateType, value } = params;
    const result: BulkOperationResult = {
        success: true,
        processedUnits: 0,
        errors: []
    };

    logger.info(`Starting bulk rent update for ${unitIDs.length} units in building ${buildingID}`, {
        updateType,
        value
    });

    for(const unitID of unitIDs) {
        try {
            // Get current unit data to calculate new rent
            const { getUnit } = await import('../units');
            const currentUnit = await getUnit(buildingID, unitID);

            if(!currentUnit) {
                throw new Error(`Unit ${unitID} not found`);
            }

            const newRent = calculateNewRent(currentUnit.rent || 0, updateType, value);

            await updateUnit(buildingID, unitID, {
                rent: newRent
            });

            result.processedUnits++;
            logger.debug(`Updated unit ${unitID} rent to ${newRent}`, {
                originalRent: currentUnit.rent,
                newRent,
                updateType,
                value
            });
        } catch(error) {
            const errorMessage = `Failed to update unit ${unitID} rent: ${_.isError(error) ? error.message : 'Unknown error'}`;
            result.errors.push(errorMessage);
            logger.error(errorMessage, { error, unitID, buildingID });
        }
    }

    result.success = result.errors.length === 0;
    logger.info(`Bulk rent update completed: ${result.processedUnits}/${unitIDs.length} units processed`, {
        success: result.success,
        errors: result.errors.length
    });

    return result;
}

/**
 * Calculate new rent based on update type and value
 * Business rule for rent calculations
 */
function calculateNewRent(currentRent: number, updateType: 'absolute' | 'percentage', value: number): number {
    if(updateType === 'absolute') {
        return value;
    } else {
        // Percentage change
        return Math.round(currentRent * (1 + value / 100));
    }
}

/**
 * Determine occupied status based on vacancy class
 * Business rule for status mapping
 */
function determineOccupiedStatus(vacancyClass: VacancyClass): boolean {
    // Business rule: Only 'Occupied' vacancy class means the unit is occupied
    return vacancyClass === 'Occupied';
}

/**
 * Validate bulk operation parameters
 */
export function validateBulkOperationParams(
    buildingID: string,
    unitIDs: string[]
): { isValid: boolean, errors: string[] } {
    const errors: string[] = [];

    if(!buildingID || _.trim(buildingID) === '') {
        errors.push('Building ID is required');
    }

    if(!unitIDs || !_.isArray(unitIDs) || unitIDs.length === 0) {
        errors.push('At least one unit ID is required');
    } else {
        if(unitIDs.length > 100) {
            errors.push('Cannot update more than 100 units at once');
        }

        // Check for empty or invalid unit IDs
        const invalidUnits = _.filter(unitIDs, (unitID) => {
            if(!unitID || _.trim(unitID) === '') {
                return true;
            }
            // Check for valid ID format (alphanumeric, dash, underscore only)
            if(!/^[\w-]+$/.test(unitID)) {
                return true;
            }
            return false;
        });

        if(invalidUnits.length > 0) {
            errors.push('All unit IDs must be valid (alphanumeric, dash, underscore only)');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate bulk status update specific parameters
 */
export function validateBulkStatusParams(vacancyClass: VacancyClass | ''): { isValid: boolean, errors: string[] } {
    const errors: string[] = [];
    const validStatuses: VacancyClass[] = ['Occupied', 'Unoccupied', 'Notice', 'Down'];

    if(!vacancyClass || _.trim(vacancyClass) === '') {
        errors.push('Vacancy class is required');
    } else if(!validStatuses.includes(vacancyClass as VacancyClass)) {
        errors.push(`Invalid vacancy class. Must be one of: ${validStatuses.join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate bulk rent update specific parameters
 */
export function validateBulkRentParams(
    updateType: 'absolute' | 'percentage',
    value: number
): { isValid: boolean, errors: string[] } {
    const errors: string[] = [];

    if(!updateType || !['absolute', 'percentage'].includes(updateType)) {
        errors.push('Update type must be "absolute" or "percentage"');
    }

    if(isNaN(value) || value < 0) {
        errors.push('Value must be a non-negative number');
    }

    if(updateType === 'absolute' && value === 0) {
        errors.push('Absolute rent amount cannot be zero');
    }

    if(updateType === 'percentage' && Math.abs(value) > 100) {
        errors.push('Percentage change cannot exceed ±100%');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}
