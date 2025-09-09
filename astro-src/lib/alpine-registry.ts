// Centralized Alpine.js component registration
// This file consolidates all Alpine component registrations following best practices
import type { Alpine } from 'alpinejs';

// Import Alpine data functions
import { createBuildingState } from './building/state';
import { createPetPolicyState } from './pet-policy/petPolicyState';
// createUnitTypeFormState is parameterized, handled by component-specific registration
import { createAddBuildingFormState } from './add-building-form/addBuildingFormState';
import { createBuildingManagerState } from './building-manager/buildingManagerState';
import { createBuildingsComponentState } from './buildings-component/buildingsComponentState';
import { createBuildingsListState } from './buildings-list/buildingsListState';
import { createModelAmenitiesManagerState } from './model-amenities-manager/modelAmenitiesManagerState';

/**
 * Centralized Alpine component registration function
 * Called automatically by Astro's Alpine.js integration
 */
function registerAlpineComponents(Alpine: Alpine): void {
    // Register all Alpine data functions
    Alpine.data('buildingStateData', createBuildingState);
    Alpine.data('petPolicyData', createPetPolicyState);
    // unitTypeFormData is parameterized, handled by component-specific registration
    Alpine.data('addBuildingFormData', createAddBuildingFormState);
    Alpine.data('buildingManagerData', createBuildingManagerState);
    Alpine.data('buildingsComponentData', createBuildingsComponentState);
    Alpine.data('buildingsListData', createBuildingsListState);
    Alpine.data('modelAmenitiesManagerData', createModelAmenitiesManagerState);

    // Note: unitCardData is handled by component-specific implementation in unitCardState.ts
    // locationMapData and unitTypeCardData take parameters so require special handling in components
    // toastController is handled separately in Toast.astro

    // eslint-disable-next-line no-console -- registration logging for debugging
    console.log('[alpine-registry] Alpine components registered:', {
        buildingStateData: 'building state management',
        petPolicyData: 'pet policy state',
        unitTypeFormData: 'unit type form state (parameterized, in component)',
        addBuildingFormData: 'add building form state',
        buildingManagerData: 'building manager state',
        buildingsComponentData: 'buildings component state',
        buildingsListData: 'buildings list state',
        modelAmenitiesManagerData: 'model amenities manager state',
        unitCardData: 'unit card state (in unitCardState.ts)',
        locationMapData: 'location map (parameterized, in component)',
        unitTypeCardData: 'unit type card (parameterized, in component)',
        toastController: 'toast controller (separate implementation)'
    });
}

// Export as default for Astro Alpine.js integration
export default registerAlpineComponents;

/**
 * Auto-register components when Alpine is available (fallback for development)
 * This provides backward compatibility while we transition
 */
if(typeof window !== 'undefined') {
    // Check if Alpine is already available and register immediately
    if(window.Alpine) {
        registerAlpineComponents(window.Alpine);
    } else {
        // Otherwise wait for alpine:init event
        document.addEventListener('alpine:init', () => {
            if(window.Alpine) {
                registerAlpineComponents(window.Alpine);
            }
        });
    }
}
