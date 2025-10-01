// CRITICAL: Import test setup FIRST before any other imports
import '../test-setup';

import { describe, it, expect } from 'bun:test';
import type { VacancyClass } from '../../../src/types';
import { forEach, isArray } from 'lodash';
import {
    VALID_VACANCY_CLASSES,
    isUnitOccupied,
    getDefaultAvailabilityStatus,
    validateVacancyClass,
    validateStatusTransition,
    getVacancyClassDescription,
    getStatusPriority,
    suggestNextStatus,
    getStatusStatistics
} from '../../../data/services/unit-status';

describe('Unit Status Service', () => {
    describe('VALID_VACANCY_CLASSES', () => {
        it('should contain all expected vacancy classes', () => {
            expect(VALID_VACANCY_CLASSES).toEqual(['Occupied', 'Unoccupied', 'Notice', 'Down']);
        });

        it('should be readonly array', () => {
            expect(isArray(VALID_VACANCY_CLASSES)).toBe(true);
            // The readonly nature is enforced at TypeScript compile time
            // At runtime, the array is still mutable but readonly in TypeScript
            expect(VALID_VACANCY_CLASSES.length).toBe(4);
        });
    });

    describe('isUnitOccupied', () => {
        it('should return true only for Occupied status', () => {
            expect(isUnitOccupied('Occupied')).toBe(true);
        });

        it('should return false for all other statuses', () => {
            expect(isUnitOccupied('Unoccupied')).toBe(false);
            expect(isUnitOccupied('Notice')).toBe(false);
            expect(isUnitOccupied('Down')).toBe(false);
        });
    });

    describe('getDefaultAvailabilityStatus', () => {
        it('should return true for available statuses', () => {
            expect(getDefaultAvailabilityStatus('Unoccupied')).toBe(true);
            expect(getDefaultAvailabilityStatus('Notice')).toBe(true);
        });

        it('should return false for unavailable statuses', () => {
            expect(getDefaultAvailabilityStatus('Occupied')).toBe(false);
            expect(getDefaultAvailabilityStatus('Down')).toBe(false);
        });
    });

    describe('validateVacancyClass', () => {
        it('should validate all valid vacancy classes', () => {
            const validClasses: VacancyClass[] = ['Occupied', 'Unoccupied', 'Notice', 'Down'];

            for(const vacancyClass of validClasses) {
                const result = validateVacancyClass(vacancyClass);
                expect(result.isValid).toBe(true);
                expect(result.errors).toEqual([]);
            }
        });

        it('should reject null vacancy class', () => {
            const result = validateVacancyClass(null);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Vacancy class is required');
        });

        it('should reject undefined vacancy class', () => {
            const result = validateVacancyClass(undefined);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Vacancy class is required');
        });

        it('should reject non-string vacancy class', () => {
            const result = validateVacancyClass(123 as unknown as VacancyClass);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Vacancy class must be a string');
        });

        it('should reject empty string', () => {
            const result = validateVacancyClass('');

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Vacancy class is required');
        });

        it('should reject whitespace-only string', () => {
            const result = validateVacancyClass('   ');

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Vacancy class cannot be empty');
        });

        it('should reject invalid vacancy class', () => {
            const result = validateVacancyClass('InvalidStatus');

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid vacancy class. Must be one of: Occupied, Unoccupied, Notice, Down');
        });

        it('should be case sensitive', () => {
            const result = validateVacancyClass('occupied');

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid vacancy class. Must be one of: Occupied, Unoccupied, Notice, Down');
        });

        it('should trim whitespace before validation', () => {
            const result = validateVacancyClass('  Occupied  ');

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should provide warning for Down status', () => {
            const result = validateVacancyClass('Down');

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
            expect(result.warnings).toContain('Unit marked as "Down" - ensure this is intentional');
        });

        it('should not provide warnings for other statuses', () => {
            const statusesWithoutWarnings: VacancyClass[] = ['Occupied', 'Unoccupied', 'Notice'];

            forEach(statusesWithoutWarnings, (status) => {
                const result = validateVacancyClass(status);
                expect(result.isValid).toBe(true);
                expect(result.warnings).toBeUndefined();
            });
        });
    });

    describe('validateStatusTransition', () => {
        it('should allow all transitions as valid', () => {
            const fromStatuses: (VacancyClass | null)[] = [null, 'Occupied', 'Unoccupied', 'Notice', 'Down'];
            const toStatuses: VacancyClass[] = ['Occupied', 'Unoccupied', 'Notice', 'Down'];

            forEach(fromStatuses, (fromStatus) => {
                forEach(toStatuses, (toStatus) => {
                    const result = validateStatusTransition(fromStatus, toStatus);
                    expect(result.isValid).toBe(true);
                    expect(result.from).toBe(fromStatus);
                    expect(result.to).toBe(toStatus);
                });
            });
        });

        it('should provide reason for Occupied to Down transition', () => {
            const result = validateStatusTransition('Occupied', 'Down');

            expect(result.isValid).toBe(true);
            expect(result.reason).toBe('Moving from Occupied to Down - ensure tenant has been properly relocated');
        });

        it('should provide reason for Down to Occupied transition', () => {
            const result = validateStatusTransition('Down', 'Occupied');

            expect(result.isValid).toBe(true);
            expect(result.reason).toBe('Moving from Down to Occupied - ensure all maintenance issues have been resolved');
        });

        it('should provide reason for Unoccupied to Occupied transition', () => {
            const result = validateStatusTransition('Unoccupied', 'Occupied');

            expect(result.isValid).toBe(true);
            expect(result.reason).toBe('Unit being occupied - lease information should be updated');
        });

        it('should not provide reason for routine transitions', () => {
            const routineTransitions = [
                ['Occupied', 'Notice'],
                ['Notice', 'Unoccupied'],
                ['Unoccupied', 'Down'],
                ['Down', 'Unoccupied'],
                ['Notice', 'Occupied']
            ];

            forEach(routineTransitions, ([from, to]) => {
                const result = validateStatusTransition(from as VacancyClass, to as VacancyClass);
                expect(result.isValid).toBe(true);
                expect(result.reason).toBeUndefined();
            });
        });

        it('should handle null from status', () => {
            const result = validateStatusTransition(null, 'Occupied');

            expect(result.isValid).toBe(true);
            expect(result.from).toBe(null);
            expect(result.to).toBe('Occupied');
        });
    });

    describe('getVacancyClassDescription', () => {
        it('should return correct descriptions for all vacancy classes', () => {
            const expectedDescriptions = {
                Occupied:   'Unit is currently occupied by a tenant',
                Unoccupied: 'Unit is vacant and available for rent',
                Notice:     'Current tenant has given notice to vacate',
                Down:       'Unit is unavailable due to maintenance or other issues'
            };

            forEach(Object.entries(expectedDescriptions), ([status, expectedDescription]) => {
                const result = getVacancyClassDescription(status as VacancyClass);
                expect(result).toBe(expectedDescription);
            });
        });

        it('should return default description for unknown status', () => {
            const result = getVacancyClassDescription('InvalidStatus' as VacancyClass);

            expect(result).toBe('Unknown status');
        });
    });

    describe('getStatusPriority', () => {
        it('should return correct priorities', () => {
            const expectedPriorities = {
                Down:       1,      // Highest priority
                Notice:     2,    // High priority
                Unoccupied: 3, // Medium priority
                Occupied:   4   // Lowest priority
            };

            forEach(Object.entries(expectedPriorities), ([status, expectedPriority]) => {
                const result = getStatusPriority(status as VacancyClass);
                expect(result).toBe(expectedPriority);
            });
        });

        it('should return default priority for unknown status', () => {
            const result = getStatusPriority('InvalidStatus' as VacancyClass);

            expect(result).toBe(999);
        });

        it('should have correct priority order', () => {
            const priorities = [
                getStatusPriority('Down'),
                getStatusPriority('Notice'),
                getStatusPriority('Unoccupied'),
                getStatusPriority('Occupied')
            ];

            // Should be in ascending order (lower number = higher priority)
            for(let i = 1; i < priorities.length; i++) {
                expect(priorities[i]).toBeGreaterThan(priorities[i - 1]);
            }
        });
    });

    describe('suggestNextStatus', () => {
        it('should suggest Notice for Occupied units', () => {
            const result = suggestNextStatus('Occupied');

            expect(result).toEqual(['Notice']);
        });

        it('should suggest Unoccupied and Occupied for Notice units', () => {
            const result = suggestNextStatus('Notice');

            expect(result).toEqual(['Unoccupied', 'Occupied']);
        });

        it('should suggest Occupied and Down for Unoccupied units', () => {
            const result = suggestNextStatus('Unoccupied');

            expect(result).toEqual(['Occupied', 'Down']);
        });

        it('should suggest Unoccupied for Down units', () => {
            const result = suggestNextStatus('Down');

            expect(result).toEqual(['Unoccupied']);
        });

        it('should return empty array for unknown status', () => {
            const result = suggestNextStatus('InvalidStatus' as VacancyClass);

            expect(result).toEqual([]);
        });

        it('should provide logical workflow suggestions', () => {
            // Test the business logic makes sense
            const occupiedSuggestions = suggestNextStatus('Occupied');
            expect(occupiedSuggestions).toContain('Notice');

            const noticeSuggestions = suggestNextStatus('Notice');
            expect(noticeSuggestions).toContain('Unoccupied');
            expect(noticeSuggestions).toContain('Occupied'); // Tenant could renew

            const unoccupiedSuggestions = suggestNextStatus('Unoccupied');
            expect(unoccupiedSuggestions).toContain('Occupied');
            expect(unoccupiedSuggestions).toContain('Down'); // Might need maintenance

            const downSuggestions = suggestNextStatus('Down');
            expect(downSuggestions).toContain('Unoccupied'); // After repairs
        });
    });

    describe('getStatusStatistics', () => {
        it('should calculate statistics for units with valid statuses', () => {
            const units = [
                { vacancyClass: 'Occupied' as VacancyClass },
                { vacancyClass: 'Occupied' as VacancyClass },
                { vacancyClass: 'Unoccupied' as VacancyClass },
                { vacancyClass: 'Notice' as VacancyClass },
                { vacancyClass: 'Down' as VacancyClass }
            ];

            const result = getStatusStatistics(units);

            expect(result).toEqual({
                Occupied:   2,
                Unoccupied: 1,
                Notice:     1,
                Down:       1,
                total:      5
            });
        });

        it('should handle empty units array', () => {
            const result = getStatusStatistics([]);

            expect(result).toEqual({
                Occupied:   0,
                Unoccupied: 0,
                Notice:     0,
                Down:       0,
                total:      0
            });
        });

        it('should ignore units with invalid vacancy class', () => {
            const units = [
                { vacancyClass: 'Occupied' as VacancyClass },
                { vacancyClass: 'InvalidStatus' as VacancyClass },
                { vacancyClass: 'Unoccupied' as VacancyClass },
                {}  // No vacancyClass property
            ];

            const result = getStatusStatistics(units);

            expect(result).toEqual({
                Occupied:   1,
                Unoccupied: 1,
                Notice:     0,
                Down:       0,
                total:      2
            });
        });

        it('should handle units without vacancyClass property', () => {
            const units = [
                { unitID: 'unit-1' },
                { unitID: 'unit-2', vacancyClass: undefined as unknown as VacancyClass },
                { unitID: 'unit-3', vacancyClass: 'Occupied' as VacancyClass }
            ];

            const result = getStatusStatistics(units);

            expect(result).toEqual({
                Occupied:   1,
                Unoccupied: 0,
                Notice:     0,
                Down:       0,
                total:      1
            });
        });

        it('should handle all units with same status', () => {
            const units = [
                { vacancyClass: 'Occupied' as VacancyClass },
                { vacancyClass: 'Occupied' as VacancyClass },
                { vacancyClass: 'Occupied' as VacancyClass }
            ];

            const result = getStatusStatistics(units);

            expect(result).toEqual({
                Occupied:   3,
                Unoccupied: 0,
                Notice:     0,
                Down:       0,
                total:      3
            });
        });

        it('should handle mixed valid and invalid statuses', () => {
            const units = [
                { vacancyClass: 'Occupied' as VacancyClass },
                { vacancyClass: null as unknown as VacancyClass },
                { vacancyClass: '' as unknown as VacancyClass },
                { vacancyClass: 'Notice' as VacancyClass },
                { vacancyClass: 'occupied' as unknown as VacancyClass }, // wrong case
                { vacancyClass: 'Down' as VacancyClass }
            ];

            const result = getStatusStatistics(units);

            expect(result).toEqual({
                Occupied:   1,
                Unoccupied: 0,
                Notice:     1,
                Down:       1,
                total:      3
            });
        });
    });

    describe('Business Logic Validation', () => {
        it('should have consistent occupied/availability logic', () => {
            const testCases: VacancyClass[] = ['Occupied', 'Unoccupied', 'Notice', 'Down'];

            forEach(testCases, (status) => {
                const isOccupied = isUnitOccupied(status);
                const isAvailable = getDefaultAvailabilityStatus(status);

                // Business rule: Occupied units are not available, available units are not occupied
                if(isOccupied) {
                    expect(isAvailable).toBe(false);
                }

                // However, not all unavailable units are occupied (Down units are unavailable but not occupied)
                if(status === 'Down') {
                    expect(isOccupied).toBe(false);
                    expect(isAvailable).toBe(false);
                }
            });
        });

        it('should have logical status priority ordering', () => {
            // Down should have highest priority (needs immediate attention)
            expect(getStatusPriority('Down')).toBeLessThan(getStatusPriority('Notice'));
            expect(getStatusPriority('Down')).toBeLessThan(getStatusPriority('Unoccupied'));
            expect(getStatusPriority('Down')).toBeLessThan(getStatusPriority('Occupied'));

            // Notice should have higher priority than stable states
            expect(getStatusPriority('Notice')).toBeLessThan(getStatusPriority('Unoccupied'));
            expect(getStatusPriority('Notice')).toBeLessThan(getStatusPriority('Occupied'));

            // Unoccupied should have higher priority than Occupied (potential income)
            expect(getStatusPriority('Unoccupied')).toBeLessThan(getStatusPriority('Occupied'));
        });

        it('should suggest logical next statuses based on rental workflow', () => {
            // From Occupied, tenant might give notice
            expect(suggestNextStatus('Occupied')).toContain('Notice');

            // From Notice, tenant might leave (Unoccupied) or renew (Occupied)
            const noticeNext = suggestNextStatus('Notice');
            expect(noticeNext).toContain('Unoccupied');
            expect(noticeNext).toContain('Occupied');

            // From Unoccupied, unit might be rented (Occupied) or need maintenance (Down)
            const unoccupiedNext = suggestNextStatus('Unoccupied');
            expect(unoccupiedNext).toContain('Occupied');
            expect(unoccupiedNext).toContain('Down');

            // From Down, unit should be repaired and become available (Unoccupied)
            expect(suggestNextStatus('Down')).toContain('Unoccupied');
        });
    });
});
