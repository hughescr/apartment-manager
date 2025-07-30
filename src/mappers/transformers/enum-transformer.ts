import _ from 'lodash';
import type { EnumMapping, SiteSpecificValue, TransformerFunction } from '../types.js';
import {
    PropertyType,
    UtilityType,
    FeeType,
    PetType,
    ParkingType,
    AmenityCategory
} from '../../types/index.js';

// Default enum mappings for common sites
export const defaultEnumMappings = {
    propertyType: [
        {
            internal: PropertyType.APARTMENT,
            external: {
                apartments_com: 'Apartment',
                zillow: 'Apartment'
            }
        },
        {
            internal: PropertyType.CONDO,
            external: {
                apartments_com: 'Condo',
                zillow: 'Condo'
            }
        },
        {
            internal: PropertyType.TOWNHOME,
            external: {
                apartments_com: 'Townhome',
                zillow: 'Townhouse'
            }
        },
        {
            internal: PropertyType.SINGLE_FAMILY,
            external: {
                apartments_com: 'Single Family',
                zillow: 'Single Family Home'
            }
        },
        {
            internal: PropertyType.HOUSE,
            external: {
                apartments_com: 'House',
                zillow: 'House'
            }
        }
    ] as EnumMapping<PropertyType>[],

    petType: [
        {
            internal: PetType.DOG,
            external: {
                apartments_com: 'Dogs',
                zillow: 'Dog'
            }
        },
        {
            internal: PetType.CAT,
            external: {
                apartments_com: 'Cats',
                zillow: 'Cat'
            }
        },
        {
            internal: PetType.BIRD,
            external: {
                apartments_com: 'Birds',
                zillow: 'Bird'
            }
        },
        {
            internal: PetType.FISH,
            external: {
                apartments_com: 'Fish',
                zillow: 'Fish'
            }
        },
        {
            internal: PetType.SMALL_ANIMAL,
            external: {
                apartments_com: 'Small Animals',
                zillow: 'Small Animal'
            }
        },
        {
            internal: PetType.NO_PETS,
            external: {
                apartments_com: 'No Pets',
                zillow: 'No Pets Allowed'
            }
        }
    ] as EnumMapping<PetType>[],

    parkingType: [
        {
            internal: ParkingType.GARAGE,
            external: {
                apartments_com: 'Garage',
                zillow: 'Garage'
            }
        },
        {
            internal: ParkingType.COVERED,
            external: {
                apartments_com: 'Covered',
                zillow: 'Covered Parking'
            }
        },
        {
            internal: ParkingType.UNCOVERED,
            external: {
                apartments_com: 'Uncovered',
                zillow: 'Off-street Parking'
            }
        },
        {
            internal: ParkingType.STREET,
            external: {
                apartments_com: 'Street',
                zillow: 'Street Parking'
            }
        },
        {
            internal: ParkingType.NONE,
            external: {
                apartments_com: 'None',
                zillow: 'No Parking'
            }
        }
    ] as EnumMapping<ParkingType>[],

    utilityType: [
        {
            internal: UtilityType.WATER,
            external: {
                apartments_com: 'Water',
                zillow: 'Water'
            }
        },
        {
            internal: UtilityType.SEWER,
            external: {
                apartments_com: 'Sewer',
                zillow: 'Sewer'
            }
        },
        {
            internal: UtilityType.TRASH,
            external: {
                apartments_com: 'Trash',
                zillow: 'Trash'
            }
        },
        {
            internal: UtilityType.GAS,
            external: {
                apartments_com: 'Gas',
                zillow: 'Gas'
            }
        },
        {
            internal: UtilityType.ELECTRICITY,
            external: {
                apartments_com: 'Electricity',
                zillow: 'Electric'
            }
        },
        {
            internal: UtilityType.CABLE,
            external: {
                apartments_com: 'Cable',
                zillow: 'Cable'
            }
        },
        {
            internal: UtilityType.INTERNET,
            external: {
                apartments_com: 'Internet',
                zillow: 'Internet'
            }
        },
        {
            internal: UtilityType.HEAT,
            external: {
                apartments_com: 'Heat',
                zillow: 'Heat'
            }
        },
        {
            internal: UtilityType.AIR_CONDITIONING,
            external: {
                apartments_com: 'A/C',
                zillow: 'Air Conditioning'
            }
        }
    ] as EnumMapping<UtilityType>[],

    feeType: [
        {
            internal: FeeType.APPLICATION,
            external: {
                apartments_com: 'Application Fee',
                zillow: 'Application Fee'
            }
        },
        {
            internal: FeeType.ADMIN,
            external: {
                apartments_com: 'Admin Fee',
                zillow: 'Administrative Fee'
            }
        },
        {
            internal: FeeType.SECURITY_DEPOSIT,
            external: {
                apartments_com: 'Security Deposit',
                zillow: 'Security Deposit'
            }
        },
        {
            internal: FeeType.PET_DEPOSIT,
            external: {
                apartments_com: 'Pet Deposit',
                zillow: 'Pet Deposit'
            }
        },
        {
            internal: FeeType.PET_FEE,
            external: {
                apartments_com: 'Pet Fee',
                zillow: 'Pet Fee'
            }
        },
        {
            internal: FeeType.PARKING,
            external: {
                apartments_com: 'Parking Fee',
                zillow: 'Parking'
            }
        },
        {
            internal: FeeType.STORAGE,
            external: {
                apartments_com: 'Storage Fee',
                zillow: 'Storage'
            }
        },
        {
            internal: FeeType.MOVE_IN,
            external: {
                apartments_com: 'Move-in Fee',
                zillow: 'Move-in Fee'
            }
        },
        {
            internal: FeeType.KEY_DEPOSIT,
            external: {
                apartments_com: 'Key Deposit',
                zillow: 'Key Deposit'
            }
        },
        {
            internal: FeeType.CLEANING,
            external: {
                apartments_com: 'Cleaning Fee',
                zillow: 'Cleaning Fee'
            }
        }
    ] as EnumMapping<FeeType>[],

    amenityCategory: [
        {
            internal: AmenityCategory.UNIT,
            external: {
                apartments_com: 'Unit',
                zillow: 'Interior'
            }
        },
        {
            internal: AmenityCategory.PROPERTY,
            external: {
                apartments_com: 'Property',
                zillow: 'Property'
            }
        },
        {
            internal: AmenityCategory.COMMUNITY,
            external: {
                apartments_com: 'Community',
                zillow: 'Community'
            }
        }
    ] as EnumMapping<AmenityCategory>[]
};

/**
 * Create an enum transformer function for a specific enum type and site.
 * @param enumType The type of enum to transform
 * @param siteId The target site ID
 * @param customMappings Optional custom mappings to override defaults
 * @returns A transformer function
 */
export function createEnumTransformer<T extends string>(
    enumType: keyof typeof defaultEnumMappings,
    siteId: string,
    customMappings?: EnumMapping<T>[]
): TransformerFunction<T, string> {
    const mappings = customMappings || defaultEnumMappings[enumType] as EnumMapping<T>[];

    return (value: T): string => {
        const mapping = _.find(mappings, ['internal', value]);
        if(!mapping) {
            // Return the original value if no mapping found
            return value;
        }

        const siteSpecific = mapping.external[siteId as keyof SiteSpecificValue<string>];
        return siteSpecific || value;
    };
}

/**
 * Create a reverse enum transformer (external to internal).
 * Useful for importing data from external sites.
 * @param enumType The type of enum to transform
 * @param siteId The source site ID
 * @param customMappings Optional custom mappings to override defaults
 * @returns A transformer function
 */
export function createReverseEnumTransformer<T extends string>(
    enumType: keyof typeof defaultEnumMappings,
    siteId: string,
    customMappings?: EnumMapping<T>[]
): TransformerFunction<string, T | undefined> {
    const mappings = customMappings || defaultEnumMappings[enumType] as EnumMapping<T>[];

    return (value: string): T | undefined => {
        for(const mapping of mappings) {
            const siteSpecific = mapping.external[siteId as keyof SiteSpecificValue<string>];
            if(siteSpecific === value) {
                return mapping.internal;
            }
        }
        return undefined;
    };
}

/**
 * Transform an array of enum values.
 * @param values Array of internal enum values
 * @param enumType The type of enum
 * @param siteId The target site ID
 * @param customMappings Optional custom mappings
 * @returns Array of transformed values
 */
export function transformEnumArray<T extends string>(
    values: T[],
    enumType: keyof typeof defaultEnumMappings,
    siteId: string,
    customMappings?: EnumMapping<T>[]
): string[] {
    const transformer = createEnumTransformer(enumType, siteId, customMappings);
    return _.map(values, transformer);
}
