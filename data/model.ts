import { Table, Entity } from 'dynamodb-toolbox';
import { db, tableName } from './db';
import { item } from 'dynamodb-toolbox/schema/item';
import { string } from 'dynamodb-toolbox/schema/string';
import { number } from 'dynamodb-toolbox/schema/number';
import { boolean } from 'dynamodb-toolbox/schema/boolean';

export const ApartmentTable = new Table({
    name: tableName,
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

export const Building = new Entity({
    name: 'Building',
    table: ApartmentTable,
    schema: item({
        buildingID: string().key(),
        unitID: string().key(),
        street: string(),
        city: string(),
        state: string(),
        zip: string(),
        description: string(),
        yearBuilt: number(),
        numberStories: number(),
        totalUnits: number(),
    }),
});

export const Unit = new Entity({
    name: 'Unit',
    table: ApartmentTable,
    schema: item({
        buildingID: string().key(),
        unitID: string().key(),
        description: string(),
        beds: number(),
        baths: number(),
        sqft: number(),
        rent: number(),
        occupied: boolean(),
        availableDate: string(),
    }),
});
