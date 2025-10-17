import type {} from '../.sst/platform/config';

const buildingsUnitsTable = new sst.aws.Dynamo('BuildingsUnits', {
    fields: {
        buildingID: 'string',
        // Will be the unit number for a specific unit, or 'BUILDING' for building-level data
        unitID:     'string',

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
    primaryIndex:  { hashKey: 'buildingID', rangeKey: 'unitID' },
    globalIndexes: {
        // GSI for efficiently querying all buildings (where unitID = 'BUILDING')
        unitTypeIndex: {
            hashKey:  'unitID',
            rangeKey: 'buildingID'
        }
    },
    transform: {
        table: {
            billingMode:            'PROVISIONED',
            readCapacity:           1,
            writeCapacity:          1,
            globalSecondaryIndexes: [{
                name:           'unitTypeIndex',
                hashKey:        'unitID',
                rangeKey:       'buildingID',
                readCapacity:   1,
                writeCapacity:  1,
                projectionType: 'ALL'
            }]
        }
    }
});

export { buildingsUnitsTable };
