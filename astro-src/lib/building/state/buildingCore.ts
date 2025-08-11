import type { BuildingData } from '../../../types';
import type { AlpineMagicProperties } from '../../alpine';
import { BuildingDataParser } from './dataParser';
import { BuildingApiService } from '../services/buildingApiService';
import { validateBuildingForm, hasUnsavedChanges } from '../validation';
import { isError } from 'lodash';

export interface BuildingCoreState {
    building: BuildingData | null
    original: BuildingData | null
    apiURL: string
    saving: boolean
    showSave: boolean
    errors: Record<string, string>
}

/**
 * Core building management functionality
 * Handles building initialization, CRUD operations, and state management
 */
export class BuildingCore {
    private apiService: BuildingApiService | null = null;

    constructor(private state: BuildingCoreState & AlpineMagicProperties) {}

    /**
     * Initialize building data from HTML dataset
     */
    initializeBuildingData(element: HTMLElement): void {
        // Parse building data
        this.state.building = BuildingDataParser.parseBuildingData(element);

        // Parse API URL
        this.state.apiURL = BuildingDataParser.parseApiUrl(element);

        // Initialize API service
        if(this.state.apiURL) {
            this.apiService = new BuildingApiService(this.state.apiURL);
        }

        // Store original state for change detection
        this.state.original = this.state.building ?
            JSON.parse(JSON.stringify(this.state.building))
            : null;
    }

    /**
     * Setup watchers for building state changes
     */
    setupBuildingWatchers(): void {
        // Watch for building changes to update showSave
        this.state.$watch('building', (value: BuildingData | null) => {
            this.state.showSave = hasUnsavedChanges(this.state.building, this.state.original);
            if(value) {
                this.state.$dispatch('building:updated', { building: value });
            }
        }, { deep: true });
    }

    /**
     * Validate the current building form state
     */
    validateBuildingForm(): boolean {
        const result = validateBuildingForm(this.state.building);
        this.state.errors = result.errors;

        this.state.$dispatch('building:validate', {
            isValid: result.isValid,
            errors: result.errors
        });

        return result.isValid;
    }

    /**
     * Save building changes
     */
    async saveBuildingData(): Promise<void> {
        // Remove validation check - we now allow saving with warnings
        if(!this.state.building || !this.apiService) {
            return;
        }

        this.state.saving = true;
        try {
            const result = await this.apiService.saveBuilding(this.state.building);

            if(!result.success) {
                throw new Error(result.error || 'Failed to save building');
            }

            // Check if response has validation warnings
            const responseData = result.data as Record<string, unknown>;
            const warnings = responseData?._validationWarnings as Record<string, string>;

            // Update original state with the saved data (minus warnings)
            const savedBuilding = { ...this.state.building };
            if(responseData) {
                // Remove the _validationWarnings from the saved data
                delete (responseData as { _validationWarnings?: unknown })._validationWarnings;
                Object.assign(savedBuilding, responseData);
            }

            this.state.original = JSON.parse(JSON.stringify(savedBuilding));
            this.state.building = savedBuilding;
            this.state.showSave = false;

            // Show appropriate success message based on warnings
            if(warnings && Object.keys(warnings).length > 0) {
                const warningCount = Object.keys(warnings).length;
                this.state.$dispatch('toast:show', {
                    message: `Building saved with ${warningCount} warning${warningCount > 1 ? 's' : ''}. Complete all fields to publish.`,
                    type: 'warning'
                });
            } else {
                this.state.$dispatch('toast:show', {
                    message: 'Building saved successfully',
                    type: 'success'
                });
            }

            this.state.$dispatch('photos:updated', {
                photos: this.state.building.photos || []
            });

            this.state.$dispatch('building:reset', {
                building: this.state.building
            });
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: 'Failed to save building: ' + (isError(error) ? error.message : 'Unknown error'),
                type: 'error'
            });
        } finally {
            this.state.saving = false;
        }
    }

    /**
     * Delete building
     */
    async deleteBuildingData(): Promise<void> {
        if(!this.state.building || !this.apiService) {
            return;
        }

        if(!confirm('Are you sure you want to delete this building?')) {
            return;
        }

        try {
            const result = await this.apiService.deleteBuilding(this.state.building.buildingID);

            if(!result.success) {
                throw new Error(result.error || 'Failed to delete building');
            }

            this.state.$dispatch('toast:show', {
                message: 'Building deleted successfully',
                type: 'success'
            });

            // Redirect to buildings list
            window.location.href = '/';
        } catch(error) {
            this.state.$dispatch('toast:show', {
                message: 'Failed to delete building: ' + (isError(error) ? error.message : 'Unknown error'),
                type: 'error'
            });
        }
    }

    /**
     * Undo changes and restore original state
     */
    undoBuildingChanges(): void {
        if(this.state.original) {
            this.state.building = JSON.parse(JSON.stringify(this.state.original));
            this.state.showSave = false;
            this.state.$dispatch('building:reset', { building: this.state.building });
        }
    }

    /**
     * Update a specific field in the building data
     */
    updateBuildingField(field: keyof BuildingData, value: unknown): void {
        if(this.state.building) {
            (this.state.building as Record<keyof BuildingData, unknown>)[field] = value;
        }
    }

    /**
     * Get building data
     */
    getBuildingData(): BuildingData | null {
        return this.state.building;
    }

    /**
     * Check if building has unsaved changes
     */
    hasUnsavedChanges(): boolean {
        return hasUnsavedChanges(this.state.building, this.state.original);
    }
}
