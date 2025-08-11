import _ from 'lodash';
import type { BuildingData, UnitTypeData } from '../../../types';
import type { ExtendedUnitData } from '../types';

export interface LocationConfig {
    lat?: number
    lng?: number
    mapboxToken?: string
}

export class BuildingDataParser {
    static parseBuildingData(element: HTMLElement): BuildingData | null {
        const buildingEl = element.querySelector('[data-building]');
        if(!buildingEl) {
            return null;
        }

        try {
            const buildingData = (buildingEl as HTMLElement).dataset.building;
            if(!buildingData) {
                return null;
            }
            return JSON.parse(buildingData);
        } catch{
            return null;
        }
    }

    static parseUnitsData(element: HTMLElement): ExtendedUnitData[] {
        const unitsEl = element.querySelector('[data-units]');
        if(!unitsEl) {
            return [];
        }

        try {
            const unitsData = (unitsEl as HTMLElement).dataset.units;
            if(!unitsData) {
                return [];
            }

            const units = JSON.parse(unitsData) as ExtendedUnitData[];

            // Initialize extended properties for each unit
            return _.map(units, unit => ({
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
        const unitTypesEl = element.querySelector('[data-unit-types]');
        if(!unitTypesEl) {
            return [];
        }

        try {
            const unitTypesData = (unitTypesEl as HTMLElement).dataset.unitTypes;
            if(!unitTypesData) {
                return [];
            }
            return JSON.parse(unitTypesData);
        } catch{
            return [];
        }
    }

    static parseLocationData(element: HTMLElement): LocationConfig | null {
        const locationEl = element.querySelector('[data-location-config]');
        if(!locationEl) {
            return null;
        }

        try {
            const locationData = (locationEl as HTMLElement).dataset.locationConfig;
            if(!locationData) {
                return null;
            }
            return JSON.parse(locationData);
        } catch{
            return null;
        }
    }

    static parseApiUrl(element: HTMLElement): string {
        const apiUrlEl = element.querySelector('[data-api-url]');
        if(!apiUrlEl) {
            return '';
        }

        return (apiUrlEl as HTMLElement).dataset.apiUrl || '';
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
        const unitsWithoutTimestamp = _.filter(units, unit => !unit.lastUpdated);
        _.forEach(unitsWithoutTimestamp, (unit) => {
            unit.lastUpdated = now;
        });
    }

    static serializeBuildingData(building: BuildingData): string {
        return JSON.stringify(building);
    }

    static serializeUnitsData(units: ExtendedUnitData[]): string {
        // Remove runtime-only properties before serialization
        const cleanUnits = _.map(units, (unit) => {
            const { editingRent: _editingRent, savingField: _savingField, ...cleanUnit } = unit;
            return cleanUnit;
        });
        return JSON.stringify(cleanUnits);
    }
}
