import type { BuildingData, UnitTypeData } from '../../../types';
import type { ExtendedUnitData } from '../types';
import type { AlpineMagicProperties } from '../../alpine';
import { BuildingFormatters } from '../utils/formatters';
import { chain, compact, filter, forEach, isArray, isObject, isString, keys, reduce, toLower, trim } from 'lodash';

export interface StateHelpersState {
    building: BuildingData | null
    units: ExtendedUnitData[]
    unitTypes: UnitTypeData[]
    filteredUnits: ExtendedUnitData[]
    selectedUnits: Set<string>
    statusFilter: string
    searchQuery: string
    activeSectionTab: string
    geocoding: boolean
}

/**
 * Common state management utilities and helpers
 * Provides watchers, formatters, and UI state management
 */
export class StateHelpers {
    constructor(private state: StateHelpersState & AlpineMagicProperties) {}

    /**
     * Setup all state watchers for reactive behavior
     */
    setupAllWatchers(): void {
        this.setupFilterWatchers();
        this.setupSearchWatchers();
        this.setupSelectionWatchers();
        this.setupGeocodingWatchers();
    }

    /**
     * Setup filter-related watchers
     */
    private setupFilterWatchers(): void {
        this.state.$watch('statusFilter', () => {
            this.state.$dispatch('units:filter-changed', {
                filter: this.state.statusFilter
            });
        });
    }

    /**
     * Setup search-related watchers
     */
    private setupSearchWatchers(): void {
        this.state.$watch('searchQuery', () => {
            if(this.state.searchQuery !== undefined) {
                this.state.$dispatch('units:filter', {
                    filter: this.state.statusFilter,
                    query: this.state.searchQuery
                });
            }
        });
    }

    /**
     * Setup selection-related watchers
     */
    private setupSelectionWatchers(): void {
        this.state.$watch('selectedUnits', () => {
            this.state.$dispatch('units:selection-changed', {
                selected: Array.from(this.state.selectedUnits)
            });
        });
    }

    /**
     * Setup geocoding state watchers
     */
    private setupGeocodingWatchers(): void {
        this.state.$watch('geocoding', (value: boolean) => {
            this.state.$dispatch('location:geocoding', { geocoding: value });
        });
    }

    /**
     * Format currency values
     */
    formatCurrency(amount: number | null | undefined): string {
        return BuildingFormatters.formatCurrency(amount);
    }

    /**
     * Format relative time
     */
    formatRelativeTime(dateString: string | undefined): string {
        return BuildingFormatters.formatRelativeTime(dateString);
    }

    /**
     * Get status badge CSS class
     */
    getStatusBadgeClass(status: string | undefined): string {
        return BuildingFormatters.getStatusBadgeClass(status);
    }

    /**
     * Get tab display name
     */
    getTabDisplayName(tabKey: string): string {
        return BuildingFormatters.getTabDisplayName(tabKey);
    }

    /**
     * Format square feet
     */
    formatSquareFeet(sqft: number | null | undefined): string {
        return BuildingFormatters.formatSquareFeet(sqft);
    }

    /**
     * Format beds and baths
     */
    formatBedsBaths(beds: number | null | undefined, baths: number | null | undefined): string {
        return BuildingFormatters.formatBedsBaths(beds, baths);
    }

    /**
     * Format phone number
     */
    formatPhoneNumber(phone: string | null | undefined): string {
        return BuildingFormatters.formatPhoneNumber(phone);
    }

    /**
     * Format date
     */
    formatDate(dateString: string | null | undefined): string {
        return BuildingFormatters.formatDate(dateString);
    }

    /**
     * Format date and time
     */
    formatDateTime(dateString: string | null | undefined): string {
        return BuildingFormatters.formatDateTime(dateString);
    }

    /**
     * Get current tab information
     */
    getCurrentTab(): { key: string, name: string } {
        return {
            key: this.state.activeSectionTab,
            name: this.getTabDisplayName(this.state.activeSectionTab)
        };
    }

    /**
     * Set active tab
     */
    setActiveTab(tabKey: string): void {
        this.state.activeSectionTab = tabKey;
        this.state.$dispatch('tab:changed', {
            tab: tabKey,
            name: this.getTabDisplayName(tabKey)
        });
    }

    /**
     * Get filter summary information
     */
    getFilterSummary(): {
        total: number
        filtered: number
        selected: number
        hasFilter: boolean
    } {
        return {
            total: this.state.units.length,
            filtered: this.state.filteredUnits.length,
            selected: this.state.selectedUnits.size,
            hasFilter: !!(this.state.statusFilter || this.state.searchQuery)
        };
    }

    /**
     * Get unit status counts
     */
    getStatusCounts(): Record<string, number> {
        const counts: Record<string, number> = {
            all: this.state.units.length,
            occupied: 0,
            vacant: 0,
            notice: 0,
            model: 0,
            available: 0
        };

        forEach(this.state.units, (unit) => {
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
    }

    /**
     * Get available unit types for dropdown
     */
    getAvailableUnitTypes(): { value: string, text: string }[] {
        return chain(this.state.unitTypes)
            .filter(ut => (ut.countAvailable ?? 0) > 0)
            .map(ut => ({
                value: ut.modelID,
                text: `${ut.modelID} - ${ut.modelName}`
            }))
            .value();
    }

    /**
     * Debounce function for search input
     */
    debounce<T extends (...args: unknown[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
        let timeoutId: ReturnType<typeof setTimeout>;
        return (...args: Parameters<T>) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Deep clone an object
     */
    deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Check if an object is empty
     */
    isEmpty(obj: unknown): boolean {
        if(obj == null) {
            return true;
        }
        if(isString(obj)) {
            return trim(obj) === '';
        }
        if(isArray(obj)) {
            return obj.length === 0;
        }
        if(isObject(obj)) {
            return keys(obj).length === 0;
        }
        return false;
    }

    /**
     * Emit custom events with consistent format
     */
    emitEvent(eventName: string, data?: Record<string, unknown>): void {
        this.state.$dispatch(eventName, {
            timestamp: new Date().toISOString(),
            source: 'buildingState',
            ...data
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcut(event: KeyboardEvent): boolean {
        if(event.ctrlKey || event.metaKey) {
            switch(toLower(event.key)) {
                case 's':
                    event.preventDefault();
                    this.emitEvent('shortcut:save');
                    return true;
                case 'z':
                    event.preventDefault();
                    this.emitEvent('shortcut:undo');
                    return true;
                case 'a':
                    event.preventDefault();
                    this.emitEvent('shortcut:select-all');
                    return true;
                case 'f':
                    event.preventDefault();
                    this.emitEvent('shortcut:search');
                    return true;
            }
        }

        if(event.key === 'Escape') {
            this.emitEvent('shortcut:escape');
            return true;
        }

        return false;
    }

    /**
     * Get building address as formatted string
     */
    getFormattedAddress(): string {
        if(!this.state.building) {
            return '';
        }

        const parts = compact([
            this.state.building.street,
            this.state.building.city,
            this.state.building.state,
            this.state.building.zip
        ]);

        return parts.join(', ');
    }

    /**
     * Calculate occupancy rate
     */
    getOccupancyRate(): number {
        if(this.state.units.length === 0) {
            return 0;
        }

        const occupiedCount = filter(
            this.state.units,
            { vacancyClass: 'Occupied' }
        ).length;

        return Math.round((occupiedCount / this.state.units.length) * 100);
    }

    /**
     * Get average rent
     */
    getAverageRent(): number {
        const unitsWithRent = filter(this.state.units, unit => unit.rent && unit.rent > 0) as ExtendedUnitData[];

        if(unitsWithRent.length === 0) {
            return 0;
        }

        const totalRent = reduce(unitsWithRent, (sum: number, unit: ExtendedUnitData) => sum + (unit.rent || 0), 0);
        return Math.round(totalRent / unitsWithRent.length);
    }
}
