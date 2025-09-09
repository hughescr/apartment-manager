// Building Manager Alpine.js state
// Extracted from BuildingManager.astro to centralized registration system

// Simple noop function replacement for lodash.noop
// eslint-disable-next-line lodash/prefer-noop, @typescript-eslint/no-empty-function -- Replacing lodash.noop for browser compatibility
const noop = () => {};

// Type removed - was unused and declared but never referenced

export function createBuildingManagerState() {
    return {
        loading: false,
        dataLoaded: false,
        error: false,
        errorMessage: '',
        buildingID: '',
        apiURL: '',
        building: null,
        units: [],
        unitTypes: [],

        init() {
            this.buildingID = this.$root?.dataset.buildingId || '';
            this.apiURL = this.$root?.dataset.apiUrl || '';
            this.parseInitialData();
            this.setupEventListeners();
        },

        parseInitialData() {
            const initialBuilding = this.$root?.dataset.initialBuilding;
            const initialUnits = this.$root?.dataset.initialUnits;
            const initialUnitTypes = this.$root?.dataset.initialUnitTypes;
            const initialLoaded = this.$root?.dataset.initialLoaded === 'true';

            if(initialBuilding) {
                try {
                    this.building = JSON.parse(initialBuilding);
                } catch{
                    // Ignore parsing errors - use default values
                }
            }
            if(initialUnits) {
                try {
                    this.units = JSON.parse(initialUnits);
                } catch{
                    // Ignore parsing errors - use default values
                }
            }
            if(initialUnitTypes) {
                try {
                    this.unitTypes = JSON.parse(initialUnitTypes);
                } catch{
                    // Ignore parsing errors - use default values
                }
            }

            this.dataLoaded = initialLoaded;
            this.loading = !initialLoaded;

            if(this.dataLoaded && this.building) {
                this.$dispatch?.('building-data-loaded', {
                    buildingID: this.buildingID,
                    building: this.building,
                    units: this.units,
                    unitTypes: this.unitTypes
                });
            }
        },

        setupEventListeners() {
            // Data is already pre-loaded, no need for lazy loading logic
            // Keep event listener for backward compatibility but it's no longer needed
            // eslint-disable-next-line lodash/prefer-noop -- Need to maintain backward compatibility
            this.$root?.addEventListener('trigger-load', () => {
                // Data already loaded - nothing to do
            });
        },

        async loadBuildingData() {
            // Data is pre-loaded from parent component - this method is no longer needed
            // but kept for backward compatibility
            return;
        },

        retryLoad() {
            // Data is pre-loaded - retry not applicable
            this.error = false;
            this.errorMessage = '';
        },

        // Alpine magic properties are provided by AlpineComponentData
        $dispatch: noop as ((name: string, detail?: unknown) => void),
        $root: null as unknown as HTMLElement,
        $el: null as unknown as HTMLElement,
        $watch: noop as ((property: string, callback: (...args: unknown[]) => void) => void),
        $nextTick: noop as ((callback: () => void) => void),
        $store: {} as Record<string, unknown>
    };
}
