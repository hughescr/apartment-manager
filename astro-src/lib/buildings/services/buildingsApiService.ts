import type { BuildingData } from '../../../types';

export interface ApiResponse<T> {
    success: boolean
    data?:   T
    error?:  string
}

export class BuildingsApiService {
    constructor(private apiURL: string) {
        // Remove trailing slash if present to avoid double slashes in URLs
        this.apiURL = apiURL.replace(/\/$/, '');
    }

    async getBuildings(): Promise<ApiResponse<BuildingData[]>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings`, {
                method: 'GET'
            });

            if(response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to load buildings' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async getBuilding(buildingID: string): Promise<ApiResponse<BuildingData>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}`, {
                method: 'GET'
            });

            if(response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to load building' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async createBuilding(building: Partial<BuildingData>): Promise<ApiResponse<BuildingData>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings`, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(building)
            });

            if(response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to create building' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async updateBuilding(buildingID: string, building: Partial<BuildingData>): Promise<ApiResponse<BuildingData>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}`, {
                method:  'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(building)
            });

            if(response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to update building' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async deleteBuilding(buildingID: string): Promise<ApiResponse<void>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}`, {
                method: 'DELETE'
            });

            if(response.ok) {
                return { success: true };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to delete building' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }
}
