import type { BuildingData } from '../../../types';
import { safeNumberConversion } from './basicFieldValidators';

/**
 * Validates year built field in building context
 */
export function validateYearBuilt(building: BuildingData, errors: Record<string, string>): boolean {
    const yearBuilt = building.yearBuilt;
    if(yearBuilt != null && (yearBuilt < 1800 || yearBuilt > new Date().getFullYear() + 1)) {
        errors.yearBuilt = 'Year built must be between 1800 and next year';
        return false;
    }
    return true;
}

/**
 * Validates year built field for single field validation
 */
export function validateYearBuiltField(value: unknown): string | null {
    const numValue = safeNumberConversion(value);

    if(numValue === null) {
        return null;
    }

    if(numValue < 1800 || numValue > new Date().getFullYear() + 1) {
        return 'Year built must be between 1800 and next year';
    }
    return null;
}
