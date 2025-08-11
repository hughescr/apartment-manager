import type { UnitTypeData } from '../../../types';
import { UnitTypeValidationService, UnitTypeApiService, type ValidationErrors } from '../services';

export interface UnitTypeFormState {
    apiURL: string
    buildingID: string
    saving: boolean
    showForm: boolean
    errors: ValidationErrors
    unitType: Partial<UnitTypeData>
}

/**
 * Create unit type form state
 * This function will be called by Alpine.js
 */
export function createUnitTypeFormState(apiURL: string, buildingID: string) {
    return {
        apiURL,
        buildingID,
        saving: false,
        showForm: false,
        errors: {} as ValidationErrors,

        unitType: {
            buildingID: buildingID,
            modelID: '',
            modelName: '',
            countAvailable: undefined,
            dateAvailable: '',
            beds: 1,
            baths: 1,
            maxOccupants: undefined,
            minRent: undefined,
            maxRent: undefined,
            perPersonRent: undefined,
            minSqft: undefined,
            maxSqft: undefined,
            deposit: undefined,
            minLeaseTerm: undefined,
            maxLeaseTerm: undefined,
            modelAmenities: []
        },

        resetForm() {
            this.unitType = {
                buildingID: this.buildingID,
                modelID: '',
                modelName: '',
                countAvailable: undefined,
                dateAvailable: '',
                beds: 1,
                baths: 1,
                maxOccupants: undefined,
                minRent: undefined,
                maxRent: undefined,
                perPersonRent: undefined,
                minSqft: undefined,
                maxSqft: undefined,
                deposit: undefined,
                minLeaseTerm: undefined,
                maxLeaseTerm: undefined,
                modelAmenities: []
            };
            this.errors = {} as ValidationErrors;
        },

        validateForm() {
            this.errors = UnitTypeValidationService.validateForm(this.unitType);
            return UnitTypeValidationService.isValid(this.errors);
        },

        async saveUnitType() {
            if(!this.validateForm()) {
                return;
            }

            this.saving = true;
            try {
                const result = await UnitTypeApiService.createUnitType(
                    this.apiURL,
                    this.buildingID,
                    this.unitType
                );

                if(result.success) {
                    this.resetForm();
                    this.showForm = false;
                    if(window.unitTypeFormOnSuccess) {
                        window.unitTypeFormOnSuccess();
                    } else {
                        window.location.reload();
                    }
                } else {
                    this.errors.submit = result.error || 'Failed to create unit type';
                }
            } catch{
                this.errors.submit = 'An unexpected error occurred. Please try again.';
            } finally {
                this.saving = false;
            }
        },

        toggleForm() {
            this.showForm = !this.showForm;
            if(!this.showForm) {
                this.resetForm();
            }
        }
    };
}
