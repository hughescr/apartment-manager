import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { UnitData } from '../../astro-src/types';

const units: UnitData[] = [
    {
        buildingID: 'bldg-1',
        unitID: 'unit-101',
        unitDescription: 'A cozy 1-bedroom apartment.',
        beds: 1,
        baths: 1,
        sqft: 650,
        rent: 1500,
        occupied: false,
        availableDate: '2025-07-01',
    },
    {
        buildingID: 'bldg-1',
        unitID: 'unit-102',
        unitDescription: 'A spacious 2-bedroom apartment.',
        beds: 2,
        baths: 2,
        sqft: 900,
        rent: 2200,
        occupied: true,
    },
];

export const handler: APIGatewayProxyHandlerV2 = async (_evt) => {
    return {
        statusCode: 200,
        body: JSON.stringify(units),
    };
};
