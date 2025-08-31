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
        // Edit unit form state
        editUnitErrors: {},
        editUnitLoading: false,
        // Basic inheritance manager
        inheritanceManager: {
            isInherited(unitData, unitType, fieldName) {
                if(!unitType) {
                    return false;
                }
                const unitValue = unitData[fieldName];
                return (unitValue === null || unitValue === undefined || unitValue === '');
            },
            getInheritedValue(unitType, fieldName) {
                if(!unitType) {
                    return null;
                }
                return unitType[fieldName] || null;
            },
            getEffectiveValue(unitData, unitType, fieldName) {
                if(!unitType) {
                    return unitData[fieldName];
                }
                const unitValue = unitData[fieldName];
                if(unitValue === null || unitValue === undefined || unitValue === '') {
                    return unitType[fieldName] || null;
                }
                return unitValue;
            }
        },

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

                // Parse API URL
                if(element.dataset.apiUrl) {
                    this.apiURL = element.dataset.apiUrl;
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
        openEditUnitDialog(unit) {
            this.editingUnit = unit;
            this.showEditUnitDialog = true;
            // Initialize edit form
            this.initializeEditForm();
        },

        openEditUnitTypeDialog() {
            this.showEditUnitTypeDialog = true;
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
        },

        // Edit unit form methods
        initializeEditForm() {
            if(this.editingUnit) {
                this.editUnit = {
                    unitID: this.editingUnit.unitID,
                    unitNumber: this.editingUnit.unitNumber || this.editingUnit.unitID,
                    modelID: this.editingUnit.modelID || '',
                    beds: this.editingUnit.beds || 0,
                    baths: this.editingUnit.baths || 1,
                    sqft: this.editingUnit.sqft || null,
                    rent: this.editingUnit.rent || 0,
                    vacancyClass: this.editingUnit.vacancyClass || 'Unoccupied',
                    description: this.editingUnit.description || ''
                };
            }
        },

        // Get selected unit type for edit form
        get editFormSelectedUnitType() {
            if(!this.editUnit.modelID) {
                return null;
            }
            return this.unitTypes.find(ut => ut.modelID === this.editUnit.modelID) || null;
        },

        // Check if a field is inherited in edit form
        isEditFieldInherited(fieldName) {
            const unitData = this.editUnit;
            const unitType = this.editFormSelectedUnitType;
            return this.inheritanceManager.isInherited(unitData, unitType, fieldName);
        },

        // Get inherited value for a field in edit form
        getEditInheritedValue(fieldName) {
            const unitType = this.editFormSelectedUnitType;
            return this.inheritanceManager.getInheritedValue(unitType, fieldName);
        },

        // Get effective value (unit value or inherited value) in edit form
        getEditEffectiveValue(fieldName) {
            const unitData = this.editUnit;
            const unitType = this.editFormSelectedUnitType;
            return this.inheritanceManager.getEffectiveValue(unitData, unitType, fieldName);
        },

        // Get placeholder text for inherited values in edit form
        getEditFieldPlaceholder(fieldName, defaultPlaceholder = '') {
            const inheritedValue = this.getEditInheritedValue(fieldName);
            if(inheritedValue !== null && inheritedValue !== undefined) {
                return `Inherited: ${inheritedValue}`;
            }
            return defaultPlaceholder;
        },

        // Get inheritance badge text for edit form
        getEditInheritanceBadge(fieldName) {
            if(this.isEditFieldInherited(fieldName)) {
                return 'Inherited from floorplan';
            } else if(this.editFormSelectedUnitType && this.editUnit[fieldName] !== null && this.editUnit[fieldName] !== undefined && this.editUnit[fieldName] !== '') {
                return 'Custom override';
            }
            return null;
        },

        // Clear a specific field override to allow inheritance in edit form
        clearEditOverride(fieldName) {
            if(this.editUnit[fieldName] !== null && this.editUnit[fieldName] !== undefined && this.editUnit[fieldName] !== '') {
                // Set field to null to trigger inheritance
                this.editUnit[fieldName] = null;

                // For beds and baths, we need special handling to avoid 0 values
                if(fieldName === 'beds' && this.editFormSelectedUnitType && !this.editFormSelectedUnitType.beds) {
                    this.editUnit.beds = null;
                }
                if(fieldName === 'baths' && this.editFormSelectedUnitType && !this.editFormSelectedUnitType.baths) {
                    this.editUnit.baths = null;
                }
            }
        },

        // Reset all overridden fields to inherit from floorplan in edit form
        resetEditAllToFloorplan() {
            const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
            const overriddenFields = [];

            // Check which fields are currently overridden
            inheritableFields.forEach((field) => {
                if(!this.isEditFieldInherited(field) && this.editFormSelectedUnitType) {
                    overriddenFields.push(field);
                }
            });

            if(overriddenFields.length === 0) {
                this.$dispatch('show-toast', {
                    message: 'No overridden fields to reset',
                    type: 'info'
                });
                return;
            }

            const fieldNames = overriddenFields.join(', ');
            const confirmed = confirm(`Are you sure you want to reset ${overriddenFields.length} field(s) to inherit from the floorplan?\n\nFields: ${fieldNames}\n\nThis will clear your custom values.`);

            if(confirmed) {
                overriddenFields.forEach((field) => {
                    this.clearEditOverride(field);
                });

                this.$dispatch('show-toast', {
                    message: `Reset ${overriddenFields.length} field(s) to floorplan values`,
                    type: 'success'
                });
            }
        },

        // Check if unit has any overridden fields that can be reset in edit form
        hasEditOverriddenFields() {
            if(!this.editFormSelectedUnitType) {
                return false;
            }
            const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
            return inheritableFields.some(field => !this.isEditFieldInherited(field));
        },

        // Preview what values will change when selecting a new unit type in edit form
        previewEditUnitTypeChange(newModelID) {
            if(!newModelID) {
                return true;
            }

            const newUnitType = this.unitTypes.find(ut => ut.modelID === newModelID);
            if(!newUnitType) {
                return true;
            }

            const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
            const changes = [];

            inheritableFields.forEach((field) => {
                const currentValue = this.getEditEffectiveValue(field);
                const newInheritedValue = this.inheritanceManager.getInheritedValue(newUnitType, field);
                const willInherit = (this.editUnit[field] === null || this.editUnit[field] === undefined || this.editUnit[field] === '');

                if(willInherit && newInheritedValue !== null && currentValue !== newInheritedValue) {
                    changes.push({
                        field: field,
                        from: currentValue || 'Not set',
                        to: newInheritedValue
                    });
                }
            });

            if(changes.length > 0) {
                const changesList = changes.map(c => `${c.field}: ${c.from} → ${c.to}`).join('\n');
                const confirmed = confirm(`Changing to ${newUnitType.modelName} will update these inherited values:\n\n${changesList}\n\nContinue?`);

                if(!confirmed) {
                    return false;
                }
            }

            return true;
        },

        // Watch for unit type changes to populate inherited values in edit form
        onEditUnitTypeChange() {
            const selectedType = this.editFormSelectedUnitType;
            if(selectedType) {
                // Reset inheritable fields to allow inheritance
                // Only set values if unit doesn't have explicit values
                if(!this.editUnit.beds) {
                    this.editUnit.beds = null; // Allow inheritance
                }
                if(!this.editUnit.baths) {
                    this.editUnit.baths = null; // Allow inheritance
                }
                if(!this.editUnit.sqft) {
                    this.editUnit.sqft = null; // Allow inheritance
                }
                if(!this.editUnit.rent) {
                    this.editUnit.rent = null; // Allow inheritance
                }
            } else {
                // For custom units, ensure we have default values
                if(!this.editUnit.beds) {
                    this.editUnit.beds = 1;
                }
                if(!this.editUnit.baths) {
                    this.editUnit.baths = 1;
                }
                if(!this.editUnit.rent) {
                    this.editUnit.rent = 0;
                }
            }
        },

        async submitEditUnit() {
            this.editUnitLoading = true;
            this.editUnitErrors = {};

            try {
                // Client-side validation
                if(!this.editUnit.unitNumber || !this.editUnit.unitNumber.trim()) {
                    this.editUnitErrors.unitNumber = 'Unit number is required';
                }
                if(this.editUnit.beds < 0) {
                    this.editUnitErrors.beds = 'Bedrooms must be 0 or greater';
                }
                if(this.editUnit.baths < 0.5) {
                    this.editUnitErrors.baths = 'Bathrooms must be 0.5 or greater';
                }
                if(this.editUnit.rent < 0) {
                    this.editUnitErrors.rent = 'Rent must be 0 or greater';
                }
                if(this.editUnit.rent > 25000) {
                    this.editUnitErrors.rent = 'Rent must be less than $25,000';
                }

                if(Object.keys(this.editUnitErrors).length > 0) {
                    this.editUnitLoading = false;
                    return;
                }

                // Dispatch update event with unit ID and changes
                this.$dispatch('update-unit', {
                    unitId: this.editingUnit.unitID,
                    updatedData: this.editUnit
                });
            } catch(error) {
                // eslint-disable-next-line no-console -- error logging for debugging
                console.error('Edit unit error:', error);
                this.editUnitErrors.general = 'Failed to update unit. Please try again.';
                this.$dispatch('show-toast', {
                    message: 'Failed to update unit. Please try again.',
                    type: 'error'
                });
            } finally {
                this.editUnitLoading = false;
            }
        },
        async deleteUnit(unitId) {
            if(!this.building || !this.apiURL) {
                this.$dispatch('show-toast', {
                    message: 'Building data or API URL not available',
                    type: 'error'
                });
                return;
            }

            try {
                const response = await fetch(`${this.apiURL}/buildings/${this.building.buildingID}/units/${unitId}`, {
                    method: 'DELETE'
                });

                if(response.ok) {
                    // Remove unit from local state
                    this.units = this.units.filter(unit => unit.unitID !== unitId);
                    this.filteredUnits = this.filteredUnits.filter(unit => unit.unitID !== unitId);

                    // Close the edit dialog
                    this.closeEditUnitDialog();

                    // Show success message
                    this.$dispatch('show-toast', {
                        message: 'Unit deleted successfully',
                        type: 'success'
                    });
                } else {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Failed to delete unit');
                }
            } catch(error) {
                // eslint-disable-next-line no-console -- error logging for debugging
                console.error('Delete unit error:', error);
                this.$dispatch('show-toast', {
                    message: 'Failed to delete unit: ' + (error instanceof Error ? error.message : 'Unknown error'),
                    type: 'error'
                });
            }
        },

        async confirmEditDeleteUnit() {
            if(!this.editingUnit) {
                return;
            }

            const unitDisplayName = this.editingUnit.unitNumber || this.editingUnit.unitID;
            if(confirm(`Are you sure you want to delete Unit ${unitDisplayName}?\n\nThis action cannot be undone.`)) {
                this.editUnitLoading = true;
                try {
                    // Call the deleteUnit method directly instead of dispatching event
                    await this.deleteUnit(this.editingUnit.unitID);
                } catch(error) {
                    // Error handling is already done in deleteUnit method
                    // eslint-disable-next-line no-console -- error logging for debugging
                    console.error('Delete unit confirmation error:', error);
                } finally {
                    this.editUnitLoading = false;
                }
            }
        },

        // Bulk Create Dialog Functions
        openBulkCreateDialog(modelID) {
            this.showBulkCreateDialog = true;
            // Reset bulk create data with optional modelID
            Object.assign(this.bulkCreateData, {
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
        },

        closeBulkCreateDialog() {
            this.showBulkCreateDialog = false;
            // Reset bulk create data
            Object.assign(this.bulkCreateData, {
                modelID: '',
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
