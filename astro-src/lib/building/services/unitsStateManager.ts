/**
 * Units State Management Utilities
 *
 * Extracted from building/state.ts for better organization.
 * Provides utilities for filtering, sorting, and managing unit selection state.
 */

import type { ExtendedUnitData } from '../types';

/**
 * Units state management utilities
 */
export class UnitsStateManager {
    constructor(
        private units: ExtendedUnitData[],
        private selectedUnits: Set<string>
    ) {}

    updateFilteredUnits(statusFilter: string, searchQuery: string): ExtendedUnitData[] {
        let filtered = [...this.units];

        // Apply status filter
        if(statusFilter && statusFilter !== 'all') {
            filtered = filtered.filter((unit) => {
                switch(statusFilter) {
                    case 'available':
                        return unit.vacancyClass === 'Unoccupied' || unit.vacancyClass === 'Notice';
                    case 'occupied':
                        return unit.vacancyClass === 'Occupied';
                    case 'notice':
                        return unit.vacancyClass === 'Notice';
                    case 'vacant':
                        return unit.vacancyClass === 'Unoccupied';
                    case 'model':
                        return unit.vacancyClass === 'Down';
                    default:
                        return true;
                }
            });
        }

        // Apply search query
        if(searchQuery && searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((unit): unit is ExtendedUnitData => {
                return !!(
                    unit.unitID.toLowerCase().includes(query)
                    || (unit.description?.toLowerCase().includes(query) ?? false)
                    || (unit.beds?.toString().includes(query) ?? false)
                    || (unit.baths?.toString().includes(query) ?? false)
                    || (unit.rent?.toString().includes(query) ?? false)
                );
            });
        }

        // Sort by unit ID
        filtered.sort((a, b) => {
            // Try to parse as numbers first
            const aNum = parseInt(a.unitID);
            const bNum = parseInt(b.unitID);

            if(!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
            }

            // Fall back to string comparison
            return a.unitID.localeCompare(b.unitID);
        });

        return filtered;
    }

    toggleSelectAll(filteredUnits: ExtendedUnitData[]): void {
        const allSelected = filteredUnits.every(unit => this.selectedUnits.has(unit.unitID));

        if(allSelected) {
            // Deselect all filtered units
            filteredUnits.forEach(unit => this.selectedUnits.delete(unit.unitID));
        } else {
            // Select all filtered units
            filteredUnits.forEach(unit => this.selectedUnits.add(unit.unitID));
        }
    }

    toggleUnitSelection(unitID: string): void {
        if(this.selectedUnits.has(unitID)) {
            this.selectedUnits.delete(unitID);
        } else {
            this.selectedUnits.add(unitID);
        }
    }

    isUnitSelected(unitID: string): boolean {
        return this.selectedUnits.has(unitID);
    }

    getSelectedCount(): number {
        return this.selectedUnits.size;
    }

    clearSelection(): void {
        this.selectedUnits.clear();
    }

    updateUnit(unitID: string, updates: Partial<ExtendedUnitData>): void {
        const unitIndex = this.units.findIndex(unit => unit.unitID === unitID);
        if(unitIndex !== -1) {
            this.units[unitIndex] = {
                ...this.units[unitIndex],
                ...updates,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    removeUnit(unitID: string): void {
        const unitIndex = this.units.findIndex(unit => unit.unitID === unitID);
        if(unitIndex !== -1) {
            this.units.splice(unitIndex, 1);
            this.selectedUnits.delete(unitID);
        }
    }

    addUnit(unit: ExtendedUnitData): void {
        this.units.push({
            ...unit,
            lastUpdated: new Date().toISOString()
        });
    }

    getUnit(unitID: string): ExtendedUnitData | undefined {
        return this.units.find(unit => unit.unitID === unitID);
    }
}
