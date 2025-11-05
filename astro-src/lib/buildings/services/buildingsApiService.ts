import type { BuildingData } from '../../../types';
import { BaseApiService, type ApiResponse } from '../../services/BaseApiService';

export class BuildingsApiService extends BaseApiService {
    async getBuildings(): Promise<ApiResponse<BuildingData[]>> {
        return this.get<BuildingData[]>('/buildings', {
            errorMessage: 'Failed to load buildings'
        });
    }

    async getBuilding(buildingID: string): Promise<ApiResponse<BuildingData>> {
        return this.get<BuildingData>(`/buildings/${buildingID}`, {
            errorMessage: 'Failed to load building'
        });
    }

    async createBuilding(building: Partial<BuildingData>): Promise<ApiResponse<BuildingData>> {
        return this.post<BuildingData>('/buildings', building, {
            errorMessage: 'Failed to create building'
        });
    }

    async updateBuilding(buildingID: string, building: Partial<BuildingData>): Promise<ApiResponse<BuildingData>> {
        return this.put<BuildingData>(`/buildings/${buildingID}`, building, {
            errorMessage: 'Failed to update building'
        });
    }

    async deleteBuilding(buildingID: string): Promise<ApiResponse<void>> {
        return this.delete<void>(`/buildings/${buildingID}`, {
            errorMessage: 'Failed to delete building'
        });
    }
}
