import type { UnitTypeData } from '../../../types';
import { filter } from 'lodash';
import { BaseApiService, type ApiResponse } from '../../services/BaseApiService';

/**
 * Unit type form API service
 * Handles API calls for unit type operations
 */
export class UnitTypeApiService extends BaseApiService {
    /**
     * Create a new unit type
     */
    async createUnitType(buildingID: string, unitType: Partial<UnitTypeData>): Promise<ApiResponse<void>> {
        // Clean up null values before sending
        const dataToSend = Object.fromEntries(
            filter(Object.entries(unitType), ([_, v]) => v !== null && v !== '')
        );

        return this.post<void>(`/buildings/${buildingID}/unit-types`, dataToSend, {
            errorMessage: 'Failed to create unit type'
        });
    }
}
