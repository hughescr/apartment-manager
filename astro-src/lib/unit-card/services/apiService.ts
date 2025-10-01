import { isError, trim } from 'lodash';
import type { UnitData, Amenity } from '../../../types';
import type { UnitCardState } from '../unitCardState';
import { UnitApiClient, type SaveResult } from '../apiOperations';

/**
 * Service for handling API operations within the unit card state context
 */
export class ApiService {
    private apiClient: UnitApiClient;

    constructor(private state: UnitCardState) {
        this.apiClient = new UnitApiClient(state.apiURL);
    }

    /**
     * Save the current unit to the server
     */
    async saveUnit(): Promise<void> {
        if(!this.state.unit || !this.isDirty()) {
            return;
        }

        // Validate before saving
        if(!this.validateBeforeSave()) {
            return;
        }

        this.state.saving = true;

        // Trigger saving event
        if(this.state.events) {
            this.state.events.unitSaving(this.state.unit);
        }

        try {
            const result = await this.apiClient.saveUnit(this.state.unit, this.state.unit.buildingID);

            if(result.success && result.unit) {
                // Update both current and original unit on successful save
                this.state.unit = result.unit;
                this.state.originalUnit = JSON.parse(JSON.stringify(this.state.unit));
                this.state.errors = {};

                // Trigger success events
                if(this.state.events) {
                    this.state.events.unitSaved(this.state.unit);
                    this.state.events.showToast('Unit saved successfully', 'success');
                }
            } else {
                this.handleSaveError(result.error || 'Failed to save unit');
            }
        } catch (error) {
            const errorMessage = isError(error) ? error.message : 'Network error. Please try again.';
            this.handleSaveError(errorMessage);
        } finally {
            this.state.saving = false;
        }
    }

    /**
     * Delete the current unit
     */
    async deleteUnit(): Promise<void> {
        if(!this.state.unit) {
            return;
        }

        if(!confirm('Are you sure you want to delete this unit?')) {
            return;
        }

        // Trigger deleting event
        if(this.state.events) {
            this.state.events.unitDeleting(this.state.unit.unitID);
        }

        try {
            const result = await this.apiClient.deleteUnit(this.state.unit.unitID, this.state.unit.buildingID);

            if(result.success) {
                // Trigger success events
                if(this.state.events) {
                    this.state.events.unitDeleted(this.state.unit.unitID);
                    this.state.events.showToast('Unit deleted successfully', 'success');
                }

                // Reload page or redirect after successful deletion
                window.location.reload();
            } else {
                const errorMessage = result.error || 'Failed to delete unit';

                if(this.state.events) {
                    this.state.events.unitDeleteError(this.state.unit.unitID, errorMessage);
                    this.state.events.showToast(errorMessage, 'error');
                }
            }
        } catch (error) {
            const errorMessage = isError(error) ? error.message : 'Network error during delete';

            if(this.state.events) {
                this.state.events.unitDeleteError(this.state.unit.unitID, errorMessage);
                this.state.events.showToast(errorMessage, 'error');
            }
        }
    }

    /**
     * Update a specific field on the server
     */
    async updateUnitField(fieldName: string, value: unknown): Promise<SaveResult> {
        if(!this.state.unit) {
            return { success: false, error: 'No unit to update' };
        }

        try {
            const result = await this.apiClient.updateUnitField(
                this.state.unit.unitID,
                this.state.unit.buildingID,
                fieldName,
                value
            );

            if(result.success && result.unit) {
                // Update current unit with server response
                this.state.unit = result.unit;
                this.state.originalUnit = JSON.parse(JSON.stringify(this.state.unit));

                // Trigger success events
                if(this.state.events) {
                    this.state.events.unitSaving(this.state.unit, fieldName);
                    this.state.events.unitSaved(this.state.unit);
                }
            }

            return result;
        } catch (error) {
            const errorMessage = isError(error) ? error.message : 'Network error occurred';
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Load building amenities for inheritance
     */
    async loadBuildingAmenities(): Promise<void> {
        if(!this.state.unit?.buildingID) {
            this.state.buildingAmenities = [];
            return;
        }

        try {
            const amenities = await this.apiClient.fetchBuildingAmenities(this.state.unit.buildingID);
            this.state.buildingAmenities = amenities as Amenity[];
        } catch{
            this.state.buildingAmenities = [];
        }
    }

    /**
     * Check if unit data has been modified since last save
     */
    private isDirty(): boolean {
        if(!this.state.unit || !this.state.originalUnit) {
            return false;
        }
        return JSON.stringify(this.state.unit) !== JSON.stringify(this.state.originalUnit);
    }

    /**
     * Validate unit before saving
     */
    private validateBeforeSave(): boolean {
        // Use validation service if available
        if(this.state.validationService) {
            return this.state.validationService.validateForm();
        }

        // Fallback: basic validation
        if(!this.state.unit?.unitID || trim(this.state.unit.unitID) === '') {
            this.state.errors.unitID = 'Unit number is required';
            return false;
        }

        return true;
    }

    /**
     * Handle save error by reverting changes and showing error
     */
    private handleSaveError(errorMessage: string): void {
        // Revert to original on save failure
        if(this.state.originalUnit) {
            this.state.unit = JSON.parse(JSON.stringify(this.state.originalUnit));
        }

        this.state.errors.submit = errorMessage;

        // Trigger error events
        if(this.state.events) {
            this.state.events.unitSaveError(this.state.unit, errorMessage);
            this.state.events.showToast(errorMessage, 'error');
        }
    }

    /**
     * Force refresh unit data from server
     */
    async refreshUnit(): Promise<boolean> {
        if(!this.state.unit) {
            return false;
        }

        try {
            // Fetch fresh data using a GET request (assuming we can construct the URL)
            const response = await fetch(`${this.state.apiURL}/buildings/${this.state.unit.buildingID}/units/${this.state.unit.unitID}`);

            if(response.ok) {
                const freshUnit = await response.json();
                this.state.unit = freshUnit;
                this.state.originalUnit = JSON.parse(JSON.stringify(freshUnit));
                this.state.errors = {};

                if(this.state.events) {
                    this.state.events.unitUpdated(this.state.unit);
                }

                return true;
            }

            return false;
        } catch{
            return false;
        }
    }

    /**
     * Check if a save operation is currently in progress
     */
    isSaving(): boolean {
        return this.state.saving;
    }

    /**
     * Get the current API URL
     */
    getApiUrl(): string {
        return this.state.apiURL;
    }

    /**
     * Update the API URL
     */
    setApiUrl(url: string): void {
        this.state.apiURL = url;
        this.apiClient = new UnitApiClient(url);
    }
}
