import { Table } from 'dynamodb-toolbox';
import { Entity } from 'dynamodb-toolbox/entity';
import { db, getTableName } from './db';
import { getDynamoClient } from './clients';
import { item } from 'dynamodb-toolbox/schema/item';
import { string } from 'dynamodb-toolbox/schema/string';
import { number } from 'dynamodb-toolbox/schema/number';
import { boolean } from 'dynamodb-toolbox/schema/boolean';
import { list } from 'dynamodb-toolbox/schema/list';
import { record } from 'dynamodb-toolbox/schema/record';
import { map } from 'dynamodb-toolbox/schema/map';
import { anyOf } from 'dynamodb-toolbox/schema/anyOf';

export const ApartmentTable = new Table({
    name: getTableName(),
    partitionKey: {
        name: 'buildingID',
        type: 'string',
    },
    sortKey: {
        name: 'unitID',
        type: 'string',
    },
    documentClient: db,
    indexes: {
        unitTypeIndex: {
            type: 'global',
            partitionKey: {
                name: 'unitID',
                type: 'string',
            },
            sortKey: {
                name: 'buildingID',
                type: 'string',
            },
        },
    },
});

// Function to get a fresh table instance with current client (for tests)
export const getApartmentTable = () => {
    if(process.env.BUN_ENV === 'test' || process.env.NODE_ENV === 'test') {
        try {
            // Use the mock table from test setup if available
            // Check global mock clients first to avoid require()
            if((globalThis as typeof globalThis & { mockDataClients?: unknown }).mockDataClients) {
                const mockClients = (globalThis as typeof globalThis & { mockDataClients: { getApartmentTable: () => unknown } }).mockDataClients;
                if(mockClients.getApartmentTable) {
                    return mockClients.getApartmentTable();
                }
            }
        } catch{
            // Test setup not available, fall back to regular table
        }
    }

    return new Table({
        name: getTableName(),
        partitionKey: {
            name: 'buildingID',
            type: 'string',
        },
        sortKey: {
            name: 'unitID',
            type: 'string',
        },
        documentClient: getDynamoClient(),
        indexes: {
            unitTypeIndex: {
                type: 'global',
                partitionKey: {
                    name: 'unitID',
                    type: 'string',
                },
                sortKey: {
                    name: 'buildingID',
                    type: 'string',
                },
            },
        },
    });
};

// Define complex type schemas
const rentSpecialSchema = map({
    id: anyOf(number(), string()).optional(),
    title: string(),
    startDate: string().optional(),
    endDate: string().optional(),
    description: string()
});

const incomeRestrictionSchema = map({
    amiLimit: number().optional(),
    maxIncomeByHouseholdSize: record(string(), number())
});

const feeSchema = map({
    type: string(),
    amount: number(),
    description: string().optional(),
    refundable: boolean().optional()
});

const depositSchema = anyOf(
    number(), // Legacy number format
    map({
        amount: number(),
        refundable: boolean().optional(),
        partialRefundPercentage: number().optional()
    })
);

const petTypePolicySchema = map({
    type: string(),
    weightLimit: number().optional(),
    countLimit: number().optional(),
    fee: number().optional(),
    deposit: number().optional(),
    breedRestrictions: list(string()).optional()
});

const petPolicySchema = map({
    allowed: boolean(),
    types: list(string()).optional(),
    maxCount: number().optional(),
    weightLimit: number().optional(),
    breedRestrictions: list(string()).optional(),
    deposit: number().optional(),
    monthlyFee: number().optional(),
    oneTimeFee: number().optional(),
    notes: string().optional(),
    petTypes: list(petTypePolicySchema).optional()
});

const parkingOptionSchema = map({
    type: string(),
    included: boolean(),
    fee: number().optional(),
    spaces: number().optional(),
    description: string().optional()
});

const storageOptionSchema = map({
    type: string(),
    included: boolean(),
    fee: number().optional(),
    dimensions: string().optional(),
    description: string().optional()
});

const amenitySchema = map({
    name: string(),
    category: string(),
    description: string().optional()
});

const propertyHighlightSchema = map({
    id: anyOf(number(), string()),
    highlight: string()
});

const screeningCriteriaSchema = map({
    incomeRatio: number().optional(),
    minCreditScore: number().optional(),
    maxOccupantsPerBedroom: number().optional(),
    backgroundCheckRequired: boolean().optional(),
    evictionHistory: boolean().optional(),
    criminalHistory: boolean().optional(),
    references: number().optional(),
    employmentVerification: boolean().optional(),
    rentalHistory: boolean().optional(),
    notes: string().optional()
});

const officeHoursSchema = map({
    open: string(),
    close: string()
});

const contactInfoSchema = map({
    name: string().optional(),
    phone: string().optional(),
    email: string().optional(),
    propertyWebsite: string().optional(),
    managementWebsite: string().optional(),
    officeHours: record(string(), officeHoursSchema).optional()
});

const tourAvailabilitySchema = map({
    selfGuidedTours: boolean().optional(),
    virtualTours: boolean().optional(),
    inPersonTours: boolean().optional(),
    tourSchedulingUrl: string().optional(),
    tourHours: record(string(), officeHoursSchema).optional()
});

const feedMetadataSchema = map({
    timestamp: string(), // ISO date string
    ipAddress: string().optional()
});

// Define the building schema separately to avoid circular dependencies
const buildingSchema = item({
    buildingID: string().key(),
    unitID: string().key(),
    buildingName: string().optional(),
    structureType: string().optional(),
    rentalType: string().optional(),
    street: string().optional(),
    city: string().optional(),
    state: string().optional(),
    zip: string().optional(),
    description: string().optional(),
    yearBuilt: number().optional(),
    numberStories: number().optional(),
    totalUnits: number().optional(),
    // New fields for listing sites
    propertyType: string().optional(),
    roomsForRent: boolean().optional(),
    photos: list(string()).optional(),
    leaseLength: number().optional(),
    shortTermLeaseAllowed: boolean().optional(),
    propertyLicenseNumber: string().optional(),
    specialtyType: string().optional(),
    specialtySubType: string().optional(),
    propertyDescription: string().optional(),
    rentSpecials: list(rentSpecialSchema).optional(),
    incomeRestrictions: incomeRestrictionSchema.optional(),
    utilitiesIncluded: record(string(), boolean()).optional(),
    oneTimeFees: list(feeSchema).optional(),
    monthlyFees: list(feeSchema).optional(),
    parkingOptions: list(parkingOptionSchema).optional(),
    petPolicies: petPolicySchema.optional(),
    storageOptions: list(storageOptionSchema).optional(),
    propertyAmenities: list(amenitySchema).optional(),
    propertyHighlights: list(propertyHighlightSchema).optional(),
    screeningCriteria: screeningCriteriaSchema.optional(),
    contactInfo: contactInfoSchema.optional(),
    tourAvailability: tourAvailabilitySchema.optional(),
    applicationFee: number().optional(),
    acceptsOnlineApplications: boolean().optional(),
    // MITS compliance fields
    latitude: number().optional(),
    longitude: number().optional(),
    coordinatesVerified: boolean().optional(),
    updatedAt: string().optional(),
});

export const Building = new Entity({
    name: 'Building',
    table: ApartmentTable,
    schema: buildingSchema,
});

// Functions to get fresh entities with current client (for tests)
export const getBuildingEntity = () => {
    if(process.env.BUN_ENV === 'test' || process.env.NODE_ENV === 'test') {
        try {
            // Use the entity mock from test setup if available
            // Check global mock clients to avoid require()
            if((globalThis as typeof globalThis & { buildingEntityMock?: { mockEntity: unknown } }).buildingEntityMock) {
                return (globalThis as typeof globalThis & { buildingEntityMock: { mockEntity: unknown } }).buildingEntityMock.mockEntity;
            }
        } catch{
            // Test setup not available, fall back to regular entity
        }

        return new Entity({
            name: 'Building',
            table: getApartmentTable() as typeof ApartmentTable,
            schema: buildingSchema,
        });
    }
    return Building;
};

// Define the unit schema separately
const unitSchema = item({
    buildingID: string().key(),
    unitID: string().key(),
    description: string().optional(),
    beds: number().optional(),
    baths: number().optional(),
    sqft: number().optional(),
    rent: number().optional(),
    occupied: boolean().optional(),
    availableDate: string().optional(),
    // New fields for listing sites
    modelID: string().optional(),
    unitNumber: string().optional(),
    maxOccupants: number().optional(),
    perPersonRent: number().optional(),
    deposit: depositSchema.optional(), // Supports both number (legacy) and Deposit object (enhanced)
    minLeaseTerm: number().optional(),
    maxLeaseTerm: number().optional(),
    unitDescription: string().optional(),
    unitRentSpecial: rentSpecialSchema.optional(),
    unitAmenities: list(amenitySchema).optional(),
    photos: list(string()).optional(),
    feedInclusion: record(string(), boolean()).optional(),
    manualReferences: record(string(), string()).optional(),
    feedLastPulled: record(string(), feedMetadataSchema).optional(),
    feedLastModified: string().optional(),
    // MITS compliance fields
    vacancyClass: string().optional(),
    vacateDate: string().optional(),
    madeReadyDate: string().optional(),
    updatedAt: string().optional(),
});

export const Unit = new Entity({
    name: 'Unit',
    table: ApartmentTable,
    schema: unitSchema,
});

// Functions to get fresh entities with current client (for tests)
export const getUnitEntity = () => {
    if(process.env.BUN_ENV === 'test' || process.env.NODE_ENV === 'test') {
        try {
            // Use the entity mock from test setup if available
            // Check global mock clients to avoid require()
            if((globalThis as typeof globalThis & { unitEntityMock?: { mockEntity: unknown } }).unitEntityMock) {
                return (globalThis as typeof globalThis & { unitEntityMock: { mockEntity: unknown } }).unitEntityMock.mockEntity;
            }
        } catch{
            // Test setup not available, fall back to regular entity
        }

        return new Entity({
            name: 'Unit',
            table: getApartmentTable() as typeof ApartmentTable,
            schema: unitSchema,
        });
    }
    return Unit;
};

// Define the unit type schema separately
const unitTypeSchema = item({
    buildingID: string().key(),
    unitID: string().key(), // Will be 'MODEL#' + modelID
    modelID: string().required(),
    modelName: string().required(),
    countAvailable: number().optional(),
    dateAvailable: string().optional(),
    beds: number().required(),
    baths: number().required(),
    maxOccupants: number().optional(),
    minRent: number().optional(),
    maxRent: number().optional(),
    perPersonRent: number().optional(),
    minSqft: number().optional(),
    maxSqft: number().optional(),
    deposit: depositSchema.optional(), // Supports both number (legacy) and Deposit object (enhanced)
    minLeaseTerm: number().optional(),
    maxLeaseTerm: number().optional(),
    modelAmenities: list(amenitySchema).optional(),
    updatedAt: string().optional(),
});

export const UnitType = new Entity({
    name: 'UnitType',
    table: ApartmentTable,
    schema: unitTypeSchema,
});

// Functions to get fresh entities with current client (for tests)
export const getUnitTypeEntity = () => {
    if(process.env.BUN_ENV === 'test' || process.env.NODE_ENV === 'test') {
        try {
            // Use the entity mock from test setup if available
            // Check global mock clients to avoid require()
            if((globalThis as typeof globalThis & { unitTypeEntityMock?: { mockEntity: unknown } }).unitTypeEntityMock) {
                return (globalThis as typeof globalThis & { unitTypeEntityMock: { mockEntity: unknown } }).unitTypeEntityMock.mockEntity;
            }
        } catch{
            // Test setup not available, fall back to regular entity
        }

        return new Entity({
            name: 'UnitType',
            table: getApartmentTable() as typeof ApartmentTable,
            schema: unitTypeSchema,
        });
    }
    return UnitType;
};
