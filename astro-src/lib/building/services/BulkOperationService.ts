import type { ExtendedUnitData } from '../types';
import type { VacancyClass } from '../../../../src/types';
import { map, trim } from 'lodash';

/**
 * State interface for bulk operations
 */
export interface BulkOperationState {
    loading: boolean
    statusValue: VacancyClass | ''
    rentUpdateType: 'absolute' | 'percentage'
    rentValue: number
}

/**
 * Service for managing bulk operations on units
 * Extracted from buildingState.ts for better separation of concerns
 */
export class BulkOperationService {
    private bulkOperationState: BulkOperationState = {
        loading: false,
        statusValue: '',
        rentUpdateType: 'absolute',
        rentValue: 0
    };

    // Selection management methods

    /**
     * Toggle select all units based on current selection state
     * If all filtered units are selected, deselect all; otherwise select all
     */
    toggleSelectAll(filteredUnits: ExtendedUnitData[], selectedUnits: Set<string>): Set<string> {
        if(selectedUnits.size === filteredUnits.length) {
            // Deselect all
            return new Set<string>();
        } else {
            // Select all filtered units
            return new Set(map(filteredUnits, 'unitID'));
        }
    }

    /**
     * Toggle selection state of a specific unit
     */
    toggleUnitSelection(unitID: string, selectedUnits: Set<string>): Set<string> {
        const newSelection = new Set(selectedUnits);

        if(newSelection.has(unitID)) {
            newSelection.delete(unitID);
        } else {
            newSelection.add(unitID);
        }

        return newSelection;
    }

    /**
     * Check if a unit is currently selected
     */
    isUnitSelected(unitID: string, selectedUnits: Set<string>): boolean {
        return selectedUnits.has(unitID);
    }

    /**
     * Get the count of selected units
     */
    getSelectedCount(selectedUnits: Set<string>): number {
        return selectedUnits.size;
    }

    // Business logic methods

    /**
     * Calculate new rent based on update type and value
     */
    calculateNewRent(currentRent: number, updateType: 'absolute' | 'percentage', value: number): number {
        if(updateType === 'absolute') {
            return value;
        } else {
            // Percentage change
            return Math.round(currentRent * (1 + value / 100));
        }
    }

    /**
     * Determine new status based on current status
     * This is a simplified version - can be extended for more complex business rules
     */
    determineNewStatus(currentStatus: string): VacancyClass {
        // Simple toggle between Occupied and Unoccupied
        return currentStatus === 'Occupied' ? 'Unoccupied' : 'Occupied';
    }

    // Operation state management

    /**
     * Get the current bulk operation state
     */
    getBulkOperationState(): BulkOperationState {
        return { ...this.bulkOperationState };
    }

    /**
     * Set the loading state for bulk operations
     */
    setBulkOperationLoading(loading: boolean): void {
        this.bulkOperationState.loading = loading;
    }

    /**
     * Update bulk operation parameters
     */
    updateBulkOperationState(updates: Partial<BulkOperationState>): void {
        this.bulkOperationState = { ...this.bulkOperationState, ...updates };
    }

    /**
     * Reset bulk operation state to defaults
     */
    resetBulkOperationState(): void {
        this.bulkOperationState = {
            loading: false,
            statusValue: '',
            rentUpdateType: 'absolute',
            rentValue: 0
        };
    }

    // Validation methods

    /**
     * Validate that units are selected for bulk operations
     */
    validateSelectionExists(selectedUnits: Set<string>): { isValid: boolean, message?: string } {
        if(selectedUnits.size === 0) {
            return {
                isValid: false,
                message: 'Please select at least one unit for bulk operations'
            };
        }
        return { isValid: true };
    }

    /**
     * Validate bulk rent update parameters
     */
    validateRentUpdate(rentValue: number, updateType: 'absolute' | 'percentage'): { isValid: boolean, message?: string } {
        if(isNaN(rentValue) || rentValue < 0) {
            return {
                isValid: false,
                message: 'Please enter a valid rent amount'
            };
        }

        if(updateType === 'absolute' && rentValue === 0) {
            return {
                isValid: false,
                message: 'Rent amount cannot be zero'
            };
        }

        if(updateType === 'percentage' && Math.abs(rentValue) > 100) {
            return {
                isValid: false,
                message: 'Percentage change cannot exceed ±100%'
            };
        }

        return { isValid: true };
    }

    /**
     * Validate bulk status update parameters
     */
    validateStatusUpdate(statusValue: VacancyClass | ''): { isValid: boolean, message?: string } {
        if(!statusValue || trim(statusValue) === '') {
            return {
                isValid: false,
                message: 'Please select a status'
            };
        }
        return { isValid: true };
    }

    // Utility methods

    /**
     * Get summary of bulk operation for confirmation
     */
    getBulkOperationSummary(
        selectedUnits: Set<string>,
        operationType: 'status' | 'rent',
        operationDetails: { statusValue?: string, rentValue?: number, updateType?: 'absolute' | 'percentage' }
    ): string {
        const unitCount = selectedUnits.size;
        const unitText = unitCount === 1 ? 'unit' : 'units';

        if(operationType === 'status') {
            return `Update ${unitCount} ${unitText} to status: ${operationDetails.statusValue}`;
        } else {
            const { rentValue, updateType } = operationDetails;
            if(updateType === 'absolute') {
                return `Set rent for ${unitCount} ${unitText} to $${rentValue}`;
            } else {
                const direction = (rentValue || 0) >= 0 ? 'increase' : 'decrease';
                return `${direction} rent for ${unitCount} ${unitText} by ${Math.abs(rentValue || 0)}%`;
            }
        }
    }
}

// Export singleton instance for use across the application
export const bulkOperationService = new BulkOperationService();
