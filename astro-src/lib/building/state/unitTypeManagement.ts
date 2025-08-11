import type { UnitTypeData } from '../../../types';
import type { AlpineMagicProperties } from '../../alpine';
import { BuildingDataParser } from './dataParser';
import _ from 'lodash';

export interface UnitTypeManagementState {
    unitTypes: UnitTypeData[]
    showAddUnitTypeDialog: boolean
    newUnitType: Partial<UnitTypeData>
}

/**
 * Unit type management functionality
 * Handles unit type operations, CRUD, and state management
 */
export class UnitTypeManagement {
    constructor(private state: UnitTypeManagementState & AlpineMagicProperties) {}

    /**
     * Initialize unit types data from HTML dataset
     */
    initializeUnitTypesData(element: HTMLElement): void {
        this.state.unitTypes = BuildingDataParser.parseUnitTypesData(element);
    }

    /**
     * Open add unit type dialog
     */
    openAddUnitTypeDialog(): void {
        this.state.showAddUnitTypeDialog = true;
        this.state.newUnitType = {
            modelID: '',
            modelName: '',
            beds: 1,
            baths: 1,
            minSqft: undefined,
            maxSqft: undefined,
            minRent: undefined,
            maxRent: undefined,
            buildingID: ''
        };
    }

    /**
     * Close add unit type dialog
     */
    closeAddUnitTypeDialog(): void {
        this.state.showAddUnitTypeDialog = false;
        this.state.newUnitType = {};
    }

    /**
     * Add new unit type
     */
    addUnitType(): void {
        if(!this.state.newUnitType.modelID || !this.state.newUnitType.modelName) {
            this.state.$dispatch('toast:show', {
                message: 'Model ID and model name are required',
                type: 'error'
            });
            return;
        }

        const unitType: UnitTypeData = {
            buildingID: this.state.newUnitType.buildingID || '',
            modelID: this.state.newUnitType.modelID,
            modelName: this.state.newUnitType.modelName || '',
            beds: this.state.newUnitType.beds || 1,
            baths: this.state.newUnitType.baths || 1,
            minSqft: this.state.newUnitType.minSqft,
            maxSqft: this.state.newUnitType.maxSqft,
            minRent: this.state.newUnitType.minRent,
            maxRent: this.state.newUnitType.maxRent,
            countAvailable: 1,
            modelAmenities: [],
            updatedAt: new Date()
        };

        this.state.unitTypes.push(unitType);
        this.closeAddUnitTypeDialog();

        this.state.$dispatch('toast:show', {
            message: 'Unit type added successfully',
            type: 'success'
        });

        this.state.$dispatch('unit-types:updated', {
            unitTypes: this.state.unitTypes
        });
    }

    /**
     * Update unit type
     */
    updateUnitType(modelID: string, updates: Partial<UnitTypeData>): void {
        const unitTypeIndex = _.findIndex(this.state.unitTypes, { modelID });

        if(unitTypeIndex !== -1) {
            this.state.unitTypes[unitTypeIndex] = {
                ...this.state.unitTypes[unitTypeIndex],
                ...updates,
                updatedAt: new Date()
            };

            this.state.$dispatch('unit-types:updated', {
                unitTypes: this.state.unitTypes
            });
        }
    }

    /**
     * Delete unit type
     */
    deleteUnitType(modelID: string): void {
        if(!confirm(`Are you sure you want to delete unit type ${modelID}?`)) {
            return;
        }

        const initialLength = this.state.unitTypes.length;
        this.state.unitTypes = _.filter(this.state.unitTypes, ut => ut.modelID !== modelID);

        if(this.state.unitTypes.length < initialLength) {
            this.state.$dispatch('toast:show', {
                message: 'Unit type deleted successfully',
                type: 'success'
            });

            this.state.$dispatch('unit-types:updated', {
                unitTypes: this.state.unitTypes
            });
        }
    }

    /**
     * Get unit type by model ID
     */
    getUnitType(modelID: string): UnitTypeData | undefined {
        return _.find(this.state.unitTypes, { modelID });
    }

    /**
     * Get all unit types
     */
    getAllUnitTypes(): UnitTypeData[] {
        return [...this.state.unitTypes];
    }

    /**
     * Get available unit types (for dropdowns)
     */
    getAvailableUnitTypes(): UnitTypeData[] {
        return _.filter(this.state.unitTypes, ut => (ut.countAvailable ?? 0) > 0);
    }

    /**
     * Get unit type statistics
     */
    getUnitTypeStats(): Record<string, { count: number, avgRent: number }> {
        const stats: Record<string, { count: number, avgRent: number, totalRent: number }> = {};

        _.forEach(this.state.unitTypes, (unitType) => {
            if(!stats[unitType.modelID]) {
                stats[unitType.modelID] = {
                    count: 0,
                    avgRent: 0,
                    totalRent: 0
                };
            }

            stats[unitType.modelID].count++;
            const avgRent = (unitType.minRent && unitType.maxRent)
                ? (unitType.minRent + unitType.maxRent) / 2
                : unitType.minRent || unitType.maxRent || 0;
            if(avgRent) {
                stats[unitType.modelID].totalRent += avgRent;
            }
        });

        // Calculate averages
        const result: Record<string, { count: number, avgRent: number }> = {};
        _.forEach(stats, (stat, modelID) => {
            result[modelID] = {
                count: stat.count,
                avgRent: stat.count > 0 ? stat.totalRent / stat.count : 0
            };
        });

        return result;
    }

    /**
     * Validate unit type data
     */
    validateUnitType(unitType: Partial<UnitTypeData>): { isValid: boolean, errors: string[] } {
        const errors: string[] = [];

        // Validate required fields
        this.validateRequiredFields(unitType, errors);

        // Validate numeric ranges
        this.validateNumericRanges(unitType, errors);

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate required fields for unit type
     */
    private validateRequiredFields(unitType: Partial<UnitTypeData>, errors: string[]): void {
        if(!unitType.modelID || _.trim(unitType.modelID) === '') {
            errors.push('Model ID is required');
        }

        if(!unitType.modelName || _.trim(unitType.modelName) === '') {
            errors.push('Model name is required');
        }
    }

    /**
     * Validation rule for numeric fields
     */
    private readonly numericValidationRules = [
        { field: 'beds', min: 0, max: 10, message: 'Beds must be between 0 and 10' },
        { field: 'baths', min: 0, max: 10, message: 'Baths must be between 0 and 10' },
        { field: 'minSqft', min: 0, max: 10000, message: 'Minimum square feet must be between 0 and 10,000' },
        { field: 'maxSqft', min: 0, max: 10000, message: 'Maximum square feet must be between 0 and 10,000' },
        { field: 'minRent', min: 0, max: 50000, message: 'Minimum rent must be between $0 and $50,000' },
        { field: 'maxRent', min: 0, max: 50000, message: 'Maximum rent must be between $0 and $50,000' }
    ] as const;

    /**
     * Validate a single numeric field
     */
    private validateNumericField(
        value: unknown,
        min: number,
        max: number
    ): boolean {
        if(value === undefined || value === null) {
            return true; // Skip validation for undefined/null values
        }
        const numValue = value as number;
        return numValue >= min && numValue <= max;
    }

    /**
     * Validate numeric ranges for unit type
     */
    private validateNumericRanges(unitType: Partial<UnitTypeData>, errors: string[]): void {
        for(const rule of this.numericValidationRules) {
            const value = unitType[rule.field as keyof UnitTypeData];
            if(!this.validateNumericField(value, rule.min, rule.max)) {
                errors.push(rule.message);
            }
        }
    }

    /**
     * Sort unit types by a specific field
     */
    sortUnitTypes(field: keyof UnitTypeData, ascending = true): void {
        this.state.unitTypes.sort((a, b) => {
            const aValue = a[field];
            const bValue = b[field];

            if(aValue == null && bValue == null) {
                return 0;
            }
            if(aValue == null) {
                return ascending ? 1 : -1;
            }
            if(bValue == null) {
                return ascending ? -1 : 1;
            }

            if(_.isString(aValue) && _.isString(bValue)) {
                return ascending
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            if(_.isNumber(aValue) && _.isNumber(bValue)) {
                return ascending ? aValue - bValue : bValue - aValue;
            }

            return 0;
        });
    }
}
