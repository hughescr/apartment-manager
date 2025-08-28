import type { BuildingData, VacancyClass } from '../../../types';
import type { ExtendedUnitData } from '../types';
import type { AlpineMagicProperties } from '../../alpine';
import { UnitsStateManager } from './unitsStateManager';
import { BuildingDataParser } from './dataParser';
import { BuildingApiService } from '../services/buildingApiService';
import { trim, isError } from 'lodash';

export interface UnitManagementState {
    building: BuildingData | null
    units: ExtendedUnitData[]
    filteredUnits: ExtendedUnitData[]
    selectedUnits: Set<string>
    statusFilter: string
    searchQuery: string
    showAddUnitDialog: boolean
    showBulkCreateDialog: boolean
    showAssignUnitTypeDialog: boolean
    newUnit: { unitID: string, modelID: string }
    bulkCreateData: {
        modelID: string
        count: number | null
        patternType: 'numeric' | 'alpha-numeric' | 'custom'
        startingNumber: string
        prefix: string
        suffix: string
        customUnitNumbers: string
        unitNumbers: string[]
        vacancyClass: string
    }
    assignUnitTypeData: {
        selectedUnit: ExtendedUnitData | null
        selectedModelID: string
        keepCustomValues: Record<string, boolean>
        loading: boolean
    }
    bulkOperation: {
        loading: boolean
        statusValue: string
        rentUpdateType: 'absolute' | 'percentage'
        rentValue: number
        errors?: { unitNumber: string, error: string }[]
        successfulUnits?: string[]
    }
    apiURL: string
}

/**
 * Unit management functionality
 * Handles unit operations, filtering, selection, and bulk operations
 */
export class UnitManagement {
    private unitsManager: UnitsStateManager;
    private apiService: BuildingApiService | null = null;

    constructor(private state: UnitManagementState & AlpineMagicProperties) {
        this.unitsManager = new UnitsStateManager(this.state.units, this.state.selectedUnits);
    }

    /**
     * Initialize units data from HTML dataset
     */
    initializeUnitsData(element: HTMLElement): void {
        // Parse units data
        this.state.units = BuildingDataParser.parseUnitsData(element);

        // Initialize timestamps
        BuildingDataParser.initializeUnitTimestamps(this.state.units);

        // Recreate units manager with new data
        this.unitsManager = new UnitsStateManager(this.state.units, this.state.selectedUnits);

        // Initialize API service
        if(this.state.apiURL) {
            this.apiService = new BuildingApiService(this.state.apiURL);
        }
    }

    /**
     * Setup watchers for unit state changes
     */
    setupUnitWatchers(): void {
        // Watch for units changes
        this.state.$watch('units', () => this.updateFilteredUnits());
        this.state.$watch('statusFilter', () => this.updateFilteredUnits());

        // Watch for search query changes
        this.state.$watch('searchQuery', () => {
            if(this.state.searchQuery !== undefined) {
                this.state.$dispatch('units:filter', {
                    filter: this.state.statusFilter,
                    query: this.state.searchQuery
                });
            }
        });

        // Watch for selection changes
        this.state.$watch('selectedUnits', () => {
            this.state.$dispatch('units:selection-changed', {
                selected: Array.from(this.state.selectedUnits)
            });
        });
    }

    /**
     * Update filtered units based on current filter criteria
     */
    updateFilteredUnits(): void {
        this.state.filteredUnits = this.unitsManager.updateFilteredUnits(
            this.state.statusFilter,
            this.state.searchQuery
        );

        this.state.$dispatch('units:updated', {
            filter: this.state.statusFilter,
            query: this.state.searchQuery
        });
    }

    /**
     * Unit selection methods
     */
    toggleSelectAll(): void {
        this.unitsManager.toggleSelectAll(this.state.filteredUnits);
    }

    isUnitSelected(unitID: string): boolean {
        return this.unitsManager.isUnitSelected(unitID);
    }

    toggleUnitSelection(unitID: string): void {
        this.unitsManager.toggleUnitSelection(unitID);
    }

    getSelectedCount(): number {
        return this.unitsManager.getSelectedCount();
    }

    /**
     * Open/close add unit dialog
     */
    openAddUnitDialog(): void {
        this.state.showAddUnitDialog = true;
        this.state.newUnit = { unitID: '', modelID: '' };
    }

    closeAddUnitDialog(): void {
        this.state.showAddUnitDialog = false;
        this.state.newUnit = { unitID: '', modelID: '' };
    }

    /**
     * Open/close bulk create units dialog
     */
    openBulkCreateDialog(modelID?: string): void {
        this.state.showBulkCreateDialog = true;
        // Use Object.assign to avoid type checking issues
        Object.assign(this.state.bulkCreateData, {
            modelID: modelID || '',
            count: null,
            patternType: 'numeric',
            startingNumber: '101',
            prefix: '',
            suffix: '',
            customUnitNumbers: '',
            unitNumbers: [],
            vacancyClass: 'Unoccupied'
        });
    }

    closeBulkCreateDialog(): void {
        this.state.showBulkCreateDialog = false;
        // Use Object.assign to avoid type checking issues
        Object.assign(this.state.bulkCreateData, {
            modelID: '',
            count: null,
            patternType: 'numeric' as const,
            startingNumber: '101',
            prefix: '',
            suffix: '',
            customUnitNumbers: '',
            unitNumbers: [],
            vacancyClass: 'Unoccupied'
        });
        // Clear any previous errors and loading state
        if('errors' in this.state.bulkOperation) {
            this.state.bulkOperation.errors = undefined;
        }
        if('successfulUnits' in this.state.bulkOperation) {
            this.state.bulkOperation.successfulUnits = undefined;
        }
        this.state.bulkOperation.loading = false;
    }

    /**
     * Close dialog with preserved form state (used when there are errors to review)
     */
    closeBulkCreateDialogWithPreservedState(): void {
        this.state.showBulkCreateDialog = false;
        // Clear results but preserve form data for retry
        if('errors' in this.state.bulkOperation) {
            this.state.bulkOperation.errors = undefined;
        }
        if('successfulUnits' in this.state.bulkOperation) {
            this.state.bulkOperation.successfulUnits = undefined;
        }
        this.state.bulkOperation.loading = false;
    }

    /**
     * Open assign unit type dialog
     */
    openAssignUnitTypeDialog(unit: ExtendedUnitData): void {
        this.state.showAssignUnitTypeDialog = true;
        this.state.assignUnitTypeData = {
            selectedUnit: unit,
            selectedModelID: '',
            keepCustomValues: {},
            loading: false
        };
    }

    /**
     * Close assign unit type dialog
     */
    closeAssignUnitTypeDialog(): void {
        this.state.showAssignUnitTypeDialog = false;
        this.state.assignUnitTypeData = {
            selectedUnit: null,
            selectedModelID: '',
            keepCustomValues: {},
            loading: false
        };
    }

    /**
     * Assign unit type to a one-off unit
     */
    async assignUnitType(assignmentData: { selectedModelID: string, keepCustomValues: Record<string, boolean> }): Promise<void> {
        if(!this.state.assignUnitTypeData.selectedUnit || !assignmentData.selectedModelID || !this.apiService || !this.state.building) {
            return;
        }

        const unit = this.state.assignUnitTypeData.selectedUnit;
        this.state.assignUnitTypeData.loading = true;

        try {
            // Create updated unit data
            const updatedUnit = {
                ...unit,
                modelID: assignmentData.selectedModelID,
                lastUpdated: new Date().toISOString()
            };

            // Reset fields to null if they should inherit from the unit type
            const inheritableFields = ['beds', 'baths', 'sqft', 'rent', 'deposit', 'minLeaseTerm', 'maxLeaseTerm', 'maxOccupants', 'perPersonRent'];

            inheritableFields.forEach((field) => {
                // If we're not keeping the custom value, clear it so it inherits
                if(!assignmentData.keepCustomValues[field]) {
                    // Only clear if the unit currently has a value
                    if(unit[field as keyof ExtendedUnitData] !== null && unit[field as keyof ExtendedUnitData] !== undefined) {
                        (updatedUnit as Record<string, unknown>)[field] = null;
                    }
                }
            });

            const result = await this.apiService.updateUnit(this.state.building.buildingID, updatedUnit);

            if(!result.success) {
                throw new Error(result.error || 'Failed to assign unit type');
            }

            // Update local state
            this.unitsManager.updateUnit(unit.unitID, {
                modelID: assignmentData.selectedModelID,
                ...Object.fromEntries(
                    inheritableFields
                        .filter(field => !assignmentData.keepCustomValues[field])
                        .map(field => [field, null])
                ),
                lastUpdated: new Date().toISOString()
            });
            this.updateFilteredUnits();
            this.closeAssignUnitTypeDialog();

            this.state.$dispatch('toast:show', {
                message: `Unit ${unit.unitID} successfully assigned to unit type`,
                type: 'success'
            });
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: 'Failed to assign unit type: ' + (isError(error) ? error.message : 'Unknown error'),
                type: 'error'
            });
        } finally {
            this.state.assignUnitTypeData.loading = false;
        }
    }

    /**
     * Add new unit
     */
    async addUnit(): Promise<void> {
        if(!trim(this.state.newUnit.unitID) || !this.state.newUnit.modelID || !this.apiService || !this.state.building) {
            return;
        }

        try {
            const result = await this.apiService.addUnit(this.state.building.buildingID, {
                ...this.state.newUnit,
                vacancyClass: 'Unoccupied' as VacancyClass
            });

            if(!result.success || !result.data) {
                throw new Error(result.error || 'Failed to add unit');
            }

            this.unitsManager.addUnit(result.data);
            this.updateFilteredUnits();
            this.closeAddUnitDialog();

            this.state.$dispatch('toast:show', {
                message: 'Unit added successfully',
                type: 'success'
            });
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: 'Failed to add unit: ' + (isError(error) ? error.message : 'Unknown error'),
                type: 'error'
            });
        }
    }

    /**
     * Bulk create multiple units
     */
    async performBulkCreateUnits(): Promise<void> {
        if(!this.state.bulkCreateData.unitNumbers.length || !this.state.bulkCreateData.modelID || !this.apiService || !this.state.building) {
            return;
        }

        // Initialize loading state and clear previous errors
        this.state.bulkOperation.loading = true;
        if('errors' in this.state.bulkOperation) {
            this.state.bulkOperation.errors = undefined;
        }
        if('successfulUnits' in this.state.bulkOperation) {
            this.state.bulkOperation.successfulUnits = undefined;
        }

        try {
            const { results, errors } = await this.createUnitsFromNumbers();
            this.finalizeBulkCreation(results, errors);
        } catch(error) {
            this.state.bulkOperation.loading = false;
            this.state.$dispatch('toast:show', {
                message: 'Failed to create units: ' + (isError(error) ? error.message : 'Unknown error'),
                type: 'error'
            });
        }
    }

    /**
     * Create units from the unit numbers list
     */
    private async createUnitsFromNumbers(): Promise<{ results: ExtendedUnitData[], errors: { unitNumber: string, error: string }[] }> {
        const results: ExtendedUnitData[] = [];
        const errors: { unitNumber: string, error: string }[] = [];

        for(const unitNumber of this.state.bulkCreateData.unitNumbers) {
            try {
                const result = await this.apiService!.addUnit(this.state.building!.buildingID, {
                    unitID: unitNumber,
                    unitNumber: unitNumber,
                    modelID: this.state.bulkCreateData.modelID,
                    vacancyClass: this.state.bulkCreateData.vacancyClass as VacancyClass
                });

                if(!result.success || !result.data) {
                    throw new Error(result.error || `Failed to create unit ${unitNumber}`);
                }

                results.push(result.data);
                this.unitsManager.addUnit(result.data);
            } catch(error) {
                errors.push({
                    unitNumber,
                    error: isError(error) ? error.message : 'Unknown error'
                });
            }
        }

        return { results, errors };
    }

    /**
     * Finalize bulk creation and show appropriate messages
     */
    private finalizeBulkCreation(results: ExtendedUnitData[], errors: { unitNumber: string, error: string }[]): void {
        this.updateFilteredUnits();

        // Store errors in state for dialog display
        if('errors' in this.state.bulkOperation) {
            this.state.bulkOperation.errors = errors;
        }
        if('successfulUnits' in this.state.bulkOperation) {
            this.state.bulkOperation.successfulUnits = results
                .map(r => r.unitNumber)
                .filter((unitNumber): unitNumber is string => unitNumber != null);
        }
        this.state.bulkOperation.loading = false;

        const successCount = results.length;
        const totalAttempted = this.state.bulkCreateData.unitNumbers.length;
        const isFullSuccess = successCount === totalAttempted;
        const isCompleteFailure = successCount === 0;

        if(isCompleteFailure) {
            // All units failed - keep dialog open with error details and preserve form state
            this.state.$dispatch('toast:show', {
                message: 'All units failed to create. Please review the errors in the dialog and try again.',
                type: 'error',
                duration: 6000
            });

            // Dialog stays open, form state is preserved for retry
        } else if(isFullSuccess) {
            // Complete success - close dialog and reset form
            this.closeBulkCreateDialog();
            this.state.$dispatch('toast:show', {
                message: `Successfully created all ${successCount} units`,
                type: 'success'
            });
        } else {
            // Partial success - close dialog but show warning toast
            this.closeBulkCreateDialog();
            this.state.$dispatch('toast:show', {
                message: `Created ${successCount} of ${totalAttempted} units (${errors.length} failed). Check the units list for details.`,
                type: 'warning',
                duration: 8000
            });
        }
    }

    /**
     * Toggle unit availability (quick action)
     */
    async toggleUnitAvailability(unit: ExtendedUnitData): Promise<void> {
        if(!this.apiService || !this.state.building) {
            return;
        }

        const newStatus = unit.vacancyClass === 'Occupied' ? 'Unoccupied' : 'Occupied';

        try {
            const updatedUnit = {
                ...unit,
                vacancyClass: newStatus as VacancyClass,
                lastUpdated: new Date().toISOString()
            };

            const result = await this.apiService.updateUnit(this.state.building.buildingID, updatedUnit);

            if(!result.success) {
                throw new Error(result.error || 'Failed to update unit');
            }

            // Update local state
            this.unitsManager.updateUnit(unit.unitID, {
                vacancyClass: newStatus,
                lastUpdated: new Date().toISOString()
            });
            this.updateFilteredUnits();

            this.state.$dispatch('toast:show', {
                message: `Unit ${unit.unitID} status updated to ${newStatus}`,
                type: 'success'
            });
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: 'Failed to update unit: ' + (isError(error) ? error.message : 'Unknown error'),
                type: 'error'
            });
        }
    }

    /**
     * Update unit rent (inline editing)
     */
    async updateUnitRent(unit: ExtendedUnitData, newRentValue: string): Promise<void> {
        if(!this.apiService || !this.state.building) {
            return;
        }

        const rentAmount = parseFloat(newRentValue);
        if(isNaN(rentAmount) || rentAmount < 0 || rentAmount > 25000) {
            this.state.$dispatch('toast:show', {
                message: 'Please enter a valid rent amount between $0 and $25,000',
                type: 'error'
            });
            unit.editingRent = false;
            return;
        }

        unit.savingField = 'rent';
        unit.editingRent = false;

        try {
            const updatedUnit = {
                ...unit,
                rent: rentAmount,
                lastUpdated: new Date().toISOString()
            };

            const result = await this.apiService.updateUnit(this.state.building.buildingID, updatedUnit);

            if(!result.success) {
                throw new Error('Rent update failed');
            }

            // Update local state
            this.unitsManager.updateUnit(unit.unitID, {
                rent: rentAmount,
                lastUpdated: new Date().toISOString()
            });

            this.state.$dispatch('toast:show', {
                message: `Unit ${unit.unitID} rent updated`,
                type: 'success'
            });
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: 'Failed to update rent: ' + (isError(error) ? error.message : 'Unknown error'),
                type: 'error'
            });
        } finally {
            unit.savingField = null;
        }
    }
}
