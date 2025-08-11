import _ from 'lodash';
import type { UnitData } from '../../types';

export interface SaveResult {
    success: boolean
    unit?: UnitData
    error?: string
}

export interface DeleteResult {
    success: boolean
    error?: string
}

export class UnitApiClient {
    constructor(private apiURL: string) {}

    async saveUnit(unit: UnitData, buildingID: string): Promise<SaveResult> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/units/${unit.unitID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(unit)
            });

            if(response.ok) {
                const updatedUnit = await response.json();
                return {
                    success: true,
                    unit: updatedUnit
                };
            } else {
                const errorText = await response.text();
                return {
                    success: false,
                    error: errorText || 'Failed to save unit'
                };
            }
        } catch(error) {
            return {
                success: false,
                error: _.isError(error) ? error.message : 'Network error occurred'
            };
        }
    }

    async deleteUnit(unitID: string, buildingID: string): Promise<DeleteResult> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/units/${unitID}`, {
                method: 'DELETE'
            });

            if(response.ok) {
                return {
                    success: true
                };
            } else {
                const errorText = await response.text();
                return {
                    success: false,
                    error: errorText || 'Failed to delete unit'
                };
            }
        } catch(error) {
            return {
                success: false,
                error: _.isError(error) ? error.message : 'Network error occurred'
            };
        }
    }

    async updateUnitField(unitID: string, buildingID: string, fieldName: string, value: unknown): Promise<SaveResult> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/units/${unitID}/fields/${fieldName}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value })
            });

            if(response.ok) {
                const updatedUnit = await response.json();
                return {
                    success: true,
                    unit: updatedUnit
                };
            } else {
                const errorText = await response.text();
                return {
                    success: false,
                    error: errorText || `Failed to update ${fieldName}`
                };
            }
        } catch(error) {
            return {
                success: false,
                error: _.isError(error) ? error.message : 'Network error occurred'
            };
        }
    }

    async fetchBuildingAmenities(buildingID: string): Promise<unknown[]> {
        try {
            const response = await fetch(`${this.apiURL}/buildings/${buildingID}/amenities`);
            if(response.ok) {
                return await response.json();
            }
            return [];
        } catch{
            return [];
        }
    }
}
