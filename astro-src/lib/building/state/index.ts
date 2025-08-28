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
import { noop, map } from 'lodash';

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

        /**
         * Initialize the component state and all modules
         */
        init(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
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
