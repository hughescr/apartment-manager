/// <reference path="../.sst/platform/config.d.ts" />

const buildingsUnitsTable = new sst.aws.Dynamo('BuildingsUnits', {
    fields: { buildingID: 'string', unitID: 'string' },
    primaryIndex: { hashKey: 'buildingID', rangeKey: 'unitID' },
});

export { buildingsUnitsTable };
