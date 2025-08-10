import type { VacancyClass } from '../../src/types';
import _ from 'lodash';

/**
 * Domain service for unit status management
 * Encapsulates business rules around unit status transitions and validation
 */

export interface StatusTransition {
    from: VacancyClass | null
    to: VacancyClass
    isValid: boolean
    reason?: string
}

export interface StatusValidationResult {
    isValid: boolean
    errors: string[]
    warnings?: string[]
}

/**
 * All valid vacancy classes according to MITS specification
 */
export const VALID_VACANCY_CLASSES: readonly VacancyClass[] = ['Occupied', 'Unoccupied', 'Notice', 'Down'] as const;

/**
 * Determine if a unit is occupied based on vacancy class
 * Core business rule for occupied status
 */
export function isUnitOccupied(vacancyClass: VacancyClass): boolean {
    // Business rule: Only 'Occupied' vacancy class means the unit is occupied
    return vacancyClass === 'Occupied';
}

/**
 * Get the default availability status based on vacancy class
 */
export function getDefaultAvailabilityStatus(vacancyClass: VacancyClass): boolean {
    // Business rule: Unit is available if it's Unoccupied or Notice
    return vacancyClass === 'Unoccupied' || vacancyClass === 'Notice';
}

/**
 * Validate a vacancy class value
 */
export function validateVacancyClass(vacancyClass: VacancyClass | string | null | undefined): StatusValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if(!vacancyClass) {
        errors.push('Vacancy class is required');
        return { isValid: false, errors };
    }

    if(!_.isString(vacancyClass)) {
        errors.push('Vacancy class must be a string');
        return { isValid: false, errors };
    }

    const trimmedValue = _.trim(vacancyClass);
    if(trimmedValue === '') {
        errors.push('Vacancy class cannot be empty');
        return { isValid: false, errors };
    }

    if(!VALID_VACANCY_CLASSES.includes(trimmedValue as VacancyClass)) {
        errors.push(`Invalid vacancy class. Must be one of: ${VALID_VACANCY_CLASSES.join(', ')}`);
        return { isValid: false, errors };
    }

    // Add warnings for certain status combinations
    if(trimmedValue === 'Down') {
        warnings.push('Unit marked as "Down" - ensure this is intentional');
    }

    return {
        isValid: true,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined
    };
}

/**
 * Validate status transition logic
 */
export function validateStatusTransition(fromStatus: VacancyClass | null, toStatus: VacancyClass): StatusTransition {
    const transition: StatusTransition = {
        from: fromStatus,
        to: toStatus,
        isValid: true
    };

    // All transitions are valid in this domain, but we can add business rules here
    // For example, certain transitions might require approval or additional validation

    // Add warnings for potentially problematic transitions
    if(fromStatus === 'Occupied' && toStatus === 'Down') {
        transition.reason = 'Moving from Occupied to Down - ensure tenant has been properly relocated';
    } else if(fromStatus === 'Down' && toStatus === 'Occupied') {
        transition.reason = 'Moving from Down to Occupied - ensure all maintenance issues have been resolved';
    } else if(fromStatus === 'Unoccupied' && toStatus === 'Occupied') {
        transition.reason = 'Unit being occupied - lease information should be updated';
    }

    return transition;
}

/**
 * Get human-readable description of vacancy class
 */
export function getVacancyClassDescription(vacancyClass: VacancyClass): string {
    const descriptions: Record<VacancyClass, string> = {
        Occupied: 'Unit is currently occupied by a tenant',
        Unoccupied: 'Unit is vacant and available for rent',
        Notice: 'Current tenant has given notice to vacate',
        Down: 'Unit is unavailable due to maintenance or other issues'
    };

    return descriptions[vacancyClass] || 'Unknown status';
}

/**
 * Get status priority for sorting/filtering purposes
 */
export function getStatusPriority(vacancyClass: VacancyClass): number {
    const priorities: Record<VacancyClass, number> = {
        Down: 1,      // Highest priority - needs attention
        Notice: 2,    // High priority - upcoming vacancy
        Unoccupied: 3, // Medium priority - available for rent
        Occupied: 4   // Lowest priority - stable state
    };

    return priorities[vacancyClass] || 999;
}

/**
 * Determine suggested next status based on current status
 */
export function suggestNextStatus(currentStatus: VacancyClass): VacancyClass[] {
    const suggestions: Record<VacancyClass, VacancyClass[]> = {
        Occupied: ['Notice'], // Tenant might give notice
        Notice: ['Unoccupied', 'Occupied'], // Notice can lead to vacancy or renewal
        Unoccupied: ['Occupied', 'Down'], // Vacant can be rented or need maintenance
        Down: ['Unoccupied'] // Down units should be repaired and become available
    };

    return suggestions[currentStatus] || [];
}

/**
 * Get status statistics for a collection of units
 */
export function getStatusStatistics(units: { vacancyClass?: VacancyClass }[]): Record<VacancyClass, number> & { total: number } {
    const stats: Record<VacancyClass, number> & { total: number } = {
        Occupied: 0,
        Unoccupied: 0,
        Notice: 0,
        Down: 0,
        total: 0
    };

    for(const unit of units) {
        if(unit.vacancyClass && VALID_VACANCY_CLASSES.includes(unit.vacancyClass)) {
            stats[unit.vacancyClass]++;
            stats.total++;
        }
    }

    return stats;
}
