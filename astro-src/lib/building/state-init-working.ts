// Working Alpine.js component with essential building state properties
// eslint-disable-next-line no-console -- debugging component registration
console.log('[working-init] Starting working Alpine.js component registration...');

// Essential building state function without Node.js dependencies
function createWorkingBuildingState() {
    // eslint-disable-next-line no-console -- debugging component registration
    console.log('[working-init] Creating working building state...');

    return {
        // Core data
        building: null,
        original: null,
        units: [],
        unitTypes: [],
        apiURL: '',

        // UI state that the templates expect
        showSave: false,
        saving: false,
        lastSaveSuccess: false,
        activeSectionTab: 'building-info',
        geocoding: false,
        errors: {},

        // Units tab state
        filteredUnits: [],
        selectedUnits: new Set(),
        statusFilter: '',
        searchQuery: '',
        showAddUnitDialog: false,
        showAddUnitTypeDialog: false,
        showEditUnitTypeDialog: false,
        showEditUnitDialog: false,
        editingUnit: null,
        showBulkStatusDialog: false,
        showBulkRentDialog: false,
        newUnit: { unitID: '', modelID: '' },
        newUnitType: {},
        selectedUnitType: null,

        // Bulk operation state
        bulkOperation: {
            loading: false,
            statusValue: '',
            rentUpdateType: 'absolute',
            rentValue: 0,
            errors: undefined,
            successfulUnits: undefined
        },
        showBulkCreateDialog: false,
        showAssignUnitTypeDialog: false,
        bulkCreateData: {
            modelID: '',
            count: null,
            patternType: 'numeric',
            startingNumber: '101',
            prefix: '',
            suffix: '',
            customUnitNumbers: '',
            unitNumbers: [],
            vacancyClass: 'Unoccupied'
        },
        assignUnitTypeData: {
            selectedUnit: null,
            selectedModelID: '',
            keepCustomValues: {},
            loading: false
        },

        // Additional UI state
        expandedRentSpecials: {},
        selectedPetTypes: [],
        editUnit: {},
        editUnitType: {},

        /**
         * Initialize the component
         */
        init() {
            // eslint-disable-next-line no-console -- debugging component registration
            console.log('[working-init] Initializing working component');

            // Initialize data from HTML dataset
            const element = this.$el;
            if(element?.dataset) {
                // Parse building data
                if(element.dataset.buildingData) {
                    try {
                        this.building = JSON.parse(element.dataset.buildingData);
                        this.original = JSON.parse(element.dataset.buildingData);
                    } catch(e) {
                        // eslint-disable-next-line no-console -- debugging component registration
                        console.warn('[working-init] Failed to parse building data:', e);
                    }
                }

                // Parse units data
                if(element.dataset.initialUnits) {
                    try {
                        this.units = JSON.parse(element.dataset.initialUnits);
                        this.filteredUnits = this.units;
                    } catch(e) {
                        // eslint-disable-next-line no-console -- debugging component registration
                        console.warn('[working-init] Failed to parse units data:', e);
                    }
                }

                // Parse unit types data
                if(element.dataset.initialUnitTypes) {
                    try {
                        this.unitTypes = JSON.parse(element.dataset.initialUnitTypes);
                    } catch(e) {
                        // eslint-disable-next-line no-console -- debugging component registration
                        console.warn('[working-init] Failed to parse unit types data:', e);
                    }
                }
            }
        },

        // Essential helper functions that templates use
        formatCurrency(amount) {
            if(amount === null || amount === undefined) {
                return '';
            }
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        },

        formatRelativeTime(dateString) {
            if(!dateString) {
                return 'Never';
            }
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if(diffInSeconds < 60) {
                return 'Just now';
            }
            if(diffInSeconds < 3600) {
                return `${Math.floor(diffInSeconds / 60)} minutes ago`;
            }
            if(diffInSeconds < 86400) {
                return `${Math.floor(diffInSeconds / 3600)} hours ago`;
            }
            if(diffInSeconds < 604800) {
                return `${Math.floor(diffInSeconds / 86400)} days ago`;
            }

            return date.toLocaleDateString();
        },

        getStatusBadgeClass(status) {
            if(!status) {
                return 'badge-ghost';
            }

            const statusMap = {
                Occupied: 'badge-error',
                Notice: 'badge-warning',
                Vacant: 'badge-success',
                Model: 'badge-info',
                'Notice to Vacate': 'badge-warning',
                'Model Unit': 'badge-info'
            };

            return statusMap[status] || 'badge-ghost';
        },

        getTabDisplayName(tabKey) {
            const tabNames = {
                'building-info': 'Building Info',
                'floorplans-units': 'Floorplans & Units',
                'pricing-policies': 'Pricing & Policies',
                marketing: 'Marketing',
                units: 'Units'
            };

            return tabNames[tabKey] || tabKey;
        },

        // Placeholder methods for UI functionality
        // eslint-disable-next-line lodash/prefer-constant -- browser compatibility over lodash
        validateForm() {
            return true;
        },

        async saveBuilding() {
            // eslint-disable-next-line no-console -- debugging component registration
            console.log('[working-init] Save building called');
        },

        updateFilteredUnits() {
            this.filteredUnits = this.units;
        },

        // UI event handlers (placeholders)
        openAddUnitDialog() {
            this.showAddUnitDialog = true;
        },

        openAddUnitTypeDialog() {
            this.showAddUnitTypeDialog = true;
        },

        closeAddUnitTypeDialog() {
            this.showAddUnitTypeDialog = false;
        },

        closeEditUnitTypeDialog() {
            this.showEditUnitTypeDialog = false;
            this.selectedUnitType = null;
        },

        closeEditUnitDialog() {
            this.showEditUnitDialog = false;
            this.editingUnit = null;
        },

        // Additional placeholder methods
        // eslint-disable-next-line lodash/prefer-noop -- browser compatibility over lodash
        addRentSpecial() {
            // Placeholder
        },

        // eslint-disable-next-line lodash/prefer-noop -- browser compatibility over lodash
        removeRentSpecial() {
            // Placeholder
        },

        // eslint-disable-next-line lodash/prefer-noop -- browser compatibility over lodash
        toggleSelectAll() {
            // Placeholder
        },

        // eslint-disable-next-line lodash/prefer-constant -- browser compatibility over lodash
        isUnitSelected() {
            return false;
        },

        // eslint-disable-next-line lodash/prefer-noop -- browser compatibility over lodash
        toggleUnitSelection() {
            // Placeholder
        },

        // eslint-disable-next-line lodash/prefer-constant -- browser compatibility over lodash
        getSelectedCount() {
            return 0;
        }
    };
}

// Register with Alpine.js
if(typeof window !== 'undefined') {
    // eslint-disable-next-line no-console -- debugging component registration
    console.log('[working-init] Browser context detected');

    if(typeof window.Alpine !== 'undefined') {
        // eslint-disable-next-line no-console -- debugging component registration
        console.log('[working-init] Alpine detected, registering working component');
        window.Alpine.data('buildingStateData', createWorkingBuildingState);
        // eslint-disable-next-line no-console -- debugging component registration
        console.log('[working-init] Working buildingStateData registered successfully');
    } else {
        // eslint-disable-next-line no-console -- debugging component registration
        console.log('[working-init] Alpine not found');
    }
}
