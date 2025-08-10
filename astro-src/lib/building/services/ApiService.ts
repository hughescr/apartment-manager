import type { BuildingData } from '../../../types';
import type { ExtendedUnitData } from '../types';
import { isError } from 'lodash';

// API response interface for standardized error handling
export interface ApiResponse {
    success: boolean
    data?: unknown
    error?: string
    status?: number
}

// Interface for creating new units
export interface NewUnitData {
    unitID: string
    buildingID: string
    modelID?: string
}

/**
 * Service class for handling all API communication for building operations
 * Extracted from buildingState.ts to provide separation of concerns
 */
export class ApiService {
    private baseUrl = '';

    /**
     * Set the base API URL
     */
    setBaseUrl(url: string): void {
        this.baseUrl = url;
    }

    /**
     * Generic fetch wrapper with error handling
     */
    private async fetchApi(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse> {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if(response.ok) {
                let data: unknown = null;
                const contentType = response.headers.get('content-type');
                if(contentType && contentType.includes('application/json')) {
                    data = await response.json();
                }

                return {
                    success: true,
                    data,
                    status: response.status
                };
            } else {
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`,
                    status: response.status
                };
            }
        } catch(error) {
            return {
                success: false,
                error: isError(error) ? error.message : 'Network error occurred',
                status: 0
            };
        }
    }

    /**
     * Save building changes
     */
    async saveBuilding(building: BuildingData): Promise<ApiResponse> {
        return this.fetchApi(`buildings/${building.buildingID}`, {
            method: 'PUT',
            body: JSON.stringify(building)
        });
    }

    /**
     * Delete a building and all its units
     */
    async deleteBuilding(buildingID: string): Promise<ApiResponse> {
        return this.fetchApi(`buildings/${buildingID}`, {
            method: 'DELETE'
        });
    }

    /**
     * Create a new unit
     */
    async createUnit(buildingID: string, unit: NewUnitData): Promise<ApiResponse> {
        return this.fetchApi(`buildings/${buildingID}/units`, {
            method: 'POST',
            body: JSON.stringify(unit)
        });
    }

    /**
     * Update an existing unit
     */
    async updateUnit(
        buildingID: string,
        unitID: string,
        unit: ExtendedUnitData
    ): Promise<ApiResponse> {
        const updateData = {
            ...unit,
            lastUpdated: new Date().toISOString()
        };

        return this.fetchApi(`buildings/${buildingID}/units/${unitID}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }

    /**
     * Bulk update unit status (vacancy class)
     */
    async bulkUpdateStatus(
        buildingID: string,
        unitIDs: string[],
        status: string
    ): Promise<ApiResponse> {
        return this.fetchApi(`buildings/${buildingID}/units/bulk-status`, {
            method: 'PUT',
            body: JSON.stringify({
                unitIDs,
                vacancyClass: status
            })
        });
    }

    /**
     * Bulk update unit rent
     */
    async bulkUpdateRent(
        buildingID: string,
        unitIDs: string[],
        updateType: 'absolute' | 'percentage',
        value: number
    ): Promise<ApiResponse> {
        return this.fetchApi(`buildings/${buildingID}/units/bulk-rent`, {
            method: 'PUT',
            body: JSON.stringify({
                unitIDs,
                updateType,
                value
            })
        });
    }
}

// Export singleton instance for use across the application
export const apiService = new ApiService();
