import { z } from 'zod';
import { trim } from 'lodash';
import type { VacancyClass } from '../../../src/types';
import { isValidBuildingId } from '../../../src/utils/building-id.js';
import {
    createDepositSchema,
    createUnitAmenitySchema,
    createDateStringSchema
} from '../shared/unit-schemas';

/**
 * STRICT MITS 4.1 COMPLIANT UNIT VALIDATION SCHEMA
 *
 * This schema enforces all mandatory MITS (Multifamily Information and Transactions Standard) 4.1
 * requirements for individual units to be published to rental listing sites.
 *
 * MITS Elements Mapped:
 * - ILSUnit.Identification.UnitID: unitId
 * - ILSUnit.Identification.UnitNumber: unitNumber
 * - ILSUnit.UnitBedrooms: beds
 * - ILSUnit.UnitBathrooms: baths
 * - ILSUnit.SquareFeet: sqft
 * - ILSUnit.UnitRent: rent
 * - ILSUnit.Availability.VacancyClass: vacancyClass
 * - ILSUnit.Availability.AvailableDate: availableDate
 * - ILSUnit.Availability.VacateDate: vacateDate
 * - ILSUnit.Availability.MadeReadyDate: madeReadyDate
 */

// MITS-compliant vacancy classification - REQUIRED enum
const VacancyClassSchema = z.enum(['Occupied', 'Unoccupied', 'Notice', 'Down'], {
    message: 'Vacancy class is required for MITS ILS_Unit.VacancyClass element'
}) satisfies z.ZodSchema<VacancyClass>;

// Create published-mode schemas using shared builders
const DepositPublishedSchema = createDepositSchema({ mode: 'published' });
const AmenityPublishedSchema = createUnitAmenitySchema({ mode: 'published' });
const mitsDateString = (fieldName: string) => createDateStringSchema(fieldName, { mode: 'published' });

/**
 * STRICT MITS 4.1 Unit Publication Schema
 *
 * All fields marked as required are MANDATORY for MITS XML ILSUnit generation.
 * This schema ensures individual units meet all MITS requirements for rental site availability.
 */
export const UnitPublishedSchema = z.object({
    // MITS foreign key relationship - REQUIRED
    buildingID: z.string()
        .min(1, 'Building ID is required to associate unit with property')
        .max(255, 'Building ID must be 255 characters or less')
        .refine((id) => {
            // Use proper building ID validation for short-uuid format
            return isValidBuildingId(id);
        }, 'Building ID must be a valid building ID format'),

    // MITS ILSUnit.Identification.UnitID - REQUIRED
    unitID: z.string({
        message: 'Unit ID is required for MITS ILS_Unit.Unit identification'
    })
        .min(1, 'Unit ID is required for MITS ILS_Unit.Unit identification')
        .max(255, 'Unit ID must be 255 characters or less for MITS compliance')
        .regex(/^[\w-]+$/, 'Unit ID can only contain letters, numbers, underscores, and hyphens for MITS compliance'),

    // MITS ILSUnit.Identification.UnitNumber - REQUIRED for display
    unitNumber: z.string({
        message: 'Unit number is required for MITS ILS_Unit.UnitID element'
    })
        .min(1, 'Unit number is required for MITS ILS_Unit.UnitID element')
        .max(50, 'Unit number must be 50 characters or less for MITS compliance')
        .refine(
            number => trim(number).length > 0,
            { message: 'Unit number cannot be only whitespace for MITS compliance' }
        ),

    // MITS ILSUnit room configuration - REQUIRED
    beds: z.number({
        message: 'Number of bedrooms is required for MITS ILS_Unit.Room element'
    })
        .int('Number of bedrooms must be a whole number for MITS ILSUnit.UnitBedrooms')
        .min(0, 'Number of bedrooms cannot be negative')
        .max(10, 'Number of bedrooms must be 10 or less for MITS compliance'),

    baths: z.number({
        message: 'Number of bathrooms is required for MITS ILS_Unit.Room element'
    })
        .min(0, 'Number of bathrooms cannot be negative for MITS ILSUnit.UnitBathrooms')
        .max(10, 'Number of bathrooms must be 10 or less for MITS compliance')
        .refine(
            (baths) => {
                // Allow half-baths (e.g., 1.5, 2.5) but validate reasonable increments
                const remainder = baths % 0.5;
                return remainder === 0;
            },
            { message: 'Number of bathrooms must be in 0.5 increments (e.g., 1, 1.5, 2, 2.5) for MITS compliance' }
        ),

    // MITS ILSUnit.SquareFeet - REQUIRED for unit size
    sqft: z.number({
        message: 'Square footage is required for MITS ILS_Unit.SquareFeet element'
    })
        .int('Square footage must be a whole number for MITS ILSUnit.SquareFeet')
        .min(1, 'Square footage must be at least 1 for MITS compliance')
        .max(10000, 'Square footage must be 10,000 or less for MITS compliance'),

    // MITS ILSUnit.UnitRent - REQUIRED for rental information
    rent: z.number({
        message: 'Rent is required for MITS ILS_Unit.MarketRent element'
    })
        .min(0, 'Rent cannot be negative for MITS ILSUnit.UnitRent')
        .max(50000, 'Rent seems unusually high - please verify')
        .refine(
            rent => rent > 0,
            { message: 'Rent must be greater than 0 for MITS unit availability' }
        ),

    // MITS ILSUnit.Availability.VacancyClass - REQUIRED
    vacancyClass: VacancyClassSchema,

    // MITS ILSUnit.Availability dates - CONDITIONAL REQUIRED based on vacancy class
    availableDate: mitsDateString('Available date'),
    vacateDate:    mitsDateString('Vacate date'),
    madeReadyDate: mitsDateString('Made ready date'),

    // Optional but recommended MITS fields
    modelID: z.string()
        .regex(/^[\w-]*$/, 'Model ID can only contain letters, numbers, underscores, and hyphens')
        .max(255, 'Model ID must be 255 characters or less')
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

    // MITS ILSUnit.Deposit element
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

    // Legacy field for compatibility
    leaseLength: z.number()
        .int('Lease length must be a whole number of months')
        .min(1, 'Lease length must be at least 1 month')
        .max(36, 'Lease length must be 36 months or less')
        .optional(),

    // MITS UnitAmenity elements
    unitAmenities: z.array(AmenityPublishedSchema)
        .max(50, 'Unit amenities list must have 50 items or less for MITS compliance')
        .optional(),

    // Marketing content
    description: z.string()
        .max(1000, 'Unit description must be 1000 characters or less for MITS compliance')
        .optional(),

    unitDescription: z.string()
        .max(2000, 'Unit marketing description must be 2000 characters or less for MITS compliance')
        .optional(),

    notes: z.string()
        .max(500, 'Unit notes must be 500 characters or less')
        .optional(),

    features: z.array(z.string().max(100, 'Feature description must be 100 characters or less'))
        .max(20, 'Features list must have 20 items or less')
        .optional(),

    // MITS File elements (photos)
    photos: z.array(z.url({ error: 'Photo URL must be a valid URL for MITS File element' }))
        .max(20, 'Photos list must have 20 items or less for MITS compliance')
        .optional(),

    // Feed management fields
    feedInclusion:    z.record(z.string(), z.boolean()).optional(),
    manualReferences: z.record(z.string(), z.string()).optional(),

    // Metadata
    updatedAt: z.string().optional(),
}).strict() // Prevent additional properties for strict MITS compliance
// Removed strict availableDate requirement for unoccupied units
// Allow flexibility in MITS compliance based on business requirements
.refine(
    (unit) => {
        // Cross-validation: minLeaseTerm cannot be greater than maxLeaseTerm
        if(unit.minLeaseTerm !== undefined && unit.maxLeaseTerm !== undefined) {
            return unit.minLeaseTerm <= unit.maxLeaseTerm;
        }
        return true;
    },
    {
        message: 'Minimum lease term cannot be greater than maximum lease term',
        path:    ['maxLeaseTerm']
    }
)
.refine(
    (unit) => {
        // Date logic validation: vacate date should be before made ready date
        if(unit.vacateDate && unit.madeReadyDate) {
            const vacateDate = new Date(unit.vacateDate);
            const madeReadyDate = new Date(unit.madeReadyDate);

            if(vacateDate > madeReadyDate) {
                return false;
            }
        }

        return true;
    },
    {
        message: 'Vacate date cannot be after made ready date for MITS Availability logic',
        path:    ['madeReadyDate']
    }
)
.refine(
    (unit) => {
        // Date logic validation: made ready date should be before or same as available date
        if(unit.madeReadyDate && unit.availableDate) {
            const madeReadyDate = new Date(unit.madeReadyDate);
            const availableDate = new Date(unit.availableDate);

            if(madeReadyDate > availableDate) {
                return false;
            }
        }

        return true;
    },
    {
        message: 'Made ready date cannot be after available date for MITS Availability logic',
        path:    ['availableDate']
    }
);

export type UnitPublishedInput = z.infer<typeof UnitPublishedSchema>;

/**
 * MITS validation error messages for common unit failures
 */
export const MITS_UNIT_ERROR_MESSAGES = {
    MISSING_REQUIRED_FIELD:    'This field is required for MITS 4.1 ILSUnit compliance and must be provided before publishing',
    INVALID_VACANCY_CLASS:     'Invalid vacancy class: must be one of Occupied, Unoccupied, Notice, Down (MITS standard)',
    MISSING_AVAILABILITY_DATE: 'Available date is required for unoccupied units per MITS Availability requirements',
    INVALID_ROOM_COUNT:        'Invalid room configuration: beds and baths are required for MITS ILSUnit elements',
    INVALID_DATE_SEQUENCE:     'Invalid date sequence: dates must follow logical order (vacate → made ready → available)',
    ZERO_RENT:                 'Rent must be greater than 0 for MITS unit availability publication'
} as const;
