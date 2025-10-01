import type { BuildingData, UnitData, UnitType } from '../../../types';
import type { ExtendedUnitData } from '../types';

export interface BulkUpdateData {
    status?:         string
    rent?:           number
    rentUpdateType?: 'absolute' | 'percentage'
    vacancyClass?:   string
}

export interface ApiResponse<T> {
    success: boolean
    data?:   T
    error?:  string
}

export class BuildingApiService {
    constructor(private apiURL: string) {
        // Remove trailing slash if present to avoid double slashes in URLs
        this.apiURL = apiURL.replace(/\/$/, '');
    }

    async saveBuilding(building: BuildingData): Promise<ApiResponse<BuildingData>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${building.buildingID}`, {
                method:  'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(building)
            });

            if(response.ok) {
                // Handle response body - API should always return updated building data
                const responseText = await response.text();
                let data;

                if(responseText.trim()) {
                    try {
                        data = JSON.parse(responseText);
                    } catch{
                        // If JSON parsing fails, return null data
                        data = null;
                    }
                } else {
                    // Empty response body indicates API error - should always return updated data
                    data = null;
                }

                return { success: true, data };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to save building' };
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

    async addUnit(buildingID: string, unit: Partial<UnitData>): Promise<ApiResponse<ExtendedUnitData>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/units`, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(unit)
            });

            if(response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to add unit' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async updateUnit(buildingID: string, unit: ExtendedUnitData): Promise<ApiResponse<ExtendedUnitData>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/units/${unit.unitID}`, {
                method:  'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(unit)
            });

            if(response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to update unit' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async deleteUnit(buildingID: string, unitID: string): Promise<ApiResponse<void>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/units/${unitID}`, {
                method: 'DELETE'
            });

            if(response.ok) {
                return { success: true };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to delete unit' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async bulkUpdateUnits(buildingID: string, unitIDs: string[], updates: BulkUpdateData): Promise<ApiResponse<void>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/units/bulk-update`, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    unitIDs,
                    updates
                })
            });

            if(response.ok) {
                return { success: true };
            } else {
                const error = await response.text();
                return { success: false, error: error || 'Failed to bulk update units' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async updateUnitField(buildingID: string, unitID: string, field: string, value: unknown): Promise<ApiResponse<ExtendedUnitData>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/units/${unitID}/fields/${field}`, {
                method:  'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value })
            });

            if(response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                const error = await response.text();
                return { success: false, error: error || `Failed to update ${field}` };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    // Unit Type Management Methods
    async addUnitType(buildingId: string, unitType: UnitType): Promise<ApiResponse<UnitType>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingId}/unit-types`, {
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
                return { success: false, error: error || 'Failed to add unit type' };
            }
        } catch (error) {
            return {
                success: false,
                error:   error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }

    async updateUnitType(buildingId: string, unitTypeId: string, unitType: Partial<UnitType>): Promise<ApiResponse<UnitType>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingId}/unit-types/${unitTypeId}`, {
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

    async deleteUnitType(buildingId: string, unitTypeId: string): Promise<ApiResponse<void>> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingId}/unit-types/${unitTypeId}`, {
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
