import type { UnitData, UnitTypeData, Amenity } from '../../types';
import type { AlpineMagicProperties } from '../alpine';
import type { InheritableField } from '../types/alpine-state';
import { FieldInheritanceManager } from './fieldInheritance';
import { UnitFormatters } from './unitFormatters';
import { UnitEventManager } from './unitEvents';
import { ValidationService, DepositService, AmenityService, ApiService } from './services';
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
    formatters: UnitFormatters | null
    events: UnitEventManager | null

    // New focused services
    validationService: ValidationService | null
    depositService: DepositService | null
    amenityService: AmenityService | null
    apiService: ApiService | null

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
        formatters: null as UnitFormatters | null,
        events: null as UnitEventManager | null,

        // New focused services
        validationService: null as ValidationService | null,
        depositService: null as DepositService | null,
        amenityService: null as AmenityService | null,
        apiService: null as ApiService | null,

        /**
         * Initialize the unit card state from HTML dataset
         */
        init(this: UnitCardState & AlpineMagicProperties) {
            // Initialize basic service instances
            this.fieldInheritance = new FieldInheritanceManager();
            this.formatters = new UnitFormatters();
            this.events = new UnitEventManager(this.$el);

            // Parse data from HTML dataset
            this.parseUnitData();
            this.parseUnitTypesData();
            this.apiURL = this.$el?.dataset?.apiUrl || '';

            // Initialize focused services (pass state reference)
            this.validationService = new ValidationService(this);
            this.depositService = new DepositService(this);
            this.amenityService = new AmenityService(this);
            this.apiService = new ApiService(this);

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
            if(this.depositService) {
                this.depositService.initializeDeposit();
            }
        },

        initializeSelectedUnitType() {
            if(this.unit?.modelID && this.unitTypes) {
                this.selectedUnitType = find(this.unitTypes, { modelID: this.unit!.modelID }) || null;
            }
        },

        async loadBuildingAmenities() {
            if(this.apiService) {
                await this.apiService.loadBuildingAmenities();
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
            if(!this.validationService) {
                return false;
            }

            return this.validationService.validateForm();
        },

        /**
         * Clear validation error for a specific field
         */
        clearFieldError(fieldName: string) {
            if(this.validationService) {
                this.validationService.clearFieldError(fieldName);
            }
        },

        /**
         * Save unit changes to the server
         */
        async saveUnit() {
            if(this.apiService) {
                await this.apiService.saveUnit();
            }
        },

        /**
         * Delete the unit
         */
        async deleteUnit() {
            if(this.apiService) {
                await this.apiService.deleteUnit();
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
            if(!this.amenityService) {
                return [];
            }
            return this.amenityService.getEffectiveAmenities();
        },

        getAmenityInheritanceSource(): string {
            if(!this.amenityService) {
                return 'none';
            }
            return this.amenityService.getAmenityInheritanceSource();
        },

        resetToInheritedAmenities() {
            if(this.amenityService) {
                this.amenityService.resetToInheritedAmenities();
            }
        },

        // Deposit methods
        getDepositAmount(): number | null {
            if(!this.depositService) {
                return null;
            }
            return this.depositService.getDepositAmount();
        },

        setDepositAmount(value: string | number) {
            if(this.depositService) {
                this.depositService.setDepositAmount(value);
            }
        },

        getDepositRefundable(): boolean {
            if(!this.depositService) {
                return true;
            }
            return this.depositService.getDepositRefundable();
        },

        setDepositRefundable(value: boolean) {
            if(this.depositService) {
                this.depositService.setDepositRefundable(value);
            }
        },

        getDepositPartialRefundPercentage(): number | null {
            if(!this.depositService) {
                return null;
            }
            return this.depositService.getDepositPartialRefundPercentage();
        },

        setDepositPartialRefundPercentage(value: string | number) {
            if(this.depositService) {
                this.depositService.setDepositPartialRefundPercentage(value);
            }
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
