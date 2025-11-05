import type { BuildingData, UnitTypeData, VacancyClass } from '../../types';
import type { AlpineMagics } from '../alpine-types';
import type { ExtendedUnitData } from './types';
import type { BuildingStateWithMagic } from '../types/alpine-state';
import { FieldInheritanceManager } from '../unit-card/fieldInheritance';

export interface LocationConfig {
    lat?:         number
    lng?:         number
    mapboxToken?: string
}
import { BuildingApiService } from './services/buildingApiService';
import { validateBuildingForm, validateSingleField, hasUnsavedChanges } from './validation';
import { BuildingFormatters } from './utils/formatters';
import { validateUnitType, validateUnitTypeField, UNIT_TYPE_NUMERIC_RULES } from './validators/unitTypeValidator';
import {
    forEach,
    map,
    keys,
    values,
    trim,
    isError,
    noop
} from 'lodash';
// import { logger } from '@hughescr/logger'; // Commented out - causes browser compatibility issues

// Re-export validators for backward compatibility
export { validateUnitType, validateUnitTypeField, UNIT_TYPE_NUMERIC_RULES };

// Import extracted utilities
import { UnitTypeCrud, type UnitTypeCrudOperations } from './services/unitTypeCrud';
import { BuildingDataParser } from './utils/buildingDataParser';
import { UnitsStateManager } from './services/unitsStateManager';

// Re-export for backward compatibility
export { UnitTypeCrud, type UnitTypeCrudOperations, BuildingDataParser, UnitsStateManager };

export function createBuildingState(): BuildingStateWithMagic {
    const state = buildingStateObject();
    return state as BuildingStateWithMagic;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Alpine.js requires dynamic typing for proper state management
function buildingStateObject(): any {
    return {
        // Core state properties
        building:  null as BuildingData | null,
        original:  null as BuildingData | null,
        units:     [] as ExtendedUnitData[],
        unitTypes: [] as UnitTypeData[],
        apiURL:    '',

        // UI state
        activeSectionTab:     'building-info',
        showSave:             false,
        saving:               false,
        lastSaveSuccess:      false,
        geocoding:            false,
        errors:               {} as Record<string, string>,
        expandedRentSpecials: {} as Record<string, boolean>,
        selectedPetTypes:     [] as string[],

        // Units tab state
        filteredUnits:          [] as ExtendedUnitData[],
        selectedUnits:          new Set<string>(),
        statusFilter:           '',
        searchQuery:            '',
        showAddUnitDialog:      false,
        showAddUnitTypeDialog:  false,
        showEditUnitTypeDialog: false,
        showEditUnitDialog:     false,
        editingUnit:            null as ExtendedUnitData | null,
        showBulkStatusDialog:   false,
        showBulkRentDialog:     false,
        newUnit:                { unitID: '', modelID: '' },
        // Edit unit form state
        editUnit:               {} as Partial<ExtendedUnitData>,
        editUnitErrors:         {} as Record<string, string>,
        editUnitLoading:        false,
        newUnitType:            {} as Partial<UnitTypeData>,
        selectedUnitType:       null as UnitTypeData | null,
        bulkOperation:          {
            loading:         false,
            statusValue:     '',
            rentUpdateType:  'absolute' as 'absolute' | 'percentage',
            rentValue:       0,
            errors:          undefined,
            successfulUnits: undefined
        },
        showBulkCreateDialog:     false,
        showAssignUnitTypeDialog: false,
        bulkCreateData:           {
            modelID:           '',
            count:             null,
            patternType:       'numeric',
            startingNumber:    '101',
            prefix:            '',
            suffix:            '',
            customUnitNumbers: '',
            unitNumbers:       [],
            vacancyClass:      'Unoccupied'
        },
        assignUnitTypeData: {
            selectedUnit:     null as ExtendedUnitData | null,
            selectedModelID:  '',
            keepCustomValues: {} as Record<string, boolean>,
            loading:          false
        },

        // Internal helpers
        inheritanceManager: new FieldInheritanceManager(),
        unitsManager:       null as UnitsStateManager | null,
        apiService:         null as BuildingApiService | null,
        suspendWatcher:     false, // Flag to temporarily disable change detection
        initTimeoutId:      null as ReturnType<typeof setTimeout> | null, // Timeout ID for cleanup

        /**
         * Initialize the component state
         */
        init(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
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
                this.apiService = new BuildingApiService(this.apiURL as string);
            }

            // Initialize units manager
            this.unitsManager = new UnitsStateManager(this.units as ExtendedUnitData[], this.selectedUnits as Set<string>);

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
        initializeBuildingData(this: ReturnType<typeof buildingStateObject> & AlpineMagics, element: HTMLElement): void {
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
        initializeUnitsData(this: ReturnType<typeof buildingStateObject> & AlpineMagics, element: HTMLElement): void {
            // Parse units data
            this.units = BuildingDataParser.parseUnitsData(element);

            // Initialize timestamps
            BuildingDataParser.initializeUnitTimestamps(this.units as ExtendedUnitData[]);
        },

        /**
         * Initialize unit types data from HTML dataset
         */
        initializeUnitTypesData(this: ReturnType<typeof buildingStateObject> & AlpineMagics, element: HTMLElement): void {
            this.unitTypes = BuildingDataParser.parseUnitTypesData(element);
        },

        /**
         * Initialize expanded state for existing rent specials
         */
        initializeRentSpecialStates(this: ReturnType<typeof buildingStateObject> & AlpineMagics): void {
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
        setupBuildingWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagics): void {
            // Watch for building changes to update showSave
            // Use a flag to prevent triggering during initial setup
            let initialSetupComplete = false;

            this.$watch('building', (value: BuildingData | null) => {
                // Only check for unsaved changes after initial setup is complete and watcher is not suspended
                if(initialSetupComplete && this.original && !this.suspendWatcher) {
                    this.showSave = hasUnsavedChanges(this.building as BuildingData | null, this.original as BuildingData | null);
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
        setupUnitWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagics): void {
            // Watch for units changes
            this.$watch('units', () => this.updateFilteredUnits() as void);
            this.$watch('statusFilter', () => this.updateFilteredUnits() as void);

            // Watch for search query changes
            this.$watch('searchQuery', () => {
                if(this.searchQuery !== undefined) {
                    this.$dispatch('units:filter', {
                        filter: this.statusFilter,
                        query:  this.searchQuery
                    });
                }
            });

            // Watch for selection changes
            this.$watch('selectedUnits', () => {
                this.$dispatch('units:selection-changed', {
                    selected: Array.from(this.selectedUnits as Set<string>)
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
        setupAllWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagics): void {
            this.setupFilterWatchers();
            this.setupSearchWatchers();
            this.setupSelectionWatchers();
            this.setupGeocodingWatchers();
        },

        /**
         * Setup filter-related watchers
         */
        setupFilterWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagics): void {
            this.$watch('statusFilter', () => {
                this.$dispatch('units:filter-changed', {
                    filter: this.statusFilter
                });
            });
        },

        /**
         * Setup search-related watchers
         */
        setupSearchWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagics): void {
            this.$watch('searchQuery', () => {
                if(this.searchQuery !== undefined) {
                    this.$dispatch('units:filter', {
                        filter: this.statusFilter,
                        query:  this.searchQuery
                    });
                }
            });
        },

        /**
         * Setup selection-related watchers
         */
        setupSelectionWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagics): void {
            this.$watch('selectedUnits', () => {
                this.$dispatch('units:selection-changed', {
                    selected: Array.from(this.selectedUnits as Set<string>)
                });
            });
        },

        /**
         * Setup geocoding state watchers
         */
        setupGeocodingWatchers(this: ReturnType<typeof buildingStateObject> & AlpineMagics): void {
            this.$watch('geocoding', (value: boolean) => {
                this.$dispatch('location:geocoding', { geocoding: value });
            });
        },

        /**
         * Listen for dynamic data updates from parent BuildingManager
         */
        setupDataUpdateListener(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
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
                            lastUpdated: unit.lastUpdated ?? new Date().toISOString(),
                            status:      unit.status ?? this.getUnitStatus(unit) ?? 'unknown',
                            currentRent: unit.rent ?? 0,
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
        handleBuildingDataUpdate(this: ReturnType<typeof buildingStateObject> & AlpineMagics, event: CustomEvent) {
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
                    lastUpdated: unit.lastUpdated ?? new Date().toISOString(),
                    status:      unit.status ?? this.getUnitStatus(unit) ?? 'unknown',
                    currentRent: unit.rent ?? 0,
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
        getUnitStatus(this: ReturnType<typeof buildingStateObject> & AlpineMagics, unit: ExtendedUnitData): string {
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
        parseBuildingData:         noop,
        parseLocationData:         noop,
        parseUnitsData:            noop,
        parseUnitTypesData:        noop,
        initializeUnitsTimestamps: noop,
        setupWatchers:             noop,

        updateFilteredUnits(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            if(this.unitsManager) {
                this.filteredUnits = this.unitsManager.updateFilteredUnits(
                    this.statusFilter,
                    this.searchQuery
                );
            }

            this.$dispatch('units:updated', {
                filter: this.statusFilter,
                query:  this.searchQuery
            });
        },

        validateForm(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            const result = validateBuildingForm(this.building);
            this.errors = result.errors;

            this.$dispatch('building:validate', {
                isValid: result.isValid,
                errors:  result.errors
            });

            return result.isValid;
        },

        async saveBuilding(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            // Remove validation check - we now allow saving with warnings
            if(!this.building || !this.apiService) {
                return;
            }

            this.saving = true;
            try {
                const result = await this.apiService.saveBuilding(this.building);

                if(!result.success) {
                    throw new Error(result.error ?? 'Failed to save building');
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
                        type:    'warning'
                    });
                } else {
                    this.$dispatch('toast:show', {
                        message: 'Building saved successfully',
                        type:    'success'
                    });
                }

                this.$dispatch('photos:updated', {
                    photos: this.building.photos ?? []
                });

                this.$dispatch('building:reset', {
                    building: this.building
                });
            } catch (error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to save building: ' + (isError(error) ? error.message : 'Unknown error'),
                    type:    'error'
                });
            } finally {
                this.saving = false;
            }
        },

        async deleteBuilding(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            if(!this.building || !this.apiService) {
                return;
            }

            if(!confirm('Are you sure you want to delete this building?')) {
                return;
            }

            try {
                const result = await this.apiService.deleteBuilding(this.building.buildingID);

                if(!result.success) {
                    throw new Error(result.error ?? 'Failed to delete building');
                }

                this.$dispatch('toast:show', {
                    message: 'Building deleted successfully',
                    type:    'success'
                });

                // Redirect to buildings list
                window.location.href = '/';
            } catch (error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to delete building: ' + (isError(error) ? error.message : 'Unknown error'),
                    type:    'error'
                });
            }
        },

        undoChanges(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
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
        updateOriginalState(this: ReturnType<typeof buildingStateObject> & AlpineMagics, building: BuildingData): void {
            this.original = JSON.parse(JSON.stringify(building));
            this.showSave = false;
        },

        // Unit Management Methods
        openAddUnitDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            this.showAddUnitDialog = true;
            this.newUnit = { unitID: '', modelID: '' };
        },

        closeAddUnitDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            this.showAddUnitDialog = false;
            this.newUnit = { unitID: '', modelID: '' };
        },

        // Unit Type Management Methods
        openAddUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            this.showAddUnitTypeDialog = true;
            this.newUnitType = {
                modelID:    '',
                modelName:  '',
                beds:       1,
                baths:      1,
                minSqft:    undefined,
                maxSqft:    undefined,
                minRent:    undefined,
                maxRent:    undefined,
                buildingID: this.building?.buildingID ?? ''
            };
        },

        closeAddUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            this.showAddUnitTypeDialog = false;
            this.newUnitType = {};
        },

        async addUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            // Validate the new unit type
            const validation = validateUnitType(this.newUnitType);
            if(!validation.isValid) {
                const firstError = values(validation.errors)[0] ?? 'Invalid unit type data';
                this.$dispatch('toast:show', {
                    message: firstError,
                    type:    'error'
                });
                return;
            }

            // Ensure we have the building ID
            const buildingID = this.building?.buildingID;
            if(!buildingID) {
                this.$dispatch('toast:show', {
                    message: 'Building ID not available',
                    type:    'error'
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
                            message: response.error ?? 'Failed to save unit type',
                            type:    'error'
                        });
                        // Keep dialog open for retry
                        return;
                    }

                    // Use the response data if available, otherwise use the local unit type
                    const savedUnitType = response.data ?? unitType;

                    // Add to local collection
                    this.unitTypes = UnitTypeCrud.addUnitType(this.unitTypes, savedUnitType);
                } else {
                    // Fallback: just update local state if no API
                    this.unitTypes = UnitTypeCrud.addUnitType(this.unitTypes, unitType);
                }

                this.closeAddUnitTypeDialog();

                this.$dispatch('toast:show', {
                    message: 'Unit type added successfully',
                    type:    'success'
                });

                this.$dispatch('unit-types:updated', {
                    unitTypes: this.unitTypes
                });
            } catch (error) {
                this.$dispatch('toast:show', {
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                    type:    'error'
                });
                // Keep dialog open for retry on network errors
            }
        },

        async updateUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagics, modelID: string, updates: Partial<UnitTypeData>) {
            const buildingID = this.building?.buildingID;
            if(!buildingID) {
                this.$dispatch('toast:show', {
                    message: 'Building ID not available',
                    type:    'error'
                });
                return;
            }

            try {
                // Call API if available
                if(this.apiService) {
                    const response = await this.apiService.updateUnitType(buildingID, modelID, updates);
                    if(!response.success) {
                        this.$dispatch('toast:show', {
                            message: response.error ?? 'Failed to update unit type',
                            type:    'error'
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
                    type:    'success'
                });

                this.$dispatch('unit-types:updated', {
                    unitTypes: this.unitTypes
                });
            } catch (error) {
                this.$dispatch('toast:show', {
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                    type:    'error'
                });
            }
        },

        async deleteUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagics, modelID: string) {
            if(!confirm(`Are you sure you want to delete unit type ${modelID}?`)) {
                return;
            }

            const buildingID = this.building?.buildingID;
            if(!buildingID) {
                this.$dispatch('toast:show', {
                    message: 'Building ID not available',
                    type:    'error'
                });
                return;
            }

            try {
                // Call API if available
                if(this.apiService) {
                    const response = await this.apiService.deleteUnitType(buildingID, modelID);
                    if(!response.success) {
                        this.$dispatch('toast:show', {
                            message: response.error ?? 'Failed to delete unit type',
                            type:    'error'
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
                        type:    'success'
                    });

                    this.$dispatch('unit-types:updated', {
                        unitTypes: this.unitTypes
                    });
                }
            } catch (error) {
                this.$dispatch('toast:show', {
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                    type:    'error'
                });
            }
        },

        editUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagics, unitType: UnitTypeData) {
            this.selectedUnitType = unitType;
            this.showEditUnitTypeDialog = true;
        },

        closeEditUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            this.showEditUnitTypeDialog = false;
            this.selectedUnitType = null;
        },

        async addUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            if(!trim(this.newUnit.unitID) || !this.newUnit.modelID || !this.apiService || !this.building) {
                return;
            }

            try {
                const result = await this.apiService.addUnit(this.building.buildingID, {
                    ...this.newUnit,
                    vacancyClass: 'Unoccupied' as VacancyClass
                });

                if(!result.success || !result.data) {
                    throw new Error(result.error ?? 'Failed to add unit');
                }

                this.unitsManager?.addUnit(result.data);
                this.updateFilteredUnits();
                this.closeAddUnitDialog();

                this.$dispatch('toast:show', {
                    message: 'Unit added successfully',
                    type:    'success'
                });
            } catch (error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to add unit: ' + (isError(error) ? error.message : 'Unknown error'),
                    type:    'error'
                });
            }
        },

        openEditUnitDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagics, unit: ExtendedUnitData) {
            this.showEditUnitDialog = true;
            this.editingUnit = { ...unit };
            // Initialize the edit form when dialog opens
            this.$nextTick(() => {
                this.initializeEditForm();
            });
        },

        closeEditUnitDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            this.showEditUnitDialog = false;
            this.editingUnit = null;
        },

        async updateUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagics, unitId: string, updatedData: Partial<ExtendedUnitData>) {
            if(!this.apiService || !this.building || !this.editingUnit) {
                // eslint-disable-next-line no-console -- temporary debugging while fixing browser compatibility
                console.error('updateUnit: Missing required dependencies', {
                    hasApiService:  !!this.apiService,
                    hasBuilding:    !!this.building,
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
                    throw new Error(result.error ?? 'Failed to update unit');
                }

                // Update local state
                this.unitsManager?.updateUnit(unitId, {
                    ...updatedData,
                    lastUpdated: new Date().toISOString()
                });
                this.updateFilteredUnits();
                this.closeEditUnitDialog();

                this.$dispatch('toast:show', {
                    message: `Unit ${this.editingUnit.unitNumber ?? unitId} updated successfully`,
                    type:    'success'
                });
            } catch (error) {
                // eslint-disable-next-line no-console -- temporary debugging while fixing browser compatibility
                console.error('updateUnit: Error occurred', {
                    error,
                    unitId,
                    updatedData
                });
                this.$dispatch('toast:show', {
                    message: 'Failed to update unit: ' + (isError(error) ? error.message : 'Unknown error'),
                    type:    'error'
                });
                throw error;
            }
        },

        async deleteUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagics, unitId: string) {
            if(!this.apiService || !this.building || !this.editingUnit) {
                return;
            }

            try {
                const result = await this.apiService.deleteUnit(this.building.buildingID, unitId);

                if(!result.success) {
                    throw new Error(result.error ?? 'Failed to delete unit');
                }

                // Update local state
                this.unitsManager?.removeUnit(unitId);
                this.updateFilteredUnits();
                this.closeEditUnitDialog();

                this.$dispatch('toast:show', {
                    message: `Unit ${this.editingUnit.unitNumber ?? unitId} deleted successfully`,
                    type:    'success'
                });
            } catch (error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to delete unit: ' + (isError(error) ? error.message : 'Unknown error'),
                    type:    'error'
                });
                throw error;
            }
        },

        // Edit unit form methods
        initializeEditForm(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            if(this.editingUnit) {
                this.editUnit = {
                    unitID:       this.editingUnit.unitID,
                    unitNumber:   this.editingUnit.unitNumber ?? this.editingUnit.unitID,
                    modelID:      this.editingUnit.modelID ?? '',
                    beds:         this.editingUnit.beds ?? 0,
                    baths:        this.editingUnit.baths ?? 1,
                    sqft:         this.editingUnit.sqft ?? null,
                    rent:         this.editingUnit.rent ?? 0,
                    vacancyClass: this.editingUnit.vacancyClass ?? 'Unoccupied',
                    description:  this.editingUnit.description ?? ''
                };
            }
        },

        // Get selected unit type for edit form
        get editFormSelectedUnitType() {
            if(!this.editUnit.modelID) {
                return null;
            }
            return this.unitTypes.find((ut: UnitTypeData) => ut.modelID === this.editUnit.modelID) ?? null;
        },

        // Check if a field is inherited in edit form
        isEditFieldInherited(this: ReturnType<typeof buildingStateObject> & AlpineMagics, fieldName: string) {
            const unitData = this.editUnit;
            const unitType = this.editFormSelectedUnitType;
            return this.inheritanceManager.isInherited(unitData, unitType, fieldName);
        },

        // Get inherited value for a field in edit form
        getEditInheritedValue(this: ReturnType<typeof buildingStateObject> & AlpineMagics, fieldName: string) {
            const unitType = this.editFormSelectedUnitType;
            return this.inheritanceManager.getInheritedValue(unitType, fieldName);
        },

        // Get effective value (unit value or inherited value) in edit form
        getEditEffectiveValue(this: ReturnType<typeof buildingStateObject> & AlpineMagics, fieldName: string) {
            const unitData = this.editUnit;
            const unitType = this.editFormSelectedUnitType;
            return this.inheritanceManager.getEffectiveValue(unitData, unitType, fieldName);
        },

        // Get placeholder text for inherited values in edit form
        getEditFieldPlaceholder(this: ReturnType<typeof buildingStateObject> & AlpineMagics, fieldName: string, defaultPlaceholder = '') {
            const inheritedValue = this.getEditInheritedValue(fieldName);
            if(inheritedValue !== null && inheritedValue !== undefined) {
                return `Inherited: ${inheritedValue}`;
            }
            return defaultPlaceholder;
        },

        // Get inheritance badge text for edit form
        getEditInheritanceBadge(this: ReturnType<typeof buildingStateObject> & AlpineMagics, fieldName: string) {
            if(this.isEditFieldInherited(fieldName)) {
                return 'Inherited from floorplan';
            } else if(this.editFormSelectedUnitType && this.editUnit[fieldName] !== null && this.editUnit[fieldName] !== undefined && this.editUnit[fieldName] !== '') {
                return 'Custom override';
            }
            return null;
        },

        // Clear a specific field override to allow inheritance in edit form
        clearEditOverride(this: ReturnType<typeof buildingStateObject> & AlpineMagics, fieldName: string) {
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
        resetEditAllToFloorplan(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
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
                    type:    'info'
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
                    type:    'success'
                });
            }
        },

        // Check if unit has any overridden fields that can be reset in edit form
        hasEditOverriddenFields(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            if(!this.editFormSelectedUnitType) {
                return false;
            }
            const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
            return inheritableFields.some(field => !this.isEditFieldInherited(field));
        },

        // Preview what values will change when selecting a new unit type in edit form
        previewEditUnitTypeChange(this: ReturnType<typeof buildingStateObject> & AlpineMagics, newModelID: string) {
            if(!newModelID) {
                return true;
            }

            const newUnitType = this.unitTypes.find((ut: UnitTypeData) => ut.modelID === newModelID);
            if(!newUnitType) {
                return true;
            }

            const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
            const changes: { field: string, from: string | number, to: string | number }[] = [];

            const normalizeRentValue = (value: unknown): number | null => {
                if(typeof value === 'number') {
                    return value;
                }
                if(typeof value === 'string') {
                    const match = /-?\d+(?:\.\d+)?/.exec(value);
                    if(match) {
                        const parsed = Number(match[0]);
                        return Number.isNaN(parsed) ? null : parsed;
                    }
                }
                return null;
            };

            inheritableFields.forEach((field) => {
                const currentValue = this.getEditEffectiveValue(field);
                const newInheritedValue = this.inheritanceManager.getInheritedValue(newUnitType, field);
                const willInherit = (this.editUnit[field] === null || this.editUnit[field] === undefined || this.editUnit[field] === '');

                const normalizedCurrentValue = field === 'rent' ? normalizeRentValue(currentValue) : currentValue;
                const normalizedNewValue = field === 'rent' ? normalizeRentValue(newInheritedValue) : newInheritedValue;

                if(willInherit && newInheritedValue !== null && normalizedCurrentValue !== normalizedNewValue) {
                    changes.push({
                        field: field,
                        from:  currentValue ?? 'Not set',
                        to:    newInheritedValue
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
        onEditUnitTypeChange(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            const selectedType = this.editFormSelectedUnitType;
            if(selectedType) {
                // Reset inheritable fields to allow inheritance
                // Only reset fields that are 0 or nullish (allow non-zero overrides to persist)
                if(this.editUnit.beds === 0 || this.editUnit.beds == null) {
                    this.editUnit.beds = undefined;
                }
                if(this.editUnit.baths === 0 || this.editUnit.baths == null) {
                    this.editUnit.baths = undefined;
                }
                if(this.editUnit.sqft === 0 || this.editUnit.sqft == null) {
                    this.editUnit.sqft = undefined;
                }
                if(this.editUnit.rent === 0 || this.editUnit.rent == null) {
                    this.editUnit.rent = undefined;
                }
            } else {
                // For custom units, ensure we have default values
                this.editUnit.beds ??= 1;
                this.editUnit.baths ??= 1;
                this.editUnit.rent ??= 0;
            }
        },

        async submitEditUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            this.editUnitLoading = true;
            this.editUnitErrors = {};

            try {
                // Client-side validation
                if(!this.editUnit.unitNumber?.trim()) {
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
                    unitId:      this.editingUnit?.unitID,
                    updatedData: this.editUnit
                });
            } catch (error) {
                // eslint-disable-next-line no-console -- error logging for debugging
                console.error('Edit unit error:', error);
                this.editUnitErrors.general = 'Failed to update unit. Please try again.';
                this.$dispatch('show-toast', {
                    message: 'Failed to update unit. Please try again.',
                    type:    'error'
                });
            } finally {
                this.editUnitLoading = false;
            }
        },

        async confirmEditDeleteUnit(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            if(!this.editingUnit) {
                return;
            }

            const unitDisplayName = this.editingUnit.unitNumber ?? this.editingUnit.unitID;
            if(confirm(`Are you sure you want to delete Unit ${unitDisplayName}?\n\nThis action cannot be undone.`)) {
                this.editUnitLoading = true;
                try {
                    this.$dispatch('delete-unit', {
                        unitId: this.editingUnit.unitID
                    });
                } catch (error) {
                    // eslint-disable-next-line no-console -- error logging for debugging
                    console.error('Delete unit error:', error);
                    this.$dispatch('show-toast', {
                        message: 'Failed to delete unit. Please try again.',
                        type:    'error'
                    });
                } finally {
                    this.editUnitLoading = false;
                }
            }
        },

        // Unit assignment methods
        openAssignUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagics, unit: ExtendedUnitData) {
            this.showAssignUnitTypeDialog = true;
            this.assignUnitTypeData = {
                selectedUnit:     unit,
                selectedModelID:  '',
                keepCustomValues: {},
                loading:          false
            };
        },

        closeAssignUnitTypeDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            this.showAssignUnitTypeDialog = false;
            this.assignUnitTypeData = {
                selectedUnit:     null,
                selectedModelID:  '',
                keepCustomValues: {},
                loading:          false
            };
        },

        async assignUnitType(this: ReturnType<typeof buildingStateObject> & AlpineMagics, assignmentData: { selectedModelID: string, keepCustomValues: Record<string, boolean> }) {
            if(!this.assignUnitTypeData.selectedUnit || !assignmentData.selectedModelID || !this.apiService || !this.building) {
                return;
            }

            const unit = this.assignUnitTypeData.selectedUnit;
            this.assignUnitTypeData.loading = true;

            try {
                // Create updated unit data
                const updatedUnit = {
                    ...unit,
                    modelID:     assignmentData.selectedModelID,
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
                    throw new Error(result.error ?? 'Failed to assign unit type');
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
                    type:    'success'
                });
            } catch (error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to assign unit type: ' + (isError(error) ? error.message : 'Unknown error'),
                    type:    'error'
                });
            } finally {
                this.assignUnitTypeData.loading = false;
            }
        },

        // Bulk create methods
        openBulkCreateDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagics, modelID?: string) {
            this.showBulkCreateDialog = true;
            // Use Object.assign to avoid type checking issues
            Object.assign(this.bulkCreateData, {
                modelID:           modelID ?? '',
                count:             null,
                patternType:       'numeric',
                startingNumber:    '101',
                prefix:            '',
                suffix:            '',
                customUnitNumbers: '',
                unitNumbers:       [],
                vacancyClass:      'Unoccupied'
            });
        },

        closeBulkCreateDialog(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            this.showBulkCreateDialog = false;
            // Use Object.assign to avoid type checking issues
            Object.assign(this.bulkCreateData, {
                modelID:           '',
                count:             null,
                patternType:       'numeric' as const,
                startingNumber:    '101',
                prefix:            '',
                suffix:            '',
                customUnitNumbers: '',
                unitNumbers:       [],
                vacancyClass:      'Unoccupied'
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

        closeBulkCreateDialogWithPreservedState(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
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

        async performBulkCreateUnits(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
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
            } catch (error) {
                this.bulkOperation.loading = false;
                this.$dispatch('toast:show', {
                    message: 'Failed to create units: ' + (isError(error) ? error.message : 'Unknown error'),
                    type:    'error'
                });
            }
        },

        /**
         * Create units from the unit numbers list
         */
        async createUnitsFromNumbers(this: ReturnType<typeof buildingStateObject> & AlpineMagics): Promise<{ results: ExtendedUnitData[], errors: { unitNumber: string, error: string }[] }> {
            const results: ExtendedUnitData[] = [];
            const errors: { unitNumber: string, error: string }[] = [];

            for(const unitNumber of this.bulkCreateData.unitNumbers) {
                try {
                    const result = await this.apiService!.addUnit(this.building!.buildingID, {
                        unitID:       unitNumber,
                        unitNumber:   unitNumber,
                        modelID:      this.bulkCreateData.modelID,
                        vacancyClass: this.bulkCreateData.vacancyClass as VacancyClass
                    });

                    if(!result.success || !result.data) {
                        throw new Error(result.error ?? `Failed to create unit ${unitNumber}`);
                    }

                    results.push(result.data);
                    this.unitsManager?.addUnit(result.data);
                } catch (error) {
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
        finalizeBulkCreation(this: ReturnType<typeof buildingStateObject> & AlpineMagics, results: ExtendedUnitData[], errors: { unitNumber: string, error: string }[]): void {
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
                    message:  'All units failed to create. Please review the errors in the dialog and try again.',
                    type:     'error',
                    duration: 6000
                });
            } else if(isFullSuccess) {
                // Complete success - close dialog and reset form
                this.closeBulkCreateDialog();
                this.$dispatch('toast:show', {
                    message: `Successfully created all ${successCount} units`,
                    type:    'success'
                });
            } else {
                // Partial success - keep dialog open with error details for retry
                this.$dispatch('toast:show', {
                    message:  `Created ${successCount} of ${totalAttempted} units. ${errors.length} units failed - review errors and try again.`,
                    type:     'warning',
                    duration: 8000
                });
            }
        },

        // Unit Selection Methods
        toggleSelectAll(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            this.unitsManager?.toggleSelectAll(this.filteredUnits);
        },

        isUnitSelected(this: ReturnType<typeof buildingStateObject> & AlpineMagics, unitID: string) {
            return this.unitsManager?.isUnitSelected(unitID) ?? false;
        },

        toggleUnitSelection(this: ReturnType<typeof buildingStateObject> & AlpineMagics, unitID: string) {
            this.unitsManager?.toggleUnitSelection(unitID);
        },

        getSelectedCount(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            return this.unitsManager?.getSelectedCount() ?? 0;
        },

        // Bulk Operations Methods
        async performBulkStatusUpdate(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
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
                    throw new Error(result.error ?? 'Failed to update units');
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
                    type:    'success'
                });

                this.$dispatch('units:bulk-update', {
                    operationType: 'status',
                    unitIDs
                });
            } catch (error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to update units: ' + (isError(error) ? error.message : 'Unknown error'),
                    type:    'error'
                });
            } finally {
                this.bulkOperation.loading = false;
            }
        },

        async performBulkRentUpdate(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
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
                        rent:           this.bulkOperation.rentValue
                    }
                );

                if(!result.success) {
                    throw new Error(result.error ?? 'Failed to update rents');
                }

                // Update local state based on operation type
                forEach(this.units, (unit) => {
                    if(unitIDs.includes(unit.unitID)) {
                        if(this.bulkOperation.rentUpdateType === 'absolute') {
                            unit.rent = this.bulkOperation.rentValue;
                        } else if(this.bulkOperation.rentUpdateType === 'percentage') {
                            const currentRent = unit.rent ?? 0;
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
                    type:    'success'
                });

                this.$dispatch('units:bulk-update', {
                    operationType: 'rent',
                    unitIDs
                });
            } catch (error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to update rents: ' + (isError(error) ? error.message : 'Unknown error'),
                    type:    'error'
                });
            } finally {
                this.bulkOperation.loading = false;
            }
        },

        async toggleUnitAvailability(this: ReturnType<typeof buildingStateObject> & AlpineMagics, unit: ExtendedUnitData) {
            if(!this.apiService || !this.building) {
                return;
            }

            const newStatus = unit.vacancyClass === 'Occupied' ? 'Unoccupied' : 'Occupied';

            try {
                const updatedUnit = {
                    ...unit,
                    vacancyClass: newStatus as VacancyClass,
                    lastUpdated:  new Date().toISOString()
                };

                const result = await this.apiService.updateUnit(this.building.buildingID, updatedUnit);

                if(!result.success) {
                    throw new Error(result.error ?? 'Failed to update unit');
                }

                // Update local state
                this.unitsManager?.updateUnit(unit.unitID, {
                    vacancyClass: newStatus,
                    lastUpdated:  new Date().toISOString()
                });
                this.updateFilteredUnits();

                this.$dispatch('toast:show', {
                    message: `Unit ${unit.unitID} status updated to ${newStatus}`,
                    type:    'success'
                });
            } catch (error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to update unit: ' + (isError(error) ? error.message : 'Unknown error'),
                    type:    'error'
                });
            }
        },

        async updateUnitRent(this: ReturnType<typeof buildingStateObject> & AlpineMagics, unit: ExtendedUnitData, newRentValue: string) {
            if(!this.apiService || !this.building) {
                return;
            }

            const rentAmount = parseFloat(newRentValue);
            if(isNaN(rentAmount) || rentAmount < 0 || rentAmount > 25000) {
                this.$dispatch('toast:show', {
                    message: 'Please enter a valid rent amount between $0 and $25,000',
                    type:    'error'
                });
                unit.editingRent = false;
                return;
            }

            unit.savingField = 'rent';
            unit.editingRent = false;

            try {
                const updatedUnit = {
                    ...unit,
                    rent:        rentAmount,
                    lastUpdated: new Date().toISOString()
                };

                const result = await this.apiService.updateUnit(this.building.buildingID, updatedUnit);

                if(!result.success) {
                    throw new Error('Rent update failed');
                }

                // Update local state
                this.unitsManager?.updateUnit(unit.unitID, {
                    rent:        rentAmount,
                    lastUpdated: new Date().toISOString()
                });

                this.$dispatch('toast:show', {
                    message: `Unit ${unit.unitID} rent updated`,
                    type:    'success'
                });
            } catch (error) {
                this.$dispatch('toast:show', {
                    message: 'Failed to update rent: ' + (isError(error) ? error.message : 'Unknown error'),
                    type:    'error'
                });
            } finally {
                unit.savingField = null;
            }
        },

        // Formatting helper methods
        formatCurrency(this: ReturnType<typeof buildingStateObject> & AlpineMagics, amount: number | null | undefined) {
            return BuildingFormatters.formatCurrency(amount);
        },

        formatRelativeTime(this: ReturnType<typeof buildingStateObject> & AlpineMagics, dateString: string | undefined) {
            return BuildingFormatters.formatRelativeTime(dateString);
        },

        getStatusBadgeClass(this: ReturnType<typeof buildingStateObject> & AlpineMagics, status: string | undefined) {
            return BuildingFormatters.getStatusBadgeClass(status);
        },

        getTabDisplayName(this: ReturnType<typeof buildingStateObject> & AlpineMagics, tabKey: string) {
            return BuildingFormatters.getTabDisplayName(tabKey);
        },

        /**
         * Get the display value for a unit field, considering inheritance from unit type
         */
        // eslint-disable-next-line complexity -- Unit display value requires field-specific formatting
        getUnitDisplayValue(this: ReturnType<typeof buildingStateObject> & AlpineMagics, unit: ExtendedUnitData, fieldName: 'beds' | 'baths' | 'sqft' | 'rent' | 'maxOccupants' | 'perPersonRent' | 'deposit' | 'minLeaseTerm' | 'maxLeaseTerm') {
            if(!this.inheritanceManager || !unit) {
                return '—';
            }

            // Find the unit type for this unit
            const unitType = this.unitTypes?.find((ut: UnitTypeData) => ut.modelID === unit.modelID) ?? null;

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
                            return min?.toString() ?? '—';
                        }
                        return `${min ?? '?'}–${max ?? '?'}`;
                    }
                    return value.toString();

                case 'rent':
                    if(Array.isArray(value)) {
                        // Handle range values like [min, max]
                        const [min, max] = value;
                        if(min === max) {
                            return min ?? 0;
                        }
                        return min ?? 0; // For rent display, show minimum
                    }
                    return value ?? 0;

                case 'beds':
                case 'baths':
                case 'maxOccupants':
                case 'minLeaseTerm':
                case 'maxLeaseTerm':
                    return value.toString();

                case 'perPersonRent':
                case 'deposit':
                    return value ?? 0;

                default:
                    return value?.toString() ?? '—';
            }
        },

        // Rent Special Methods
        addRentSpecial(this: ReturnType<typeof buildingStateObject> & AlpineMagics) {
            if(!this.building) {
                return;
            }

            // Initialize rentSpecials array if it doesn't exist
            this.building.rentSpecials ??= [];

            // Add new rent special with unique ID using Alpine $id magic property
            // This provides deterministic IDs for testing and better type safety
            const nextIndex = this.building.rentSpecials.length;
            const newSpecial = {
                id:          this.$id('rentSpecial', nextIndex),
                title:       '',
                description: '',
                startDate:   '',
                endDate:     ''
            };
            this.building.rentSpecials.push(newSpecial);

            // Initialize expanded state for the new rent special (default to expanded for editing)
            this.expandedRentSpecials[newSpecial.id] = true;
        },

        removeRentSpecial(this: ReturnType<typeof buildingStateObject> & AlpineMagics, index: number) {
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
        validateField(this: ReturnType<typeof buildingStateObject> & AlpineMagics, fieldName: string, value: unknown): boolean {
            const error = validateSingleField(fieldName, value, this.building ?? undefined);

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

        clearErrors(this: ReturnType<typeof buildingStateObject> & AlpineMagics): void {
            this.errors = {};
        },

        clearFieldError(this: ReturnType<typeof buildingStateObject> & AlpineMagics, fieldName: string): void {
            if(this.errors[fieldName]) {
                delete this.errors[fieldName];
            }
        },

        hasValidationErrors(this: ReturnType<typeof buildingStateObject> & AlpineMagics): boolean {
            return keys(this.errors).length > 0;
        },

        getFieldError(this: ReturnType<typeof buildingStateObject> & AlpineMagics, fieldName: string): string | null {
            return this.errors[fieldName] ?? null;
        },

        getAllErrors(this: ReturnType<typeof buildingStateObject> & AlpineMagics): Record<string, string> {
            return { ...this.errors };
        },

        hasUnsavedChanges(this: ReturnType<typeof buildingStateObject> & AlpineMagics): boolean {
            return hasUnsavedChanges(this.building, this.original);
        },

        // Utility methods
        getFilterSummary(this: ReturnType<typeof buildingStateObject> & AlpineMagics): {
            total:     number
            filtered:  number
            selected:  number
            hasFilter: boolean
        } {
            return {
                total:     this.units.length,
                filtered:  this.filteredUnits.length,
                selected:  this.selectedUnits.size,
                hasFilter: !!(this.statusFilter ?? this.searchQuery)
            };
        },

        getStatusCounts(this: ReturnType<typeof buildingStateObject> & AlpineMagics): Record<string, number> {
            const counts: Record<string, number> = {
                all:       this.units.length,
                occupied:  0,
                vacant:    0,
                notice:    0,
                model:     0,
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

        getFormattedAddress(this: ReturnType<typeof buildingStateObject> & AlpineMagics): string {
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

        getOccupancyRate(this: ReturnType<typeof buildingStateObject> & AlpineMagics): number {
            if(this.units.length === 0) {
                return 0;
            }

            const occupiedCount = this.units
                .filter((unit: ExtendedUnitData) => unit.vacancyClass === 'Occupied')
                .length;

            return Math.round((occupiedCount / this.units.length) * 100);
        },

        getAverageRent(this: ReturnType<typeof buildingStateObject> & AlpineMagics): number {
            const unitsWithRent = this.units.filter((unit: ExtendedUnitData) => unit.rent && unit.rent > 0) as ExtendedUnitData[];

            if(unitsWithRent.length === 0) {
                return 0;
            }

            const totalRent = unitsWithRent.reduce((sum: number, unit: ExtendedUnitData) => sum + (unit.rent ?? 0), 0);
            return Math.round(totalRent / unitsWithRent.length);
        },

        /**
         * Cleanup method to prevent memory leaks
         * Should be called when the component is destroyed
         */
        destroy(this: ReturnType<typeof buildingStateObject> & AlpineMagics): void {
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
    building:             BuildingData | null
    original:             BuildingData | null
    apiURL:               string
    saving:               boolean
    showSave:             boolean
    lastSaveSuccess:      boolean
    errors:               Record<string, string>
    expandedRentSpecials: Record<string, boolean>
}

export interface UnitManagementState {
    building:             BuildingData | null
    units:                ExtendedUnitData[]
    filteredUnits:        ExtendedUnitData[]
    selectedUnits:        Set<string>
    statusFilter:         string
    searchQuery:          string
    showBulkCreateDialog: boolean
    bulkCreateData: {
        modelID:           string
        count:             number | null
        patternType:       string
        startingNumber:    string
        prefix:            string
        suffix:            string
        customUnitNumbers: string
        unitNumbers:       string[]
        vacancyClass:      string
    }
    bulkOperation: {
        loading:         boolean
        statusValue:     string
        rentUpdateType:  'absolute' | 'percentage'
        rentValue:       number
        errors:          { unitNumber: string, error: string }[] | undefined
        successfulUnits: string[] | undefined
    }
}

export interface UnitTypeManagementState {
    building:               BuildingData | null
    apiURL:                 string
    unitTypes:              UnitTypeData[]
    newUnitType:            Partial<UnitTypeData>
    selectedUnitType:       UnitTypeData | null
    showAddUnitTypeDialog:  boolean
    showEditUnitTypeDialog: boolean
}

/**
 * Compatibility wrapper for BuildingCore to support existing tests
 */
export class BuildingCore {
    private stateObj: ReturnType<typeof buildingStateObject> & AlpineMagics;

    constructor(state: BuildingCoreState & AlpineMagics) {
        // Extend the original state object with building state methods
        const buildingState = buildingStateObject();

        // Preserve the original Alpine methods from the mock
        const originalMethods = {
            $el:       state.$el,
            $watch:    state.$watch,
            $nextTick: state.$nextTick,
            $dispatch: state.$dispatch,
            $store:    state.$store,
            $root:     state.$root
        };

        // Add missing methods to the original state object
        Object.assign(state, buildingState);

        // Restore the original Alpine methods to ensure mocking works
        Object.assign(state, originalMethods);

        // Use the extended original state object
        this.stateObj = state as ReturnType<typeof buildingStateObject> & AlpineMagics;

        // Initialize the consolidated state functionality
        this.stateObj.init ??= function() {
            this.inheritanceManager = new FieldInheritanceManager();
        };
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
        return this.stateObj.validateForm?.() ?? false;
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
        return this.stateObj.hasUnsavedChanges?.() ?? false;
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
    private stateObj: ReturnType<typeof buildingStateObject> & AlpineMagics;

    constructor(state: UnitManagementState & AlpineMagics) {
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
        this.stateObj = state as ReturnType<typeof buildingStateObject> & AlpineMagics;
    }

    // Allow tests to set the apiService directly on the internal state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Needed for test compatibility
    set apiService(service: any) {
        (this.stateObj).apiService = service;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Needed for test compatibility
    get apiService(): any {
        return (this.stateObj).apiService;
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
        return this.stateObj.isUnitSelected?.(unitID) ?? false;
    }

    getSelectedCount(): number {
        return this.stateObj.getSelectedCount?.() ?? 0;
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
    private state:       UnitTypeManagementState & AlpineMagics;
    private apiService?: BuildingApiService;

    constructor(state: UnitTypeManagementState & AlpineMagics) {
        this.state = state;

        // Initialize API service if apiURL is available
        if(state.apiURL) {
            this.apiService = new BuildingApiService(state.apiURL);
        }
    }

    openAddUnitTypeDialog(): void {
        this.state.showAddUnitTypeDialog = true;
        this.state.newUnitType = {
            modelID:    '',
            modelName:  '',
            beds:       1,
            baths:      1,
            buildingID: this.state.building?.buildingID ?? '',
            minSqft:    undefined,
            maxSqft:    undefined,
            minRent:    undefined,
            maxRent:    undefined
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
                const firstError = values(validation.errors)[0] ?? 'Invalid unit type data';
                this.state.$dispatch('toast:show', {
                    message: firstError,
                    type:    'error'
                });
                return;
            }

            // Ensure we have the building ID
            const buildingID = this.state.building?.buildingID;
            if(!buildingID) {
                this.state.$dispatch('toast:show', {
                    message: 'Building ID not available',
                    type:    'error'
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
                        message: response.error ?? 'Failed to save unit type',
                        type:    'error'
                    });
                    // Keep dialog open for retry
                    return;
                }

                // Use the response data if available, otherwise use the local unit type
                const savedUnitType = response.data ?? unitType;

                // Add to local collection
                this.state.unitTypes = UnitTypeCrud.addUnitType(this.state.unitTypes, savedUnitType);
            } else {
                // Fallback: just update local state if no API
                this.state.unitTypes = UnitTypeCrud.addUnitType(this.state.unitTypes, unitType);
            }

            this.closeAddUnitTypeDialog();

            this.state.$dispatch('toast:show', {
                message: 'Unit type added successfully',
                type:    'success'
            });

            this.state.$dispatch('unit-types:updated', {
                unitTypes: this.state.unitTypes
            });
        } catch (error) {
            this.state.$dispatch('toast:show', {
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
                type:    'error'
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
                    type:    'error'
                });
                return;
            }

            // Find the existing unit type
            const existingUnitType = this.state.unitTypes.find((ut: UnitTypeData) => ut.modelID === modelID);
            if(!existingUnitType) {
                this.state.$dispatch('toast:show', {
                    message: 'Unit type not found',
                    type:    'error'
                });
                return;
            }

            // Call API if available
            if(this.apiService) {
                const response = await this.apiService.updateUnitType(buildingID, modelID, updates);
                if(!response.success) {
                    this.state.$dispatch('toast:show', {
                        message: response.error ?? 'Failed to update unit type',
                        type:    'error'
                    });
                    return;
                }

                // Use the response data if available
                // Use the response data if available
                this.state.unitTypes = UnitTypeCrud.updateUnitType(this.state.unitTypes, modelID, response.data ?? updates);
            } else {
                // Fallback: just update local state if no API
                this.state.unitTypes = UnitTypeCrud.updateUnitType(this.state.unitTypes, modelID, updates);
            }

            this.state.$dispatch('toast:show', {
                message: 'Unit type updated successfully',
                type:    'success'
            });

            this.state.$dispatch('unit-types:updated', {
                unitTypes: this.state.unitTypes
            });
        } catch (error) {
            this.state.$dispatch('toast:show', {
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
                type:    'error'
            });
        }
    }

    async deleteUnitType(modelID: string): Promise<void> {
        try {
            const buildingID = this.state.building?.buildingID;
            if(!buildingID) {
                this.state.$dispatch('toast:show', {
                    message: 'Building ID not available',
                    type:    'error'
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
                        message: response.error ?? 'Failed to delete unit type',
                        type:    'error'
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
                    type:    'success'
                });

                this.state.$dispatch('unit-types:updated', {
                    unitTypes: this.state.unitTypes
                });
            }
        } catch (error) {
            this.state.$dispatch('toast:show', {
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
                type:    'error'
            });
        }
    }
}

// Export additional classes that might be needed by tests or other components
// BuildingDataParser is now exported with other utilities at the top of the file

/**
 * Global window function for Alpine.js to use
 * Note: The window assignment is handled in BuildingProvider.astro
 * to avoid TypeScript conflicts with multiple window declarations
 */
