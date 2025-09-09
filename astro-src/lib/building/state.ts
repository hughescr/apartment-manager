import type { BuildingData, UnitTypeData, VacancyClass } from '../../types';
import type { AlpineMagicProperties } from '../alpine';
import type { ExtendedUnitData } from './types';
import type { BuildingStateWithMagic } from '../types/alpine-state';
import { FieldInheritanceManager } from '../unit-card/fieldInheritance';

export interface LocationConfig {
    lat?: number
    lng?: number
    mapboxToken?: string
}
import { BuildingApiService } from './services/buildingApiService';
import { validateBuildingForm, validateSingleField, hasUnsavedChanges } from './validation';
import { BuildingFormatters } from './utils/formatters';
import {
    filter,
    forEach,
    map,
    keys,
    values,
    trim,
    isError,
    noop,
    find,
    findIndex,
    reduce,
    isString,
    isNumber
} from 'lodash';
// import { logger } from '@hughescr/logger'; // Commented out - causes browser compatibility issues

/**
 * Unit type validation utilities
 */

/**
 * Validation rules for numeric fields
 */
export const UNIT_TYPE_NUMERIC_RULES = [
    { field: 'beds', min: 0, max: 10, message: 'Beds must be between 0 and 10' },
    { field: 'baths', min: 0, max: 10, message: 'Baths must be between 0 and 10' },
    { field: 'minSqft', min: 0, max: 10000, message: 'Minimum square feet must be between 0 and 10,000' },
    { field: 'maxSqft', min: 0, max: 10000, message: 'Maximum square feet must be between 0 and 10,000' },
    { field: 'minRent', min: 0, max: 50000, message: 'Minimum rent must be between $0 and $50,000' },
    { field: 'maxRent', min: 0, max: 50000, message: 'Maximum rent must be between $0 and $50,000' }
] as const;

/**
 * Validates complete unit type data and returns validation result
 */
export function validateUnitType(unitType: Partial<UnitTypeData>): { isValid: boolean, errors: Record<string, string> } {
    const errors: string[] = [];

    // Validate required fields
    validateRequiredFields(unitType, errors);

    // Validate numeric ranges
    validateNumericRanges(unitType, errors);

    // Validate logical constraints
    validateLogicalConstraints(unitType, errors);

    return {
        isValid: errors.length === 0,
        errors: reduce(errors, (acc, error, index) => {
            acc[`error_${index}`] = error;
            return acc;
        }, {} as Record<string, string>)
    };
}

/**
 * Validates a single unit type field and returns error message if invalid
 */
export function validateUnitTypeField(
    fieldName: keyof UnitTypeData,
    value: unknown
): string | null {
    switch(fieldName) {
        case 'modelID':
            return validateRequiredString(value, 'Model ID');
        case 'modelName':
            return validateRequiredString(value, 'Model name');
        case 'beds':
            return validateNumericField(value, 0, 10, 'Beds');
        case 'baths':
            return validateNumericField(value, 0, 10, 'Baths');
        case 'minSqft':
            return validateNumericField(value, 0, 10000, 'Minimum square feet');
        case 'maxSqft':
            return validateNumericField(value, 0, 10000, 'Maximum square feet');
        case 'minRent':
            return validateNumericField(value, 0, 50000, 'Minimum rent');
        case 'maxRent':
            return validateNumericField(value, 0, 50000, 'Maximum rent');
        default:
            return null;
    }
}

/**
 * Validate required fields for unit type
 */
function validateRequiredFields(unitType: Partial<UnitTypeData>, errors: string[]): void {
    if(!unitType.modelID || trim(unitType.modelID) === '') {
        errors.push('Model ID is required');
    }

    if(!unitType.modelName || trim(unitType.modelName) === '') {
        errors.push('Model name is required');
    }
}

/**
 * Validate numeric ranges for unit type
 */
function validateNumericRanges(unitType: Partial<UnitTypeData>, errors: string[]): void {
    for(const rule of UNIT_TYPE_NUMERIC_RULES) {
        const value = unitType[rule.field as keyof UnitTypeData];
        if(!isValidNumericField(value, rule.min, rule.max)) {
            errors.push(rule.message);
        }
    }
}

/**
 * Validate logical constraints (min <= max relationships)
 */
function validateLogicalConstraints(unitType: Partial<UnitTypeData>, errors: string[]): void {
    // Validate sqft range
    if(unitType.minSqft !== undefined && unitType.maxSqft !== undefined) {
        if(unitType.minSqft > unitType.maxSqft) {
            errors.push('Minimum square feet cannot be greater than maximum square feet');
        }
    }

    // Validate rent range
    if(unitType.minRent !== undefined && unitType.maxRent !== undefined) {
        if(unitType.minRent > unitType.maxRent) {
            errors.push('Minimum rent cannot be greater than maximum rent');
        }
    }
}

/**
 * Validate a single numeric field
 */
function isValidNumericField(
    value: unknown,
    min: number,
    max: number
): boolean {
    if(value === undefined || value === null) {
        return true; // Skip validation for undefined/null values
    }
    const numValue = value as number;
    return numValue >= min && numValue <= max;
}

/**
 * Validate a required string field
 */
function validateRequiredString(value: unknown, fieldName: string): string | null {
    if(!value || !isString(value) || trim(value) === '') {
        return `${fieldName} is required`;
    }
    return null;
}

/**
 * Validate a numeric field with bounds
 */
function validateNumericField(
    value: unknown,
    min: number,
    max: number,
    fieldName: string
): string | null {
    if(value === undefined || value === null) {
        return null; // Optional fields
    }

    const numValue = value as number;
    if(!isNumber(numValue) || isNaN(numValue)) {
        return `${fieldName} must be a valid number`;
    }

    if(numValue < min || numValue > max) {
        return `${fieldName} must be between ${min} and ${max.toLocaleString()}`;
    }

    return null;
}

/**
 * Unit type CRUD operations
 */
export interface UnitTypeCrudOperations {
    unitTypes: UnitTypeData[]
}

/**
 * Pure CRUD operations for unit types
 * Provides data manipulation without state management or UI concerns
 */
export class UnitTypeCrud {
    /**
     * Add a new unit type to the collection
     */
    static addUnitType(unitTypes: UnitTypeData[], unitType: UnitTypeData): UnitTypeData[] {
        return [...unitTypes, unitType];
    }

    /**
     * Update an existing unit type by model ID
     */
    static updateUnitType(
        unitTypes: UnitTypeData[],
        modelID: string,
        updates: Partial<UnitTypeData>
    ): UnitTypeData[] {
        const index = findIndex(unitTypes, { modelID });

        if(index === -1) {
            return unitTypes;
        }

        const updated = [...unitTypes];
        updated[index] = {
            ...updated[index],
            ...updates,
            updatedAt: new Date()
        };

        return updated;
    }

    /**
     * Remove a unit type by model ID
     */
    static removeUnitType(unitTypes: UnitTypeData[], modelID: string): UnitTypeData[] {
        return filter(unitTypes, (ut: UnitTypeData) => ut.modelID !== modelID);
    }

    /**
     * Find a unit type by model ID
     */
    static findUnitType(unitTypes: UnitTypeData[], modelID: string): UnitTypeData | undefined {
        return find(unitTypes, { modelID });
    }

    /**
     * Get all unit types (returns a copy)
     */
    static getAllUnitTypes(unitTypes: UnitTypeData[]): UnitTypeData[] {
        return [...unitTypes];
    }

    /**
     * Get available unit types (with available count > 0)
     */
    static getAvailableUnitTypes(unitTypes: UnitTypeData[]): UnitTypeData[] {
        return filter(unitTypes, (ut: UnitTypeData) => (ut.countAvailable ?? 0) > 0);
    }

    /**
     * Create a new unit type with default values
     */
    static createNewUnitType(buildingID: string, partial: Partial<UnitTypeData> = {}): UnitTypeData {
        // Filter out null values from partial to avoid overriding undefined defaults
        const filteredPartial: Partial<UnitTypeData> = {};
        for(const [key, value] of Object.entries(partial)) {
            if(value !== null) {
                (filteredPartial as Record<string, unknown>)[key] = value;
            }
        }

        const unitType: UnitTypeData = {
            buildingID,
            modelID: '',
            modelName: '',
            beds: 1,
            baths: 1,
            minSqft: undefined,
            maxSqft: undefined,
            minRent: undefined,
            maxRent: undefined,
            countAvailable: 1,
            modelAmenities: [],
            updatedAt: new Date(),
            ...filteredPartial
        };

        // Final cleanup: remove only optional undefined values for API serialization
        // Keep required fields even if they're empty strings
        const cleanedUnitType: UnitTypeData = {
            ...unitType
        };

        // Remove only optional undefined fields that shouldn't be sent to API
        if(cleanedUnitType.minSqft === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).minSqft;
        }
        if(cleanedUnitType.maxSqft === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).maxSqft;
        }
        if(cleanedUnitType.minRent === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).minRent;
        }
        if(cleanedUnitType.maxRent === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).maxRent;
        }
        if(cleanedUnitType.countAvailable === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).countAvailable;
        }
        if(cleanedUnitType.dateAvailable === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).dateAvailable;
        }
        if(cleanedUnitType.maxOccupants === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).maxOccupants;
        }
        if(cleanedUnitType.perPersonRent === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).perPersonRent;
        }
        if(cleanedUnitType.deposit === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).deposit;
        }
        if(cleanedUnitType.minLeaseTerm === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).minLeaseTerm;
        }
        if(cleanedUnitType.maxLeaseTerm === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).maxLeaseTerm;
        }

        return cleanedUnitType;
    }
}

/**
 * Building data parser utilities
 */
class BuildingDataParser {
    static parseBuildingData(element: HTMLElement): BuildingData | null {
        // Check if the element itself has the data attribute first
        let buildingEl: HTMLElement | null = null;
        if(element.hasAttribute('data-building-data')) {
            buildingEl = element;
        } else {
            // If not, look for a child element with the data attribute
            buildingEl = element.querySelector('[data-building-data]');
        }

        if(!buildingEl) {
            return null;
        }

        try {
            const buildingData = buildingEl.dataset.buildingData;
            if(!buildingData) {
                return null;
            }
            return JSON.parse(buildingData);
        } catch{
            return null;
        }
    }

    static parseUnitsData(element: HTMLElement): ExtendedUnitData[] {
        // Check if the element itself has the data attribute first
        let unitsEl: HTMLElement | null = null;
        if(element.hasAttribute('data-initial-units')) {
            unitsEl = element;
        } else {
            // If not, look for a child element with the data attribute
            unitsEl = element.querySelector('[data-initial-units]');
        }

        if(!unitsEl) {
            return [];
        }

        try {
            const unitsData = unitsEl.dataset.initialUnits;
            if(!unitsData) {
                return [];
            }

            const units = JSON.parse(unitsData) as ExtendedUnitData[];

            // Initialize extended properties for each unit
            return map(units, unit => ({
                ...unit,
                lastUpdated: unit.lastUpdated || new Date().toISOString(),
                status: unit.status || this.getUnitStatus(unit),
                currentRent: unit.rent || 0,
                editingRent: false,
                savingField: null
            }));
        } catch{
            return [];
        }
    }

    static parseUnitTypesData(element: HTMLElement): UnitTypeData[] {
        // Check if the element itself has the data attribute first
        let unitTypesEl: HTMLElement | null = null;
        if(element.hasAttribute('data-initial-unit-types')) {
            unitTypesEl = element;
        } else {
            // If not, look for a child element with the data attribute
            unitTypesEl = element.querySelector('[data-initial-unit-types]');
        }

        if(!unitTypesEl) {
            return [];
        }

        try {
            const unitTypesData = unitTypesEl.dataset.initialUnitTypes;
            if(!unitTypesData) {
                return [];
            }
            return JSON.parse(unitTypesData);
        } catch{
            return [];
        }
    }

    static parseApiUrl(element: HTMLElement): string {
        // Check if the element itself has the data attribute first
        let apiUrlEl: HTMLElement | null = null;
        if(element.hasAttribute('data-api-url')) {
            apiUrlEl = element;
        } else {
            // If not, look for a child element with the data attribute
            apiUrlEl = element.querySelector('[data-api-url]');
        }

        if(!apiUrlEl) {
            return '';
        }

        return apiUrlEl.dataset.apiUrl || '';
    }

    private static getUnitStatus(unit: ExtendedUnitData): string {
        if(unit.vacancyClass) {
            switch(unit.vacancyClass) {
                case 'Occupied':
                    return 'Occupied';
                case 'Notice':
                    return 'Notice to Vacate';
                case 'Unoccupied':
                    return 'Vacant';
                case 'Down':
                    return 'Model Unit';
                default:
                    return 'Unknown';
            }
        }
        return 'Unknown';
    }

    static initializeUnitTimestamps(units: ExtendedUnitData[]): void {
        const now = new Date().toISOString();
        const unitsWithoutTimestamp = filter(units, unit => !unit.lastUpdated);
        forEach(unitsWithoutTimestamp, (unit) => {
            unit.lastUpdated = now;
        });
    }

    static parseLocationData(element: HTMLElement): LocationConfig | null {
        // Check if the element itself has the data attribute first
        let locationEl: HTMLElement | null = null;
        if(element.hasAttribute('data-location-config')) {
            locationEl = element;
        } else {
            // If not, look for a child element with the data attribute
            locationEl = element.querySelector('[data-location-config]');
        }

        if(!locationEl) {
            return null;
        }

        try {
            const locationData = locationEl.dataset.locationConfig;
            if(!locationData) {
                return null;
            }
            return JSON.parse(locationData);
        } catch{
            return null;
        }
    }

    static serializeBuildingData(building: BuildingData): string {
        return JSON.stringify(building);
    }

    static serializeUnitsData(units: ExtendedUnitData[]): string {
        // Remove runtime-only properties before serialization
        const cleanUnits = map(units, (unit) => {
            const { editingRent: _editingRent, savingField: _savingField, ...cleanUnit } = unit;
            return cleanUnit;
        });
        return JSON.stringify(cleanUnits);
    }
}

/**
 * Units state management utilities
 */
class UnitsStateManager {
    constructor(
        private units: ExtendedUnitData[],
        private selectedUnits: Set<string>
    ) {}

    updateFilteredUnits(statusFilter: string, searchQuery: string): ExtendedUnitData[] {
        let filtered = [...this.units];

        // Apply status filter
        if(statusFilter && statusFilter !== 'all') {
            filtered = filtered.filter((unit) => {
                switch(statusFilter) {
                    case 'available':
                        return unit.vacancyClass === 'Unoccupied' || unit.vacancyClass === 'Notice';
                    case 'occupied':
                        return unit.vacancyClass === 'Occupied';
                    case 'notice':
                        return unit.vacancyClass === 'Notice';
                    case 'vacant':
                        return unit.vacancyClass === 'Unoccupied';
                    case 'model':
                        return unit.vacancyClass === 'Down';
                    default:
                        return true;
                }
            });
        }

        // Apply search query
        if(searchQuery && searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((unit): unit is ExtendedUnitData => {
                return !!(
                    unit.unitID.toLowerCase().includes(query) ||
                    (unit.description && unit.description.toLowerCase().includes(query)) ||
                    (unit.beds && unit.beds.toString().includes(query)) ||
                    (unit.baths && unit.baths.toString().includes(query)) ||
                    (unit.rent && unit.rent.toString().includes(query))
                );
            });
        }

        // Sort by unit ID
        filtered.sort((a, b) => {
            // Try to parse as numbers first
            const aNum = parseInt(a.unitID);
            const bNum = parseInt(b.unitID);

            if(!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
            }

            // Fall back to string comparison
            return a.unitID.localeCompare(b.unitID);
        });

        return filtered;
    }

    toggleSelectAll(filteredUnits: ExtendedUnitData[]): void {
        const allSelected = filteredUnits.every(unit => this.selectedUnits.has(unit.unitID));

        if(allSelected) {
            // Deselect all filtered units
            filteredUnits.forEach(unit => this.selectedUnits.delete(unit.unitID));
        } else {
            // Select all filtered units
            filteredUnits.forEach(unit => this.selectedUnits.add(unit.unitID));
        }
    }

    toggleUnitSelection(unitID: string): void {
        if(this.selectedUnits.has(unitID)) {
            this.selectedUnits.delete(unitID);
        } else {
            this.selectedUnits.add(unitID);
        }
    }

    isUnitSelected(unitID: string): boolean {
        return this.selectedUnits.has(unitID);
    }

    getSelectedCount(): number {
        return this.selectedUnits.size;
    }

    clearSelection(): void {
        this.selectedUnits.clear();
    }

    updateUnit(unitID: string, updates: Partial<ExtendedUnitData>): void {
        const unitIndex = this.units.findIndex(unit => unit.unitID === unitID);
        if(unitIndex !== -1) {
            this.units[unitIndex] = {
                ...this.units[unitIndex],
                ...updates,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    removeUnit(unitID: string): void {
        const unitIndex = this.units.findIndex(unit => unit.unitID === unitID);
        if(unitIndex !== -1) {
            this.units.splice(unitIndex, 1);
            this.selectedUnits.delete(unitID);
        }
    }

    addUnit(unit: ExtendedUnitData): void {
        this.units.push({
            ...unit,
            lastUpdated: new Date().toISOString()
        });
    }

    getUnit(unitID: string): ExtendedUnitData | undefined {
        return this.units.find(unit => unit.unitID === unitID);
    }
}

/**
 * Creates the Alpine.js state object for building management
 * This is a consolidated version that combines all modular functionality
 */
export function createBuildingState(): BuildingStateWithMagic {
    const state = buildingStateObject();
    return state as BuildingStateWithMagic;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Alpine.js requires dynamic typing for proper state management
function buildingStateObject(): any {
    return {
        // Core state properties
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

        // Internal helpers
        inheritanceManager: new FieldInheritanceManager(),
        unitsManager: null as UnitsStateManager | null,
        apiService: null as BuildingApiService | null,
        suspendWatcher: false, // Flag to temporarily disable change detection
        initTimeoutId: null as ReturnType<typeof setTimeout> | null, // Timeout ID for cleanup

        /**
         * Initialize the component state
         */
        init(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            // Initialize inheritance manager
            this.inheritanceManager = new FieldInheritanceManager();

            // Initialize data from HTML dataset
            const element = this.$el as HTMLElement;
            this.initializeBuildingData(element);
            this.initializeUnitsData(element);
            this.initializeUnitTypesData(element);

            // Initialize API service
            this.apiURL = BuildingDataParser.parseApiUrl(element);
            if(this.apiURL) {
                this.apiService = new BuildingApiService(this.apiURL);
            }

            // Initialize units manager
            this.unitsManager = new UnitsStateManager(this.units, this.selectedUnits);

            // Setup all watchers
            this.setupBuildingWatchers();
            this.setupUnitWatchers();
            this.setupValidationWatchers();
            this.setupAllWatchers();

            // Update filtered units initially
            this.updateFilteredUnits();

            // Listen for dynamic data updates from parent component
            this.setupDataUpdateListener();
        },

        /**
         * Initialize building data from HTML dataset
         */
        initializeBuildingData(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, element: HTMLElement): void {
            // Parse building data
            this.building = BuildingDataParser.parseBuildingData(element);

            // Store original state for change detection
            // Only set original if building data is actually loaded
            if(this.building) {
                this.original = JSON.parse(JSON.stringify(this.building));
                // Initialize expanded state for existing rent specials
                this.initializeRentSpecialStates();
            }
        },

        /**
         * Initialize units data from HTML dataset
         */
        initializeUnitsData(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, element: HTMLElement): void {
            // Parse units data
            this.units = BuildingDataParser.parseUnitsData(element);

            // Initialize timestamps
            BuildingDataParser.initializeUnitTimestamps(this.units);
        },

        /**
         * Initialize unit types data from HTML dataset
         */
        initializeUnitTypesData(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, element: HTMLElement): void {
            this.unitTypes = BuildingDataParser.parseUnitTypesData(element);
        },

        /**
         * Initialize expanded state for existing rent specials
         */
        initializeRentSpecialStates(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): void {
            if(this.building?.rentSpecials) {
                // Initialize expanded state for all existing rent specials (default to collapsed)
                this.building.rentSpecials.forEach((special: { id?: string | number }) => {
                    if(special.id && !(special.id in this.expandedRentSpecials)) {
                        this.expandedRentSpecials[special.id] = false;
                    }
                });
            }
        },

        /**
         * Setup watchers for building state changes
         */
        setupBuildingWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): void {
            // Watch for building changes to update showSave
            // Use a flag to prevent triggering during initial setup
            let initialSetupComplete = false;

            this.$watch('building', (value: BuildingData | null) => {
                // Only check for unsaved changes after initial setup is complete and watcher is not suspended
                if(initialSetupComplete && this.original && !this.suspendWatcher) {
                    this.showSave = hasUnsavedChanges(this.building, this.original);
                }
                if(value) {
                    this.$dispatch('building:updated', { building: value });
                }
            }, { deep: true });
            // Mark initial setup as complete after a short delay to allow for data loading
            this.$nextTick(() => {
                this.initTimeoutId = setTimeout(() => {
                    initialSetupComplete = true;
                    // If original hasn't been set yet but building has data, set it now
                    if(!this.original && this.building) {
                        this.original = JSON.parse(JSON.stringify(this.building));
                    }
                    // Clear the timeout ID since it's completed
                    this.initTimeoutId = null;
                }, 100);
            });
        },

        /**
         * Setup watchers for unit state changes
         */
        setupUnitWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): void {
            // Watch for units changes
            this.$watch('units', () => this.updateFilteredUnits());
            this.$watch('statusFilter', () => this.updateFilteredUnits());

            // Watch for search query changes
            this.$watch('searchQuery', () => {
                if(this.searchQuery !== undefined) {
                    this.$dispatch('units:filter', {
                        filter: this.statusFilter,
                        query: this.searchQuery
                    });
                }
            });

            // Watch for selection changes
            this.$watch('selectedUnits', () => {
                this.$dispatch('units:selection-changed', {
                    selected: Array.from(this.selectedUnits)
                });
            });
        },

        /**
         * Setup validation watchers
         */
        setupValidationWatchers: noop,

        /**
         * Setup all state watchers for reactive behavior
         */
        setupAllWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): void {
            this.setupFilterWatchers();
            this.setupSearchWatchers();
            this.setupSelectionWatchers();
            this.setupGeocodingWatchers();
        },

        /**
         * Setup filter-related watchers
         */
        setupFilterWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): void {
            this.$watch('statusFilter', () => {
                this.$dispatch('units:filter-changed', {
                    filter: this.statusFilter
                });
            });
        },

        /**
         * Setup search-related watchers
         */
        setupSearchWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): void {
            this.$watch('searchQuery', () => {
                if(this.searchQuery !== undefined) {
                    this.$dispatch('units:filter', {
                        filter: this.statusFilter,
                        query: this.searchQuery
                    });
                }
            });
        },

        /**
         * Setup selection-related watchers
         */
        setupSelectionWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): void {
            this.$watch('selectedUnits', () => {
                this.$dispatch('units:selection-changed', {
                    selected: Array.from(this.selectedUnits)
                });
            });
        },

        /**
         * Setup geocoding state watchers
         */
        setupGeocodingWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): void {
            this.$watch('geocoding', (value: boolean) => {
                this.$dispatch('location:geocoding', { geocoding: value });
            });
        },

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
                        if(this.building) {
                            this.updateOriginalState(buildingData);
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
                            status: unit.status || this.getUnitStatus(unit) || 'unknown',
                            currentRent: unit.rent || 0,
                            editingRent: false,
                            savingField: null
                        }));
                        this.updateFilteredUnits();
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
                this.updateOriginalState(newBuilding);
            }

            if(newUnits) {
                // Update units with extended properties
                this.units = map(newUnits, (unit: ExtendedUnitData) => ({
                    ...unit,
                    lastUpdated: unit.lastUpdated || new Date().toISOString(),
                    status: unit.status || this.getUnitStatus(unit) || 'unknown',
                    currentRent: unit.rent || 0,
                    editingRent: false,
                    savingField: null
                }));
                this.updateFilteredUnits();
            }

            if(newUnitTypes) {
                this.unitTypes = newUnitTypes;
            }
        },

        /**
         * Get unit status from vacancy class
         */
        getUnitStatus(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unit: ExtendedUnitData): string {
            if(unit.vacancyClass) {
                switch(unit.vacancyClass) {
                    case 'Occupied':
                        return 'Occupied';
                    case 'Notice':
                        return 'Notice to Vacate';
                    case 'Unoccupied':
                        return 'Vacant';
                    case 'Down':
                        return 'Model Unit';
                    default:
                        return 'Unknown';
                }
            }
            return 'Unknown';
        },

        // Building Core Methods
        parseBuildingData: noop,
        parseLocationData: noop,
        parseUnitsData: noop,
        parseUnitTypesData: noop,
        initializeUnitsTimestamps: noop,
        setupWatchers: noop,

        updateFilteredUnits(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(this.unitsManager) {
                this.filteredUnits = this.unitsManager.updateFilteredUnits(
                    this.statusFilter,
                    this.searchQuery
                );
            }

            this.$dispatch('units:updated', {
                filter: this.statusFilter,
                query: this.searchQuery
            });
        },

        validateForm(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            const result = validateBuildingForm(this.building);
            this.errors = result.errors;

            this.$dispatch('building:validate', {
                isValid: result.isValid,
                errors: result.errors
            });

            return result.isValid;
        },

        async saveBuilding(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            // Remove validation check - we now allow saving with warnings
            if(!this.building || !this.apiService) {
                return;
            }

            this.saving = true;
            try {
                const result = await this.apiService.saveBuilding(this.building);

                if(!result.success) {
                    throw new Error(result.error || 'Failed to save building');
                }

                // Check if response has validation warnings
                const responseData = result.data ? { ...result.data } as Record<string, unknown> : null;
                const warnings = responseData?._validationWarnings as Record<string, string> | undefined;

                // Use the response data as the source of truth, not merge it with existing state
                let savedBuilding: BuildingData;
                if(responseData) {
                    // Remove the _validationWarnings from the saved data
                    delete (responseData as { _validationWarnings?: unknown })._validationWarnings;
                    // Use the response data directly as it contains the complete saved building
                    savedBuilding = responseData as unknown as BuildingData;
                } else {
                    // No response data indicates potential API issue
                    // Use current building state as fallback, but this means changes might not be persisted
                    savedBuilding = { ...this.building };
                }

                // Suspend watcher temporarily to avoid triggering change detection during state sync
                this.suspendWatcher = true;

                // Update both building and original state atomically
                this.building = savedBuilding;
                this.original = JSON.parse(JSON.stringify(savedBuilding));
                this.showSave = false;

                // Re-enable watcher and dispatch reset event
                this.$nextTick(() => {
                    this.suspendWatcher = false;
                    this.$dispatch('building:state-reset', {
                        building: this.building,
                        original: this.original
                    });
                });

                // Show success indicator and auto-hide after 3 seconds
                this.lastSaveSuccess = true;
                setTimeout(() => {
                    this.lastSaveSuccess = false;
                }, 3000);

                // Show appropriate success message based on warnings
                if(warnings && keys(warnings).length > 0) {
                    const warningCount = keys(warnings).length;
                    this.$dispatch('toast:show', {
                        message: `Building saved with ${warningCount} warning${warningCount > 1 ? 's' : ''}. Complete all fields to publish.`,
                        type: 'warning'
                    });
                } else {
                    this.$dispatch('toast:show', {
                        message: 'Building saved successfully',
                        type: 'success'
                    });
                }

                this.$dispatch('photos:updated', {
                    photos: this.building.photos || []
                });

                this.$dispatch('building:reset', {
                    building: this.building
                });
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to save building: ' + (isError(error) ? error.message : 'Unknown error'),
                    type: 'error'
                });
            } finally {
                this.saving = false;
            }
        },

        async deleteBuilding(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(!this.building || !this.apiService) {
                return;
            }

            if(!confirm('Are you sure you want to delete this building?')) {
                return;
            }

            try {
                const result = await this.apiService.deleteBuilding(this.building.buildingID);

                if(!result.success) {
                    throw new Error(result.error || 'Failed to delete building');
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

        /**
         * Update original state when data is loaded dynamically
         * This is called when building data is loaded from the server
         */
        updateOriginalState(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, building: BuildingData): void {
            this.original = JSON.parse(JSON.stringify(building));
            this.showSave = false;
        },

        // Unit Management Methods
        openAddUnitDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this.showAddUnitDialog = true;
            this.newUnit = { unitID: '', modelID: '' };
        },

        closeAddUnitDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this.showAddUnitDialog = false;
            this.newUnit = { unitID: '', modelID: '' };
        },

        // Unit Type Management Methods
        openAddUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this.showAddUnitTypeDialog = true;
            this.newUnitType = {
                modelID: '',
                modelName: '',
                beds: 1,
                baths: 1,
                minSqft: undefined,
                maxSqft: undefined,
                minRent: undefined,
                maxRent: undefined,
                buildingID: this.building?.buildingID || ''
            };
        },

        closeAddUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this.showAddUnitTypeDialog = false;
            this.newUnitType = {};
        },

        async addUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            // Validate the new unit type
            const validation = validateUnitType(this.newUnitType);
            if(!validation.isValid) {
                const firstError = values(validation.errors)[0] || 'Invalid unit type data';
                this.$dispatch('toast:show', {
                    message: firstError,
                    type: 'error'
                });
                return;
            }

            // Ensure we have the building ID
            const buildingID = this.building?.buildingID;
            if(!buildingID) {
                this.$dispatch('toast:show', {
                    message: 'Building ID not available',
                    type: 'error'
                });
                return;
            }

            try {
                // Create unit type with defaults
                const unitType = UnitTypeCrud.createNewUnitType(
                    buildingID,
                    this.newUnitType
                );

                // Call API if available
                if(this.apiService) {
                    const response = await this.apiService.addUnitType(buildingID, unitType);
                    if(!response.success) {
                        this.$dispatch('toast:show', {
                            message: response.error || 'Failed to save unit type',
                            type: 'error'
                        });
                        // Keep dialog open for retry
                        return;
                    }

                    // Use the response data if available, otherwise use the local unit type
                    const savedUnitType = response.data || unitType;

                    // Add to local collection
                    this.unitTypes = UnitTypeCrud.addUnitType(this.unitTypes, savedUnitType);
                } else {
                    // Fallback: just update local state if no API
                    this.unitTypes = UnitTypeCrud.addUnitType(this.unitTypes, unitType);
                }

                this.closeAddUnitTypeDialog();

                this.$dispatch('toast:show', {
                    message: 'Unit type added successfully',
                    type: 'success'
                });

                this.$dispatch('unit-types:updated', {
                    unitTypes: this.unitTypes
                });
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                    type: 'error'
                });
                // Keep dialog open for retry on network errors
            }
        },

        async updateUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, modelID: string, updates: Partial<UnitTypeData>) {
            const buildingID = this.building?.buildingID;
            if(!buildingID) {
                this.$dispatch('toast:show', {
                    message: 'Building ID not available',
                    type: 'error'
                });
                return;
            }

            try {
                // Call API if available
                if(this.apiService) {
                    const response = await this.apiService.updateUnitType(buildingID, modelID, updates);
                    if(!response.success) {
                        this.$dispatch('toast:show', {
                            message: response.error || 'Failed to update unit type',
                            type: 'error'
                        });
                        return;
                    }
                    // Update local state with response data if available
                    if(response.data) {
                        const updatedUnitTypes = UnitTypeCrud.updateUnitType(this.unitTypes, modelID, response.data);
                        // Force reactivity by creating a new array reference
                        this.unitTypes.length = 0;
                        this.unitTypes.push(...updatedUnitTypes);
                    } else {
                        const updatedUnitTypes = UnitTypeCrud.updateUnitType(this.unitTypes, modelID, updates);
                        // Force reactivity by creating a new array reference
                        this.unitTypes.length = 0;
                        this.unitTypes.push(...updatedUnitTypes);
                    }
                } else {
                    // Fallback: just update local state if no API
                    const updatedUnitTypes = UnitTypeCrud.updateUnitType(this.unitTypes, modelID, updates);
                    // Force reactivity by creating a new array reference
                    this.unitTypes.length = 0;
                    this.unitTypes.push(...updatedUnitTypes);
                }

                this.$dispatch('toast:show', {
                    message: 'Unit type updated successfully',
                    type: 'success'
                });

                this.$dispatch('unit-types:updated', {
                    unitTypes: this.unitTypes
                });
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                    type: 'error'
                });
            }
        },

        async deleteUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, modelID: string) {
            if(!confirm(`Are you sure you want to delete unit type ${modelID}?`)) {
                return;
            }

            const buildingID = this.building?.buildingID;
            if(!buildingID) {
                this.$dispatch('toast:show', {
                    message: 'Building ID not available',
                    type: 'error'
                });
                return;
            }

            try {
                // Call API if available
                if(this.apiService) {
                    const response = await this.apiService.deleteUnitType(buildingID, modelID);
                    if(!response.success) {
                        this.$dispatch('toast:show', {
                            message: response.error || 'Failed to delete unit type',
                            type: 'error'
                        });
                        return;
                    }
                }

                // Remove from local state
                const initialLength = this.unitTypes.length;
                const updatedUnitTypes = UnitTypeCrud.removeUnitType(this.unitTypes, modelID);

                // Force reactivity by creating a new array reference
                this.unitTypes.length = 0;
                this.unitTypes.push(...updatedUnitTypes);

                if(this.unitTypes.length < initialLength) {
                    this.$dispatch('toast:show', {
                        message: 'Unit type deleted successfully',
                        type: 'success'
                    });

                    this.$dispatch('unit-types:updated', {
                        unitTypes: this.unitTypes
                    });
                }
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                    type: 'error'
                });
            }
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
            if(!trim(this.newUnit.unitID) || !this.newUnit.modelID || !this.apiService || !this.building) {
                return;
            }

            try {
                const result = await this.apiService.addUnit(this.building.buildingID, {
                    ...this.newUnit,
                    vacancyClass: 'Unoccupied' as VacancyClass
                });

                if(!result.success || !result.data) {
                    throw new Error(result.error || 'Failed to add unit');
                }

                this.unitsManager?.addUnit(result.data);
                this.updateFilteredUnits();
                this.closeAddUnitDialog();

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

        openEditUnitDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unit: ExtendedUnitData) {
            this.showEditUnitDialog = true;
            this.editingUnit = { ...unit };
            // Initialize the edit form when dialog opens
            this.$nextTick(() => {
                this.initializeEditForm();
            });
        },

        closeEditUnitDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this.showEditUnitDialog = false;
            this.editingUnit = null;
        },

        async updateUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unitId: string, updatedData: Partial<ExtendedUnitData>) {
            if(!this.apiService || !this.building || !this.editingUnit) {
                // eslint-disable-next-line no-console -- temporary debugging while fixing browser compatibility
                console.error('updateUnit: Missing required dependencies', {
                    hasApiService: !!this.apiService,
                    hasBuilding: !!this.building,
                    hasEditingUnit: !!this.editingUnit
                });
                return;
            }

            try {
                const updatedUnit = {
                    ...this.editingUnit,
                    ...updatedData,
                    lastUpdated: new Date().toISOString()
                };

                const result = await this.apiService.updateUnit(this.building.buildingID, updatedUnit);

                if(!result.success) {
                    throw new Error(result.error || 'Failed to update unit');
                }

                // Update local state
                this.unitsManager?.updateUnit(unitId, {
                    ...updatedData,
                    lastUpdated: new Date().toISOString()
                });
                this.updateFilteredUnits();
                this.closeEditUnitDialog();

                this.$dispatch('toast:show', {
                    message: `Unit ${this.editingUnit.unitNumber || unitId} updated successfully`,
                    type: 'success'
                });
            } catch(error) {
                // eslint-disable-next-line no-console -- temporary debugging while fixing browser compatibility
                console.error('updateUnit: Error occurred', {
                    error,
                    unitId,
                    updatedData
                });
                this.$dispatch('toast:show', {
                    message: 'Failed to update unit: ' + (isError(error) ? error.message : 'Unknown error'),
                    type: 'error'
                });
                throw error;
            }
        },

        async deleteUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unitId: string) {
            if(!this.apiService || !this.building || !this.editingUnit) {
                return;
            }

            try {
                const result = await this.apiService.deleteUnit(this.building.buildingID, unitId);

                if(!result.success) {
                    throw new Error(result.error || 'Failed to delete unit');
                }

                // Update local state
                this.unitsManager?.removeUnit(unitId);
                this.updateFilteredUnits();
                this.closeEditUnitDialog();

                this.$dispatch('toast:show', {
                    message: `Unit ${this.editingUnit.unitNumber || unitId} deleted successfully`,
                    type: 'success'
                });
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to delete unit: ' + (isError(error) ? error.message : 'Unknown error'),
                    type: 'error'
                });
                throw error;
            }
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
                if(this.editUnit.beds !== null && this.editUnit.beds < 0) {
                    this.editUnitErrors.beds = 'Bedrooms must be 0 or greater';
                }
                if(this.editUnit.baths !== null && this.editUnit.baths < 0.5) {
                    this.editUnitErrors.baths = 'Bathrooms must be 0.5 or greater';
                }
                if(this.editUnit.rent !== null && this.editUnit.rent < 0) {
                    this.editUnitErrors.rent = 'Rent must be 0 or greater';
                }
                if(this.editUnit.rent !== null && this.editUnit.rent > 25000) {
                    this.editUnitErrors.rent = 'Rent must be less than $25,000';
                }

                if(Object.keys(this.editUnitErrors).length > 0) {
                    this.editUnitLoading = false;
                    return;
                }

                // Dispatch update event with unit ID and changes
                this.$dispatch('update-unit', {
                    unitId: this.editingUnit?.unitID,
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

        // Unit assignment methods
        openAssignUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unit: ExtendedUnitData) {
            this.showAssignUnitTypeDialog = true;
            this.assignUnitTypeData = {
                selectedUnit: unit,
                selectedModelID: '',
                keepCustomValues: {},
                loading: false
            };
        },

        closeAssignUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this.showAssignUnitTypeDialog = false;
            this.assignUnitTypeData = {
                selectedUnit: null,
                selectedModelID: '',
                keepCustomValues: {},
                loading: false
            };
        },

        async assignUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, assignmentData: { selectedModelID: string, keepCustomValues: Record<string, boolean> }) {
            if(!this.assignUnitTypeData.selectedUnit || !assignmentData.selectedModelID || !this.apiService || !this.building) {
                return;
            }

            const unit = this.assignUnitTypeData.selectedUnit;
            this.assignUnitTypeData.loading = true;

            try {
                // Create updated unit data
                const updatedUnit = {
                    ...unit,
                    modelID: assignmentData.selectedModelID,
                    lastUpdated: new Date().toISOString()
                };

                // Reset fields to null if they should inherit from the unit type
                const inheritableFields = ['beds', 'baths', 'sqft', 'rent', 'deposit', 'minLeaseTerm', 'maxLeaseTerm', 'maxOccupants', 'perPersonRent'];

                inheritableFields.forEach((field) => {
                    // If we're not keeping the custom value, clear it so it inherits
                    if(!assignmentData.keepCustomValues[field]) {
                        // Only clear if the unit currently has a value
                        if(unit[field as keyof ExtendedUnitData] !== null && unit[field as keyof ExtendedUnitData] !== undefined) {
                            (updatedUnit as Record<string, unknown>)[field] = null;
                        }
                    }
                });

                const result = await this.apiService.updateUnit(this.building.buildingID, updatedUnit);

                if(!result.success) {
                    throw new Error(result.error || 'Failed to assign unit type');
                }

                // Update local state
                this.unitsManager?.updateUnit(unit.unitID, {
                    modelID: assignmentData.selectedModelID,
                    ...Object.fromEntries(
                        inheritableFields
                            .filter(field => !assignmentData.keepCustomValues[field])
                            .map(field => [field, null])
                    ),
                    lastUpdated: new Date().toISOString()
                });
                this.updateFilteredUnits();
                this.closeAssignUnitTypeDialog();

                this.$dispatch('toast:show', {
                    message: `Unit ${unit.unitID} successfully assigned to unit type`,
                    type: 'success'
                });
            } catch(error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to assign unit type: ' + (isError(error) ? error.message : 'Unknown error'),
                    type: 'error'
                });
            } finally {
                this.assignUnitTypeData.loading = false;
            }
        },

        // Bulk create methods
        openBulkCreateDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, modelID?: string) {
            this.showBulkCreateDialog = true;
            // Use Object.assign to avoid type checking issues
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

        closeBulkCreateDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this.showBulkCreateDialog = false;
            // Use Object.assign to avoid type checking issues
            Object.assign(this.bulkCreateData, {
                modelID: '',
                count: null,
                patternType: 'numeric' as const,
                startingNumber: '101',
                prefix: '',
                suffix: '',
                customUnitNumbers: '',
                unitNumbers: [],
                vacancyClass: 'Unoccupied'
            });
            // Clear any previous errors and loading state
            if('errors' in this.bulkOperation) {
                this.bulkOperation.errors = undefined;
            }
            if('successfulUnits' in this.bulkOperation) {
                this.bulkOperation.successfulUnits = undefined;
            }
            this.bulkOperation.loading = false;
        },

        closeBulkCreateDialogWithPreservedState(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this.showBulkCreateDialog = false;
            // Clear results but preserve form data for retry
            if('errors' in this.bulkOperation) {
                this.bulkOperation.errors = undefined;
            }
            if('successfulUnits' in this.bulkOperation) {
                this.bulkOperation.successfulUnits = undefined;
            }
            this.bulkOperation.loading = false;
        },

        async performBulkCreateUnits(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(!this.bulkCreateData.unitNumbers.length || !this.bulkCreateData.modelID || !this.apiService || !this.building) {
                return;
            }

            // Initialize loading state and clear previous errors
            this.bulkOperation.loading = true;
            if('errors' in this.bulkOperation) {
                this.bulkOperation.errors = undefined;
            }
            if('successfulUnits' in this.bulkOperation) {
                this.bulkOperation.successfulUnits = undefined;
            }

            try {
                const { results, errors } = await this.createUnitsFromNumbers();
                this.finalizeBulkCreation(results, errors);
            } catch(error) {
                this.bulkOperation.loading = false;
                this.$dispatch('toast:show', {
                    message: 'Failed to create units: ' + (isError(error) ? error.message : 'Unknown error'),
                    type: 'error'
                });
            }
        },

        /**
         * Create units from the unit numbers list
         */
        async createUnitsFromNumbers(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): Promise<{ results: ExtendedUnitData[], errors: { unitNumber: string, error: string }[] }> {
            const results: ExtendedUnitData[] = [];
            const errors: { unitNumber: string, error: string }[] = [];

            for(const unitNumber of this.bulkCreateData.unitNumbers) {
                try {
                    const result = await this.apiService!.addUnit(this.building!.buildingID, {
                        unitID: unitNumber,
                        unitNumber: unitNumber,
                        modelID: this.bulkCreateData.modelID,
                        vacancyClass: this.bulkCreateData.vacancyClass as VacancyClass
                    });

                    if(!result.success || !result.data) {
                        throw new Error(result.error || `Failed to create unit ${unitNumber}`);
                    }

                    results.push(result.data);
                    this.unitsManager?.addUnit(result.data);
                } catch(error) {
                    errors.push({
                        unitNumber,
                        error: isError(error) ? error.message : 'Unknown error'
                    });
                }
            }

            return { results, errors };
        },

        /**
         * Finalize bulk creation and show appropriate messages
         */
        finalizeBulkCreation(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, results: ExtendedUnitData[], errors: { unitNumber: string, error: string }[]): void {
            this.updateFilteredUnits();

            // Store errors in state for dialog display
            if('errors' in this.bulkOperation) {
                this.bulkOperation.errors = errors;
            }
            if('successfulUnits' in this.bulkOperation) {
                this.bulkOperation.successfulUnits = results
                    .map(r => r.unitNumber)
                    .filter((unitNumber): unitNumber is string => unitNumber != null);
            }
            this.bulkOperation.loading = false;

            const successCount = results.length;
            const totalAttempted = this.bulkCreateData.unitNumbers.length;
            const isFullSuccess = successCount === totalAttempted;
            const isCompleteFailure = successCount === 0;

            if(isCompleteFailure) {
                // All units failed - keep dialog open with error details and preserve form state
                this.$dispatch('toast:show', {
                    message: 'All units failed to create. Please review the errors in the dialog and try again.',
                    type: 'error',
                    duration: 6000
                });
            } else if(isFullSuccess) {
                // Complete success - close dialog and reset form
                this.closeBulkCreateDialog();
                this.$dispatch('toast:show', {
                    message: `Successfully created all ${successCount} units`,
                    type: 'success'
                });
            } else {
                // Partial success - keep dialog open with error details for retry
                this.$dispatch('toast:show', {
                    message: `Created ${successCount} of ${totalAttempted} units. ${errors.length} units failed - review errors and try again.`,
                    type: 'warning',
                    duration: 8000
                });
            }
        },

        // Unit Selection Methods
        toggleSelectAll(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            this.unitsManager?.toggleSelectAll(this.filteredUnits);
        },

        isUnitSelected(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unitID: string) {
            return this.unitsManager?.isUnitSelected(unitID) || false;
        },

        toggleUnitSelection(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unitID: string) {
            this.unitsManager?.toggleUnitSelection(unitID);
        },

        getSelectedCount(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            return this.unitsManager?.getSelectedCount() || 0;
        },

        // Bulk Operations Methods
        async performBulkStatusUpdate(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(this.selectedUnits.size === 0 || !this.bulkOperation.statusValue || !this.apiService || !this.building) {
                return;
            }

            this.bulkOperation.loading = true;
            try {
                const unitIDs = Array.from(this.selectedUnits);
                const result = await this.apiService.bulkUpdateUnits(
                    this.building.buildingID,
                    unitIDs,
                    { status: this.bulkOperation.statusValue }
                );

                if(!result.success) {
                    throw new Error(result.error || 'Failed to update units');
                }

                // Update local state
                forEach(this.units, (unit) => {
                    if(unitIDs.includes(unit.unitID)) {
                        unit.vacancyClass = this.bulkOperation.statusValue as VacancyClass;
                        unit.lastUpdated = new Date().toISOString();
                    }
                });

                this.unitsManager?.clearSelection();
                this.showBulkStatusDialog = false;
                this.bulkOperation.statusValue = '';

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

        async performBulkRentUpdate(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(this.selectedUnits.size === 0 || !this.bulkOperation.rentValue || !this.apiService || !this.building) {
                return;
            }

            this.bulkOperation.loading = true;
            try {
                const unitIDs = Array.from(this.selectedUnits);
                const result = await this.apiService.bulkUpdateUnits(
                    this.building.buildingID,
                    unitIDs,
                    {
                        rentUpdateType: this.bulkOperation.rentUpdateType,
                        rent: this.bulkOperation.rentValue
                    }
                );

                if(!result.success) {
                    throw new Error(result.error || 'Failed to update rents');
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

                this.unitsManager?.clearSelection();
                this.showBulkRentDialog = false;
                this.bulkOperation.rentValue = 0;

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

        async toggleUnitAvailability(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unit: ExtendedUnitData) {
            if(!this.apiService || !this.building) {
                return;
            }

            const newStatus = unit.vacancyClass === 'Occupied' ? 'Unoccupied' : 'Occupied';

            try {
                const updatedUnit = {
                    ...unit,
                    vacancyClass: newStatus as VacancyClass,
                    lastUpdated: new Date().toISOString()
                };

                const result = await this.apiService.updateUnit(this.building.buildingID, updatedUnit);

                if(!result.success) {
                    throw new Error(result.error || 'Failed to update unit');
                }

                // Update local state
                this.unitsManager?.updateUnit(unit.unitID, {
                    vacancyClass: newStatus,
                    lastUpdated: new Date().toISOString()
                });
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

        async updateUnitRent(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unit: ExtendedUnitData, newRentValue: string) {
            if(!this.apiService || !this.building) {
                return;
            }

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
                const updatedUnit = {
                    ...unit,
                    rent: rentAmount,
                    lastUpdated: new Date().toISOString()
                };

                const result = await this.apiService.updateUnit(this.building.buildingID, updatedUnit);

                if(!result.success) {
                    throw new Error('Rent update failed');
                }

                // Update local state
                this.unitsManager?.updateUnit(unit.unitID, {
                    rent: rentAmount,
                    lastUpdated: new Date().toISOString()
                });

                this.$dispatch('toast:show', {
                    message: `Unit ${unit.unitID} rent updated`,
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
        formatCurrency(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, amount: number | null | undefined) {
            return BuildingFormatters.formatCurrency(amount);
        },

        formatRelativeTime(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, dateString: string | undefined) {
            return BuildingFormatters.formatRelativeTime(dateString);
        },

        getStatusBadgeClass(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, status: string | undefined) {
            return BuildingFormatters.getStatusBadgeClass(status);
        },

        getTabDisplayName(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, tabKey: string) {
            return BuildingFormatters.getTabDisplayName(tabKey);
        },

        /**
         * Get the display value for a unit field, considering inheritance from unit type
         */
        // eslint-disable-next-line complexity -- Unit display value requires field-specific formatting
        getUnitDisplayValue(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, unit: ExtendedUnitData, fieldName: 'beds' | 'baths' | 'sqft' | 'rent' | 'maxOccupants' | 'perPersonRent' | 'deposit' | 'minLeaseTerm' | 'maxLeaseTerm') {
            if(!this.inheritanceManager || !unit) {
                return '—';
            }

            // Find the unit type for this unit
            const unitType = this.unitTypes?.find((ut: UnitTypeData) => ut.modelID === unit.modelID) || null;

            // Get the effective value using inheritance manager
            const value = this.inheritanceManager.getEffectiveValue(unit, unitType, fieldName);

            // Handle null/undefined values
            if(value === null || value === undefined || value === '') {
                return '—';
            }

            // Format specific field types
            switch(fieldName) {
                case 'sqft':
                    if(Array.isArray(value)) {
                        // Handle range values like [min, max]
                        const [min, max] = value;
                        if(min === max) {
                            return min?.toString() || '—';
                        }
                        return `${min || '?'}–${max || '?'}`;
                    }
                    return value.toString();

                case 'rent':
                    if(Array.isArray(value)) {
                        // Handle range values like [min, max]
                        const [min, max] = value;
                        if(min === max) {
                            return min || 0;
                        }
                        return min || 0; // For rent display, show minimum
                    }
                    return value || 0;

                case 'beds':
                case 'baths':
                case 'maxOccupants':
                case 'minLeaseTerm':
                case 'maxLeaseTerm':
                    return value.toString();

                case 'perPersonRent':
                case 'deposit':
                    return value || 0;

                default:
                    return value?.toString() || '—';
            }
        },

        // Rent Special Methods
        addRentSpecial(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties) {
            if(!this.building) {
                return;
            }

            // Initialize rentSpecials array if it doesn't exist
            if(!this.building.rentSpecials) {
                this.building.rentSpecials = [];
            }

            // Add new rent special with unique ID
            const newSpecial = {
                id: Date.now() + Math.random(),
                title: '',
                description: '',
                startDate: '',
                endDate: ''
            };
            this.building.rentSpecials.push(newSpecial);

            // Initialize expanded state for the new rent special (default to expanded for editing)
            this.expandedRentSpecials[newSpecial.id] = true;
        },

        removeRentSpecial(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, index: number) {
            if(!this.building?.rentSpecials) {
                return;
            }

            // Get the rent special being removed to clean up its expanded state
            const removedSpecial = this.building.rentSpecials[index];
            if(removedSpecial?.id) {
                delete this.expandedRentSpecials[removedSpecial.id];
            }

            this.building.rentSpecials.splice(index, 1);
        },

        // Form validation methods
        validateField(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, fieldName: string, value: unknown): boolean {
            const error = validateSingleField(fieldName, value, this.building || undefined);

            if(error) {
                this.errors[fieldName] = error;
                return false;
            } else {
                // Remove error if validation passes
                if(this.errors[fieldName]) {
                    delete this.errors[fieldName];
                }
                return true;
            }
        },

        clearErrors(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): void {
            this.errors = {};
        },

        clearFieldError(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, fieldName: string): void {
            if(this.errors[fieldName]) {
                delete this.errors[fieldName];
            }
        },

        hasValidationErrors(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): boolean {
            return keys(this.errors).length > 0;
        },

        getFieldError(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties, fieldName: string): string | null {
            return this.errors[fieldName] || null;
        },

        getAllErrors(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): Record<string, string> {
            return { ...this.errors };
        },

        hasUnsavedChanges(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): boolean {
            return hasUnsavedChanges(this.building, this.original);
        },

        // Utility methods
        getFilterSummary(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): {
            total: number
            filtered: number
            selected: number
            hasFilter: boolean
        } {
            return {
                total: this.units.length,
                filtered: this.filteredUnits.length,
                selected: this.selectedUnits.size,
                hasFilter: !!(this.statusFilter || this.searchQuery)
            };
        },

        getStatusCounts(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): Record<string, number> {
            const counts: Record<string, number> = {
                all: this.units.length,
                occupied: 0,
                vacant: 0,
                notice: 0,
                model: 0,
                available: 0
            };

            this.units.forEach((unit: ExtendedUnitData) => {
                switch(unit.vacancyClass) {
                    case 'Occupied':
                        counts.occupied++;
                        break;
                    case 'Unoccupied':
                        counts.vacant++;
                        counts.available++;
                        break;
                    case 'Notice':
                        counts.notice++;
                        counts.available++;
                        break;
                    case 'Down':
                        counts.model++;
                        break;
                }
            });

            return counts;
        },

        getFormattedAddress(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): string {
            if(!this.building) {
                return '';
            }

            const parts = [
                this.building.street,
                this.building.city,
                this.building.state,
                this.building.zip
            ].filter(Boolean);

            return parts.join(', ');
        },

        getOccupancyRate(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): number {
            if(this.units.length === 0) {
                return 0;
            }

            const occupiedCount = this.units
                .filter((unit: ExtendedUnitData) => unit.vacancyClass === 'Occupied')
                .length;

            return Math.round((occupiedCount / this.units.length) * 100);
        },

        getAverageRent(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): number {
            const unitsWithRent = this.units.filter((unit: ExtendedUnitData) => unit.rent && unit.rent > 0) as ExtendedUnitData[];

            if(unitsWithRent.length === 0) {
                return 0;
            }

            const totalRent = unitsWithRent.reduce((sum: number, unit: ExtendedUnitData) => sum + (unit.rent || 0), 0);
            return Math.round(totalRent / unitsWithRent.length);
        },

        /**
         * Cleanup method to prevent memory leaks
         * Should be called when the component is destroyed
         */
        destroy(this: ReturnType<typeof buildingStateObject> & AlpineMagicProperties): void {
            // Clear any pending initialization timeout
            if(this.initTimeoutId !== null) {
                clearTimeout(this.initTimeoutId);
                this.initTimeoutId = null;
            }
        }
    };
}

/**
 * State interfaces for compatibility with modular architecture tests
 */
export interface BuildingCoreState {
    building: BuildingData | null
    original: BuildingData | null
    apiURL: string
    saving: boolean
    showSave: boolean
    lastSaveSuccess: boolean
    errors: Record<string, string>
    expandedRentSpecials: Record<string, boolean>
}

export interface UnitManagementState {
    building: BuildingData | null
    units: ExtendedUnitData[]
    filteredUnits: ExtendedUnitData[]
    selectedUnits: Set<string>
    statusFilter: string
    searchQuery: string
    showBulkCreateDialog: boolean
    bulkCreateData: {
        modelID: string
        count: number | null
        patternType: string
        startingNumber: string
        prefix: string
        suffix: string
        customUnitNumbers: string
        unitNumbers: string[]
        vacancyClass: string
    }
    bulkOperation: {
        loading: boolean
        statusValue: string
        rentUpdateType: 'absolute' | 'percentage'
        rentValue: number
        errors: { unitNumber: string, error: string }[] | undefined
        successfulUnits: string[] | undefined
    }
}

export interface UnitTypeManagementState {
    building: BuildingData | null
    apiURL: string
    unitTypes: UnitTypeData[]
    newUnitType: Partial<UnitTypeData>
    selectedUnitType: UnitTypeData | null
    showAddUnitTypeDialog: boolean
    showEditUnitTypeDialog: boolean
}

/**
 * Compatibility wrapper for BuildingCore to support existing tests
 */
export class BuildingCore {
    private stateObj: ReturnType<typeof buildingStateObject> & AlpineMagicProperties;

    constructor(state: BuildingCoreState & AlpineMagicProperties) {
        // Extend the original state object with building state methods
        const buildingState = buildingStateObject();

        // Preserve the original Alpine methods from the mock
        const originalMethods = {
            $el: state.$el,
            $watch: state.$watch,
            $nextTick: state.$nextTick,
            $dispatch: state.$dispatch,
            $store: state.$store,
            $root: state.$root
        };

        // Add missing methods to the original state object
        Object.assign(state, buildingState);

        // Restore the original Alpine methods to ensure mocking works
        Object.assign(state, originalMethods);

        // Use the extended original state object
        this.stateObj = state as ReturnType<typeof buildingStateObject> & AlpineMagicProperties;

        // Initialize the consolidated state functionality
        if(!this.stateObj.init) {
            // If init method doesn't exist, create minimal initialization
            this.stateObj.init = function() {
                this.inheritanceManager = new FieldInheritanceManager();
            };
        }
    }

    initializeBuildingData(element: HTMLElement): void {
        if(this.stateObj.initializeBuildingData) {
            this.stateObj.initializeBuildingData(element);
        }
        // Ensure apiURL is updated from the element
        const apiUrl = BuildingDataParser.parseApiUrl(element);
        if(apiUrl) {
            this.stateObj.apiURL = apiUrl;
            // Initialize API service if not already done
            if(!this.stateObj.apiService && apiUrl) {
                this.stateObj.apiService = new BuildingApiService(apiUrl);
            }
        }
    }

    setupBuildingWatchers(): void {
        this.stateObj.setupBuildingWatchers?.();
    }

    validateBuildingForm(): boolean {
        return this.stateObj.validateForm?.() || false;
    }

    async saveBuildingData(): Promise<void> {
        if(this.stateObj.saveBuilding) {
            return this.stateObj.saveBuilding();
        }
    }

    async deleteBuildingData(): Promise<void> {
        if(this.stateObj.deleteBuilding) {
            return this.stateObj.deleteBuilding();
        }
    }

    undoBuildingChanges(): void {
        if(this.stateObj.undoChanges) {
            this.stateObj.undoChanges();
        }
    }

    updateOriginalState(building: BuildingData): void {
        this.stateObj.updateOriginalState?.(building);
    }

    updateBuildingField(fieldName: string, value: unknown): void {
        if(this.stateObj.building && fieldName in this.stateObj.building) {
            (this.stateObj.building as Record<string, unknown>)[fieldName] = value;
        }
    }

    getBuildingData(): BuildingData | null {
        return this.stateObj.building;
    }

    hasUnsavedChanges(): boolean {
        return this.stateObj.hasUnsavedChanges?.() || false;
    }

    addRentSpecial(): void {
        this.stateObj.addRentSpecial?.();
    }

    removeRentSpecial(index: number): void {
        this.stateObj.removeRentSpecial?.(index);
    }

    destroy(): void {
        this.stateObj.destroy?.();
    }
}

/**
 * Compatibility wrapper for UnitManagement to support existing tests
 */
export class UnitManagement {
    private stateObj: ReturnType<typeof buildingStateObject> & AlpineMagicProperties;

    constructor(state: UnitManagementState & AlpineMagicProperties) {
        // Extend the original state object with building state methods
        const buildingState = buildingStateObject();

        // Preserve all original state properties (not just Alpine methods)
        const originalProperties = { ...state };

        // Add missing methods to the original state object
        Object.assign(state, buildingState);

        // Restore the original properties to ensure mocking works, but keep the new methods
        Object.keys(originalProperties).forEach((key) => {
            if(originalProperties[key as keyof typeof originalProperties] !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for dynamic property assignment in wrapper
                (state as any)[key] = originalProperties[key as keyof typeof originalProperties];
            }
        });

        // Use the extended original state object
        this.stateObj = state as ReturnType<typeof buildingStateObject> & AlpineMagicProperties;
    }

    // Allow tests to set the apiService directly on the internal state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Needed for test compatibility
    set apiService(service: any) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Needed for test compatibility
        (this.stateObj as any).apiService = service;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Needed for test compatibility
    get apiService(): any {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Needed for test compatibility
        return (this.stateObj as any).apiService;
    }

    updateFilteredUnits(): void {
        this.stateObj.updateFilteredUnits?.();
    }

    toggleSelectAll(): void {
        this.stateObj.toggleSelectAll?.();
    }

    toggleUnitSelection(unitID: string): void {
        this.stateObj.toggleUnitSelection?.(unitID);
    }

    isUnitSelected(unitID: string): boolean {
        return this.stateObj.isUnitSelected?.(unitID) || false;
    }

    getSelectedCount(): number {
        return this.stateObj.getSelectedCount?.() || 0;
    }

    async performBulkCreateUnits(): Promise<void> {
        return this.stateObj.performBulkCreateUnits?.();
    }

    closeBulkCreateDialog(): void {
        this.stateObj.closeBulkCreateDialog?.();
    }
}

/**
 * Compatibility wrapper for UnitTypeManagement to support existing tests
 */
export class UnitTypeManagement {
    private state: UnitTypeManagementState & AlpineMagicProperties;
    private apiService?: BuildingApiService;

    constructor(state: UnitTypeManagementState & AlpineMagicProperties) {
        this.state = state;

        // Initialize API service if apiURL is available
        if(state.apiURL) {
            this.apiService = new BuildingApiService(state.apiURL);
        }
    }

    openAddUnitTypeDialog(): void {
        this.state.showAddUnitTypeDialog = true;
        this.state.newUnitType = {
            modelID: '',
            modelName: '',
            beds: 1,
            baths: 1,
            buildingID: this.state.building?.buildingID || '',
            minSqft: undefined,
            maxSqft: undefined,
            minRent: undefined,
            maxRent: undefined
        };
    }

    closeAddUnitTypeDialog(): void {
        this.state.showAddUnitTypeDialog = false;
        this.state.newUnitType = {};
    }

    async addUnitType(): Promise<void> {
        try {
            // Validate the new unit type
            const validation = validateUnitType(this.state.newUnitType);
            if(!validation.isValid) {
                const firstError = values(validation.errors)[0] || 'Invalid unit type data';
                this.state.$dispatch('toast:show', {
                    message: firstError,
                    type: 'error'
                });
                return;
            }

            // Ensure we have the building ID
            const buildingID = this.state.building?.buildingID;
            if(!buildingID) {
                this.state.$dispatch('toast:show', {
                    message: 'Building ID not available',
                    type: 'error'
                });
                return;
            }

            // Create the unit type data
            const unitType = UnitTypeCrud.createNewUnitType(buildingID, this.state.newUnitType);

            // Call API if available
            if(this.apiService) {
                const response = await this.apiService.addUnitType(buildingID, unitType);
                if(!response.success) {
                    this.state.$dispatch('toast:show', {
                        message: response.error || 'Failed to save unit type',
                        type: 'error'
                    });
                    // Keep dialog open for retry
                    return;
                }

                // Use the response data if available, otherwise use the local unit type
                const savedUnitType = response.data || unitType;

                // Add to local collection
                this.state.unitTypes = UnitTypeCrud.addUnitType(this.state.unitTypes, savedUnitType);
            } else {
                // Fallback: just update local state if no API
                this.state.unitTypes = UnitTypeCrud.addUnitType(this.state.unitTypes, unitType);
            }

            this.closeAddUnitTypeDialog();

            this.state.$dispatch('toast:show', {
                message: 'Unit type added successfully',
                type: 'success'
            });

            this.state.$dispatch('unit-types:updated', {
                unitTypes: this.state.unitTypes
            });
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
                type: 'error'
            });
            // Keep dialog open for retry on network errors
        }
    }

    async updateUnitType(modelID: string, updates: Partial<UnitTypeData>): Promise<void> {
        try {
            const buildingID = this.state.building?.buildingID;
            if(!buildingID) {
                this.state.$dispatch('toast:show', {
                    message: 'Building ID not available',
                    type: 'error'
                });
                return;
            }

            // Find the existing unit type
            const existingUnitType = this.state.unitTypes.find((ut: UnitTypeData) => ut.modelID === modelID);
            if(!existingUnitType) {
                this.state.$dispatch('toast:show', {
                    message: 'Unit type not found',
                    type: 'error'
                });
                return;
            }

            // Call API if available
            if(this.apiService) {
                const response = await this.apiService.updateUnitType(buildingID, modelID, updates);
                if(!response.success) {
                    this.state.$dispatch('toast:show', {
                        message: response.error || 'Failed to update unit type',
                        type: 'error'
                    });
                    return;
                }

                // Use the response data if available
                // Use the response data if available
                this.state.unitTypes = UnitTypeCrud.updateUnitType(this.state.unitTypes, modelID, response.data || updates);
            } else {
                // Fallback: just update local state if no API
                this.state.unitTypes = UnitTypeCrud.updateUnitType(this.state.unitTypes, modelID, updates);
            }

            this.state.$dispatch('toast:show', {
                message: 'Unit type updated successfully',
                type: 'success'
            });

            this.state.$dispatch('unit-types:updated', {
                unitTypes: this.state.unitTypes
            });
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
                type: 'error'
            });
        }
    }

    async deleteUnitType(modelID: string): Promise<void> {
        try {
            const buildingID = this.state.building?.buildingID;
            if(!buildingID) {
                this.state.$dispatch('toast:show', {
                    message: 'Building ID not available',
                    type: 'error'
                });
                return;
            }

            // Ask for user confirmation
            if(!confirm(`Are you sure you want to delete unit type ${modelID}?`)) {
                return;
            }

            // Check if unit type exists locally (but still proceed with API call)
            const existingUnitType = this.state.unitTypes.find((ut: UnitTypeData) => ut.modelID === modelID);
            const unitTypeExists = !!existingUnitType;

            // Call API if available
            if(this.apiService) {
                const response = await this.apiService.deleteUnitType(buildingID, modelID);
                if(!response.success) {
                    this.state.$dispatch('toast:show', {
                        message: response.error || 'Failed to delete unit type',
                        type: 'error'
                    });
                    return;
                }
            }

            // Remove from local collection (this will be a no-op if item doesn't exist)
            this.state.unitTypes = UnitTypeCrud.removeUnitType(this.state.unitTypes, modelID);

            // Only show success toast if the unit type actually existed locally
            if(unitTypeExists) {
                this.state.$dispatch('toast:show', {
                    message: 'Unit type deleted successfully',
                    type: 'success'
                });

                this.state.$dispatch('unit-types:updated', {
                    unitTypes: this.state.unitTypes
                });
            }
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
                type: 'error'
            });
        }
    }
}

// Export additional classes that might be needed by tests or other components
export { BuildingDataParser };

/**
 * Global window function for Alpine.js to use
 * Note: The window assignment is handled in BuildingProvider.astro
 * to avoid TypeScript conflicts with multiple window declarations
 */
