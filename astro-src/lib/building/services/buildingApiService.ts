import type { BuildingData, UnitData, UnitType } from '../../../types';
import type { ExtendedUnitData } from '../types';
import { BaseApiService, type ApiResponse } from '../../services/BaseApiService';

export interface BulkUpdateData {
    status?:         string
    rent?:           number
    rentUpdateType?: 'absolute' | 'percentage'
    vacancyClass?:   string
}

export class BuildingApiService extends BaseApiService {
    async saveBuilding(building: BuildingData): Promise<ApiResponse<BuildingData>> {
        return this.put<BuildingData>(`/buildings/${building.buildingID}`, building, {
            errorMessage: 'Failed to save building'
        });
    }

    async deleteBuilding(buildingID: string): Promise<ApiResponse<void>> {
        return this.delete<void>(`/buildings/${buildingID}`, {
            errorMessage: 'Failed to delete building'
        });
    }

    async addUnit(buildingID: string, unit: Partial<UnitData>): Promise<ApiResponse<ExtendedUnitData>> {
        return this.post<ExtendedUnitData>(`/buildings/${buildingID}/units`, unit, {
            errorMessage: 'Failed to add unit'
        });
    }

    async updateUnit(buildingID: string, unit: ExtendedUnitData): Promise<ApiResponse<ExtendedUnitData>> {
        return this.put<ExtendedUnitData>(`/buildings/${buildingID}/units/${unit.unitID}`, unit, {
            errorMessage: 'Failed to update unit'
        });
    }

    async deleteUnit(buildingID: string, unitID: string): Promise<ApiResponse<void>> {
        return this.delete<void>(`/buildings/${buildingID}/units/${unitID}`, {
            errorMessage: 'Failed to delete unit'
        });
    }

    async bulkUpdateUnits(buildingID: string, unitIDs: string[], updates: BulkUpdateData): Promise<ApiResponse<void>> {
        return this.post<void>(`/buildings/${buildingID}/units/bulk-update`, { unitIDs, updates }, {
            errorMessage: 'Failed to bulk update units'
        });
    }

    async updateUnitField(buildingID: string, unitID: string, field: string, value: unknown): Promise<ApiResponse<ExtendedUnitData>> {
        return this.request<ExtendedUnitData>(`/buildings/${buildingID}/units/${unitID}/fields/${field}`, {
            method:       'PATCH',
            headers:      { 'Content-Type': 'application/json' },
            body:         JSON.stringify({ value }),
            errorMessage: `Failed to update ${field}`
        });
    }

    // Unit Type Management Methods
    async addUnitType(buildingId: string, unitType: UnitType): Promise<ApiResponse<UnitType>> {
        return this.post<UnitType>(`/buildings/${buildingId}/unit-types`, unitType, {
            errorMessage: 'Failed to add unit type'
        });
    }

    async updateUnitType(buildingId: string, unitTypeId: string, unitType: Partial<UnitType>): Promise<ApiResponse<UnitType>> {
        return this.put<UnitType>(`/buildings/${buildingId}/unit-types/${unitTypeId}`, unitType, {
            errorMessage: 'Failed to update unit type'
        });
    }

    async deleteUnitType(buildingId: string, unitTypeId: string): Promise<ApiResponse<void>> {
        return this.delete<void>(`/buildings/${buildingId}/unit-types/${unitTypeId}`, {
            errorMessage: 'Failed to delete unit type'
        });
    }
}
