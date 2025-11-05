import type { UnitData } from '../../types';
import { BaseApiService } from '../services/BaseApiService';

export interface SaveResult {
    success: boolean
    unit?:   UnitData
    error?:  string
}

export interface DeleteResult {
    success: boolean
    error?:  string
}

export class UnitApiClient extends BaseApiService {
    async saveUnit(unit: UnitData, buildingID: string): Promise<SaveResult> {
        const result = await this.put<UnitData>(`/buildings/${buildingID}/units/${unit.unitID}`, unit, {
            errorMessage: 'Failed to save unit'
        });

        return {
            success: result.success,
            unit:    result.data,
            error:   result.error
        };
    }

    async deleteUnit(unitID: string, buildingID: string): Promise<DeleteResult> {
        const result = await this.delete<void>(`/buildings/${buildingID}/units/${unitID}`, {
            errorMessage: 'Failed to delete unit'
        });

        return {
            success: result.success,
            error:   result.error
        };
    }

    async updateUnitField(unitID: string, buildingID: string, fieldName: string, value: unknown): Promise<SaveResult> {
        const result = await this.request<UnitData>(`/buildings/${buildingID}/units/${unitID}/fields/${fieldName}`, {
            method:       'PATCH',
            headers:      { 'Content-Type': 'application/json' },
            body:         JSON.stringify({ value }),
            errorMessage: `Failed to update ${fieldName}`
        });

        return {
            success: result.success,
            unit:    result.data,
            error:   result.error
        };
    }

    async fetchBuildingAmenities(buildingID: string): Promise<unknown[]> {
        const result = await this.get<unknown[]>(`/buildings/${buildingID}/amenities`);
        return result.data ?? [];
    }
}
