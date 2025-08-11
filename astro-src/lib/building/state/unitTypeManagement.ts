import type { UnitTypeData } from '../../../types';
import type { AlpineMagicProperties } from '../../alpine';
import { BuildingDataParser } from './dataParser';
import { UnitTypeCrud } from './unitTypeCrud';
import { validateUnitType } from './unitTypeValidation';
import { UnitTypeHelpers } from './unitTypeHelpers';
import { values } from 'lodash';

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
        // Validate the new unit type
        const validation = validateUnitType(this.state.newUnitType);
        if(!validation.isValid) {
            const firstError = values(validation.errors)[0] || 'Invalid unit type data';
            this.state.$dispatch('toast:show', {
                message: firstError,
                type: 'error'
            });
            return;
        }

        // Create unit type with defaults
        const unitType = UnitTypeCrud.createNewUnitType(
            this.state.newUnitType.buildingID || '',
            this.state.newUnitType
        );

        // Add to collection
        this.state.unitTypes = UnitTypeCrud.addUnitType(this.state.unitTypes, unitType);
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
        this.state.unitTypes = UnitTypeCrud.updateUnitType(this.state.unitTypes, modelID, updates);

        this.state.$dispatch('unit-types:updated', {
            unitTypes: this.state.unitTypes
        });
    }

    /**
     * Delete unit type
     */
    deleteUnitType(modelID: string): void {
        if(!confirm(`Are you sure you want to delete unit type ${modelID}?`)) {
            return;
        }

        const initialLength = this.state.unitTypes.length;
        this.state.unitTypes = UnitTypeCrud.removeUnitType(this.state.unitTypes, modelID);

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
        return UnitTypeCrud.findUnitType(this.state.unitTypes, modelID);
    }

    /**
     * Get all unit types
     */
    getAllUnitTypes(): UnitTypeData[] {
        return UnitTypeCrud.getAllUnitTypes(this.state.unitTypes);
    }

    /**
     * Get available unit types (for dropdowns)
     */
    getAvailableUnitTypes(): UnitTypeData[] {
        return UnitTypeCrud.getAvailableUnitTypes(this.state.unitTypes);
    }

    /**
     * Get unit type statistics
     */
    getUnitTypeStats(): Record<string, { count: number, avgRent: number }> {
        return UnitTypeHelpers.getUnitTypeStats(this.state.unitTypes);
    }

    /**
     * Validate unit type data
     */
    validateUnitType(unitType: Partial<UnitTypeData>): { isValid: boolean, errors: string[] } {
        const validation = validateUnitType(unitType);
        return {
            isValid: validation.isValid,
            errors: values(validation.errors)
        };
    }

    /**
     * Sort unit types by a specific field
     */
    sortUnitTypes(field: keyof UnitTypeData, ascending = true): void {
        this.state.unitTypes = UnitTypeHelpers.sortUnitTypes(this.state.unitTypes, field, ascending);
    }
}
