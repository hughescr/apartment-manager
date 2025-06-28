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
        street: string().optional(),
        city: string().optional(),
        state: string().optional(),
        zip: string().optional(),
        description: string().optional(),
        yearBuilt: number().optional(),
        numberStories: number().optional(),
        totalUnits: number().optional(),
    }),
});

export const Unit = new Entity({
    name: 'Unit',
    table: ApartmentTable,
    schema: item({
        buildingID: string().key(),
        unitID: string().key(),
        description: string().optional(),
        beds: number().optional(),
        baths: number().optional(),
        sqft: number().optional(),
        rent: number().optional(),
        occupied: boolean().optional(),
        availableDate: string().optional(),
    }),
});
