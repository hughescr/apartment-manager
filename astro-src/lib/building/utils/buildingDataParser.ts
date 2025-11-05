/**
 * Building Data Parser Utilities
 *
 * Extracted from building/state.ts for better organization.
 * Provides utilities for parsing building, units, and unit types data from HTML data attributes.
 */

import type { BuildingData, UnitTypeData } from '../../../types';
import type { ExtendedUnitData } from '../types';
import type { LocationConfig } from '../state';
import { map, filter, forEach } from 'lodash';

/**
 * Building data parser utilities
 */
export class BuildingDataParser {
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
            return JSON.parse(buildingData) as BuildingData;
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
                lastUpdated: unit.lastUpdated ?? new Date().toISOString(),
                status:      unit.status ?? this.getUnitStatus(unit),
                currentRent: unit.rent ?? 0,
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
            return JSON.parse(unitTypesData) as UnitTypeData[];
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

        return apiUrlEl.dataset.apiUrl ?? '';
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
            return JSON.parse(locationData) as LocationConfig;
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
