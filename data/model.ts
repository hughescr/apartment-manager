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
import { any } from 'dynamodb-toolbox/schema/any';

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
    });
};

// Workaround for DynamoDB Toolbox v2.7.0 compatibility issue
// The getDocumentClient() method returns an empty object instead of the actual client
// Building.buildingName was added below
ApartmentTable.getDocumentClient = () => db;

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
    rentSpecials: list(any()).optional(),
    incomeRestrictions: any().optional(),
    utilitiesIncluded: record(string(), boolean()).optional(),
    oneTimeFees: list(any()).optional(),
    monthlyFees: list(any()).optional(),
    parkingOptions: list(any()).optional(),
    petPolicies: any().optional(),
    storageOptions: list(any()).optional(),
    propertyAmenities: list(any()).optional(),
    propertyHighlights: list(any()).optional(),
    screeningCriteria: any().optional(),
    contactInfo: any().optional(),
    tourAvailability: any().optional(),
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
    deposit: any().optional(), // Supports both number (legacy) and Deposit object (enhanced)
    minLeaseTerm: number().optional(),
    maxLeaseTerm: number().optional(),
    unitDescription: string().optional(),
    unitRentSpecial: any().optional(),
    unitAmenities: list(any()).optional(),
    photos: list(string()).optional(),
    feedInclusion: record(string(), boolean()).optional(),
    manualReferences: record(string(), string()).optional(),
    feedLastPulled: record(string(), any()).optional(),
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
    deposit: any().optional(), // Supports both number (legacy) and Deposit object (enhanced)
    minLeaseTerm: number().optional(),
    maxLeaseTerm: number().optional(),
    modelAmenities: list(any()).optional(),
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
