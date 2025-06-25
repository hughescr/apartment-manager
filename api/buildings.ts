import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { BuildingData } from '../../astro-src/types';

const buildings: BuildingData[] = [
    {
        buildingID: 'bldg-1',
        unitID: 'BUILDING',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        buildingDescription: 'A lovely building in the heart of Anytown.',
        yearBuilt: 2020,
        numberStories: 3,
        totalUnits: 10,
    },
];

export const handler: APIGatewayProxyHandlerV2 = async (_evt) => {
    return {
        statusCode: 200,
        body: JSON.stringify(buildings),
    };
};
