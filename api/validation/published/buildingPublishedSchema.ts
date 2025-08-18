import { z } from 'zod';
import _ from 'lodash';
import { PropertyType } from '../../../src/types';
import { isValidBuildingId } from '../../../src/utils/building-id.js';

/**
 * STRICT MITS 4.1 COMPLIANT BUILDING VALIDATION SCHEMA
 *
 * This schema enforces all mandatory MITS (Multifamily Information and Transactions Standard) 4.1
 * requirements for buildings to be published to rental listing sites.
 *
 * MITS Elements Mapped:
 * - MITSPhysicalProperty.Property_ID.Identification: buildingID, buildingName
 * - MITSPhysicalProperty.Property_ID.Address: street, city, state, zip
 * - MITSPhysicalProperty.Property_ID.Location: latitude, longitude
 * - MITSPhysicalProperty.Property_ID.ILS_Identification: rentalType
 * - MITSPhysicalProperty.Information: structureType, propertyType
 * - MITSPhysicalProperty.Information: email, phone (contact requirements)
 */

// Contact info schema removed - now defined inline with proper required_error

/**
 * STRICT MITS 4.1 Building Publication Schema
 *
 * All fields marked as required are MANDATORY for MITS XML generation.
 * Validation errors include specific MITS requirement explanations.
 */
export const BuildingPublishedSchema = z.object({
    // MITS Property_ID.Identification.PropertyID - REQUIRED
    buildingID: z.string({
        message: 'Building ID is required for MITS Property_ID identification'
    })
        .min(1, 'Building ID is required for MITS Property_ID identification')
        .max(255, 'Building ID must be 255 characters or less for MITS compliance')
        .refine((id) => {
            // Use proper building ID validation for short-uuid format
            return isValidBuildingId(id);
        }, 'Building ID must be a valid building ID format for MITS compliance'),

    // MITS Property_ID.Identification.MarketingName - REQUIRED
    buildingName: z.string({
        message: 'Building name is required for MITS MarketingName element'
    })
        .min(1, 'Building name is required for MITS MarketingName element')
        .max(100, 'Building name must be 100 characters or less for MITS compliance'),

    // MITS Property_ID.Address - ALL REQUIRED for proper address element
    street: z.string({
        message: 'Street address is required for MITS Address element'
    })
        .min(1, 'Street address is required for MITS Address element')
        .max(100, 'Street address must be 100 characters or less for MITS compliance'),

    city: z.string({
        message: 'City is required for MITS Address element'
    })
        .min(1, 'City is required for MITS Address element')
        .max(50, 'City must be 50 characters or less for MITS compliance'),

    state: z.string({
        message: 'State is required for MITS Address element'
    })
        .min(2, 'State is required for MITS Address element')
        .max(2, 'State must be 2 uppercase letters for MITS compliance')
        .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters for MITS compliance'),

    zip: z.string({
        message: 'ZIP code must be 5 digits or 5+4 format'
    })
        .regex(/^\d{5}(?:-\d{4})?$/, 'ZIP code must be 5 digits or 5+4 format (12345 or 12345-6789) for MITS compliance'),

    // MITS Property_ID.Location - REQUIRED for mapping and site compliance
    latitude: z.number({
        message: 'Latitude must be between -90 and 90 degrees for MITS Location element'
    })
        .min(-90, 'Latitude must be between -90 and 90 degrees for MITS Location element')
        .max(90, 'Latitude must be between -90 and 90 degrees for MITS Location element')
        .refine(
            lat => lat !== 0,
            { message: 'Latitude cannot be 0 - please verify building coordinates for MITS compliance' }
        ),

    longitude: z.number({
        message: 'Longitude must be between -180 and 180 degrees for MITS Location element'
    })
        .min(-180, 'Longitude must be between -180 and 180 degrees for MITS Location element')
        .max(180, 'Longitude must be between -180 and 180 degrees for MITS Location element')
        .refine(
            lng => lng !== 0,
            { message: 'Longitude cannot be 0 - please verify building coordinates for MITS compliance' }
        ),

    // MITS Property classification - REQUIRED for proper categorization
    propertyType: z.enum(PropertyType, {
        error: 'Property type is required for MITS Information.PropertyType classification'
    }),

    // MITS Information.StructureType - REQUIRED
    structureType: z.enum(['Apartment', 'Condo', 'Townhouse', 'Single Family', 'House'], {
        message: 'Structure type is required for MITS Information.StructureType element'
    }),

    // MITS ILS_Identification.RentalType - REQUIRED
    rentalType: z.enum(['Market Rate', 'Affordable', 'Student', 'Senior'], {
        message: 'Rental type is required for MITS ILS_Identification.RentalType element'
    }),

    // MITS Information contact requirements - REQUIRED
    contactInfo: z.object({
        name: z.string().optional(),

        email: z.email({ error: 'Valid email address is required for MITS compliance' })
            .min(1, 'Email cannot be empty for MITS publication'),

        phone: z.string()
            .regex(/^[\d\s\-().+]+$/, 'Valid phone number format is required for MITS compliance')
            .min(10, 'Phone number must contain at least 10 digits for MITS compliance')
            .refine(
                (phone) => {
                    // Remove all non-digit characters and check length
                    const digitsOnly = _.replace(phone, /\D/g, '');
                    return digitsOnly.length >= 10;
                },
                { message: 'Phone number must contain at least 10 digits for MITS compliance' }
            ),

        // Optional fields that enhance MITS compliance
        propertyWebsite: z.url({ error: 'Property website must be a valid URL' }).optional(),
        managementWebsite: z.url({ error: 'Management website must be a valid URL' }).optional(),
    }, {
        message: 'Both email and phone are required in contactInfo for MITS'
    })
        .refine(
            contact => contact.email && contact.phone,
            {
                message: 'Both email and phone are required in contactInfo for MITS Information.Email and Information.PhoneNumber elements',
                path: ['contactInfo']
            }
        ),

    // RECOMMENDED fields that enhance MITS compliance and listing quality
    yearBuilt: z.number()
        .int('Year built must be a whole number')
        .min(1800, 'Year built must be 1800 or later for MITS compliance')
        .max(new Date().getFullYear() + 5, 'Year built cannot be more than 5 years in the future')
        .optional(),

    totalUnits: z.number()
        .int('Total units must be a whole number')
        .min(1, 'Total units must be at least 1 for MITS ILS_Identification.TotalUnits')
        .optional(),

    numberStories: z.number()
        .int('Number of stories must be a whole number')
        .min(1, 'Number of stories must be at least 1')
        .max(100, 'Number of stories must be 100 or less')
        .optional(),

    description: z.string()
        .max(1000, 'Property description must be 1000 characters or less for MITS compliance')
        .optional(),

    propertyDescription: z.string()
        .max(2000, 'Marketing description must be 2000 characters or less for MITS compliance')
        .optional(),

    // MITS allows various additional fields that are optional but recommended
    applicationFee: z.number()
        .min(0, 'Application fee cannot be negative')
        .max(1000, 'Application fee seems unusually high - please verify')
        .optional(),

    leaseLength: z.number()
        .int('Default lease length must be a whole number of months')
        .min(1, 'Lease length must be at least 1 month')
        .max(36, 'Lease length must be 36 months or less')
        .optional(),

    acceptsOnlineApplications: z.boolean().optional(),

    // Complex structures that support MITS elements but are optional
    petPolicies: z.any().optional(), // MITS Policy.Pet element
    parkingOptions: z.array(z.any()).optional(),
    storageOptions: z.array(z.any()).optional(),
    propertyAmenities: z.array(z.any()).optional(), // MITS Amenity elements
    oneTimeFees: z.array(z.any()).optional(),
    monthlyFees: z.array(z.any()).optional(),
    utilitiesIncluded: z.record(z.string(), z.boolean()).optional(),
    rentSpecials: z.array(z.any()).optional(),

    // Metadata
    updatedAt: z.string().optional(),
}).strict() // Prevent additional properties for strict MITS compliance
.refine(
    (building) => {
        // Additional validation: ensure coordinates are within reasonable geographic bounds
        const { latitude, longitude } = building;

        // Basic geographic sanity check - coordinates should be on land masses
        // This is a loose check, but helps catch obvious data entry errors
        if(Math.abs(latitude) < 1 && Math.abs(longitude) < 1) {
            return false; // Likely in the ocean near 0,0
        }

        return true;
    },
    {
        message: 'Building coordinates appear to be invalid - please verify latitude and longitude are correct for MITS Location accuracy',
        path: ['coordinates']
    }
);

export type BuildingPublishedInput = z.infer<typeof BuildingPublishedSchema>;

/**
 * MITS validation error messages for common failures
 */
export const MITS_BUILDING_ERROR_MESSAGES = {
    MISSING_REQUIRED_FIELD: 'This field is required for MITS 4.1 compliance and must be provided before publishing to rental sites',
    INVALID_COORDINATES: 'Invalid coordinates: MITS requires accurate latitude/longitude for Property_ID.Location element',
    INVALID_ADDRESS: 'Complete address is required: MITS Address element needs street, city, state, and ZIP code',
    INVALID_CONTACT: 'Contact information is incomplete: MITS requires both email and phone number in Information element',
    INVALID_CLASSIFICATION: 'Property classification is required: MITS needs propertyType, structureType, and rentalType for proper categorization'
} as const;
