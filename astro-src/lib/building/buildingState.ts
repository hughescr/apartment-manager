import type { BuildingData, UnitTypeData } from '../../types';
import { validateBuildingForm, hasUnsavedChanges } from './validation';
import { buildingEventBus, connectAlpineEventBus } from './eventBus';
import type { BuildingCardState, ExtendedUnitData } from './types';
import { trim, assign, forEach, filter, toLower, map, noop } from 'lodash';

// Alpine.js magic properties interface
interface AlpineComponent {
    $dispatch: (event: string, detail?: unknown) => void
    $el: HTMLElement & { dataset: Record<string, string> }
    $watch: (expression: string, callback: () => void, options?: { deep?: boolean }) => void
}

// State object with methods
interface BuildingCardStateWithMethods extends BuildingCardState {
    // Methods
    init(this: BuildingCardStateWithMethods & AlpineComponent): void
    validateForm(): boolean
    openAddUnitDialog(): void
    openAddUnitTypeDialog(): void
    closeAddUnitTypeDialog(): void
    addUnit(): Promise<void>
    deleteBuilding(): Promise<void>
    saveBuilding(): Promise<void>
    undoChanges(): void
    getTabDisplayName(tabKey: string): string
    initUnitsTab(this: BuildingCardStateWithMethods & AlpineComponent): void
    updateFilteredUnits(): void
    toggleSelectAll(): void
    isUnitSelected(unitID: string): boolean
    toggleUnitSelection(unitID: string): void
    getSelectedCount(): number
    performBulkStatusUpdate(): Promise<void>
    performBulkRentUpdate(): Promise<void>
    toggleUnitAvailability(unit: ExtendedUnitData): Promise<void>
    formatCurrency(amount: number | null | undefined): string
    formatRelativeTime(dateString: string | undefined): string
    getStatusBadgeClass(status: string | undefined): string
}

/**
 * Creates the Alpine.js state object for BuildingCard
 * This is the main state management logic extracted from BuildingCard.astro
 */
export function createBuildingCardState(): BuildingCardStateWithMethods & AlpineComponent {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Building complex object with dynamic methods
    const state: any = {
        // Initial state properties
        original: null as BuildingData | null,
        building: null as BuildingData | null,
        units: [] as ExtendedUnitData[],
        unitTypes: [] as UnitTypeData[],
        apiURL: '' as string,
        showSave: false,
        saving: false,
        activeSectionTab: 'building-info',
        errors: {} as Record<string, string>,
        showAddUnitDialog: false,
        newUnit: { unitID: '', modelID: '' },
        showAddUnitTypeDialog: false,

        // Units tab variables
        filteredUnits: [] as ExtendedUnitData[],
        selectedUnits: new Set<string>(),
        statusFilter: '',
        searchQuery: '',
        showBulkStatusDialog: false,
        showBulkRentDialog: false,
        bulkOperation: {
            loading: false,
            statusValue: '',
            rentUpdateType: 'absolute' as 'absolute' | 'percentage',
            rentValue: 0
        },

        // LocationMapPicker state variables
        geocoding: false,

        // Alpine.js magic properties (will be injected at runtime)
        $dispatch: noop as unknown as (event: string, detail?: unknown) => void,
        $el: { dataset: {} } as HTMLElement & { dataset: Record<string, string> },
        $watch: noop as unknown as (expression: string, callback: () => void, options?: { deep?: boolean }) => void,

        /**
         * Initialize the component state
         */
        init(this: BuildingCardStateWithMethods & AlpineComponent) {
            // Connect event bus to Alpine.js
            connectAlpineEventBus(this.$dispatch);

            // Parse data from data attributes with error handling
            try {
                const buildingDataStr = this.$el.dataset.building;
                if(!buildingDataStr || trim(buildingDataStr) === '') {
                    this.building = null;
                } else {
                    this.building = JSON.parse(buildingDataStr);
                }
            } catch { // eslint-disable-line @stylistic/keyword-spacing -- TypeScript requires space, ESLint forbids it
                // Failed to parse building data, use null
                this.building = null;
            }

            try {
                this.units = JSON.parse(this.$el.dataset.units || '[]') || [];
            } catch { // eslint-disable-line @stylistic/keyword-spacing -- TypeScript requires space, ESLint forbids it
                // Failed to parse units data, use empty array
                this.units = [];
            }

            try {
                this.unitTypes = JSON.parse(this.$el.dataset.unitTypes || '[]') || [];
            } catch { // eslint-disable-line @stylistic/keyword-spacing -- TypeScript requires space, ESLint forbids it
                // Failed to parse unitTypes data, use empty array
                this.unitTypes = [];
            }

            this.apiURL = this.$el.dataset.apiUrl || '';
            this.original = JSON.parse(JSON.stringify(this.building));

            // Initialize units tab
            this.initUnitsTab();

            // Set up reactivity watchers
            this.$watch('building', () => {
                this.showSave = hasUnsavedChanges(this.building, this.original);
                buildingEventBus.emit('building:updated', { building: this.building! });
            }, { deep: true });
        },

        /**
         * Validation method
         */
        validateForm() {
            const result = validateBuildingForm(this.building);
            this.errors = result.errors;

            buildingEventBus.emit('building:validate', {
                isValid: result.isValid,
                errors: result.errors
            });

            return result.isValid;
        },

        // Dialog methods
        openAddUnitDialog() {
            this.newUnit = { unitID: '', modelID: '' };
            this.showAddUnitDialog = true;
        },

        openAddUnitTypeDialog() {
            this.showAddUnitTypeDialog = true;
        },

        closeAddUnitTypeDialog() {
            this.showAddUnitTypeDialog = false;
        },

        /**
         * Add a new unit
         */
        async addUnit() {
            if(!this.newUnit.unitID || trim(this.newUnit.unitID) === '') {
                buildingEventBus.emit('toast:show', {
                    message: 'Unit number is required',
                    toastType: 'error'
                });
                return;
            }

            this.showAddUnitDialog = false;
            const unitData = {
                unitID: this.newUnit.unitID,
                buildingID: this.building!.buildingID
            };

            if(this.newUnit.modelID) {
                assign(unitData, { modelID: this.newUnit.modelID });
            }

            try {
                const response = await fetch(`${this.apiURL}buildings/${this.building!.buildingID}/units`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(unitData),
                });

                if(response.ok) {
                    window.location.reload();
                } else {
                    throw new Error('Failed to create unit');
                }
            } catch { // eslint-disable-line @stylistic/keyword-spacing -- TypeScript requires space, ESLint forbids it
                buildingEventBus.emit('toast:show', {
                    message: 'Failed to create unit',
                    toastType: 'error'
                });
            }
        },

        /**
         * Delete the building
         */
        async deleteBuilding() {
            if(!confirm('Are you sure you want to delete this building and all its units?')) {
                return;
            }

            try {
                const response = await fetch(`${this.apiURL}buildings/${this.building!.buildingID}`, {
                    method: 'DELETE'
                });

                if(response.ok) {
                    window.location.reload();
                } else {
                    throw new Error('Failed to delete building');
                }
            } catch { // eslint-disable-line @stylistic/keyword-spacing -- TypeScript requires space, ESLint forbids it
                buildingEventBus.emit('toast:show', {
                    message: 'Failed to delete building',
                    toastType: 'error'
                });
            }
        },

        /**
         * Save building changes
         */
        async saveBuilding() {
            if(!this.validateForm()) {
                buildingEventBus.emit('toast:show', {
                    message: 'Please fix the validation errors before saving',
                    toastType: 'error'
                });
                return;
            }

            this.saving = true;

            try {
                const response = await fetch(`${this.apiURL}buildings/${this.building!.buildingID}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.building),
                });

                if(response.ok) {
                    this.original = { ...this.building! };
                    this.showSave = false;

                    buildingEventBus.emit('building:save', { building: this.building! });
                    buildingEventBus.emit('toast:show', {
                        message: 'Building saved successfully',
                        toastType: 'success'
                    });
                } else {
                    throw new Error('Failed to save building');
                }
            } catch { // eslint-disable-line @stylistic/keyword-spacing -- TypeScript requires space, ESLint forbids it
                buildingEventBus.emit('toast:show', {
                    message: 'Failed to save building',
                    toastType: 'error'
                });
            } finally {
                this.saving = false;
            }
        },

        /**
         * Undo changes
         */
        undoChanges() {
            this.building = { ...this.original! };
            this.errors = {};

            buildingEventBus.emit('building:reset', { building: this.building });
        },

        /**
         * Get display name for active tab in mobile dropdown
         */
        getTabDisplayName(tabKey: string) {
            const tabNames = {
                'building-info': 'Building Info',
                'floorplans-units': 'Floorplans & Units',
                'pricing-policies': 'Pricing & Policies',
                marketing: 'Marketing',
                units: 'Units'
            };
            return tabNames[tabKey as keyof typeof tabNames] || 'Building Info';
        },

        // Units tab methods
        initUnitsTab(this: BuildingCardStateWithMethods & AlpineComponent) {
            // Initialize updatedAt for units that don't have it
            const unitsWithoutUpdatedAt = filter(this.units as ExtendedUnitData[], (unit: ExtendedUnitData) => !unit.updatedAt);
            forEach(unitsWithoutUpdatedAt, (unit: ExtendedUnitData) => {
                (unit as ExtendedUnitData).updatedAt = new Date().toISOString() as unknown as Date;
                (unit as ExtendedUnitData).lastUpdated = new Date().toISOString();
            });

            this.updateFilteredUnits();
            // Watch for changes that require re-filtering
            this.$watch('statusFilter', () => this.updateFilteredUnits());
            this.$watch('searchQuery', () => this.updateFilteredUnits());
        },

        updateFilteredUnits() {
            let filtered: ExtendedUnitData[] = [...(this.units || [])];

            // Apply status filter
            if(this.statusFilter) {
                filtered = filter(filtered, { vacancyClass: this.statusFilter });
            }
            // Apply search filter
            if(trim(this.searchQuery)) {
                const query = toLower(this.searchQuery);
                filtered = filter(filtered, unit =>
                    toLower(unit.unitNumber || unit.unitID || '').includes(query)
                );
            }

            this.filteredUnits = filtered;

            buildingEventBus.emit('units:filter', {
                filter: this.statusFilter,
                query: this.searchQuery
            });
        },

        toggleSelectAll() {
            if(this.selectedUnits.size === this.filteredUnits.length) {
                // Deselect all
                this.selectedUnits.clear();
            } else {
                // Select all filtered units
                this.selectedUnits = new Set(map(this.filteredUnits, 'unitID'));
            }
        },

        isUnitSelected(unitID: string) {
            return this.selectedUnits.has(unitID);
        },

        toggleUnitSelection(unitID: string) {
            if(this.selectedUnits.has(unitID)) {
                this.selectedUnits.delete(unitID);
            } else {
                this.selectedUnits.add(unitID);
            }
        },

        getSelectedCount() {
            return this.selectedUnits.size;
        },

        /**
         * Perform bulk status update
         */
        async performBulkStatusUpdate() {
            this.bulkOperation.loading = true;

            try {
                const unitIDs: string[] = Array.from(this.selectedUnits);
                const response = await fetch(`${this.apiURL}buildings/${this.building!.buildingID}/units/bulk-status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        unitIDs,
                        vacancyClass: this.bulkOperation.statusValue
                    })
                });

                if(response.ok) {
                    // Update local data
                    forEach(this.units, (unit: ExtendedUnitData) => {
                        if(this.selectedUnits.has(unit.unitID)) {
                            assign(unit, {
                                vacancyClass: this.bulkOperation.statusValue,
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

                    this.selectedUnits.clear();
                    this.showBulkStatusDialog = false;
                    this.updateFilteredUnits();
                } else {
                    throw new Error('Bulk update failed');
                }
            } catch { // eslint-disable-line @stylistic/keyword-spacing -- TypeScript requires space, ESLint forbids it
                buildingEventBus.emit('toast:show', {
                    message: 'Failed to update units. Please try again.',
                    toastType: 'error'
                });
            } finally {
                this.bulkOperation.loading = false;
            }
        },

        /**
         * Perform bulk rent update
         */
        async performBulkRentUpdate() {
            this.bulkOperation.loading = true;

            try {
                const unitIDs: string[] = Array.from(this.selectedUnits);
                const response = await fetch(`${this.apiURL}buildings/${this.building!.buildingID}/units/bulk-rent`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        unitIDs,
                        updateType: this.bulkOperation.rentUpdateType,
                        value: parseFloat(this.bulkOperation.rentValue.toString())
                    })
                });

                if(response.ok) {
                    // Update local data
                    forEach(this.units, (unit: ExtendedUnitData) => {
                        if(this.selectedUnits.has(unit.unitID)) {
                            let newRent: number;
                            if(this.bulkOperation.rentUpdateType === 'absolute') {
                                newRent = parseFloat(this.bulkOperation.rentValue.toString());
                            } else {
                                newRent = Math.round((unit.rent || 0) * (1 + parseFloat(this.bulkOperation.rentValue.toString()) / 100));
                            }
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

                    this.selectedUnits.clear();
                    this.showBulkRentDialog = false;
                    this.updateFilteredUnits();
                } else {
                    throw new Error('Bulk rent update failed');
                }
            } catch { // eslint-disable-line @stylistic/keyword-spacing -- TypeScript requires space, ESLint forbids it
                buildingEventBus.emit('toast:show', {
                    message: 'Failed to update rents. Please try again.',
                    toastType: 'error'
                });
            } finally {
                this.bulkOperation.loading = false;
            }
        },

        /**
         * Toggle unit availability
         */
        async toggleUnitAvailability(unit: ExtendedUnitData) {
            const newStatus = unit.vacancyClass === 'Occupied' ? 'Unoccupied' : 'Occupied';

            try {
                const response = await fetch(`${this.apiURL}buildings/${this.building!.buildingID}/units/${unit.unitID}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...unit,
                        vacancyClass: newStatus,
                        lastUpdated: new Date().toISOString()
                    })
                });

                if(response.ok) {
                    assign(unit as ExtendedUnitData, {
                        vacancyClass: newStatus,
                        lastUpdated: new Date().toISOString()
                    });
                    this.updateFilteredUnits();

                    buildingEventBus.emit('toast:show', {
                        message: `Unit ${unit.unitNumber || unit.unitID} status updated`,
                        toastType: 'success'
                    });
                } else {
                    throw new Error('Status update failed');
                }
            } catch { // eslint-disable-line @stylistic/keyword-spacing -- TypeScript requires space, ESLint forbids it
                buildingEventBus.emit('toast:show', {
                    message: 'Failed to update unit status. Please try again.',
                    toastType: 'error'
                });
            }
        },

        // Helper functions for formatting and styling
        formatCurrency(amount: number | null | undefined) {
            if(amount === null || amount === undefined) {
                return '$0';
            }
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        },

        formatRelativeTime(dateString: string | undefined) {
            if(!dateString) {
                return 'Never';
            }
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if(diffDays > 30) {
                return date.toLocaleDateString();
            } else if(diffDays > 0) {
                return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
            } else if(diffHours > 0) {
                return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
            } else if(diffMins > 0) {
                return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
            } else {
                return 'Just now';
            }
        },

        getStatusBadgeClass(status: string | undefined) {
            const statusClasses = {
                occupied: 'badge-error',
                unoccupied: 'badge-success',
                notice: 'badge-warning',
                down: 'badge-neutral'
            };
            return statusClasses[toLower(status) as keyof typeof statusClasses] || 'badge-ghost';
        }
    };

    return state as BuildingCardStateWithMethods & AlpineComponent;
}

/**
 * Global window function for Alpine.js to use
 */
declare global {
    interface Window {
        createBuildingCardState: typeof createBuildingCardState
    }
}

// Expose to global for Alpine.js usage
if(typeof window !== 'undefined') {
    window.createBuildingCardState = createBuildingCardState;
}
