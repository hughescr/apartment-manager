import type { BuildingData } from '../../../types';
import { trim, forEach, isNumber } from 'lodash';
import { safeNumberConversion } from './basicFieldValidators';

/**
 * Validates rent specials
 */
export function validateRentSpecials(building: BuildingData, errors: Record<string, string>): boolean {
    let isValid = true;

    if(building.rentSpecials && building.rentSpecials.length > 0) {
        forEach(building.rentSpecials, (special, index) => {
            if(!special.title || trim(special.title) === '') {
                errors[`rentSpecial${index}Title`] = 'Rent special title is required';
                isValid = false;
            }

            if(special.startDate && special.endDate && new Date(special.startDate).getTime() > new Date(special.endDate).getTime()) {
                errors[`rentSpecial${index}Dates`] = 'Start date must be before end date';
                isValid = false;
            }
        });
    }

    return isValid;
}

/**
 * Validates income restrictions
 */
export function validateIncomeRestrictions(building: BuildingData, errors: Record<string, string>): boolean {
    if(building.incomeRestrictions?.amiLimit != null) {
        const amiLimit = isNumber(building.incomeRestrictions.amiLimit)
            ? building.incomeRestrictions.amiLimit
            : Number(building.incomeRestrictions.amiLimit);

        if(!isNaN(amiLimit) && (amiLimit < 0 || amiLimit > 200)) {
            errors.amiLimit = 'AMI limit must be between 0 and 200%';
            return false;
        }
    }
    return true;
}

/**
 * Validates AMI limit field
 */
export function validateAmiLimitField(value: unknown): string | null {
    const numValue = safeNumberConversion(value);

    if(numValue === null) {
        return null;
    }

    if(numValue < 0 || numValue > 200) {
        return 'AMI limit must be between 0 and 200%';
    }
    return null;
}
