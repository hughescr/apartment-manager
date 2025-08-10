import { BuildingCardOrchestrator } from './orchestrator/BuildingCardOrchestrator';
import { createStateManager } from './services/StateManager';
import { ValidationServiceImpl } from './services/ValidationService';
import { ApiService } from './services/ApiService';
import { FormatServiceImpl } from './services/FormatService';
import { BulkOperationService } from './services/BulkOperationService';
import { DefaultFilterService } from './services/FilterService';
import { DefaultDialogService } from './services/DialogService';

// Alpine.js magic properties interface
interface AlpineComponent {
    $dispatch: (event: string, detail?: unknown) => void
    $el: HTMLElement & { dataset: Record<string, string> }
    $watch: (expression: string, callback: () => void, options?: { deep?: boolean }) => void
    $reactive: <T>(obj: T) => T
}

/**
 * Creates the Alpine.js state object for BuildingCard using the new service architecture
 * This factory function wires up all services through the orchestrator
 */
export function createBuildingCardState() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Building complex object with dynamic methods
    const state: any = {
        // Alpine.js magic properties (will be injected at runtime)
        $dispatch: null as unknown as (event: string, detail?: unknown) => void,
        $el: { dataset: {} } as HTMLElement & { dataset: Record<string, string> },
        $watch: null as unknown as (expression: string, callback: () => void, options?: { deep?: boolean }) => void,
        $reactive: null as unknown as <T>(obj: T) => T,

        // Internal orchestrator reference
        _orchestrator: null as BuildingCardOrchestrator | null,

        /**
         * Initialize the component with the service architecture
         */
        init(this: typeof state & AlpineComponent) {
            // Create all services
            const stateManager = createStateManager(this.$reactive);
            const validationService = new ValidationServiceImpl();
            const apiService = new ApiService();
            const formatService = new FormatServiceImpl();
            const bulkOperationService = new BulkOperationService();
            const filterService = new DefaultFilterService();
            const dialogService = new DefaultDialogService();

            // Create orchestrator with all services
            this._orchestrator = new BuildingCardOrchestrator(
                stateManager,
                validationService,
                apiService,
                formatService,
                bulkOperationService,
                filterService,
                dialogService
            );

            // Initialize orchestrator with Alpine context
            this._orchestrator.initialize({
                $dispatch: this.$dispatch,
                $el: this.$el,
                $watch: this.$watch
            });
        },

        // Proxy all methods to the orchestrator
        validateForm() {
            return this._orchestrator?.validateForm() || false;
        },

        async saveBuilding() {
            return this._orchestrator?.saveBuilding();
        },

        async deleteBuilding() {
            return this._orchestrator?.deleteBuilding();
        },

        undoChanges() {
            return this._orchestrator?.undoChanges();
        },

        openAddUnitDialog() {
            return this._orchestrator?.openAddUnitDialog();
        },

        openAddUnitTypeDialog() {
            return this._orchestrator?.openAddUnitTypeDialog();
        },

        closeAddUnitTypeDialog() {
            return this._orchestrator?.closeAddUnitTypeDialog();
        },

        async addUnit() {
            return this._orchestrator?.addUnit();
        },

        updateFilteredUnits() {
            return this._orchestrator?.updateFilteredUnits();
        },

        toggleSelectAll() {
            return this._orchestrator?.toggleSelectAll();
        },

        isUnitSelected(unitID: string) {
            return this._orchestrator?.isUnitSelected(unitID) || false;
        },

        toggleUnitSelection(unitID: string) {
            return this._orchestrator?.toggleUnitSelection(unitID);
        },

        getSelectedCount() {
            return this._orchestrator?.getSelectedCount() || 0;
        },

        async performBulkStatusUpdate() {
            return this._orchestrator?.performBulkStatusUpdate();
        },

        async performBulkRentUpdate() {
            return this._orchestrator?.performBulkRentUpdate();
        },

        async toggleUnitAvailability(unit: unknown) {
            return this._orchestrator?.toggleUnitAvailability(unit);
        },

        formatCurrency(amount: number | null | undefined) {
            return this._orchestrator?.formatCurrency(amount) || '$0';
        },

        formatRelativeTime(dateString: string | undefined) {
            return this._orchestrator?.formatRelativeTime(dateString) || 'Never';
        },

        getStatusBadgeClass(status: string | undefined) {
            return this._orchestrator?.getStatusBadgeClass(status) || 'badge-ghost';
        },

        getTabDisplayName(tabKey: string) {
            return this._orchestrator?.getTabDisplayName(tabKey) || 'Building Info';
        },

        // Proxy all getters/setters to the orchestrator
        get building() {
            return this._orchestrator?.building || null;
        },

        set building(value) {
            if(this._orchestrator) {
                this._orchestrator.building = value;
            }
        },

        get original() {
            return this._orchestrator?.original || null;
        },

        get units() {
            return this._orchestrator?.units || [];
        },

        set units(value) {
            if(this._orchestrator) {
                this._orchestrator.units = value;
            }
        },

        get unitTypes() {
            return this._orchestrator?.unitTypes || [];
        },

        set unitTypes(value) {
            if(this._orchestrator) {
                this._orchestrator.unitTypes = value;
            }
        },

        get showSave() {
            return this._orchestrator?.showSave || false;
        },

        get saving() {
            return this._orchestrator?.saving || false;
        },

        get activeSectionTab() {
            return this._orchestrator?.activeSectionTab || 'building-info';
        },

        set activeSectionTab(value) {
            if(this._orchestrator) {
                this._orchestrator.activeSectionTab = value;
            }
        },

        get geocoding() {
            return this._orchestrator?.geocoding || false;
        },

        set geocoding(value) {
            if(this._orchestrator) {
                this._orchestrator.geocoding = value;
            }
        },

        get filteredUnits() {
            return this._orchestrator?.filteredUnitsGetter || [];
        },

        get selectedUnits() {
            return this._orchestrator?.selectedUnitsGetter || new Set();
        },

        get statusFilter() {
            return this._orchestrator?.statusFilter || '';
        },

        set statusFilter(value) {
            if(this._orchestrator) {
                this._orchestrator.statusFilter = value;
            }
        },

        get searchQuery() {
            return this._orchestrator?.searchQuery || '';
        },

        set searchQuery(value) {
            if(this._orchestrator) {
                this._orchestrator.searchQuery = value;
            }
        },

        get showAddUnitDialog() {
            return this._orchestrator?.showAddUnitDialog || false;
        },

        get showAddUnitTypeDialog() {
            return this._orchestrator?.showAddUnitTypeDialog || false;
        },

        get showBulkStatusDialog() {
            return this._orchestrator?.showBulkStatusDialog || false;
        },

        get showBulkRentDialog() {
            return this._orchestrator?.showBulkRentDialog || false;
        },

        get newUnit() {
            return this._orchestrator?.newUnit || { unitID: '', modelID: '' };
        },

        set newUnit(value) {
            if(this._orchestrator) {
                this._orchestrator.newUnit = value;
            }
        },

        get bulkOperation() {
            return this._orchestrator?.bulkOperation || {
                loading: false,
                statusValue: '',
                rentUpdateType: 'absolute',
                rentValue: 0
            };
        },

        get errors() {
            return this._orchestrator?.errors || {};
        },

        set errors(value) {
            if(this._orchestrator) {
                this._orchestrator.errors = value;
            }
        }
    };

    return state;
}

/**
 * Global window function for Alpine.js to use
 */
declare global {
    interface Window {
        createBuildingCardState: typeof createBuildingCardState
    }
}

// Expose to global for Alpine.js usage
if(typeof window !== 'undefined') {
    window.createBuildingCardState = createBuildingCardState;
}
