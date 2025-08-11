import _ from 'lodash';
import type { ExtendedUnitData } from '../types';

export class UnitsStateManager {
    constructor(
        private units: ExtendedUnitData[],
        private selectedUnits: Set<string>
    ) {}

    updateFilteredUnits(statusFilter: string, searchQuery: string): ExtendedUnitData[] {
        let filtered = [...this.units];

        // Apply status filter
        if(statusFilter && statusFilter !== 'all') {
            filtered = _.filter(filtered, (unit) => {
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
        if(searchQuery && _.trim(searchQuery) !== '') {
            const query = _.toLower(searchQuery);
            filtered = _.filter(filtered, (unit): unit is ExtendedUnitData => {
                return !!(
                    _.includes(_.toLower(unit.unitID), query) ||
                    (unit.description && _.includes(_.toLower(unit.description), query)) ||
                    (unit.beds && unit.beds.toString().includes(query)) ||
                    (unit.baths && unit.baths.toString().includes(query)) ||
                    (unit.rent && unit.rent.toString().includes(query))
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
        const allSelected = _.every(filteredUnits, unit => this.selectedUnits.has(unit.unitID));

        if(allSelected) {
            // Deselect all filtered units
            _.forEach(filteredUnits, unit => this.selectedUnits.delete(unit.unitID));
        } else {
            // Select all filtered units
            _.forEach(filteredUnits, unit => this.selectedUnits.add(unit.unitID));
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

    getSelectedUnitIDs(): string[] {
        return Array.from(this.selectedUnits);
    }

    clearSelection(): void {
        this.selectedUnits.clear();
    }

    updateUnit(unitID: string, updates: Partial<ExtendedUnitData>): void {
        const unitIndex = _.findIndex(this.units, ['unitID', unitID]);
        if(unitIndex !== -1) {
            this.units[unitIndex] = {
                ...this.units[unitIndex],
                ...updates,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    removeUnit(unitID: string): void {
        const unitIndex = _.findIndex(this.units, ['unitID', unitID]);
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
        return _.find(this.units, ['unitID', unitID]);
    }

    getAllUnits(): ExtendedUnitData[] {
        return [...this.units];
    }

    getUnitCount(): number {
        return this.units.length;
    }

    getStatusCounts(): Record<string, number> {
        const counts: Record<string, number> = {
            all: this.units.length,
            available: 0,
            occupied: 0,
            notice: 0,
            vacant: 0,
            model: 0
        };

        _.forEach(this.units, (unit) => {
            switch(unit.vacancyClass) {
                case 'Occupied':
                    counts.occupied++;
                    break;
                case 'Notice':
                    counts.notice++;
                    counts.available++;
                    break;
                case 'Unoccupied':
                    counts.vacant++;
                    counts.available++;
                    break;
                case 'Down':
                    counts.model++;
                    break;
            }
        });

        return counts;
    }
}
