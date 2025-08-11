import type { BuildingData } from '../../../types';
import { safeNumberConversion } from './basicFieldValidators';

/**
 * Validates screening criteria
 */
export function validateScreeningCriteria(building: BuildingData, errors: Record<string, string>): boolean {
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
 * Validates credit score field
 */
export function validateCreditScoreField(value: unknown): string | null {
    const numValue = safeNumberConversion(value);

    if(numValue === null) {
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
export function validateIncomeRatioField(value: unknown): string | null {
    const numValue = safeNumberConversion(value);

    if(numValue === null) {
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
export function validateMaxOccupantsField(value: unknown): string | null {
    const numValue = safeNumberConversion(value);

    if(numValue === null) {
        return null;
    }

    if(numValue < 0 || numValue > 5) {
        return 'Max occupants per bedroom must be between 0 and 5';
    }
    return null;
}
