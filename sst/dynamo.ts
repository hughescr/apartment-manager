/// <reference path="../.sst/platform/config.d.ts" />

const buildingsUnitsTable = new sst.aws.Dynamo('BuildingsUnits', {
    fields: {
        buildingID: 'string',
        // Will be the unit number for a specific unit, or 'BUILDING' for building-level data
        unitID: 'string',

        // The fields below are not specified because they aren't indexed, and are optional.
        // Building details:
        // street: 'string',
        // city: 'string',
        // state: 'string',
        // zip: 'string',
        // buildingDescription: 'string',
        // yearBuilt: 'number',
        // numberStories: 'number',
        // totalUnits: 'number',

        // Unit details:
        // unitDescription: 'string',
        // beds: 'number',
        // baths: 'number',
        // sqft: 'number',
        // rent: 'number',
        // occupied: 'boolean',
        // availableDate: 'string',
    },
    primaryIndex: { hashKey: 'buildingID', rangeKey: 'unitID' },
});

export { buildingsUnitsTable };
