import { z } from 'zod';
import { PropertyType } from '../../../src/types';
import { isValidBuildingId } from '../../../src/utils/building-id.js';
import { chain } from 'lodash';
import {
    createPetPolicySchema,
    createFeeSchema,
    createParkingOptionSchema,
    createStorageOptionSchema,
    createAmenitySchema,
    createRentSpecialSchema,
    createScreeningCriteriaSchema,
    createIncomeRestrictionsSchema,
    createContactInfoSchema,
    createTourAvailabilitySchema
} from '../shared/common-schemas';

/**
 * Draft validation schema for buildings - permissive schema for work-in-progress saves
 * Only buildingId and buildingName are required. All other fields are optional to support
 * incremental data entry and auto-save functionality.
 */

// Create draft-mode schemas using shared builders
const ContactInfoDraftSchema = createContactInfoSchema({ mode: 'draft' });
const TourAvailabilityDraftSchema = createTourAvailabilitySchema({ mode: 'draft' });
const RentSpecialDraftSchema = createRentSpecialSchema({ mode: 'draft' });
const IncomeRestrictionsDraftSchema = createIncomeRestrictionsSchema({ mode: 'draft' });
const PetPolicyDraftSchema = createPetPolicySchema({ mode: 'draft' });
const FeeDraftSchema = createFeeSchema({ mode: 'draft' });
const ParkingOptionDraftSchema = createParkingOptionSchema({ mode: 'draft' });
const StorageOptionDraftSchema = createStorageOptionSchema({ mode: 'draft' });
const AmenityDraftSchema = createAmenitySchema({ mode: 'draft' });
const ScreeningCriteriaDraftSchema = createScreeningCriteriaSchema({ mode: 'draft' });

export const BuildingDraftSchema = z.looseObject({
    // Required fields for draft - only ID and name
    buildingID: z.string().min(1).max(255).refine((id) => {
        // Use proper building ID validation for short-uuid format
        return isValidBuildingId(id);
    }, 'buildingID must be a valid building ID format'),
    buildingName: z.string().min(1, 'buildingName is required').transform((name) => {
        // Sanitize to prevent XSS while preserving content
        return chain(name)
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .value();
    }),
    // All other fields are optional for draft state
    street:                    z.string().min(1, 'Street address cannot be empty').optional(),
    city:                      z.string().min(1, 'City cannot be empty').optional(),
    state:                     z.string().min(1, 'State cannot be empty').optional(),
    zip:                       z.string().regex(/^\d{5}(?:-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789').optional(),
    applicationFee:            z.number().min(0).optional(),
    numberStories:             z.number().int().min(1).max(100).optional(),
    leaseLength:               z.number().int().min(1).max(36).optional(),
    contactInfo:               ContactInfoDraftSchema,
    tourAvailability:          TourAvailabilityDraftSchema,
    rentSpecials:              z.array(RentSpecialDraftSchema).optional(),
    incomeRestrictions:        IncomeRestrictionsDraftSchema,
    screeningCriteria:         ScreeningCriteriaDraftSchema,
    latitude:                  z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional(),
    longitude:                 z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional(),
    coordinatesVerified:       z.boolean().optional(),
    propertyType:              z.enum(PropertyType).optional(),
    photos:                    z.array(z.url({ error: 'Photo URLs must be valid URLs' })).optional(),
    acceptsOnlineApplications: z.boolean().optional(),

    // Additional MITS compliance fields (all optional for draft)
    yearBuilt:           z.number().int().min(1800).max(new Date().getFullYear() + 5, 'Year built cannot be in the future').optional(),
    totalUnits:          z.number().int().min(1, 'Total units must be at least 1').optional(),
    description:         z.string().optional(),
    propertyDescription: z.string().optional(),
    propertyHighlights:  z.array(z.object({
        id:        z.union([z.string(), z.number()]),
        highlight: z.string().min(1, 'Highlight text cannot be empty')
    })).optional(),
    propertyLicenseNumber: z.string().optional(),

    // MITS Structure types (optional for draft)
    structureType: z.enum(['Apartment', 'Condo', 'Townhouse', 'Single Family', 'House']).optional(),
    // Field removed - use specialtyType instead (converted to rentalType by MITS generator)

    // Additional property features for MITS (optional for draft)
    roomsForRent:          z.boolean().optional(),
    shortTermLeaseAllowed: z.boolean().optional(),
    specialtyType:         z.enum(['market-rate', 'affordable', 'student', 'senior']).optional(),
    specialtySubType:      z.string().optional(),

    // Complex data structures (all optional for draft)
    // Complex data structures - now with proper validation (all optional for draft)
    petPolicies:       PetPolicyDraftSchema,
    parkingOptions:    z.array(ParkingOptionDraftSchema).optional(),
    storageOptions:    z.array(StorageOptionDraftSchema).optional(),
    propertyAmenities: z.array(AmenityDraftSchema).optional(),
    oneTimeFees:       z.array(FeeDraftSchema).optional(),
    monthlyFees:       z.array(FeeDraftSchema).optional(),
    utilitiesIncluded: z.record(z.string(), z.boolean()).optional(),
    notes:             z.string().optional(),

    // Timestamps
    updatedAt: z.string().optional(),
});

export type BuildingDraftInput = z.infer<typeof BuildingDraftSchema>;
