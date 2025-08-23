/**
 * Example usage of the comprehensive TypeScript interfaces
 * Demonstrates how to use the new type interfaces for Alpine.js components
 */

import type {
    BuildingAlpineState,
    BuildingStateWithMagic,
    TypedEventDispatcher,
    BuildingUpdatedEvent,
    ToastShowEvent,
    CreateBuildingRequest,
    UpdateBuildingRequest,
    BuildingProviderProps,
    BuildingData
} from './index';
import { keys, noop, constant, isObject, isBoolean, isString, isArray, toUpper } from 'lodash';
import { devLogger } from '../utils/client-logger';

// ===== EXAMPLE 1: TYPED ALPINE.JS STATE =====

/**
 * Example of a properly typed Alpine.js state function
 */
function createTypedBuildingState(): BuildingStateWithMagic {
    const state: BuildingAlpineState = {
        // Core data with proper types
        building: null,
        original: null,
        units: [],
        unitTypes: [],
        apiURL: '',

        // UI state with proper types
        activeSectionTab: 'building-info',
        showSave: false,
        saving: false,
        geocoding: false,
        errors: {},

        // Units management state
        filteredUnits: [],
        selectedUnits: new Set(),
        statusFilter: '',
        searchQuery: '',

        // Dialog states
        showAddUnitDialog: false,
        showAddUnitTypeDialog: false,
        showEditUnitTypeDialog: false,
        showBulkStatusDialog: false,
        showBulkRentDialog: false,

        // Form states
        newUnit: { unitID: '', modelID: '' },
        selectedUnitType: null,
        bulkOperation: {
            loading: false,
            statusValue: '',
            rentUpdateType: 'absolute',
            rentValue: 0
        },

        // Typed initialization method
        init(this: BuildingStateWithMagic) {
            // Type-safe data parsing
            this.parseBuildingData();
            this.parseLocationData();
            this.parseUnitsData();
            this.parseUnitTypesData();

            // Setup typed watchers and events
            this.setupWatchers();
        },

        // Example of typed event dispatching
        setupWatchers(this: BuildingStateWithMagic): void {
            // Typed event dispatcher with IntelliSense support
            this.$watch<BuildingData | null>('building', (value) => {
                if(value) {
                    // Type-safe event dispatching
                    const eventDetail: BuildingUpdatedEvent = { building: value };
                    this.$dispatch('building:updated', eventDetail);
                }
            });

            // Type-safe error handling
            this.$watch('errors', (errors) => {
                if(keys(errors).length > 0) {
                    const toastEvent: ToastShowEvent = {
                        message: 'Please fix validation errors',
                        type: 'error'
                    };
                    this.$dispatch('toast:show', toastEvent);
                }
            });
        },

        // All other methods with proper typing...
        parseBuildingData: noop,
        parseLocationData: noop,
        parseUnitsData: noop,
        parseUnitTypesData: noop,
        initializeUnitsTimestamps: noop,
        updateFilteredUnits: noop,
        validateForm: constant(true),
        saveBuilding: async () => Promise.resolve(),
        deleteBuilding: async () => Promise.resolve(),
        undoChanges: noop,
        openAddUnitDialog: noop,
        openAddUnitTypeDialog: noop,
        closeAddUnitTypeDialog: noop,
        editUnitType: noop,
        closeEditUnitTypeDialog: noop,
        addUnitType: noop,
        addUnit: async () => Promise.resolve(),
        toggleSelectAll: noop,
        isUnitSelected: constant(false),
        toggleUnitSelection: noop,
        getSelectedCount: constant(0),
        performBulkStatusUpdate: async () => Promise.resolve(),
        performBulkRentUpdate: async () => Promise.resolve(),
        toggleUnitAvailability: async () => Promise.resolve(),
        updateUnitRent: async () => Promise.resolve(),
        formatCurrency: constant('$0'),
        formatRelativeTime: constant('Never'),
        getStatusBadgeClass: constant('badge-ghost'),
        getTabDisplayName: constant('Unknown')
    };

    // Return with magic properties
    return state as BuildingStateWithMagic;
}

// ===== EXAMPLE 2: TYPED EVENT LISTENERS =====

/**
 * Example of typed event listeners
 */
function setupTypedEventListeners() {
    // Type-safe event listener with IntelliSense
    // Type-safe event listener with IntelliSense
    window.addEventListener('building:updated', ((event: CustomEvent<BuildingUpdatedEvent>) => {
        // TypeScript knows event.detail has a 'building' property of type BuildingData
        // Example: Log building updates (only in development)
        devLogger.log('Building updated', { buildingID: event.detail.building.buildingID });
    }) as EventListener);

    // Type-safe toast listener
    window.addEventListener('toast:show', ((event: CustomEvent<ToastShowEvent>) => {
        // TypeScript knows the exact shape of the event detail
        const { message, type } = event.detail;
        showToast(message, type);
    }) as EventListener);

    // Attach listeners (in real usage, this would be done in Alpine.js)
    // document.addEventListener('building:updated', _buildingUpdatedListener);
    // document.addEventListener('toast:show', _toastListener);
}

// ===== EXAMPLE 3: TYPED API CALLS =====

/**
 * Example of typed API interactions
 */
class TypedApiClient {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    // Type-safe building creation
    async createBuilding(request: CreateBuildingRequest) {
        const response = await fetch(`${this.baseURL}/buildings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });

        // Return properly typed response
        return response.json() as Promise<{
            success: boolean
            data: import('../../types').BuildingData
            error?: string
        }>;
    }

    // Type-safe building update
    async updateBuilding(buildingID: string, request: UpdateBuildingRequest) {
        const response = await fetch(`${this.baseURL}/buildings/${buildingID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });

        return response.json();
    }
}

// ===== EXAMPLE 4: TYPED COMPONENT PROPS =====

/**
 * Example of typed component props usage
 */
function createTypedBuildingProvider(props: BuildingProviderProps) {
    // TypeScript ensures all required props are provided
    const { building, units, unitTypes, apiURL } = props;

    // Type-safe property access
    // Example: Log building data (only in development)
    devLogger.log('Building data loaded', {
        buildingID: building.buildingID,
        unitsCount: units.length,
        unitTypesCount: unitTypes.length
    });

    return {
        // Alpine.js x-data would use this
        ...createTypedBuildingState(),
        // Override with prop data
        building,
        units,
        unitTypes,
        apiURL
    };
}

// ===== EXAMPLE 5: TYPE GUARDS AND VALIDATION =====

/**
 * Example of type guards for runtime validation
 */
function validateBuildingState(state: unknown): state is BuildingAlpineState {
    if(!state || !isObject(state)) {
        return false;
    }

    const s = state as Partial<BuildingAlpineState>;

    return (
        // Check required properties
        isObject(s.errors) &&
        isBoolean(s.saving) &&
        isString(s.activeSectionTab) &&
        isArray(s.units) &&
        isArray(s.unitTypes) &&
        isString(s.apiURL)
    );
}

// ===== EXAMPLE 6: UTILITY FUNCTIONS =====

/**
 * Example utility function with proper typing
 */
function showToast(message: string, type: import('./alpine-state').ToastType) {
    // Example: Show toast message (only in development)
    devLogger.log(`Toast: ${toUpper(type)}`, { message });
}

/**
 * Type-safe event dispatcher helper
 */
function createTypedDispatcher<T extends BuildingStateWithMagic>(context: T): TypedEventDispatcher {
    return (eventName, detail) => {
        context.$dispatch(eventName, detail);
    };
}

// ===== EXAMPLE 7: USAGE IN ASTRO COMPONENTS =====

/**
 * Example of how to use these types in an Astro component
 */

/*
---
// In an Astro component file (.astro)
import type { BuildingProviderProps } from '../lib/types';

export interface Props extends BuildingProviderProps {}

const { building, units, unitTypes, apiURL } = Astro.props;
---

<div
    x-data="createTypedBuildingState()"
    data-building={JSON.stringify(building)}
    data-units={JSON.stringify(units)}
    data-unit-types={JSON.stringify(unitTypes)}
    data-api-url={apiURL}
>
    <!-- TypeScript now provides IntelliSense for all Alpine.js state -->
    <div x-show="saving">Saving...</div>
    <div x-text="building?.buildingID">Building ID</div>
    <div x-text="units.length">Unit Count</div>

    <!-- Type-safe event handling -->
    <button @click="$dispatch('toast:show', { message: 'Hello', type: 'success' })">
        Show Toast
    </button>
</div>

<script>
// Make the typed state creator available globally
if (typeof window !== 'undefined') {
    window.createTypedBuildingState = createTypedBuildingState;
}
</script>
*/

export {
    createTypedBuildingState,
    setupTypedEventListeners,
    TypedApiClient,
    createTypedBuildingProvider,
    validateBuildingState,
    createTypedDispatcher
};
