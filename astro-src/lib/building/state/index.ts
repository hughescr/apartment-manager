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
import { noop } from 'lodash';

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
        newUnitType: {} as Partial<UnitTypeData>,
        bulkOperation: {
            loading: false,
            statusValue: '',
            rentUpdateType: 'absolute' as 'absolute' | 'percentage',
            rentValue: 0
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
        openAddUnitDialog() {
            this._unitManagement?.openAddUnitDialog();
        },

        openAddUnitTypeDialog() {
            this._unitTypeManagement?.openAddUnitTypeDialog();
        },

        closeAddUnitTypeDialog() {
            this._unitTypeManagement?.closeAddUnitTypeDialog();
        },

        async addUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            await this._unitManagement?.addUnit();
        },

        // Unit Selection Methods
        toggleSelectAll() {
            this._unitManagement?.toggleSelectAll();
        },

        isUnitSelected(unitID: string) {
            return this._unitManagement?.isUnitSelected(unitID) || false;
        },

        toggleUnitSelection(unitID: string) {
            this._unitManagement?.toggleUnitSelection(unitID);
        },

        getSelectedCount() {
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
        formatCurrency(amount: number | null | undefined) {
            return this._stateHelpers?.formatCurrency(amount) || '$0';
        },

        formatRelativeTime(dateString: string | undefined) {
            return this._stateHelpers?.formatRelativeTime(dateString) || 'Never';
        },

        getStatusBadgeClass(status: string | undefined) {
            return this._stateHelpers?.getStatusBadgeClass(status) || 'badge-ghost';
        },

        getTabDisplayName(tabKey: string) {
            return this._stateHelpers?.getTabDisplayName(tabKey) || tabKey;
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
