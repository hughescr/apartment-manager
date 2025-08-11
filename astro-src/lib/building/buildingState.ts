import type { BuildingData, UnitTypeData } from '../../types';
import type { AlpineMagicProperties } from '../alpine';
import { hasUnsavedChanges } from './validation';
import { trim, forEach, filter, toLower, isError } from 'lodash';
import type { ExtendedUnitData } from './types';

/**
 * Creates the Alpine.js state object for building management using native Alpine.js features
 * This replaces the complex orchestrator pattern with simple, direct state management
 */
export function createBuildingState() {
    const state = buildingStateObject();
    return state as typeof state & AlpineMagicProperties;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Alpine.js requires dynamic typing for proper state management
function buildingStateObject(): any {
    return {
        building: null as BuildingData | null,
        original: null as BuildingData | null,
        units: [] as ExtendedUnitData[],
        unitTypes: [] as UnitTypeData[],
        apiURL: '',

        // UI state
        activeSectionTab: 'building-info',
        showSave: false,
        saving: false,
        geocoding: false,
        errors: {} as Record<string, string>,

        // Units tab state
        filteredUnits: [] as ExtendedUnitData[],
        selectedUnits: new Set<string>(),
        statusFilter: '',
        searchQuery: '',
        showAddUnitDialog: false,
        showAddUnitTypeDialog: false,
        showBulkStatusDialog: false,
        showBulkRentDialog: false,
        newUnit: { unitID: '', modelID: '' },
        bulkOperation: {
            loading: false,
            statusValue: '',
            rentUpdateType: 'absolute' as 'absolute' | 'percentage',
            rentValue: 0
        },

        /**
         * Initialize the component state from HTML dataset
         */
        init(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this.parseBuildingData();
            this.parseLocationData();
            this.parseUnitsData();
            this.parseUnitTypesData();
            this.apiURL = this.$el?.dataset?.apiUrl || '';

            // Store original state for change detection
            this.original = this.building ? JSON.parse(JSON.stringify(this.building)) : null;

            // Initialize units with timestamps
            this.initializeUnitsTimestamps();
            // Setup watchers for reactive behavior
            this.setupWatchers();

            // Update filtered units initially
            this.updateFilteredUnits();
        },

        parseBuildingData(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            try {
                const buildingDataStr = this.$el?.dataset?.buildingData;
                if(!buildingDataStr || trim(buildingDataStr) === '') {
                    this.building = null;
                } else {
                    this.building = JSON.parse(buildingDataStr);
                }
            } catch{
                this.building = null;
            }
        },

        parseLocationData(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            try {
                const locationDataset = this.$el?.closest('[data-location-config]')?.dataset?.locationConfig;
                if(locationDataset) {
                    // Handle location data if needed
                }
            } catch{
                // Ignore location errors
            }
        },

        parseUnitsData(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            try {
                const unitsData = this.$el?.closest('[data-initial-units]')?.dataset?.initialUnits;
                if(unitsData) {
                    this.units = JSON.parse(unitsData);
                }
            } catch{
                this.units = [];
            }
        },

        parseUnitTypesData(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            try {
                const unitTypesDataset = this.$el?.closest('[data-initial-unit-types]')?.dataset?.initialUnitTypes;
                if(unitTypesDataset) {
                    this.unitTypes = JSON.parse(unitTypesDataset);
                }
            } catch{
                this.unitTypes = [];
            }
        },

        /**
         * Initialize units with default timestamps if missing
         */
        initializeUnitsTimestamps() {
            const now = new Date().toISOString();
            const unitsNeedingTimestamps = filter(this.units, unit => !unit.updatedAt);
            forEach(unitsNeedingTimestamps, (unit) => {
                unit.updatedAt = now as unknown as Date;
                unit.lastUpdated = now;
            });
        },

        /**
         * Setup Alpine.js watchers for reactive behavior
         */
        setupWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            // Watch for building changes to update showSave
            this.$watch('building', (value: BuildingData | null) => {
                this.showSave = hasUnsavedChanges(this.building, this.original);
                if(value) {
                    this.$dispatch('building:updated', { building: value });
                }
            }, { deep: true });

            // Watch filter changes
            this.$watch('units', () => this.updateFilteredUnits());
            this.$watch('statusFilter', () => this.updateFilteredUnits());

            // Watch for search query changes
            this.$watch('searchQuery', () => {
                if(this.searchQuery !== undefined) {
                    this.$dispatch('units:filter', { filter: this.statusFilter, query: this.searchQuery });
                }
            });

            // Watch for selection changes
            this.$watch('selectedUnits', () => {
                this.$dispatch('units:selection-changed', { selected: Array.from(this.selectedUnits) });
            });

            // Watch for geocoding state changes
            this.$watch('geocoding', (value: boolean) => {
                this.$dispatch('location:geocoding', { geocoding: value });
            });
        },

        /**
         * Update filtered units based on current filter criteria
         */
        updateFilteredUnits(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            let filtered = [...this.units];

            // Apply status filter
            if(this.statusFilter) {
                filtered = filter(filtered, (unit) => {
                    const status = unit.vacancyClass || 'Unknown';
                    return status === this.statusFilter;
                });
            }

            // Apply search query
            if(this.searchQuery) {
                const query = toLower(this.searchQuery);
                filtered = filter(filtered, (unit): unit is ExtendedUnitData =>
                    toLower(unit.unitID).includes(query) ||
                    (unit.modelID !== undefined && toLower(unit.modelID).includes(query))
                ) as ExtendedUnitData[];
            }

            this.filteredUnits = filtered;
            this.$dispatch('units:updated', {
                filter: this.statusFilter,
                query: this.searchQuery
            });
        },

        /**
         * Validate the current form state
         */
        validateForm(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            const errors: Record<string, string> = {};
            let isValid = true;

            if(!this.building) {
                errors.general = 'Building data is required';
                isValid = false;
            } else {
                if(!this.building.buildingName || trim(this.building.buildingName) === '') {
                    errors.name = 'Building name is required';
                    isValid = false;
                }
                const address = trim(`${this.building?.street || ''} ${this.building?.city || ''}, ${this.building?.state || ''} ${this.building?.zip || ''}`);
                if(!address || address === '') {
                    errors.address = 'Building address is required';
                    isValid = false;
                }
            }

            this.errors = errors;
            this.$dispatch('building:validate', { isValid, errors });
            return isValid;
        },

        /**
         * Save building changes
         */
        async saveBuilding(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(!this.validateForm() || !this.building) {
                return;
            }
            this.saving = true;
            try {
                const response = await fetch(`${this.apiURL}/building/${this.building.buildingID}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.building)
                });

                if(!response.ok) {
                    throw new Error('Failed to save building');
                }

                // Update original state
                this.original = JSON.parse(JSON.stringify(this.building));
                this.showSave = false;

                this.$dispatch('toast:show', {
                    message: 'Building saved successfully',
                    type: 'success'
                });

                this.$dispatch('photos:updated', { photos: this.building.photos || [] });
                this.$dispatch('building:reset', { building: this.building });
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to save building: ' + (isError(error) ? error.message : 'Unknown error'),
                    type: 'error'
                });
            } finally {
                this.saving = false;
            }
        },
        /**
         * Delete building
         */
        async deleteBuilding(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(!this.building || !confirm('Are you sure you want to delete this building?')) {
                return;
            }

            try {
                const response = await fetch(`${this.apiURL}/building/${this.building.buildingID}`, {
                    method: 'DELETE'
                });

                if(!response.ok) {
                    throw new Error('Failed to delete building');
                }

                this.$dispatch('toast:show', {
                    message: 'Building deleted successfully',
                    type: 'success'
                });

                // Redirect to buildings list
                window.location.href = '/';
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to delete building: ' + (isError(error) ? error.message : 'Unknown error'),
                    type: 'error'
                });
            }
        },

        undoChanges(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(this.original) {
                this.building = JSON.parse(JSON.stringify(this.original));
                this.showSave = false;
                this.$dispatch('building:reset', { building: this.building });
            }
        },

        openAddUnitDialog() {
            this.showAddUnitDialog = true;
            this.newUnit = { unitID: '', modelID: '' };
        },

        openAddUnitTypeDialog() {
            this.showAddUnitTypeDialog = true;
        },

        closeAddUnitTypeDialog() {
            this.showAddUnitTypeDialog = false;
        },

        /**
         * Add new unit
         */
        async addUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(!trim(this.newUnit.unitID) || !this.newUnit.modelID) {
                this.errors = { unitID: 'Unit ID and Model are required' };
                return;
            }

            try {
                const response = await fetch(`${this.apiURL}/units`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        buildingID: this.building?.buildingID,
                        ...this.newUnit,
                        status: 'available'
                    })
                });

                if(!response.ok) {
                    throw new Error('Failed to add unit');
                }

                const newUnit = await response.json();
                this.units.push(newUnit);
                this.updateFilteredUnits();
                this.showAddUnitDialog = false;
                this.newUnit = { unitID: '', modelID: '' };

                this.$dispatch('toast:show', {
                    message: 'Unit added successfully',
                    type: 'success'
                });
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to add unit: ' + (isError(error) ? error.message : 'Unknown error'),
                    type: 'error'
                });
            }
        },

        // Unit selection methods
        toggleSelectAll() {
            if(this.selectedUnits.size === this.filteredUnits.length) {
                this.selectedUnits.clear();
            } else {
                forEach(this.filteredUnits, unit => this.selectedUnits.add(unit.unitID));
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
        async performBulkStatusUpdate(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(this.selectedUnits.size === 0 || !this.bulkOperation.statusValue) {
                return;
            }

            this.bulkOperation.loading = true;
            try {
                const unitIDs = Array.from(this.selectedUnits);
                const response = await fetch(`${this.apiURL}/units/bulk-update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        unitIDs,
                        updates: { status: this.bulkOperation.statusValue }
                    })
                });

                if(!response.ok) {
                    throw new Error('Failed to update units');
                }

                // Update local state
                forEach(this.units, (unit) => {
                    if(unitIDs.includes(unit.unitID)) {
                        unit.vacancyClass = this.bulkOperation.statusValue;
                        unit.lastUpdated = new Date().toISOString();
                    }
                });

                this.updateFilteredUnits();
                this.selectedUnits.clear();
                this.showBulkStatusDialog = false;

                this.$dispatch('toast:show', {
                    message: `Updated ${unitIDs.length} units successfully`,
                    type: 'success'
                });

                this.$dispatch('units:bulk-update', {
                    operationType: 'status',
                    unitIDs
                });
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to update units: ' + (isError(error) ? error.message : 'Unknown error'),
                    type: 'error'
                });
            } finally {
                this.bulkOperation.loading = false;
            }
        },

        /**
         * Perform bulk rent update
         */
        async performBulkRentUpdate(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(this.selectedUnits.size === 0 || !this.bulkOperation.rentValue) {
                return;
            }

            this.bulkOperation.loading = true;
            try {
                const unitIDs = Array.from(this.selectedUnits);
                const response = await fetch(`${this.apiURL}/units/bulk-update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        unitIDs,
                        updates: {
                            rentType: this.bulkOperation.rentUpdateType,
                            rentValue: this.bulkOperation.rentValue
                        }
                    })
                });

                if(!response.ok) {
                    throw new Error('Failed to update rents');
                }

                // Update local state based on operation type
                forEach(this.units, (unit) => {
                    if(unitIDs.includes(unit.unitID)) {
                        if(this.bulkOperation.rentUpdateType === 'absolute') {
                            unit.rent = this.bulkOperation.rentValue;
                        } else if(this.bulkOperation.rentUpdateType === 'percentage') {
                            const currentRent = unit.rent || 0;
                            const changeAmount = currentRent * (this.bulkOperation.rentValue / 100);
                            unit.rent = currentRent + changeAmount;
                        }
                        unit.lastUpdated = new Date().toISOString();
                    }
                });

                this.updateFilteredUnits();
                this.selectedUnits.clear();
                this.showBulkRentDialog = false;

                this.$dispatch('toast:show', {
                    message: `Updated rent for ${unitIDs.length} units successfully`,
                    type: 'success'
                });

                this.$dispatch('units:bulk-update', {
                    operationType: 'rent',
                    unitIDs
                });
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to update rents: ' + (isError(error) ? error.message : 'Unknown error'),
                    type: 'error'
                });
            } finally {
                this.bulkOperation.loading = false;
            }
        },

        /**
         * Toggle unit availability (quick action)
         */
        async toggleUnitAvailability(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unit: ExtendedUnitData) {
            const newStatus = unit.vacancyClass === 'Occupied' ? 'Unoccupied' : 'Occupied';
            try {
                const response = await fetch(`${this.apiURL}/buildings/${this.building?.buildingID}/units/${unit.unitID}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...unit,
                        vacancyClass: newStatus,
                        lastUpdated: new Date().toISOString()
                    })
                });

                if(!response.ok) {
                    throw new Error('Failed to update unit');
                }

                // Update local state
                unit.vacancyClass = newStatus;
                unit.lastUpdated = new Date().toISOString();
                this.updateFilteredUnits();

                this.$dispatch('toast:show', {
                    message: `Unit ${unit.unitID} status updated to ${newStatus}`,
                    type: 'success'
                });
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to update unit: ' + (isError(error) ? error.message : 'Unknown error'),
                    type: 'error'
                });
            }
        },

        /**
         * Update unit rent (inline editing)
         */
        async updateUnitRent(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unit: ExtendedUnitData, newRentValue: string) {
            const rentAmount = parseFloat(newRentValue);
            if(isNaN(rentAmount) || rentAmount < 0 || rentAmount > 25000) {
                this.$dispatch('toast:show', {
                    message: 'Please enter a valid rent amount between $0 and $25,000',
                    type: 'error'
                });
                unit.editingRent = false;
                return;
            }

            unit.savingField = 'rent';
            unit.editingRent = false;

            try {
                const response = await fetch(`${this.apiURL}/buildings/${this.building?.buildingID}/units/${unit.unitID}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...unit,
                        rent: rentAmount,
                        lastUpdated: new Date().toISOString()
                    })
                });

                if(!response.ok) {
                    throw new Error('Rent update failed');
                }

                // Update local state
                unit.rent = rentAmount;
                unit.lastUpdated = new Date().toISOString();

                this.$dispatch('toast:show', {
                    message: `Unit ${unit.unitID} rent updated to ${this.formatCurrency(rentAmount)}`,
                    type: 'success'
                });
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to update rent: ' + (isError(error) ? error.message : 'Unknown error'),
                    type: 'error'
                });
            } finally {
                unit.savingField = null;
            }
        },

        // Formatting helper methods
        formatCurrency(amount: number | null | undefined) {
            if(amount == null) {
                return '$0';
            }
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0
            }).format(amount);
        },

        formatRelativeTime(dateString: string | undefined) {
            if(!dateString) {
                return 'Never';
            }
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if(diffDays === 0) {
                return 'Today';
            }
            if(diffDays === 1) {
                return 'Yesterday';
            }
            if(diffDays < 7) {
                return `${diffDays} days ago`;
            }
            if(diffDays < 30) {
                return `${Math.floor(diffDays / 7)} weeks ago`;
            }
            return `${Math.floor(diffDays / 30)} months ago`;
        },

        getStatusBadgeClass(status: string | undefined) {
            switch(status) {
                case 'available': return 'badge-success';
                case 'occupied': return 'badge-info';
                case 'maintenance': return 'badge-warning';
                case 'unavailable': return 'badge-error';
                default: return 'badge-ghost';
            }
        },

        getTabDisplayName(tabKey: string) {
            const tabMap: Record<string, string> = {
                'building-info': 'Building Info',
                'floorplans-units': 'Floorplans',
                'pricing-policies': 'Pricing',
                marketing: 'Marketing',
                units: 'Units'
            };
            return tabMap[tabKey] || 'Building Info';
        }
    };
}

/**
 * Global window function for Alpine.js to use
 */
declare global {
    interface Window {
        createBuildingState: typeof createBuildingState
    }
}

// Expose to global for Alpine.js usage
if(typeof window !== 'undefined') {
    window.createBuildingState = createBuildingState;
}
