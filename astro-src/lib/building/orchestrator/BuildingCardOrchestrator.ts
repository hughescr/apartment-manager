import type { BuildingData, UnitTypeData, VacancyClass } from '../../../types';
import type { ExtendedUnitData } from '../types';
import type { StateManager } from '../services/StateManager';
import type { ValidationService } from '../services/ValidationService';
import type { ApiService } from '../services/ApiService';
import type { FormatService } from '../services/FormatService';
import type { BulkOperationService } from '../services/BulkOperationService';
import type { FilterService, FilterCriteria } from '../services/FilterService';
import type { DialogService } from '../services/DialogService';
import { buildingEventBus, connectAlpineEventBus } from '../eventBus';
import { assign, forEach, filter, isError, values } from 'lodash';

// Alpine.js magic properties interface
interface AlpineComponent {
    $dispatch: (event: string, detail?: unknown) => void
    $el: HTMLElement & { dataset: Record<string, string> }
    $watch: (expression: string, callback: () => void, options?: { deep?: boolean }) => void
}

/**
 * BuildingCardOrchestrator - Coordinates all services and manages business workflows
 * This class provides the main API for Alpine.js components and orchestrates
 * interactions between various services
 */
export class BuildingCardOrchestrator {
    // Units tab state
    private filteredUnits: ExtendedUnitData[] = [];
    private selectedUnits = new Set<string>();

    constructor(
        private stateManager: StateManager,
        private validationService: ValidationService,
        private apiService: ApiService,
        private formatService: FormatService,
        private bulkOperationService: BulkOperationService,
        private filterService: FilterService,
        private dialogService: DialogService
    ) {}

    /**
     * Initialize the orchestrator with Alpine.js component context
     */
    initialize(alpineContext: AlpineComponent): void {
        const { $dispatch, $el, $watch } = alpineContext;

        // Connect event bus to Alpine.js
        connectAlpineEventBus($dispatch);

        // Parse data from HTML element and initialize state
        const parsedData = this.formatService.parseDataAttributes($el);
        this.stateManager.initializeState($el);
        this.apiService.setBaseUrl(parsedData.apiURL);

        // Initialize units tab
        this.initializeUnitsTab();

        // Setup reactivity watchers
        this.stateManager.setupWatchers($watch);

        // Setup additional watchers for units tab
        $watch('statusFilter', () => this.updateFilteredUnits());
        $watch('searchQuery', () => this.updateFilteredUnits());
    }

    /**
     * Initialize units tab with default updatedAt timestamps
     */
    private initializeUnitsTab(): void {
        // Initialize updatedAt for units that don't have it
        const unitsWithoutUpdatedAt = filter(this.stateManager.units, (unit: ExtendedUnitData) => !unit.updatedAt);
        forEach(unitsWithoutUpdatedAt, (unit: ExtendedUnitData) => {
            unit.updatedAt = new Date().toISOString() as unknown as Date;
            unit.lastUpdated = new Date().toISOString();
        });

        this.updateFilteredUnits();
    }

    /**
     * Update filtered units based on current filter criteria
     */
    updateFilteredUnits(): void {
        const filters = this.filterService.getActiveFilters();
        this.filteredUnits = this.filterService.filterUnits(this.stateManager.units, filters);

        buildingEventBus.emit('units:filter', {
            filter: filters.statusFilter,
            query: filters.searchQuery
        });
    }

    // Business Workflows

    /**
     * Save building changes - main workflow
     */
    async saveBuilding(): Promise<void> {
        if(!this.stateManager.building) {
            buildingEventBus.emit('toast:show', {
                message: 'No building data to save',
                toastType: 'error'
            });
            return;
        }

        // 1. Validate building data
        const validationResult = this.validationService.validateBuilding(this.stateManager.building);
        if(!validationResult.isValid) {
            buildingEventBus.emit('toast:show', {
                message: 'Please fix the validation errors before saving',
                toastType: 'error'
            });
            buildingEventBus.emit('building:validate', {
                isValid: false,
                errors: validationResult.errors
            });
            return;
        }

        // 2. Set saving state
        this.stateManager.saving = true;

        try {
            // 3. Make API call
            const response = await this.apiService.saveBuilding(this.stateManager.building);

            if(response.success) {
                // 4. Update state on success
                this.stateManager.original = { ...this.stateManager.building };
                this.stateManager.showSave = false;

                buildingEventBus.emit('building:save', { building: this.stateManager.building });
                buildingEventBus.emit('toast:show', {
                    message: 'Building saved successfully',
                    toastType: 'success'
                });
            } else {
                throw new Error(response.error || 'Failed to save building');
            }
        } catch(error) {
            buildingEventBus.emit('toast:show', {
                message: isError(error) ? error.message : 'Failed to save building',
                toastType: 'error'
            });
        } finally {
            // 5. Reset saving state
            this.stateManager.saving = false;
        }
    }

    /**
     * Delete building workflow
     */
    async deleteBuilding(): Promise<void> {
        if(!this.stateManager.building) {
            return;
        }

        if(!confirm('Are you sure you want to delete this building and all its units?')) {
            return;
        }

        try {
            const response = await this.apiService.deleteBuilding(this.stateManager.building.buildingID);

            if(response.success) {
                window.location.reload();
            } else {
                throw new Error(response.error || 'Failed to delete building');
            }
        } catch(error) {
            buildingEventBus.emit('toast:show', {
                message: isError(error) ? error.message : 'Failed to delete building',
                toastType: 'error'
            });
        }
    }

    /**
     * Add unit workflow
     */
    async addUnit(): Promise<void> {
        if(!this.stateManager.building) {
            buildingEventBus.emit('toast:show', {
                message: 'No building data available',
                toastType: 'error'
            });
            return;
        }

        // 1. Get new unit data from dialog service
        const newUnitData = this.dialogService.getNewUnitData();

        // 2. Validate new unit data
        const validationResult = this.validationService.validateNewUnit(newUnitData);
        if(!validationResult.isValid) {
            const firstError = values(validationResult.errors)[0];
            buildingEventBus.emit('toast:show', {
                message: firstError || 'Invalid unit data',
                toastType: 'error'
            });
            return;
        }

        // 3. Close dialog
        this.dialogService.closeAddUnitDialog();

        // 4. Prepare unit data for API
        const unitData = {
            unitID: newUnitData.unitID,
            buildingID: this.stateManager.building.buildingID,
            ...(newUnitData.modelID && { modelID: newUnitData.modelID })
        };

        try {
            // 5. Make API call
            const response = await this.apiService.createUnit(
                this.stateManager.building.buildingID,
                unitData
            );

            if(response.success) {
                window.location.reload();
            } else {
                throw new Error(response.error || 'Failed to create unit');
            }
        } catch(error) {
            buildingEventBus.emit('toast:show', {
                message: isError(error) ? error.message : 'Failed to create unit',
                toastType: 'error'
            });
        }
    }

    /**
     * Perform bulk status update workflow
     */
    async performBulkStatusUpdate(): Promise<void> {
        if(!this.stateManager.building) {
            return;
        }

        // 1. Validate selection
        const selectionResult = this.bulkOperationService.validateSelectionExists(this.selectedUnits);
        if(!selectionResult.isValid) {
            buildingEventBus.emit('toast:show', {
                message: selectionResult.message || 'Please select units',
                toastType: 'error'
            });
            return;
        }

        // 2. Get bulk operation state and validate
        const bulkState = this.bulkOperationService.getBulkOperationState();
        const statusResult = this.bulkOperationService.validateStatusUpdate(bulkState.statusValue);
        if(!statusResult.isValid) {
            buildingEventBus.emit('toast:show', {
                message: statusResult.message || 'Please select a status',
                toastType: 'error'
            });
            return;
        }

        // 3. Set loading state
        this.bulkOperationService.setBulkOperationLoading(true);

        try {
            const unitIDs = Array.from(this.selectedUnits);

            // 4. Make API call
            const response = await this.apiService.bulkUpdateStatus(
                this.stateManager.building.buildingID,
                unitIDs,
                bulkState.statusValue
            );

            if(response.success) {
                // 5. Update local data
                forEach(this.stateManager.units, (unit: ExtendedUnitData) => {
                    if(this.selectedUnits.has(unit.unitID)) {
                        assign(unit, {
                            vacancyClass: bulkState.statusValue as VacancyClass,
                            lastUpdated: new Date().toISOString()
                        });
                    }
                });

                buildingEventBus.emit('toast:show', {
                    message: `${unitIDs.length} units updated successfully`,
                    toastType: 'success'
                });

                buildingEventBus.emit('units:bulk-update', {
                    operationType: 'status',
                    unitIDs
                });

                // 6. Reset state
                this.selectedUnits.clear();
                this.dialogService.closeBulkStatusDialog();
                this.updateFilteredUnits();
            } else {
                throw new Error(response.error || 'Bulk update failed');
            }
        } catch(error) {
            buildingEventBus.emit('toast:show', {
                message: isError(error) ? error.message : 'Failed to update units. Please try again.',
                toastType: 'error'
            });
        } finally {
            // 7. Reset loading state
            this.bulkOperationService.setBulkOperationLoading(false);
        }
    }

    /**
     * Perform bulk rent update workflow
     */
    async performBulkRentUpdate(): Promise<void> {
        if(!this.stateManager.building) {
            return;
        }

        // 1. Validate selection
        const selectionResult = this.bulkOperationService.validateSelectionExists(this.selectedUnits);
        if(!selectionResult.isValid) {
            buildingEventBus.emit('toast:show', {
                message: selectionResult.message || 'Please select units',
                toastType: 'error'
            });
            return;
        }

        // 2. Get bulk operation state and validate
        const bulkState = this.bulkOperationService.getBulkOperationState();
        const rentResult = this.bulkOperationService.validateRentUpdate(
            bulkState.rentValue,
            bulkState.rentUpdateType
        );
        if(!rentResult.isValid) {
            buildingEventBus.emit('toast:show', {
                message: rentResult.message || 'Invalid rent value',
                toastType: 'error'
            });
            return;
        }

        // 3. Set loading state
        this.bulkOperationService.setBulkOperationLoading(true);

        try {
            const unitIDs = Array.from(this.selectedUnits);

            // 4. Make API call
            const response = await this.apiService.bulkUpdateRent(
                this.stateManager.building.buildingID,
                unitIDs,
                bulkState.rentUpdateType,
                bulkState.rentValue
            );

            if(response.success) {
                // 5. Update local data
                forEach(this.stateManager.units, (unit: ExtendedUnitData) => {
                    if(this.selectedUnits.has(unit.unitID)) {
                        const newRent = this.bulkOperationService.calculateNewRent(
                            unit.rent || 0,
                            bulkState.rentUpdateType,
                            bulkState.rentValue
                        );
                        assign(unit, {
                            rent: newRent,
                            lastUpdated: new Date().toISOString()
                        });
                    }
                });

                buildingEventBus.emit('toast:show', {
                    message: `${unitIDs.length} units updated successfully`,
                    toastType: 'success'
                });

                buildingEventBus.emit('units:bulk-update', {
                    operationType: 'rent',
                    unitIDs
                });

                // 6. Reset state
                this.selectedUnits.clear();
                this.dialogService.closeBulkRentDialog();
                this.updateFilteredUnits();
            } else {
                throw new Error(response.error || 'Bulk rent update failed');
            }
        } catch(error) {
            buildingEventBus.emit('toast:show', {
                message: isError(error) ? error.message : 'Failed to update rents. Please try again.',
                toastType: 'error'
            });
        } finally {
            // 7. Reset loading state
            this.bulkOperationService.setBulkOperationLoading(false);
        }
    }

    /**
     * Toggle unit availability workflow
     */
    async toggleUnitAvailability(unit: ExtendedUnitData): Promise<void> {
        if(!this.stateManager.building) {
            return;
        }

        const newStatus = this.bulkOperationService.determineNewStatus(unit.vacancyClass || '');

        try {
            const response = await this.apiService.updateUnit(
                this.stateManager.building.buildingID,
                unit.unitID,
                {
                    ...unit,
                    vacancyClass: newStatus as VacancyClass,
                    lastUpdated: new Date().toISOString()
                }
            );

            if(response.success) {
                assign(unit, {
                    vacancyClass: newStatus as VacancyClass,
                    lastUpdated: new Date().toISOString()
                });
                this.updateFilteredUnits();

                buildingEventBus.emit('toast:show', {
                    message: `Unit ${unit.unitNumber || unit.unitID} status updated`,
                    toastType: 'success'
                });
            } else {
                throw new Error(response.error || 'Status update failed');
            }
        } catch(error) {
            buildingEventBus.emit('toast:show', {
                message: isError(error) ? error.message : 'Failed to update unit status. Please try again.',
                toastType: 'error'
            });
        }
    }

    // Public API for Alpine.js components

    /**
     * Validate building form
     */
    validateForm(): boolean {
        const result = this.validationService.validateBuilding(this.stateManager.building);

        buildingEventBus.emit('building:validate', {
            isValid: result.isValid,
            errors: result.errors
        });

        return result.isValid;
    }

    /**
     * Undo changes to building data
     */
    undoChanges(): void {
        this.stateManager.resetToOriginal();
        this.validationService.clearErrors();
    }

    /**
     * Open add unit dialog
     */
    openAddUnitDialog(): void {
        this.dialogService.openAddUnitDialog();
    }

    /**
     * Open add unit type dialog
     */
    openAddUnitTypeDialog(): void {
        this.dialogService.openAddUnitTypeDialog();
    }

    /**
     * Close add unit type dialog
     */
    closeAddUnitTypeDialog(): void {
        this.dialogService.closeAddUnitTypeDialog();
    }

    /**
     * Toggle select all units
     */
    toggleSelectAll(): void {
        this.selectedUnits = this.bulkOperationService.toggleSelectAll(this.filteredUnits, this.selectedUnits);
    }

    /**
     * Check if unit is selected
     */
    isUnitSelected(unitID: string): boolean {
        return this.bulkOperationService.isUnitSelected(unitID, this.selectedUnits);
    }

    /**
     * Toggle unit selection
     */
    toggleUnitSelection(unitID: string): void {
        this.selectedUnits = this.bulkOperationService.toggleUnitSelection(unitID, this.selectedUnits);
    }

    /**
     * Get selected units count
     */
    getSelectedCount(): number {
        return this.bulkOperationService.getSelectedCount(this.selectedUnits);
    }

    /**
     * Update filter criteria
     */
    updateFilters(newFilters: Partial<FilterCriteria>): void {
        this.filterService.updateFilters(newFilters);
        this.updateFilteredUnits();
    }

    // Getters for accessing services and state

    get building(): BuildingData | null {
        return this.stateManager.building;
    }

    set building(value: BuildingData | null) {
        this.stateManager.building = value;
    }

    get original(): BuildingData | null {
        return this.stateManager.original;
    }

    get units(): ExtendedUnitData[] {
        return this.stateManager.units;
    }

    set units(value: ExtendedUnitData[]) {
        this.stateManager.units = value;
        this.updateFilteredUnits();
    }

    get unitTypes(): UnitTypeData[] {
        return this.stateManager.unitTypes;
    }

    set unitTypes(value: UnitTypeData[]) {
        this.stateManager.unitTypes = value;
    }

    get showSave(): boolean {
        return this.stateManager.showSave;
    }

    get saving(): boolean {
        return this.stateManager.saving;
    }

    get activeSectionTab(): string {
        return this.stateManager.activeSectionTab;
    }

    set activeSectionTab(value: string) {
        this.stateManager.activeSectionTab = value;
    }

    get geocoding(): boolean {
        return this.stateManager.geocoding;
    }

    set geocoding(value: boolean) {
        this.stateManager.geocoding = value;
    }

    // Units tab getters
    get filteredUnitsGetter(): ExtendedUnitData[] {
        return this.filteredUnits;
    }

    get selectedUnitsGetter(): Set<string> {
        return this.selectedUnits;
    }

    // Dialog state getters
    get showAddUnitDialog(): boolean {
        return this.dialogService.isAddUnitDialogOpen();
    }

    get showAddUnitTypeDialog(): boolean {
        return this.dialogService.isAddUnitTypeDialogOpen();
    }

    get showBulkStatusDialog(): boolean {
        return this.dialogService.isBulkStatusDialogOpen();
    }

    get showBulkRentDialog(): boolean {
        return this.dialogService.isBulkRentDialogOpen();
    }

    get newUnit(): { unitID: string, modelID: string } {
        return this.dialogService.getNewUnitData();
    }

    set newUnit(value: { unitID: string, modelID: string }) {
        this.dialogService.setNewUnitData(value);
    }

    // Bulk operation state
    get bulkOperation() {
        return this.bulkOperationService.getBulkOperationState();
    }

    // Validation errors
    get errors(): Record<string, string> {
        return this.validationService.getErrorMessages();
    }

    set errors(value: Record<string, string>) {
        this.validationService.setErrors(value);
    }

    // Filter state
    get statusFilter(): string {
        return this.filterService.getActiveFilters().statusFilter;
    }

    set statusFilter(value: string) {
        this.filterService.updateFilters({ statusFilter: value });
    }

    get searchQuery(): string {
        return this.filterService.getActiveFilters().searchQuery;
    }

    set searchQuery(value: string) {
        this.filterService.updateFilters({ searchQuery: value });
    }

    // Format service methods
    formatCurrency(amount: number | null | undefined): string {
        return this.formatService.formatCurrency(amount);
    }

    formatRelativeTime(dateString: string | undefined): string {
        return this.formatService.formatRelativeTime(dateString);
    }

    getStatusBadgeClass(status: string | undefined): string {
        return this.formatService.getStatusBadgeClass(status);
    }

    getTabDisplayName(tabKey: string): string {
        return this.formatService.getTabDisplayName(tabKey);
    }
}
