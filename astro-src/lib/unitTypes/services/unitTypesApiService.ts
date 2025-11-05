import type { UnitTypeData } from '../../../types';
import { BaseApiService, type ApiResponse } from '../../services/BaseApiService';

export class UnitTypesApiService extends BaseApiService {
    async getUnitTypes(buildingID: string): Promise<ApiResponse<UnitTypeData[]>> {
        return this.get<UnitTypeData[]>(`/buildings/${buildingID}/unit-types`, {
            errorMessage: 'Failed to load unit types'
        });
    }

    async getUnitType(buildingID: string, modelID: string): Promise<ApiResponse<UnitTypeData>> {
        return this.get<UnitTypeData>(`/buildings/${buildingID}/unit-types/${modelID}`, {
            errorMessage: 'Failed to load unit type'
        });
    }

    async createUnitType(unitType: Partial<UnitTypeData>): Promise<ApiResponse<UnitTypeData>> {
        return this.post<UnitTypeData>(`/buildings/${unitType.buildingID}/unit-types`, unitType, {
            errorMessage: 'Failed to create unit type'
        });
    }

    async updateUnitType(buildingID: string, modelID: string, unitType: Partial<UnitTypeData>): Promise<ApiResponse<UnitTypeData>> {
        return this.put<UnitTypeData>(`/buildings/${buildingID}/unit-types/${modelID}`, unitType, {
            errorMessage: 'Failed to update unit type'
        });
    }

    async deleteUnitType(buildingID: string, modelID: string): Promise<ApiResponse<void>> {
        return this.delete<void>(`/buildings/${buildingID}/unit-types/${modelID}`, {
            errorMessage: 'Failed to delete unit type'
        });
    }
}
