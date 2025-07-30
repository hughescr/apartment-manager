import _ from 'lodash';
import type { TransformerFunction } from '../types.js';
import type { Amenity } from '../../types/index.js';
import { AmenityCategory } from '../../types/index.js';

/**
 * Common amenity name mappings for different sites.
 * Maps internal amenity names to site-specific names.
 */
const amenityNameMappings: Record<string, Record<string, string>> = {
    apartments_com: {
        'Air Conditioning': 'A/C',
        Dishwasher: 'Dishwasher',
        'Hardwood Floors': 'Wood Floors',
        'In-Unit Washer/Dryer': 'Washer/Dryer In Unit',
        'Washer/Dryer Hookups': 'Washer/Dryer Hookup',
        Balcony: 'Balcony',
        Patio: 'Patio',
        'Swimming Pool': 'Pool',
        'Fitness Center': 'Gym',
        'Parking Garage': 'Garage Parking',
        'Pet Friendly': 'Pet Friendly',
        Elevator: 'Elevator',
        Doorman: 'Doorman',
        Concierge: 'Concierge Service'
    },
    zillow: {
        'Air Conditioning': 'Air conditioning',
        Dishwasher: 'Dishwasher',
        'Hardwood Floors': 'Hardwood floors',
        'In-Unit Washer/Dryer': 'In unit laundry',
        'Washer/Dryer Hookups': 'Laundry hookups',
        Balcony: 'Balcony/deck/patio',
        Patio: 'Balcony/deck/patio',
        'Swimming Pool': 'Pool',
        'Fitness Center': 'Fitness center',
        'Parking Garage': 'Covered parking',
        'Pet Friendly': 'Pets allowed',
        Elevator: 'Elevator',
        Doorman: 'Doorman',
        Concierge: 'Concierge'
    }
};

/**
 * Site-specific amenity categories.
 */
const _siteCategoryMappings: Record<string, Record<AmenityCategory, string[]>> = {
    apartments_com: {
        [AmenityCategory.UNIT]: ['Kitchen', 'Bathroom', 'Living Space', 'Climate'],
        [AmenityCategory.PROPERTY]: ['Building', 'Parking', 'Security', 'Accessibility'],
        [AmenityCategory.COMMUNITY]: ['Recreation', 'Services', 'Outdoor']
    },
    zillow: {
        [AmenityCategory.UNIT]: ['Interior'],
        [AmenityCategory.PROPERTY]: ['Property', 'Building'],
        [AmenityCategory.COMMUNITY]: ['Community', 'Additional']
    }
};

/**
 * Create an amenity name transformer for a specific site.
 * @param siteId The target site ID
 * @returns A transformer function
 */
export function createAmenityNameTransformer(
    siteId: string
): TransformerFunction<string, string> {
    const mappings = amenityNameMappings[siteId] || {};

    return (name: string): string => {
        return mappings[name] || name;
    };
}

/**
 * Filter amenities by category.
 * @param amenities Array of amenities
 * @param category The category to filter by
 * @returns Filtered amenities
 */
export function filterAmenitiesByCategory(
    amenities: Amenity[],
    category: AmenityCategory
): Amenity[] {
    return _.filter(amenities, ['category', category]);
}

/**
 * Transform amenities for a specific site and category.
 * @param amenities Array of amenities
 * @param siteId The target site
 * @param category Optional category filter
 * @returns Transformed amenity names
 */
export function transformAmenities(
    amenities: Amenity[] | undefined,
    siteId: string,
    category?: AmenityCategory
): string[] {
    if(!amenities || amenities.length === 0) {
        return [];
    }

    const transformer = createAmenityNameTransformer(siteId);

    let filtered = amenities;
    if(category) {
        filtered = filterAmenitiesByCategory(amenities, category);
    }

    return _.map(filtered, amenity => transformer(amenity.name));
}

/**
 * Group amenities by their categories.
 * @param amenities Array of amenities
 * @returns Object with categories as keys and amenity arrays as values
 */
export function groupAmenitiesByCategory(
    amenities: Amenity[]
): Record<AmenityCategory, Amenity[]> {
    const grouped = _.groupBy(amenities, 'category');

    // Ensure all categories are present
    return {
        [AmenityCategory.UNIT]: grouped[AmenityCategory.UNIT] || [],
        [AmenityCategory.PROPERTY]: grouped[AmenityCategory.PROPERTY] || [],
        [AmenityCategory.COMMUNITY]: grouped[AmenityCategory.COMMUNITY] || []
    };
}

/**
 * Merge amenities from multiple sources, removing duplicates.
 * Later sources override earlier ones for the same amenity name.
 * @param sources Arrays of amenities to merge
 * @returns Merged amenities
 */
export function mergeAmenities(...sources: (Amenity[] | undefined)[]): Amenity[] {
    const amenityMap = new Map<string, Amenity>();

    for(const source of sources) {
        if(source) {
            for(const amenity of source) {
                amenityMap.set(amenity.name, amenity);
            }
        }
    }

    return Array.from(amenityMap.values());
}

/**
 * Create a comma-separated list of amenities.
 * @param amenities Array of amenities
 * @param siteId The target site
 * @returns Comma-separated string
 */
export function amenityListToString(
    amenities: Amenity[] | undefined,
    siteId: string
): string {
    const names = transformAmenities(amenities, siteId);
    return names.join(', ');
}

/**
 * Parse a comma-separated amenity string.
 * @param amenityString Comma-separated amenities
 * @param defaultCategory Default category for parsed amenities
 * @returns Array of amenities
 */
export function parseAmenityString(
    amenityString: string | undefined,
    defaultCategory: AmenityCategory = AmenityCategory.PROPERTY
): Amenity[] {
    if(!amenityString) {
        return [];
    }

    const names = _.map(_.split(amenityString, ','), name => _.trim(name));
    return _(names)
        .map(name => (name ? { name, category: defaultCategory } : undefined))
        .compact()
        .value();
}

/**
 * Check if specific amenities are present.
 * @param amenities Array of amenities
 * @param requiredAmenities Names of required amenities
 * @returns true if all required amenities are present
 */
export function hasAmenities(
    amenities: Amenity[] | undefined,
    requiredAmenities: string[]
): boolean {
    if(!amenities || requiredAmenities.length === 0) {
        return requiredAmenities.length === 0;
    }

    const amenityNames = _.map(amenities, 'name');
    return _.every(requiredAmenities, required =>
        _.includes(amenityNames, required)
    );
}
