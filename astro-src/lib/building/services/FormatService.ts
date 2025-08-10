import type { BuildingData, UnitTypeData } from '../../../types';
import type { ExtendedUnitData } from '../types';
import { toLower, trim } from 'lodash';

// Data parsed from HTML element attributes
export interface ParsedData {
    building: BuildingData | null
    units: ExtendedUnitData[]
    unitTypes: UnitTypeData[]
    apiURL: string
}

// Service interface for data formatting and UI presentation
export interface FormatService {
    formatCurrency(amount: number | null | undefined): string
    formatRelativeTime(dateString: string | undefined): string
    getStatusBadgeClass(status: string | undefined): string
    getTabDisplayName(tabKey: string): string
    parseDataAttributes(element: HTMLElement): ParsedData
}

/**
 * Service for handling data formatting and UI presentation logic
 * Extracted from buildingState.ts to separate concerns
 */
class FormatServiceImpl implements FormatService {
    /**
     * Format currency values for display
     */
    formatCurrency(amount: number | null | undefined): string {
        if(amount === null || amount === undefined) {
            return '$0';
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Format date/time as relative time string
     */
    formatRelativeTime(dateString: string | undefined): string {
        if(!dateString) {
            return 'Never';
        }
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if(diffDays > 30) {
            return date.toLocaleDateString();
        } else if(diffDays > 0) {
            return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        } else if(diffHours > 0) {
            return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        } else if(diffMins > 0) {
            return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        } else {
            return 'Just now';
        }
    }

    /**
     * Get CSS class for status badges
     */
    getStatusBadgeClass(status: string | undefined): string {
        const statusClasses = {
            occupied: 'badge-error',
            unoccupied: 'badge-success',
            notice: 'badge-warning',
            down: 'badge-neutral'
        };
        return statusClasses[toLower(status) as keyof typeof statusClasses] || 'badge-ghost';
    }

    /**
     * Get display name for tab keys
     */
    getTabDisplayName(tabKey: string): string {
        const tabNames = {
            'building-info': 'Building Info',
            'floorplans-units': 'Floorplans & Units',
            'pricing-policies': 'Pricing & Policies',
            marketing: 'Marketing',
            units: 'Units'
        };
        return tabNames[tabKey as keyof typeof tabNames] || 'Building Info';
    }

    /**
     * Parse data attributes from HTML element
     * Extracted from init() method in buildingState.ts
     */
    parseDataAttributes(element: HTMLElement): ParsedData {
        const dataset = element.dataset;
        let building: BuildingData | null = null;
        let units: ExtendedUnitData[] = [];
        let unitTypes: UnitTypeData[] = [];

        // Parse building data with error handling
        try {
            const buildingDataStr = dataset.building;
            if(!buildingDataStr || trim(buildingDataStr) === '') {
                building = null;
            } else {
                building = JSON.parse(buildingDataStr);
            }
        } catch { // eslint-disable-line @stylistic/keyword-spacing -- TypeScript requires space, ESLint forbids it
            // Failed to parse building data, use null
            building = null;
        }

        // Parse units data with error handling
        try {
            units = JSON.parse(dataset.units || '[]') || [];
        } catch { // eslint-disable-line @stylistic/keyword-spacing -- TypeScript requires space, ESLint forbids it
            // Failed to parse units data, use empty array
            units = [];
        }

        // Parse unit types data with error handling
        try {
            unitTypes = JSON.parse(dataset.unitTypes || '[]') || [];
        } catch { // eslint-disable-line @stylistic/keyword-spacing -- TypeScript requires space, ESLint forbids it
            // Failed to parse unitTypes data, use empty array
            unitTypes = [];
        }

        const apiURL = dataset.apiUrl || '';

        return {
            building,
            units,
            unitTypes,
            apiURL
        };
    }
}

// Export singleton instance
export const formatService: FormatService = new FormatServiceImpl();

// Export the class for testing purposes
export { FormatServiceImpl };
