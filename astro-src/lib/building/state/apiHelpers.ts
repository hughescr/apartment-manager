import type { BuildingData, UnitData } from '../../../types';
import type { ExtendedUnitData } from '../types';
import type { AlpineMagicProperties } from '../../alpine';
import { BuildingApiService, type BulkUpdateData } from '../services/buildingApiService';
import { isError } from 'lodash';

export interface ApiHelpersState {
    apiURL: string
    building: BuildingData | null
}

/**
 * API interaction utilities for building management
 * Provides wrapper methods with error handling and toast notifications
 */
export class ApiHelpers {
    private apiService: BuildingApiService | null = null;

    constructor(private state: ApiHelpersState & AlpineMagicProperties) {
        if(this.state.apiURL) {
            this.apiService = new BuildingApiService(this.state.apiURL);
        }
    }

    /**
     * Initialize API service with URL
     */
    initializeApi(apiURL: string): void {
        this.state.apiURL = apiURL;
        this.apiService = new BuildingApiService(apiURL);
    }

    /**
     * Save building with error handling and notifications
     */
    async saveBuilding(building: BuildingData): Promise<{ success: boolean, data?: BuildingData }> {
        if(!this.apiService) {
            this.showError('API service not initialized');
            return { success: false };
        }

        try {
            const result = await this.apiService.saveBuilding(building);

            if(result.success && result.data) {
                this.showSuccess('Building saved successfully');
                return { success: true, data: result.data };
            } else {
                this.showError(result.error || 'Failed to save building');
                return { success: false };
            }
        } catch(error) {
            const message = isError(error) ? error.message : 'Network error occurred';
            this.showError(`Failed to save building: ${message}`);
            return { success: false };
        }
    }

    /**
     * Delete building with error handling and notifications
     */
    async deleteBuilding(buildingID: string): Promise<boolean> {
        if(!this.apiService) {
            this.showError('API service not initialized');
            return false;
        }

        try {
            const result = await this.apiService.deleteBuilding(buildingID);

            if(result.success) {
                this.showSuccess('Building deleted successfully');
                return true;
            } else {
                this.showError(result.error || 'Failed to delete building');
                return false;
            }
        } catch(error) {
            const message = isError(error) ? error.message : 'Network error occurred';
            this.showError(`Failed to delete building: ${message}`);
            return false;
        }
    }

    /**
     * Add unit with error handling and notifications
     */
    async addUnit(unit: Partial<UnitData>): Promise<{ success: boolean, data?: ExtendedUnitData }> {
        if(!this.apiService || !this.state.building) {
            this.showError('API service or building not available');
            return { success: false };
        }

        try {
            const result = await this.apiService.addUnit(this.state.building.buildingID, unit);

            if(result.success && result.data) {
                this.showSuccess('Unit added successfully');
                return { success: true, data: result.data };
            } else {
                this.showError(result.error || 'Failed to add unit');
                return { success: false };
            }
        } catch(error) {
            const message = isError(error) ? error.message : 'Network error occurred';
            this.showError(`Failed to add unit: ${message}`);
            return { success: false };
        }
    }

    /**
     * Update unit with error handling and notifications
     */
    async updateUnit(unit: ExtendedUnitData, successMessage?: string): Promise<{ success: boolean, data?: ExtendedUnitData }> {
        if(!this.apiService || !this.state.building) {
            this.showError('API service or building not available');
            return { success: false };
        }

        try {
            const result = await this.apiService.updateUnit(this.state.building.buildingID, unit);

            if(result.success && result.data) {
                this.showSuccess(successMessage || 'Unit updated successfully');
                return { success: true, data: result.data };
            } else {
                this.showError(result.error || 'Failed to update unit');
                return { success: false };
            }
        } catch(error) {
            const message = isError(error) ? error.message : 'Network error occurred';
            this.showError(`Failed to update unit: ${message}`);
            return { success: false };
        }
    }

    /**
     * Delete unit with error handling and notifications
     */
    async deleteUnit(unitID: string): Promise<boolean> {
        if(!this.apiService || !this.state.building) {
            this.showError('API service or building not available');
            return false;
        }

        try {
            const result = await this.apiService.deleteUnit(this.state.building.buildingID, unitID);

            if(result.success) {
                this.showSuccess('Unit deleted successfully');
                return true;
            } else {
                this.showError(result.error || 'Failed to delete unit');
                return false;
            }
        } catch(error) {
            const message = isError(error) ? error.message : 'Network error occurred';
            this.showError(`Failed to delete unit: ${message}`);
            return false;
        }
    }

    /**
     * Bulk update units with error handling and notifications
     */
    async bulkUpdateUnits(unitIDs: string[], updates: BulkUpdateData, operationType: string): Promise<boolean> {
        if(!this.apiService || !this.state.building) {
            this.showError('API service or building not available');
            return false;
        }

        try {
            const result = await this.apiService.bulkUpdateUnits(this.state.building.buildingID, unitIDs, updates);

            if(result.success) {
                const message = operationType === 'status'
                    ? `Updated status for ${unitIDs.length} units successfully`
                    : `Updated rent for ${unitIDs.length} units successfully`;
                this.showSuccess(message);
                return true;
            } else {
                this.showError(result.error || 'Failed to bulk update units');
                return false;
            }
        } catch(error) {
            const message = isError(error) ? error.message : 'Network error occurred';
            this.showError(`Failed to bulk update units: ${message}`);
            return false;
        }
    }

    /**
     * Update specific unit field with error handling
     */
    async updateUnitField(unitID: string, field: string, value: unknown, successMessage?: string): Promise<{ success: boolean, data?: ExtendedUnitData }> {
        if(!this.apiService || !this.state.building) {
            this.showError('API service or building not available');
            return { success: false };
        }

        try {
            const result = await this.apiService.updateUnitField(this.state.building.buildingID, unitID, field, value);

            if(result.success && result.data) {
                this.showSuccess(successMessage || `${field} updated successfully`);
                return { success: true, data: result.data };
            } else {
                this.showError(result.error || `Failed to update ${field}`);
                return { success: false };
            }
        } catch(error) {
            const message = isError(error) ? error.message : 'Network error occurred';
            this.showError(`Failed to update ${field}: ${message}`);
            return { success: false };
        }
    }

    /**
     * Generic API request wrapper
     */
    async makeApiRequest<T>(
        requestFn: () => Promise<{ success: boolean, data?: T, error?: string }>,
        successMessage?: string,
        errorPrefix?: string
    ): Promise<{ success: boolean, data?: T }> {
        try {
            const result = await requestFn();

            if(result.success) {
                if(successMessage) {
                    this.showSuccess(successMessage);
                }
                return { success: true, data: result.data };
            } else {
                const message = errorPrefix
                    ? `${errorPrefix}: ${result.error || 'Unknown error'}`
                    : result.error || 'Request failed';
                this.showError(message);
                return { success: false };
            }
        } catch(error) {
            const message = isError(error) ? error.message : 'Network error occurred';
            const fullMessage = errorPrefix ? `${errorPrefix}: ${message}` : message;
            this.showError(fullMessage);
            return { success: false };
        }
    }

    /**
     * Show success toast notification
     */
    private showSuccess(message: string): void {
        this.state.$dispatch('toast:show', {
            message,
            type: 'success'
        });
    }

    /**
     * Show error toast notification
     */
    private showError(message: string): void {
        this.state.$dispatch('toast:show', {
            message,
            type: 'error'
        });
    }

    /**
     * Show warning toast notification
     */
    showWarning(message: string): void {
        this.state.$dispatch('toast:show', {
            message,
            type: 'warning'
        });
    }

    /**
     * Show info toast notification
     */
    showInfo(message: string): void {
        this.state.$dispatch('toast:show', {
            message,
            type: 'info'
        });
    }

    /**
     * Check if API service is available
     */
    isApiAvailable(): boolean {
        return this.apiService !== null && this.state.apiURL !== '';
    }
}
