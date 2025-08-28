import type { BuildingData, VacancyClass } from '../../../types';
import type { ExtendedUnitData } from '../types';
import type { AlpineMagicProperties } from '../../alpine';
import { UnitsStateManager } from './unitsStateManager';
import { BuildingApiService } from '../services/buildingApiService';
import { forEach, isError } from 'lodash';

export interface BulkOperationsState {
    building: BuildingData | null
    units: ExtendedUnitData[]
    selectedUnits: Set<string>
    showBulkStatusDialog: boolean
    showBulkRentDialog: boolean
    bulkOperation: {
        loading: boolean
        statusValue: string
        rentUpdateType: 'absolute' | 'percentage'
        rentValue: number
        errors?: { unitNumber: string, error: string }[]
        successfulUnits?: string[]
    }
    apiURL: string
}

/**
 * Bulk operations for unit management
 * Handles bulk status updates and rent updates
 */
export class BulkOperations {
    private unitsManager: UnitsStateManager;
    private apiService: BuildingApiService | null = null;

    constructor(private state: BulkOperationsState & AlpineMagicProperties) {
        this.unitsManager = new UnitsStateManager(this.state.units, this.state.selectedUnits);

        if(this.state.apiURL) {
            this.apiService = new BuildingApiService(this.state.apiURL);
        }
    }

    /**
     * Open bulk status update dialog
     */
    openBulkStatusDialog(): void {
        if(this.state.selectedUnits.size === 0) {
            this.state.$dispatch('toast:show', {
                message: 'Please select units first',
                type: 'warning'
            });
            return;
        }
        this.state.showBulkStatusDialog = true;
        this.state.bulkOperation.statusValue = '';
    }

    /**
     * Close bulk status update dialog
     */
    closeBulkStatusDialog(): void {
        this.state.showBulkStatusDialog = false;
        this.state.bulkOperation.statusValue = '';
    }

    /**
     * Open bulk rent update dialog
     */
    openBulkRentDialog(): void {
        if(this.state.selectedUnits.size === 0) {
            this.state.$dispatch('toast:show', {
                message: 'Please select units first',
                type: 'warning'
            });
            return;
        }
        this.state.showBulkRentDialog = true;
        this.state.bulkOperation.rentValue = 0;
        this.state.bulkOperation.rentUpdateType = 'absolute';
    }

    /**
     * Close bulk rent update dialog
     */
    closeBulkRentDialog(): void {
        this.state.showBulkRentDialog = false;
        this.state.bulkOperation.rentValue = 0;
    }

    /**
     * Perform bulk status update
     */
    async performBulkStatusUpdate(): Promise<void> {
        if(this.state.selectedUnits.size === 0 || !this.state.bulkOperation.statusValue || !this.apiService || !this.state.building) {
            return;
        }

        this.state.bulkOperation.loading = true;
        try {
            const unitIDs = Array.from(this.state.selectedUnits);
            const result = await this.apiService.bulkUpdateUnits(
                this.state.building.buildingID,
                unitIDs,
                { status: this.state.bulkOperation.statusValue }
            );

            if(!result.success) {
                throw new Error(result.error || 'Failed to update units');
            }

            // Update local state
            forEach(this.state.units, (unit) => {
                if(unitIDs.includes(unit.unitID)) {
                    unit.vacancyClass = this.state.bulkOperation.statusValue as VacancyClass;
                    unit.lastUpdated = new Date().toISOString();
                }
            });

            this.unitsManager.clearSelection();
            this.closeBulkStatusDialog();

            this.state.$dispatch('toast:show', {
                message: `Updated ${unitIDs.length} units successfully`,
                type: 'success'
            });

            this.state.$dispatch('units:bulk-update', {
                operationType: 'status',
                unitIDs
            });
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: 'Failed to update units: ' + (isError(error) ? error.message : 'Unknown error'),
                type: 'error'
            });
        } finally {
            this.state.bulkOperation.loading = false;
        }
    }

    /**
     * Perform bulk rent update
     */
    async performBulkRentUpdate(): Promise<void> {
        if(this.state.selectedUnits.size === 0 || !this.state.bulkOperation.rentValue || !this.apiService || !this.state.building) {
            return;
        }

        this.state.bulkOperation.loading = true;
        try {
            const unitIDs = Array.from(this.state.selectedUnits);
            const result = await this.apiService.bulkUpdateUnits(
                this.state.building.buildingID,
                unitIDs,
                {
                    rentUpdateType: this.state.bulkOperation.rentUpdateType,
                    rent: this.state.bulkOperation.rentValue
                }
            );

            if(!result.success) {
                throw new Error(result.error || 'Failed to update rents');
            }

            // Update local state based on operation type
            forEach(this.state.units, (unit) => {
                if(unitIDs.includes(unit.unitID)) {
                    if(this.state.bulkOperation.rentUpdateType === 'absolute') {
                        unit.rent = this.state.bulkOperation.rentValue;
                    } else if(this.state.bulkOperation.rentUpdateType === 'percentage') {
                        const currentRent = unit.rent || 0;
                        const changeAmount = currentRent * (this.state.bulkOperation.rentValue / 100);
                        unit.rent = currentRent + changeAmount;
                    }
                    unit.lastUpdated = new Date().toISOString();
                }
            });

            this.unitsManager.clearSelection();
            this.closeBulkRentDialog();

            this.state.$dispatch('toast:show', {
                message: `Updated rent for ${unitIDs.length} units successfully`,
                type: 'success'
            });

            this.state.$dispatch('units:bulk-update', {
                operationType: 'rent',
                unitIDs
            });
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: 'Failed to update rents: ' + (isError(error) ? error.message : 'Unknown error'),
                type: 'error'
            });
        } finally {
            this.state.bulkOperation.loading = false;
        }
    }

    /**
     * Get selected unit count
     */
    getSelectedCount(): number {
        return this.unitsManager.getSelectedCount();
    }

    /**
     * Check if any units are selected
     */
    hasSelectedUnits(): boolean {
        return this.state.selectedUnits.size > 0;
    }
}
