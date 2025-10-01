import type { UnitData, UnitTypeData, Amenity } from '../../types';

export type AmenityInheritanceSource = 'unit' | 'floorplan' | 'building' | 'none';

export class AmenityInheritanceManager {
    getEffectiveAmenities(
        unit: UnitData,
        unitType: UnitTypeData | null,
        buildingAmenities: Amenity[]
    ): Amenity[] {
        // Priority order: unit > unitType > building
        if(unit.unitAmenities && unit.unitAmenities.length > 0) {
            return unit.unitAmenities;
        }

        if(unitType?.modelAmenities && unitType.modelAmenities.length > 0) {
            return unitType.modelAmenities;
        }

        if(buildingAmenities && buildingAmenities.length > 0) {
            return buildingAmenities;
        }

        return [];
    }

    getAmenityInheritanceSource(
        unit: UnitData,
        unitType: UnitTypeData | null,
        buildingAmenities: Amenity[]
    ): AmenityInheritanceSource {
        if(unit.unitAmenities && unit.unitAmenities.length > 0) {
            return 'unit';
        }

        if(unitType?.modelAmenities && unitType.modelAmenities.length > 0) {
            return 'floorplan';
        }

        if(buildingAmenities && buildingAmenities.length > 0) {
            return 'building';
        }

        return 'none';
    }

    resetToInheritedAmenities(unit: UnitData): void {
        // Clear unit-specific amenities to inherit from floorplan/building
        unit.unitAmenities = [];
    }

    hasUnitSpecificAmenities(unit: UnitData): boolean {
        return unit.unitAmenities !== undefined
          && unit.unitAmenities !== null
          && unit.unitAmenities.length > 0;
    }

    getInheritanceLabel(source: AmenityInheritanceSource): string {
        const labels: Record<AmenityInheritanceSource, string> = {
            unit:      'Unit-specific amenities',
            floorplan: 'Inherited from floorplan',
            building:  'Inherited from building',
            none:      'No amenities'
        };
        return labels[source];
    }

    getInheritanceBadgeClass(source: AmenityInheritanceSource): string {
        const classes: Record<AmenityInheritanceSource, string> = {
            unit:      'badge-primary',
            floorplan: 'badge-info',
            building:  'badge-secondary',
            none:      'badge-ghost'
        };
        return classes[source];
    }

    // Helper to compare amenity arrays for equality
    amenitiesEqual(amenities1: Amenity[], amenities2: Amenity[]): boolean {
        if(amenities1.length !== amenities2.length) {
            return false;
        }

        const sortedAmenities1 = [...amenities1].sort((a, b) =>
            (a.category + a.name).localeCompare(b.category + b.name)
        );
        const sortedAmenities2 = [...amenities2].sort((a, b) =>
            (a.category + a.name).localeCompare(b.category + b.name)
        );

        for(let i = 0; i < sortedAmenities1.length; i++) {
            if(sortedAmenities1[i].category !== sortedAmenities2[i].category
              || sortedAmenities1[i].name !== sortedAmenities2[i].name) {
                return false;
            }
        }

        return true;
    }

    // Get a display-friendly list of amenity names grouped by category
    getAmenitiesByCategory(amenities: Amenity[]): Map<string, string[]> {
        const grouped = new Map<string, string[]>();

        for(const amenity of amenities) {
            if(!grouped.has(amenity.category)) {
                grouped.set(amenity.category, []);
            }
            grouped.get(amenity.category)!.push(amenity.name);
        }

        // Sort amenity names within each category
        for(const [category, names] of grouped.entries()) {
            grouped.set(category, names.sort());
        }

        return grouped;
    }

    // Count amenities across categories
    getAmenityCount(amenities: Amenity[]): number {
        return amenities.length;
    }

    // Get unique categories
    getUniqueCategories(amenities: Amenity[]): string[] {
        const categories = new Set<string>();
        for(const amenity of amenities) {
            categories.add(amenity.category);
        }
        return Array.from(categories).sort();
    }
}
