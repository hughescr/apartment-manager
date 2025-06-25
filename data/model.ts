import { Table, Entity } from 'dynamodb-toolbox';
import { db, tableName } from './db';

export const ApartmentTable = new Table({
    name: tableName,
    partitionKey: 'buildingID',
    sortKey: 'unitID',
    DocumentClient: db,
});

export const Building = new Entity({
    name: 'Building',
    attributes: {
        buildingID: { type: 'string', required: true },
        unitID: { type: 'string', required: true, 'const': 'BUILDING' },
        street: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zip: { type: 'string' },
        description: { type: 'string' },
        yearBuilt: { type: 'number' },
        numberStories: { type: 'number' },
        totalUnits: { type: 'number' },
    },
    table: ApartmentTable,
});

export const Unit = new Entity({
    name: 'Unit',
    attributes: {
        buildingID: { type: 'string', required: true },
        unitID: { type: 'string', required: true },
        description: { type: 'string' },
        beds: { type: 'number' },
        baths: { type: 'number' },
        sqft: { type: 'number' },
        rent: { type: 'number' },
        occupied: { type: 'boolean' },
        availableDate: { type: 'string' },
    },
    table: ApartmentTable,
});
