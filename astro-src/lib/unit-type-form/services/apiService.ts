import type { UnitTypeData } from '../../../types';
import { filter } from 'lodash';

/**
 * Unit type form API service
 * Handles API calls for unit type operations
 */
export class UnitTypeApiService {
    /**
     * Create a new unit type
     */
    static async createUnitType(apiURL: string, buildingID: string, unitType: Partial<UnitTypeData>): Promise<{ success: boolean, error?: string }> {
        try {
            // Clean up null values before sending
            const dataToSend = Object.fromEntries(
                filter(Object.entries(unitType), ([_, v]) => v !== null && v !== '')
            );

            const response = await fetch(apiURL + 'buildings/' + buildingID + '/unit-types', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(dataToSend),
            });

            if(response.ok) {
                return { success: true };
            } else {
                const data: unknown = await response.json();
                const errorData = data as { error?: string };
                return {
                    success: false,
                    error:   errorData.error ?? 'Failed to create unit type'
                };
            }
        } catch{
            return {
                success: false,
                error:   'Network error. Please try again.'
            };
        }
    }
}
