import type { UnitTypeData } from '../../../types';

export interface ApiResponse<T> {
    success: boolean
    data?:   T
    error?:  string
}

export class UnitTypesApiService {
    constructor(private apiURL: string) {
        // Remove trailing slash if present to avoid double slashes in URLs
        this.apiURL = apiURL.replace(/\/$/, '');
    }

    async getUnitTypes(buildingID: string): Promise<ApiResponse<UnitTypeData[]>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/unit-types`, {
                method: 'GET'
            });

            if(response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to load unit types' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async getUnitType(buildingID: string, modelID: string): Promise<ApiResponse<UnitTypeData>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/unit-types/${modelID}`, {
                method: 'GET'
            });

            if(response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to load unit type' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async createUnitType(unitType: Partial<UnitTypeData>): Promise<ApiResponse<UnitTypeData>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${unitType.buildingID}/unit-types`, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(unitType)
            });

            if(response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to create unit type' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async updateUnitType(buildingID: string, modelID: string, unitType: Partial<UnitTypeData>): Promise<ApiResponse<UnitTypeData>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/unit-types/${modelID}`, {
                method:  'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(unitType)
            });

            if(response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to update unit type' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async deleteUnitType(buildingID: string, modelID: string): Promise<ApiResponse<void>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/unit-types/${modelID}`, {
                method: 'DELETE'
            });

            if(response.ok) {
                return { success: true };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to delete unit type' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }
}
