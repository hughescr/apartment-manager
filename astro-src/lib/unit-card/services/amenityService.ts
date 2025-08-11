import _ from 'lodash';
import type { Amenity } from '../../../types';
import type { UnitCardState } from '../unitCardState';
import { AmenityInheritanceManager, type AmenityInheritanceSource } from '../amenityInheritance';

/**
 * Service for handling amenity inheritance logic within the unit card state context
 */
export class AmenityService {
    private amenityManager: AmenityInheritanceManager;

    constructor(private state: UnitCardState) {
        this.amenityManager = new AmenityInheritanceManager();
    }

    /**
     * Get the effective amenities for the current unit
     */
    getEffectiveAmenities(): Amenity[] {
        if(!this.state.unit) {
            return [];
        }

        return this.amenityManager.getEffectiveAmenities(
            this.state.unit,
            this.state.selectedUnitType,
            this.state.buildingAmenities
        );
    }

    /**
     * Get the inheritance source for amenities
     */
    getAmenityInheritanceSource(): AmenityInheritanceSource {
        if(!this.state.unit) {
            return 'none';
        }

        return this.amenityManager.getAmenityInheritanceSource(
            this.state.unit,
            this.state.selectedUnitType,
            this.state.buildingAmenities
        );
    }

    /**
     * Reset amenities to inherited values (clear unit-specific amenities)
     */
    resetToInheritedAmenities(): void {
        if(!this.state.unit) {
            return;
        }

        const source = this.getAmenityInheritanceSource();
        let message = 'This will remove unit-specific amenities. ';

        if(source === 'floorplan' || (this.state.selectedUnitType?.modelAmenities?.length ?? 0) > 0) {
            message += 'The unit will inherit amenities from its floorplan.';
        } else if(this.state.buildingAmenities.length > 0) {
            message += 'The unit will inherit amenities from the building.';
        } else {
            message += 'The unit will have no amenities.';
        }

        if(confirm(message + ' Continue?')) {
            this.amenityManager.resetToInheritedAmenities(this.state.unit);

            // Trigger events if available
            if(this.state.events) {
                this.state.events.amenitiesReset(this.state.unit);
            }
        }
    }

    /**
     * Check if unit has unit-specific amenities
     */
    hasUnitSpecificAmenities(): boolean {
        if(!this.state.unit) {
            return false;
        }

        return this.amenityManager.hasUnitSpecificAmenities(this.state.unit);
    }

    /**
     * Get display label for the inheritance source
     */
    getInheritanceLabel(): string {
        const source = this.getAmenityInheritanceSource();
        return this.amenityManager.getInheritanceLabel(source);
    }

    /**
     * Get CSS badge class for the inheritance source
     */
    getInheritanceBadgeClass(): string {
        const source = this.getAmenityInheritanceSource();
        return this.amenityManager.getInheritanceBadgeClass(source);
    }

    /**
     * Compare two amenity arrays for equality
     */
    amenitiesEqual(amenities1: Amenity[], amenities2: Amenity[]): boolean {
        return this.amenityManager.amenitiesEqual(amenities1, amenities2);
    }

    /**
     * Get amenities grouped by category
     */
    getAmenitiesByCategory(amenities?: Amenity[]): Map<string, string[]> {
        const effectiveAmenities = amenities || this.getEffectiveAmenities();
        return this.amenityManager.getAmenitiesByCategory(effectiveAmenities);
    }

    /**
     * Get the count of effective amenities
     */
    getAmenityCount(): number {
        const amenities = this.getEffectiveAmenities();
        return this.amenityManager.getAmenityCount(amenities);
    }

    /**
     * Get unique categories from effective amenities
     */
    getUniqueCategories(): string[] {
        const amenities = this.getEffectiveAmenities();
        return this.amenityManager.getUniqueCategories(amenities);
    }

    /**
     * Set unit-specific amenities
     */
    setUnitAmenities(amenities: Amenity[]): void {
        if(!this.state.unit) {
            return;
        }

        this.state.unit.unitAmenities = amenities;

        // Trigger generic unit updated event
        if(this.state.events) {
            this.state.events.unitUpdated(this.state.unit);
        }
    }

    /**
     * Add an amenity to the unit-specific amenities
     */
    addUnitAmenity(amenity: Amenity): void {
        if(!this.state.unit) {
            return;
        }

        if(!this.state.unit.unitAmenities) {
            this.state.unit.unitAmenities = [];
        }

        // Check if amenity already exists
        const exists = _.some(this.state.unit.unitAmenities,
            { category: amenity.category, name: amenity.name }
        );

        if(!exists) {
            this.state.unit.unitAmenities.push(amenity);

            // Trigger generic unit updated event
            if(this.state.events) {
                this.state.events.unitUpdated(this.state.unit);
            }
        }
    }

    /**
     * Remove an amenity from unit-specific amenities
     */
    removeUnitAmenity(amenity: Amenity): void {
        if(!this.state.unit || !this.state.unit.unitAmenities) {
            return;
        }

        this.state.unit.unitAmenities = _.filter(this.state.unit.unitAmenities,
            a => !(a.category === amenity.category && a.name === amenity.name)
        );

        // Trigger generic unit updated event
        if(this.state.events) {
            this.state.events.unitUpdated(this.state.unit);
        }
    }

    /**
     * Get amenities that are inherited (not unit-specific)
     */
    getInheritedAmenities(): Amenity[] {
        if(!this.state.unit) {
            return [];
        }

        // If unit has specific amenities, return empty array
        if(this.hasUnitSpecificAmenities()) {
            return [];
        }

        // Return effective amenities which will be from floorplan/building
        return this.getEffectiveAmenities();
    }

    /**
     * Check if a specific amenity is inherited
     */
    isAmenityInherited(amenity: Amenity): boolean {
        if(!this.state.unit) {
            return false;
        }

        const source = this.getAmenityInheritanceSource();

        // If amenities are unit-specific, none are inherited
        if(source === 'unit') {
            return false;
        }

        // Check if this amenity exists in the inherited amenities
        const inheritedAmenities = this.getInheritedAmenities();
        return _.some(inheritedAmenities,
            { category: amenity.category, name: amenity.name }
        );
    }
}
