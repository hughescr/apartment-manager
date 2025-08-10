import type { ExtendedUnitData } from '../types';
import { filter, trim, toLower } from 'lodash';

export interface FilterCriteria {
    statusFilter: string
    searchQuery: string
}

export interface FilterService {
    filterUnits(units: ExtendedUnitData[], filters: FilterCriteria): ExtendedUnitData[]
    updateFilters(newFilters: Partial<FilterCriteria>): void
    getActiveFilters(): FilterCriteria
    resetFilters(): void
}

export class DefaultFilterService implements FilterService {
    private filters: FilterCriteria = {
        statusFilter: '',
        searchQuery: ''
    };

    filterUnits(units: ExtendedUnitData[], filters: FilterCriteria): ExtendedUnitData[] {
        let filtered: ExtendedUnitData[] = [...(units || [])];

        // Apply status filter
        if(filters.statusFilter) {
            filtered = filter(filtered, { vacancyClass: filters.statusFilter }) as ExtendedUnitData[];
        }

        // Apply search filter
        if(trim(filters.searchQuery)) {
            const query = toLower(filters.searchQuery);
            filtered = filter(filtered, unit =>
                toLower(unit.unitNumber || unit.unitID || '').includes(query)
            );
        }

        return filtered;
    }

    updateFilters(newFilters: Partial<FilterCriteria>): void {
        this.filters = { ...this.filters, ...newFilters };
    }

    getActiveFilters(): FilterCriteria {
        return { ...this.filters };
    }

    resetFilters(): void {
        this.filters = {
            statusFilter: '',
            searchQuery: ''
        };
    }
}
