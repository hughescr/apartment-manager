// Factory function for unitTypeFormData Alpine component
// Wrapper for the existing createUnitTypeFormState function to support centralized registry

import { createUnitTypeFormState } from './state/unitTypeFormState';

interface UnitTypeFormConfig {
    apiURL:     string
    buildingID: string
}

/**
 * Factory function for unitTypeFormData Alpine component
 *
 * Creates an Alpine.js component for unit type form management.
 * This factory wraps the existing createUnitTypeFormState to support the centralized
 * Alpine.js registration pattern while maintaining backward compatibility.
 *
 * @param config - Optional configuration object or legacy API URL string
 * @param buildingID - Optional building ID (legacy parameter)
 * @returns Function that creates the Alpine.js component when bound to an element
 *
 * @description
 * The factory supports two usage patterns:
 * 1. **Centralized registration** (no parameters): Reads from HTML data attributes
 * 2. **Direct calls** (with parameters): Uses provided config for backward compatibility
 *
 * Data attributes used in centralized mode:
 * - `data-api-url`: Base API URL for making requests
 * - `data-building-id`: ID of the building being edited
 *
 * @example
 * ```html
 * <!-- Centralized registration usage -->
 * <div
 *   x-data="unitTypeFormData"
 *   data-api-url="/api/"
 *   data-building-id="building123"
 * >
 * ```
 *
 * @example
 * ```typescript
 * // Direct usage (backward compatibility)
 * const formState = createUnitTypeFormFactory('/api/', 'building123');
 * ```
 */
export function createUnitTypeFormFactory(config?: UnitTypeFormConfig | string, buildingID?: string) {
    return function(this: HTMLElement) {
        // When called from centralized registration, read from data attributes
        if(!config) {
            const apiURL = this.dataset.apiUrl;
            const buildingId = this.dataset.buildingId;

            if(!apiURL?.trim() || !buildingId?.trim()) {
                throw new Error('UnitTypeFormFactory requires data-api-url and data-building-id attributes');
            }

            return createUnitTypeFormState(apiURL, buildingId);
        }

        // Handle both direct arguments (legacy) and config object (legacy patterns)
        if(typeof config === 'string') {
            // Legacy pattern: createUnitTypeFormFactory(apiURL, buildingID)
            const apiURL = config;
            const resolvedBuildingID = buildingID || '';
            return createUnitTypeFormState(apiURL, resolvedBuildingID);
        }

        // New pattern: createUnitTypeFormFactory(config)
        const parsedConfig = typeof config === 'object' ? config : JSON.parse(config);
        return createUnitTypeFormState(parsedConfig.apiURL, parsedConfig.buildingID);
    };
}
