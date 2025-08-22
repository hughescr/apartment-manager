import type { BuildingData } from '../../../types';
import type { AlpineMagicProperties } from '../../alpine';
import { BuildingDataParser } from './dataParser';
import { BuildingApiService } from '../services/buildingApiService';
import { validateBuildingForm, hasUnsavedChanges } from '../validation';
import { isError, keys } from 'lodash';

export interface BuildingCoreState {
    building: BuildingData | null
    original: BuildingData | null
    apiURL: string
    saving: boolean
    showSave: boolean
    lastSaveSuccess: boolean
    errors: Record<string, string>
    expandedRentSpecials: Record<string, boolean>
}

/**
 * Core building management functionality
 * Handles building initialization, CRUD operations, and state management
 */
export class BuildingCore {
    private apiService: BuildingApiService | null = null;
    private suspendWatcher = false; // Flag to temporarily disable change detection
    private initTimeoutId: ReturnType<typeof setTimeout> | null = null; // Timeout ID for cleanup

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
        // Only set original if building data is actually loaded
        if(this.state.building) {
            this.state.original = JSON.parse(JSON.stringify(this.state.building));
            // Initialize expanded state for existing rent specials
            this.initializeRentSpecialStates();
        }
    }

    /**
     * Initialize expanded state for existing rent specials
     * Call this when building data is loaded to set up collapse states
     */
    private initializeRentSpecialStates(): void {
        if(this.state.building?.rentSpecials) {
            // Initialize expanded state for all existing rent specials (default to collapsed)
            this.state.building.rentSpecials.forEach((special) => {
                if(special.id && !(special.id in this.state.expandedRentSpecials)) {
                    this.state.expandedRentSpecials[special.id] = false;
                }
            });
        }
    }

    /**
     * Setup watchers for building state changes
     */
    setupBuildingWatchers(): void {
        // Watch for building changes to update showSave
        // Use a flag to prevent triggering during initial setup
        let initialSetupComplete = false;

        this.state.$watch('building', (value: BuildingData | null) => {
            // Only check for unsaved changes after initial setup is complete and watcher is not suspended
            if(initialSetupComplete && this.state.original && !this.suspendWatcher) {
                this.state.showSave = hasUnsavedChanges(this.state.building, this.state.original);
            }
            if(value) {
                this.state.$dispatch('building:updated', { building: value });
            }
        }, { deep: true });
        // Mark initial setup as complete after a short delay to allow for data loading
        this.state.$nextTick(() => {
            this.initTimeoutId = (typeof window !== 'undefined' ? window.setTimeout : setTimeout)(() => {
                initialSetupComplete = true;
                // If original hasn't been set yet but building has data, set it now
                if(!this.state.original && this.state.building) {
                    this.state.original = JSON.parse(JSON.stringify(this.state.building));
                }
                // Clear the timeout ID since it's completed
                this.initTimeoutId = null;
            }, 100);
        });
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
            const responseData = result.data ? { ...result.data } as Record<string, unknown> : null;
            const warnings = responseData?._validationWarnings as Record<string, string> | undefined;

            // Use the response data as the source of truth, not merge it with existing state
            let savedBuilding: BuildingData;
            if(responseData) {
                // Remove the _validationWarnings from the saved data
                delete (responseData as { _validationWarnings?: unknown })._validationWarnings;
                // Use the response data directly as it contains the complete saved building
                savedBuilding = responseData as unknown as BuildingData;
            } else {
                // No response data indicates potential API issue
                // Use current building state as fallback, but this means changes might not be persisted
                savedBuilding = { ...this.state.building };
            }

            // Suspend watcher temporarily to avoid triggering change detection during state sync
            this.suspendWatcher = true;

            // Update both building and original state atomically
            this.state.building = savedBuilding;
            this.state.original = JSON.parse(JSON.stringify(savedBuilding));
            this.state.showSave = false;

            // Re-enable watcher and dispatch reset event
            this.state.$nextTick(() => {
                this.suspendWatcher = false;
                this.state.$dispatch('building:state-reset', {
                    building: this.state.building,
                    original: this.state.original
                });
            });

            // Show success indicator and auto-hide after 3 seconds
            this.state.lastSaveSuccess = true;
            setTimeout(() => {
                this.state.lastSaveSuccess = false;
            }, 3000);

            // Show appropriate success message based on warnings
            if(warnings && keys(warnings).length > 0) {
                const warningCount = keys(warnings).length;
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
     * Update original state when data is loaded dynamically
     * This is called when building data is loaded from the server
     */
    updateOriginalState(building: BuildingData): void {
        this.state.original = JSON.parse(JSON.stringify(building));
        this.state.showSave = false;
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

    /**
     * Add a new rent special
     */
    addRentSpecial(): void {
        if(!this.state.building) {
            return;
        }

        // Initialize rentSpecials array if it doesn't exist
        if(!this.state.building.rentSpecials) {
            this.state.building.rentSpecials = [];
        }

        // Add new rent special with unique ID
        const newSpecial = {
            id: Date.now() + Math.random(),
            title: '',
            description: '',
            startDate: '',
            endDate: ''
        };
        this.state.building.rentSpecials.push(newSpecial);

        // Initialize expanded state for the new rent special (default to expanded for editing)
        this.state.expandedRentSpecials[newSpecial.id] = true;
    }

    /**
     * Remove a rent special by index
     */
    removeRentSpecial(index: number): void {
        if(!this.state.building?.rentSpecials) {
            return;
        }

        // Get the rent special being removed to clean up its expanded state
        const removedSpecial = this.state.building.rentSpecials[index];
        if(removedSpecial?.id) {
            delete this.state.expandedRentSpecials[removedSpecial.id];
        }

        this.state.building.rentSpecials.splice(index, 1);
    }

    /**
     * Cleanup method to prevent memory leaks
     * Should be called when the component is destroyed
     */
    destroy(): void {
        // Clear any pending initialization timeout
        if(this.initTimeoutId !== null) {
            (typeof window !== 'undefined' ? window.clearTimeout : clearTimeout)(this.initTimeoutId);
            this.initTimeoutId = null;
        }
    }
}
