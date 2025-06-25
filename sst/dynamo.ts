/// <reference path="../.sst/platform/config.d.ts" />

const buildingsUnitsTable = new sst.aws.Dynamo('BuildingsUnits', {
    fields: {
        buildingID: 'string',
        unitID: 'string',
        street: 'string',
        city: 'string',
        state: 'string',
        zip: 'string',
        buildingDescription: 'string',
        yearBuilt: 'number',
        numberStories: 'number',
        totalUnits: 'number',
        unitDescription: 'string',
        beds: 'number',
        baths: 'number',
        sqft: 'number',
        rent: 'number',
        occupied: 'boolean',
        availableDate: 'string',
    },
    primaryIndex: { hashKey: 'buildingID', rangeKey: 'unitID' },
});

export { buildingsUnitsTable };
