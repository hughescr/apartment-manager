import type { UnitData, UnitTypeData, Amenity } from '../../types';
import type { AlpineMagicProperties } from '../alpine';
import type { InheritableField } from '../types/alpine-state';
import { FieldInheritanceManager } from './fieldInheritance';
import { UnitFormValidator } from './formValidation';
import { UnitApiClient } from './apiOperations';
import { DepositManager } from './depositHandling';
import { AmenityInheritanceManager } from './amenityInheritance';
import { UnitFormatters } from './unitFormatters';
import { UnitEventManager } from './unitEvents';
import { find, forOwn } from 'lodash';

/**
 * Interface for unit card state object
 */
export interface UnitCardState {
    // Core data
    unit: UnitData | null
    originalUnit: UnitData | null
    unitTypes: UnitTypeData[]
    selectedUnitType: UnitTypeData | null
    apiURL: string

    // UI State
    saving: boolean
    errors: Record<string, string>
    expandedSections: {
        details: boolean
        amenities: boolean
        photos: boolean
        websites: boolean
    }
    buildingAmenities: Amenity[]

    // Service instances
    fieldInheritance: FieldInheritanceManager | null
    validator: UnitFormValidator | null
    apiClient: UnitApiClient | null
    depositManager: DepositManager | null
    amenityManager: AmenityInheritanceManager | null
    formatters: UnitFormatters | null
    events: UnitEventManager | null

    // Methods
    init(this: UnitCardState & AlpineMagicProperties): void
    parseUnitData(this: UnitCardState & AlpineMagicProperties): void
    parseUnitTypesData(this: UnitCardState & AlpineMagicProperties): void
    initializeUnitProperties(): void
    initializeSelectedUnitType(): void
    loadBuildingAmenities(): Promise<void>
    setupWatchers(this: UnitCardState & AlpineMagicProperties): void
    isDirty(): boolean
    validateForm(): boolean
    clearFieldError(fieldName: string): void
    saveUnit(): Promise<void>
    deleteUnit(): Promise<void>
    onModelChange(): void
    toggleSection(section: string): void
    isInherited(fieldName: string): boolean
    getInheritedValue(fieldName: string): unknown
    getEffectiveValue(fieldName: string): unknown
    resetFieldToInherited(fieldName: string): void
    getEffectiveAmenities(): Amenity[]
    getAmenityInheritanceSource(): string
    resetToInheritedAmenities(): void
    getDepositAmount(): number | null
    setDepositAmount(value: string | number): void
    getDepositRefundable(): boolean
    setDepositRefundable(value: boolean): void
    getDepositPartialRefundPercentage(): number | null
    setDepositPartialRefundPercentage(value: string | number): void
    formatCurrency(value: number | null | undefined): string
}

/**
 * Creates the Alpine.js state object for unit card management
 * This factory function orchestrates all the modular components
 */
export function createUnitCardState() {
    const state = unitCardStateObject();
    return state as typeof state & AlpineMagicProperties;
}

function unitCardStateObject(): UnitCardState {
    return {
        // Core data
        unit: null as UnitData | null,
        originalUnit: null as UnitData | null,
        unitTypes: [] as UnitTypeData[],
        selectedUnitType: null as UnitTypeData | null,
        apiURL: '',

        // UI State
        saving: false,
        errors: {} as Record<string, string>,
        expandedSections: {
            details: false,
            amenities: false,
            photos: false,
            websites: false
        },
        buildingAmenities: [] as Amenity[],

        // Service instances (will be initialized in init())
        fieldInheritance: null as FieldInheritanceManager | null,
        validator: null as UnitFormValidator | null,
        apiClient: null as UnitApiClient | null,
        depositManager: null as DepositManager | null,
        amenityManager: null as AmenityInheritanceManager | null,
        formatters: null as UnitFormatters | null,
        events: null as UnitEventManager | null,

        /**
         * Initialize the unit card state from HTML dataset
         */
        init(this: UnitCardState & AlpineMagicProperties) {
            // Initialize service instances
            this.fieldInheritance = new FieldInheritanceManager();
            this.validator = new UnitFormValidator();
            this.depositManager = new DepositManager();
            this.amenityManager = new AmenityInheritanceManager();
            this.formatters = new UnitFormatters();
            this.events = new UnitEventManager(this.$el);

            // Parse data from HTML dataset
            this.parseUnitData();
            this.parseUnitTypesData();
            this.apiURL = this.$el?.dataset?.apiUrl || '';

            // Initialize API client with URL
            this.apiClient = new UnitApiClient(this.apiURL);

            // Store original unit for change detection
            this.originalUnit = this.unit ? JSON.parse(JSON.stringify(this.unit)) : null;

            // Initialize unit properties
            this.initializeUnitProperties();

            // Find and set selected unit type
            this.initializeSelectedUnitType();

            // Load building amenities for inheritance
            this.loadBuildingAmenities();

            // Setup watchers
            this.setupWatchers();
        },

        parseUnitData(this: UnitCardState & AlpineMagicProperties) {
            try {
                const unitDataStr = this.$el?.dataset?.unit;
                if(unitDataStr) {
                    this.unit = JSON.parse(unitDataStr);
                }
            } catch{
                this.unit = null;
            }
        },

        parseUnitTypesData(this: UnitCardState & AlpineMagicProperties) {
            try {
                const unitTypesStr = this.$el?.dataset?.unitTypes;
                if(unitTypesStr) {
                    this.unitTypes = JSON.parse(unitTypesStr);
                }
            } catch{
                this.unitTypes = [];
            }
        },

        initializeUnitProperties() {
            if(!this.unit) {
                return;
            }

            // Initialize missing properties
            if(!this.unit.unitAmenities) {
                this.unit.unitAmenities = [];
            }
            if(!this.unit.photos) {
                this.unit.photos = [];
            }
            if(!this.unit.feedInclusion) {
                this.unit.feedInclusion = {};
            }
            if(!this.unit.manualReferences) {
                this.unit.manualReferences = {};
            }

            // Initialize vacancy status fields
            if(!this.unit.vacancyClass) {
                this.unit.vacancyClass = undefined;
            }
            if(!this.unit.vacateDate) {
                this.unit.vacateDate = '';
            }
            if(!this.unit.madeReadyDate) {
                this.unit.madeReadyDate = '';
            }

            // Initialize deposit structure
            if(this.depositManager) {
                this.depositManager.initializeDeposit(this.unit);
            }
        },

        initializeSelectedUnitType() {
            if(this.unit?.modelID && this.unitTypes) {
                this.selectedUnitType = find(this.unitTypes, { modelID: this.unit!.modelID }) || null;
            }
        },

        async loadBuildingAmenities() {
            if(!this.apiClient || !this.unit?.buildingID) {
                return;
            }

            try {
                this.buildingAmenities = (await this.apiClient.fetchBuildingAmenities(this.unit.buildingID)) as Amenity[];
            } catch{
                this.buildingAmenities = [];
            }
        },

        setupWatchers(this: UnitCardState & AlpineMagicProperties) {
            // Watch for unit changes to trigger auto-save
            this.$watch('unit', () => {
                if(this.isDirty()) {
                    this.saveUnit();
                }
            }, { deep: true });

            // Watch for section expansions
            this.$watch('expandedSections', (sections: typeof this.expandedSections) => {
                forOwn(sections, (expanded, section) => {
                    if(this.events) {
                        this.events.sectionToggled(section, expanded as boolean);
                    }
                });
            }, { deep: true });
        },

        /**
         * Check if unit has unsaved changes
         */
        isDirty(): boolean {
            if(!this.unit || !this.originalUnit) {
                return false;
            }
            return JSON.stringify(this.unit) !== JSON.stringify(this.originalUnit);
        },

        /**
         * Validate the form and return validation result
         */
        validateForm(): boolean {
            if(!this.validator || !this.unit) {
                return false;
            }

            const result = this.validator.validateForm(this.unit);
            this.errors = result.errors;

            if(!result.isValid && this.events) {
                this.events.validationError(result.errors);
            } else if(result.isValid && this.events) {
                this.events.validationCleared();
            }

            return result.isValid;
        },

        /**
         * Clear validation error for a specific field
         */
        clearFieldError(fieldName: string) {
            if(this.validator) {
                this.validator.clearFieldError(this.errors, fieldName);
            }
        },

        /**
         * Save unit changes to the server
         */
        async saveUnit() {
            if(!this.unit || !this.apiClient || !this.isDirty()) {
                return;
            }

            if(!this.validateForm()) {
                return;
            }

            this.saving = true;
            if(this.events) {
                this.events.unitSaving(this.unit);
            }

            try {
                const result = await this.apiClient.saveUnit(this.unit, this.unit.buildingID);

                if(result.success && result.unit) {
                    // Update both current and original unit
                    this.unit = result.unit as UnitData;
                    this.originalUnit = JSON.parse(JSON.stringify(this.unit));
                    this.errors = {};

                    if(this.events) {
                        this.events.unitSaved(this.unit);
                        this.events.showToast('Unit saved successfully', 'success');
                    }
                } else {
                    // Revert to original on save failure
                    if(this.originalUnit) {
                        this.unit = JSON.parse(JSON.stringify(this.originalUnit));
                    }

                    const errorMessage = result.error || 'Failed to save unit';
                    this.errors.submit = errorMessage;

                    if(this.events) {
                        this.events.unitSaveError(this.unit, errorMessage);
                        this.events.showToast(errorMessage, 'error');
                    }
                }
            } catch{
                // Revert to original on network error
                if(this.originalUnit) {
                    this.unit = JSON.parse(JSON.stringify(this.originalUnit));
                }

                const errorMessage = 'Network error. Please try again.';
                this.errors.submit = errorMessage;

                if(this.events) {
                    this.events.unitSaveError(this.unit, errorMessage);
                    this.events.showToast(errorMessage, 'error');
                }
            } finally {
                this.saving = false;
            }
        },

        /**
         * Delete the unit
         */
        async deleteUnit() {
            if(!this.unit || !this.apiClient) {
                return;
            }

            if(!confirm('Are you sure you want to delete this unit?')) {
                return;
            }

            if(this.events) {
                this.events.unitDeleting(this.unit.unitID);
            }

            try {
                const result = await this.apiClient.deleteUnit(this.unit.unitID, this.unit.buildingID);

                if(result.success) {
                    if(this.events) {
                        this.events.unitDeleted(this.unit.unitID);
                        this.events.showToast('Unit deleted successfully', 'success');
                    }
                    // Reload page or redirect
                    window.location.reload();
                } else {
                    const errorMessage = result.error || 'Failed to delete unit';
                    if(this.events) {
                        this.events.unitDeleteError(this.unit.unitID, errorMessage);
                        this.events.showToast(errorMessage, 'error');
                    }
                }
            } catch{
                const errorMessage = 'Network error during delete';
                if(this.events) {
                    this.events.unitDeleteError(this.unit.unitID, errorMessage);
                    this.events.showToast(errorMessage, 'error');
                }
            }
        },

        /**
         * Handle model/unit type change
         */
        onModelChange() {
            if(!this.unit) {
                return;
            }

            this.unit.modelID = this.selectedUnitType ? this.selectedUnitType.modelID : undefined;

            if(this.events) {
                this.events.modelChanged(this.unit, this.unit.modelID || null);
            }

            // Auto-save the change
            this.saveUnit();
        },

        /**
         * Toggle expansion of a section
         */
        toggleSection(section: string) {
            (this.expandedSections as Record<string, boolean>)[section] =
                !((this.expandedSections as Record<string, boolean>)[section]);
        },

        // Inheritance methods
        isInherited(fieldName: string): boolean {
            if(!this.fieldInheritance || !this.unit) {
                return false;
            }
            return this.fieldInheritance.isInherited(this.unit, this.selectedUnitType, fieldName as InheritableField);
        },

        getInheritedValue(fieldName: string): unknown {
            if(!this.fieldInheritance) {
                return null;
            }
            return this.fieldInheritance.getInheritedValue(this.selectedUnitType, fieldName as InheritableField);
        },

        getEffectiveValue(fieldName: string): unknown {
            if(!this.fieldInheritance || !this.unit) {
                return null;
            }
            return this.fieldInheritance.getEffectiveValue(this.unit, this.selectedUnitType, fieldName as InheritableField);
        },

        resetFieldToInherited(fieldName: string) {
            if(!this.fieldInheritance || !this.unit || !this.formatters) {
                return;
            }

            const inheritedValue = this.getInheritedValue(fieldName);
            const fieldDisplayName = this.formatters.getFieldDisplayName(fieldName);

            if(inheritedValue !== null &&
              confirm(`Reset ${fieldDisplayName} to inherited value (${inheritedValue})? This will clear the unit-specific value.`)) {
                this.fieldInheritance.resetFieldToInherited(this.unit, fieldName as InheritableField);

                if(this.events) {
                    this.events.fieldReset(this.unit, fieldName);
                }
            }
        },

        // Amenity methods
        getEffectiveAmenities(): Amenity[] {
            if(!this.amenityManager || !this.unit) {
                return [];
            }
            return this.amenityManager.getEffectiveAmenities(this.unit, this.selectedUnitType, this.buildingAmenities);
        },

        getAmenityInheritanceSource(): string {
            if(!this.amenityManager || !this.unit) {
                return 'none';
            }
            return this.amenityManager.getAmenityInheritanceSource(this.unit, this.selectedUnitType, this.buildingAmenities);
        },

        resetToInheritedAmenities() {
            if(!this.amenityManager || !this.unit) {
                return;
            }

            const source = this.getAmenityInheritanceSource();
            let message = 'This will remove unit-specific amenities. ';

            if(source === 'floorplan' || (this.selectedUnitType?.modelAmenities?.length ?? 0) > 0) {
                message += 'The unit will inherit amenities from its floorplan.';
            } else if(this.buildingAmenities.length > 0) {
                message += 'The unit will inherit amenities from the building.';
            } else {
                message += 'The unit will have no amenities.';
            }

            if(confirm(message + ' Continue?')) {
                this.amenityManager.resetToInheritedAmenities(this.unit);

                if(this.events) {
                    this.events.amenitiesReset(this.unit);
                }
            }
        },

        // Deposit methods
        getDepositAmount(): number | null {
            if(!this.depositManager || !this.unit) {
                return null;
            }
            return this.depositManager.getDepositAmount(this.unit.deposit);
        },

        setDepositAmount(value: string | number) {
            if(!this.depositManager || !this.unit) {
                return;
            }
            this.depositManager.setDepositAmount(this.unit, value);
        },

        getDepositRefundable(): boolean {
            if(!this.depositManager || !this.unit) {
                return true;
            }
            return this.depositManager.isDepositRefundable(this.unit.deposit);
        },

        setDepositRefundable(value: boolean) {
            if(!this.depositManager || !this.unit) {
                return;
            }
            this.depositManager.setDepositRefundable(this.unit, value);
        },

        getDepositPartialRefundPercentage(): number | null {
            if(!this.depositManager || !this.unit) {
                return null;
            }
            return this.depositManager.getDepositPartialRefundPercentage(this.unit.deposit);
        },

        setDepositPartialRefundPercentage(value: string | number) {
            if(!this.depositManager || !this.unit) {
                return;
            }
            this.depositManager.setDepositPartialRefundPercentage(this.unit, value);
        },

        // Formatting methods
        formatCurrency(value: number | null | undefined): string {
            if(!this.formatters) {
                return '';
            }
            return this.formatters.formatCurrency(value);
        }
    };
}

/**
 * Global window function for Alpine.js to use
 */
declare global {
    interface Window {
        unitCardData: typeof createUnitCardState
    }
}

// Expose to global for Alpine.js usage
if(typeof window !== 'undefined') {
    window.unitCardData = createUnitCardState;
}
