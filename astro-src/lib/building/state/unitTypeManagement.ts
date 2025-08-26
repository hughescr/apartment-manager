import type { UnitTypeData, BuildingData } from '../../../types';
import type { AlpineMagicProperties } from '../../alpine';
import { BuildingDataParser } from './dataParser';
import { UnitTypeCrud } from './unitTypeCrud';
import { validateUnitType } from './unitTypeValidation';
import { UnitTypeHelpers } from './unitTypeHelpers';
import { BuildingApiService } from '../services/buildingApiService';
import { values } from 'lodash';

export interface UnitTypeManagementState {
    unitTypes: UnitTypeData[]
    showAddUnitTypeDialog: boolean
    newUnitType: Partial<UnitTypeData>
    building: BuildingData | null
    apiURL: string
}

/**
 * Unit type management functionality
 * Handles unit type operations, CRUD, and state management
 */
export class UnitTypeManagement {
    private apiService: BuildingApiService | null = null;

    constructor(private state: UnitTypeManagementState & AlpineMagicProperties) {
        // Initialize API service if URL is available
        if(this.state.apiURL) {
            this.apiService = new BuildingApiService(this.state.apiURL);
        }
    }

    /**
     * Initialize unit types data from HTML dataset
     */
    initializeUnitTypesData(element: HTMLElement): void {
        this.state.unitTypes = BuildingDataParser.parseUnitTypesData(element);

        // Initialize API service if URL is available
        if(this.state.apiURL) {
            this.apiService = new BuildingApiService(this.state.apiURL);
        }
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
            buildingID: this.state.building?.buildingID || ''
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
    async addUnitType(): Promise<void> {
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

        // Ensure we have the building ID
        const buildingID = this.state.building?.buildingID;
        if(!buildingID) {
            this.state.$dispatch('toast:show', {
                message: 'Building ID not available',
                type: 'error'
            });
            return;
        }

        try {
            // Create unit type with defaults
            const unitType = UnitTypeCrud.createNewUnitType(
                buildingID,
                this.state.newUnitType
            );

            // Call API if available
            if(this.apiService) {
                const response = await this.apiService.addUnitType(buildingID, unitType);
                if(!response.success) {
                    this.state.$dispatch('toast:show', {
                        message: response.error || 'Failed to save unit type',
                        type: 'error'
                    });
                    // Keep dialog open for retry
                    return;
                }

                // Use the response data if available, otherwise use the local unit type
                const savedUnitType = response.data || unitType;

                // Add to local collection
                this.state.unitTypes = UnitTypeCrud.addUnitType(this.state.unitTypes, savedUnitType);
            } else {
                // Fallback: just update local state if no API
                this.state.unitTypes = UnitTypeCrud.addUnitType(this.state.unitTypes, unitType);
            }

            this.closeAddUnitTypeDialog();

            this.state.$dispatch('toast:show', {
                message: 'Unit type added successfully',
                type: 'success'
            });

            this.state.$dispatch('unit-types:updated', {
                unitTypes: this.state.unitTypes
            });
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
                type: 'error'
            });
            // Keep dialog open for retry on network errors
        }
    }

    /**
     * Update unit type
     */
    async updateUnitType(modelID: string, updates: Partial<UnitTypeData>): Promise<void> {
        const buildingID = this.state.building?.buildingID;
        if(!buildingID) {
            this.state.$dispatch('toast:show', {
                message: 'Building ID not available',
                type: 'error'
            });
            return;
        }

        try {
            // Call API if available
            if(this.apiService) {
                const response = await this.apiService.updateUnitType(buildingID, modelID, updates);
                if(!response.success) {
                    this.state.$dispatch('toast:show', {
                        message: response.error || 'Failed to update unit type',
                        type: 'error'
                    });
                    return;
                }
                // Update local state with response data if available
                if(response.data) {
                    const updatedUnitTypes = UnitTypeCrud.updateUnitType(this.state.unitTypes, modelID, response.data);
                    // Force reactivity by creating a new array reference
                    this.state.unitTypes.length = 0;
                    this.state.unitTypes.push(...updatedUnitTypes);
                } else {
                    const updatedUnitTypes = UnitTypeCrud.updateUnitType(this.state.unitTypes, modelID, updates);
                    // Force reactivity by creating a new array reference
                    this.state.unitTypes.length = 0;
                    this.state.unitTypes.push(...updatedUnitTypes);
                }
            } else {
                // Fallback: just update local state if no API
                const updatedUnitTypes = UnitTypeCrud.updateUnitType(this.state.unitTypes, modelID, updates);
                // Force reactivity by creating a new array reference
                this.state.unitTypes.length = 0;
                this.state.unitTypes.push(...updatedUnitTypes);
            }

            this.state.$dispatch('toast:show', {
                message: 'Unit type updated successfully',
                type: 'success'
            });

            this.state.$dispatch('unit-types:updated', {
                unitTypes: this.state.unitTypes
            });
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
                type: 'error'
            });
        }
    }

    /**
     * Delete unit type
     */
    async deleteUnitType(modelID: string): Promise<void> {
        if(!confirm(`Are you sure you want to delete unit type ${modelID}?`)) {
            return;
        }

        const buildingID = this.state.building?.buildingID;
        if(!buildingID) {
            this.state.$dispatch('toast:show', {
                message: 'Building ID not available',
                type: 'error'
            });
            return;
        }

        try {
            // Call API if available
            if(this.apiService) {
                const response = await this.apiService.deleteUnitType(buildingID, modelID);
                if(!response.success) {
                    this.state.$dispatch('toast:show', {
                        message: response.error || 'Failed to delete unit type',
                        type: 'error'
                    });
                    return;
                }
            }

            // Remove from local state
            const initialLength = this.state.unitTypes.length;
            const updatedUnitTypes = UnitTypeCrud.removeUnitType(this.state.unitTypes, modelID);

            // Force reactivity by creating a new array reference
            this.state.unitTypes.length = 0;
            this.state.unitTypes.push(...updatedUnitTypes);

            if(this.state.unitTypes.length < initialLength) {
                this.state.$dispatch('toast:show', {
                    message: 'Unit type deleted successfully',
                    type: 'success'
                });

                this.state.$dispatch('unit-types:updated', {
                    unitTypes: this.state.unitTypes
                });
            }
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
                type: 'error'
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
