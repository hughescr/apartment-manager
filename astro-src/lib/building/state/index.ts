import type { BuildingData, UnitTypeData } from '../../../types';
import type { AlpineMagicProperties } from '../../alpine';
import type { ExtendedUnitData } from '../types';
import type { BuildingStateWithMagic } from '../../types/alpine-state';
import { BuildingCore, type BuildingCoreState } from './buildingCore';
import { UnitManagement, type UnitManagementState } from './unitManagement';
import { BulkOperations, type BulkOperationsState } from './bulkOperations';
import { UnitTypeManagement, type UnitTypeManagementState } from './unitTypeManagement';
import { FormValidation, type FormValidationState } from './formValidation';
import { ApiHelpers, type ApiHelpersState } from './apiHelpers';
import { StateHelpers, type StateHelpersState } from './stateHelpers';
import { FieldInheritanceManager } from '../../unit-card/fieldInheritance';
// Native JavaScript implementations to avoid Node.js dependencies in browser
// eslint-disable-next-line lodash/prefer-noop -- avoiding lodash dependency for browser compatibility
const noop = (): void => { /* intentionally empty */ };
const map = <T, U>(array: T[], iteratee: (item: T) => U): U[] => array.map(iteratee);

/**
 * Combined state interface that includes all module states
 */
interface CombinedBuildingState extends
    BuildingCoreState,
    UnitManagementState,
    BulkOperationsState,
    UnitTypeManagementState,
    FormValidationState,
    ApiHelpersState,
    StateHelpersState {

    // UI state that wasn't in individual modules
    activeSectionTab: string
    geocoding: boolean
}

/**
 * Creates the Alpine.js state object for building management using modular architecture
 * This maintains backward compatibility while using focused, testable modules
 */
export function createBuildingState(): BuildingStateWithMagic {
    const state = buildingStateObject();
    return state as BuildingStateWithMagic;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Alpine.js requires dynamic typing for proper state management
function buildingStateObject(): any {
    return {
        // Combined state properties
        building: null as BuildingData | null,
        original: null as BuildingData | null,
        units: [] as ExtendedUnitData[],
        unitTypes: [] as UnitTypeData[],
        apiURL: '',

        // UI state
        activeSectionTab: 'building-info',
        showSave: false,
        saving: false,
        lastSaveSuccess: false,
        geocoding: false,
        errors: {} as Record<string, string>,
        expandedRentSpecials: {} as Record<string, boolean>,
        selectedPetTypes: [] as string[],

        // Units tab state
        filteredUnits: [] as ExtendedUnitData[],
        selectedUnits: new Set<string>(),
        statusFilter: '',
        searchQuery: '',
        showAddUnitDialog: false,
        showAddUnitTypeDialog: false,
        showEditUnitTypeDialog: false,
        showEditUnitDialog: false,
        editingUnit: null as ExtendedUnitData | null,
        showBulkStatusDialog: false,
        showBulkRentDialog: false,
        newUnit: { unitID: '', modelID: '' },
        // Edit unit form state
        editUnit: {} as Partial<ExtendedUnitData>,
        editUnitErrors: {} as Record<string, string>,
        editUnitLoading: false,
        newUnitType: {} as Partial<UnitTypeData>,
        selectedUnitType: null as UnitTypeData | null,
        bulkOperation: {
            loading: false,
            statusValue: '',
            rentUpdateType: 'absolute' as 'absolute' | 'percentage',
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
            selectedUnit: null as ExtendedUnitData | null,
            selectedModelID: '',
            keepCustomValues: {} as Record<string, boolean>,
            loading: false
        },

        // Module instances (created in init)
        _buildingCore: null as BuildingCore | null,
        _unitManagement: null as UnitManagement | null,
        _bulkOperations: null as BulkOperations | null,
        _unitTypeManagement: null as UnitTypeManagement | null,
        _formValidation: null as FormValidation | null,
        _apiHelpers: null as ApiHelpers | null,
        _stateHelpers: null as StateHelpers | null,
        inheritanceManager: new FieldInheritanceManager(),

        /**
         * Initialize the component state and all modules
         */
        init(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            // Initialize inheritance manager
            this.inheritanceManager = new FieldInheritanceManager();

            // Initialize all modules with the combined state
            this._buildingCore = new BuildingCore(this);
            this._unitManagement = new UnitManagement(this);
            this._bulkOperations = new BulkOperations(this);
            this._unitTypeManagement = new UnitTypeManagement(this);
            this._formValidation = new FormValidation(this);
            this._apiHelpers = new ApiHelpers(this);
            this._stateHelpers = new StateHelpers(this);

            // Initialize data from HTML dataset
            const element = this.$el as HTMLElement;
            this._buildingCore.initializeBuildingData(element);
            this._unitManagement.initializeUnitsData(element);
            this._unitTypeManagement.initializeUnitTypesData(element);

            // Setup all watchers
            this._buildingCore.setupBuildingWatchers();
            this._unitManagement.setupUnitWatchers();
            this._formValidation.setupValidationWatchers();
            this._stateHelpers.setupAllWatchers();

            // Update filtered units initially
            this._unitManagement.updateFilteredUnits();

            // Listen for dynamic data updates from parent component
            this.setupDataUpdateListener();
        },

        /**
         * Listen for dynamic data updates from parent BuildingManager
         */
        /**
         * Listen for dynamic data updates from parent BuildingManager
         */
        setupDataUpdateListener(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            // Watch for changes to data attributes
            this.$watch('$el.dataset.buildingData', (value: string) => {
                if(value) {
                    try {
                        const buildingData = JSON.parse(value);
                        this.building = buildingData;
                        // Update the original state when building data is loaded dynamically
                        // This ensures proper change detection for server-loaded data
                        if(this._buildingCore) {
                            this._buildingCore.updateOriginalState(buildingData);
                        }
                    } catch{
                        // Failed to parse building data - silently ignore
                    }
                }
            });

            this.$watch('$el.dataset.initialUnits', (value: string) => {
                if(value) {
                    try {
                        const units = JSON.parse(value);
                        this.units = map(units, (unit: ExtendedUnitData) => ({
                            ...unit,
                            lastUpdated: unit.lastUpdated || new Date().toISOString(),
                            status: unit.status || this._unitManagement?.getUnitStatus(unit) || 'unknown',
                            currentRent: unit.rent || 0,
                            editingRent: false,
                            savingField: null
                        }));
                        this._unitManagement?.updateFilteredUnits();
                    } catch{
                        // Failed to parse units data - silently ignore
                    }
                }
            });

            this.$watch('$el.dataset.initialUnitTypes', (value: string) => {
                if(value) {
                    try {
                        const unitTypes = JSON.parse(value);
                        this.unitTypes = unitTypes;
                    } catch{
                        // Failed to parse unit types data - silently ignore
                    }
                }
            });
        },

        /**
         * Handle building data update events from BuildingManager
         */
        handleBuildingDataUpdate(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, event: CustomEvent) {
            const { building: newBuilding, units: newUnits, unitTypes: newUnitTypes } = event.detail;

            if(newBuilding) {
                // Update building data
                this.building = newBuilding;
                // Update original state to prevent unsaved changes detection
                if(this._buildingCore) {
                    this._buildingCore.updateOriginalState(newBuilding);
                }
            }

            if(newUnits) {
                // Update units with extended properties
                this.units = map(newUnits, (unit: ExtendedUnitData) => ({
                    ...unit,
                    lastUpdated: unit.lastUpdated || new Date().toISOString(),
                    status: unit.status || this._unitManagement?.getUnitStatus(unit) || 'unknown',
                    currentRent: unit.rent || 0,
                    editingRent: false,
                    savingField: null
                }));
                this._unitManagement?.updateFilteredUnits();
            }

            if(newUnitTypes) {
                this.unitTypes = newUnitTypes;
            }
        },

        // Building Core Methods - maintain exact same interface
        parseBuildingData: noop,

        parseLocationData: noop,

        parseUnitsData: noop,

        parseUnitTypesData: noop,

        initializeUnitsTimestamps: noop,

        setupWatchers: noop,

        updateFilteredUnits(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this._unitManagement?.updateFilteredUnits();
        },

        validateForm(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            return this._formValidation?.validateBuildingForm() || false;
        },

        async saveBuilding(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            await this._buildingCore?.saveBuildingData();
        },

        async deleteBuilding(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            await this._buildingCore?.deleteBuildingData();
        },

        undoChanges(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this._buildingCore?.undoBuildingChanges();
        },

        // Unit Management Methods
        openAddUnitDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this._unitManagement?.openAddUnitDialog();
        },

        openAddUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this._unitTypeManagement?.openAddUnitTypeDialog();
        },

        closeAddUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this._unitTypeManagement?.closeAddUnitTypeDialog();
        },

        addUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this._unitTypeManagement?.addUnitType();
        },

        async updateUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, modelID: string, updates: Partial<UnitTypeData>) {
            await this._unitTypeManagement?.updateUnitType(modelID, updates);
        },

        async deleteUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, modelID: string) {
            await this._unitTypeManagement?.deleteUnitType(modelID);
        },

        editUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unitType: UnitTypeData) {
            this.selectedUnitType = unitType;
            this.showEditUnitTypeDialog = true;
        },

        closeEditUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this.showEditUnitTypeDialog = false;
            this.selectedUnitType = null;
        },

        async addUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            await this._unitManagement?.addUnit();
        },

        openEditUnitDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unit: ExtendedUnitData) {
            this._unitManagement?.openEditUnitDialog(unit);
            // Initialize the edit form when dialog opens
            this.$nextTick(() => {
                this.initializeEditForm();
            });
        },

        closeEditUnitDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this._unitManagement?.closeEditUnitDialog();
        },

        async updateUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unitId: string, updatedData: Partial<ExtendedUnitData>) {
            await this._unitManagement?.updateUnit(unitId, updatedData);
        },

        async deleteUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unitId: string) {
            await this._unitManagement?.deleteUnit(unitId);
        },

        // Edit unit form methods
        initializeEditForm(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
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
            return this.unitTypes.find((ut: UnitTypeData) => ut.modelID === this.editUnit.modelID) || null;
        },

        // Check if a field is inherited in edit form
        isEditFieldInherited(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, fieldName: string) {
            const unitData = this.editUnit;
            const unitType = this.editFormSelectedUnitType;
            return this.inheritanceManager.isInherited(unitData, unitType, fieldName);
        },

        // Get inherited value for a field in edit form
        getEditInheritedValue(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, fieldName: string) {
            const unitType = this.editFormSelectedUnitType;
            return this.inheritanceManager.getInheritedValue(unitType, fieldName);
        },

        // Get effective value (unit value or inherited value) in edit form
        getEditEffectiveValue(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, fieldName: string) {
            const unitData = this.editUnit;
            const unitType = this.editFormSelectedUnitType;
            return this.inheritanceManager.getEffectiveValue(unitData, unitType, fieldName);
        },

        // Get placeholder text for inherited values in edit form
        getEditFieldPlaceholder(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, fieldName: string, defaultPlaceholder = '') {
            const inheritedValue = this.getEditInheritedValue(fieldName);
            if(inheritedValue !== null && inheritedValue !== undefined) {
                return `Inherited: ${inheritedValue}`;
            }
            return defaultPlaceholder;
        },

        // Get inheritance badge text for edit form
        getEditInheritanceBadge(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, fieldName: string) {
            if(this.isEditFieldInherited(fieldName)) {
                return 'Inherited from floorplan';
            } else if(this.editFormSelectedUnitType && this.editUnit[fieldName] !== null && this.editUnit[fieldName] !== undefined && this.editUnit[fieldName] !== '') {
                return 'Custom override';
            }
            return null;
        },

        // Clear a specific field override to allow inheritance in edit form
        clearEditOverride(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, fieldName: string) {
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
        resetEditAllToFloorplan(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
            const overriddenFields: string[] = [];

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
        hasEditOverriddenFields(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(!this.editFormSelectedUnitType) {
                return false;
            }
            const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
            return inheritableFields.some(field => !this.isEditFieldInherited(field));
        },

        // Preview what values will change when selecting a new unit type in edit form
        previewEditUnitTypeChange(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, newModelID: string) {
            if(!newModelID) {
                return true;
            }

            const newUnitType = this.unitTypes.find((ut: UnitTypeData) => ut.modelID === newModelID);
            if(!newUnitType) {
                return true;
            }

            const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
            const changes: { field: string, from: string | number, to: string | number }[] = [];

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
                const changesList = changes.map((c: { field: string, from: string | number, to: string | number }) => `${c.field}: ${c.from} → ${c.to}`).join('\n');
                const confirmed = confirm(`Changing to ${newUnitType.modelName} will update these inherited values:\n\n${changesList}\n\nContinue?`);

                if(!confirmed) {
                    return false;
                }
            }

            return true;
        },

        // Watch for unit type changes to populate inherited values in edit form
        onEditUnitTypeChange(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
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

        async submitEditUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
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

        async confirmEditDeleteUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(!this.editingUnit) {
                return;
            }

            const unitDisplayName = this.editingUnit.unitNumber || this.editingUnit.unitID;
            if(confirm(`Are you sure you want to delete Unit ${unitDisplayName}?\n\nThis action cannot be undone.`)) {
                this.editUnitLoading = true;
                try {
                    this.$dispatch('delete-unit', {
                        unitId: this.editingUnit.unitID
                    });
                } catch(error) {
                    // eslint-disable-next-line no-console -- error logging for debugging
                    console.error('Delete unit error:', error);
                    this.$dispatch('show-toast', {
                        message: 'Failed to delete unit. Please try again.',
                        type: 'error'
                    });
                } finally {
                    this.editUnitLoading = false;
                }
            }
        },

        openAssignUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unit: ExtendedUnitData) {
            this._unitManagement?.openAssignUnitTypeDialog(unit);
        },

        closeAssignUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this._unitManagement?.closeAssignUnitTypeDialog();
        },

        async assignUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, assignmentData: { selectedModelID: string, keepCustomValues: Record<string, boolean> }) {
            await this._unitManagement?.assignUnitType(assignmentData);
        },

        openBulkCreateDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, modelID?: string) {
            this._unitManagement?.openBulkCreateDialog(modelID);
        },

        closeBulkCreateDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this._unitManagement?.closeBulkCreateDialog();
        },

        closeBulkCreateDialogWithPreservedState(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this._unitManagement?.closeBulkCreateDialogWithPreservedState();
        },

        async performBulkCreateUnits(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            await this._unitManagement?.performBulkCreateUnits();
        },

        // Unit Selection Methods
        toggleSelectAll(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this._unitManagement?.toggleSelectAll();
        },

        isUnitSelected(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unitID: string) {
            return this._unitManagement?.isUnitSelected(unitID) || false;
        },

        toggleUnitSelection(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unitID: string) {
            this._unitManagement?.toggleUnitSelection(unitID);
        },

        getSelectedCount(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            return this._unitManagement?.getSelectedCount() || 0;
        },

        // Bulk Operations Methods
        async performBulkStatusUpdate(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            await this._bulkOperations?.performBulkStatusUpdate();
        },

        async performBulkRentUpdate(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            await this._bulkOperations?.performBulkRentUpdate();
        },

        async toggleUnitAvailability(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unit: ExtendedUnitData) {
            await this._unitManagement?.toggleUnitAvailability(unit);
        },

        async updateUnitRent(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unit: ExtendedUnitData, newRentValue: string) {
            await this._unitManagement?.updateUnitRent(unit, newRentValue);
        },

        // Formatting helper methods - delegate to StateHelpers
        formatCurrency(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, amount: number | null | undefined) {
            return this._stateHelpers?.formatCurrency(amount) || '$0';
        },

        formatRelativeTime(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, dateString: string | undefined) {
            return this._stateHelpers?.formatRelativeTime(dateString) || 'Never';
        },

        getStatusBadgeClass(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, status: string | undefined) {
            return this._stateHelpers?.getStatusBadgeClass(status) || 'badge-ghost';
        },

        getTabDisplayName(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, tabKey: string) {
            return this._stateHelpers?.getTabDisplayName(tabKey) || tabKey;
        },

        // Rent Special Methods
        addRentSpecial(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this._buildingCore?.addRentSpecial();
        },

        removeRentSpecial(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, index: number) {
            this._buildingCore?.removeRentSpecial(index);
        }
    };
}

// Export the individual modules for direct usage in tests
export {
    BuildingCore,
    UnitManagement,
    BulkOperations,
    UnitTypeManagement,
    FormValidation,
    ApiHelpers,
    StateHelpers
};

// Export types for external usage
export type {
    BuildingCoreState,
    UnitManagementState,
    BulkOperationsState,
    UnitTypeManagementState,
    FormValidationState,
    ApiHelpersState,
    StateHelpersState,
    CombinedBuildingState
};

/**
 * Global window function for Alpine.js to use
 * Note: The window assignment is handled in BuildingProvider.astro
 * to avoid TypeScript conflicts with multiple window declarations
 */
