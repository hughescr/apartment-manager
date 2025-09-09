import { PetType } from '../../types';
import type { AlpineMagics } from '../alpine-types';
import type {
    ExtendedPetPolicy,
    PetPolicyStateWithMagic,
    PetCostSummary
} from './petPolicyTypes';
import { find, map } from 'lodash';
import {
    PET_TYPE_OPTIONS,
    COMMON_BREED_RESTRICTIONS
} from './petPolicyTypes';
import {
    ensurePetPolicyStructure,
    calculatePetCosts,
    isPetTypeSelected,
    togglePetType,
    isBreedRestricted,
    addBreedRestriction,
    removeBreedRestriction,
    toggleCommonBreed,
    addBreedRestrictionToPetType,
    removeBreedRestrictionFromPetType,
    getAdvancedPetTypesSummary,
    hasAdvancedPetTypes,
    clearPetFields,
    createDefaultPetTypePolicy
} from './petPolicyHelpers';

/**
 * Creates the Alpine.js state object for pet policy management
 */
export function createPetPolicyState(modelName: string): PetPolicyStateWithMagic {
    const state = petPolicyStateObject(modelName);
    return state as PetPolicyStateWithMagic;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Alpine.js requires dynamic typing for proper state management
function petPolicyStateObject(modelName: string): any {
    return {
        // Configuration
        modelName,
        petTypes: PET_TYPE_OPTIONS,
        commonBreeds: COMMON_BREED_RESTRICTIONS,

        // UI State
        showBreedRestrictions: false,
        newBreedRestriction: '',
        showAdvancedSettings: false,

        /**
         * Initialize the component state
         */
        init(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics) {
            // Initialize with default structure if not set
            if(!this[modelName]) {
                this[modelName] = ensurePetPolicyStructure(null);
            } else {
                // Ensure existing data has proper structure
                this[modelName] = ensurePetPolicyStructure(this[modelName]);
            }
        },

        /**
         * Computed property: Are pets allowed?
         */
        get petsAllowed(): boolean {
            return this[modelName]?.allowed || false;
        },

        /**
         * Set whether pets are allowed
         */
        set petsAllowed(value: boolean) {
            if(!this[modelName]) {
                this[modelName] = ensurePetPolicyStructure(null);
            }
            this[modelName].allowed = value;

            // Clear pet-related fields if pets are not allowed
            if(!value) {
                clearPetFields(this[modelName]);
            }
        },

        /**
         * Toggle a pet type selection
         */
        togglePetType(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics, type: PetType) {
            if(!this[modelName]) {
                this[modelName] = ensurePetPolicyStructure(null);
                this[modelName].allowed = true;
            }
            togglePetType(this[modelName], type);
        },

        /**
         * Check if a pet type is selected
         */
        isPetTypeSelected(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics, type: PetType): boolean {
            return isPetTypeSelected(this[modelName], type);
        },

        /**
         * Add a breed restriction
         */
        addBreedRestriction(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics, breed: string) {
            if(!this[modelName]) {
                this[modelName] = ensurePetPolicyStructure(null);
                this[modelName].allowed = true;
            }

            if(addBreedRestriction(this[modelName], breed)) {
                this.newBreedRestriction = '';
            }
        },

        /**
         * Remove a breed restriction by index
         */
        removeBreedRestriction(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics, index: number) {
            if(this[modelName]) {
                removeBreedRestriction(this[modelName], index);
            }
        },

        /**
         * Toggle a common breed restriction
         */
        toggleCommonBreed(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics, breed: string) {
            if(!this[modelName]) {
                this[modelName] = ensurePetPolicyStructure(null);
                this[modelName].allowed = true;
            }
            toggleCommonBreed(this[modelName], breed);
        },

        /**
         * Check if a breed is restricted
         */
        isBreedRestricted(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics, breed: string): boolean {
            return isBreedRestricted(this[modelName], breed);
        },

        /**
         * Computed property: Total pet cost summary
         */
        get totalPetCost(): PetCostSummary {
            if(!this[modelName]) {
                return { upfront: 0, monthly: 0, annual: 0 };
            }
            return calculatePetCosts(this[modelName]);
        },

        /**
         * Add a new pet type policy for advanced settings
         */
        addPetTypePolicy(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics) {
            if(!this[modelName]) {
                this[modelName] = ensurePetPolicyStructure(null);
                this[modelName].allowed = true;
            }

            if(!this[modelName].petTypes) {
                this[modelName].petTypes = [];
            }

            this[modelName].petTypes.push(createDefaultPetTypePolicy());
        },

        /**
         * Remove a pet type policy by index
         */
        removePetTypePolicy(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics, index: number) {
            if(this[modelName]?.petTypes && index >= 0 && index < this[modelName].petTypes.length) {
                this[modelName].petTypes.splice(index, 1);
            }
        },

        /**
         * Add breed restriction to specific pet type
         */
        addBreedRestrictionToPetType(
            this: ReturnType<typeof petPolicyStateObject> & AlpineMagics,
            petTypeIndex: number,
            breed: string
        ) {
            if(this[modelName]) {
                addBreedRestrictionToPetType(this[modelName], petTypeIndex, breed);
            }
        },

        /**
         * Remove breed restriction from specific pet type
         */
        removeBreedRestrictionFromPetType(
            this: ReturnType<typeof petPolicyStateObject> & AlpineMagics,
            petTypeIndex: number,
            breedIndex: number
        ) {
            if(this[modelName]) {
                removeBreedRestrictionFromPetType(this[modelName], petTypeIndex, breedIndex);
            }
        },

        /**
         * Computed property: Does policy have advanced pet types?
         */
        get hasAdvancedPetTypes(): boolean {
            return hasAdvancedPetTypes(this[modelName]);
        },

        /**
         * Computed property: Summary of advanced pet types
         */
        get advancedPetTypesSummary(): string {
            return getAdvancedPetTypesSummary(this[modelName]);
        },

        /**
         * Reset the pet policy to default state
         */
        resetPetPolicy(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics) {
            this[modelName] = ensurePetPolicyStructure(null);
            this.showBreedRestrictions = false;
            this.newBreedRestriction = '';
            this.showAdvancedSettings = false;
        },

        /**
         * Get current policy data for form submission
         */
        getPolicyData(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics): ExtendedPetPolicy {
            return this[modelName] || ensurePetPolicyStructure(null);
        },

        /**
         * Set policy data (for external updates)
         */
        setPolicyData(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics, data: ExtendedPetPolicy) {
            this[modelName] = ensurePetPolicyStructure(data);
        },

        /**
         * Validate current policy
         */
        validatePolicy(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics): boolean {
            const policy = this[modelName];
            if(!policy) {
                return true; // Empty policy is valid if not required
            }

            // Basic validation - pets allowed should have at least one type
            if(policy.allowed && (!policy.types || policy.types.length === 0)) {
                return false;
            }

            return true;
        },

        /**
         * Get policy errors for display
         */
        getPolicyErrors(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics): string[] {
            const policy = this[modelName];
            const errors: string[] = [];

            if(!policy) {
                return errors;
            }

            if(policy.allowed) {
                if(!policy.types || policy.types.length === 0) {
                    errors.push('At least one pet type must be selected when pets are allowed');
                }

                if(policy.maxCount !== undefined && policy.maxCount <= 0) {
                    errors.push('Maximum pet count must be greater than 0');
                }

                if(policy.weightLimit !== undefined && policy.weightLimit <= 0) {
                    errors.push('Weight limit must be greater than 0');
                }

                if(policy.deposit !== undefined && policy.deposit < 0) {
                    errors.push('Pet deposit cannot be negative');
                }

                if(policy.monthlyFee !== undefined && policy.monthlyFee < 0) {
                    errors.push('Monthly pet fee cannot be negative');
                }

                if(policy.oneTimeFee !== undefined && policy.oneTimeFee < 0) {
                    errors.push('One-time pet fee cannot be negative');
                }
            }

            return errors;
        },

        /**
         * Check if policy has any fees configured
         */
        get hasFees(): boolean {
            const policy = this[modelName];
            return !!(policy?.deposit || policy?.monthlyFee || policy?.oneTimeFee);
        },

        /**
         * Check if policy has any restrictions
         */
        get hasRestrictions(): boolean {
            const policy = this[modelName];
            return !!(
                policy?.breedRestrictions?.length ||
                policy?.maxCount ||
                policy?.weightLimit
            );
        },

        /**
         * Get a formatted summary of the pet policy
         */
        getPolicySummary(this: ReturnType<typeof petPolicyStateObject> & AlpineMagics): string {
            const policy = this[modelName];

            if(!policy || !policy.allowed) {
                return 'No pets allowed';
            }

            const parts: string[] = [];

            if(policy.types?.length) {
                const typeLabels = map(policy.types, (type: PetType) => {
                    const option = find(PET_TYPE_OPTIONS, { value: type });
                    return option?.label || type;
                });
                parts.push(`Allowed: ${typeLabels.join(', ')}`);
            }

            if(policy.maxCount) {
                parts.push(`Max: ${policy.maxCount}`);
            }

            if(policy.weightLimit) {
                parts.push(`Weight limit: ${policy.weightLimit}lbs`);
            }

            const costs = calculatePetCosts(policy);
            if(costs.upfront > 0 || costs.monthly > 0) {
                const costParts: string[] = [];
                if(costs.upfront > 0) {
                    costParts.push(`$${costs.upfront} upfront`);
                }
                if(costs.monthly > 0) {
                    costParts.push(`$${costs.monthly}/month`);
                }
                parts.push(costParts.join(', '));
            }

            return parts.join(' • ') || 'Pets allowed';
        }
    };
}

/**
 * Global function for Alpine.js to create pet policy state
 */

// Note: Global window declarations removed as part of centralized Alpine registration
// createPetPolicyState is now registered via alpine-registry.ts
