import { z } from 'zod';
import { trim } from 'lodash';
import { isValidBuildingId } from '../../../src/utils/building-id.js';

/**
 * STRICT MITS 4.1 COMPLIANT UNIT TYPE VALIDATION SCHEMA
 *
 * This schema enforces all mandatory MITS (Multifamily Information and Transactions Standard) 4.1
 * requirements for unit types (floorplans) to be published to rental listing sites.
 *
 * MITS Elements Mapped:
 * - Floorplan.Identification.FloorplanID: modelID (unitTypeId)
 * - Floorplan.Identification.Name: modelName
 * - Floorplan.Room: beds, baths (converted to room counts)
 * - Floorplan.SquareFeet.Min/Max: minSqft, maxSqft
 * - Floorplan.MarketRent.Min/Max: minRent, maxRent
 * - Floorplan.Identification.UnitCount: countAvailable
 */

// Enhanced deposit schema for MITS Floorplan.Deposit element
const DepositPublishedSchema = z.union([
    z.number()
        .min(0, 'Deposit amount cannot be negative for MITS Deposit element')
        .max(50000, 'Deposit amount seems unusually high - please verify'),
    z.object({
        amount: z.number()
            .min(0, 'Deposit amount cannot be negative for MITS Deposit element')
            .max(50000, 'Deposit amount seems unusually high - please verify'),
        refundable:              z.boolean().optional(),
        partialRefundPercentage: z.number()
            .min(0, 'Partial refund percentage cannot be negative')
            .max(100, 'Partial refund percentage cannot exceed 100%')
            .optional(),
        notes: z.string()
            .max(500, 'Deposit notes must be 500 characters or less')
            .optional()
    })
]).optional();

// Amenity schema for MITS FloorplanAmenity elements
const AmenityPublishedSchema = z.object({
    type: z.string()
        .min(1, 'Amenity type is required for MITS FloorplanAmenity.AmenityType')
        .max(100, 'Amenity type must be 100 characters or less'),
    description: z.string()
        .max(500, 'Amenity description must be 500 characters or less for MITS FloorplanAmenity.AmenityDescription')
        .optional(),
    category: z.string()
        .max(50, 'Amenity category must be 50 characters or less')
        .optional()
});

/**
 * STRICT MITS 4.1 Unit Type (Floorplan) Publication Schema
 *
 * All fields marked as required are MANDATORY for MITS XML Floorplan generation.
 * This schema ensures unit types meet all MITS requirements for rental site syndication.
 */
export const UnitTypePublishedSchema = z.object({
    // MITS foreign key relationship - REQUIRED
    buildingID: z.string()
        .min(1, 'Building ID is required to associate floorplan with property')
        .max(255, 'Building ID must be 255 characters or less')
        .refine((id) => {
            // Use proper building ID validation for short-uuid format
            return isValidBuildingId(id);
        }, 'Building ID must be a valid building ID format'),

    // MITS Floorplan.Identification.FloorplanID - REQUIRED
    modelID: z.string({
        message: 'Model ID is required for MITS Floorplan.Identification.FloorplanID'
    })
        .min(1, 'Model ID is required for MITS Floorplan.Identification.FloorplanID')
        .max(255, 'Model ID must be 255 characters or less for MITS compliance')
        .regex(/^[\w-]+$/, 'Model ID can only contain letters, numbers, underscores, and hyphens for MITS compliance'),

    // MITS Floorplan.Identification.Name - REQUIRED
    modelName: z.string({
        message: 'Model name is required for MITS Floorplan.Identification.Name element'
    })
        .min(1, 'Model name is required for MITS Floorplan.Identification.Name element')
        .max(100, 'Model name must be 100 characters or less for MITS compliance')
        .refine(
            name => trim(name).length > 0,
            { message: 'Model name cannot be only whitespace for MITS compliance' }
        ),

    // MITS Floorplan.Room elements - beds and baths are REQUIRED
    beds: z.number({
        message: 'Number of bedrooms cannot be negative'
    })
        .int('Number of bedrooms must be a whole number for MITS Room element')
        .min(0, 'Number of bedrooms cannot be negative')
        .max(10, 'Number of bedrooms must be 10 or less for MITS compliance'),

    baths: z.number({
        message: 'Number of bathrooms cannot be negative for MITS Room element'
    })
        .min(0, 'Number of bathrooms cannot be negative for MITS Room element')
        .max(10, 'Number of bathrooms must be 10 or less for MITS compliance')
        .refine(
            (baths) => {
                // Allow half-baths (e.g., 1.5, 2.5) but validate reasonable increments
                const remainder = baths % 0.5;
                return remainder === 0;
            },
            { message: 'Number of bathrooms must be in 0.5 increments (e.g., 1, 1.5, 2, 2.5) for MITS compliance' }
        ),

    // MITS Floorplan.SquareFeet - At least ONE is REQUIRED
    minSqft: z.number()
        .int('Minimum square footage must be a whole number')
        .min(1, 'Minimum square footage must be at least 1 for MITS SquareFeet.Min')
        .max(10000, 'Minimum square footage must be 10,000 or less')
        .optional(),

    maxSqft: z.number()
        .int('Maximum square footage must be a whole number')
        .min(1, 'Maximum square footage must be at least 1 for MITS SquareFeet.Max')
        .max(10000, 'Maximum square footage must be 10,000 or less')
        .optional(),

    // MITS Floorplan.MarketRent - At least ONE is REQUIRED for rental information
    minRent: z.number()
        .min(0, 'Minimum rent cannot be negative for MITS MarketRent.Min')
        .max(50000, 'Minimum rent seems unusually high - please verify')
        .optional(),

    maxRent: z.number()
        .min(0, 'Maximum rent cannot be negative for MITS MarketRent.Max')
        .max(50000, 'Maximum rent seems unusually high - please verify')
        .optional(),

    // MITS Floorplan.Identification.UnitCount - RECOMMENDED
    countAvailable: z.number()
        .int('Count available must be a whole number')
        .min(0, 'Count available cannot be negative for MITS UnitCount')
        .max(1000, 'Count available seems unusually high - please verify')
        .optional(),

    // Additional MITS-compatible fields
    dateAvailable: z.string()
        .refine(
            (date) => {
                if(!date) {
                    return true; // Optional field
                }
                const parsed = new Date(date);
                return !isNaN(parsed.getTime());
            },
            { message: 'Available date must be a valid date format (ISO 8601 recommended)' }
        )
        .optional(),

    maxOccupants: z.number()
        .int('Maximum occupants must be a whole number')
        .min(1, 'Maximum occupants must be at least 1')
        .max(20, 'Maximum occupants must be 20 or less for MITS compliance')
        .optional(),

    perPersonRent: z.number()
        .min(0, 'Per person rent cannot be negative')
        .max(10000, 'Per person rent seems unusually high - please verify')
        .optional(),

    // MITS Floorplan.Deposit element
    deposit: DepositPublishedSchema,

    // Lease terms
    minLeaseTerm: z.number()
        .int('Minimum lease term must be a whole number of months')
        .min(1, 'Minimum lease term must be at least 1 month')
        .max(36, 'Minimum lease term must be 36 months or less')
        .optional(),

    maxLeaseTerm: z.number()
        .int('Maximum lease term must be a whole number of months')
        .min(1, 'Maximum lease term must be at least 1 month')
        .max(36, 'Maximum lease term must be 36 months or less')
        .optional(),

    // MITS FloorplanAmenity elements
    modelAmenities: z.array(AmenityPublishedSchema)
        .max(50, 'Model amenities list must have 50 items or less for MITS compliance')
        .optional(),

    // Metadata
    updatedAt: z.string().optional(),
}).strict() // Prevent additional properties for strict MITS compliance
.refine(
    (unitType) => {
        // MITS requires at least one square footage value
        return unitType.minSqft !== undefined || unitType.maxSqft !== undefined;
    },
    {
        message: 'At least one square footage value (minSqft or maxSqft) is required for MITS Floorplan.SquareFeet element',
        path:    ['sqft']
    }
)
.refine(
    (unitType) => {
        // MITS requires at least one rent value for market information
        return unitType.minRent !== undefined || unitType.maxRent !== undefined;
    },
    {
        message: 'At least one rent value (minRent or maxRent) is required for MITS Floorplan.MarketRent element',
        path:    ['rent']
    }
)
.refine(
    (unitType) => {
        // Cross-validation: minSqft cannot be greater than maxSqft
        if(unitType.minSqft !== undefined && unitType.maxSqft !== undefined) {
            return unitType.minSqft <= unitType.maxSqft;
        }
        return true;
    },
    {
        message: 'Minimum square footage cannot be greater than maximum square footage',
        path:    ['maxSqft']
    }
)
.refine(
    (unitType) => {
        // Cross-validation: minRent cannot be greater than maxRent
        if(unitType.minRent !== undefined && unitType.maxRent !== undefined) {
            return unitType.minRent <= unitType.maxRent;
        }
        return true;
    },
    {
        message: 'Minimum rent cannot be greater than maximum rent',
        path:    ['maxRent']
    }
)
.refine(
    (unitType) => {
        // Cross-validation: minLeaseTerm cannot be greater than maxLeaseTerm
        if(unitType.minLeaseTerm !== undefined && unitType.maxLeaseTerm !== undefined) {
            return unitType.minLeaseTerm <= unitType.maxLeaseTerm;
        }
        return true;
    },
    {
        message: 'Minimum lease term cannot be greater than maximum lease term',
        path:    ['maxLeaseTerm']
    }
);

export type UnitTypePublishedInput = z.infer<typeof UnitTypePublishedSchema>;

/**
 * MITS validation error messages for common unit type failures
 */
export const MITS_UNIT_TYPE_ERROR_MESSAGES = {
    MISSING_REQUIRED_FIELD: 'This field is required for MITS 4.1 Floorplan compliance and must be provided before publishing',
    MISSING_SIZE_INFO:      'Square footage required: MITS Floorplan.SquareFeet element needs at least minSqft or maxSqft',
    MISSING_RENT_INFO:      'Rent information required: MITS Floorplan.MarketRent element needs at least minRent or maxRent',
    INVALID_ROOM_COUNT:     'Invalid room configuration: beds and baths are required for MITS Floorplan.Room elements',
    INVALID_RANGE:          'Invalid range: minimum value cannot be greater than maximum value for MITS compliance'
} as const;
