// Factory function for unitTypeCardData Alpine component
// Extracted from UnitTypeCard.astro for centralized registry

interface AlpineContext {
    $root?:    HTMLElement
    $el?:      HTMLElement
    $dispatch: (event: string, detail: unknown) => void
}

interface DepositObject {
    amount?:                  number
    refundable?:              boolean
    partialRefundPercentage?: number
}

/**
 * Factory function for unitTypeCardData Alpine component
 *
 * Creates an Alpine.js component for managing unit type cards with editing capabilities.
 * This factory function replaces the inline component definition in UnitTypeCard.astro
 * and supports the centralized Alpine.js registration pattern.
 *
 * @returns Alpine.js component object with unit type management functionality
 *
 * @description
 * The component extracts configuration from HTML data attributes:
 * - `data-unit-type`: JSON-serialized unit type object
 * - `data-building-amenities`: JSON-serialized array of building amenities
 * - `data-api-url`: Base API URL for making requests
 *
 * Features:
 * - Unit type editing with dirty state tracking
 * - Amenities management (inherited vs custom)
 * - Deposit handling (simple amount or enhanced object with refund settings)
 * - Save/delete operations with error handling
 * - Currency and date formatting utilities
 *
 * @example
 * ```html
 * <div
 *   x-data="unitTypeCardData"
 *   data-unit-type={JSON.stringify(unitType)}
 *   data-building-amenities={JSON.stringify(buildingAmenities)}
 *   data-api-url={apiURL}
 * >
 * ```
 */
export function createUnitTypeCardFactory(this: AlpineContext) {
    // Extract config from data attributes on the component element
    const element = this.$root || this.$el;

    // Safely parse JSON with fallbacks for malformed data
    let unitType = {} as Record<string, unknown>;
    try {
        unitType = JSON.parse(element?.dataset?.unitType || '{}');
    } catch{
        unitType = {};
    }

    let buildingAmenities = [] as unknown[];
    try {
        buildingAmenities = JSON.parse(element?.dataset?.buildingAmenities || '[]');
    } catch{
        buildingAmenities = [];
    }
    const apiURL = element?.dataset?.apiUrl || '';

    return {
        unitType:          unitType,
        originalUnitType:  JSON.parse(JSON.stringify(unitType)), // Deep copy for original state
        apiURL:            apiURL,
        saving:            false,
        expandedAmenities: false,
        buildingAmenities: buildingAmenities || [], // Use passed building amenities

        init() {
            // Initialize enhanced deposit structure
            this.initializeDeposit();
        },

        getEffectiveAmenities() {
            // If floorplan has amenities defined, use them (override)
            if(this.unitType.modelAmenities && (this.unitType.modelAmenities as unknown[]).length > 0) {
                return this.unitType.modelAmenities;
            }
            // Otherwise, use building amenities if available
            if(this.buildingAmenities && this.buildingAmenities.length > 0) {
                return this.buildingAmenities;
            }
            return [];
        },

        resetToInheritedAmenities() {
            if(confirm('This will reset floorplan amenities to match the building amenities. Continue?')) {
                this.unitType.modelAmenities = [];
            }
        },

        isDirty() {
            return JSON.stringify(this.unitType) !== JSON.stringify(this.originalUnitType);
        },

        async saveUnitType(myThis?: typeof this) {
            const context = myThis || this;
            if(!context.isDirty()) {
                return;
            }

            this.saving = true;
            try {
                const response = await fetch(context.apiURL + 'buildings/' + context.unitType.buildingID + '/unit-types/' + context.unitType.modelID, {
                    method:  'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(context.unitType),
                });
                if(response.ok) {
                    context.originalUnitType = { ...context.unitType };
                } else {
                    // Revert to original value on save failure
                    context.unitType = { ...context.originalUnitType };
                }
            } catch{
                // Revert to original value on network error
                context.unitType = { ...context.originalUnitType };
            } finally {
                context.saving = false;
            }
        },

        async deleteUnitType() {
            // Dispatch event to parent BuildingProvider to handle deletion
            // The parent has proper state management and will update the UI correctly
            // Access $dispatch through the Alpine context
            const alpineThis = this as unknown as AlpineContext;
            alpineThis.$dispatch('delete-unit-type', {
                modelID: this.unitType.modelID
            });
        },

        formatCurrency(value: number) {
            if(!value) {
                return '';
            }
            return new Intl.NumberFormat('en-US', {
                style:                 'currency',
                currency:              'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
        },

        formatDate(dateString: string) {
            if(!dateString) {
                return 'Not set';
            }
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year:  'numeric',
                month: 'short',
                day:   'numeric'
            });
        },

        // Deposit handling functions
        initializeDeposit() {
            // Convert legacy number deposits to enhanced object format
            if(typeof this.unitType.deposit === 'number' && !isNaN(this.unitType.deposit)) {
                this.unitType.deposit = {
                    amount:     this.unitType.deposit,
                    refundable: true
                };
            }
            // Initialize empty deposit object if not present
            if(!this.unitType.deposit) {
                this.unitType.deposit = null;
            }
        },

        getDepositAmount() {
            if(!this.unitType.deposit) {
                return null;
            }
            if(typeof this.unitType.deposit === 'number' && !isNaN(this.unitType.deposit)) {
                return this.unitType.deposit;
            }
            return (this.unitType.deposit as DepositObject).amount;
        },

        setDepositAmount(value: string) {
            if(!value || value === '') {
                this.unitType.deposit = null;
                return;
            }

            const amount = parseFloat(value);
            if(isNaN(amount) || amount < 0) {
                return;
            }

            if(!this.unitType.deposit) {
                this.unitType.deposit = {
                    amount:     amount,
                    refundable: true
                };
            } else if(typeof this.unitType.deposit === 'number' && !isNaN(this.unitType.deposit)) {
                this.unitType.deposit = {
                    amount:     amount,
                    refundable: true
                };
            } else {
                (this.unitType.deposit as DepositObject).amount = amount;
            }
        },

        getDepositRefundable() {
            if(!this.unitType.deposit) {
                return true;
            }
            if(typeof this.unitType.deposit === 'number' && !isNaN(this.unitType.deposit)) {
                return true;
            }
            return (this.unitType.deposit as DepositObject).refundable;
        },

        setDepositRefundable(value: boolean) {
            if(!this.unitType.deposit || (typeof this.unitType.deposit === 'number' && !isNaN(this.unitType.deposit))) {
                return;
            }
            (this.unitType.deposit as DepositObject).refundable = value;
            if(value) {
                // Clear partial refund percentage when fully refundable
                (this.unitType.deposit as DepositObject).partialRefundPercentage = undefined;
            }
        },

        getDepositPartialRefundPercentage() {
            if(!this.unitType.deposit || (typeof this.unitType.deposit === 'number' && !isNaN(this.unitType.deposit))) {
                return null;
            }
            return (this.unitType.deposit as DepositObject).partialRefundPercentage;
        },

        setDepositPartialRefundPercentage(value: string) {
            if(!this.unitType.deposit || (typeof this.unitType.deposit === 'number' && !isNaN(this.unitType.deposit))) {
                return;
            }
            const percentage = parseFloat(value);
            if(isNaN(percentage) || percentage < 0 || percentage > 100) {
                return;
            }
            (this.unitType.deposit as DepositObject).partialRefundPercentage = percentage;
        }
    };
}
